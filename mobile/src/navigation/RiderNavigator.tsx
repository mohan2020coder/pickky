import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppTabBar } from './AppTabBar';
import { RiderHomeStackParamList, RiderTabsParamList } from './types';
import { useTheme } from '../theme';
import { RiderHomeScreen, DeliveryRequestScreen, ActiveDeliveryScreen } from '../screens/rider';
import { DeliveryDetailsScreen, ChatScreen } from '../screens/common';
import { HistoryNavigator, ProfileNavigator, EarningsNavigator, stackOptions } from './SharedStacks';
import { EarningsScreen } from '../screens/rider';

const Tabs = createBottomTabNavigator<RiderTabsParamList>();
const HomeStack = createNativeStackNavigator<RiderHomeStackParamList>();

const RiderHomeNavigator = () => (
  <HomeStack.Navigator screenOptions={stackOptions} initialRouteName="RiderHome">
    <HomeStack.Screen name="RiderHome" component={RiderHomeScreen} />
    <HomeStack.Screen name="DeliveryRequest" component={DeliveryRequestScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    <HomeStack.Screen name="ActiveDelivery" component={ActiveDeliveryScreen} options={{ gestureEnabled: false }} />
    <HomeStack.Screen name="Chat" component={ChatScreen} />
    <HomeStack.Screen name="DeliveryDetails" component={DeliveryDetailsScreen} />
  </HomeStack.Navigator>
);

const EarningsTab = () => <EarningsNavigator Earnings={EarningsScreen} />;

export const RiderNavigator = () => {
  const theme = useTheme();
  return (
    <Tabs.Navigator
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.colors.primary, tabBarInactiveTintColor: theme.colors.textMuted }}
    >
      <Tabs.Screen name="RiderHomeTab" component={RiderHomeNavigator} options={{ title: 'Ride', tabBarIcon: ({ focused }) => <Ionicons name={focused ? 'bicycle' : 'bicycle-outline'} size={20} /> }} />
      <Tabs.Screen name="EarningsTab" component={EarningsTab} options={{ title: 'Earnings', tabBarIcon: ({ focused }) => <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={20} /> }} />
      <Tabs.Screen name="HistoryTab" component={HistoryNavigator} options={{ title: 'History', tabBarIcon: ({ focused }) => <Ionicons name={focused ? 'time' : 'time-outline'} size={20} /> }} />
      <Tabs.Screen name="ProfileTab" component={ProfileNavigator} options={{ title: 'Profile', tabBarIcon: ({ focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={20} /> }} />
    </Tabs.Navigator>
  );
};