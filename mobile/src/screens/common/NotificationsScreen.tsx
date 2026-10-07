import React from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NotificationsStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Button, NotificationItem, Screen, ScreenHeader } from '../../components';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useUnreadCount } from '../../hooks/queries';

type Props = NativeStackScreenProps<NotificationsStackParamList, 'Notifications'>;

export const NotificationsScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { data } = useNotifications(1);
  const notifications = data?.data ?? [];
  const unreadResult = useUnreadCount();
  const unread = unreadResult.data ?? 0;
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

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
          unread && unread > 0 ? (
            <Button label="Mark all read" variant="ghost" size="sm" loading={markAll.isPending} onPress={() => markAll.mutate()} />
          ) : undefined
        }
      />
      <FlatList
        data={notifications}
        contentContainerStyle={styles.list}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem notification={item} onPress={() => openNotification(item)} style={{ marginBottom: theme.spacing.md }} />
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xl * 2, paddingHorizontal: 20 }}>
            <AppText variant="heading3" center>Nothing here yet</AppText>
            <AppText variant="body" tone="secondary" center style={{ marginTop: theme.spacing.sm }}>
              Notifications about your pickups will appear here in real time.
            </AppText>
          </View>
        }
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 24 },
});