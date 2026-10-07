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

  return (
    <RNText
      {...rest}
      style={[theme.typography[variant], { color: color ?? toneColor }, center && { textAlign: 'center' }, weight ? { fontWeight: weight } : null, style]}
    >
      {children}
    </RNText>
  );
};
