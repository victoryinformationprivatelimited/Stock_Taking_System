import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme, ActivityIndicator, View } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { useAuthStore } from '@/store/auth.store';
import { paperTheme } from '@/theme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: paperTheme.colors.background }}>
        <ActivityIndicator color={paperTheme.colors.primary} />
      </View>
    );
  }

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: true, headerStyle: { backgroundColor: paperTheme.colors.primary }, headerTintColor: '#fff' }}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ title: 'My Assignments' }} />
          <Stack.Screen name="scan/[assignmentId]" options={{ title: 'Scan & Count' }} />
        </Stack>
      </ThemeProvider>
    </PaperProvider>
  );
}
