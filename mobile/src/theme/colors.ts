export const palette = {
  indigo600: '#4F46E5',
  indigo700: '#4338CA',
  indigo500: '#6366F1',
  indigo50: '#EEF2FF',
  slate950: '#020617',
  slate900: '#0F172A',
  slate800: '#1E293B',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate300: '#CBD5E1',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  slate50: '#F8FAFC',
  white: '#FFFFFF',
  black: '#000000',
  green600: '#059669',
  green500: '#10B981',
  green50: '#ECFDF5',
  amber600: '#D97706',
  amber500: '#F59E0B',
  amber50: '#FFFBEB',
  red600: '#DC2626',
  red500: '#EF4444',
  red50: '#FEF2F2',
  blue600: '#2563EB',
  blue500: '#3B82F6',
  blue50: '#EFF6FF',
  violet600: '#7C3AED',
  violet500: '#8B5CF6',
  overlay: 'rgba(2, 6, 23, 0.55)',
  overlayLight: 'rgba(2, 6, 23, 0.35)',
  transparent: 'transparent',
};

export type ColorTokens = {
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  onPrimary: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  border: string;
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
  onPrimary: palette.white,
  secondary: palette.slate800,
  background: palette.slate50,
  surface: palette.white,
  surfaceElevated: palette.white,
  textPrimary: palette.slate950,
  textSecondary: palette.slate600,
  textMuted: palette.slate400,
  textInverse: palette.white,
  border: palette.slate200,
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
  skeletonHighlight: palette.slate100,
  mapRoute: palette.indigo600,
  shadow: palette.slate900,
};

export const darkColors: ColorTokens = {
  primary: palette.indigo500,
  primaryPressed: palette.indigo600,
  primarySoft: 'rgba(99, 102, 241, 0.16)',
  onPrimary: palette.white,
  secondary: palette.slate300,
  background: '#0B1120',
  surface: palette.slate900,
  surfaceElevated: palette.slate800,
  textPrimary: '#F8FAFC',
  textSecondary: palette.slate400,
  textMuted: palette.slate500,
  textInverse: palette.slate950,
  border: 'rgba(148, 163, 184, 0.22)',
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
  mapRoute: palette.indigo500,
  shadow: palette.black,
};

export type ColorScheme = 'light' | 'dark';
