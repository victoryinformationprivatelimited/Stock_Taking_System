import { useQuery } from '@tanstack/react-query';
import { Stage, Layer, Group as KonvaGroup, Image as KonvaImage, Rect, Text as KonvaText } from 'react-konva';
import { Badge, Card, Grid, Group, Paper, SimpleGrid, Stack, Text, Title, ThemeIcon } from '@mantine/core';
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconClipboardList,
  IconMapOff,
  IconPackages,
} from '@tabler/icons-react';
import { api } from '../lib/api';
import { useImage } from '../hooks/useImage';

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api').replace(/\/api\/?$/, '');
const PANEL_WIDTH = 480;

interface CountRecord {
  attemptNumber: number;
  result: 'MATCH' | 'MISMATCH';
  status: string;
}

interface Assignment {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
  product: { productCode: string; description: string };
  counter: { fullName: string };
  countRecords: CountRecord[];
}

interface Product {
  id: string;
}

interface StoreLayout {
  id: string;
  name: string;
  imageUrl: string;
}

interface LayoutDetail extends StoreLayout {
  zones: { id: string; zoneCode: string; label: string | null; geometry: { x: number; y: number; width: number; height: number } }[];
}

interface ZoneLiveStatus {
  zoneId: string;
  zoneCode: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'MISMATCH' | 'DONE';
  productCount: number;
}

const zoneStatusColor: Record<ZoneLiveStatus['status'], string> = {
  PENDING: 'rgba(156, 163, 175, 0.35)',
  IN_PROGRESS: 'rgba(21, 101, 192, 0.35)',
  MISMATCH: 'rgba(198, 40, 40, 0.4)',
  DONE: 'rgba(46, 125, 50, 0.4)',
};

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card radius="md" padding="lg" withBorder>
      <Group justify="space-between">
        <div>
          <Text c="dimmed" size="sm" fw={600}>
            {label}
          </Text>
          <Text fw={800} size="32px">
            {value}
          </Text>
        </div>
        <ThemeIcon size={48} radius="md" color={color} variant="light">
          {icon}
        </ThemeIcon>
      </Group>
    </Card>
  );
}

function LiveLayoutPanel() {
  const { data: layouts } = useQuery({
    queryKey: ['layouts'],
    queryFn: async () => (await api.get<StoreLayout[]>('/layouts')).data,
  });

  const primaryLayout = layouts?.[0];

  const { data: layout } = useQuery({
    queryKey: ['layout', primaryLayout?.id],
    queryFn: async () => (await api.get<LayoutDetail>(`/layouts/${primaryLayout!.id}`)).data,
    enabled: !!primaryLayout,
  });

  const { data: live } = useQuery({
    queryKey: ['layout-live', primaryLayout?.id],
    queryFn: async () => (await api.get<{ zones: ZoneLiveStatus[] }>(`/layouts/${primaryLayout!.id}/live`)).data,
    enabled: !!primaryLayout,
    refetchInterval: 15000,
  });

  const [image] = useImage(layout ? `${API_ORIGIN}${layout.imageUrl}` : undefined);
  const panelHeight = image ? (PANEL_WIDTH / image.width) * image.height : 300;

  if (!primaryLayout) {
    return (
      <Stack align="center" justify="center" py="xl" gap="xs">
        <IconMapOff size={32} color="var(--mantine-color-gray-5)" />
        <Text c="dimmed" size="sm">
          No store layout uploaded yet.
        </Text>
      </Stack>
    );
  }

  const statusByZoneId = new Map(live?.zones.map((z) => [z.zoneId, z.status]));

  return (
    <Stack gap="sm">
      <Stage width={PANEL_WIDTH} height={panelHeight}>
        <Layer>
          {image && <KonvaImage image={image} width={PANEL_WIDTH} height={panelHeight} />}
          {layout?.zones.map((zone) => {
            const status = statusByZoneId.get(zone.id) ?? 'PENDING';
            const x = zone.geometry.x * PANEL_WIDTH;
            const y = zone.geometry.y * panelHeight;
            const w = zone.geometry.width * PANEL_WIDTH;
            const h = zone.geometry.height * panelHeight;
            return (
              <KonvaGroup key={zone.id}>
                <Rect x={x} y={y} width={w} height={h} fill={zoneStatusColor[status]} stroke="#fff" strokeWidth={1} />
                <KonvaText x={x + 4} y={y + 4} text={zone.label || zone.zoneCode} fontSize={11} fill="#fff" listening={false} />
              </KonvaGroup>
            );
          })}
        </Layer>
      </Stage>
      <Group gap="md">
        {(['PENDING', 'IN_PROGRESS', 'MISMATCH', 'DONE'] as const).map((s) => (
          <Group key={s} gap={6}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: zoneStatusColor[s] }} />
            <Text size="xs" c="dimmed">
              {s.replace('_', ' ')}
            </Text>
          </Group>
        ))}
      </Group>
    </Stack>
  );
}

export function DashboardPage() {
  const { data: products } = useQuery({
    queryKey: ['products', ''],
    queryFn: async () => (await api.get<Product[]>('/products')).data,
  });

  const { data: assignments } = useQuery({
    queryKey: ['assignments'],
    queryFn: async () => (await api.get<Assignment[]>('/assignments')).data,
  });

  const pendingApprovals =
    assignments?.filter((a) => a.countRecords[0]?.status === 'PENDING_APPROVAL').length ?? 0;
  const mismatches =
    assignments?.filter((a) => a.countRecords[0]?.result === 'MISMATCH').length ?? 0;
  const completed = assignments?.filter((a) => a.status === 'DONE').length ?? 0;

  return (
    <Stack gap="xl">
      <div>
        <Title order={2}>Manager Dashboard</Title>
        <Text c="dimmed">Live overview of stock counting progress</Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <StatCard label="Products" value={products?.length ?? 0} icon={<IconPackages size={26} />} color="violet" />
        <StatCard label="Assignments" value={assignments?.length ?? 0} icon={<IconClipboardList size={26} />} color="blue" />
        <StatCard label="Pending Approval" value={pendingApprovals} icon={<IconAlertTriangle size={26} />} color="orange" />
        <StatCard label="Mismatches" value={mismatches} icon={<IconAlertTriangle size={26} />} color="red" />
      </SimpleGrid>

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper radius="md" p="lg" withBorder h="100%">
            <Title order={4} mb="md">
              Store Layout
            </Title>
            <LiveLayoutPanel />
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Stack gap="lg">
            <Paper radius="md" p="lg" withBorder>
              <Title order={4} mb="md">
                Recent Assignments
              </Title>
              <Stack gap="xs">
                {assignments?.slice(0, 6).map((a) => (
                  <Group key={a.id} justify="space-between" py={6} style={{ borderBottom: '1px solid #f1f1f5' }}>
                    <div>
                      <Text fw={600} size="sm">
                        {a.product.productCode}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {a.counter.fullName}
                      </Text>
                    </div>
                    <Badge color={a.status === 'DONE' ? 'green' : a.status === 'IN_PROGRESS' ? 'blue' : 'gray'}>
                      {a.status}
                    </Badge>
                  </Group>
                ))}
                {!assignments?.length && (
                  <Text c="dimmed" size="sm">
                    No assignments yet.
                  </Text>
                )}
              </Stack>
            </Paper>
            <Paper radius="md" p="lg" withBorder>
              <Title order={4} mb="md">
                Completion
              </Title>
              <Group>
                <ThemeIcon size={48} radius="xl" color="green" variant="light">
                  <IconCircleCheck size={28} />
                </ThemeIcon>
                <div>
                  <Text fw={800} size="24px">
                    {completed} / {assignments?.length ?? 0}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Assignments completed
                  </Text>
                </div>
              </Group>
            </Paper>
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
