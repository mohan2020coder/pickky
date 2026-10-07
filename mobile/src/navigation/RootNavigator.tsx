import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useTheme } from '../theme';
import { buildNavigationTheme } from './theme';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { useAuthStore } from '../stores/authStore';
import { SplashScreen } from '../screens/auth';

export const RootNavigator = () => {
  const status = useAuthStore((s) => s.status);
  const { scheme, colors } = useTheme();
  const theme = buildNavigationTheme(scheme, colors);

  return (
    <NavigationContainer theme={theme}>
      {status === 'restoring' ? <SplashScreen /> : status === 'authenticated' ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};