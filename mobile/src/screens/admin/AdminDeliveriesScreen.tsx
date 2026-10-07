import React, { useState } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminDeliveriesStackParamList, AdminHomeStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Chip, DeliveryCard, Screen, ScreenHeader, SearchInput } from '../../components';
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
      <ScreenHeader title="Deliveries" subtitle="Search, filter and open any delivery" />
      <View style={{ paddingHorizontal: 20, paddingBottom: theme.spacing.md, gap: theme.spacing.md }}>
        <SearchInput value={q} onChangeText={setQ} placeholder="Search reference or address" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} small />
          ))}
        </View>
      </View>

      <FlatList
        data={visible}
        contentContainerStyle={styles.list}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          isPending ? null : (
            <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xl * 2 }}>
              <AppText variant="heading3" center>
                No deliveries found
              </AppText>
              <AppText variant="body" tone="secondary" center style={{ marginTop: theme.spacing.sm }}>
                {search ? `Nothing matches “${search}”.` : 'Try a different filter.'}
              </AppText>
            </View>
          )
        }
        renderItem={({ item }) => (
          <DeliveryCard
            delivery={item}
            onPress={() => navigation.navigate('DeliveryDetails', { deliveryId: item.id })}
            style={{ marginBottom: theme.spacing.md }}
          />
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 24 },
});
