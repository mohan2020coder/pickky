import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { initialsOf } from '../utils/format';

type AvatarProps = {
  name?: string | null;
  size?: number;
  uri?: string | null;
  ring?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const Avatar = ({ name, size = 48, ring = false, style }: AvatarProps) => {
  const theme = useTheme();
  const background = ring ? theme.colors.primarySoft : theme.colors.surfaceElevated;
  const color = ring ? theme.colors.primary : theme.colors.textSecondary;

  return (
    <View
      accessibilityLabel={name ? `${name} avatar` : 'Avatar'}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: background,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1.5,
          borderColor: theme.colors.border,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <AppText
        style={{ fontSize: size * 0.36, fontWeight: '700', color }}
        numberOfLines={1}
      >
        {initialsOf(name)}
      </AppText>
    </View>
  );
};

export const UserAvatar = (props: AvatarProps) => <Avatar {...props} />;
export const RiderAvatar = (props: AvatarProps) => <Avatar {...props} ring />;
