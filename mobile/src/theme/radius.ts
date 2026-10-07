export const radius = {
  small: 8,
  medium: 12,
  large: 16,
  xl: 24,
  pill: 999,
} as const;

export type Radius = keyof typeof radius;
