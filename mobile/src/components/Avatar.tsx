import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Gradient } from './Gradient';
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
  const content = (
    <View
      accessibilityLabel={name ? `${name} avatar` : 'Avatar'}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: ring ? theme.colors.primary : theme.colors.surfaceElevated,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderWidth: ring ? 0 : 1.5,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      <AppText
        style={{
          fontSize: size * 0.36,
          fontWeight: '800',
          color: ring ? theme.colors.onPrimary : theme.colors.textSecondary,
        }}
        numberOfLines={1}
      >
        {initialsOf(name)}
      </AppText>
    </View>
  );

  if (!ring) return content;

  return (
    <Gradient
      preset="primary"
      style={{
        width: size + 5,
        height: size + 5,
        borderRadius: (size + 5) / 2,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2.5,
        ...theme.shadows.low,
      }}
    >
      {content}
    </Gradient>
  );
};

export const UserAvatar = (props: AvatarProps) => <Avatar {...props} />;
export const RiderAvatar = (props: AvatarProps) => <Avatar {...props} ring />;
