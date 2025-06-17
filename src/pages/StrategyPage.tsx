import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
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
  Eye
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

// Strategy Icon Component - Using your growth_strategy.svg
const StrategyIcon = ({ className, animated = false }: { className?: string, animated?: boolean }) => (
  <img 
    src="/animation/growth_strategy.svg" 
    alt="Growth Strategy" 
    className={`${className} ${animated ? 'animate-pulse' : ''}`}
    style={{ filter: 'brightness(0) invert(1)', color: 'currentColor' }}
  />
);

const StrategyPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const { 
    products, 
    insights, 
    stats, 
    loading, 
    error, 
    progress, 
    stage, 
    details, 
    startFetching,
    clearData,
    refreshData 
  } = useStrategy();

  const [dateRange, setDateRange] = useState('30d');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

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
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <StrategyIcon className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Unable to Load Strategy Data</h3>
              <p className="text-red-600 mb-4">{error}</p>
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
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                <StrategyIcon className="w-12 h-12 text-blue-600" animated />
              </div>
              
              <h3 className="text-2xl font-bold text-blue-800 mb-2">
                Analyzing Campaign Strategy
              </h3>
              <p className="text-blue-700 mb-6">
                {stage || 'Connecting to WooCommerce for product analysis...'}
              </p>
              
              {progress > 0 && (
                <div className="mb-4 p-3 bg-blue-100 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    <strong>⚡ Background Processing Active:</strong> This process started earlier and is continuing from where it left off.
                  </p>
                </div>
              )}
              
              <div className="w-full bg-blue-200 rounded-full h-3 mb-4 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              
              <div className="flex items-center justify-between text-sm text-blue-700 mb-4">
                <span>Progress</span>
                <span className="font-semibold">{Math.round(progress)}%</span>
              </div>
              
              <p className="text-blue-600 text-sm">
                {details || 'Processing WooCommerce products for strategic insights...'}
              </p>
              
              <div className="mt-6 p-4 bg-blue-100 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700">
                  <strong>Real Data Only:</strong> Strategy analysis uses only real WooCommerce product data for accurate insights.
                </p>
                <p className="text-xs text-blue-600 mt-2 md:hidden">
                  📱 On mobile: Look for the floating progress circle on the right side of your screen when you navigate away.
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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-lg p-6 text-white"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <StrategyIcon className="h-8 w-8" />
              Strategy
            </h1>
            <p className="mt-2 text-blue-100">
              AI-powered insights for optimal campaign performance
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 3 months</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
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
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{stats.total_products}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{stats.total_revenue.toLocaleString()} SAR</p>
              </div>
              <SARIcon className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Top Performers</p>
                <p className="text-2xl font-bold text-green-600">{stats.best_performers}</p>
              </div>
              <Award className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Need Attention</p>
                <p className="text-2xl font-bold text-red-600">{stats.worst_performers}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Conversion</p>
                <p className="text-2xl font-bold">{stats.avg_conversion.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Strategy Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
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
                  <div key={product.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex-1">
                      <h4 className="font-medium">{product.name}</h4>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-muted-foreground">
                          {product.quantity_sold} sales • {product.revenue.toLocaleString()} SAR
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
                  <p className="text-sm font-medium text-blue-800">🎯 Recommended Action:</p>
                  <p className="text-sm text-blue-700 mt-1">{insight.action}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Detailed Product Analysis */}
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
                Product Performance Analysis
              </CardTitle>
              <div className="flex gap-2">
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="smartphones">Smartphones</SelectItem>
                    <SelectItem value="laptops">Laptops</SelectItem>
                    <SelectItem value="tablets">Tablets</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {products
                .filter(p => 
                  (categoryFilter === 'all' || p.category.toLowerCase() === categoryFilter) &&
                  (searchTerm === '' || p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                )
                .map((product) => (
                  <Card key={product.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{product.name}</h3>
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
                              <p className="text-muted-foreground">Revenue</p>
                              <p className="font-medium">{product.revenue.toLocaleString()} SAR</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Conversion</p>
                              <div className="flex items-center gap-1">
                                {getTrendIcon(product.trend)}
                                <span className="font-medium">{product.conversion_rate}%</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Profit Margin</p>
                              <p className="font-medium">{product.profit_margin}%</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            <Target className="h-4 w-4 mr-2" />
                            Create Campaign
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default StrategyPage; 