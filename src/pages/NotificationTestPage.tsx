import React from 'react';
import NotificationTester from '@/components/NotificationTester';
import NotificationPermission from '@/components/NotificationPermission';
import DatabaseNotificationTester from '@/components/DatabaseNotificationTester';

const NotificationTestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🔔 Notification Testing
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Test push notifications for NoorHub PWA
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Permission Status</h2>
            <NotificationPermission showAsCard={true} autoShow={false} />
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Direct API Test</h2>
            <NotificationTester />
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">🔔 Real Push Notification Test</h2>
          <DatabaseNotificationTester />
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-3">How to Test:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li>First, enable notifications using the permission card above</li>
            <li>Use the quick test buttons to try different notification types</li>
            <li>Customize notifications using the form</li>
            <li>To test mobile notifications: install the PWA and minimize the browser</li>
            <li>Notifications should appear even when the app is closed</li>
            <li>Click on notifications to test navigation back to the app</li>
          </ol>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            📱 Mobile Testing Tips:
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Install the PWA on your mobile device first</li>
            <li>• Allow notifications when prompted</li>
            <li>• Close or minimize the app</li>
            <li>• Trigger notifications from another device or browser tab</li>
            <li>• Notifications should appear as native mobile notifications</li>
          </ul>
        </div>
        
        <div className="text-center py-4">
          <a 
            href="/dashboard" 
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotificationTestPage; 