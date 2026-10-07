import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppTabBar } from './AppTabBar';
import { CustomerHomeStackParamList, CustomerTabsParamList } from './types';
import { useTheme } from '../theme';
import {
  CustomerHomeScreen,
  CreateDeliveryScreen,
  LocationPickerScreen,
  PackageDetailsScreen,
  PriceConfirmScreen,
  SearchingRiderScreen,
  TrackingScreen,
  PickupVerificationScreen,
  DeliveryVerificationScreen,
  DeliveryCompletedScreen,
  RatingScreen,
} from '../screens/customer';
import { DeliveryDetailsScreen, ChatScreen } from '../screens/common';
import { HistoryNavigator, NotificationsNavigator, ProfileNavigator, stackOptions } from './SharedStacks';

const Tabs = createBottomTabNavigator<CustomerTabsParamList>();
const HomeStack = createNativeStackNavigator<CustomerHomeStackParamList>();

const CustomerHomeNavigator = () => (
  <HomeStack.Navigator screenOptions={stackOptions}>
    <HomeStack.Screen name="CustomerHome" component={CustomerHomeScreen} />
    <HomeStack.Screen name="CreateDelivery" component={CreateDeliveryScreen} />
    <HomeStack.Screen name="LocationPicker" component={LocationPickerScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    <HomeStack.Screen name="PackageDetails" component={PackageDetailsScreen} />
    <HomeStack.Screen name="PriceConfirm" component={PriceConfirmScreen} />
    <HomeStack.Screen name="SearchingRider" component={SearchingRiderScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
    <HomeStack.Screen name="Tracking" component={TrackingScreen} options={{ gestureEnabled: false }} />
    <HomeStack.Screen name="PickupVerification" component={PickupVerificationScreen} options={{ gestureEnabled: false }} />
    <HomeStack.Screen name="DeliveryVerification" component={DeliveryVerificationScreen} options={{ gestureEnabled: false }} />
    <HomeStack.Screen name="DeliveryCompleted" component={DeliveryCompletedScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
    <HomeStack.Screen name="Rating" component={RatingScreen} options={{ gestureEnabled: false }} />
    <HomeStack.Screen name="DeliveryDetails" component={DeliveryDetailsScreen} />
    <HomeStack.Screen name="Chat" component={ChatScreen} />
  </HomeStack.Navigator>
);

export const CustomerNavigator = () => {
  const theme = useTheme();
  return (
    <Tabs.Navigator
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.colors.primary, tabBarInactiveTintColor: theme.colors.textMuted }}
    >
      <Tabs.Screen name="HomeTab" component={CustomerHomeNavigator} options={{ title: 'Home', tabBarIcon: ({ focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={20} /> }} />
      <Tabs.Screen name="HistoryTab" component={HistoryNavigator} options={{ title: 'History', tabBarIcon: ({ focused }) => <Ionicons name={focused ? 'time' : 'time-outline'} size={20} /> }} />
      <Tabs.Screen name="NotificationsTab" component={NotificationsNavigator} options={{ title: 'Alerts', tabBarIcon: ({ focused }) => <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={20} /> }} />
      <Tabs.Screen name="ProfileTab" component={ProfileNavigator} options={{ title: 'Profile', tabBarIcon: ({ focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={20} /> }} />
    </Tabs.Navigator>
  );
};