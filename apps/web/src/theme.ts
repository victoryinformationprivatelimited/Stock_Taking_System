import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'violet',
  defaultRadius: 'md',
  fontFamily: 'Inter, system-ui, sans-serif',
  colors: {
    violet: [
      '#f4eeff',
      '#e3d4ff',
      '#c8a8ff',
      '#ab7bff',
      '#9255fb',
      '#823ef0',
      '#7a32e0',
      '#6826c7',
      '#5c20b3',
      '#4e189d',
    ],
  },
  components: {
    Paper: {
      defaultProps: { shadow: 'sm' },
    },
  },
});
