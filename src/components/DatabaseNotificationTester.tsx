import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, MessageSquare, CheckSquare, Info, Bell } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const DatabaseNotificationTester: React.FC = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [notificationType, setNotificationType] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const notificationTemplates = {
    general: {
      icon: <Info className="h-4 w-4" />,
      title: 'System Update',
      message: 'New features have been added to NoorHub. Check them out!',
      related_to: null,
      related_id: null
    },
    task: {
      icon: <CheckSquare className="h-4 w-4" />,
      title: 'New Task Assigned',
      message: 'You have been assigned a new task: Complete monthly reports',
      related_to: 'task',
      related_id: 'task_123'
    },
    message: {
      icon: <MessageSquare className="h-4 w-4" />,
      title: 'New Message',
      message: 'Ahmad sent you a message in the workspace chat',
      related_to: 'message',
      related_id: 'msg_456'
    }
  };

  const createDatabaseNotification = async (templateType: keyof typeof notificationTemplates, customTitle?: string, customMessage?: string) => {
    if (!user) {
      toast.error('You must be logged in to test notifications');
      return;
    }

    setIsLoading(true);
    
    try {
      const template = notificationTemplates[templateType];
      const notificationData = {
        user_id: user.id,
        created_by: user.id, // Add the required created_by field
        title: customTitle || template.title,
        message: customMessage || template.message,
        is_read: false,
        related_to: template.related_to,
        related_id: template.related_id,
        created_at: new Date().toISOString()
      };

      console.log('Creating database notification:', notificationData);

      const { data, error } = await supabase
        .from('notifications')
        .insert([notificationData])
        .select();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Database notification created:', data);
      toast.success('Database notification created! Check your notification bell.');
      
      // Clear form
      setTitle('');
      setMessage('');
      
    } catch (error) {
      console.error('Error creating database notification:', error);
      toast.error('Failed to create database notification: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickTest = async (type: keyof typeof notificationTemplates) => {
    await createDatabaseNotification(type);
  };

  const handleCustomNotification = async () => {
    if (!title.trim() && !message.trim()) {
      toast.error('Please enter a title or message');
      return;
    }
    
    await createDatabaseNotification(
      notificationType as keyof typeof notificationTemplates,
      title.trim() || undefined,
      message.trim() || undefined
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Notification Tester
          </CardTitle>
          <CardDescription>
            Create real notifications in the database that will trigger push notifications.
            These will appear in your notification bell and send push notifications if enabled.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                How it works:
              </span>
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              These notifications are added to your database and will automatically trigger push notifications 
              if you have notifications enabled. Check your notification bell after creating one!
            </p>
          </div>
          
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
              onClick={() => handleQuickTest('task')}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <CheckSquare className="h-4 w-4" />
              Test Task
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
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Custom Database Notification</h4>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="db-notification-type">Notification Type</Label>
                <Select value={notificationType} onValueChange={setNotificationType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="message">Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="db-notification-title">Custom Title (optional)</Label>
                <Input
                  id="db-notification-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={notificationTemplates[notificationType as keyof typeof notificationTemplates].title}
                />
              </div>
              
              <div>
                <Label htmlFor="db-notification-message">Custom Message (optional)</Label>
                <Textarea
                  id="db-notification-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={notificationTemplates[notificationType as keyof typeof notificationTemplates].message}
                  rows={3}
                />
              </div>
              
              <Button
                onClick={handleCustomNotification}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Creating...' : 'Create Database Notification'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DatabaseNotificationTester; 