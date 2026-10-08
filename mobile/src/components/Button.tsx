import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Gradient } from './Gradient';
import { PressableScale } from './motion';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'md' | 'lg' | 'sm';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  iconRight?: IconName;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
};

const Button = ({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  fullWidth = true,
  style,
  accessibilityLabel,
  testID,
}: ButtonProps) => {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const height = size === 'lg' ? 54 : size === 'md' ? 46 : 38;
  const fontSize = (size === 'lg' ? theme.typography.button.fontSize : theme.typography.label.fontSize) ?? 16;
  const radius = theme.radius.pill;

  const isSolid = variant === 'primary' || variant === 'success';
  const fg = isSolid
    ? theme.colors.onPrimary
    : variant === 'danger'
      ? theme.colors.error
      : variant === 'ghost'
        ? theme.colors.primary
        : theme.colors.textPrimary;

  const shadow: ViewStyle | null = variant === 'primary' ? theme.shadows.glow : variant === 'success' ? theme.shadows.medium : null;

  let background: React.ReactNode = null;
  if (variant === 'primary') {
    background = <Gradient preset="cta" style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />;
  } else if (variant === 'success') {
    background = <Gradient preset="success" style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />;
  } else if (variant === 'secondary') {
    background = <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.surfaceSunken }]} />;
  } else if (variant === 'danger') {
    background = <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.errorSoft }]} />;
  }

  const content = loading ? (
    <ActivityIndicator color={fg} />
  ) : (
    <View style={styles.content}>
      {icon ? <Ionicons name={icon} size={fontSize + 3} color={fg} style={{ marginRight: theme.spacing.sm }} /> : null}
      <AppText weight="700" color={fg} style={{ fontSize, lineHeight: fontSize + 4 }}>
        {label}
      </AppText>
      {iconRight ? (
        <Ionicons name={iconRight} size={fontSize + 3} color={fg} style={{ marginLeft: theme.spacing.sm }} />
      ) : null}
    </View>
  );

  return (
    <PressableScale
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      scaleTo={0.96}
      pressedOpacity={0.92}
      style={[
        styles.base,
        {
          minHeight: Math.max(height, 48),
          borderRadius: radius,
          paddingHorizontal: size === 'sm' ? theme.spacing.lg : theme.spacing.xxl,
          opacity: isDisabled ? 0.55 : 1,
        },
        variant === 'secondary' && { borderWidth: 1, borderColor: theme.colors.border },
        shadow,
        fullWidth && { alignSelf: 'stretch' },
        style,
      ]}
    >
      {background}
      {content}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const PrimaryButton = (props: ButtonProps) => <Button {...props} variant="primary" />;
export const SecondaryButton = (props: ButtonProps) => <Button {...props} variant="secondary" />;
export const GhostButton = (props: ButtonProps) => <Button {...props} variant="ghost" />;
export const DangerButton = (props: ButtonProps) => <Button {...props} variant="danger" />;
export { Button };

type IconButtonProps = {
  icon: IconName;
  onPress?: () => void;
  accessibilityLabel: string;
  size?: number;
  color?: string;
  background?: string;
  badge?: number;
  style?: StyleProp<ViewStyle>;
};

export const IconButton = ({
  icon,
  onPress,
  accessibilityLabel,
  size = 44,
  color,
  background,
  badge = 0,
  style,
}: IconButtonProps) => {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={badge > 0 ? { text: `${badge} unread` } : undefined}
      hitSlop={8}
      scaleTo={0.9}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: background ?? theme.colors.surface,
          borderWidth: background ? 0 : 1,
          borderColor: theme.colors.border,
        },
        !background && theme.shadows.low,
        style,
      ]}
    >
      <Ionicons name={icon} size={size * 0.48} color={color ?? theme.colors.textPrimary} />
      {badge > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            paddingHorizontal: 3,
            backgroundColor: theme.colors.error,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: theme.colors.surface,
          }}
        >
          <AppText variant="caption" color={theme.colors.onPrimary} weight="800" style={{ fontSize: 9 }}>
            {badge > 99 ? '99+' : badge}
          </AppText>
        </View>
      ) : null}
    </PressableScale>
  );
};
