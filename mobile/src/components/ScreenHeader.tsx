import React from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { IconName } from './Button';

type ScreenHeaderProps = {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  right?: React.ReactNode;
  iconRight?: { icon: IconName; label: string; onPress: () => void; badge?: number };
  transparent?: boolean;
  style?: StyleProp<ViewStyle>;
  large?: boolean;
};

export const ScreenHeader = ({
  title,
  subtitle,
  onBack,
  backLabel = 'Go back',
  right,
  iconRight,
  transparent = false,
  style,
  large = false,
}: ScreenHeaderProps) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  let rightNode: React.ReactNode = null;
  if (right) {
    rightNode = right;
  } else if (iconRight) {
    rightNode = (
      <Pressable
        onPress={iconRight.onPress}
        accessibilityRole="button"
        accessibilityLabel={iconRight.label}
        hitSlop={8}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
      >
        <Ionicons name={iconRight.icon} size={22} color={theme.colors.textPrimary} />
        {iconRight.badge ? (
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: theme.colors.error,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 3,
            }}
          >
            <AppText variant="caption" color="#FFFFFF" weight="800" style={{ fontSize: 10 }}>
              {iconRight.badge > 99 ? '99+' : iconRight.badge}
            </AppText>
          </View>
        ) : null}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        {
          paddingTop: insets.top + 6,
          paddingBottom: theme.spacing.md,
          paddingHorizontal: theme.spacing.xl,
          backgroundColor: transparent ? 'transparent' : theme.colors.background,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: insets.top + 56,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={backLabel}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
              marginRight: theme.spacing.md,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          {title ? (
            <AppText variant={large ? 'heading1' : 'heading3'} numberOfLines={1}>
              {title}
            </AppText>
          ) : null}
          {subtitle ? (
            <AppText variant="bodySmall" tone="secondary" numberOfLines={1} style={{ marginTop: 2 }}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </View>
      {rightNode}
    </View>
  );
};

export const Screen = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => {
  const theme = useTheme();
  return <View style={[{ flex: 1, backgroundColor: theme.colors.background }, style]}>{children}</View>;
};