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

const RouteNode = ({ filled, last, color }: { filled: boolean; last?: boolean; color?: string }) => {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', alignSelf: 'stretch' }}>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: filled ? color ?? theme.colors.primary : theme.colors.surface,
          borderWidth: filled ? 0 : 2,
          borderColor: theme.colors.borderStrong,
          marginTop: 5,
        }}
      />
      {!last ? <View style={{ width: 2, flex: 1, minHeight: 26, backgroundColor: theme.colors.border, marginTop: 2 }} /> : null}
    </View>
  );
};

export const DeliveryCard = ({ delivery, onPress, style, showPrice = true, compact = false }: DeliveryCardProps) => {
  const theme = useTheme();
  const statusTone = delivery.status === 'DELIVERED' ? theme.colors.success : delivery.status === 'CANCELLED' || delivery.status === 'FAILED' ? theme.colors.error : theme.colors.primary;

  return (
    <Card onPress={onPress} accessibilityLabel={`Delivery ${delivery.reference ?? delivery.id}, ${delivery.status}`} style={style}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: theme.spacing.md }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusTone, marginRight: 8 }} />
          <AppText variant="eyebrow" tone="muted" numberOfLines={1}>
            {delivery.reference ?? delivery.id}
          </AppText>
        </View>
        <StatusBadge status={delivery.status} />
      </View>

      <View style={{ flexDirection: 'row', marginTop: theme.spacing.md }}>
        <View style={{ marginRight: theme.spacing.sm }}>
          <RouteNode filled color={theme.colors.primary} />
          {compact ? null : <RouteNode filled={false} last color={theme.colors.accent} />}
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodySmall" weight="600" numberOfLines={1}>
            {delivery.pickup.addr ?? 'Pickup'}
          </AppText>
          {compact ? null : (
            <>
              <View style={{ height: 14 }} />
              <AppText variant="bodySmall" tone="secondary" numberOfLines={1}>
                {delivery.dropoff.addr ?? 'Destination'}
              </AppText>
            </>
          )}
        </View>
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

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: theme.spacing.md,
          paddingTop: theme.spacing.md,
          borderTopWidth: 1,
          borderTopColor: theme.colors.divider,
        }}
      >
        {showPrice ? (
          <View
            style={{
              backgroundColor: theme.colors.primarySoft,
              borderRadius: theme.radius.pill,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: 5,
            }}
          >
            <AppText variant="label" color={theme.colors.primary} weight="800">
              {formatMoney(delivery.price_minor, delivery.currency)}
            </AppText>
          </View>
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
          <AppText variant="eyebrow" tone="muted">
            {delivery.reference}
          </AppText>
          <AppText variant="heading3" style={{ marginTop: 4 }}>
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
