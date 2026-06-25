import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import { Badge, Group, Paper, Stack, Table, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconFileSpreadsheet, IconUpload, IconX } from '@tabler/icons-react';
import { api } from '../lib/api';

interface StockUpload {
  id: string;
  filename: string;
  uploadedAt: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errorMessage: string | null;
  _count: { products: number };
}

const statusColor: Record<string, string> = {
  PROCESSING: 'yellow',
  COMPLETED: 'green',
  FAILED: 'red',
};

export function UploadPage() {
  const queryClient = useQueryClient();

  const { data: uploads } = useQuery({
    queryKey: ['uploads'],
    queryFn: async () => (await api.get<StockUpload[]>('/uploads')).data,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (data: StockUpload) => {
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      notifications.show({
        title: 'Upload complete',
        message: `${data.filename} processed successfully`,
        color: 'green',
      });
    },
    onError: () =>
      notifications.show({
        title: 'Upload failed',
        message: 'Check the file format and try again.',
        color: 'red',
      }),
  });

  return (
    <Stack gap="lg" style={{padding:'20px'}}>
      <Title order={2}>Stock Upload</Title>
      <Text c="dimmed">
        Upload the Navision stock export (.xlsx) with columns: Product Code, Description, Barcode,
        Stock In Hand, Location, Rack Number.
      </Text>

      <Dropzone
        onDrop={(files) => files[0] && uploadMutation.mutate(files[0])}
        maxFiles={1}
        accept={[MIME_TYPES.xlsx, MIME_TYPES.xls]}
        loading={uploadMutation.isPending}
      >
        <Group justify="center" gap="xl" mih={160} style={{ pointerEvents: 'none' }}>
          <Dropzone.Accept>
            <IconUpload size={48} color="var(--mantine-color-violet-6)" />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX size={48} color="var(--mantine-color-red-6)" />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconFileSpreadsheet size={48} color="var(--mantine-color-violet-4)" />
          </Dropzone.Idle>
          <div>
            <Text size="lg" inline>
              Drag the Navision export here, or click to browse
            </Text>
            <Text size="sm" c="dimmed" inline mt={7}>
              Accepts .xlsx / .xls files
            </Text>
          </div>
        </Group>
      </Dropzone>

      <Title order={4} mt="md">
        Upload History
      </Title>
      <Paper radius="md" withBorder>
        <Table verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>File</Table.Th>
              <Table.Th>Uploaded</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Products</Table.Th>
              <Table.Th>Error</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {uploads?.map((u) => (
              <Table.Tr key={u.id}>
                <Table.Td>{u.filename}</Table.Td>
                <Table.Td>{new Date(u.uploadedAt).toLocaleString()}</Table.Td>
                <Table.Td>
                  <Badge color={statusColor[u.status]}>{u.status}</Badge>
                </Table.Td>
                <Table.Td>{u._count?.products ?? '-'}</Table.Td>
                <Table.Td>
                  <Text c="red" size="sm">
                    {u.errorMessage ?? ''}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {!uploads?.length && (
          <Text p="md" c="dimmed">
            No uploads yet.
          </Text>
        )}
      </Paper>
    </Stack>
  );
}
