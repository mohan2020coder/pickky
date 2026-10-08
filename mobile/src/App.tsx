import React, { useEffect } from 'react';
import { StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { ThemeProvider, useTheme } from './theme';
import { RealtimeProvider } from './websocket/RealtimeProvider';
import { RootNavigator } from './navigation';
import { ToastHost } from './components';
import { config } from './config';
import { installMockBackend } from './api/mock';
import { restoreSession } from './auth/session';
import { queryClient } from './queryClient';

if (config.isMock) {
  installMockBackend();
}

const AppShell = () => {
  const theme = useTheme();

  useEffect(() => {
    void restoreSession();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle={theme.scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <RootNavigator />
      <ToastHost />
    </View>
  );
};

export default function App() {
  // Hold the first frame until Inter is loaded so text never flashes in the
  // system font (native splash stays visible while we return null).
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <RealtimeProvider>
              <AppShell />
            </RealtimeProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}