import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EarningsStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Button, Card, DeliveryCard, Screen, ScreenHeader, SectionHeader } from '../../components';
import { useEarnings, useRiderDeliveries } from '../../hooks/queries';
import { formatMoney } from '../../utils/format';

type Props = NativeStackScreenProps<EarningsStackParamList, 'Earnings'>;

export const EarningsScreen = ({ navigation }: Partial<Props>) => {
  const theme = useTheme();
  const { data: earnings } = useEarnings();
  const { data: deliveries = [] } = useRiderDeliveries();

  const currency = earnings?.currency;
  const recent = deliveries.slice(0, 5);

  const Row = ({ label, amount, count }: { label: string; amount: number; count?: number }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: theme.spacing.md }}>
      <View>
        <AppText variant="body" tone="secondary">
          {label}
        </AppText>
        {count !== undefined ? (
          <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
            {count} {count === 1 ? 'delivery' : 'deliveries'}
          </AppText>
        ) : null}
      </View>
      <AppText variant="heading3" color={theme.colors.primary}>
        {formatMoney(amount, currency)}
      </AppText>
    </View>
  );

  return (
    <Screen>
      <ScreenHeader large title="Earnings" subtitle="Your payouts across today, this week and this month" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <AppText variant="label" tone="secondary">
            Summary
          </AppText>
          <Row label="Today" amount={earnings?.today_minor ?? 0} count={earnings?.deliveries_today ?? 0} />
          <Row label="This week" amount={earnings?.week_minor ?? 0} count={earnings?.deliveries_week ?? 0} />
          <Row label="This month" amount={earnings?.month_minor ?? 0} />
          <View style={{ height: 1, backgroundColor: theme.colors.divider, marginTop: theme.spacing.lg }} />
          <AppText variant="caption" tone="muted" style={{ marginTop: theme.spacing.sm }}>
            Earnings are credited after each completed delivery.
          </AppText>
        </Card>

        <View style={{ marginTop: theme.spacing.xl }}>
          <SectionHeader title="Recent deliveries" />
          {recent.length === 0 ? (
            <AppText variant="body" tone="muted">
              Completed deliveries will show up here.
            </AppText>
          ) : (
            recent.map((delivery) => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                onPress={() => navigation?.navigate('DeliveryDetails', { deliveryId: delivery.id })}
                style={{ marginBottom: theme.spacing.md }}
              />
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
});
