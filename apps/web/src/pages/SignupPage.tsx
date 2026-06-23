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
import { IconAlertCircle, IconBuildingWarehouse } from '@tabler/icons-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';

export function SignupPage() {
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
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
      const { data } = await api.post('/auth/register-tenant', {
        companyName,
        fullName,
        email,
        password,
      });
      setSession(data.accessToken, data.refreshToken, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not create account. Please try again.');
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
        <Paper radius="lg" p="xl" w={420} shadow="xl">
          <Stack align="center" mb="md">
            <ThemeIcon size={56} radius="xl" variant="light" color="violet">
              <IconBuildingWarehouse size={32} />
            </ThemeIcon>
            <Title order={2} ta="center">
              Create your company
            </Title>
            <Box ta="center" c="dimmed" fz="sm">
              Start your free Stock Taking workspace
            </Box>
          </Stack>
          <form onSubmit={handleSubmit}>
            <Stack>
              <TextInput
                label="Company name"
                placeholder="Acme Retail Co"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
              <TextInput
                label="Your full name"
                placeholder="Jane Manager"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <TextInput
                label="Email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <PasswordInput
                label="Password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              {error && (
                <Alert color="red" icon={<IconAlertCircle size={16} />}>
                  {error}
                </Alert>
              )}
              <Button type="submit" loading={loading} fullWidth size="md" mt="sm">
                Create account
              </Button>
              <Text ta="center" size="sm" c="dimmed">
                Already have an account? <Anchor component={Link} to="/login">Sign in</Anchor>
              </Text>
            </Stack>
          </form>
        </Paper>
      </Center>
    </Box>
  );
}
