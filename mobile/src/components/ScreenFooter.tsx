import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

type ScreenFooterProps = {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

/**
 * Sticky bottom action bar with safe-area padding and a hairline separator.
 * Sits outside the scroll content as a flex sibling of the scroll view.
 */
export const ScreenFooter = ({ style, children }: ScreenFooterProps) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.footer,
        {
          paddingHorizontal: theme.spacing.xl,
          paddingTop: theme.spacing.md,
          paddingBottom: Math.max(insets.bottom, theme.spacing.md),
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.divider,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
