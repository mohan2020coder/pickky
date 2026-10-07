import { DeliveryStatus, Role } from '../types';

export type StatusMeta = {
  label: string;
  shortLabel: string;
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'primary';
  stepIndex: number;
  description: string;
};

export const DELIVERY_FLOW: DeliveryStatus[] = [
  'CREATED',
  'SEARCHING_RIDER',
  'RIDER_ASSIGNED',
  'RIDER_ARRIVING_PICKUP',
  'RIDER_ARRIVED_PICKUP',
  'PICKUP_VERIFICATION',
  'PICKED_UP',
  'IN_TRANSIT',
  'NEAR_DESTINATION',
  'DELIVERY_VERIFICATION',
  'DELIVERED',
];

export const STATUS_META: Record<DeliveryStatus, StatusMeta> = {
  DRAFT: { label: 'Draft', shortLabel: 'Draft', tone: 'neutral', stepIndex: -1, description: 'Not submitted yet.' },
  CREATED: { label: 'Delivery created', shortLabel: 'Created', tone: 'neutral', stepIndex: 0, description: 'Your delivery request has been created.' },
  SEARCHING_RIDER: { label: 'Finding a rider', shortLabel: 'Searching', tone: 'primary', stepIndex: 1, description: 'Matching you with a nearby rider.' },
  RIDER_ASSIGNED: { label: 'Rider assigned', shortLabel: 'Assigned', tone: 'info', stepIndex: 2, description: 'Your rider is getting ready.' },
  RIDER_ARRIVING_PICKUP: { label: 'Rider heading to pickup', shortLabel: 'On the way', tone: 'info', stepIndex: 3, description: 'Your rider is on the way to the pickup point.' },
  RIDER_ARRIVED_PICKUP: { label: 'Rider arrived at pickup', shortLabel: 'Arrived', tone: 'info', stepIndex: 4, description: 'Your rider has reached the pickup location.' },
  PICKUP_VERIFICATION: { label: 'Pickup verification', shortLabel: 'Verifying', tone: 'warning', stepIndex: 5, description: 'Share the pickup OTP to start the delivery.' },
  PICKED_UP: { label: 'Item picked up', shortLabel: 'Picked up', tone: 'success', stepIndex: 6, description: 'Your item has been picked up.' },
  IN_TRANSIT: { label: 'On the way', shortLabel: 'In transit', tone: 'primary', stepIndex: 7, description: 'Your item is on the way to the destination.' },
  NEAR_DESTINATION: { label: 'Near destination', shortLabel: 'Nearly there', tone: 'primary', stepIndex: 8, description: 'Your rider is close to the destination.' },
  DELIVERY_VERIFICATION: { label: 'Delivery verification', shortLabel: 'Verifying', tone: 'warning', stepIndex: 9, description: 'Share the delivery OTP to complete.' },
  DELIVERED: { label: 'Delivered', shortLabel: 'Delivered', tone: 'success', stepIndex: 10, description: 'Your item was delivered successfully.' },
  CANCELLED: { label: 'Cancelled', shortLabel: 'Cancelled', tone: 'error', stepIndex: -1, description: 'This delivery was cancelled.' },
  FAILED: { label: 'Failed', shortLabel: 'Failed', tone: 'error', stepIndex: -1, description: 'This delivery could not be completed.' },
};

export const isActiveStatus = (status: DeliveryStatus): boolean =>
  status !== 'DELIVERED' && status !== 'CANCELLED' && status !== 'FAILED' && status !== 'DRAFT';

export const isTerminalStatus = (status: DeliveryStatus): boolean =>
  status === 'DELIVERED' || status === 'CANCELLED' || status === 'FAILED';

export const ROLE_META: Record<Role, { label: string; home: string; tagline: string }> = {
  CUSTOMER: { label: 'Customer', home: 'Send anything, anywhere', tagline: 'Book pickups and track deliveries' },
  RIDER: { label: 'Rider', home: 'Ready to ride', tagline: 'Accept deliveries and earn' },
  ADMIN: { label: 'Admin', home: 'Operations overview', tagline: 'Manage deliveries, riders and issues' },
  SUPPORT: { label: 'Support', home: 'How can we help?', tagline: 'Resolve customer and rider issues' },
};

export const PACKAGE_TYPES = [
  { id: 'document', label: 'Documents', icon: '📄' },
  { id: 'parcel', label: 'Parcel', icon: '📦' },
  { id: 'groceries', label: 'Groceries', icon: '🛒' },
  { id: 'food', label: 'Food', icon: '🍽️' },
  { id: 'medicine', label: 'Medicine', icon: '💊' },
  { id: 'keys', label: 'Keys', icon: '🔑' },
  { id: 'clothes', label: 'Clothes', icon: '👕' },
  { id: 'other', label: 'Other', icon: '✨' },
] as const;

export const PACKAGE_SIZES = [
  { id: 'small', label: 'Small', hint: 'Fits in a bag' },
  { id: 'medium', label: 'Medium', hint: 'Shoebox size' },
  { id: 'large', label: 'Large', hint: 'Big box' },
] as const;
