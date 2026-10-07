import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme';
import { AppText, Button, Card, Screen, ScreenHeader } from '../../components';
import { useThemeContext, ThemePreference } from '../../theme/ThemeProvider';
import { endSession } from '../../auth/session';

const MODE_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export const SettingsScreen = () => {
  const theme = useTheme();
  const { preference, setPreference } = useThemeContext();

  const handleLogout = async () => {
    await endSession();
  };

  return (
    <Screen>
      <ScreenHeader title="Settings" />
      <View style={{ paddingHorizontal: 20, flex: 1 }}>
        <AppText variant="label" tone="secondary" style={{ marginTop: theme.spacing.md, marginBottom: theme.spacing.sm }}>
          Appearance
        </AppText>
        <Card>
          <AppText variant="body" weight="600">Theme</AppText>
          <AppText variant="bodySmall" tone="secondary" style={{ marginTop: 2 }}>
            Pick your preferred appearance.
          </AppText>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.spacing.md }}>
            {MODE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                label={opt.label}
                variant={preference === opt.value ? 'primary' : 'secondary'}
                size="sm"
                style={{ flex: 1 }}
                onPress={() => setPreference(opt.value)}
              />
            ))}
          </View>
        </Card>

        <AppText variant="label" tone="secondary" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.sm }}>
          Account
        </AppText>
        <Card>
          <Button label="Erase local data & log out" variant="danger" size="md" icon="log-out-outline" onPress={() => void handleLogout()} />
        </Card>

        <AppText variant="caption" tone="muted" style={{ marginTop: theme.spacing.xl, lineHeight: 18 }}>
          Pickky is in early preview. Some features such as push notifications and offline map caching may behave differently on your device.
        </AppText>
      </View>
    </Screen>
  );
};