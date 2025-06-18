import React, { useState, useEffect } from 'react';
// Removed unused imports - now using custom badge design
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface UserRanking {
  employee_id: string;
  employee_name: string;
  average_performance_score: number;
  position: number;
}

interface UserRankingProfileProps {
  className?: string;
}

// Global cache for user ranking data to persist across page navigation
const rankingCache = new Map<string, { data: UserRanking | null; timestamp: number; theme: 'gold' | 'silver' | 'bronze' | 'default' }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Custom hook to get user ranking data
export const useUserRanking = () => {
  const { user } = useAuth();
  const [userRanking, setUserRanking] = useState<UserRanking | null>(null);
  const [loading, setLoading] = useState(false); // Start as false, only load if cache miss

  useEffect(() => {
    const fetchUserRanking = async () => {
      if (!user) return;

      const cacheKey = `${user.id}-${format(new Date(), 'yyyy-MM')}`;
      const cached = rankingCache.get(cacheKey);
      
      // Check if we have valid cached data
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        setUserRanking(cached.data);
        setLoading(false);
        return;
      }

      // Only show loading if we don't have cached data
      if (!cached) {
        setLoading(true);
      }

      try {
        const currentMonth = format(new Date(), 'yyyy-MM');
        
        // Get all performance data for current month
        const { data: performanceData, error } = await supabase
          .from('admin_performance_dashboard')
          .select('employee_id, employee_name, average_performance_score')
          .eq('month_year', currentMonth)
          .order('average_performance_score', { ascending: false });

        if (error) {
          console.error('Error fetching performance data:', error);
          return;
        }

        if (!performanceData || performanceData.length === 0) {
          const nullResult = null;
          rankingCache.set(cacheKey, { data: nullResult, timestamp: Date.now(), theme: 'default' });
          setUserRanking(nullResult);
          return;
        }

        // Find user's position in ranking
        const userPosition = performanceData.findIndex(p => p.employee_id === user.id);
        
        let result: UserRanking | null = null;
        if (userPosition !== -1) {
          result = {
            employee_id: user.id,
            employee_name: user.name,
            average_performance_score: performanceData[userPosition].average_performance_score,
            position: userPosition + 1 // 1-based ranking
          };
        }

        // Determine theme
        let theme: 'gold' | 'silver' | 'bronze' | 'default' = 'default';
        if (result?.position === 1) theme = 'gold';
        else if (result?.position === 2) theme = 'silver';
        else if (result?.position === 3) theme = 'bronze';

        // Cache the result
        rankingCache.set(cacheKey, { data: result, timestamp: Date.now(), theme });
        setUserRanking(result);

      } catch (error) {
        console.error('Error fetching user ranking:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRanking();
  }, [user]);

  return { userRanking, loading };
};

const UserRankingProfile: React.FC<UserRankingProfileProps> = ({ className = '' }) => {
  const { userRanking, loading } = useUserRanking();

  if (loading || !userRanking) return null;

  // Only show ranking for top 10 performers
  if (userRanking.position > 10) return null;

  // Get gradient style based on ranking position
  const getRankingGradient = (position: number) => {
    switch (position) {
      case 1:
        return "bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600"; // Gold
      case 2:
        return "bg-gradient-to-br from-slate-400 via-gray-500 to-slate-600"; // Silver
      case 3:
        return "bg-gradient-to-br from-amber-700 via-orange-800 to-amber-900"; // Brown
      case 4:
        return "bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600"; // Blue-Purple
      case 5:
        return "bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600"; // Green-Teal
      case 6:
        return "bg-gradient-to-br from-pink-500 via-rose-500 to-red-600"; // Pink-Red
      case 7:
        return "bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-600"; // Purple-Indigo
      case 8:
        return "bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600"; // Cyan-Blue
      case 9:
        return "bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-600"; // Orange-Yellow
      case 10:
        return "bg-gradient-to-br from-teal-500 via-green-500 to-emerald-600"; // Teal-Green
      default:
        return "bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600"; // Neutral gray
    }
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative">
        <div 
          className={`w-8 h-8 rounded-full ${getRankingGradient(userRanking.position)} flex items-center justify-center text-white font-bold text-sm shadow-lg border-2 border-white ring-2 ring-white/20`}
        >
          {userRanking.position}
        </div>
      </div>
    </div>
  );
};

// Hook to get user's ranking theme color for styling header/navbar
export const useUserRankingTheme = () => {
  const { user } = useAuth();
  const [themeColor, setThemeColor] = useState<'gold' | 'silver' | 'bronze' | 'default'>('default');

  useEffect(() => {
    const fetchRankingTheme = async () => {
      if (!user) return;

      const cacheKey = `${user.id}-${format(new Date(), 'yyyy-MM')}`;
      const cached = rankingCache.get(cacheKey);
      
      // Check if we have valid cached theme
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        setThemeColor(cached.theme);
        return;
      }

      try {
        const currentMonth = format(new Date(), 'yyyy-MM');
        
        const { data: performanceData, error } = await supabase
          .from('admin_performance_dashboard')
          .select('employee_id, average_performance_score')
          .eq('month_year', currentMonth)
          .order('average_performance_score', { ascending: false })
          .limit(3);

        if (error || !performanceData) return;

        const userPosition = performanceData.findIndex(p => p.employee_id === user.id);
        
        let theme: 'gold' | 'silver' | 'bronze' | 'default' = 'default';
        if (userPosition === 0) {
          theme = 'gold';
        } else if (userPosition === 1) {
          theme = 'silver';
        } else if (userPosition === 2) {
          theme = 'bronze';
        }

        // Update cache with theme
        const existingCache = rankingCache.get(cacheKey);
        if (existingCache) {
          existingCache.theme = theme;
        } else {
          rankingCache.set(cacheKey, { data: null, timestamp: Date.now(), theme });
        }

        setThemeColor(theme);

      } catch (error) {
        console.error('Error fetching ranking theme:', error);
      }
    };

    fetchRankingTheme();
  }, [user]);

  return themeColor;
};

export default UserRankingProfile; 