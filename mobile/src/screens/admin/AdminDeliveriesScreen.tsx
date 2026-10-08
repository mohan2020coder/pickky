import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminDeliveriesStackParamList, AdminHomeStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { Badge, Chip, DeliveryCard, EmptyView, Entrance, Screen, ScreenHeader, SearchInput } from '../../components';
import { useAdminDeliveries } from '../../hooks/queries';
import { isActiveStatus } from '../../constants/delivery';
import { DeliveryStatus } from '../../types';

type AdminDeliveriesParamLists = AdminHomeStackParamList & AdminDeliveriesStackParamList;
type FilterKey = 'ALL' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED' | 'FAILED';

type Props = NativeStackScreenProps<AdminDeliveriesParamLists, 'ActiveDeliveries' | 'AdminDeliveries'>;

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'CANCELLED', label: 'Cancelled' },
  { key: 'FAILED', label: 'Failed' },
];

export const AdminDeliveriesScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [q, setQ] = useState('');

  const status: DeliveryStatus | undefined = filter === 'ALL' || filter === 'ACTIVE' ? undefined : filter;
  const search = q.trim();

  const { data: deliveries = [], isPending } = useAdminDeliveries({ status, q: search || undefined });

  const visible = filter === 'ACTIVE' ? deliveries.filter((d) => isActiveStatus(d.status)) : deliveries;

  return (
    <Screen>
      <ScreenHeader
        title="Deliveries"
        subtitle="Search, filter and open any delivery"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />
      <View style={{ paddingHorizontal: 20, paddingBottom: theme.spacing.md, gap: theme.spacing.md }}>
        <SearchInput value={q} onChangeText={setQ} placeholder="Search reference or address" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} small />
          ))}
        </View>
        {!isPending ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Badge label={`${visible.length} ${visible.length === 1 ? 'result' : 'results'}`} tone="primary" dot />
          </View>
        ) : null}
      </View>

      <FlatList
        data={visible}
        contentContainerStyle={styles.list}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          isPending ? null : (
            <View style={{ paddingVertical: theme.spacing.xl }}>
              <EmptyView
                icon="cube-outline"
                title="No deliveries found"
                message={search ? `Nothing matches “${search}”.` : 'Try a different filter.'}
              />
            </View>
          )
        }
        renderItem={({ item, index }) => (
          <Entrance delay={Math.min(index * 40, 240)}>
            <DeliveryCard
              delivery={item}
              onPress={() => navigation.navigate('DeliveryDetails', { deliveryId: item.id })}
              style={{ marginBottom: theme.spacing.md }}
            />
          </Entrance>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 24 },
});