import { useEffect, useState, useCallback } from 'react';
import { View, SectionList, StyleSheet, RefreshControl } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Appbar, Card, Chip, Text, Banner } from 'react-native-paper';
import { useAuthStore } from '@/store/auth.store';
import { getDb } from '@/lib/db';
import { fullSync } from '@/lib/sync';
import { paperTheme, statusColors } from '@/theme';

interface AssignmentRow {
  id: string;
  product_code: string;
  description: string;
  location: string | null;
  rack_number: string | null;
  status: string;
  zone_id: string | null;
  zone_label: string | null;
  attempts_used: number;
  last_attempt_status: string | null;
  last_attempt_result: string | null;
}

interface Section {
  title: string;
  data: AssignmentRow[];
}

const UNASSIGNED_ZONE_KEY = '__none__';

function groupByZone(rows: AssignmentRow[]): Section[] {
  const groups = new Map<string, Section>();
  for (const row of rows) {
    const key = row.zone_id ?? UNASSIGNED_ZONE_KEY;
    const title = row.zone_label ?? 'Unassigned';
    if (!groups.has(key)) {
      groups.set(key, { title, data: [] });
    }
    groups.get(key)!.data.push(row);
  }
  // Show zone-grouped sections first, "Unassigned" last.
  return Array.from(groups.entries())
    .sort(([a], [b]) => (a === UNASSIGNED_ZONE_KEY ? 1 : b === UNASSIGNED_ZONE_KEY ? -1 : a.localeCompare(b)))
    .map(([, section]) => section);
}

export default function AssignmentsScreen() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);
  const [sections, setSections] = useState<Section[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const loadAssignments = useCallback(async () => {
    const db = await getDb();
    const rows = await db.getAllAsync<AssignmentRow>(
      'SELECT id, product_code, description, location, rack_number, status, zone_id, zone_label, attempts_used, last_attempt_status, last_attempt_result FROM assignments ORDER BY status ASC',
    );
    setSections(groupByZone(rows));
  }, []);

  const sync = useCallback(async () => {
    try {
      await fullSync();
      setSyncError(null);
    } catch {
      setSyncError('Offline — showing last synced data');
    }
    await loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    sync();
  }, [sync]);

  if (!accessToken) {
    return <Redirect href="/login" />;
  }

  async function handleRefresh() {
    setRefreshing(true);
    await sync();
    setRefreshing(false);
  }

  return (
    <View style={styles.container}>
      <Appbar.Header style={{ backgroundColor: paperTheme.colors.primary }}>
        <Appbar.Content title="My Assignments" color="#fff" />
        <Appbar.Action icon="logout" color="#fff" onPress={() => logout()} />
      </Appbar.Header>

      {syncError && (
        <Banner visible icon="wifi-off" actions={[]}>
          {syncError}
        </Banner>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[paperTheme.colors.primary]} />}
        ListEmptyComponent={
          <Text style={styles.empty} variant="bodyMedium">
            No assigned products yet. Pull down to refresh.
          </Text>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Chip icon="map-marker" compact style={{ backgroundColor: paperTheme.colors.primary }} textStyle={{ color: '#fff' }}>
              {section.title}
            </Chip>
            <Text variant="bodySmall" style={styles.meta}>
              {section.data.length} product(s)
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Card style={styles.card} onPress={() => router.push(`/scan/${item.id}`)} mode="elevated">
            <Card.Content>
              <View style={styles.cardHeader}>
                <Text variant="titleMedium" style={styles.code}>
                  {item.product_code}
                </Text>
                <Chip
                  compact
                  textStyle={{ color: '#fff', fontSize: 12 }}
                  style={{ backgroundColor: statusColors[item.status] ?? '#888' }}
                >
                  {item.status.replace('_', ' ')}
                </Chip>
              </View>
              <Text variant="bodyMedium">{item.description}</Text>
              <Text variant="bodySmall" style={styles.meta}>
                {item.location ?? '-'} / {item.rack_number ?? '-'}
              </Text>
              {item.attempts_used > 0 && (
                <View style={styles.cardHeader}>
                  <Text variant="bodySmall" style={styles.meta}>
                    Attempt {item.attempts_used} of 3
                  </Text>
                  {item.last_attempt_status && (
                    <Chip
                      compact
                      textStyle={{ color: '#fff', fontSize: 11 }}
                      style={{ backgroundColor: statusColors[item.last_attempt_status] ?? '#888' }}
                    >
                      {item.last_attempt_status.replace(/_/g, ' ')}
                    </Chip>
                  )}
                </View>
              )}
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: paperTheme.colors.background },
  list: { padding: 16, gap: 12 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  card: { marginBottom: 4, borderRadius: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  code: { fontWeight: '700' },
  meta: { color: '#888', marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 40, color: '#888' },
});
