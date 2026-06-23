import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Group, Paper, Stack, Table, Tabs, Text, Title } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import { api } from '../lib/api';

interface MismatchRow {
  productCode: string;
  description: string;
  counter: string;
  systemQty: string;
  countedQty: string;
  attemptNumber: number;
  status: string;
  assignmentStatus: string;
}

interface ProductivityRow {
  counter: string;
  email: string;
  totalAssignments: number;
  completed: number;
  mismatches: number;
  avgAttempts: number;
}

async function downloadExport(type: 'mismatches' | 'productivity') {
  const response = await api.get(`/reports/export`, { params: { type }, responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${type}-report.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const { data: mismatches } = useQuery({
    queryKey: ['reports', 'mismatches'],
    queryFn: async () => (await api.get<MismatchRow[]>('/reports/mismatches')).data,
  });

  const { data: productivity } = useQuery({
    queryKey: ['reports', 'productivity'],
    queryFn: async () => (await api.get<ProductivityRow[]>('/reports/productivity')).data,
  });

  return (
    <Stack gap="lg">
      <Title order={2}>Reports</Title>

      <Tabs defaultValue="mismatches">
        <Tabs.List>
          <Tabs.Tab value="mismatches">Mismatches</Tabs.Tab>
          <Tabs.Tab value="productivity">Counter Productivity</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="mismatches" pt="md">
          <Stack gap="sm">
            <Group justify="flex-end">
              <Button
                size="xs"
                leftSection={<IconDownload size={14} />}
                onClick={() => downloadExport('mismatches')}
              >
                Export to Excel
              </Button>
            </Group>
            <Paper withBorder radius="md">
              <Table verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Product</Table.Th>
                    <Table.Th>Counter</Table.Th>
                    <Table.Th>System Qty</Table.Th>
                    <Table.Th>Counted Qty</Table.Th>
                    <Table.Th>Attempt</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {mismatches?.map((m, i) => (
                    <Table.Tr key={i}>
                      <Table.Td>
                        <Text fw={600} size="sm">
                          {m.productCode}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {m.description}
                        </Text>
                      </Table.Td>
                      <Table.Td>{m.counter}</Table.Td>
                      <Table.Td>{m.systemQty}</Table.Td>
                      <Table.Td>{m.countedQty}</Table.Td>
                      <Table.Td>{m.attemptNumber}</Table.Td>
                      <Table.Td>
                        <Badge color={m.status === 'REJECTED_MAX_ATTEMPTS' ? 'red' : 'orange'}>
                          {m.status.replace(/_/g, ' ')}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              {!mismatches?.length && (
                <Text p="md" c="dimmed">
                  No mismatches recorded.
                </Text>
              )}
            </Paper>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="productivity" pt="md">
          <Stack gap="sm">
            <Group justify="flex-end">
              <Button
                size="xs"
                leftSection={<IconDownload size={14} />}
                onClick={() => downloadExport('productivity')}
              >
                Export to Excel
              </Button>
            </Group>
            <Paper withBorder radius="md">
              <Table verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Counter</Table.Th>
                    <Table.Th>Assignments</Table.Th>
                    <Table.Th>Completed</Table.Th>
                    <Table.Th>Mismatches</Table.Th>
                    <Table.Th>Avg Attempts</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {productivity?.map((p) => (
                    <Table.Tr key={p.email}>
                      <Table.Td>
                        <Text fw={600} size="sm">
                          {p.counter}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {p.email}
                        </Text>
                      </Table.Td>
                      <Table.Td>{p.totalAssignments}</Table.Td>
                      <Table.Td>{p.completed}</Table.Td>
                      <Table.Td>
                        <Badge color={p.mismatches > 0 ? 'red' : 'gray'} variant="light">
                          {p.mismatches}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{p.avgAttempts}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
