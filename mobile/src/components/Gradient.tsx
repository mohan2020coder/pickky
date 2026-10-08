import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient, LinearGradientProps } from 'expo-linear-gradient';
import { GradientPreset, gradients } from '../theme';

type GradientProps = Omit<LinearGradientProps, 'colors'> & {
  preset?: GradientPreset;
  /** Overrides the preset colors when provided. */
  colors?: readonly string[];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

/** Themed linear-gradient wrapper. Diagonal brand gradient by default. */
export const Gradient = ({ preset = 'primary', colors, style, children, ...rest }: GradientProps) => (
  <LinearGradient
    colors={(colors ?? gradients[preset]) as string[]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={style}
    {...rest}
  >
    {children}
  </LinearGradient>
);
