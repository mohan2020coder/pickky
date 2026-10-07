import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Card } from './Card';
import { StatusBadge } from './StatusTimeline';
import { Delivery } from '../types';
import { formatMoney, formatRelativeTime } from '../utils/format';

type DeliveryCardProps = {
  delivery: Delivery;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  showPrice?: boolean;
  compact?: boolean;
};

export const DeliveryCard = ({ delivery, onPress, style, showPrice = true, compact = false }: DeliveryCardProps) => {
  const theme = useTheme();
  const route = `${delivery.pickup.addr ?? 'Pickup'} → ${delivery.dropoff.addr ?? 'Destination'}`;

  return (
    <Card onPress={onPress} accessibilityLabel={`Delivery ${delivery.reference ?? delivery.id}, ${delivery.status}`} style={style}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
          <AppText variant="label" numberOfLines={1}>
            {delivery.reference ?? delivery.id}
          </AppText>
          <AppText variant="bodySmall" tone="secondary" numberOfLines={1} style={{ marginTop: 2 }}>
            {route}
          </AppText>
        </View>
        <StatusBadge status={delivery.status} />
      </View>

      {!compact ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.md, gap: 6 }}>
          <Ionicons name="location-outline" size={14} color={theme.colors.textMuted} />
          <AppText variant="caption" tone="muted">
            {delivery.distance_km} km
          </AppText>
          <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: theme.colors.border, marginHorizontal: 4 }} />
          <Ionicons name="time-outline" size={14} color={theme.colors.textMuted} />
          <AppText variant="caption" tone="muted">
            {formatRelativeTime(delivery.created_at)}
          </AppText>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: theme.spacing.md }}>
        {showPrice ? (
          <AppText variant="heading3" color={theme.colors.primary}>
            {formatMoney(delivery.price_minor, delivery.currency)}
          </AppText>
        ) : (
          <View />
        )}
        {onPress ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppText variant="label" tone="primary">
              View details
            </AppText>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} style={{ marginLeft: 4 }} />
          </View>
        ) : null}
      </View>
    </Card>
  );
};

export const DeliveryStatusCard = ({ delivery, actionLabel, onAction }: { delivery: Delivery; actionLabel?: string; onAction?: () => void }) => {
  const theme = useTheme();
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <AppText variant="caption" tone="muted">
            {delivery.reference}
          </AppText>
          <AppText variant="heading3" style={{ marginTop: 2 }}>
            {delivery.status.replace(/_/g, ' ').toLowerCase()}
          </AppText>
        </View>
        <StatusBadge status={delivery.status} />
      </View>
      {actionLabel && onAction ? (
        <AppText variant="label" tone="primary" onPress={onAction} style={{ marginTop: theme.spacing.md }} accessibilityRole="button">
          {actionLabel}
        </AppText>
      ) : null}
    </Card>
  );
};
