import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckIn } from '@/contexts/CheckInContext';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import { BarChart3, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';

const AdminAnalyticsPage = () => {
  const { user } = useAuth();
  const { checkIns, workReports } = useCheckIn();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      const transformedUsers: User[] = data.map(user => ({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        position: user.position,
        lastCheckin: user.last_checkin ? new Date(user.last_checkin) : undefined,
        preferences: user.preferences
      }));

      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

    if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/98">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    Advanced Analytics
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Comprehensive insights and data visualization
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Real-time data</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <AnalyticsDashboard 
          checkIns={checkIns as any}
          workReports={workReports as any}
          users={users}
        />
      </div>
    </div>
  );
};

export default AdminAnalyticsPage; 