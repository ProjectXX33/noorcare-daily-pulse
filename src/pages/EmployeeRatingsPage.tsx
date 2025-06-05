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
import { Loader2, Star, Clock, User, MessageSquare, Calendar, TrendingUp, Filter, Award, BarChart3 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const EmployeeRatingsPage = () => {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<EmployeeRating[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('en');

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
    <div className="space-y-4 md:space-y-6 pb-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Mobile-optimized sticky header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-2 pb-4 border-b shadow-sm">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">{t.myRatings}</h1>
          <p className="text-sm md:text-base text-muted-foreground">{t.viewYourRatingHistory}</p>
        </div>
      </div>

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
          {/* Mobile-responsive performance overview - 2x2 grid on mobile */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4">
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="text-center space-y-1">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 mx-auto" />
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t.averageRating}</p>
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-lg sm:text-2xl font-bold">
                      {averageRating ? averageRating.toFixed(1) : '0.0'}
                    </div>
                    {averageRating && (
                      <div className="flex justify-center">
                        <StarRating rating={averageRating} readonly size="sm" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {averageRating ? getRatingDescription(averageRating) : t.noRatings}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="text-center space-y-1">
                  <Star className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 mx-auto" />
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t.totalRatings}</p>
                  <div className="text-lg sm:text-2xl font-bold">{ratings.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {t.basedOnRatings}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-2 sm:col-span-1">
              <CardContent className="p-3 sm:p-4">
                <div className="text-center space-y-1">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 mx-auto" />
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t.latestRating}</p>
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-lg sm:text-2xl font-bold">
                      {ratings[0]?.rating || '—'}
                    </div>
                    {ratings[0] && (
                      <div className="flex justify-center">
                        <StarRating rating={ratings[0].rating} readonly size="sm" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {ratings[0] ? ratings[0].ratedAt.toLocaleDateString() : t.noRatings}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-2 sm:col-span-1">
              <CardContent className="p-3 sm:p-4">
                <div className="text-center space-y-1">
                  <Award className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500 mx-auto" />
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Best Rating</p>
                  <div className="text-lg sm:text-2xl font-bold">
                    {Math.max(...ratings.map(r => r.rating)).toFixed(1)}
                  </div>
                  <p className="text-xs text-muted-foreground">
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
              <SheetContent side="bottom" className="h-[70vh]">
                <SheetHeader>
                  <SheetTitle>{t.ratingBreakdown}</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-full mt-4">
                  <div className="space-y-4 pb-6">
                    {distribution.map(({ rating, count, percentage }) => (
                      <div key={rating} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <StarRating rating={rating} readonly size="sm" />
                            <span className="text-sm font-medium">{rating}.0</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{count} ({percentage.toFixed(0)}%)</span>
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
                </ScrollArea>
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
                        <StarRating rating={rating} readonly size="sm" />
                        <span className="text-sm font-medium">{rating}.0</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-muted-foreground">{percentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Mobile-optimized rating history */}
          <Card>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                {t.ratingHistory}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {t.performanceOverview}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {/* Mobile cards view */}
              <div className="block sm:hidden">
                <ScrollArea className="h-[60vh]">
                  <div className="space-y-3 p-4">
                    {ratings.map((rating, index) => (
                      <Card key={rating.id} className={`border-l-4 ${rating.rating >= 4 ? 'border-l-green-500' : rating.rating >= 3 ? 'border-l-yellow-500' : 'border-l-red-500'}`}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <StarRating rating={rating.rating} readonly size="sm" />
                                <span className="font-semibold text-sm">
                                  {rating.rating}/5
                                </span>
                              </div>
                              <Badge variant="outline" className="bg-white/50 text-xs">
                                {getRatingDescription(rating.rating)}
                              </Badge>
                            </div>
                            <div className="text-right text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {rating.ratedAt.toLocaleDateString(
                                  language === 'ar' ? 'ar-SA' : 'en-US',
                                  { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  }
                                )}
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
                                <MessageSquare className="h-3 w-3 mt-1 text-muted-foreground flex-shrink-0" />
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
                  </div>
                </ScrollArea>
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
                            <StarRating rating={rating.rating} readonly size="sm" />
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
  );
};

export default EmployeeRatingsPage; 