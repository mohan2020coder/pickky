import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminUsersStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Avatar, Badge, Button, Card, EmptyView, Entrance, ReadOnlyRating, Screen, ScreenHeader, SearchInput } from '../../components';
import { useAdminRiders } from '../../hooks/queries';
import * as adminApi from '../../api/admin';
import { queryKeys } from '../../constants/queryKeys';
import { toast } from '../../stores/uiStore';

type Props = NativeStackScreenProps<AdminUsersStackParamList, 'AdminRiders'>;

type AdminRiderRow = {
  id: string;
  name: string;
  rating?: number | null;
  vehicle_type?: string | null;
  license_plate?: string | null;
  status: string;
  is_verified: boolean;
  is_suspended: boolean;
};

export const AdminRidersScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<{ id: string; action: 'approve' | 'suspend' } | null>(null);
  const search = q.trim();
  const { data: riders = [], isPending } = useAdminRiders(search);

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.adminRiders(search) });

  const approve = (rider: AdminRiderRow) => {
    setBusy({ id: rider.id, action: 'approve' });
    adminApi
      .setRiderVerification(rider.id, true)
      .then(() => {
        toast(`${rider.name} is now approved.`, { tone: 'success' });
        return refresh();
      })
      .catch(() => toast('Could not approve this rider.', { tone: 'error' }))
      .finally(() => setBusy(null));
  };

  const setSuspension = (rider: AdminRiderRow, suspended: boolean) => {
    setBusy({ id: rider.id, action: 'suspend' });
    adminApi
      .setRiderSuspension(rider.id, suspended)
      .then(() => {
        toast(suspended ? `${rider.name} is suspended.` : `${rider.name} is active again.`, { tone: suspended ? 'info' : 'success' });
        return refresh();
      })
      .catch(() => toast('Could not update this rider.', { tone: 'error' }))
      .finally(() => setBusy(null));
  };

  const onlineCount = riders.filter((r) => r.status === 'ONLINE').length;
  const verifiedCount = riders.filter((r) => r.is_verified && !r.is_suspended).length;
  const suspendedCount = riders.filter((r) => r.is_suspended).length;

  return (
    <Screen>
      <ScreenHeader title="Riders" subtitle="Approve, suspend and review partners" onBack={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: 20, paddingBottom: theme.spacing.md, gap: theme.spacing.md }}>
        <SearchInput value={q} onChangeText={setQ} placeholder="Search rider name" />
        {!isPending && riders.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Badge label={`${onlineCount} online`} tone="success" dot />
            <Badge label={`${verifiedCount} verified`} tone="primary" dot />
            <Badge label={`${suspendedCount} suspended`} tone="error" dot />
          </View>
        ) : null}
      </View>

      <FlatList
        data={riders}
        contentContainerStyle={styles.list}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          isPending ? null : (
            <View style={{ paddingVertical: theme.spacing.xl }}>
              <EmptyView icon="people-outline" title="No riders found" message={search ? `Nothing matches “${search}”.` : 'Approved partners will appear here.'} />
            </View>
          )
        }
        renderItem={({ item, index }) => (
          <Entrance delay={Math.min(index * 40, 240)}>
            <Card style={{ marginBottom: theme.spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar name={item.name} ring />
                <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                  <AppText variant="heading3" numberOfLines={1}>
                    {item.name}
                  </AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <AppText variant="caption" tone="muted" numberOfLines={1}>
                      {item.vehicle_type ?? 'No vehicle'}
                    </AppText>
                    {item.license_plate ? (
                      <>
                        <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: theme.colors.border, marginHorizontal: 6 }} />
                        <AppText variant="caption" tone="muted">
                          {item.license_plate}
                        </AppText>
                      </>
                    ) : null}
                  </View>
                  {item.rating != null ? <ReadOnlyRating value={item.rating} /> : null}
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: theme.spacing.md }}>
                <Badge label={item.status} tone={item.status === 'ONLINE' ? 'success' : 'neutral'} dot />
                {item.is_suspended ? (
                  <Badge label="Suspended" tone="error" dot />
                ) : item.is_verified ? (
                  <Badge label="Verified" tone="success" dot />
                ) : (
                  <Badge label="Pending approval" tone="warning" dot />
                )}
              </View>

              <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.md }}>
                {!item.is_verified ? (
                  <Button
                    label="Approve"
                    variant="success"
                    size="md"
                    icon="checkmark"
                    style={{ flex: 1 }}
                    loading={busy?.id === item.id && busy.action === 'approve'}
                    disabled={busy?.id !== item.id && busy !== null}
                    onPress={() => approve(item)}
                  />
                ) : null}
                <Button
                  label={item.is_suspended ? 'Reactivate' : 'Suspend'}
                  variant={item.is_suspended ? 'secondary' : 'danger'}
                  size="md"
                  icon={item.is_suspended ? 'play' : 'pause'}
                  style={{ flex: 1 }}
                  loading={busy?.id === item.id && busy.action === 'suspend'}
                  disabled={busy?.id !== item.id && busy !== null}
                  onPress={() => setSuspension(item, !item.is_suspended)}
                />
              </View>
            </Card>
          </Entrance>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 24 },
});