import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconSearch } from '@tabler/icons-react';
import { api } from '../lib/api';

interface Product {
  id: string;
  productCode: string;
  description: string;
}

interface ZoneSummary {
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
  layout: { id: string; name: string };
  productMaps: { product: Product }[];
}

export function ZoneProductsPage() {
  const queryClient = useQueryClient();
  const [activeZone, setActiveZone] = useState<ZoneSummary | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const { data: zones } = useQuery({
    queryKey: ['layouts', 'zones'],
    queryFn: async () => (await api.get<ZoneSummary[]>('/layouts/zones')).data,
  });

  const { data: products } = useQuery({
    queryKey: ['products', ''],
    queryFn: async () => (await api.get<Product[]>('/products')).data,
  });

  const { data: zoneDetail } = useQuery({
    queryKey: ['layouts', 'zones', activeZone?.id],
    queryFn: async () => (await api.get<ZoneDetail>(`/layouts/zones/${activeZone!.id}`)).data,
    enabled: !!activeZone,
  });

  const setProductsMutation = useMutation({
    mutationFn: async (productIds: string[]) =>
      api.put(`/layouts/${activeZone!.layout.id}/zones/${activeZone!.id}/products`, { productIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layouts', 'zones'] });
      notifications.show({ title: 'Products mapped', message: '', color: 'green' });
      setActiveZone(null);
    },
  });

  function openZone(zone: ZoneSummary) {
    setActiveZone(zone);
    setSelectedProductIds([]);
    setSearch('');
  }

  function toggleProduct(id: string) {
    setSelectedProductIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  const filteredProducts = products?.filter(
    (p) =>
      p.productCode.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()),
  );

  const allFilteredSelected =
    !!filteredProducts?.length && filteredProducts.every((p) => selectedProductIds.includes(p.id));

  // Seed the selection once when the zone's existing mapping loads. Keyed on
  // zoneDetail.id so it doesn't re-run (and clobber the user's choices) on
  // every render while they're checking/unchecking boxes.
  useEffect(() => {
    if (zoneDetail) {
      setSelectedProductIds(zoneDetail.productMaps.map((m) => m.product.id));
    }
  }, [zoneDetail?.id]);

  return (
    <Stack gap="lg">
      <Title order={2}>Zone Products</Title>
      <Text c="dimmed" size="sm">
        Map products to a zone so counters assigned to that zone know what to count.
      </Text>

      <Paper radius="md" withBorder>
        <Table verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Zone</Table.Th>
              <Table.Th>Layout</Table.Th>
              <Table.Th>Products</Table.Th>
              <Table.Th>Action</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {zones?.map((zone) => (
              <Table.Tr key={zone.id}>
                <Table.Td fw={600}>{zone.label ?? zone.zoneCode}</Table.Td>
                <Table.Td>{zone.layout.name}</Table.Td>
                <Table.Td>
                  <Badge variant="light" color="violet">
                    {zone.productCount} product(s)
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Button size="xs" variant="light" onClick={() => openZone(zone)}>
                    Map products
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {!zones?.length && (
          <Text p="md" c="dimmed">
            No zones yet — create one from Store Layouts first.
          </Text>
        )}
      </Paper>

      <Modal
        opened={!!activeZone}
        onClose={() => setActiveZone(null)}
        title={`Map products — ${activeZone?.label ?? activeZone?.zoneCode ?? ''}`}
        size="lg"
      >
        <Stack>
          <TextInput
            placeholder="Search by code or description..."
            leftSection={<IconSearch size={14} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Checkbox
            label={`Select all${search ? ' (filtered)' : ''}`}
            checked={allFilteredSelected}
            onChange={() =>
              setSelectedProductIds((prev) => {
                if (!filteredProducts) return prev;
                const filteredIds = filteredProducts.map((p) => p.id);
                if (allFilteredSelected) {
                  return prev.filter((id) => !filteredIds.includes(id));
                }
                return Array.from(new Set([...prev, ...filteredIds]));
              })
            }
          />
          <ScrollArea h={320}>
            <Stack gap={6}>
              {filteredProducts?.map((p) => (
                <Checkbox
                  key={p.id}
                  label={`${p.productCode} — ${p.description}`}
                  checked={selectedProductIds.includes(p.id)}
                  onChange={() => toggleProduct(p.id)}
                />
              ))}
            </Stack>
          </ScrollArea>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {selectedProductIds.length} selected
            </Text>
            <Button
              onClick={() => setProductsMutation.mutate(selectedProductIds)}
              loading={setProductsMutation.isPending}
            >
              Save Mapping
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
