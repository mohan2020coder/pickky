import React from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Gradient } from './Gradient';
import { NotificationRecord } from '../types';
import { formatRelativeTime } from '../utils/format';

type NotificationItemProps = {
  notification: NotificationRecord;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

const iconForType = (type: string): React.ComponentProps<typeof Ionicons>['name'] => {
  if (type.includes('rider_assigned')) return 'person-circle-outline';
  if (type.includes('picked_up')) return 'cube-outline';
  if (type.includes('delivered')) return 'checkmark-done-outline';
  if (type.includes('arrived') || type.includes('near')) return 'navigate-outline';
  if (type.includes('cancel') || type.includes('fail')) return 'alert-circle-outline';
  if (type.includes('offer') || type.includes('assigned')) return 'bicycle-outline';
  if (type.includes('ticket')) return 'chatbubbles-outline';
  return 'notifications-outline';
};

export const NotificationItem = ({ notification, onPress, style }: NotificationItemProps) => {
  const theme = useTheme();
  const unread = !notification.read_at;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${notification.title}. ${notification.message}${unread ? '. Unread' : ''}`}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          backgroundColor: unread ? theme.colors.primarySoft : theme.colors.surface,
          borderWidth: 1,
          borderColor: unread ? theme.colors.primary : theme.colors.divider,
          borderRadius: theme.radius.large,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.md,
          opacity: pressed ? 0.85 : 1,
          ...theme.shadows.low,
        },
        style,
      ]}
    >
      <Gradient
        preset={unread ? 'primary' : 'sheen'}
        style={{
          width: 42,
          height: 42,
          borderRadius: 15,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing.md,
        }}
      >
        <Ionicons name={iconForType(notification.type)} size={19} color={unread ? '#FFFFFF' : theme.colors.primary} />
      </Gradient>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="label" numberOfLines={1} style={{ flex: 1 }}>
            {notification.title}
          </AppText>
          {unread ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary, marginLeft: 8 }} /> : null}
        </View>
        <AppText variant="bodySmall" tone="secondary" numberOfLines={2} style={{ marginTop: 2 }}>
          {notification.message}
        </AppText>
        <AppText variant="caption" tone="muted" style={{ marginTop: 6 }}>
          {formatRelativeTime(notification.created_at)}
        </AppText>
      </View>
    </Pressable>
  );
};
