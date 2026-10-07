import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { formatMoney } from '../utils/format';

type PriceRow = { label: string; amountMinor: number; muted?: boolean };

type PriceCardProps = {
  totalMinor: number;
  currency?: string;
  rows?: PriceRow[];
  etaMinutes?: number;
  distanceKm?: number;
  style?: StyleProp<ViewStyle>;
  emphasis?: 'total' | 'estimate';
};

export const PriceCard = ({ totalMinor, currency = 'INR', rows, etaMinutes, distanceKm, style, emphasis = 'total' }: PriceCardProps) => {
  const theme = useTheme();

  return (
    <View
      accessibilityLabel={`Estimated total ${formatMoney(totalMinor, currency)}`}
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.large,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.spacing.xl,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.md }}>
        <AppText variant="label" tone="secondary">
          Estimated distance
        </AppText>
        <AppText variant="label">{distanceKm !== undefined ? `${distanceKm} km` : '—'}</AppText>
      </View>
      {rows?.map((row) => (
        <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm }}>
          <AppText variant="body" tone={row.muted ? 'muted' : 'secondary'}>
            {row.label}
          </AppText>
          <AppText variant="body" tone={row.muted ? 'muted' : 'default'}>
            {formatMoney(row.amountMinor, currency)}
          </AppText>
        </View>
      ))}
      <View style={{ height: 1, backgroundColor: theme.colors.divider, marginVertical: theme.spacing.md }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="heading3">{emphasis === 'total' ? 'Total' : 'Estimated fare'}</AppText>
        <AppText variant="price" color={theme.colors.primary} accessibilityRole="text">
          {formatMoney(totalMinor, currency)}
        </AppText>
      </View>
      {etaMinutes !== undefined ? (
        <AppText variant="caption" tone="muted" style={{ marginTop: theme.spacing.xs }}>
          Arrives in about {etaMinutes} min
        </AppText>
      ) : null}
    </View>
  );
};
