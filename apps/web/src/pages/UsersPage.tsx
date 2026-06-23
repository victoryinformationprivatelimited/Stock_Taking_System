import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Avatar,
  Badge,
  Button,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUserPlus } from '@tabler/icons-react';
import { api } from '../lib/api';

interface AppUser {
  id: string;
  email: string;
  fullName: string;
  role: 'MANAGER' | 'COUNTER';
  isActive: boolean;
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });

  const { data: counters } = useQuery({
    queryKey: ['users', 'COUNTER'],
    queryFn: async () => (await api.get<AppUser[]>('/users', { params: { role: 'COUNTER' } })).data,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/users', { ...form, role: 'COUNTER' });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'COUNTER'] });
      setForm({ fullName: '', email: '', password: '' });
      notifications.show({ title: 'Counter added', message: form.fullName, color: 'green' });
    },
    onError: () =>
      notifications.show({
        title: 'Could not create counter',
        message: 'Email may already be in use.',
        color: 'red',
      }),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'COUNTER'] }),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate();
  }

  return (
    <Stack gap="lg">
      <Title order={2}>Counters</Title>

      <Paper radius="md" p="lg" withBorder>
        <form onSubmit={handleSubmit}>
          <Group align="flex-end">
            <TextInput
              label="Full name"
              placeholder="Jane Counter"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
            <TextInput
              label="Email"
              type="email"
              placeholder="jane@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <PasswordInput
              label="Temporary password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
            <Button type="submit" loading={createMutation.isPending} leftSection={<IconUserPlus size={16} />}>
              Add Counter
            </Button>
          </Group>
        </form>
      </Paper>

      <Paper radius="md" withBorder>
        <Table verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {counters?.map((u) => (
              <Table.Tr key={u.id}>
                <Table.Td>
                  <Group gap="sm">
                    <Avatar color="violet" radius="xl" size="sm">
                      {u.fullName[0]}
                    </Avatar>
                    <Text fw={600}>{u.fullName}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>{u.email}</Table.Td>
                <Table.Td>
                  <Badge color={u.isActive ? 'green' : 'gray'}>
                    {u.isActive ? 'Active' : 'Deactivated'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  {u.isActive && (
                    <Button
                      size="xs"
                      variant="light"
                      color="red"
                      onClick={() => deactivateMutation.mutate(u.id)}
                    >
                      Deactivate
                    </Button>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {!counters?.length && (
          <Text p="md" c="dimmed">
            No counters yet.
          </Text>
        )}
      </Paper>
    </Stack>
  );
}
