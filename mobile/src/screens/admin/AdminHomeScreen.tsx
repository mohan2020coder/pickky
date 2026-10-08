import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminHomeStackParamList } from '../../navigation/types';
import { useTheme, GradientPreset } from '../../theme';
import { AppText, Card, Entrance, Gradient, Screen, ScreenHeader, SectionHeader, Stagger, StatCard } from '../../components';
import { useAdminOverview } from '../../hooks/queries';
import { formatMoney } from '../../utils/format';

type Props = NativeStackScreenProps<AdminHomeStackParamList, 'AdminHome'>;

export const AdminHomeScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { data: overview } = useAdminOverview();

  const openRiders = () => {
    navigation.getParent()?.navigate('AdminUsersTab', { screen: 'AdminRiders' });
  };

  const ActionCard = ({
    icon,
    label,
    hint,
    preset,
    onPress,
    accessibilityLabel,
  }: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    hint: string;
    preset: GradientPreset;
    onPress: () => void;
    accessibilityLabel: string;
  }) => (
    <Card onPress={onPress} accessibilityLabel={accessibilityLabel} style={{ flex: 1 }}>
      <Gradient
        preset={preset}
        style={{ width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.md, ...theme.shadows.medium }}
      >
        <Ionicons name={icon} size={21} color="#FFFFFF" />
      </Gradient>
      <AppText variant="label">{label}</AppText>
      <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
        {hint}
      </AppText>
    </Card>
  );

  return (
    <Screen>
      <ScreenHeader large title="Overview" subtitle="Live operations at a glance" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Stagger step={70} style={styles.grid} itemStyles={[styles.half, styles.half, styles.half, styles.half, styles.full]}>
          <StatCard
            icon="bicycle"
            label="Active deliveries"
            value={overview?.active_deliveries ?? 0}
            hint="In progress right now"
            gradient="primary"
            onPress={() => navigation.navigate('ActiveDeliveries')}
          />
          <StatCard
            icon="today"
            label="Today's deliveries"
            value={overview?.today_deliveries ?? 0}
            hint="Created in the last 24h"
            gradient="ocean"
            onPress={() => navigation.navigate('ActiveDeliveries')}
          />
          <StatCard
            icon="radio"
            label="Online riders"
            value={overview?.online_riders ?? 0}
            hint="Ready to accept jobs"
            gradient="success"
            onPress={openRiders}
          />
          <StatCard
            icon="alert-circle"
            label="Pending issues"
            value={overview?.pending_issues ?? 0}
            hint="Open tickets to resolve"
            gradient="danger"
            onPress={() => navigation.navigate('Issues')}
          />
          <StatCard
            accent
            gradient="sunset"
            icon="cash"
            label="Revenue"
            value={formatMoney(overview?.revenue_minor ?? 0, overview?.currency)}
            hint="Total collected so far"
            onPress={() => navigation.navigate('ActiveDeliveries')}
          />
        </Stagger>

        <Entrance delay={420} style={{ marginTop: theme.spacing.xl }}>
          <SectionHeader title="Quick actions" />
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <ActionCard
              icon="bicycle"
              label="Deliveries"
              hint="Search, assign and track"
              preset="primary"
              onPress={() => navigation.navigate('ActiveDeliveries')}
              accessibilityLabel="Open deliveries"
            />
            <ActionCard
              icon="warning"
              label="Issues"
              hint="Failed and cancelled"
              preset="danger"
              onPress={() => navigation.navigate('Issues')}
              accessibilityLabel="Open issues"
            />
          </View>
        </Entrance>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  half: { width: '48%', marginBottom: 12 },
  full: { width: '100%', marginBottom: 4 },
});