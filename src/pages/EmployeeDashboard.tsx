import React, { useState, useEffect } from 'react';
import DashboardCard from '@/components/DashboardCard';
import CheckInHistory from '@/components/CheckInHistory';
import ReportHistory from '@/components/ReportHistory';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckIn } from '@/contexts/CheckInContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';
import { CheckIn, WorkReport, EmployeeRating } from '@/types';
import { getLatestEmployeeRating, getEmployeeAverageRating } from '@/lib/ratingsApi';
import StarRating from '@/components/StarRating';
import { Loader2, Clock, CalendarDays, ClipboardList, CheckSquare, AlertCircle, Star, User, Crown, Trophy, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const { 
    getUserCheckIns, 
    getUserWorkReports, 
    hasCheckedInToday,
    isLoading
  } = useCheckIn();
  const navigate = useNavigate();
  const [language, setLanguage] = useState('en');
  const [latestRating, setLatestRating] = useState<EmployeeRating | null>(null);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [isLoadingRating, setIsLoadingRating] = useState(false);
  const [isTopPerformer, setIsTopPerformer] = useState(false);
  const [performanceRank, setPerformanceRank] = useState<number | null>(null);
  const [performanceScore, setPerformanceScore] = useState<number | null>(null);

  // Translation object for multilingual support
  const translations = {
    en: {
      welcome: "Welcome",
      yourOverview: "Your Overview",
      checkInToday: "You haven't checked in today",
      checkInDesc: "Please check in to record your attendance for today.",
      checkInNow: "Check In Now",
      loading: "Loading your dashboard...",
      recentCheckins: "Your Recent Check-ins",
      recentReports: "Your Recent Reports",
      tasks: "Tasks",
      viewTasks: "View Tasks",
      todayCheckIns: "Today's Check-in",
      todayReports: "Today's Report",
      totalReports: "Total Reports",
      latestRating: "Latest Rating",
      averageRating: "Average Rating",
      noRating: "No rating yet",
      ratedBy: "Rated by",
      viewMyRatings: "View My Ratings"
    },
    ar: {
      welcome: "مرحبا",
      yourOverview: "نظرة عامة",
      checkInToday: "لم تقم بتسجيل الدخول اليوم",
      checkInDesc: "الرجاء تسجيل الدخول لتسجيل حضورك لهذا اليوم.",
      checkInNow: "سجل الدخول الآن",
      loading: "جاري تحميل لوحة التحكم الخاصة بك...",
      recentCheckins: "تسجيلات الدخول الأخيرة",
      recentReports: "التقارير الأخيرة",
      tasks: "المهام",
      viewTasks: "عرض المهام",
      todayCheckIns: "تسجيل الدخول اليوم",
      todayReports: "تقرير اليوم",
      totalReports: "مجموع التقارير",
      latestRating: "آخر تقييم",
      averageRating: "متوسط التقييم",
      noRating: "لا يوجد تقييم بعد",
      ratedBy: "تم التقييم بواسطة",
      viewMyRatings: "عرض تقييماتي"
    }
  };

  useEffect(() => {
    const storedLang = localStorage.getItem('preferredLanguage');
    if (storedLang && (storedLang === 'en' || storedLang === 'ar')) {
      setLanguage(storedLang);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadRatingData();
      checkTopPerformerStatus();
    }
  }, [user]);

  const loadRatingData = async () => {
    if (!user) return;
    
    setIsLoadingRating(true);
    try {
      const [latest, average] = await Promise.all([
        getLatestEmployeeRating(user.id),
        getEmployeeAverageRating(user.id)
      ]);
      
      setLatestRating(latest);
      setAverageRating(average > 0 ? average : null);
    } catch (error) {
      console.error('Error loading rating data:', error);
    } finally {
      setIsLoadingRating(false);
    }
  };

  const checkTopPerformerStatus = async () => {
    if (!user) return;
    
    try {
      // Get current month's performance data
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      
      const { data: performanceData, error } = await supabase
        .from('admin_performance_dashboard')
        .select('employee_id, average_performance_score')
        .eq('month_year', currentMonth)
        .order('average_performance_score', { ascending: false });

      if (error) {
        console.error('Error fetching performance data:', error);
        return;
      }

      if (performanceData && performanceData.length > 0) {
        // Find current user's ranking
        const userPerformance = performanceData.find(p => p.employee_id === user.id);
        if (userPerformance) {
          const rank = performanceData.findIndex(p => p.employee_id === user.id) + 1;
          setPerformanceRank(rank);
          setPerformanceScore(userPerformance.average_performance_score);
          setIsTopPerformer(rank === 1);
        }
      }
    } catch (error) {
      console.error('Error checking top performer status:', error);
    }
  };

  const t = translations[language as keyof typeof translations];

  if (!user) return null;

  // Redirect Copy Writing users to their dedicated dashboard
  if (user.position === 'Copy Writing') {
    navigate('/copy-writing-dashboard', { replace: true });
    return null;
  }

  const userCheckIns = getUserCheckIns(user.id) as unknown as CheckIn[];
  const userReports = getUserWorkReports(user.id) as unknown as WorkReport[];
  const checkedInToday = hasCheckedInToday(user.id);
  
  // Check if user has check-in access (Customer Service and Designer)
  const hasCheckInAccess = user.position === 'Customer Service' || user.position === 'Designer';
  
  // Get today's reports
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayReports = userReports.filter(report => {
    const reportDate = new Date(report.date);
    reportDate.setHours(0, 0, 0, 0);
    return reportDate.getTime() === today.getTime();
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-gray-600">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 w-full max-w-full overflow-x-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>


      <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 space-y-6 sm:space-y-8 md:space-y-10 w-full max-w-full overflow-x-hidden">
        {/* Mobile-responsive dashboard cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {/* Only show check-in card for Customer Service and Designer */}
          {hasCheckInAccess && (
            <DashboardCard 
              title={t.todayCheckIns}
              value={checkedInToday ? "Completed" : "Not checked in"}
              description={checkedInToday ? "You've checked in today" : "You haven't checked in yet"}
              icon={<Clock className="h-4 w-4" />}
              variant={checkedInToday ? "success" : "warning"}
            />
          )}
          
          <DashboardCard 
            title={t.todayReports}
            value={todayReports.length > 0 ? "Submitted" : "Not submitted"}
            description={todayReports.length > 0 ? "You've submitted today's report" : "You haven't submitted today's report"}
            icon={<ClipboardList className="h-4 w-4" />}
            variant={todayReports.length > 0 ? "success" : "warning"}
          />
          
          <DashboardCard 
            title={t.totalReports}
            value={userReports.length.toString()}
            description="Your total submitted reports"
            icon={<CalendarDays className="h-4 w-4" />}
            variant="default"
          />

          {/* Rating Card */}
          <Card className="p-3 sm:p-4">
            <CardHeader className="p-0 mb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                {t.latestRating}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingRating ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : latestRating ? (
                                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <StarRating 
                        rating={latestRating.rating} 
                        readonly 
                        size="sm" 
                        spacing="tight"
                      />
                      <span className="text-lg font-bold">{latestRating.rating}/5</span>
                    </div>
                  <p className="text-xs text-muted-foreground">
                    {t.ratedBy}: {latestRating.ratedByName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {latestRating.ratedAt.toLocaleDateString()}
                  </p>
                  {averageRating && (
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      {t.averageRating}: {averageRating.toFixed(1)}/5
                    </p>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate('/my-ratings')}
                    className="w-full h-8 text-xs"
                  >
                    {t.viewMyRatings}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-2">
                  <div className="text-2xl mb-2">⭐</div>
                  <p className="text-xs text-muted-foreground mb-2">{t.noRating}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate('/my-ratings')}
                    className="w-full h-8 text-xs"
                  >
                    {t.viewMyRatings}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mobile-optimized check-in reminder - only for Customer Service and Designer */}
        {hasCheckInAccess && !checkedInToday && (
          <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-md dark:bg-amber-900/20 dark:border-amber-900/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex-1">
                <h3 className="font-medium text-amber-800 dark:text-amber-200 text-sm sm:text-base">{t.checkInToday}</h3>
                <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 mt-1">{t.checkInDesc}</p>
              </div>
              <Button 
                onClick={() => navigate('/check-in')} 
                className="bg-primary hover:bg-primary/90 w-full sm:w-auto min-h-[44px]"
                size="sm"
              >
                {t.checkInNow}
              </Button>
            </div>
          </div>
        )}

        {/* Mobile-optimized daily reminder */}
        {hasCheckInAccess && (
          <div className="p-3 sm:p-4 bg-red-50 border-2 border-red-200 rounded-lg dark:bg-red-950/20 dark:border-red-900/50">
            <div className="flex items-start gap-2 sm:gap-3">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-800 dark:text-red-300 mb-1 text-sm sm:text-base">⚠️ Daily Reminder</h3>
                <p className="text-xs sm:text-sm text-red-700 dark:text-red-400 font-medium">
                  If you do not check in, check out, or submit your daily report, 
                  that day will <strong>NOT</strong> be collected or counted in your records.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mobile-responsive history grid */}
        <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Only show check-in history for Customer Service and Designer */}
          {hasCheckInAccess && (
            <div className="bg-card rounded-lg p-3 sm:p-4 border shadow-sm">
              <CheckInHistory 
                checkIns={userCheckIns.slice(0, 5)} 
                title={t.recentCheckins} 
              />
            </div>
          )}
          
          <div className={`bg-card rounded-lg p-3 sm:p-4 border shadow-sm ${!hasCheckInAccess ? 'lg:col-span-2' : ''}`}>
            <ReportHistory 
              reports={userReports.slice(0, 3) as any}
              title={t.recentReports} 
            />
          </div>
        </div>
            
        {/* Mobile-optimized action button */}
        <div className="flex">
          <Button 
            className="bg-primary hover:bg-primary/90 px-4 sm:px-6 min-h-[44px] w-full sm:w-auto" 
            onClick={() => navigate('/employee-tasks')}
          >
            <CheckSquare className="mr-2 h-4 w-4" />
            <span className="text-sm sm:text-base">{t.viewTasks}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
