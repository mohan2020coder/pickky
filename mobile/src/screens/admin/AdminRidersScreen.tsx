import React, { useState } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminUsersStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Avatar, Badge, Button, Card, ReadOnlyRating, Screen, ScreenHeader, SearchInput } from '../../components';
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

  return (
    <Screen>
      <ScreenHeader title="Riders" subtitle="Approve, suspend and review partners" onBack={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: 20, paddingBottom: theme.spacing.md }}>
        <SearchInput value={q} onChangeText={setQ} placeholder="Search rider name" />
      </View>

      <FlatList
        data={riders}
        contentContainerStyle={styles.list}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          isPending ? null : (
            <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xl * 2 }}>
              <AppText variant="heading3" center>
                No riders found
              </AppText>
              <AppText variant="body" tone="secondary" center style={{ marginTop: theme.spacing.sm }}>
                {search ? `Nothing matches “${search}”.` : 'Riders appear here after they sign up.'}
              </AppText>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Card style={{ marginBottom: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Avatar name={item.name} />
              <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                <AppText variant="label" numberOfLines={1}>
                  {item.name}
                </AppText>
                <AppText variant="caption" tone="muted" numberOfLines={1}>
                  {[item.vehicle_type, item.license_plate].filter(Boolean).join(' · ') || 'No vehicle added'}
                </AppText>
                <View style={{ marginTop: 4 }}>
                  <ReadOnlyRating value={item.rating} />
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Badge label={item.status} tone={item.status === 'ONLINE' ? 'success' : 'neutral'} />
                {item.is_suspended ? (
                  <Badge label="Suspended" tone="error" />
                ) : item.is_verified ? (
                  <Badge label="Verified" tone="success" />
                ) : (
                  <Badge label="Unverified" tone="warning" />
                )}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
              {!item.is_verified ? (
                <Button
                  label="Approve"
                  size="sm"
                  style={{ flex: 1 }}
                  loading={busy?.id === item.id && busy.action === 'approve'}
                  disabled={busy !== null && busy.id !== item.id}
                  onPress={() => approve(item)}
                />
              ) : null}
              <Button
                label={item.is_suspended ? 'Reactivate' : 'Suspend'}
                variant={item.is_suspended ? 'secondary' : 'danger'}
                size="sm"
                style={{ flex: 1 }}
                loading={busy?.id === item.id && busy.action === 'suspend'}
                disabled={busy !== null && busy.id !== item.id}
                onPress={() => setSuspension(item, !item.is_suspended)}
              />
            </View>
          </Card>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 24 },
});
