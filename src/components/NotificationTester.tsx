import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Bell, MessageSquare, CheckSquare, Info } from 'lucide-react';
import NotificationManager from '@/utils/notificationManager';
import { toast } from 'sonner';

const NotificationTester: React.FC = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [notificationType, setNotificationType] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const [notificationManager] = useState(() => NotificationManager.getInstance());

  const testNotifications = {
    general: {
      icon: <Info className="h-4 w-4" />,
      defaultTitle: 'Test Notification',
      defaultMessage: 'This is a test notification from NoorHub!'
    },
    message: {
      icon: <MessageSquare className="h-4 w-4" />,
      defaultTitle: 'New Message',
      defaultMessage: 'Ahmad: Hey, can you check the latest reports?'
    },
    task: {
      icon: <CheckSquare className="h-4 w-4" />,
      defaultTitle: 'Task Reminder',
      defaultMessage: 'Complete monthly report - Due: Today at 5:00 PM'
    }
  };

  const handleSendNotification = async () => {
    setIsLoading(true);
    
    try {
      const finalTitle = title || testNotifications[notificationType as keyof typeof testNotifications].defaultTitle;
      const finalMessage = message || testNotifications[notificationType as keyof typeof testNotifications].defaultMessage;
      
      let success = false;
      
      switch (notificationType) {
        case 'message':
          success = await notificationManager.showMessageNotification(finalMessage, 'Ahmad');
          break;
        case 'task':
          success = await notificationManager.showTaskNotification(finalMessage, 'Today at 5:00 PM');
          break;
        default:
          success = await notificationManager.showGeneralNotification(finalTitle, finalMessage);
          break;
      }
      
      if (success) {
        toast.success('Notification sent successfully!');
      } else {
        toast.error('Failed to send notification. Please check permissions.');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Error sending notification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickTest = async (type: string) => {
    setIsLoading(true);
    
    try {
      const testData = testNotifications[type as keyof typeof testNotifications];
      let success = false;
      
      switch (type) {
        case 'message':
          success = await notificationManager.showMessageNotification(testData.defaultMessage, 'Ahmad');
          break;
        case 'task':
          success = await notificationManager.showTaskNotification(testData.defaultMessage, 'Today at 5:00 PM');
          break;
        default:
          success = await notificationManager.showGeneralNotification(testData.defaultTitle, testData.defaultMessage);
          break;
      }
      
      if (success) {
        toast.success(`${type} notification sent!`);
      } else {
        toast.error('Failed to send notification. Please enable notifications first.');
      }
    } catch (error) {
      console.error('Error sending quick notification:', error);
      toast.error('Error sending notification');
    } finally {
      setIsLoading(false);
    }
  };

  const permissionStatus = notificationManager.getPermissionStatus();
  const isAvailable = notificationManager.isNotificationAvailable();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Tester
          </CardTitle>
          <CardDescription>
            Test push notifications locally. Status: 
            <span className={`ml-1 font-medium ${
              permissionStatus === 'granted' ? 'text-green-600' : 
              permissionStatus === 'denied' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {permissionStatus === 'granted' ? 'Enabled' : 
               permissionStatus === 'denied' ? 'Blocked' : 'Not Requested'}
            </span>
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {!isAvailable && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Notifications are not available or permission not granted. 
                Please enable notifications first using the permission prompt above.
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              onClick={() => handleQuickTest('general')}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Info className="h-4 w-4" />
              Test General
            </Button>
            
            <Button
              onClick={() => handleQuickTest('message')}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Test Message
            </Button>
            
            <Button
              onClick={() => handleQuickTest('task')}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <CheckSquare className="h-4 w-4" />
              Test Task
            </Button>
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Custom Notification</h4>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="notification-type">Type</Label>
                <Select value={notificationType} onValueChange={setNotificationType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="message">Message</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="notification-title">Title (optional)</Label>
                <Input
                  id="notification-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={testNotifications[notificationType as keyof typeof testNotifications].defaultTitle}
                />
              </div>
              
              <div>
                <Label htmlFor="notification-message">Message (optional)</Label>
                <Textarea
                  id="notification-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={testNotifications[notificationType as keyof typeof testNotifications].defaultMessage}
                  rows={3}
                />
              </div>
              
              <Button
                onClick={handleSendNotification}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Sending...' : 'Send Custom Notification'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationTester; 