import React from 'react';
import { useNotificationHandler } from '@/hooks/useNotificationHandler';

const NotificationHandler: React.FC = () => {
  useNotificationHandler();
  return null; // This component doesn't render anything
};

export default NotificationHandler; 