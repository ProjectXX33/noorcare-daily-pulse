import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle2, AlertCircle, Info, TestTube } from 'lucide-react';
import { toast } from 'sonner';
import { notificationErrorHandler } from '@/lib/notificationErrorHandler';
import { createNotification } from '@/lib/notifications';
import { triggerPushNotification } from '@/utils/pushNotificationHelper';
import NotificationManager from '@/utils/notificationManager';
import { useAuth } from '@/contexts/AuthContext';

const NotificationTestPage: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<{ [key: string]: boolean }>({});
  const [notificationTitle, setNotificationTitle] = useState('Test Notification');
  const [notificationMessage, setNotificationMessage] = useState('This is a test notification from NoorHub!');

  // Test browser notification support
  const testBrowserSupport = async () => {
    setIsLoading(true);
    try {
      const supported = 'Notification' in window;
      setTestResults(prev => ({ ...prev, browserSupport: supported }));
      
      if (supported) {
        toast.success('Browser supports notifications!');
      } else {
        toast.error('Browser does not support notifications');
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, browserSupport: false }));
      toast.error('Error testing browser support');
    } finally {
      setIsLoading(false);
    }
  };

  // Test notification permission
  const testPermission = async () => {
    setIsLoading(true);
    try {
      const notificationManager = NotificationManager.getInstance();
      const permission = await notificationManager.requestPermission();
      const granted = permission === 'granted';
      
      setTestResults(prev => ({ ...prev, permission: granted }));
      
      if (granted) {
        toast.success('Notification permission granted!');
      } else {
        toast.warning(`Notification permission: ${permission}`);
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, permission: false }));
      toast.error('Error testing notification permission');
    } finally {
      setIsLoading(false);
    }
  };

  // Test service worker notification
  const testServiceWorkerNotification = async () => {
    setIsLoading(true);
    try {
      const success = await notificationErrorHandler.safeNotificationSend(
        notificationTitle,
        notificationMessage,
        { tag: 'sw-test' }
      );
      
      setTestResults(prev => ({ ...prev, serviceWorker: success }));
      
      if (success) {
        toast.success('Service worker notification sent!');
      } else {
        toast.error('Service worker notification failed');
      }
    } catch (error) {
      setTestResults(prev => ({ ...prev, serviceWorker: false }));
      toast.error('Service worker notification error');
    } finally {
      setIsLoading(false);
    }
  };

  // Test database notification
  const testDatabaseNotification = async () => {
    if (!user) {
      toast.error('Must be logged in to test database notifications');
      return;
    }

    setIsLoading(true);
    try {
      await createNotification({
        user_id: user.id,
        title: notificationTitle,
        message: notificationMessage,
        related_to: 'test',
        related_id: 'notification-test'
      });
      
      setTestResults(prev => ({ ...prev, database: true }));
      toast.success('Database notification created!');
    } catch (error) {
      setTestResults(prev => ({ ...prev, database: false }));
      toast.error('Database notification failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Test push notification
  const testPushNotification = async () => {
    setIsLoading(true);
    try {
      await triggerPushNotification(notificationTitle, notificationMessage, { test: true });
      setTestResults(prev => ({ ...prev, push: true }));
      toast.success('Push notification sent!');
    } catch (error) {
      setTestResults(prev => ({ ...prev, push: false }));
      toast.error('Push notification failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Test error handling
  const testErrorHandling = async () => {
    setIsLoading(true);
    try {
      // Test various error scenarios
      notificationErrorHandler.handlePermissionError(new Error('Test permission error'), 'Test context');
      notificationErrorHandler.handleServiceWorkerError(new Error('Test SW error'), 'Test context');
      notificationErrorHandler.handleApiError(new Error('Test API error'), 'Test context');
      notificationErrorHandler.handleBrowserSupportError(new Error('Test support error'), 'Test context');
      
      setTestResults(prev => ({ ...prev, errorHandling: true }));
      toast.success('Error handling test completed! Check console for details.');
    } catch (error) {
      setTestResults(prev => ({ ...prev, errorHandling: false }));
      toast.error('Error handling test failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Run all tests
  const runAllTests = async () => {
    await testBrowserSupport();
    await new Promise(resolve => setTimeout(resolve, 500));
    await testPermission();
    await new Promise(resolve => setTimeout(resolve, 500));
    await testServiceWorkerNotification();
    await new Promise(resolve => setTimeout(resolve, 500));
    await testDatabaseNotification();
    await new Promise(resolve => setTimeout(resolve, 500));
    await testPushNotification();
    await new Promise(resolve => setTimeout(resolve, 500));
    await testErrorHandling();
  };

  const getResultIcon = (result: boolean | undefined) => {
    if (result === undefined) return <Info className="h-4 w-4 text-gray-400" />;
    return result ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  const getResultBadge = (result: boolean | undefined) => {
    if (result === undefined) return <Badge variant="secondary">Not tested</Badge>;
    return result ? <Badge variant="default" className="bg-green-500">Passed</Badge> : <Badge variant="destructive">Failed</Badge>;
  };

  const errorStats = notificationErrorHandler.getErrorStats();

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <TestTube className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Notification Test Suite</h1>
            <p className="text-muted-foreground">Test and verify all notification functionality</p>
          </div>
        </div>

        {/* Test Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
            <CardDescription>Configure the test notification content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Notification Title</label>
              <Input 
                value={notificationTitle}
                onChange={(e) => setNotificationTitle(e.target.value)}
                placeholder="Enter notification title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Notification Message</label>
              <Textarea 
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                placeholder="Enter notification message"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Test Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Controls</CardTitle>
            <CardDescription>Run individual tests or all tests at once</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
              <Button onClick={testBrowserSupport} disabled={isLoading} size="sm">
                Browser Support
              </Button>
              <Button onClick={testPermission} disabled={isLoading} size="sm">
                Permission
              </Button>
              <Button onClick={testServiceWorkerNotification} disabled={isLoading} size="sm">
                Service Worker
              </Button>
              <Button onClick={testDatabaseNotification} disabled={isLoading} size="sm">
                Database
              </Button>
              <Button onClick={testPushNotification} disabled={isLoading} size="sm">
                Push Notification
              </Button>
              <Button onClick={testErrorHandling} disabled={isLoading} size="sm">
                Error Handling
              </Button>
            </div>
            <Button onClick={runAllTests} disabled={isLoading} className="w-full" variant="default">
              <Bell className="h-4 w-4 mr-2" />
              Run All Tests
            </Button>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>Results of notification functionality tests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { key: 'browserSupport', label: 'Browser Support' },
                { key: 'permission', label: 'Notification Permission' },
                { key: 'serviceWorker', label: 'Service Worker Notification' },
                { key: 'database', label: 'Database Notification' },
                { key: 'push', label: 'Push Notification' },
                { key: 'errorHandling', label: 'Error Handling' }
              ].map(test => (
                <div key={test.key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getResultIcon(testResults[test.key])}
                    <span className="font-medium">{test.label}</span>
                  </div>
                  {getResultBadge(testResults[test.key])}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Error Statistics */}
        {Object.keys(errorStats).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Error Statistics</CardTitle>
              <CardDescription>Recent notification errors logged by the error handler</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {Object.entries(errorStats).map(([type, count]) => (
                  <div key={type} className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-red-500">{count}</div>
                    <div className="text-sm text-muted-foreground capitalize">{type.replace('_', ' ')}</div>
                  </div>
                ))}
              </div>
              <Button 
                onClick={() => {
                  notificationErrorHandler.clearErrorLog();
                  toast.success('Error log cleared');
                }}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                Clear Error Log
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Current Permission Status */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              Current notification permission: <strong>
                {'Notification' in window ? Notification.permission : 'Not supported'}
              </strong>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationTestPage; 