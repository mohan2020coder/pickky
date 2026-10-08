import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, GradientPreset } from '../../theme';
import { AppText, Avatar, Button, Card, Entrance, Gradient, Screen, ScreenHeader, Stagger } from '../../components';
import { useCurrentUser } from '../../hooks/queries';
import { useAuthStore } from '../../stores/authStore';
import { endSession } from '../../auth/session';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Profile'>;

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: 'Customer',
  RIDER: 'Rider',
  ADMIN: 'Admin',
  SUPPORT: 'Support',
};

type MedallionProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  preset?: GradientPreset;
  size?: number;
};

const Medallion = ({ icon, preset = 'primary', size = 40 }: MedallionProps) => (
  <Gradient preset={preset} style={{ width: size, height: size, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name={icon} size={size * 0.48} color="#FFFFFF" />
  </Gradient>
);

const OutlinePill = ({ label, icon }: { label: string; icon?: React.ComponentProps<typeof Ionicons>['name'] }) => {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.45)',
        borderRadius: theme.radius.pill,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 5,
      }}
    >
      {icon ? <Ionicons name={icon} size={12} color="#FFFFFF" style={{ marginRight: 5 }} /> : null}
      <AppText variant="caption" color="#FFFFFF" weight="800">
        {label}
      </AppText>
    </View>
  );
};

type MenuRowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  hint?: string;
  onPress: () => void;
  preset?: GradientPreset;
};

const MenuRow = ({ icon, label, hint, onPress, preset = 'primary' }: MenuRowProps) => {
  const theme = useTheme();
  return (
    <Card onPress={onPress} accessibilityLabel={label} style={{ marginBottom: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Medallion icon={icon} preset={preset} size={38} />
        <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
          <AppText variant="label" weight="700">
            {label}
          </AppText>
          {hint ? (
            <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
              {hint}
            </AppText>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
      </View>
    </Card>
  );
};

export const ProfileScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { data: user } = useCurrentUser();
  const { primaryRole } = useAuthStore();

  const handleLogout = async () => {
    await endSession();
  };

  return (
    <Screen>
      <ScreenHeader title="Profile" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Entrance delay={0}>
          <Card variant="gradient" gradientPreset="hero" accessibilityLabel="Profile summary">
            <View style={{ alignItems: 'center' }}>
              <Avatar name={user?.name} size={76} ring />
              <AppText variant="heading2" color={theme.colors.textOnGradient} style={{ marginTop: theme.spacing.md }}>
                {user?.name ?? 'Pickky User'}
              </AppText>
              <AppText variant="body" color={theme.colors.textOnGradient} style={{ opacity: 0.9, marginTop: 2 }}>
                {user?.phone ?? '—'}
              </AppText>
              {user?.email ? (
                <AppText variant="caption" color={theme.colors.textOnGradient} style={{ opacity: 0.8, marginTop: 2 }}>
                  {user.email}
                </AppText>
              ) : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: theme.spacing.md, justifyContent: 'center' }}>
                {user?.roles.map((role) => (
                  <OutlinePill
                    key={role}
                    label={`${ROLE_LABELS[role] ?? role}${role === primaryRole ? ' · active' : ''}`}
                    icon={role === primaryRole ? 'star' : undefined}
                  />
                ))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: theme.spacing.sm, justifyContent: 'center' }}>
                <OutlinePill label="Phone linked" icon="call-outline" />
                {user?.email ? <OutlinePill label="Email linked" icon="mail-outline" /> : null}
              </View>
            </View>
          </Card>
        </Entrance>

        <View style={{ marginTop: theme.spacing.xl }}>
          <AppText variant="eyebrow" tone="muted" style={{ marginBottom: theme.spacing.md }}>
            ACCOUNT
          </AppText>
          <Stagger step={70} initialDelay={120}>
            <MenuRow icon="settings-outline" label="Settings" hint="Appearance, theme and local data" preset="primary" onPress={() => navigation.navigate('Settings')} />
            <MenuRow icon="location-outline" label="Saved addresses" hint="Quick pickup points" preset="ocean" onPress={() => navigation.navigate('SavedAddresses')} />
            <MenuRow icon="help-circle-outline" label="Help & FAQ" hint="Answers and support contact" preset="sunset" onPress={() => navigation.navigate('Help')} />
            <MenuRow icon="chatbubbles-outline" label="My support tickets" hint="Track every conversation" preset="success" onPress={() => navigation.navigate('SupportTickets')} />
          </Stagger>
        </View>

        <View style={{ marginTop: theme.spacing.lg }}>
          <Button label="Sign out" variant="danger" icon="log-out-outline" onPress={() => void handleLogout()} />
        </View>

        <AppText variant="caption" tone="muted" center style={{ marginTop: theme.spacing.lg }}>
          Pickky v0.1.0 · {primaryRole ?? '—'}
        </AppText>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 32 },
});
