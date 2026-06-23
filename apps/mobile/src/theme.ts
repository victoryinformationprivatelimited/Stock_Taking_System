import { MD3LightTheme } from 'react-native-paper';

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6826c7',
    secondary: '#9255fb',
    tertiary: '#c8a8ff',
    background: '#f8f7fb',
    surface: '#ffffff',
    error: '#c62828',
  },
  roundness: 12,
};

export const statusColors: Record<string, string> = {
  PENDING: '#6b7280',
  IN_PROGRESS: '#1565c0',
  DONE: '#2e7d32',
  PENDING_APPROVAL: '#b8860b',
  APPROVED: '#2e7d32',
  RECOUNT_REQUESTED: '#1565c0',
  REJECTED_MAX_ATTEMPTS: '#c62828',
  MATCH: '#2e7d32',
  MISMATCH: '#c62828',
};
