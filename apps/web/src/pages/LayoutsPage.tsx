import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import {
  Button,
  Card,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconLayoutGrid, IconPlus, IconUpload } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface StoreLayout {
  id: string;
  name: string;
  imageUrl: string;
  _count: { zones: number };
}

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api').replace(/\/api\/?$/, '');

export function LayoutsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const { data: layouts } = useQuery({
    queryKey: ['layouts'],
    queryFn: async () => (await api.get<StoreLayout[]>('/layouts')).data,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('file', file!);
      const { data } = await api.post('/layouts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (data: StoreLayout) => {
      queryClient.invalidateQueries({ queryKey: ['layouts'] });
      setModalOpen(false);
      setName('');
      setFile(null);
      notifications.show({ title: 'Layout created', message: data.name, color: 'green' });
      navigate(`/layouts/${data.id}`);
    },
    onError: () =>
      notifications.show({ title: 'Upload failed', message: 'Could not upload layout image.', color: 'red' }),
  });

  return (
    <Stack gap="lg" style={{padding:'20px'}}>
      <Group justify="space-between">
        <Title order={2}>Store Layouts</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpen(true)}>
          Upload Layout
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {layouts?.map((layout) => (
          <Card
            key={layout.id}
            withBorder
            radius="md"
            padding="lg"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/layouts/${layout.id}`)}
          >
            <Card.Section>
              <img
                src={`${API_ORIGIN}${layout.imageUrl}`}
                alt={layout.name}
                style={{ width: '100%', height: 140, objectFit: 'cover' }}
              />
            </Card.Section>
            <Group justify="space-between" mt="md">
              <Text fw={600}>{layout.name}</Text>
              <Group gap={4}>
                <IconLayoutGrid size={16} />
                <Text size="sm" c="dimmed">
                  {layout._count?.zones ?? 0} zones
                </Text>
              </Group>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      {!layouts?.length && (
        <Text c="dimmed">No store layouts yet. Upload a floor plan image to get started.</Text>
      )}

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Upload Store Layout">
        <Stack>
          <TextInput label="Layout name" placeholder="Main Store" value={name} onChange={(e) => setName(e.target.value)} required />
          <Dropzone onDrop={(files) => setFile(files[0] ?? null)} maxFiles={1} accept={[MIME_TYPES.png, MIME_TYPES.jpeg]}>
            <Group justify="center" gap="md" mih={100} style={{ pointerEvents: 'none' }}>
              <IconUpload size={32} color="var(--mantine-color-violet-5)" />
              <Text size="sm">{file ? file.name : 'Drop a floor plan image, or click to browse'}</Text>
            </Group>
          </Dropzone>
          <Button
            onClick={() => uploadMutation.mutate()}
            loading={uploadMutation.isPending}
            disabled={!name || !file}
          >
            Create Layout
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
