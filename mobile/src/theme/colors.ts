export const palette = {
  indigo950: '#312E81',
  indigo700: '#4338CA',
  indigo600: '#4F46E5',
  indigo500: '#6366F1',
  indigo400: '#818CF8',
  indigo50: '#EEF2FF',
  violet700: '#6D28D9',
  violet600: '#7C3AED',
  violet500: '#8B5CF6',
  violet400: '#A78BFA',
  violet50: '#F5F3FF',
  fuchsia500: '#D946EF',
  cyan600: '#0891B2',
  cyan500: '#06B6D4',
  cyan400: '#22D3EE',
  cyan50: '#ECFEFF',
  slate950: '#020617',
  slate900: '#0F172A',
  slate850: '#16203A',
  slate800: '#1E293B',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate300: '#CBD5E1',
  slate200: '#E2E8F0',
  slate150: '#E9EEF5',
  slate100: '#F1F5F9',
  slate50: '#F6F8FC',
  white: '#FFFFFF',
  black: '#000000',
  green700: '#047857',
  green600: '#059669',
  green500: '#10B981',
  green400: '#34D399',
  green50: '#ECFDF5',
  amber700: '#B45309',
  amber600: '#D97706',
  amber500: '#F59E0B',
  amber400: '#FBBF24',
  amber50: '#FFFBEB',
  red700: '#B91C1C',
  red600: '#DC2626',
  red500: '#EF4444',
  red50: '#FEF2F2',
  blue600: '#2563EB',
  blue500: '#3B82F6',
  blue400: '#60A5FA',
  blue50: '#EFF6FF',
  orange500: '#F97316',
  orange50: '#FFF7ED',
  overlay: 'rgba(2, 6, 23, 0.55)',
  overlayLight: 'rgba(2, 6, 23, 0.35)',
  glassLight: 'rgba(255, 255, 255, 0.14)',
  glassBorderLight: 'rgba(255, 255, 255, 0.28)',
  transparent: 'transparent',
};

export type ColorTokens = {
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  primaryGlow: string;
  onPrimary: string;
  secondary: string;
  accent: string;
  accentSoft: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceSunken: string;
  glass: string;
  glassBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  textOnGradient: string;
  border: string;
  borderStrong: string;
  divider: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  error: string;
  errorSoft: string;
  info: string;
  infoSoft: string;
  overlay: string;
  skeleton: string;
  skeletonHighlight: string;
  mapRoute: string;
  shadow: string;
};

export const lightColors: ColorTokens = {
  primary: palette.indigo600,
  primaryPressed: palette.indigo700,
  primarySoft: palette.indigo50,
  primaryGlow: 'rgba(79, 70, 229, 0.35)',
  onPrimary: palette.white,
  secondary: palette.slate800,
  accent: palette.violet600,
  accentSoft: palette.violet50,
  background: palette.slate50,
  surface: palette.white,
  surfaceElevated: palette.white,
  surfaceSunken: palette.slate100,
  glass: 'rgba(255, 255, 255, 0.72)',
  glassBorder: 'rgba(255, 255, 255, 0.9)',
  textPrimary: palette.slate950,
  textSecondary: palette.slate600,
  textMuted: palette.slate400,
  textInverse: palette.white,
  textOnGradient: palette.white,
  border: palette.slate200,
  borderStrong: palette.slate300,
  divider: palette.slate100,
  success: palette.green600,
  successSoft: palette.green50,
  warning: palette.amber600,
  warningSoft: palette.amber50,
  error: palette.red600,
  errorSoft: palette.red50,
  info: palette.blue600,
  infoSoft: palette.blue50,
  overlay: palette.overlay,
  skeleton: palette.slate200,
  skeletonHighlight: palette.slate50,
  mapRoute: palette.indigo600,
  shadow: palette.slate900,
};

export const darkColors: ColorTokens = {
  primary: palette.indigo400,
  primaryPressed: palette.indigo500,
  primarySoft: 'rgba(99, 102, 241, 0.18)',
  primaryGlow: 'rgba(129, 140, 248, 0.4)',
  onPrimary: palette.white,
  secondary: palette.slate300,
  accent: palette.violet400,
  accentSoft: 'rgba(139, 92, 246, 0.18)',
  background: '#0B1120',
  surface: palette.slate900,
  surfaceElevated: palette.slate850,
  surfaceSunken: '#080E1C',
  glass: 'rgba(30, 41, 59, 0.72)',
  glassBorder: 'rgba(148, 163, 184, 0.24)',
  textPrimary: '#F8FAFC',
  textSecondary: palette.slate400,
  textMuted: palette.slate500,
  textInverse: palette.slate950,
  textOnGradient: palette.white,
  border: 'rgba(148, 163, 184, 0.22)',
  borderStrong: 'rgba(148, 163, 184, 0.4)',
  divider: 'rgba(148, 163, 184, 0.14)',
  success: palette.green500,
  successSoft: 'rgba(16, 185, 129, 0.16)',
  warning: palette.amber500,
  warningSoft: 'rgba(245, 158, 11, 0.16)',
  error: palette.red500,
  errorSoft: 'rgba(239, 68, 68, 0.16)',
  info: palette.blue500,
  infoSoft: 'rgba(59, 130, 246, 0.16)',
  overlay: palette.overlay,
  skeleton: palette.slate800,
  skeletonHighlight: palette.slate700,
  mapRoute: palette.indigo400,
  shadow: palette.black,
};

export type ColorScheme = 'light' | 'dark';
