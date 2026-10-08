import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut, Layout } from 'react-native-reanimated';

type EntranceProps = {
  children: React.ReactNode;
  /** Delay in ms before the animation starts (use for staggering). */
  delay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
};

/** Gentle upward entrance — default for cards and blocks. */
export const Entrance = ({ children, delay = 0, duration = 420, style }: EntranceProps) => (
  <Animated.View entering={FadeInDown.delay(delay).duration(duration).springify().damping(18)} exiting={FadeOut.duration(160)} layout={Layout.springify().damping(20)} style={style}>
    {children}
  </Animated.View>
);

/** Downward entrance — for headers and top-anchored content. */
export const EntranceTop = ({ children, delay = 0, duration = 420, style }: EntranceProps) => (
  <Animated.View entering={FadeInUp.delay(delay).duration(duration).springify().damping(18)} style={style}>
    {children}
  </Animated.View>
);

/** Simple fade — for overlays and swaps. */
export const EntranceFade = ({ children, delay = 0, duration = 360, style }: EntranceProps) => (
  <Animated.View entering={FadeIn.delay(delay).duration(duration)} exiting={FadeOut.duration(160)} style={style}>
    {children}
  </Animated.View>
);

type StaggerProps = {
  children: React.ReactNode;
  /** Per-item delay increment in ms. */
  step?: number;
  /** Delay before the first item animates. */
  initialDelay?: number;
  style?: StyleProp<ViewStyle>;
  /** Rendered item wrapper style. */
  itemStyle?: StyleProp<ViewStyle>;
  /**
   * Index-matched wrapper styles — required for grid/flex layouts so each
   * wrapper (not the child) carries width/flex and the animation view does
   * not collapse the child's layout.
   */
  itemStyles?: Array<StyleProp<ViewStyle>>;
};

/**
 * Staggers direct children into view on mount.
 * Each child must be a valid node; wrap lists by mapping to <Entrance> instead
 * when children are generated dynamically.
 */
export const Stagger = ({ children, step = 70, initialDelay = 0, style, itemStyle, itemStyles }: StaggerProps) => (
  <Animated.View entering={FadeIn.duration(1)} style={style}>
    {React.Children.map(children, (child, index) => (
      <Animated.View
        key={index}
        entering={FadeInDown.delay(initialDelay + index * step).duration(420).springify().damping(18)}
        style={[itemStyle, itemStyles?.[index]]}
      >
        {child}
      </Animated.View>
    ))}
  </Animated.View>
);
