import React from 'react';
import { CustomerNavigator } from './CustomerNavigator';
import { RiderNavigator } from './RiderNavigator';
import { AdminNavigator } from './AdminNavigator';
import { SupportNavigator } from './SupportNavigator';
import { useAuthStore } from '../stores/authStore';

export const AppNavigator = () => {
  const role = useAuthStore((s) => s.primaryRole);

  switch (role) {
    case 'ADMIN':
      return <AdminNavigator key="admin" />;
    case 'SUPPORT':
      return <SupportNavigator key="support" />;
    case 'RIDER':
      return <RiderNavigator key="rider" />;
    case 'CUSTOMER':
    default:
      return <CustomerNavigator key="customer" />;
  }
};