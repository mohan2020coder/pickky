import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EarningsStackParamList, HistoryStackParamList, NotificationsStackParamList, ProfileStackParamList } from './types';
import { DeliveryHistoryScreen } from '../screens/customer';
import {
  DeliveryDetailsScreen,
  NotificationsScreen,
  ChatScreen,
  ProfileScreen,
  SettingsScreen,
  HelpScreen,
  SavedAddressesScreen,
  SupportTicketsScreen,
} from '../screens/common';
import {
  TrackingScreen,
  PickupVerificationScreen,
  DeliveryVerificationScreen,
  DeliveryCompletedScreen,
  RatingScreen,
} from '../screens/customer';

export const stackOptions = { headerShown: false as const, animation: 'slide_from_right' as const };

const HistoryStack = createNativeStackNavigator<HistoryStackParamList>();
const NotificationsStack = createNativeStackNavigator<NotificationsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const EarningsStack = createNativeStackNavigator<EarningsStackParamList>();

export const HistoryNavigator = () => (
  <HistoryStack.Navigator screenOptions={stackOptions}>
    <HistoryStack.Screen name="DeliveryHistory" component={DeliveryHistoryScreen} />
    <HistoryStack.Screen name="Tracking" component={TrackingScreen} options={{ gestureEnabled: false }} />
    <HistoryStack.Screen name="PickupVerification" component={PickupVerificationScreen} options={{ gestureEnabled: false }} />
    <HistoryStack.Screen name="DeliveryVerification" component={DeliveryVerificationScreen} options={{ gestureEnabled: false }} />
    <HistoryStack.Screen name="DeliveryCompleted" component={DeliveryCompletedScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
    <HistoryStack.Screen name="Rating" component={RatingScreen} options={{ gestureEnabled: false }} />
    <HistoryStack.Screen name="DeliveryDetails" component={DeliveryDetailsScreen} />
    <HistoryStack.Screen name="Chat" component={ChatScreen} />
  </HistoryStack.Navigator>
);

export const NotificationsNavigator = () => (
  <NotificationsStack.Navigator screenOptions={stackOptions}>
    <NotificationsStack.Screen name="Notifications" component={NotificationsScreen} />
    <NotificationsStack.Screen name="DeliveryDetails" component={DeliveryDetailsScreen} />
    <NotificationsStack.Screen name="Tracking" component={TrackingScreen} options={{ gestureEnabled: false }} />
    <NotificationsStack.Screen name="PickupVerification" component={PickupVerificationScreen} options={{ gestureEnabled: false }} />
    <NotificationsStack.Screen name="DeliveryVerification" component={DeliveryVerificationScreen} options={{ gestureEnabled: false }} />
    <NotificationsStack.Screen name="DeliveryCompleted" component={DeliveryCompletedScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
    <NotificationsStack.Screen name="Rating" component={RatingScreen} options={{ gestureEnabled: false }} />
    <NotificationsStack.Screen name="Chat" component={ChatScreen} />
  </NotificationsStack.Navigator>
);

export const ProfileNavigator = () => (
  <ProfileStack.Navigator screenOptions={stackOptions}>
    <ProfileStack.Screen name="Profile" component={ProfileScreen} />
    <ProfileStack.Screen name="Settings" component={SettingsScreen} />
    <ProfileStack.Screen name="Help" component={HelpScreen} />
    <ProfileStack.Screen name="SavedAddresses" component={SavedAddressesScreen} />
    <ProfileStack.Screen name="SupportTickets" component={SupportTicketsScreen} />
  </ProfileStack.Navigator>
);

export const EarningsNavigator = ({ Earnings }: { Earnings: React.ComponentType }) => (
  <EarningsStack.Navigator screenOptions={stackOptions}>
    <EarningsStack.Screen name="Earnings" component={Earnings} />
    <EarningsStack.Screen name="DeliveryHistory" component={DeliveryHistoryScreen} />
    <EarningsStack.Screen name="DeliveryDetails" component={DeliveryDetailsScreen} />
    <EarningsStack.Screen name="Tracking" component={TrackingScreen} options={{ gestureEnabled: false }} />
    <EarningsStack.Screen name="PickupVerification" component={PickupVerificationScreen} options={{ gestureEnabled: false }} />
    <EarningsStack.Screen name="DeliveryVerification" component={DeliveryVerificationScreen} options={{ gestureEnabled: false }} />
    <EarningsStack.Screen name="DeliveryCompleted" component={DeliveryCompletedScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
    <EarningsStack.Screen name="Rating" component={RatingScreen} options={{ gestureEnabled: false }} />
    <EarningsStack.Screen name="Chat" component={ChatScreen} />
  </EarningsStack.Navigator>
);