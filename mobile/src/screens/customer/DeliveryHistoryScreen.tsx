import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HistoryStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Badge, Chip, DeliveryCard, EmptyView, Screen, ScreenHeader, SkeletonList, Stagger } from '../../components';
import { useDeliveries } from '../../hooks/queries';
import { DeliveryStatus } from '../../types';
import { formatRelativeTime } from '../../utils/format';

type Props = NativeStackScreenProps<HistoryStackParamList, 'DeliveryHistory'>;

const FILTERS: Array<{ key: 'ALL' | DeliveryStatus; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'IN_TRANSIT', label: 'In transit' },
  { key: 'CANCELLED', label: 'Cancelled' },
  { key: 'FAILED', label: 'Failed' },
];

export const DeliveryHistoryScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const [filter, setFilter] = useState<'ALL' | DeliveryStatus>('ALL');
  // No scope filter: this is the "all deliveries" screen (home's "View all"),
  // so active and completed deliveries both show; chips filter by status.
  const { data: deliveries = [], isPending } = useDeliveries({ status: filter === 'ALL' ? undefined : filter });

  return (
    <Screen>
      <ScreenHeader
        title="Your deliveries"
        subtitle="Active and completed pickups"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        right={<Badge label={isPending ? '…' : `${deliveries.length} total`} tone="primary" />}
      />
      <View style={{ paddingHorizontal: 20, paddingBottom: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} small />
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: theme.spacing.xxl }}>
        {isPending ? (
          <SkeletonList rows={4} />
        ) : deliveries.length === 0 ? (
          <View style={{ minHeight: 280, justifyContent: 'center' }}>
            <EmptyView
              icon="file-tray-outline"
              title="No deliveries here yet"
              message={
                filter === 'ALL'
                  ? 'Created pickups will show up here.'
                  : `Pickups with status "${filter}" will show up here.`
              }
            />
          </View>
        ) : (
          <Stagger step={70} initialDelay={40} style={{ paddingHorizontal: 20 }}>
            {deliveries.map((item) => (
              <DeliveryCard
                key={item.id}
                delivery={item}
                onPress={() => navigation.navigate('DeliveryDetails', { deliveryId: item.id })}
                style={{ marginBottom: theme.spacing.md }}
              />
            ))}
          </Stagger>
        )}

        <AppText variant="caption" tone="muted" center style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
          Updated {formatRelativeTime(new Date().toISOString())}
        </AppText>
      </ScrollView>
    </Screen>
  );
};
