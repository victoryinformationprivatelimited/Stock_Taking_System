import { useQuery } from '@tanstack/react-query';
import { Badge, Code, Paper, Stack, Table, Tabs, Text, Title } from '@mantine/core';
import { api } from '../lib/api';

interface AuditLogRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  payload: unknown;
  createdAt: string;
  actor: { fullName: string; email: string };
}

interface ErrorLogRow {
  id: string;
  source: string;
  severity: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  createdAt: string;
}

const severityColor: Record<string, string> = {
  INFO: 'blue',
  WARN: 'orange',
  ERROR: 'red',
};

export function LogsPage() {
  const { data: auditLogs } = useQuery({
    queryKey: ['logs', 'audit'],
    queryFn: async () => (await api.get<AuditLogRow[]>('/logs/audit')).data,
  });

  const { data: errorLogs } = useQuery({
    queryKey: ['logs', 'errors'],
    queryFn: async () => (await api.get<ErrorLogRow[]>('/logs/errors')).data,
  });

  return (
    <Stack gap="lg" style={{padding:'20px'}}>
      <Title order={2}>Logs</Title>

      <Tabs defaultValue="audit">
        <Tabs.List>
          <Tabs.Tab value="audit">Audit Log</Tabs.Tab>
          <Tabs.Tab value="errors">Error Log</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="audit" pt="md">
          <Paper withBorder radius="md">
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>When</Table.Th>
                  <Table.Th>Actor</Table.Th>
                  <Table.Th>Action</Table.Th>
                  <Table.Th>Entity</Table.Th>
                  <Table.Th>Details</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {auditLogs?.map((log) => (
                  <Table.Tr key={log.id}>
                    <Table.Td>
                      <Text size="xs">{new Date(log.createdAt).toLocaleString()}</Text>
                    </Table.Td>
                    <Table.Td>{log.actor.fullName}</Table.Td>
                    <Table.Td>
                      <Badge variant="light">{log.action}</Badge>
                    </Table.Td>
                    <Table.Td>
                      {log.entityType} <Text span c="dimmed" size="xs">({log.entityId.slice(0, 8)})</Text>
                    </Table.Td>
                    <Table.Td>
                      <Code style={{ fontSize: 11 }}>{JSON.stringify(log.payload)}</Code>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            {!auditLogs?.length && (
              <Text p="md" c="dimmed">
                No audit events yet.
              </Text>
            )}
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="errors" pt="md">
          <Paper withBorder radius="md">
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>When</Table.Th>
                  <Table.Th>Source</Table.Th>
                  <Table.Th>Severity</Table.Th>
                  <Table.Th>Message</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {errorLogs?.map((log) => (
                  <Table.Tr key={log.id}>
                    <Table.Td>
                      <Text size="xs">{new Date(log.createdAt).toLocaleString()}</Text>
                    </Table.Td>
                    <Table.Td>{log.source}</Table.Td>
                    <Table.Td>
                      <Badge color={severityColor[log.severity]}>{log.severity}</Badge>
                    </Table.Td>
                    <Table.Td>{log.message}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            {!errorLogs?.length && (
              <Text p="md" c="dimmed">
                No errors logged.
              </Text>
            )}
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
