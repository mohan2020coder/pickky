import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, GradientPreset } from '../theme';
import { AppText } from './AppText';
import { Gradient } from './Gradient';
import { IconName } from './Button';
import { PressableScale, useCountUp } from './motion';

type StatCardProps = {
  label: string;
  value: number | string;
  hint?: string;
  icon?: IconName;
  accent?: boolean;
  gradient?: GradientPreset;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

const DEFAULT_GRADIENTS: GradientPreset[] = ['primary', 'ocean', 'success', 'sunset'];

/** Dashboard metric tile: gradient icon medallion + animated count-up value. */
export const StatCard = ({ label, value, hint, icon = 'analytics', accent = false, gradient, onPress, style }: StatCardProps) => {
  const theme = useTheme();
  const preset: GradientPreset = gradient ?? (accent ? 'hero' : DEFAULT_GRADIENTS[Math.abs(label.length) % DEFAULT_GRADIENTS.length]);
  const isNumeric = typeof value === 'number';
  const animated = useCountUp(isNumeric ? value : 0);
  const display = isNumeric ? Math.round(animated) : value;

  const body = (
    <>
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: theme.spacing.md,
        }}
      >
        <Gradient preset={preset} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <Ionicons name={icon} size={20} color="#FFFFFF" />
      </View>
      <AppText variant="price" color={accent ? undefined : theme.colors.textPrimary} style={{ fontSize: accent ? 30 : 26 }}>
        {display}
      </AppText>
      <AppText variant="caption" tone={accent ? 'inverse' : 'secondary'} style={{ marginTop: 2 }}>
        {label}
      </AppText>
      {hint ? (
        <AppText variant="caption" tone={accent ? 'inverse' : 'muted'} style={{ marginTop: 6, opacity: accent ? 0.8 : 1 }}>
          {hint}
        </AppText>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <PressableScale onPress={onPress} scaleTo={0.97} style={[{ borderRadius: theme.radius.large, overflow: 'hidden' }, style]}>
        <StatSurface accent={accent} preset={preset}>
          {body}
        </StatSurface>
      </PressableScale>
    );
  }

  return (
    <StatSurface accent={accent} preset={preset} style={style}>
      {body}
    </StatSurface>
  );
};

const StatSurface = ({
  accent,
  preset,
  children,
  style,
}: {
  accent: boolean;
  preset: GradientPreset;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) => {
  const theme = useTheme();
  if (accent) {
    return (
      <Gradient preset={preset} style={[{ padding: theme.spacing.lg, borderRadius: theme.radius.large, ...theme.shadows.medium }, style]}>
        {children}
      </Gradient>
    );
  }
  return (
    <View
      style={[
        {
          padding: theme.spacing.lg,
          borderRadius: theme.radius.large,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.divider,
          ...theme.shadows.low,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};
