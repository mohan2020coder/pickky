import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { ColorScheme, ColorTokens, darkColors, lightColors } from './colors';
import { shadows, ShadowName } from './shadows';
import { spacing } from './spacing';
import { radius } from './radius';
import { typography, TypographyVariant } from './typography';
import { readText, writeText } from '../storage/plainStorage';

export type ThemePreference = 'system' | 'light' | 'dark';

export type Theme = {
  scheme: ColorScheme;
  colors: ColorTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadows: typeof shadows;
  text: (variant: TypographyVariant) => typeof typography.display;
  shadow: (name: ShadowName) => typeof shadows.none;
};

const THEME_PREFERENCE_KEY = 'theme.preference';

const buildTheme = (scheme: ColorScheme): Theme => {
  const colors = scheme === 'dark' ? darkColors : lightColors;
  return {
    scheme,
    colors,
    spacing,
    radius,
    typography,
    shadows,
    text: (variant) => typography[variant],
    shadow: (name) => shadows[name],
  };
};

const ThemeContext = createContext<{ theme: Theme; preference: ThemePreference; setPreference: (p: ThemePreference) => void }>({
  theme: buildTheme('light'),
  preference: 'system',
  setPreference: () => undefined,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    let mounted = true;
    readText(THEME_PREFERENCE_KEY).then((stored) => {
      if (mounted && (stored === 'light' || stored === 'dark' || stored === 'system')) {
        setPreferenceState(stored);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void writeText(THEME_PREFERENCE_KEY, next);
  }, []);

  const scheme: ColorScheme = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo(
    () => ({ theme: buildTheme(scheme), preference, setPreference }),
    [scheme, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext).theme;
export const useThemeContext = () => useContext(ThemeContext);
