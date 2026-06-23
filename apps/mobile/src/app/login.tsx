import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Text, TextInput, Button, Avatar, HelperText } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { paperTheme } from '@/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.user.role !== 'COUNTER') {
        setError('This app is for count users only.');
        return;
      }
      await setSession(data.accessToken, data.refreshToken, data.user);
      router.replace('/');
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient
      colors={[paperTheme.colors.primary, paperTheme.colors.secondary, paperTheme.colors.tertiary]}
      style={styles.gradient}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Avatar.Icon size={64} icon="warehouse" style={{ backgroundColor: paperTheme.colors.primary + '22' }} color={paperTheme.colors.primary} />
            <Text variant="headlineMedium" style={styles.title}>
              Stock Taking
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Counter Login
            </Text>
          </View>

          <TextInput
            label="Email"
            mode="outlined"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
          <TextInput
            label="Password"
            mode="outlined"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />
          {error && <HelperText type="error">{error}</HelperText>}
          <Button mode="contained" onPress={handleLogin} loading={loading} disabled={loading} style={styles.button}>
            Sign in
          </Button>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1, justifyContent: 'center' },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 24,
    elevation: 6,
  },
  header: { alignItems: 'center', marginBottom: 24, gap: 4 },
  title: { fontWeight: '700', marginTop: 8 },
  subtitle: { color: '#888' },
  input: { marginBottom: 12 },
  button: { marginTop: 8, borderRadius: 12 },
});
