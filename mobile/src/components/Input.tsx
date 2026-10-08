import React, { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { IconName } from './Button';

type AppInputProps = TextInputProps & {
  label?: string;
  error?: string | null;
  hint?: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  isFocused?: boolean;
};

export const AppInput = forwardRef<TextInput, AppInputProps>(function AppInput(
  { label, error, hint, leftIcon, rightIcon, onRightIconPress, containerStyle, onFocus, onBlur, secureTextEntry, ...rest },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);

  const borderColor = error ? theme.colors.error : focused ? theme.colors.primary : 'transparent';
  const iconTile = focused || !!leftIcon;

  return (
    <View style={[{ marginBottom: theme.spacing.lg }, containerStyle]}>
      {label ? (
        <AppText variant="label" tone="secondary" style={{ marginBottom: theme.spacing.xs }}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.field,
          {
            borderColor,
            backgroundColor: theme.colors.surfaceSunken,
            shadowColor: theme.colors.primary,
            shadowOpacity: focused ? 0.18 : 0,
            shadowRadius: focused ? 12 : 0,
            shadowOffset: { width: 0, height: 4 },
            elevation: focused ? 3 : 0,
          },
        ]}
      >
        {leftIcon ? (
          <View
            style={[
              styles.iconTile,
              {
                backgroundColor: iconTile && focused ? theme.colors.primarySoft : theme.colors.surface,
                marginRight: theme.spacing.sm,
              },
            ]}
          >
            <Ionicons name={leftIcon} size={17} color={focused ? theme.colors.primary : theme.colors.textMuted} />
          </View>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={theme.colors.textMuted}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          secureTextEntry={hidden}
          style={[styles.input, { color: theme.colors.textPrimary, fontSize: theme.typography.body.fontSize }]}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          {...rest}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((v) => !v)} hitSlop={8} accessibilityRole="button" accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={18} color={theme.colors.textMuted} />
          </Pressable>
        ) : null}
        {rightIcon ? (
          <Pressable onPress={onRightIconPress} hitSlop={8} accessibilityRole="button">
            <Ionicons name={rightIcon} size={18} color={theme.colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.xs }}>
          <Ionicons name="alert-circle" size={13} color={theme.colors.error} style={{ marginRight: 4 }} />
          <AppText variant="caption" tone="error" accessibilityRole="alert">
            {error}
          </AppText>
        </View>
      ) : hint ? (
        <AppText variant="caption" tone="muted" style={{ marginTop: theme.spacing.xs }}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

type SearchInputProps = TextInputProps & {
  onClear?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
};

export const SearchInput = ({ containerStyle, onClear, value, ...rest }: SearchInputProps) => {
  const theme = useTheme();
  const handleClear = onClear ?? (rest.onChangeText ? () => rest.onChangeText?.('') : undefined);
  return (
    <View
      style={[
        styles.field,
        {
          backgroundColor: theme.colors.surfaceSunken,
          borderColor: 'transparent',
          minHeight: 48,
        },
        containerStyle,
      ]}
    >
      <Ionicons name="search" size={18} color={theme.colors.textMuted} />
      <TextInput
        value={value}
        placeholderTextColor={theme.colors.textMuted}
        style={{
          flex: 1,
          marginLeft: theme.spacing.sm,
          color: theme.colors.textPrimary,
          fontSize: theme.typography.body.fontSize,
          paddingVertical: theme.spacing.md,
        }}
        accessibilityLabel={rest.accessibilityLabel ?? 'Search'}
        {...rest}
      />
      {value && handleClear ? (
        <Pressable onPress={handleClear} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    minHeight: 54,
    paddingHorizontal: 14,
  },
  iconTile: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontWeight: '500',
  },
});
