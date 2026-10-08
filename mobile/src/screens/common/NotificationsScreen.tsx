import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NotificationsStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { Chip, EmptyView, Entrance, IconButton, NotificationItem, Screen, ScreenHeader } from '../../components';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useUnreadCount } from '../../hooks/queries';

type Props = NativeStackScreenProps<NotificationsStackParamList, 'Notifications'>;

type Filter = 'ALL' | 'UNREAD';

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'UNREAD', label: 'Unread' },
];

export const NotificationsScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { data } = useNotifications(1);
  const notifications = useMemo(() => data?.data ?? [], [data]);
  const unreadResult = useUnreadCount();
  const unread = unreadResult.data ?? 0;
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const [filter, setFilter] = useState<Filter>('ALL');

  const visible = useMemo(() => (filter === 'UNREAD' ? notifications.filter((n) => !n.read_at) : notifications), [notifications, filter]);

  const openNotification = (notification: (typeof notifications)[number]) => {
    if (!notification.read_at) markRead.mutate(notification.id);
    const deliveryId = notification.data?.delivery_id as string | undefined;
    if (deliveryId) {
      navigation.navigate('DeliveryDetails', { deliveryId });
    }
  };

  return (
    <Screen>
      <ScreenHeader
        title="Notifications"
        subtitle={unread && unread > 0 ? `${unread} unread` : 'You are all caught up'}
        right={
          <IconButton
            icon="checkmark-done-outline"
            accessibilityLabel="Mark all notifications as read"
            badge={unread}
            onPress={() => {
              if (!markAll.isPending) markAll.mutate();
            }}
          />
        }
      />
      <View style={styles.chips}>
        {FILTERS.map((f) => (
          <Chip key={f.value} small label={f.label} selected={filter === f.value} onPress={() => setFilter(f.value)} />
        ))}
      </View>
      <FlatList
        data={visible}
        contentContainerStyle={[styles.list, visible.length === 0 ? styles.listEmpty : null]}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Entrance delay={Math.min(index, 8) * 60}>
            <NotificationItem notification={item} onPress={() => openNotification(item)} style={{ marginBottom: theme.spacing.md }} />
          </Entrance>
        )}
        ListEmptyComponent={
          filter === 'UNREAD' && notifications.length > 0 ? (
            <EmptyView icon="checkmark-done-outline" title="You're all caught up" message="Every notification has been read." />
          ) : (
            <EmptyView
              icon="notifications-outline"
              title="Nothing here yet"
              message="Notifications about your pickups will appear here in real time."
            />
          )
        }
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
});
