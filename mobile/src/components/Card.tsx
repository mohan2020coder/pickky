import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme, GradientPreset } from '../theme';
import { AppText } from './AppText';
import { Gradient } from './Gradient';
import { PressableScale } from './motion';

export type CardVariant = 'elevated' | 'gradient' | 'glass' | 'outline' | 'soft';

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Legacy toggle: true -> elevated (default), false -> outline. */
  elevated?: boolean;
  variant?: CardVariant;
  /** Required when variant === 'gradient'. */
  gradientPreset?: GradientPreset;
  onPress?: () => void;
  accessibilityLabel?: string;
  padded?: boolean;
};

export const Card = ({
  children,
  style,
  elevated = true,
  variant,
  gradientPreset = 'hero',
  onPress,
  accessibilityLabel,
  padded = true,
}: CardProps) => {
  const theme = useTheme();
  const effective: CardVariant = variant ?? (elevated ? 'elevated' : 'outline');
  const radius = theme.radius.large;

  const base: ViewStyle = {
    borderRadius: radius,
    padding: padded ? theme.spacing.lg : 0,
    overflow: effective === 'gradient' ? 'hidden' : undefined,
  };

  let surface: React.ReactNode = null;
  if (effective === 'gradient') {
    base.borderWidth = 0;
    surface = <Gradient preset={gradientPreset} style={StyleSheet.absoluteFill} />;
  } else if (effective === 'glass') {
    base.backgroundColor = theme.colors.glass;
    base.borderWidth = 1;
    base.borderColor = theme.colors.glassBorder;
    base.borderStyle = 'solid';
    Object.assign(base, theme.shadows.medium);
  } else if (effective === 'outline') {
    base.backgroundColor = theme.colors.surface;
    base.borderWidth = 1;
    base.borderColor = theme.colors.border;
  } else if (effective === 'soft') {
    base.backgroundColor = theme.colors.primarySoft;
    base.borderWidth = 0;
  } else {
    base.backgroundColor = theme.colors.surface;
    base.borderWidth = 1;
    base.borderColor = theme.colors.divider;
    Object.assign(base, theme.shadows.low);
  }

  const content = (
    <>
      {surface}
      {children}
    </>
  );

  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        scaleTo={0.975}
        pressedOpacity={0.92}
        style={[base, style]}
      >
        {content}
      </PressableScale>
    );
  }

  return <View style={[base, style]}>{content}</View>;
};

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
};

export const SectionHeader = ({ title, subtitle, actionLabel, onAction, style }: SectionHeaderProps) => {
  const theme = useTheme();
  return (
    <View style={[styles.sectionHeader, { marginBottom: theme.spacing.md }, style]}>
      <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
        <AppText variant="heading3">{title}</AppText>
        {subtitle ? (
          <AppText variant="bodySmall" tone="secondary" style={{ marginTop: 2 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {actionLabel ? (
        <PressableScale onPress={onAction} accessibilityRole="button" accessibilityLabel={actionLabel} scaleTo={0.94} style={{ paddingVertical: 4 }}>
          <AppText variant="label" tone="primary">
            {actionLabel}
          </AppText>
        </PressableScale>
      ) : null}
    </View>
  );
};

export const Divider = ({ style }: { style?: StyleProp<ViewStyle> }) => {
  const theme = useTheme();
  return <View style={[{ height: 1, backgroundColor: theme.colors.divider }, style]} />;
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
