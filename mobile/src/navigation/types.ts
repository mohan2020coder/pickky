import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: { identifier?: string } | undefined;
  Register: undefined;
  Otp: { phone: string; purpose: 'login' | 'register' | 'forgot' } | undefined;
  ForgotPassword: undefined;
  ResetPassword: { phone: string } | undefined;
};

// Routes shared across every stack that renders the tracking / detail / chat flow.
// Keeping them in one place guarantees identical param shapes everywhere.
export type CustomerFlowStackParamList = {
  Tracking: { deliveryId: string; autoVerifyStage?: 'pickup' | 'delivery' } | undefined;
  PickupVerification: { deliveryId: string } | undefined;
  DeliveryVerification: { deliveryId: string } | undefined;
  DeliveryCompleted: { deliveryId: string } | undefined;
  Rating: { deliveryId: string } | undefined;
  DeliveryDetails: { deliveryId: string } | undefined;
  Chat: { conversationId: string; title?: string; deliveryId?: string } | undefined;
};

export type CustomerHomeStackParamList = CustomerFlowStackParamList & {
  CustomerHome: undefined;
  CreateDelivery: undefined;
  LocationPicker: { field: 'pickup' | 'dropoff' } | undefined;
  PackageDetails: undefined;
  PriceConfirm: undefined;
  SearchingRider: { deliveryId: string } | undefined;
};

export type CustomerTabsParamList = {
  HomeTab: NavigatorScreenParams<CustomerHomeStackParamList> | undefined;
  HistoryTab: NavigatorScreenParams<HistoryStackParamList> | undefined;
  NotificationsTab: NavigatorScreenParams<NotificationsStackParamList> | undefined;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

export type HistoryStackParamList = CustomerFlowStackParamList & {
  DeliveryHistory: undefined;
};

export type NotificationsStackParamList = CustomerFlowStackParamList & {
  Notifications: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
  Help: undefined;
  SavedAddresses: undefined;
  SupportTickets: undefined;
};

export type RiderTabsParamList = {
  RiderHomeTab: NavigatorScreenParams<RiderHomeStackParamList> | undefined;
  EarningsTab: NavigatorScreenParams<EarningsStackParamList> | undefined;
  HistoryTab: NavigatorScreenParams<HistoryStackParamList> | undefined;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

export type RiderFlowStackParamList = {
  DeliveryRequest: { offerId: string } | undefined;
  ActiveDelivery: { deliveryId: string } | undefined;
};

export type RiderHomeStackParamList = RiderFlowStackParamList & CustomerFlowStackParamList & {
  RiderHome: undefined;
};

export type EarningsStackParamList = CustomerFlowStackParamList & {
  Earnings: undefined;
  DeliveryHistory: undefined;
};

export type AdminHomeStackParamList = CustomerFlowStackParamList & {
  AdminHome: undefined;
  ActiveDeliveries: undefined;
  Issues: undefined;
};

export type AdminDeliveriesStackParamList = CustomerFlowStackParamList & {
  AdminDeliveries: undefined;
};

export type AdminUsersStackParamList = {
  AdminUsers: undefined;
  AdminRiders: undefined;
};

export type AdminTabsParamList = {
  AdminHomeTab: NavigatorScreenParams<AdminHomeStackParamList> | undefined;
  AdminDeliveriesTab: NavigatorScreenParams<AdminDeliveriesStackParamList> | undefined;
  AdminUsersTab: NavigatorScreenParams<AdminUsersStackParamList> | undefined;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

export type SupportHomeStackParamList = {
  SupportHome: undefined;
  CreateTicket: undefined;
  TicketDetails: { ticketId: string } | undefined;
};

export type SupportTicketsStackParamList = {
  TicketList: undefined;
  CreateTicket: undefined;
  TicketDetails: { ticketId: string } | undefined;
};

export type SupportFaqStackParamList = {
  Faq: undefined;
  CreateTicket: undefined;
};

export type SupportTabsParamList = {
  SupportHomeTab: NavigatorScreenParams<SupportHomeStackParamList> | undefined;
  TicketsTab: NavigatorScreenParams<SupportTicketsStackParamList> | undefined;
  FaqTab: NavigatorScreenParams<SupportFaqStackParamList> | undefined;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList> | undefined;
};