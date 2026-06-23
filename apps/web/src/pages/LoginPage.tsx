import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  Anchor,
  Box,
  Button,
  Center,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
  ThemeIcon,
} from '@mantine/core';
import { IconBuildingWarehouse, IconAlertCircle } from '@tabler/icons-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setSession(data.accessToken, data.refreshToken, data.user);
      navigate('/dashboard');
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #6826c7 0%, #9255fb 50%, #c8a8ff 100%)',
      }}
    >
      <Center style={{ minHeight: '100vh' }}>
        <Paper radius="lg" p="xl" w={400} shadow="xl">
          <Stack align="center" mb="md">
            <ThemeIcon size={56} radius="xl" variant="light" color="violet">
              <IconBuildingWarehouse size={32} />
            </ThemeIcon>
            <Title order={2} ta="center">
              Stock Taking
            </Title>
            <Box ta="center" c="dimmed" fz="sm">
              Manager Console
            </Box>
          </Stack>
          <form onSubmit={handleSubmit}>
            <Stack>
              <TextInput
                label="Email"
                placeholder="manager@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <PasswordInput
                label="Password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {error && (
                <Alert color="red" icon={<IconAlertCircle size={16} />}>
                  {error}
                </Alert>
              )}
              <Button type="submit" loading={loading} fullWidth size="md" mt="sm">
                Sign in
              </Button>
              <Text ta="center" size="sm" c="dimmed">
                New company? <Anchor component={Link} to="/signup">Create an account</Anchor>
              </Text>
            </Stack>
          </form>
        </Paper>
      </Center>
    </Box>
  );
}
