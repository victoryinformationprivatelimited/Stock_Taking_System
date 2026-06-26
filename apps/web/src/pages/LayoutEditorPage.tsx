import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stage, Layer, Group as KonvaGroup, Rect, Image as KonvaImage, Transformer, Text as KonvaText } from 'react-konva';
import type Konva from 'konva';
import {
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconTrash } from '@tabler/icons-react';
import { api } from '../lib/api';
import { useImage } from '../hooks/useImage';

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api').replace(/\/api\/?$/, '');
const STAGE_WIDTH = 800;

interface Product {
  id: string;
  productCode: string;
  description: string;
}

interface Zone {
  id: string;
  zoneCode: string;
  label: string | null;
  geometry: { x: number; y: number; width: number; height: number };
  productMaps: { product: Product }[];
}

interface LayoutDetail {
  id: string;
  name: string;
  imageUrl: string;
  zones: Zone[];
}

export function LayoutEditorPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [imgSrc, setImgSrc] = useState<string | undefined>(undefined);
  const [loadedImage] = useImage(imgSrc);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [draftRect, setDraftRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [namingModalOpen, setNamingModalOpen] = useState(false);
  const [zoneCode, setZoneCode] = useState('');
  const [productModalZone, setProductModalZone] = useState<Zone | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const transformerRef = useRef<Konva.Transformer>(null);
  const rectRefs = useRef<Record<string, Konva.Rect>>({});

  const { data: layout } = useQuery({
    queryKey: ['layout', id],
    queryFn: async () => (await api.get<LayoutDetail>(`/layouts/${id}`)).data,
    enabled: !!id,
  });

  const { data: products } = useQuery({
    queryKey: ['products', ''],
    queryFn: async () => (await api.get<Product[]>('/products')).data,
  });

  useEffect(() => {
    if (layout) {
      setImgSrc(`${API_ORIGIN}${layout.imageUrl}`);
    }
  }, [layout]);

  const stageHeight = loadedImage ? (STAGE_WIDTH / loadedImage.width) * loadedImage.height : 500;

  const createZoneMutation = useMutation({
    mutationFn: async (payload: { zoneCode: string; geometry: Zone['geometry'] }) =>
      api.post(`/layouts/${id}/zones`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layout', id] });
      setDraftRect(null);
      setZoneCode('');
      setNamingModalOpen(false);
      notifications.show({ title: 'Zone created', message: '', color: 'green' });
    },
  });

  const updateZoneMutation = useMutation({
    mutationFn: async ({ zoneId, geometry }: { zoneId: string; geometry: Zone['geometry'] }) =>
      api.put(`/layouts/${id}/zones/${zoneId}`, { geometry }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['layout', id] }),
  });

  const deleteZoneMutation = useMutation({
    mutationFn: async (zoneId: string) => api.delete(`/layouts/${id}/zones/${zoneId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layout', id] });
      setSelectedZoneId(null);
    },
  });

  const setProductsMutation = useMutation({
    mutationFn: async ({ zoneId, productIds }: { zoneId: string; productIds: string[] }) =>
      api.put(`/layouts/${id}/zones/${zoneId}/products`, { productIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layout', id] });
      setProductModalZone(null);
      notifications.show({ title: 'Products mapped', message: '', color: 'green' });
    },
  });

  useEffect(() => {
    if (selectedZoneId && transformerRef.current && rectRefs.current[selectedZoneId]) {
      transformerRef.current.nodes([rectRefs.current[selectedZoneId]]);
      transformerRef.current.getLayer()?.batchDraw();
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  }, [selectedZoneId, layout]);

  function handleStageMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = e.target.getStage();
    if (!stage) return;
    // The layout image covers the whole stage, so clicks land on it (not the
    // bare Stage). Allow drawing from the stage or the background image, but
    // not from an existing zone rect or a transformer resize handle.
    const isBackground = e.target === stage || e.target.getClassName() === 'Image';
    if (!isBackground) return;
    setSelectedZoneId(null);
    const pos = stage.getPointerPosition()!;
    setDrawStart(pos);
    setDraftRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
  }

  function handleStageMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    if (!drawStart) return;
    const pos = e.target.getStage()!.getPointerPosition()!;
    setDraftRect({
      x: Math.min(drawStart.x, pos.x),
      y: Math.min(drawStart.y, pos.y),
      width: Math.abs(pos.x - drawStart.x),
      height: Math.abs(pos.y - drawStart.y),
    });
  }

  function handleStageMouseUp() {
    setDrawStart(null);
    if (draftRect && draftRect.width > 10 && draftRect.height > 10) {
      setNamingModalOpen(true);
    } else {
      setDraftRect(null);
    }
  }

  function confirmCreateZone() {
    if (!draftRect || !zoneCode) return;
    createZoneMutation.mutate({
      zoneCode,
      geometry: {
        x: draftRect.x / STAGE_WIDTH,
        y: draftRect.y / stageHeight,
        width: draftRect.width / STAGE_WIDTH,
        height: draftRect.height / stageHeight,
      },
    });
  }

  function handleTransformEnd(zone: Zone) {
    const node = rectRefs.current[zone.id];
    if (!node) return;
    const geometry = {
      x: node.x() / STAGE_WIDTH,
      y: node.y() / stageHeight,
      width: (node.width() * node.scaleX()) / STAGE_WIDTH,
      height: (node.height() * node.scaleY()) / stageHeight,
    };
    node.scaleX(1);
    node.scaleY(1);
    updateZoneMutation.mutate({ zoneId: zone.id, geometry });
  }

  function openProductModal(zone: Zone) {
    setProductModalZone(zone);
    setSelectedProductIds(zone.productMaps.map((m) => m.product.id));
  }

  if (!layout) {
    return <Text>Loading layout...</Text>;
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>{layout.name}</Title>
        <Text c="dimmed" size="sm">
          Click and drag on the image to draw a zone. Click a zone to resize, map products, or delete it.
        </Text>
      </Group>

      <Group align="flex-start" wrap="nowrap">
        <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
          <Stage
            width={STAGE_WIDTH}
            height={stageHeight}
            onMouseDown={handleStageMouseDown}
            onMouseMove={handleStageMouseMove}
            onMouseUp={handleStageMouseUp}
          >
            <Layer>
              {loadedImage && <KonvaImage image={loadedImage} width={STAGE_WIDTH} height={stageHeight} />}

              {layout.zones.map((zone) => {
                const x = zone.geometry.x * STAGE_WIDTH;
                const y = zone.geometry.y * stageHeight;
                const w = zone.geometry.width * STAGE_WIDTH;
                const h = zone.geometry.height * stageHeight;
                return (
                  <KonvaGroup key={zone.id}>
                    <Rect
                      ref={(node) => {
                        if (node) rectRefs.current[zone.id] = node;
                      }}
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      fill="rgba(130, 62, 240, 0.18)"
                      stroke={selectedZoneId === zone.id ? '#6826c7' : '#9255fb'}
                      strokeWidth={selectedZoneId === zone.id ? 2 : 1}
                      draggable
                      onClick={() => setSelectedZoneId(zone.id)}
                      onTap={() => setSelectedZoneId(zone.id)}
                      onDragEnd={() => handleTransformEnd(zone)}
                      onTransformEnd={() => handleTransformEnd(zone)}
                    />
                    <KonvaText x={x + 4} y={y + 4} text={zone.label || zone.zoneCode} fontSize={12} fill="#4e189d" listening={false} />
                  </KonvaGroup>
                );
              })}

              {draftRect && (
                <Rect
                  x={draftRect.x}
                  y={draftRect.y}
                  width={draftRect.width}
                  height={draftRect.height}
                  fill="rgba(130, 62, 240, 0.25)"
                  stroke="#6826c7"
                  dash={[4, 4]}
                />
              )}

              <Transformer ref={transformerRef} rotateEnabled={false} />
            </Layer>
          </Stage>
        </Paper>

        <Stack gap="sm" w={280}>
          <Title order={5}>Zones ({layout.zones.length})</Title>
          <ScrollArea h={stageHeight}>
            <Stack gap="xs">
              {layout.zones.map((zone) => (
                <Paper
                  key={zone.id}
                  withBorder
                  p="sm"
                  radius="sm"
                  style={{
                    cursor: 'pointer',
                    borderColor: selectedZoneId === zone.id ? '#6826c7' : undefined,
                  }}
                  onClick={() => setSelectedZoneId(zone.id)}
                >
                  <Group justify="space-between" mb={4}>
                    <Text fw={600} size="sm">
                      {zone.label || zone.zoneCode}
                    </Text>
                    <Badge size="sm" variant="light">
                      {zone.productMaps.length} products
                    </Badge>
                  </Group>
                  <Group gap="xs">
                    <Button size="xs" variant="light" onClick={() => openProductModal(zone)}>
                      Map products
                    </Button>
                    <Button
                      size="xs"
                      color="red"
                      variant="subtle"
                      leftSection={<IconTrash size={14} />}
                      onClick={() => deleteZoneMutation.mutate(zone.id)}
                    >
                      Delete
                    </Button>
                  </Group>
                </Paper>
              ))}
              {!layout.zones.length && (
                <Text size="sm" c="dimmed">
                  No zones yet — draw one on the image.
                </Text>
              )}
            </Stack>
          </ScrollArea>
        </Stack>
      </Group>

      <Modal opened={namingModalOpen} onClose={() => { setNamingModalOpen(false); setDraftRect(null); }} title="Name this zone">
        <Stack>
          <TextInput label="Zone code" placeholder="e.g. A1" value={zoneCode} onChange={(e) => setZoneCode(e.target.value)} required />
          <Button onClick={confirmCreateZone} loading={createZoneMutation.isPending} disabled={!zoneCode}>
            Create Zone
          </Button>
        </Stack>
      </Modal>

      <Modal opened={!!productModalZone} onClose={() => setProductModalZone(null)} title="Map products to zone">
        <Stack>
          <ScrollArea h={300}>
            <Stack gap={6}>
              {products?.map((p) => (
                <Checkbox
                  key={p.id}
                  label={`${p.productCode} — ${p.description}`}
                  checked={selectedProductIds.includes(p.id)}
                  onChange={() =>
                    setSelectedProductIds((prev) =>
                      prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id],
                    )
                  }
                />
              ))}
            </Stack>
          </ScrollArea>
          <Button
            onClick={() =>
              productModalZone &&
              setProductsMutation.mutate({ zoneId: productModalZone.id, productIds: selectedProductIds })
            }
            loading={setProductsMutation.isPending}
          >
            Save Mapping
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
