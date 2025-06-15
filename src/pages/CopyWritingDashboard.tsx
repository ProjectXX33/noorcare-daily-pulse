import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import DashboardCard from '@/components/DashboardCard';
import {
  ClipboardList,
  CalendarDays,
  Edit3,
  Package,
  Star,
  TrendingUp,
  Users,
  Loader2,
  Briefcase,
  Target,
  FileText,
  PenTool
} from 'lucide-react';
import { useCopyWritingProducts } from '@/contexts/CopyWritingProductsContext';
import { useCheckIn } from '@/contexts/CheckInContext';
import { supabase } from '@/lib/supabase';

const CopyWritingDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { products, loading: productsLoading, startFetching } = useCopyWritingProducts();
  const { getUserWorkReports } = useCheckIn();
  const [isLoading, setIsLoading] = useState(true);

  // Real data for copy writing metrics
  const [copyWritingStats, setCopyWritingStats] = useState({
    totalReports: 0,
    todayReports: 0,
    averageRating: 0,
    totalProducts: 0
  });

  useEffect(() => {
    // Load real user data
    const loadUserData = async () => {
      try {
        // Get user's reports and ratings from the existing data sources
        const userReports = getUserWorkReports(user?.id || '') as unknown as any[];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayReports = userReports.filter(report => {
          const reportDate = new Date(report.date);
          reportDate.setHours(0, 0, 0, 0);
          return reportDate.getTime() === today.getTime();
        });

        // Load user rating
        let userRating = 0;
        if (user?.id) {
          try {
            const { data: ratingsData } = await supabase
              .from('employee_ratings')
              .select('rating')
              .eq('employee_id', user.id)
              .order('created_at', { ascending: false });

            if (ratingsData && ratingsData.length > 0) {
              const avgRating = ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length;
              userRating = Math.round(avgRating * 10) / 10;
            }
          } catch (error) {
            console.error('Error loading ratings:', error);
          }
        }

        setCopyWritingStats({
          totalReports: userReports.length,
          todayReports: todayReports.length,
          averageRating: userRating,
          totalProducts: products.length
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading user data:', error);
        setIsLoading(false);
      }
    };

    if (user) {
      loadUserData();
    }
  }, [user, products.length]);

  useEffect(() => {
    // Update total products when products are loaded
    setCopyWritingStats(prev => ({
      ...prev,
      totalProducts: products.length
    }));
  }, [products.length]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="safe-area-padding px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 space-y-6 sm:space-y-8 md:space-y-10 w-full max-w-full overflow-x-hidden">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center sm:text-left"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.name}! ✍️
        </h1>
        <p className="text-gray-600">
          Ready to create compelling copy? Let's make your words work wonders.
        </p>
      </motion.div>

      {/* Dashboard Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
      >
        <DashboardCard 
          title="Total Reports"
          value={copyWritingStats.totalReports.toString()}
          description="Total work reports submitted"
          icon={<FileText className="h-4 w-4" />}
          variant="default"
        />
        
        <DashboardCard 
          title="Today's Reports"
          value={copyWritingStats.todayReports.toString()}
          description={copyWritingStats.todayReports > 0 ? "Report submitted today" : "No report submitted today"}
          icon={<Target className="h-4 w-4" />}
          variant={copyWritingStats.todayReports > 0 ? "success" : "warning"}
        />
        
        <DashboardCard 
          title="Average Rating"
          value={copyWritingStats.averageRating.toString()}
          description="Your average project rating"
          icon={<Star className="h-4 w-4" />}
          variant="default"
        />

        <DashboardCard 
          title="Products Available"
          value={copyWritingStats.totalProducts.toString()}
          description="Products loaded for copy writing"
          icon={<Package className="h-4 w-4" />}
          variant={products.length > 0 ? "success" : "warning"}
        />
      </motion.div>

      {/* Copy Writing Tools Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Edit3 className="h-5 w-5 text-blue-500" />
          Copy Writing Tools
        </h2>
        
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Products Tool */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-blue-200 bg-blue-50/50" 
                onClick={() => navigate('/copy-writing-products')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                {productsLoading && (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Products</h3>
              <p className="text-sm text-gray-600 mb-4">
                Browse all products from your website with copy-friendly tools
              </p>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  {products.length} Products
                </Badge>
                <span className="text-xs text-blue-600 font-medium">
                  Click to explore →
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Reports Tool */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-green-200 bg-green-50/50" 
                onClick={() => navigate('/report')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Daily Reports</h3>
              <p className="text-sm text-gray-600 mb-4">
                Submit your daily copy writing work reports
              </p>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  Reports
                </Badge>
                <span className="text-xs text-green-600 font-medium">
                  Submit today →
                </span>
              </div>
            </CardContent>
          </Card>

          {/* My Ratings Tool */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-purple-200 bg-purple-50/50" 
                onClick={() => navigate('/my-ratings')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Star className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">My Ratings</h3>
              <p className="text-sm text-gray-600 mb-4">
                View your copy writing performance ratings
              </p>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  ⭐ {copyWritingStats.averageRating > 0 ? copyWritingStats.averageRating : 'No rating'}
                </Badge>
                <span className="text-xs text-purple-600 font-medium">
                  View ratings →
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Products Quick Preview */}
      {products.length === 0 && !productsLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <Package className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 mb-2">Load Products for Copy Writing</h3>
                  <p className="text-sm text-amber-700 mb-4">
                    Get started by loading all products from your website. This will give you access to product names, descriptions, and details perfect for creating compelling copy.
                  </p>
                  <Button 
                    onClick={startFetching} 
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    disabled={productsLoading}
                  >
                    {productsLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading Products...
                      </>
                    ) : (
                      <>
                        <Package className="w-4 h-4 mr-2" />
                        Load Products
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Stats for Products */}
      {products.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Product Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{products.length}</div>
                  <div className="text-sm text-gray-600">Total Products</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {products.filter(p => p.on_sale).length}
                  </div>
                  <div className="text-sm text-gray-600">On Sale</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {products.filter(p => p.featured).length}
                  </div>
                  <div className="text-sm text-gray-600">Featured</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {new Set(products.flatMap(p => p.categories.map(c => c.name))).size}
                  </div>
                  <div className="text-sm text-gray-600">Categories</div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/copy-writing-products')}
                  className="w-full sm:w-auto"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Start Writing Copy
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tips for Copy Writers */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Copy Writing Tips
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                • Focus on benefits, not just features
                <br />
                • Use emotional triggers and power words
                <br />
                • Create urgency with limited-time offers
              </div>
              <div>
                • Include social proof and testimonials
                <br />
                • Write compelling headlines and CTAs
                <br />
                • Keep your audience's pain points in mind
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default CopyWritingDashboard; 