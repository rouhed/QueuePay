import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { InAppNotification } from '@/components/InAppNotification';

export const unstable_settings = {
  anchor: 'splash',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <NotificationProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="splash" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="entity-detail" />
          <Stack.Screen name="booking" />
          <Stack.Screen name="ticket-detail" />
        </Stack>
        <InAppNotification />
        <StatusBar style="auto" />
      </ThemeProvider>
    </NotificationProvider>
  );
}
