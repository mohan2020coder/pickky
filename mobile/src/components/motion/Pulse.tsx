import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

type PulseProps = {
  children?: React.ReactNode;
  /** Outer ring size in px. */
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** Number of concentric rings. */
  rings?: number;
};

/** Concentric pulsing rings — radar effect for "searching for rider" states. */
export const Pulse = ({ children, size = 160, style, rings = 3 }: PulseProps) => {
  const theme = useTheme();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, { toValue: 1, duration: 2400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {Array.from({ length: rings }).map((_, index) => {
        const offset = index * (1 / rings);
        const scale = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.35, 1],
        });
        const opacity = progress.interpolate({
          inputRange: [0, 0.6, 1],
          outputRange: [0.5 - index * 0.12, 0.28 - index * 0.08, 0],
        });
        return (
          <Animated.View
            key={index}
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: 2,
              borderColor: theme.colors.primary,
              opacity: Animated.add(opacity, -offset * 0.02),
              transform: [{ scale }],
            }}
          />
        );
      })}
      <View
        style={{
          width: size * 0.46,
          height: size * 0.46,
          borderRadius: size,
          backgroundColor: theme.colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          ...theme.shadows.glow,
        }}
      >
        {children}
      </View>
    </View>
  );
};
