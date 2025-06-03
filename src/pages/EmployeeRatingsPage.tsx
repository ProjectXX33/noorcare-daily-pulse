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
import { Loader2, Star, Clock, User, MessageSquare, Calendar, TrendingUp } from 'lucide-react';

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
      receivedOn: "Received on"
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
      receivedOn: "تم الاستلام في"
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
    if (rating >= 4) return 'text-green-600 bg-green-50 border-green-200';
    if (rating >= 3) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  if (!user) return null;

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">{t.myRatings}</h1>
        <p className="text-muted-foreground">{t.viewYourRatingHistory}</p>
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
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Star className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t.noRatings}</h3>
            <p className="text-gray-500 text-center max-w-md">
              {t.noRatingsDescription}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Performance Overview */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t.averageRating}</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">
                    {averageRating ? averageRating.toFixed(1) : '0.0'}
                  </div>
                  {averageRating && (
                    <StarRating rating={averageRating} readonly size="sm" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {averageRating ? getRatingDescription(averageRating) : t.noRatings}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t.totalRatings}</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ratings.length}</div>
                <p className="text-xs text-muted-foreground">
                  {t.basedOnRatings}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t.latestRating}</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">
                    {ratings[0]?.rating || '—'}
                  </div>
                  {ratings[0] && (
                    <StarRating rating={ratings[0].rating} readonly size="sm" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {ratings[0] ? ratings[0].ratedAt.toLocaleDateString() : t.noRatings}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Rating History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t.ratingHistory}
              </CardTitle>
              <CardDescription>
                {t.performanceOverview}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ratings.map((rating, index) => (
                  <div 
                    key={rating.id} 
                    className={`border rounded-lg p-4 ${getRatingColor(rating.rating)}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <StarRating rating={rating.rating} readonly size="sm" />
                          <span className="font-semibold text-lg">
                            {rating.rating}/5
                          </span>
                        </div>
                        <Badge variant="outline" className="bg-white/50">
                          {getRatingDescription(rating.rating)}
                        </Badge>
                      </div>
                      <div className="text-right text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
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
                          <MessageSquare className="h-4 w-4 mt-1 text-gray-500" />
                          <div>
                            <span className="font-medium text-sm">{t.comment}:</span>
                            <p className="text-sm mt-1 text-gray-700">
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
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default EmployeeRatingsPage; 