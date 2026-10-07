import { Platform, ViewStyle } from 'react-native';

export type ShadowName = 'none' | 'low' | 'medium' | 'high';

export const shadows: Record<ShadowName, ViewStyle> = {
  none: Platform.select<ViewStyle>({
    android: { elevation: 0 },
    default: { shadowColor: 'transparent', shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 } },
  }) as ViewStyle,
  low: Platform.select<ViewStyle>({
    android: { elevation: 2 },
    default: { shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  }) as ViewStyle,
  medium: Platform.select<ViewStyle>({
    android: { elevation: 4 },
    default: { shadowColor: '#0F172A', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  }) as ViewStyle,
  high: Platform.select<ViewStyle>({
    android: { elevation: 8 },
    default: { shadowColor: '#0F172A', shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
  }) as ViewStyle,
};
