import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Checkbox,
  Group,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconRotateClockwise } from '@tabler/icons-react';
import { api } from '../lib/api';

interface Product {
  id: string;
  productCode: string;
  description: string;
}

interface CounterUser {
  id: string;
  fullName: string;
}

interface Zone {
  id: string;
  zoneCode: string;
  label: string | null;
  layout: { id: string; name: string };
  productCount: number;
}

interface ZoneDetail {
  id: string;
  zoneCode: string;
  label: string | null;
  productMaps: { product: Product }[];
}

interface CountRecord {
  id: string;
  attemptNumber: number;
  countedQty: string;
  systemQtySnapshot: string;
  result: 'MATCH' | 'MISMATCH';
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'RECOUNT_REQUESTED' | 'REJECTED_MAX_ATTEMPTS';
}

interface Assignment {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
  product: Product;
  counter: { id: string; fullName: string; email: string };
  zone: { id: string; zoneCode: string; label: string | null } | null;
  countRecords: CountRecord[];
}

const assignmentStatusColor: Record<string, string> = {
  PENDING: 'gray',
  IN_PROGRESS: 'blue',
  DONE: 'green',
};

const countStatusColor: Record<string, string> = {
  PENDING_APPROVAL: 'yellow',
  APPROVED: 'green',
  RECOUNT_REQUESTED: 'blue',
  REJECTED_MAX_ATTEMPTS: 'red',
};

export function AssignmentsPage() {
  const queryClient = useQueryClient();
  const [counterId, setCounterId] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [zoneCounterId, setZoneCounterId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedZoneProductIds, setSelectedZoneProductIds] = useState<string[]>([]);

  const { data: assignments } = useQuery({
    queryKey: ['assignments'],
    queryFn: async () => (await api.get<Assignment[]>('/assignments')).data,
  });

  const { data: counters } = useQuery({
    queryKey: ['users', 'COUNTER'],
    queryFn: async () => (await api.get<CounterUser[]>('/users', { params: { role: 'COUNTER' } })).data,
  });

  const { data: products } = useQuery({
    queryKey: ['products', ''],
    queryFn: async () => (await api.get<Product[]>('/products')).data,
  });

  const { data: zones } = useQuery({
    queryKey: ['layouts', 'zones'],
    queryFn: async () => (await api.get<Zone[]>('/layouts/zones')).data,
  });

  const { data: zoneDetail } = useQuery({
    queryKey: ['layouts', 'zones', selectedZoneId],
    queryFn: async () => (await api.get<ZoneDetail>(`/layouts/zones/${selectedZoneId}`)).data,
    enabled: !!selectedZoneId,
  });

  // Default to all of the zone's products selected whenever a new zone is picked.
  useEffect(() => {
    if (zoneDetail) {
      setSelectedZoneProductIds(zoneDetail.productMaps.map((m) => m.product.id));
    } else {
      setSelectedZoneProductIds([]);
    }
  }, [zoneDetail?.id]);

  const assignMutation = useMutation({
    mutationFn: async () => api.post('/assignments', { counterId, productIds: selectedProductIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      setSelectedProductIds([]);
      notifications.show({ title: 'Assigned', message: 'Products assigned to counter', color: 'green' });
    },
  });

  const assignZoneMutation = useMutation({
    mutationFn: async () =>
      api.post('/assignments/zone', {
        counterId: zoneCounterId,
        zoneId: selectedZoneId,
        productIds: selectedZoneProductIds,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      setSelectedZoneId(null);
      notifications.show({
        title: 'Zone assigned',
        message: `${res.data.length} product(s) assigned`,
        color: 'green',
      });
    },
    onError: (err: any) => {
      notifications.show({
        title: 'Could not assign zone',
        message: err?.response?.data?.message ?? 'Something went wrong',
        color: 'red',
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ assignmentId, countId }: { assignmentId: string; countId: string }) =>
      api.post(`/assignments/${assignmentId}/counts/${countId}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      notifications.show({ title: 'Approved', message: 'Count approved', color: 'green' });
    },
  });

  const recountMutation = useMutation({
    mutationFn: async ({ assignmentId, countId }: { assignmentId: string; countId: string }) =>
      api.post(`/assignments/${assignmentId}/counts/${countId}/request-recount`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      notifications.show({ title: 'Recount requested', message: 'Counter notified', color: 'blue' });
    },
  });

  function toggleProduct(id: string) {
    setSelectedProductIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  function toggleZoneProduct(id: string) {
    setSelectedZoneProductIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  const zoneProducts = zoneDetail?.productMaps.map((m) => m.product) ?? [];
  const allZoneProductsSelected = zoneProducts.length > 0 && selectedZoneProductIds.length === zoneProducts.length;

  function toggleSelectAllZoneProducts() {
    setSelectedZoneProductIds(allZoneProductsSelected ? [] : zoneProducts.map((p) => p.id));
  }

  return (
    <Stack gap="lg">
      <Title order={2}>Assignments</Title>

      <Paper radius="md" p="lg" withBorder>
        <Title order={4} mb="md">
          New Assignment
        </Title>
        <Tabs defaultValue="product">
          <Tabs.List mb="md">
            <Tabs.Tab value="product">By Product</Tabs.Tab>
            <Tabs.Tab value="zone">By Zone</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="product">
            <Stack>
              <Select
                label="Counter"
                placeholder="Select counter..."
                data={counters?.map((c) => ({ value: c.id, label: c.fullName })) ?? []}
                value={counterId}
                onChange={setCounterId}
                w={300}
              />
              <Paper withBorder radius="sm" p="sm" mah={220} style={{ overflow: 'hidden' }}>
                <ScrollArea h={180}>
                  <Stack gap={6}>
                    {products?.map((p) => (
                      <Checkbox
                        key={p.id}
                        label={`${p.productCode} — ${p.description}`}
                        checked={selectedProductIds.includes(p.id)}
                        onChange={() => toggleProduct(p.id)}
                      />
                    ))}
                  </Stack>
                </ScrollArea>
              </Paper>
              <Button
                w="fit-content"
                disabled={!counterId || selectedProductIds.length === 0}
                loading={assignMutation.isPending}
                onClick={() => assignMutation.mutate()}
              >
                Assign {selectedProductIds.length || ''} product(s)
              </Button>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="zone">
            <Stack>
              <Select
                label="Counter"
                placeholder="Select counter..."
                data={counters?.map((c) => ({ value: c.id, label: c.fullName })) ?? []}
                value={zoneCounterId}
                onChange={setZoneCounterId}
                w={300}
              />
              <Select
                label="Zone"
                placeholder="Select zone..."
                data={
                  zones?.map((z) => ({
                    value: z.id,
                    label: `${z.label ?? z.zoneCode} (${z.layout.name}) — ${z.productCount} product(s)`,
                  })) ?? []
                }
                value={selectedZoneId}
                onChange={setSelectedZoneId}
                w={420}
              />

              {selectedZoneId && (
                <Paper withBorder radius="sm" p="sm" mah={260} style={{ overflow: 'hidden' }}>
                  {zoneProducts.length > 0 ? (
                    <>
                      <Checkbox
                        label={`Select all (${zoneProducts.length})`}
                        checked={allZoneProductsSelected}
                        onChange={toggleSelectAllZoneProducts}
                        mb="xs"
                      />
                      <ScrollArea h={180}>
                        <Stack gap={6}>
                          {zoneProducts.map((p) => (
                            <Checkbox
                              key={p.id}
                              label={`${p.productCode} — ${p.description}`}
                              checked={selectedZoneProductIds.includes(p.id)}
                              onChange={() => toggleZoneProduct(p.id)}
                            />
                          ))}
                        </Stack>
                      </ScrollArea>
                    </>
                  ) : (
                    <Text size="sm" c="dimmed">
                      This zone has no products mapped to it yet. Map products from the Zone Products page first.
                    </Text>
                  )}
                </Paper>
              )}

              <Button
                w="fit-content"
                disabled={!zoneCounterId || !selectedZoneId || selectedZoneProductIds.length === 0}
                loading={assignZoneMutation.isPending}
                onClick={() => assignZoneMutation.mutate()}
              >
                Assign {selectedZoneProductIds.length || ''} product(s)
              </Button>
              {!zones?.length && (
                <Text size="sm" c="dimmed">
                  No zones yet — create one from Store Layouts first.
                </Text>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Paper>

      <Title order={4}>All Assignments</Title>
      <Paper radius="md" withBorder>
        <Table verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Product</Table.Th>
              <Table.Th>Zone</Table.Th>
              <Table.Th>Counter</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Latest Count</Table.Th>
              <Table.Th>Action</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {assignments?.map((a) => {
              const latest = a.countRecords[0];
              return (
                <Table.Tr key={a.id}>
                  <Table.Td fw={600}>{a.product.productCode}</Table.Td>
                  <Table.Td>
                    {a.zone ? (
                      <Badge variant="light" color="violet">
                        {a.zone.label ?? a.zone.zoneCode}
                      </Badge>
                    ) : (
                      <Text size="sm" c="dimmed">
                        —
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>{a.counter.fullName}</Table.Td>
                  <Table.Td>
                    <Badge color={assignmentStatusColor[a.status]}>{a.status}</Badge>
                  </Table.Td>
                  <Table.Td>
                    {latest ? (
                      <Group gap={6}>
                        <Text size="sm">
                          Attempt {latest.attemptNumber}: {latest.countedQty} vs {latest.systemQtySnapshot}
                        </Text>
                        <Badge size="sm" color={latest.result === 'MATCH' ? 'green' : 'red'} variant="light">
                          {latest.result}
                        </Badge>
                        <Badge size="sm" color={countStatusColor[latest.status]}>
                          {latest.status.replace(/_/g, ' ')}
                        </Badge>
                      </Group>
                    ) : (
                      <Text c="dimmed" size="sm">
                        Not started
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {latest?.status === 'PENDING_APPROVAL' && (
                      <Group gap="xs">
                        <Button
                          size="xs"
                          color="green"
                          leftSection={<IconCheck size={14} />}
                          onClick={() => approveMutation.mutate({ assignmentId: a.id, countId: latest.id })}
                        >
                          Approve
                        </Button>
                        {latest.attemptNumber < 3 && (
                          <Button
                            size="xs"
                            color="blue"
                            variant="light"
                            leftSection={<IconRotateClockwise size={14} />}
                            onClick={() => recountMutation.mutate({ assignmentId: a.id, countId: latest.id })}
                          >
                            Request Recount
                          </Button>
                        )}
                      </Group>
                    )}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
        {!assignments?.length && (
          <Text p="md" c="dimmed">
            No assignments yet.
          </Text>
        )}
      </Paper>
    </Stack>
  );
}
