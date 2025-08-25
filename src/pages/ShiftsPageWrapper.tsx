import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import ShiftsPage from './ShiftsPageClean';

const ShiftsPageWrapper = () => {
  const { user } = useAuth();
  
  // Check access before any other hooks are called
  const hasAccess = ['Junior CRM Specialist', 'Designer', 'Content Creator', 'Media Buyer', 'Web Developer'].includes(user?.position) || user?.role === 'admin';
  
  // Early return if no access - prevents hooks violations
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-4 sm:p-6 text-center">
            <Clock className="h-10 w-10 sm:h-12 sm:w-12 text-yellow-500 mx-auto mb-3 sm:mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">Access Restricted</h2>
            <p className="text-sm sm:text-base text-gray-500">
              Shift management is available for Customer Service, Designer employees, and administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Render the actual ShiftsPage component only if access is granted
  return <ShiftsPage />;
};

export default ShiftsPageWrapper; 