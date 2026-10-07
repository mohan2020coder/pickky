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

  const borderColor = error ? theme.colors.error : focused ? theme.colors.primary : theme.colors.border;

  return (
    <View style={[{ marginBottom: theme.spacing.lg }, containerStyle]}>
      {label ? (
        <AppText variant="label" tone="secondary" style={{ marginBottom: theme.spacing.xs }}>
          {label}
        </AppText>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: focused ? 2 : 1,
          borderColor,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.medium,
          minHeight: 52,
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        {leftIcon ? (
          <Ionicons
            name={leftIcon}
            size={18}
            color={focused ? theme.colors.primary : theme.colors.textMuted}
            style={{ marginRight: theme.spacing.sm }}
          />
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
        <AppText variant="caption" tone="error" style={{ marginTop: theme.spacing.xs }} accessibilityRole="alert">
          {error}
        </AppText>
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
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.pill,
          borderWidth: 1,
          borderColor: theme.colors.border,
          minHeight: 48,
          paddingHorizontal: theme.spacing.lg,
        },
        containerStyle,
      ]}
    >
      <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
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
  input: {
    flex: 1,
    paddingVertical: 14,
    fontWeight: '400',
  },
});
