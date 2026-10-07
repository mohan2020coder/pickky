import { DarkTheme, DefaultTheme, Theme } from '@react-navigation/native';
import { ColorScheme, ColorTokens } from '../theme';

export const buildNavigationTheme = (scheme: ColorScheme, colors: ColorTokens): Theme => {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.error,
    },
  };
};