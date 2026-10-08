import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Gradient } from './Gradient';
import { IconName } from './Button';
import { PressableScale } from './motion';

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
  const textColor = selected ? theme.colors.onPrimary : theme.colors.textSecondary;

  const base: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.pill,
    minHeight: small ? 34 : 42,
    paddingHorizontal: small ? theme.spacing.md : theme.spacing.lg,
    paddingVertical: small ? 6 : theme.spacing.sm,
    overflow: 'hidden',
  };

  const row = (
    <>
      {icon ? <Ionicons name={icon} size={14} color={textColor} style={{ marginRight: 6 }} /> : null}
      <AppText variant={small ? 'caption' : 'label'} color={textColor} weight={selected ? '700' : '600'}>
        {label}
      </AppText>
    </>
  );

  return (
    <PressableScale
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      scaleTo={0.95}
      pressedOpacity={0.88}
      style={[base, !selected && { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }, style]}
    >
      {selected ? <Gradient preset="primary" style={StyleSheetAbsoluteFill} /> : null}
      {row}
    </PressableScale>
  );
};

const StyleSheetAbsoluteFill = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

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
      <AppText variant="caption" color={palette.fg} weight="800">
        {label}
      </AppText>
    </View>
  );
};
