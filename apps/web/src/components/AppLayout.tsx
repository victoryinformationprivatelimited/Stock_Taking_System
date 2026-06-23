import { NavLink as RouterNavLink, Outlet, useLocation } from 'react-router-dom';
import { AppShell, Avatar, Group, NavLink, ScrollArea, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import {
  IconBuildingWarehouse,
  IconLayoutDashboard,
  IconPackage,
  IconUpload,
  IconUsers,
  IconClipboardList,
  IconMap,
  IconReportAnalytics,
  IconListDetails,
  IconLogout,
} from '@tabler/icons-react';
import { useAuthStore } from '../store/auth.store';
import { useRealtimeSync } from '../lib/realtime';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: IconLayoutDashboard },
  { to: '/products', label: 'Products', icon: IconPackage },
  { to: '/uploads', label: 'Stock Upload', icon: IconUpload },
  { to: '/users', label: 'Counters', icon: IconUsers },
  { to: '/assignments', label: 'Assignments', icon: IconClipboardList },
  { to: '/layouts', label: 'Store Layouts', icon: IconMap },
  { to: '/reports', label: 'Reports', icon: IconReportAnalytics },
  { to: '/logs', label: 'Logs', icon: IconListDetails },
];

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const location = useLocation();
  useRealtimeSync();

  return (
    <AppShell navbar={{ width: 240, breakpoint: 'sm' }}>
      <AppShell.Navbar p="md" style={{ background: 'linear-gradient(180deg, #6826c7, #4e189d)' }}>
        <Group mb="xl" px="xs">
          <ThemeIcon size={36} radius="md" variant="white" color="violet">
            <IconBuildingWarehouse size={22} color="#6826c7" />
          </ThemeIcon>
          <Title order={4} c="white">
            Stock Taking
          </Title>
        </Group>

        <ScrollArea style={{ flex: 1 }}>
          <Stack gap={4}>
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  component={RouterNavLink}
                  to={item.to}
                  label={item.label}
                  leftSection={<item.icon size={18} />}
                  active={isActive}
                  variant="filled"
                  color="violet"
                  style={{ borderRadius: 8 }}
                  styles={{
                    label: { color: isActive ? undefined : '#ece5ff' },
                    section: { color: isActive ? undefined : '#ece5ff' },
                  }}
                />
              );
            })}
          </Stack>
        </ScrollArea>

        <Stack gap="xs" mt="md" pt="md" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <Group px="xs">
            <Avatar color="grape" radius="xl">
              {user?.fullName?.[0] ?? 'M'}
            </Avatar>
            <div>
              <Text size="sm" c="white" fw={600}>
                {user?.fullName}
              </Text>
              <Text size="xs" c="#d8c8ff">
                Manager
              </Text>
            </div>
          </Group>
          <NavLink
            label="Logout"
            leftSection={<IconLogout size={18} />}
            onClick={() => logout()}
            color="violet"
            styles={{ label: { color: '#ece5ff' }, section: { color: '#ece5ff' } }}
          />
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main style={{ background: '#f8f7fb' }}>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
