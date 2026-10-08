import React, { useRef } from 'react';
import { Pressable, StyleProp, ViewStyle, GestureResponderEvent, PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Only the duration-free branch of reanimated's SpringConfig (damping/stiffness style). */
export type SpringOptions = {
  mass?: number;
  damping?: number;
  stiffness?: number;
  velocity?: number;
  overshootClamping?: boolean;
  restDisplacementThreshold?: number;
  restSpeedThreshold?: number;
};

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** How much the element shrinks while pressed (0.96 = 4%). */
  scaleTo?: number;
  /** Extra opacity applied while pressed. */
  pressedOpacity?: number;
  springConfig?: SpringOptions;
};

/** Pressable with a snappy spring scale + press-opacity — the app-wide touch language. */
export const PressableScale = ({
  children,
  style,
  scaleTo = 0.96,
  pressedOpacity = 1,
  springConfig,
  ...rest
}: PressableScaleProps) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const styleRef = useRef(style);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, { damping: 18, stiffness: 320, ...springConfig });
        opacity.value = withSpring(pressedOpacity, { damping: 20, stiffness: 300 });
        rest.onPressIn?.(e as GestureResponderEvent);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 14, stiffness: 260, ...springConfig });
        opacity.value = withSpring(1, { damping: 20, stiffness: 300 });
        rest.onPressOut?.(e as GestureResponderEvent);
      }}
      style={[styleRef.current, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
};
