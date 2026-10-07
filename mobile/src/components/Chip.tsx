import React from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { IconName } from './Button';
import { Ionicons } from '@expo/vector-icons';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const Chip = ({ label, selected = false, onPress, icon, small = false, style }: ChipProps) => {
  const theme = useTheme();
  const backgroundColor = selected ? theme.colors.primary : theme.colors.surface;
  const textColor = selected ? theme.colors.onPrimary : theme.colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor,
          borderWidth: selected ? 0 : 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.pill,
          minHeight: small ? 34 : 42,
          paddingHorizontal: small ? theme.spacing.md : theme.spacing.lg,
          paddingVertical: small ? 6 : theme.spacing.sm,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={textColor} style={{ marginRight: 6 }} /> : null}
      <AppText variant={small ? 'caption' : 'label'} color={textColor}>
        {label}
      </AppText>
    </Pressable>
  );
};

type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info';

const toneStyles = (colors: ReturnType<typeof useTheme>['colors']): Record<BadgeTone, { bg: string; fg: string }> => ({
  neutral: { bg: colors.divider, fg: colors.textSecondary },
  primary: { bg: colors.primarySoft, fg: colors.primary },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  error: { bg: colors.errorSoft, fg: colors.error },
  info: { bg: colors.infoSoft, fg: colors.info },
});

export const Badge = ({ label, tone = 'neutral', dot = false }: { label: string; tone?: BadgeTone; dot?: boolean }) => {
  const theme = useTheme();
  const palette = toneStyles(theme.colors)[tone];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: palette.bg,
        borderRadius: theme.radius.pill,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 5,
        alignSelf: 'flex-start',
      }}
      accessibilityLabel={`Status: ${label}`}
    >
      {dot ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: palette.fg, marginRight: 6 }} /> : null}
      <AppText variant="caption" color={palette.fg} weight="700">
        {label}
      </AppText>
    </View>
  );
};
