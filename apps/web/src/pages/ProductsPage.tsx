import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Group, Paper, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { api } from '../lib/api';

interface Product {
  id: string;
  productCode: string;
  description: string;
  barcode: string;
  systemQty: string;
  location: string | null;
  rackNumber: string | null;
}

export function ProductsPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['products', search],
    queryFn: async () => {
      const { data } = await api.get<Product[]>('/products', { params: { search } });
      return data;
    },
  });

  return (
    <Stack gap="lg" style={{padding:'20px'}}>
      <Group justify="space-between">
        <Title order={2}>Products</Title>
      </Group>

      <TextInput
        placeholder="Search by code, description, or barcode"
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        w={360}
      />

      <Paper radius="md" withBorder>
        <Table highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Code</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Barcode</Table.Th>
              <Table.Th>System Qty</Table.Th>
              <Table.Th>Location</Table.Th>
              <Table.Th>Rack</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data?.map((p) => (
              <Table.Tr key={p.id}>
                <Table.Td fw={600}>{p.productCode}</Table.Td>
                <Table.Td>{p.description}</Table.Td>
                <Table.Td>
                  <Text ff="monospace" size="sm">
                    {p.barcode}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge color="violet" variant="light">
                    {p.systemQty}
                  </Badge>
                </Table.Td>
                <Table.Td>{p.location ?? '-'}</Table.Td>
                <Table.Td>{p.rackNumber ?? '-'}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {isLoading && (
          <Text p="md" c="dimmed">
            Loading...
          </Text>
        )}
        {error && (
          <Text p="md" c="red">
            Failed to load products
          </Text>
        )}
        {data?.length === 0 && (
          <Text p="md" c="dimmed">
            No products yet. Upload a stock file first.
          </Text>
        )}
      </Paper>
    </Stack>
  );
}
