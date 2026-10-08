// Brand gradient presets for the "premium & bold" direction.
// Static (scheme-independent): saturated brand hues read well on both light
// and dark backgrounds. Import directly from the theme barrel.

export type GradientColors = readonly [string, string, ...string[]] | readonly string[];

export const gradients = {
  /** Core brand gradient — primary CTAs, chips, active tab pill. */
  primary: ['#6366F1', '#8B5CF6'] as GradientColors,
  /** Wide hero gradient — headers, welcome background, hero cards. */
  hero: ['#312E81', '#4338CA', '#7C3AED'] as GradientColors,
  /** Primary CTA — buttons, key actions. */
  cta: ['#4F46E5', '#7C3AED'] as GradientColors,
  /** Accent for success moments — completed deliveries, earnings. */
  success: ['#047857', '#10B981', '#34D399'] as GradientColors,
  /** Warm accent — prices, rewards, ratings. */
  sunset: ['#F59E0B', '#F97316'] as GradientColors,
  /** Cool accent — in-transit / live states. */
  ocean: ['#0284C7', '#06B6D4', '#22D3EE'] as GradientColors,
  /** Danger accent — failed/cancelled states. */
  danger: ['#DC2626', '#F97316'] as GradientColors,
  /** Neutral premium — dark elevated cards in both schemes. */
  charcoal: ['#0F172A', '#1E293B'] as GradientColors,
  /** Dark elevated surface gradient for dark-mode hero cards. */
  night: ['#1E293B', '#312E81'] as GradientColors,
  /** Soft tinted sheen — light hero panels, glass card backing. */
  sheen: ['#EEF2FF', '#F5F3FF', '#ECFEFF'] as GradientColors,
} as const;

export type GradientPreset = keyof typeof gradients;
