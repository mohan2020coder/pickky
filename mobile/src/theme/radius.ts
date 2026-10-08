export const radius = {
  small: 10,
  medium: 14,
  large: 20,
  xl: 28,
  pill: 999,
} as const;

export type Radius = keyof typeof radius;
