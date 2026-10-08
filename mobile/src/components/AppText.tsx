import React from 'react';
import { StyleProp, Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { useTheme, TypographyVariant } from '../theme';

export type TextTone = 'default' | 'secondary' | 'muted' | 'primary' | 'success' | 'warning' | 'error' | 'inverse';

type AppTextProps = RNTextProps & {
  variant?: TypographyVariant;
  tone?: TextTone;
  color?: string;
  weight?: TextStyle['fontWeight'];
  center?: boolean;
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
};

// Inter ships as one family per weight (see @expo-google-fonts/inter).
// Map the requested weight to its family and drop fontWeight so iOS/Android
// never faux-bold an already-bold face.
const FAMILY_BY_WEIGHT: Record<string, string> = {
  '100': 'Inter_100Thin',
  '200': 'Inter_200ExtraLight',
  '300': 'Inter_300Light',
  '400': 'Inter_400Regular',
  'normal': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
  '800': 'Inter_800ExtraBold',
  '900': 'Inter_900Black',
};

export const AppText = ({ variant = 'body', tone = 'default', color, weight, center, style, children, ...rest }: AppTextProps) => {
  const theme = useTheme();
  const toneColor =
    tone === 'default'
      ? theme.colors.textPrimary
      : tone === 'secondary'
        ? theme.colors.textSecondary
        : tone === 'muted'
          ? theme.colors.textMuted
          : tone === 'primary'
            ? theme.colors.primary
            : tone === 'success'
              ? theme.colors.success
              : tone === 'warning'
                ? theme.colors.warning
                : tone === 'error'
                  ? theme.colors.error
                  : theme.colors.textInverse;

  const effectiveWeight = String(weight ?? theme.typography[variant].fontWeight ?? '400');
  const fontFamily = FAMILY_BY_WEIGHT[effectiveWeight] ?? 'Inter_400Regular';

  return (
    <RNText
      {...rest}
      style={[
        theme.typography[variant],
        { fontFamily, fontWeight: 'normal', color: color ?? toneColor },
        center && { textAlign: 'center' },
        style,
      ]}
    >
      {children}
    </RNText>
  );
};
