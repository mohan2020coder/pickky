import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { AppText, Avatar, Button, Card, Screen, ScreenHeader } from '../../components';
import { useCurrentUser } from '../../hooks/queries';
import { useAuthStore } from '../../stores/authStore';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Profile'>;

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: 'Customer',
  RIDER: 'Rider',
  ADMIN: 'Admin',
  SUPPORT: 'Support',
};

export const ProfileScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { data: user } = useCurrentUser();
  const { primaryRole } = useAuthStore();

  return (
    <Screen>
      <ScreenHeader title="Profile" />
      <View style={styles.content}>
        <Card>
          <View style={{ alignItems: 'center' }}>
            <Avatar name={user?.name} size={72} ring />
            <AppText variant="heading2" style={{ marginTop: theme.spacing.md }}>
              {user?.name ?? 'Pickky User'}
            </AppText>
            <AppText variant="body" tone="secondary">
              {user?.phone ?? '—'}
            </AppText>
            {user?.email ? (
              <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                {user.email}
              </AppText>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: theme.spacing.md, justifyContent: 'center' }}>
              {user?.roles.map((role) => (
                <View key={role} style={[styles.roleChip, { backgroundColor: role === primaryRole ? theme.colors.primary : theme.colors.primarySoft }]}>
                  <AppText variant="caption" color={role === primaryRole ? theme.colors.onPrimary : theme.colors.primary}>
                    {ROLE_LABELS[role] ?? role}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        </Card>

        <Card style={{ marginTop: theme.spacing.md }}>
          <MenuRow icon="settings-outline" label="Settings" onPress={() => navigation.navigate('Settings')} />
          <MenuRow icon="location-outline" label="Saved addresses" onPress={() => navigation.navigate('SavedAddresses')} />
          <MenuRow icon="help-circle-outline" label="Help & FAQ" onPress={() => navigation.navigate('Help')} />
          <MenuRow icon="chatbubbles-outline" label="My support tickets" onPress={() => navigation.navigate('SupportTickets')} />
        </Card>

        <View style={{ alignItems: 'center', marginTop: theme.spacing.lg }}>
          <AppText variant="caption" tone="muted">
            Pickky v0.1.0 · {primaryRole ?? '—'}
          </AppText>
        </View>
      </View>
    </Screen>
  );
};

type MenuRowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
};

const MenuRow = ({ icon, label, onPress }: MenuRowProps) => (
  <Button variant="ghost" size="md" icon={icon} label={label} onPress={onPress} style={{ justifyContent: 'flex-start', width: '100%' }} />
);

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 20 },
  roleChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
});