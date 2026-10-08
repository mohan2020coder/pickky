import { Platform, ViewStyle } from 'react-native';

export type ShadowName = 'none' | 'low' | 'medium' | 'high' | 'floating' | 'glow';

const ios = (
  opacity: number,
  radius: number,
  height: number,
  color = '#0F172A',
): ViewStyle =>
  ({
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: { width: 0, height },
  }) as ViewStyle;

export const shadows: Record<ShadowName, ViewStyle> = {
  none: Platform.select<ViewStyle>({
    android: { elevation: 0 },
    default: ios(0, 0, 0, 'transparent'),
  }) as ViewStyle,
  low: Platform.select<ViewStyle>({
    android: { elevation: 2 },
    default: ios(0.06, 10, 3),
  }) as ViewStyle,
  medium: Platform.select<ViewStyle>({
    android: { elevation: 5 },
    default: ios(0.1, 18, 8),
  }) as ViewStyle,
  high: Platform.select<ViewStyle>({
    android: { elevation: 10 },
    default: ios(0.18, 28, 14),
  }) as ViewStyle,
  floating: Platform.select<ViewStyle>({
    android: { elevation: 14 },
    default: ios(0.14, 24, -4),
  }) as ViewStyle,
  glow: Platform.select<ViewStyle>({
    android: { elevation: 6 },
    default: ios(0.35, 22, 8, '#4F46E5'),
  }) as ViewStyle,
};
