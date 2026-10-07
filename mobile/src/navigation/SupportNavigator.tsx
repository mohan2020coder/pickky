import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppTabBar } from './AppTabBar';
import { SupportFaqStackParamList, SupportHomeStackParamList, SupportTabsParamList, SupportTicketsStackParamList } from './types';
import { useTheme } from '../theme';
import { SupportHomeScreen, TicketListScreen, CreateTicketScreen, TicketDetailsScreen, FaqScreen } from '../screens/support';
import { ProfileNavigator, stackOptions } from './SharedStacks';

const Tabs = createBottomTabNavigator<SupportTabsParamList>();
const HomeStack = createNativeStackNavigator<SupportHomeStackParamList>();
const TicketsStack = createNativeStackNavigator<SupportTicketsStackParamList>();
const FaqStack = createNativeStackNavigator<SupportFaqStackParamList>();

const SupportHomeNavigator = () => (
  <HomeStack.Navigator screenOptions={stackOptions}>
    <HomeStack.Screen name="SupportHome" component={SupportHomeScreen} />
    <HomeStack.Screen name="CreateTicket" component={CreateTicketScreen} />
    <HomeStack.Screen name="TicketDetails" component={TicketDetailsScreen} />
  </HomeStack.Navigator>
);

const TicketsNavigator = () => (
  <TicketsStack.Navigator screenOptions={stackOptions}>
    <TicketsStack.Screen name="TicketList" component={TicketListScreen} />
    <TicketsStack.Screen name="CreateTicket" component={CreateTicketScreen} />
    <TicketsStack.Screen name="TicketDetails" component={TicketDetailsScreen} />
  </TicketsStack.Navigator>
);

const FaqNavigator = () => (
  <FaqStack.Navigator screenOptions={stackOptions}>
    <FaqStack.Screen name="Faq" component={FaqScreen} />
    <FaqStack.Screen name="CreateTicket" component={CreateTicketScreen} />
  </FaqStack.Navigator>
);

export const SupportNavigator = () => {
  const theme = useTheme();
  return (
    <Tabs.Navigator
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.colors.primary, tabBarInactiveTintColor: theme.colors.textMuted }}
    >
      <Tabs.Screen name="SupportHomeTab" component={SupportHomeNavigator} options={{ title: 'Home', tabBarIcon: ({ focused }) => <Ionicons name={focused ? 'help-buoy' : 'help-buoy-outline'} size={20} /> }} />
      <Tabs.Screen name="TicketsTab" component={TicketsNavigator} options={{ title: 'Tickets', tabBarIcon: ({ focused }) => <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={20} /> }} />
      <Tabs.Screen name="FaqTab" component={FaqNavigator} options={{ title: 'FAQ', tabBarIcon: ({ focused }) => <Ionicons name={focused ? 'library' : 'library-outline'} size={20} /> }} />
      <Tabs.Screen name="ProfileTab" component={ProfileNavigator} options={{ title: 'Profile', tabBarIcon: ({ focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={20} /> }} />
    </Tabs.Navigator>
  );
};