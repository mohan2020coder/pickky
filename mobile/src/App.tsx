import React, { useEffect } from 'react';
import { StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from './theme';
import { RealtimeProvider } from './websocket/RealtimeProvider';
import { RootNavigator } from './navigation';
import { ToastHost } from './components';
import { config } from './config';
import { installMockBackend } from './api/mock';
import { restoreSession } from './auth/session';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

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