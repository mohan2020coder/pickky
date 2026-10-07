import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ComponentProps } from 'react';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { AppText } from '../components';

export const AppTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: Math.max(insets.bottom, theme.spacing.sm),
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.divider,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const options = descriptors[route.key].options;
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : typeof options.title === 'string'
              ? options.title
              : route.name;
        const tint = focused ? theme.colors.primary : theme.colors.textMuted;
        const iconNode = options.tabBarIcon
          ? options.tabBarIcon({ focused, color: tint, size: 20 })
          : null;
        const iconName = (
          iconNode && typeof iconNode === 'object' && 'props' in iconNode
            ? (iconNode.props as { name?: string }).name
            : 'ellipse'
        ) as ComponentProps<typeof Ionicons>['name'];

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={typeof label === 'string' ? label : route.name}
            style={({ pressed }) => [styles.item, { opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={[styles.iconWrap, focused && { backgroundColor: theme.colors.primarySoft }]}>
              <Ionicons name={iconName} size={20} color={tint} />
            </View>
            <AppText
              variant="caption"
              color={tint}
              weight={focused ? '700' : '500'}
              numberOfLines={1}
              style={{ fontSize: 11, marginTop: 2 }}
            >
              {typeof label === 'string' ? label : route.name}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    elevation: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  iconWrap: {
    width: 40,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
