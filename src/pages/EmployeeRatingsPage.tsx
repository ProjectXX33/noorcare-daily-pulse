import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from "@/components/ui/badge";
import { EmployeeRating } from '@/types';
import { 
  getEmployeeAverageRating, 
  getLatestEmployeeRating, 
  getEmployeeRatings
} from '@/lib/ratingsApi';
import StarRating from '@/components/StarRating';
import { Loader2, Star, Clock, User, MessageSquare, Calendar, TrendingUp, Filter, Award, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const EmployeeRatingsPage = () => {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<EmployeeRating[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [showAllRatings, setShowAllRatings] = useState(false);

  // Translation object for multilingual support
  const translations = {
    en: {
      myRatings: "My Performance Ratings",
      performanceOverview: "Performance Overview",
      viewYourRatingHistory: "View your rating history and performance feedback",
      averageRating: "Average Rating",
      totalRatings: "Total Ratings",
      latestRating: "Latest Rating",
      ratingHistory: "Rating History",
      ratedBy: "Rated by",
      comment: "Comment",
      noRatings: "No ratings yet",
      noRatingsDescription: "You haven't received any performance ratings yet. Your manager will rate your performance periodically.",
      loadingRatings: "Loading your ratings...",
      excellent: "Excellent Performance",
      good: "Good Performance", 
      average: "Average Performance",
      needsImprovement: "Needs Improvement",
      poor: "Poor Performance",
      noComment: "No comment provided",
      basedOnRatings: "ratings",
      receivedOn: "Received on",
      performanceStats: "Performance Stats",
      ratingBreakdown: "Rating Breakdown",
      viewDetails: "View Details",
      hideDetails: "Hide Details"
    },
    ar: {
      myRatings: "تقييماتي الأدائية",
      performanceOverview: "نظرة عامة على الأداء",
      viewYourRatingHistory: "عرض تاريخ التقييمات وتعليقات الأداء",
      averageRating: "متوسط التقييم",
      totalRatings: "إجمالي التقييمات",
      latestRating: "آخر تقييم",
      ratingHistory: "تاريخ التقييمات",
      ratedBy: "تم التقييم بواسطة",
      comment: "التعليق",
      noRatings: "لا توجد تقييمات بعد",
      noRatingsDescription: "لم تتلق أي تقييمات أداء بعد. سيقوم مديرك بتقييم أدائك بشكل دوري.",
      loadingRatings: "جاري تحميل التقييمات...",
      excellent: "أداء ممتاز",
      good: "أداء جيد",
      average: "أداء متوسط",
      needsImprovement: "يحتاج تحسين",
      poor: "أداء ضعيف",
      noComment: "لا يوجد تعليق",
      basedOnRatings: "تقييم",
      receivedOn: "تم الاستلام في",
      performanceStats: "إحصائيات الأداء",
      ratingBreakdown: "تفصيل التقييمات",
      viewDetails: "عرض التفاصيل",
      hideDetails: "إخفاء التفاصيل"
    }
  };

  useEffect(() => {
    const storedLang = localStorage.getItem('preferredLanguage');
    if (storedLang && (storedLang === 'en' || storedLang === 'ar')) {
      setLanguage(storedLang);
    }
  }, []);

  const t = translations[language as keyof typeof translations];

  useEffect(() => {
    if (user) {
      loadRatingData();
    }
  }, [user]);

  const loadRatingData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const [ratingsData, average] = await Promise.all([
        getEmployeeRatings(user.id),
        getEmployeeAverageRating(user.id)
      ]);
      
      setRatings(ratingsData);
      setAverageRating(average > 0 ? average : null);
    } catch (error) {
      console.error('Error loading rating data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRatingDescription = (rating: number) => {
    if (rating >= 5) return t.excellent;
    if (rating >= 4) return t.good;
    if (rating >= 3) return t.average;
    if (rating >= 2) return t.needsImprovement;
    return t.poor;
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
    if (rating >= 3) return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
    return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
  };

  const getRatingStats = () => {
    if (ratings.length === 0) return { distribution: [], monthlyTrend: [] };
    
    const distribution = [5, 4, 3, 2, 1].map(rating => {
      const count = ratings.filter(r => Math.floor(r.rating) === rating).length;
      return { rating, count, percentage: (count / ratings.length) * 100 };
    });

    return { distribution };
  };

  const { distribution } = getRatingStats();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 w-full max-w-full overflow-x-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Enhanced mobile-optimized header with modern design */}
      <div className="border-b border-border/50 bg-background/98 w-full">
        <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6 w-full max-w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Star className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
            <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent leading-tight">{t.myRatings}</h1>
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl">{t.viewYourRatingHistory}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 space-y-6 sm:space-y-8 md:space-y-10 w-full max-w-full overflow-x-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-gray-600">{t.loadingRatings}</p>
            </div>
          </div>
        ) : ratings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
              <Star className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">{t.noRatings}</h3>
              <p className="text-sm sm:text-base text-gray-500 text-center max-w-md">
                {t.noRatingsDescription}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile-responsive performance overview - Enhanced 2x2 grid on mobile */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4">
              <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/30 dark:to-purple-800/30 dark:border-purple-800/30 dark:bg-purple-900/30">
                <CardContent className="p-3 sm:p-4">
                  <div className="text-center space-y-1">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-purple-100 dark:bg-purple-800/50 flex items-center justify-center mx-auto">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-200" />
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground dark:text-purple-100 truncate">{t.averageRating}</p>
                    <div className="flex flex-col items-center gap-1">
                      <div className="text-lg sm:text-2xl font-bold text-purple-600 dark:text-purple-200">
                        {averageRating ? averageRating.toFixed(1) : '0.0'}
                      </div>
                      {averageRating && (
                        <div className="flex justify-center">
                          <StarRating rating={averageRating} readonly size="sm" spacing="tight" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground dark:text-purple-200/70 truncate">
                      {averageRating ? getRatingDescription(averageRating) : t.noRatings}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/30 dark:to-amber-800/30 dark:border-amber-800/30 dark:bg-amber-900/30">
                <CardContent className="p-3 sm:p-4">
                  <div className="text-center space-y-1">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-amber-100 dark:bg-amber-800/50 flex items-center justify-center mx-auto">
                      <Star className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-200" />
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground dark:text-amber-100 truncate">{t.totalRatings}</p>
                    <div className="text-lg sm:text-2xl font-bold text-amber-600 dark:text-amber-200">{ratings.length}</div>
                    <p className="text-xs text-muted-foreground dark:text-amber-200/70 truncate">
                      {t.basedOnRatings}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-2 sm:col-span-1 border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/30 dark:to-blue-800/30 dark:border-blue-800/30 dark:bg-blue-900/30">
                <CardContent className="p-3 sm:p-4">
                  <div className="text-center space-y-1">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center mx-auto">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-200" />
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground dark:text-blue-100 truncate">{t.latestRating}</p>
                    <div className="flex flex-col items-center gap-1">
                      <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-200">
                        {ratings[0]?.rating || '—'}
                      </div>
                      {ratings[0] && (
                        <div className="flex justify-center">
                          <StarRating rating={ratings[0].rating} readonly size="sm" spacing="tight" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground dark:text-blue-200/70 truncate">
                      {ratings[0] ? ratings[0].ratedAt.toLocaleDateString() : t.noRatings}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-2 sm:col-span-1 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white dark:bg-[#145c4c] dark:border-emerald-700">
                <CardContent className="p-3 sm:p-4">
                  <div className="text-center space-y-1">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto">
                      <Award className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-100" />
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground dark:text-gray-400 truncate">Best Rating</p>
                    <div className="text-lg sm:text-2xl font-bold text-emerald-600">
                      {Math.max(...ratings.map(r => r.rating)).toFixed(1)}
                    </div>
                    <p className="text-xs text-muted-foreground dark:text-gray-400 truncate">
                      {getRatingDescription(Math.max(...ratings.map(r => r.rating)))}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Mobile performance stats sheet */}
            <div className="block sm:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full min-h-[44px]">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    {t.performanceStats}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-auto max-h-[70vh]">
                  <SheetHeader>
                    <SheetTitle>{t.ratingBreakdown}</SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto mt-4">
                    <div className="space-y-4 pb-6">
                      {distribution.map(({ rating, count, percentage }) => (
                        <div key={rating} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <StarRating rating={rating} readonly size="sm" spacing="tight" />
                              <span className="text-sm font-medium">{rating}.0</span>
                            </div>
                            <span className="text-sm text-muted-foreground dark:text-gray-400">{count} ({percentage.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop performance stats */}
            <Card className="hidden sm:block">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t.ratingBreakdown}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  {distribution.map(({ rating, count, percentage }) => (
                    <div key={rating} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <StarRating rating={rating} readonly size="sm" spacing="tight" />
                          <span className="text-sm font-medium">{rating}.0</span>
                        </div>
                        <span className="text-sm text-muted-foreground dark:text-gray-400">{count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-muted-foreground dark:text-gray-400">{percentage.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Mobile-optimized rating history */}
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                      {t.ratingHistory}
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      {t.performanceOverview}
                    </CardDescription>
                  </div>
                  {/* Mobile "View All" toggle */}
                  <div className="block sm:hidden">
                    {ratings.length > 3 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllRatings(!showAllRatings)}
                        className="text-xs"
                      >
                        {showAllRatings ? (
                          <>
                            <ChevronUp className="h-3 w-3 mr-1" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            View All ({ratings.length})
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Mobile cards view - Fixed mobile viewing issue */}
                <div className="block sm:hidden">
                  <div className="max-h-none overflow-y-auto">
                    <div className="space-y-3 p-4">
                      {(showAllRatings ? ratings : ratings.slice(0, 3)).map((rating, index) => (
                        <Card key={rating.id} className={`border-l-4 hover:shadow-md transition-shadow ${rating.rating >= 4 ? 'border-l-emerald-500 bg-gradient-to-r from-emerald-50 to-white' : rating.rating >= 3 ? 'border-l-amber-500 bg-gradient-to-r from-amber-50 to-white' : 'border-l-red-500 bg-gradient-to-r from-red-50 to-white'}`}>
                          <CardContent className="p-4 space-y-3 min-h-[120px]">
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <StarRating rating={rating.rating} readonly size="sm" spacing="tight" />
                                  <span className="font-bold text-base">
                                    {rating.rating}/5
                                  </span>
                                </div>
                                <Badge variant="outline" className={`text-xs font-medium ${getRatingColor(rating.rating)}`}>
                                  {getRatingDescription(rating.rating)}
                                </Badge>
                              </div>
                              <div className="text-right text-xs text-muted-foreground dark:text-gray-400 flex-shrink-0">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span className="whitespace-nowrap">
                                  {rating.ratedAt.toLocaleDateString(
                                    language === 'ar' ? 'ar-SA' : 'en-US',
                                    { 
                                      year: 'numeric', 
                                      month: 'short', 
                                      day: 'numeric' 
                                    }
                                  )}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs">
                              <User className="h-3 w-3" />
                              <span className="font-medium">{t.ratedBy}:</span>
                              <span>{rating.ratedByName}</span>
                            </div>
                            
                            {rating.comment && (
                              <div className="bg-muted/50 rounded-md p-3">
                                <div className="flex items-start gap-2">
                                  <MessageSquare className="h-3 w-3 mt-1 text-muted-foreground dark:text-gray-400 flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-xs text-muted-foreground font-medium mb-1">{t.comment}:</p>
                                    <p className="text-xs break-words">
                                      "{rating.comment}"
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      
                      {/* Bottom "View All" button for better mobile UX */}
                      {!showAllRatings && ratings.length > 3 && (
                        <div className="pt-4">
                          <Button
                            variant="outline"
                            onClick={() => setShowAllRatings(true)}
                            className="w-full min-h-[44px] text-sm border-purple-200 hover:bg-purple-50 transition-colors"
                          >
                            <ChevronDown className="h-4 w-4 mr-2 text-purple-600" />
                            <span className="text-purple-700 font-medium">View All {ratings.length} Ratings</span>
                          </Button>
                        </div>
                      )}
                      
                      {/* Collapse button */}
                      {showAllRatings && ratings.length > 3 && (
                        <div className="pt-4">
                          <Button
                            variant="outline"
                            onClick={() => setShowAllRatings(false)}
                            className="w-full min-h-[44px] text-sm border-gray-200 hover:bg-gray-50 transition-colors"
                          >
                            <ChevronUp className="h-4 w-4 mr-2 text-gray-600" />
                            <span className="text-gray-700 font-medium">Show Less</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Desktop view */}
                <div className="hidden sm:block p-4">
                  <div className="space-y-4">
                    {ratings.map((rating, index) => (
                      <div 
                        key={rating.id} 
                        className={`border rounded-lg p-4 ${getRatingColor(rating.rating)}`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-3">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-center gap-2">
                              <StarRating rating={rating.rating} readonly size="sm" spacing="tight" />
                              <span className="font-semibold text-lg">
                                {rating.rating}/5
                              </span>
                            </div>
                            <Badge variant="outline" className="bg-white/50 w-fit">
                              {getRatingDescription(rating.rating)}
                            </Badge>
                          </div>
                          <div className="text-left lg:text-right text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {rating.ratedAt.toLocaleDateString(
                                language === 'ar' ? 'ar-SA' : 'en-US',
                                { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                }
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-3 text-sm">
                          <User className="h-4 w-4" />
                          <span className="font-medium">{t.ratedBy}:</span>
                          <span>{rating.ratedByName}</span>
                        </div>
                        
                        {rating.comment ? (
                          <div className="bg-white/70 rounded-md p-3 border">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="h-4 w-4 mt-1 text-gray-500 flex-shrink-0" />
                              <div className="flex-1">
                                <span className="font-medium text-sm">{t.comment}:</span>
                                <p className="text-sm mt-1 text-gray-700 break-words">
                                  "{rating.comment}"
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 italic">
                            {t.noComment}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default EmployeeRatingsPage; 