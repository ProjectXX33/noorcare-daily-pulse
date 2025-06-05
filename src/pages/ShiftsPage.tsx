
import React from 'react';
import CustomerServiceSchedule from '@/components/CustomerServiceSchedule';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Calendar, Clock } from 'lucide-react';

const ShiftsPage = () => {
  const { user } = useAuth();

  // Show access denied for non-authorized users
  if (!user || (user.position !== 'Customer Service' && user.position !== 'Designer')) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-4 sm:p-6 text-center">
            <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-yellow-500 mx-auto mb-3 sm:mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">Access Restricted</h2>
            <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
              This page is only available for Customer Service and Designer employees.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-optimized sticky header without background */}
      <div className="sticky top-0 z-50 border-b shadow-sm">
        <div className="mobile-first-container py-3 sm:py-4">
          <div className="flex flex-col gap-1 sm:gap-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <span>My Schedule</span>
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
              View your assigned shifts and upcoming schedule
            </p>
          </div>
        </div>
      </div>

      {/* Main content with proper mobile container */}
      <div className="mobile-first-container py-4 sm:py-6 space-y-4 sm:space-y-6">
        <CustomerServiceSchedule />
      </div>
    </div>
  );
};

export default ShiftsPage;
