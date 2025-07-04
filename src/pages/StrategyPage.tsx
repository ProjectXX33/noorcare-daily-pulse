import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CampaignStrategyCreator from '@/components/CampaignStrategyCreator';
import SavedCampaigns from '@/components/SavedCampaigns';
import { toast } from 'sonner';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  BarChart3, 
  ShoppingCart, 
  Package, 
  DollarSign,
  Star,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Filter,
  Search,
  Award,
  Zap,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Crown,
  CheckCircle2,
  Download,
  CalendarIcon
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useStrategy } from '@/contexts/StrategyContext';

// SAR Icon Component
const SARIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 1124.14 1256.39" 
    width="14" 
    height="15.432" 
    style={{display:'inline-block', verticalAlign:'-0.125em'}}
  >
    <path fill="currentColor" d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
    <path fill="currentColor" d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
  </svg>
);

// Strategy Icon Component - Using strategy.svg
const StrategyIcon = ({ className, animated = false }: { className?: string, animated?: boolean }) => (
  <img 
    src="/animation/strategy.svg" 
    alt="Strategy" 
    className={`${className} ${animated ? 'animate-pulse' : ''}`}
    style={{ filter: 'brightness(0) invert(1)', color: 'currentColor' }}
  />
);

// Note: FloatingLoadingButton is now handled globally by BackgroundProcessIndicator

// Pagination Component
const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center space-x-2 mt-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>
      
      <div className="flex items-center space-x-1">
        {getVisiblePages().map((page, index) =>
          page === '...' ? (
            <span key={index} className="px-2 text-gray-500">...</span>
          ) : (
            <Button
              key={index}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page as number)}
              className={currentPage === page ? "bg-blue-600 text-white" : ""}
            >
              {page}
            </Button>
          )
        )}
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

const StrategyPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const { 
    products, 
    orders,
    insights, 
    stats, 
    loading, 
    error, 
    progress, 
    stage, 
    details, 
    startFetching,
    clearData,
    refreshData,
    isBackgroundProcessing
  } = useStrategy();

  const [searchTerm, setSearchTerm] = useState('');
  const [performanceFilter, setPerformanceFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('performance'); // performance, sales, revenue, rating
  const [showFloatingDetails, setShowFloatingDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 30;
  
  // Best Sells Filter Range
  const [bestSellsRange, setBestSellsRange] = useState(10); // Default top 10
  
  // Date Filter for Best Sells
  const [bestSellsDateFilter, setBestSellsDateFilter] = useState('all'); // all, 7d, 30d, 90d, custom
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Access control
  React.useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    
    if (user.role !== 'admin' && user.position !== 'Media Buyer') {
      console.warn('Access denied: User is not admin or media buyer');
      navigate('/dashboard', { replace: true });
      return;
    }
  }, [user, navigate]);

  // Calculate best selling products (dynamic range with date filtering)
  const bestSellingProducts = React.useMemo(() => {
    let filteredProducts = [...products];
    
    // Apply date filtering if not 'all'
    if (bestSellsDateFilter !== 'all') {
      const now = new Date();
      let startDate: Date;
      let endDate = now;
      
      switch (bestSellsDateFilter) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'custom':
          if (customStartDate && customEndDate) {
            startDate = new Date(customStartDate);
            endDate = new Date(customEndDate);
          } else {
            startDate = new Date(0); // Default to all time if custom dates not set
          }
          break;
        default:
          startDate = new Date(0); // All time
      }
      
      // Filter products based on order dates
      const relevantOrders = orders.filter(order => {
        const orderDate = new Date(order.date_completed);
        return orderDate >= startDate && orderDate <= endDate;
      });
      
      // Calculate sales for each product in the date range
      const productSalesMap = new Map();
      relevantOrders.forEach(order => {
        order.line_items.forEach((item: any) => {
          const productId = item.product_id;
          const quantity = item.quantity || 1;
          const currentSales = productSalesMap.get(productId) || 0;
          productSalesMap.set(productId, currentSales + quantity);
        });
      });
      
      // Update products with filtered sales data
      filteredProducts = products.map(product => ({
        ...product,
        total_sales: productSalesMap.get(product.id) || 0
      })).filter(product => product.total_sales > 0); // Only show products with sales in the period
    }
    
    return filteredProducts
      .sort((a, b) => b.total_sales - a.total_sales)
      .slice(0, bestSellsRange);
  }, [products, orders, bestSellsRange, bestSellsDateFilter, customStartDate, customEndDate]);

  // Excel Export Function with Arabic Support
  const exportToExcel = () => {
    try {
      // Arabic and English headers
      const headers = [
        'الترتيب / Rank',
        'اسم المنتج / Product Name', 
        'الفئة / Category',
        'المبيعات / Sales',
        'الإيرادات (ريال) / Revenue (SAR)',
        'التقييم / Rating',
        'الأداء / Performance',
        'معدل التحويل / Conversion Rate'
      ];
      
      // Create CSV content with proper Arabic encoding
      const csvRows = [
        headers.join(','),
        ...bestSellingProducts.map((product, index) => [
          index + 1,
          `"${product.name.replace(/"/g, '""')}"`, // Escape quotes in product name
          `"${product.category.replace(/"/g, '""')}"`, // Escape quotes in category
          product.total_sales,
          product.revenue.toLocaleString('ar-SA'), // Arabic number formatting
          product.rating,
          product.campaign_performance,
          `${product.conversion_rate}%`
        ].join(','))
      ];
      
      const csvContent = csvRows.join('\n');
      
      // Add BOM (Byte Order Mark) for proper UTF-8 encoding in Excel
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvContent;
      
      // Create blob with proper UTF-8 encoding
      const blob = new Blob([csvWithBOM], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      // Generate filename with Arabic support
      const dateInfo = bestSellsDateFilter === 'all' ? 'AllTime' : 
                      bestSellsDateFilter === 'custom' ? `${customStartDate}_to_${customEndDate}` :
                      bestSellsDateFilter;
      
      // Use Arabic filename
      const filename = `أفضل_المنتجات_مبيعاً_Top${bestSellsRange}_${dateInfo}_${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute('download', filename);
      
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`✅ تم تصدير أفضل ${bestSellsRange} منتج إلى ملف Excel / Exported top ${bestSellsRange} products to Excel file`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('❌ فشل في تصدير البيانات / Failed to export data');
    }
  };

  // Calculate monthly order completion stats using real order data
  const monthlyOrderStats = React.useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentDay = new Date().getDate();
    
    // Use real order data from completed orders
    const currentMonthOrders = orders.filter(order => {
      const orderDate = new Date(order.date_completed);
      return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
    });
    
    // Calculate previous month for growth comparison
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const previousMonthOrders = orders.filter(order => {
      const orderDate = new Date(order.date_completed);
      return orderDate.getMonth() === previousMonth && orderDate.getFullYear() === previousYear;
    });
    
    // Real data calculations
    const totalThisMonth = currentMonthOrders.length;
    const totalPreviousMonth = previousMonthOrders.length;
    const revenueThisMonth = currentMonthOrders.reduce((sum, order) => sum + order.total, 0);
    const totalAllTimeOrders = orders.length;
    const totalAllTimeRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    
    // Calculate growth
    const growth = totalPreviousMonth > 0 ? 
      ((totalThisMonth - totalPreviousMonth) / totalPreviousMonth) * 100 : 
      (totalThisMonth > 0 ? 100 : 0);
    
    // Month progress
    const monthProgress = (currentDay / daysInMonth) * 100;
    
    // Active products (products with orders this month)
    const activeProductIds = new Set(
      currentMonthOrders.flatMap(order => 
        order.line_items.map((item: any) => item.product_id)
      )
    );
    
    return {
      totalThisMonth: totalThisMonth,
      totalAllTime: totalAllTimeOrders,
      revenueThisMonth: revenueThisMonth,
      growth: growth,
      completionRate: monthProgress,
      daysInMonth: daysInMonth,
      currentDay: currentDay,
      recentlyActive: activeProductIds.size,
      previousMonthOrders: totalPreviousMonth
    };
  }, [orders]);

  // Filtered and sorted products
  const filteredProducts = React.useMemo(() => {
    let filtered = products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPerformance = performanceFilter === 'all' || 
                                product.campaign_performance === performanceFilter;
      
      const matchesCategory = categoryFilter === 'all' || 
                            product.category === categoryFilter;
      
      return matchesSearch && matchesPerformance && matchesCategory;
    });

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'performance':
          const performanceOrder = { 'excellent': 4, 'good': 3, 'average': 2, 'poor': 1, 'terrible': 0 };
          return (performanceOrder[b.campaign_performance] || 0) - (performanceOrder[a.campaign_performance] || 0);
        case 'sales':
          return b.total_sales - a.total_sales;
        case 'revenue':
          return b.revenue - a.revenue;
        case 'rating':
          return b.rating - a.rating;
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, searchTerm, performanceFilter, categoryFilter, sortBy]);

  // Get unique categories for filter
  const categories = React.useMemo(() => {
    return [...new Set(products.map(p => p.category))];
  }, [products]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  );

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, performanceFilter, categoryFilter, sortBy]);

  const getPerformanceBadge = (performance: string) => {
    switch (performance) {
      case 'excellent':
        return <Badge className="bg-green-100 text-green-800 border-green-300">🔥 Excellent</Badge>;
      case 'good':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">👍 Good</Badge>;
      case 'average':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">😐 Average</Badge>;
      case 'poor':
        return <Badge className="bg-red-100 text-red-800 border-red-300">👎 Poor</Badge>;
      case 'terrible':
        return <Badge className="bg-red-200 text-red-900 border-red-400">💀 Terrible</Badge>;
      default:
        return <Badge variant="outline">{performance}</Badge>;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <BarChart3 className="h-4 w-4 text-gray-600" />;
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'best_performer':
        return <Award className="h-5 w-5 text-green-600" />;
      case 'opportunity':
        return <Zap className="h-5 w-5 text-blue-600" />;
      case 'worst_performer':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'risk':
        return <ThumbsDown className="h-5 w-5 text-orange-600" />;
      default:
        return <BarChart3 className="h-5 w-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-300 bg-red-50';
      case 'medium':
        return 'border-yellow-300 bg-yellow-50';
      case 'low':
        return 'border-green-300 bg-green-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const handleProductClick = (permalink: string) => {
    window.open(permalink, '_blank', 'noopener,noreferrer');
  };

  if (!user || (user.role !== 'admin' && user.position !== 'Media Buyer')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto"
        >
          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                <StrategyIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Unable to Load Strategy Data</h3>
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <div className="space-y-2">
                <Button onClick={startFetching} variant="outline" className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={clearData} variant="ghost" className="w-full">
                  Clear Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (loading && products.length === 0) {
    return (
      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 flex items-center justify-center">
                <StrategyIcon className="w-12 h-12 text-blue-600 dark:text-blue-400" animated />
              </div>
              
              <h3 className="text-2xl font-bold text-blue-800 dark:text-blue-200 mb-2">
                Analyzing Campaign Strategy
              </h3>
              <p className="text-blue-700 dark:text-blue-300 mb-6">
                {stage || 'Connecting to WooCommerce for comprehensive product analysis...'}
              </p>
              
              {progress > 0 && (
                <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>⚡ Loading ALL Products:</strong> Fetching complete product catalog for comprehensive analysis.
                  </p>
                </div>
              )}
              
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-3 mb-4 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-400 dark:to-purple-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              
              <div className="flex items-center justify-between text-sm text-blue-700 dark:text-blue-300 mb-4">
                <span>Progress</span>
                <span className="font-semibold">{Math.round(progress)}%</span>
              </div>
              
              <p className="text-blue-600 dark:text-blue-400 text-sm">
                {details || 'Processing all WooCommerce products for strategic insights...'}
              </p>
              
              <div className="mt-6 p-4 bg-blue-100 dark:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Complete Analysis:</strong> Loading all products and saving to cache for faster future access.
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 md:hidden">
                  📱 On mobile: Look for the floating progress circle when you navigate away.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Floating loading button is now handled globally by BackgroundProcessIndicator */}
      </div>
    );
  }

  // Show load data prompt when no data is available
  if (!loading && products.length === 0 && !error) {
    return (
      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto"
        >
          <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 flex items-center justify-center">
                <StrategyIcon className="w-12 h-12 text-blue-600 dark:text-blue-400" />
              </div>
              
              <h3 className="text-2xl font-bold text-blue-800 dark:text-blue-200 mb-2">
                Strategy Analytics Ready
              </h3>
              <p className="text-blue-700 dark:text-blue-300 mb-6">
                Load your WooCommerce data to generate AI-powered insights and campaign strategies.
              </p>
              
              <div className="space-y-4">
                <Button 
                  onClick={startFetching}
                  size="lg"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 hover:from-blue-700 hover:to-purple-700 dark:hover:from-blue-600 dark:hover:to-purple-600 text-white"
                >
                  <StrategyIcon className="w-5 h-5 mr-2" />
                  Load Strategy Data
                </Button>
                
                <div className="p-4 bg-blue-100 dark:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-800 text-left">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">📊 What will be analyzed:</p>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• All WooCommerce products and their performance</li>
                    <li>• Completed orders and revenue data</li>
                    <li>• AI-generated campaign strategies</li>
                    <li>• Product performance insights and recommendations</li>
                  </ul>
                </div>
                
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Only Media Buyers and Admins can load strategy data
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Floating loading button is now handled globally by BackgroundProcessIndicator */}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-purple-700 dark:from-blue-700 dark:to-purple-800 rounded-lg p-6 text-white"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <StrategyIcon className="h-8 w-8" />
              Strategy
            </h1>
            <p className="mt-2 text-blue-100 dark:text-blue-200">
              AI-powered insights from {stats.total_orders} completed orders and {stats.total_products} products
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="bg-white/10 dark:bg-white/20 border-white/20 dark:border-white/30 text-white hover:bg-white/20 dark:hover:bg-white/30"
              onClick={refreshData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Products</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.total_products}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Available for campaigns</p>
              </div>
              <Package className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">High Performers</p>
                <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                  {products.filter(p => p.total_sales > 10).length}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Products with 10+ sales</p>
              </div>
              <Star className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/50 dark:to-yellow-950/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Campaign Ready</p>
                <p className="text-3xl font-bold text-amber-900 dark:text-amber-100">
                  {products.filter(p => p.images && p.images.length > 0 && p.short_description).length}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">With images & descriptions</p>
              </div>
              <Target className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/50 dark:to-violet-950/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Avg. Performance</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {products.length > 0 ? (products.reduce((sum, p) => sum + (p.total_sales || 0), 0) / products.length).toFixed(1) : '0'}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400">Sales per product</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto gap-1 p-1">
          <TabsTrigger value="analytics" className="text-xs sm:text-sm py-2 px-2 sm:px-4 h-auto">
            <span className="hidden sm:inline">📊 Analytics & Insights | التحليلات والرؤى</span>
            <span className="sm:hidden flex flex-col items-center gap-1">
              <span className="text-lg">📊</span>
              <span className="text-xs">Analytics</span>
            </span>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="text-xs sm:text-sm py-2 px-2 sm:px-4 h-auto">
            <span className="hidden sm:inline">🎯 Campaign Creator | منشئ الحملات</span>
            <span className="sm:hidden flex flex-col items-center gap-1">
              <span className="text-lg">🎯</span>
              <span className="text-xs">Creator</span>
            </span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="text-xs sm:text-sm py-2 px-2 sm:px-4 h-auto">
            <span className="hidden sm:inline">💾 Saved Campaigns | الحملات المحفوظة</span>
            <span className="sm:hidden flex flex-col items-center gap-1">
              <span className="text-lg">💾</span>
              <span className="text-xs">Saved</span>
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          {/* Monthly Order Completion Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  <span className="text-green-800 dark:text-green-200">Monthly Performance Estimates</span>
                  <Badge className="bg-green-600 dark:bg-green-700 text-white">
                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Badge>
                  <Badge variant="outline" className="text-xs border-green-300 dark:border-green-700 text-green-700 dark:text-green-300">
                    Real Order Data
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">This Month Orders</p>
                        <p className="text-2xl font-bold text-green-800 dark:text-green-200">{monthlyOrderStats.totalThisMonth}</p>
                        <p className="text-xs text-green-600 dark:text-green-400">Day {monthlyOrderStats.currentDay}/{monthlyOrderStats.daysInMonth} • Prev: {monthlyOrderStats.previousMonthOrders}</p>
                      </div>
                      <ShoppingCart className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">Revenue This Month</p>
                        <p className="text-2xl font-bold text-green-800 dark:text-green-200">{Math.round(monthlyOrderStats.revenueThisMonth).toLocaleString()} SAR</p>
                        <p className="text-xs text-green-600 dark:text-green-400">From completed orders</p>
                      </div>
                      <SARIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">Growth Rate</p>
                        <p className={`text-2xl font-bold ${monthlyOrderStats.growth >= 0 ? 'text-green-800 dark:text-green-200' : 'text-red-600 dark:text-red-400'}`}>
                          {monthlyOrderStats.growth >= 0 ? '+' : ''}{monthlyOrderStats.growth.toFixed(1)}%
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">vs. previous month</p>
                      </div>
                      {monthlyOrderStats.growth >= 0 ? 
                        <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" /> : 
                        <TrendingDown className="h-8 w-8 text-red-600 dark:text-red-400" />
                      }
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">Month Progress</p>
                        <p className="text-2xl font-bold text-green-800 dark:text-green-200">{monthlyOrderStats.completionRate.toFixed(0)}%</p>
                        <p className="text-xs text-green-600 dark:text-green-400">{monthlyOrderStats.recentlyActive} products with orders</p>
                      </div>
                      <Calendar className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Best Selling Products */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-yellow-200 dark:border-yellow-800 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/50 dark:to-amber-950/50">
              <CardHeader>
                <div className="flex flex-col space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                    <CardTitle className="flex items-center gap-3">
                      <Crown className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-yellow-800 dark:text-yellow-200">Best Selling Products</span>
                      <Badge className="bg-yellow-600 dark:bg-yellow-700 text-white">Top {bestSellsRange}</Badge>
                    </CardTitle>
                    <Button 
                      onClick={exportToExcel}
                      className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white flex items-center gap-2"
                      disabled={bestSellingProducts.length === 0}
                    >
                      <Download className="h-4 w-4" />
                      Export to Excel
                    </Button>
                  </div>
                  
                  {/* Filters Row */}
                  <div className="flex flex-col md:flex-row gap-3 md:items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">Show Top:</span>
                      <Select value={bestSellsRange.toString()} onValueChange={(value) => setBestSellsRange(parseInt(value))}>
                        <SelectTrigger className="w-24 bg-white dark:bg-gray-800 border-yellow-300 dark:border-yellow-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="15">15</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="30">30</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-yellow-700 dark:text-yellow-300" />
                      <span className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">Date Range:</span>
                      <Select value={bestSellsDateFilter} onValueChange={setBestSellsDateFilter}>
                        <SelectTrigger className="w-32 bg-white dark:bg-gray-800 border-yellow-300 dark:border-yellow-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="7d">Last 7 Days</SelectItem>
                          <SelectItem value="30d">Last 30 Days</SelectItem>
                          <SelectItem value="90d">Last 90 Days</SelectItem>
                          <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {bestSellsDateFilter === 'custom' && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="w-36 bg-white dark:bg-gray-800 border-yellow-300 dark:border-yellow-700"
                          placeholder="Start Date"
                        />
                        <span className="text-yellow-700 dark:text-yellow-300">to</span>
                        <Input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-36 bg-white dark:bg-gray-800 border-yellow-300 dark:border-yellow-700"
                          placeholder="End Date"
                        />
                      </div>
                    )}
                    
                    {bestSellsDateFilter !== 'all' && (
                      <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700">
                        {bestSellsDateFilter === 'custom' && customStartDate && customEndDate 
                          ? `${customStartDate} to ${customEndDate}`
                          : bestSellsDateFilter === '7d' ? 'Last 7 Days'
                          : bestSellsDateFilter === '30d' ? 'Last 30 Days' 
                          : bestSellsDateFilter === '90d' ? 'Last 90 Days'
                          : 'Filtered'
                        }
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {bestSellingProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                    <p className="text-yellow-700 font-medium">No products found</p>
                    <p className="text-yellow-600 text-sm">
                      {bestSellsDateFilter !== 'all' 
                        ? 'No sales found in the selected date range. Try adjusting your date filter or range.'
                        : 'Try adjusting your range or wait for data to load'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bestSellingProducts.map((product, index) => (
                    <Card 
                      key={product.id} 
                      className="border border-yellow-200 dark:border-yellow-800 hover:shadow-md transition-shadow cursor-pointer bg-white dark:bg-gray-800"
                      onClick={() => handleProductClick(product.permalink)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge className="bg-yellow-600 dark:bg-yellow-700 text-white">#{index + 1}</Badge>
                              <h4 className="font-medium text-sm">{product.name}</h4>
                              <ExternalLink className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                              <span>{product.total_sales} sales</span>
                              <span>Price: {parseFloat((product as any).price || (product as any).regular_price || '0').toLocaleString()} SAR</span>
                              <span>{product.revenue.toLocaleString()} SAR</span>
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-500 dark:text-yellow-400" />
                                <span>{product.rating}</span>
                              </div>
                            </div>
                          </div>
                          {getPerformanceBadge(product.campaign_performance)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Strategy Insights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {insights.map((insight, index) => (
              <Card key={index} className={`${getPriorityColor(insight.priority)} border-2`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    {getInsightIcon(insight.type)}
                    {insight.title}
                    <Badge className={`ml-auto ${insight.priority === 'high' ? 'bg-red-600' : insight.priority === 'medium' ? 'bg-yellow-600' : 'bg-green-600'} text-white`}>
                      {insight.priority.toUpperCase()}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {insight.products.map((product) => (
                      <div 
                        key={product.id} 
                        className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleProductClick(product.permalink)}
                      >
                        <div className="flex-1">
                          <h4 className="font-medium flex items-center gap-2">
                            {product.name}
                            <ExternalLink className="h-3 w-3 text-gray-400" />
                          </h4>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm text-muted-foreground">
                              {product.quantity_sold} sales • {parseFloat((product as any).price || (product as any).regular_price || '0').toLocaleString()} SAR
                            </span>
                            <div className="flex items-center gap-1">
                              {getTrendIcon(product.trend)}
                              <span className="text-sm">{product.conversion_rate}%</span>
                            </div>
                          </div>
                        </div>
                        {getPerformanceBadge(product.campaign_performance)}
                      </div>
                    ))}
                    <Separator />
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">Recommended Action:</p>
                      <p className="text-sm text-blue-700 mt-1">{insight.action}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Detailed Product Analysis with Pagination */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Complete Product Performance Analysis
                    <Badge variant="outline">
                      {filteredProducts.length} Products • Page {currentPage} of {totalPages}
                    </Badge>
                  </CardTitle>
                  <div className="flex flex-col md:flex-row gap-2">
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full md:w-64"
                    />
                    <Select value={performanceFilter} onValueChange={setPerformanceFilter}>
                      <SelectTrigger className="w-full md:w-40">
                        <SelectValue placeholder="Performance" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Performance</SelectItem>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="average">Average</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                        <SelectItem value="terrible">Terrible</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-full md:w-40">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-full md:w-40">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="performance">Best Performance</SelectItem>
                        <SelectItem value="sales">Highest Sales</SelectItem>
                        <SelectItem value="revenue">Highest Revenue</SelectItem>
                        <SelectItem value="rating">Highest Rating</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paginatedProducts.map((product) => (
                    <Card key={product.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 
                                className="font-semibold text-lg cursor-pointer hover:text-blue-600 flex items-center gap-2"
                                onClick={() => handleProductClick(product.permalink)}
                              >
                                {product.name}
                                <ExternalLink className="h-4 w-4 text-gray-400" />
                              </h3>
                              {getPerformanceBadge(product.campaign_performance)}
                              <Badge variant="outline" className="text-xs">
                                {product.category}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Sales</p>
                                <p className="font-medium">{product.quantity_sold} units</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Price</p>
                                <p className="font-medium">{parseFloat((product as any).price || (product as any).regular_price || '0').toLocaleString()} SAR</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Revenue</p>
                                <p className="font-medium">{parseFloat((product as any).price || (product as any).regular_price || '0').toLocaleString()} SAR</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Conversion</p>
                                <div className="flex items-center gap-1">
                                  {getTrendIcon(product.trend)}
                                  <span className="font-medium">{product.conversion_rate}%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleProductClick(product.permalink)}
                              className="flex items-center gap-2"
                            >
                              <ExternalLink className="h-4 w-4" />
                              View Product
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Pagination */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <CampaignStrategyCreator />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <SavedCampaigns />
        </TabsContent>
      </Tabs>

      {/* Floating loading button is now handled globally by BackgroundProcessIndicator */}
    </div>
  );
};

export default StrategyPage; 