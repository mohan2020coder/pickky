import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Button, Card, Chip, Screen, ScreenHeader } from '../../components';
import { useThemeContext, ThemePreference } from '../../theme/ThemeProvider';
import { endSession } from '../../auth/session';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Settings'>;

const MODE_OPTIONS: Array<{ value: ThemePreference; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = [
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
];

export const SettingsScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { preference, setPreference } = useThemeContext();

  const handleLogout = async () => {
    await endSession();
  };

  return (
    <Screen>
      <ScreenHeader title="Settings" subtitle="Make Pickky yours" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText variant="eyebrow" tone="muted" style={{ marginBottom: theme.spacing.md }}>
          APPEARANCE
        </AppText>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: theme.colors.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: theme.spacing.md,
              }}
            >
              <Ionicons name="color-palette-outline" size={18} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="label" weight="700">
                Theme
              </AppText>
              <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                Pick your preferred appearance.
              </AppText>
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: theme.spacing.md }}>
            {MODE_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                icon={opt.icon}
                selected={preference === opt.value}
                onPress={() => setPreference(opt.value)}
                style={{ flex: 1, minWidth: 96 }}
              />
            ))}
          </View>
          <AppText variant="caption" tone="muted" style={{ marginTop: theme.spacing.md }}>
            Currently following the {preference} appearance setting.
          </AppText>
        </Card>

        <AppText variant="eyebrow" tone="muted" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>
          ACCOUNT
        </AppText>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: theme.colors.errorSoft,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: theme.spacing.md,
              }}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.error} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="label" weight="700">
                Local session
              </AppText>
              <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                Erase cached data and end this device's session.
              </AppText>
            </View>
          </View>
          <Button label="Erase local data & log out" variant="danger" size="md" icon="log-out-outline" onPress={() => void handleLogout()} />
        </Card>

        <AppText variant="caption" tone="muted" style={{ marginTop: theme.spacing.xl, lineHeight: 18 }}>
          Pickky is in early preview. Some features such as push notifications and offline map caching may behave differently on your device.
        </AppText>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 32 },
});
