import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import EditablePerformanceDashboard from '@/components/EditablePerformanceDashboard';
import { format } from 'date-fns';
import { TrendingUp } from 'lucide-react';

const AdminPerformancePage = () => {
  const { user } = useAuth();
  const [currentMonth] = useState('2025-06');

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 w-full max-w-full overflow-x-hidden">
      {/* Enhanced mobile-optimized header */}
      <div className="border-b border-border/50 bg-background/98 w-full">
        <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6 w-full max-w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
            <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight flex items-center gap-2">
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                Performance
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                Track and manage employee performance metrics, working days, delays, and overtime hours
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6 w-full max-w-full">
        <EditablePerformanceDashboard currentMonth={currentMonth} />
      </div>
    </div>
  );
};

export default AdminPerformancePage; 