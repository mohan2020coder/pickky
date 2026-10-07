import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { AppText } from './AppText';

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
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  const animateTo = (value: number) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 40, bounciness: 4 }).start();

  const palette = {
    primary: { bg: theme.colors.primary, fg: theme.colors.onPrimary, border: theme.colors.primary },
    secondary: { bg: theme.colors.surface, fg: theme.colors.textPrimary, border: theme.colors.border },
    ghost: { bg: 'transparent', fg: theme.colors.primary, border: 'transparent' },
    danger: { bg: theme.colors.errorSoft, fg: theme.colors.error, border: theme.colors.error },
    success: { bg: theme.colors.success, fg: '#FFFFFF', border: theme.colors.success },
  }[variant];

  const height = size === 'lg' ? 54 : size === 'md' ? 46 : 38;
  const fontSize = (size === 'lg' ? theme.typography.button.fontSize : theme.typography.label.fontSize) ?? 16;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, fullWidth && { alignSelf: 'stretch' }, style]}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        onPressIn={() => animateTo(0.97)}
        onPressOut={() => animateTo(1)}
        onPress={onPress}
        style={({ pressed }) => [
          styles.base,
          {
            minHeight: Math.max(height, 44),
            backgroundColor: palette.bg,
            borderColor: palette.border,
            borderWidth: variant === 'secondary' ? 1 : 0,
            borderRadius: theme.radius.pill,
            paddingHorizontal: size === 'sm' ? theme.spacing.lg : theme.spacing.xxl,
            opacity: isDisabled ? 0.55 : pressed ? 0.9 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={palette.fg} />
        ) : (
          <View style={styles.content}>
            {icon ? <Ionicons name={icon} size={fontSize + 3} color={palette.fg} style={{ marginRight: theme.spacing.sm }} /> : null}
            <AppText weight="700" color={palette.fg} style={{ fontSize, lineHeight: fontSize + 4 }}>
              {label}
            </AppText>
            {iconRight ? (
              <Ionicons name={iconRight} size={fontSize + 3} color={palette.fg} style={{ marginLeft: theme.spacing.sm }} />
            ) : null}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
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
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={badge > 0 ? { text: `${badge} unread` } : undefined}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: background ?? theme.colors.surface,
          borderWidth: background ? 0 : 1,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={size * 0.48} color={color ?? theme.colors.textPrimary} />
      {badge > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            paddingHorizontal: 3,
            backgroundColor: theme.colors.error,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText variant="caption" color="#FFFFFF" weight="800" style={{ fontSize: 10 }}>
            {badge > 99 ? '99+' : badge}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
};
