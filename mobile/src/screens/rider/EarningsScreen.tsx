import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EarningsStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import {
  AppText,
  Button,
  DeliveryCard,
  Entrance,
  Screen,
  ScreenHeader,
  SectionHeader,
  Stagger,
  StatCard,
} from '../../components';
import { useEarnings, useRiderDeliveries } from '../../hooks/queries';
import { formatMoney } from '../../utils/format';

type Props = NativeStackScreenProps<EarningsStackParamList, 'Earnings'>;

export const EarningsScreen = ({ navigation }: Partial<Props>) => {
  const theme = useTheme();
  const { data: earnings } = useEarnings();
  const { data: deliveries = [] } = useRiderDeliveries();

  const currency = earnings?.currency;
  const recent = deliveries.slice(0, 5);

  return (
    <Screen>
      <ScreenHeader large title="Earnings" subtitle="Your payouts across today, this week and this month" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Stagger step={80} style={styles.grid} itemStyles={[styles.full, styles.half, styles.half]}>
          <StatCard
            accent
            gradient="success"
            icon="flash"
            label="Today"
            value={formatMoney(earnings?.today_minor ?? 0, currency)}
            hint={`${earnings?.deliveries_today ?? 0} deliveries`}
          />
          <StatCard
            gradient="primary"
            icon="calendar"
            label="This week"
            value={formatMoney(earnings?.week_minor ?? 0, currency)}
            hint={`${earnings?.deliveries_week ?? 0} deliveries`}
          />
          <StatCard
            gradient="sunset"
            icon="trending-up"
            label="This month"
            value={formatMoney(earnings?.month_minor ?? 0, currency)}
          />
        </Stagger>

        <Entrance delay={120}>
          <View style={styles.note}>
            <AppText variant="caption" tone="muted">
              Earnings are credited after each completed delivery.
            </AppText>
          </View>
        </Entrance>

        <View style={{ marginTop: theme.spacing.xl }}>
          <SectionHeader title="Recent deliveries" />
          {recent.length === 0 ? (
            <AppText variant="body" tone="muted">
              Completed deliveries will show up here.
            </AppText>
          ) : (
            recent.map((delivery, index) => (
              <Entrance key={delivery.id} delay={140 + index * 60}>
                <DeliveryCard
                  delivery={delivery}
                  onPress={() => navigation?.navigate('DeliveryDetails', { deliveryId: delivery.id })}
                  style={{ marginBottom: theme.spacing.md }}
                />
              </Entrance>
            ))
          )}
        </View>

        <Button
          label="View all history"
          variant="secondary"
          icon="time-outline"
          style={{ marginTop: theme.spacing.sm }}
          onPress={() => navigation?.navigate('DeliveryHistory')}
        />
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  full: { width: '100%', marginBottom: 12 },
  half: { width: '48%', marginBottom: 12 },
  note: { marginTop: 4 },
});