import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface NotificationClickData {
  type: 'NOTIFICATION_CLICK';
  url: string;
  data?: any;
}

export const useNotificationHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
        const data: NotificationClickData = event.data;
        
        // Navigate to the specified URL
        if (data.url) {
          navigate(data.url);
        }
        
        // Handle specific notification data if needed
        if (data.data) {
          console.log('Notification data:', data.data);
          
          // You can add specific handling based on notification type
          switch (data.data.type) {
            case 'message':
              // Handle message notification
              break;
            case 'task':
              // Handle task notification
              break;
            case 'general':
              // Handle general notification
              break;
            default:
              break;
          }
        }
      }
    };

    // Listen for messages from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [navigate]);
};

export default useNotificationHandler; 