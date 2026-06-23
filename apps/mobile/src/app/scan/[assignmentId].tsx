import { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, router } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { Text, Button, TextInput, Chip, ActivityIndicator } from 'react-native-paper';
import { getDb } from '@/lib/db';
import { pushPendingCounts } from '@/lib/sync';
import { paperTheme } from '@/theme';

const MAX_RECOUNT_ATTEMPTS = 3;

interface AssignmentRow {
  id: string;
  product_id: string;
  product_code: string;
  description: string;
  barcode: string;
  system_qty: number;
  status: string;
  attempts_used: number;
}

export default function ScanScreen() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [assignment, setAssignment] = useState<AssignmentRow | null>(null);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [validated, setValidated] = useState(false);
  const [countedQty, setCountedQty] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const db = await getDb();
      const row = await db.getFirstAsync<AssignmentRow>(
        'SELECT id, product_id, product_code, description, barcode, system_qty, status, attempts_used FROM assignments WHERE id = ?',
        [assignmentId],
      );
      setAssignment(row ?? null);

      const localPending = await db.getFirstAsync<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM pending_count_records WHERE assignment_id = ?',
        [assignmentId],
      );
      const attemptsSoFar = (row?.attempts_used ?? 0) + (localPending?.cnt ?? 0);
      setAttemptNumber(attemptsSoFar + 1);
    })();
  }, [assignmentId]);

  if (!permission) {
    return <View />;
  }
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ marginBottom: 12 }}>Camera permission is required to scan barcodes.</Text>
        <Button mode="contained" onPress={requestPermission}>
          Grant permission
        </Button>
      </View>
    );
  }

  if (!assignment) {
    return (
      <View style={styles.center}>
        <Text>Assignment not found locally. Pull to refresh on the previous screen.</Text>
      </View>
    );
  }

  if (attemptNumber > MAX_RECOUNT_ATTEMPTS) {
    return (
      <View style={styles.center}>
        <Chip icon="alert" style={{ backgroundColor: paperTheme.colors.error, marginBottom: 16 }} textStyle={{ color: '#fff' }}>
          Recount limit reached
        </Chip>
        <Text style={{ textAlign: 'center' }}>
          This product has reached the maximum of {MAX_RECOUNT_ATTEMPTS} count attempts and has been escalated
          to the manager for resolution.
        </Text>
      </View>
    );
  }

  function handleBarcodeScanned({ data }: { data: string }) {
    if (scannedBarcode || !assignment) return;
    setScannedBarcode(data);
    if (data === assignment.barcode) {
      setValidated(true);
    } else {
      setValidated(false);
      Alert.alert('Barcode mismatch', 'Scanned barcode does not match this product.', [
        { text: 'Retry', onPress: () => setScannedBarcode(null) },
      ]);
    }
  }

  async function submitCount() {
    if (!assignment) return;
    const qty = Number(countedQty);
    if (Number.isNaN(qty) || qty < 0) {
      Alert.alert('Invalid quantity', 'Enter a valid non-negative number.');
      return;
    }

    setSubmitting(true);
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO pending_count_records
        (local_id, assignment_id, attempt_number, scanned_barcode, barcode_validated, counted_qty, submitted_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        Crypto.randomUUID(),
        assignment.id,
        attemptNumber,
        scannedBarcode!,
        validated ? 1 : 0,
        qty,
        new Date().toISOString(),
      ],
    );

    try {
      await pushPendingCounts();
    } catch {
      // offline — will sync next time the assignments list refreshes
    }

    const isMatch = qty === assignment.system_qty;
    setSubmitting(false);
    Alert.alert(
      isMatch ? 'Count submitted' : 'Mismatch recorded',
      isMatch
        ? 'Your count matches system stock. Sent for manager approval.'
        : 'Your count does not match system stock. Sent to the manager — they may request a recount.',
    );
    router.back();
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text variant="titleLarge" style={styles.title}>
            {assignment.product_code}
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {assignment.description}
          </Text>
        </View>
        <Chip icon="counter" style={{ backgroundColor: paperTheme.colors.primary }} textStyle={{ color: '#fff' }}>
          Attempt {attemptNumber} of {MAX_RECOUNT_ATTEMPTS}
        </Chip>
      </View>

      {!scannedBarcode ? (
        <View style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'code128', 'qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
        </View>
      ) : validated ? (
        <View style={styles.form}>
          <Chip icon="check-circle" style={{ backgroundColor: '#2e7d32', marginBottom: 16, alignSelf: 'flex-start' }} textStyle={{ color: '#fff' }}>
            Barcode validated
          </Chip>
          <TextInput
            label="Counted quantity"
            mode="outlined"
            keyboardType="numeric"
            value={countedQty}
            onChangeText={setCountedQty}
            style={{ marginBottom: 16 }}
          />
          <Button mode="contained" onPress={submitCount} loading={submitting} disabled={submitting}>
            Submit count
          </Button>
        </View>
      ) : (
        <ActivityIndicator style={{ marginTop: 24 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: paperTheme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12 },
  title: { fontWeight: '700' },
  subtitle: { color: '#666' },
  cameraWrap: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  camera: { flex: 1 },
  form: { marginTop: 16 },
});
