import { useState } from 'react';
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

  const assignMutation = useMutation({
    mutationFn: async () => api.post('/assignments', { counterId, productIds: selectedProductIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      setSelectedProductIds([]);
      notifications.show({ title: 'Assigned', message: 'Products assigned to counter', color: 'green' });
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

  return (
    <Stack gap="lg">
      <Title order={2}>Assignments</Title>

      <Paper radius="md" p="lg" withBorder>
        <Title order={4} mb="md">
          New Assignment
        </Title>
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
      </Paper>

      <Title order={4}>All Assignments</Title>
      <Paper radius="md" withBorder>
        <Table verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Product</Table.Th>
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
