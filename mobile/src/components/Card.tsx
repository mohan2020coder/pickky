import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { AppText } from './AppText';

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  padded?: boolean;
};

export const Card = ({ children, style, elevated = true, onPress, accessibilityLabel, padded = true }: CardProps) => {
  const theme = useTheme();
  const base: ViewStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.large,
    borderWidth: elevated ? 0 : 1,
    borderColor: theme.colors.border,
    padding: padded ? theme.spacing.lg : 0,
    ...(elevated ? theme.shadows.low : null),
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1 }, style]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[base, style]}>{children}</View>;
};

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
};

export const SectionHeader = ({ title, actionLabel, onAction, style }: SectionHeaderProps) => {
  const theme = useTheme();
  return (
    <View style={[styles.sectionHeader, { marginBottom: theme.spacing.md }, style]}>
      <AppText variant="heading3">{title}</AppText>
      {actionLabel ? (
        <Pressable onPress={onAction} accessibilityRole="button" accessibilityLabel={`${actionLabel}`}>
          <AppText variant="label" tone="primary">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
};

export const Divider = ({ style }: { style?: StyleProp<ViewStyle> }) => {
  const theme = useTheme();
  return <View style={[{ height: 1, backgroundColor: theme.colors.divider }, style]} />;
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
