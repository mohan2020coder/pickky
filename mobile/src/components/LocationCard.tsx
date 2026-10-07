import React from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { IconName } from './Button';

export type LocationValue = {
  label?: string;
  address: string;
  lat?: number;
  lng?: number;
};

type LocationInputProps = {
  title: string;
  value?: LocationValue | null;
  placeholder: string;
  onPress?: () => void;
  dotColor?: string;
  style?: StyleProp<ViewStyle>;
  icon?: IconName;
};

export const LocationInput = ({ title, value, placeholder, onPress, dotColor, style, icon }: LocationInputProps) => {
  const theme = useTheme();
  const hasValue = !!value?.address;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${hasValue ? value?.address : placeholder}`}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.medium,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          minHeight: 56,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: dotColor ?? theme.colors.primary,
          marginRight: theme.spacing.md,
        }}
      />
      <View style={{ flex: 1 }}>
        <AppText variant="caption" tone="muted">
          {title}
        </AppText>
        <AppText variant="body" numberOfLines={1} tone={hasValue ? 'default' : 'muted'} weight={hasValue ? '600' : '400'}>
          {hasValue ? value?.address : placeholder}
        </AppText>
      </View>
      <Ionicons name={icon ?? 'chevron-forward'} size={18} color={theme.colors.textMuted} />
    </Pressable>
  );
};

type AddressCardProps = {
  label: string;
  address: string;
  onPress?: () => void;
  onDelete?: () => void;
  icon?: IconName;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const AddressCard = ({ label, address, onPress, onDelete, icon = 'bookmark-outline', selected, style }: AddressCardProps) => {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${address}`}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
          borderWidth: 1,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          borderRadius: theme.radius.medium,
          padding: theme.spacing.lg,
          minHeight: 56,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: theme.colors.divider,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing.md,
        }}
      >
        <Ionicons name={icon} size={16} color={theme.colors.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="label">{label}</AppText>
        <AppText variant="bodySmall" tone="secondary" numberOfLines={1}>
          {address}
        </AppText>
      </View>
      {onDelete ? (
        <Pressable onPress={onDelete} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Delete ${label}`}>
          <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
        </Pressable>
      ) : null}
    </Pressable>
  );
};
