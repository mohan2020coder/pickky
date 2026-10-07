import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminHomeStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Card, Screen, ScreenHeader } from '../../components';
import { useAdminOverview } from '../../hooks/queries';
import { formatMoney } from '../../utils/format';

type Props = NativeStackScreenProps<AdminHomeStackParamList, 'AdminHome'>;

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  onPress?: () => void;
  accent?: boolean;
};

const StatCard = ({ label, value, hint, onPress, accent = false }: StatCardProps) => {
  const theme = useTheme();
  return (
    <Card onPress={onPress} style={[styles.stat, accent && { width: '100%' }]}>
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
      <AppText variant="price" color={accent ? theme.colors.primary : theme.colors.textPrimary} style={{ marginTop: theme.spacing.xxs }}>
        {value}
      </AppText>
      {hint ? (
        <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
          {hint}
        </AppText>
      ) : null}
    </Card>
  );
};

export const AdminHomeScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { data: overview } = useAdminOverview();

  const openRiders = () => {
    navigation.getParent()?.navigate('AdminUsersTab', { screen: 'AdminRiders' });
  };

  return (
    <Screen>
      <ScreenHeader large title="Overview" subtitle="Live operations at a glance" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.grid}>
          <StatCard
            label="Active deliveries"
            value={String(overview?.active_deliveries ?? 0)}
            hint="In progress right now"
            onPress={() => navigation.navigate('ActiveDeliveries')}
          />
          <StatCard
            label="Today's deliveries"
            value={String(overview?.today_deliveries ?? 0)}
            hint="Created in the last 24h"
            onPress={() => navigation.navigate('ActiveDeliveries')}
          />
          <StatCard
            label="Online riders"
            value={String(overview?.online_riders ?? 0)}
            hint="Ready to accept jobs"
            onPress={openRiders}
          />
          <StatCard
            label="Pending issues"
            value={String(overview?.pending_issues ?? 0)}
            hint="Open tickets to resolve"
            onPress={() => navigation.navigate('Issues')}
          />
        </View>

        <StatCard
          label="Revenue"
          value={formatMoney(overview?.revenue_minor ?? 0, overview?.currency)}
          hint="Total collected so far"
          accent
          onPress={() => navigation.navigate('ActiveDeliveries')}
        />

        <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.lg }}>
          <Card onPress={() => navigation.navigate('ActiveDeliveries')} style={{ flex: 1 }} accessibilityLabel="Open deliveries">
            <AppText variant="label" tone="primary">
              Deliveries
            </AppText>
            <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
              Search, assign and track
            </AppText>
          </Card>
          <Card onPress={() => navigation.navigate('Issues')} style={{ flex: 1 }} accessibilityLabel="Open issues">
            <AppText variant="label" tone="error">
              Issues
            </AppText>
            <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
              Failed and cancelled
            </AppText>
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  stat: { width: '48%' },
});
