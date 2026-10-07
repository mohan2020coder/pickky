import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppTabBar } from './AppTabBar';
import {
  AdminDeliveriesStackParamList,
  AdminHomeStackParamList,
  AdminTabsParamList,
  AdminUsersStackParamList,
} from './types';
import { useTheme } from '../theme';
import { AdminHomeScreen, AdminDeliveriesScreen, AdminUsersScreen, AdminRidersScreen, AdminIssuesScreen } from '../screens/admin';
import { DeliveryDetailsScreen, ChatScreen } from '../screens/common';
import { TrackingScreen, PickupVerificationScreen, DeliveryVerificationScreen, DeliveryCompletedScreen, RatingScreen } from '../screens/customer';
import { ProfileNavigator, stackOptions } from './SharedStacks';

const Tabs = createBottomTabNavigator<AdminTabsParamList>();
const HomeStack = createNativeStackNavigator<AdminHomeStackParamList>();
const DeliveriesStack = createNativeStackNavigator<AdminDeliveriesStackParamList>();
const UsersStack = createNativeStackNavigator<AdminUsersStackParamList>();

const AdminHomeNavigator = () => (
  <HomeStack.Navigator screenOptions={stackOptions}>
    <HomeStack.Screen name="AdminHome" component={AdminHomeScreen} />
    <HomeStack.Screen name="ActiveDeliveries" component={AdminDeliveriesScreen} />
    <HomeStack.Screen name="DeliveryDetails" component={DeliveryDetailsScreen} />
    <HomeStack.Screen name="Tracking" component={TrackingScreen} options={{ gestureEnabled: false }} />
    <HomeStack.Screen name="PickupVerification" component={PickupVerificationScreen} options={{ gestureEnabled: false }} />
    <HomeStack.Screen name="DeliveryVerification" component={DeliveryVerificationScreen} options={{ gestureEnabled: false }} />
    <HomeStack.Screen name="DeliveryCompleted" component={DeliveryCompletedScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
    <HomeStack.Screen name="Rating" component={RatingScreen} options={{ gestureEnabled: false }} />
    <HomeStack.Screen name="Chat" component={ChatScreen} />
    <HomeStack.Screen name="Issues" component={AdminIssuesScreen} />
  </HomeStack.Navigator>
);

const AdminDeliveriesNavigator = () => (
  <DeliveriesStack.Navigator screenOptions={stackOptions}>
    <DeliveriesStack.Screen name="AdminDeliveries" component={AdminDeliveriesScreen} />
    <DeliveriesStack.Screen name="DeliveryDetails" component={DeliveryDetailsScreen} />
    <DeliveriesStack.Screen name="Tracking" component={TrackingScreen} options={{ gestureEnabled: false }} />
    <DeliveriesStack.Screen name="PickupVerification" component={PickupVerificationScreen} options={{ gestureEnabled: false }} />
    <DeliveriesStack.Screen name="DeliveryVerification" component={DeliveryVerificationScreen} options={{ gestureEnabled: false }} />
    <DeliveriesStack.Screen name="DeliveryCompleted" component={DeliveryCompletedScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
    <DeliveriesStack.Screen name="Rating" component={RatingScreen} options={{ gestureEnabled: false }} />
    <DeliveriesStack.Screen name="Chat" component={ChatScreen} />
  </DeliveriesStack.Navigator>
);

const AdminUsersNavigator = () => (
  <UsersStack.Navigator screenOptions={stackOptions}>
    <UsersStack.Screen name="AdminUsers" component={AdminUsersScreen} />
    <UsersStack.Screen name="AdminRiders" component={AdminRidersScreen} />
  </UsersStack.Navigator>
);

export const AdminNavigator = () => {
  const theme = useTheme();
  return (
    <Tabs.Navigator
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.colors.primary, tabBarInactiveTintColor: theme.colors.textMuted }}
    >
      <Tabs.Screen name="AdminHomeTab" component={AdminHomeNavigator} options={{ title: 'Overview', tabBarIcon: ({ focused }) => <Ionicons name={focused ? 'grid' : 'grid-outline'} size={20} /> }} />
      <Tabs.Screen name="AdminDeliveriesTab" component={AdminDeliveriesNavigator} options={{ title: 'Deliveries', tabBarIcon: ({ focused }) => <Ionicons name={focused ? 'cube' : 'cube-outline'} size={20} /> }} />
      <Tabs.Screen name="AdminUsersTab" component={AdminUsersNavigator} options={{ title: 'People', tabBarIcon: ({ focused }) => <Ionicons name={focused ? 'people' : 'people-outline'} size={20} /> }} />
      <Tabs.Screen name="ProfileTab" component={ProfileNavigator} options={{ title: 'Profile', tabBarIcon: ({ focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={20} /> }} />
    </Tabs.Navigator>
  );
};