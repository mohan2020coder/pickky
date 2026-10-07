import React, { useState } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HistoryStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Chip, DeliveryCard, Screen, ScreenHeader } from '../../components';
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
      <ScreenHeader title="Your deliveries" subtitle="Active and completed pickups" />
      <View style={{ paddingHorizontal: 20, paddingBottom: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} small />
          ))}
        </View>
      </View>

      <FlatList
        data={deliveries}
        contentContainerStyle={styles.list}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          isPending ? null : (
            <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xl * 2 }}>
              <AppText variant="heading3" center>
                No deliveries here yet
              </AppText>
              <AppText variant="body" tone="secondary" center style={{ marginTop: theme.spacing.sm }}>
                Created {filter === 'ALL' ? 'pickups will show up here.' : `pickups with status "${filter}" will show up here.`}
              </AppText>
            </View>
          )
        }
        renderItem={({ item }) => (
          <DeliveryCard delivery={item} onPress={() => navigation.navigate('DeliveryDetails', { deliveryId: item.id })} style={{ marginBottom: theme.spacing.md }} />
        )}
      />
      <AppText variant="caption" tone="muted" center style={{ marginBottom: theme.spacing.lg }}>
        Updated {formatRelativeTime(new Date().toISOString())}
      </AppText>
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 24 },
});