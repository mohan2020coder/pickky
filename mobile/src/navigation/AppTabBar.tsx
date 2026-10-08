import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ComponentProps } from 'react';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { AppText, Gradient } from '../components';
import { PressableScale } from '../components/motion';

export const AppTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { paddingBottom: Math.max(insets.bottom, theme.spacing.sm), backgroundColor: theme.colors.background }]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: theme.colors.glass,
            borderColor: theme.colors.glassBorder,
          },
          theme.shadows.floating,
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
          const tint = focused ? theme.colors.onPrimary : theme.colors.textMuted;
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
            <PressableScale
              key={route.key}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={typeof label === 'string' ? label : route.name}
              scaleTo={0.92}
              style={styles.item}
            >
              <View
                style={[
                  styles.iconWrap,
                  focused
                    ? { shadowColor: theme.colors.primary, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 }
                    : { backgroundColor: theme.scheme === 'dark' ? 'rgba(148,163,184,0.12)' : 'rgba(15,23,42,0.05)' },
                ]}
              >
                {focused ? <Gradient preset="primary" style={StyleSheet.absoluteFill} /> : null}
                <Ionicons name={iconName} size={20} color={focused ? theme.colors.onPrimary : tint} />
              </View>
              <AppText
                variant="caption"
                color={focused ? theme.colors.primary : theme.colors.textMuted}
                weight={focused ? '800' : '600'}
                numberOfLines={1}
                style={{ fontSize: 10.5, marginTop: 4 }}
              >
                {typeof label === 'string' ? label : route.name}
              </AppText>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    paddingHorizontal: 14,
    paddingTop: 4,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  iconWrap: {
    width: 46,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
