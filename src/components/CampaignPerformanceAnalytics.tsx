import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  TrendingUp, 
  TrendingDown,
  BarChart3, 
  Target,
  DollarSign,
  Users,
  MousePointer,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Star,
  Calendar,
  Zap,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  RefreshCw,
  Plus,
  X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import CustomCampaignCreator from './CustomCampaignCreator';

// SAR Icon Component
const SARIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className || "riyal-svg"} 
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

interface CampaignAnalytics {
  campaign_id: string;
  strategy_name: string;
  campaign_type: string;
  priority_level: string;
  campaign_status: string;
  target_budget_recommended: number;
  expected_roas: number;
  expected_revenue: number;
  expected_conversions: number;
  duration_days: number;
  creator_name: string;
  creator_position: string;
  actual_spent: number;
  actual_clicks: number;
  actual_conversions: number;
  actual_revenue: number;
  actual_roas: number;
  actual_cpc: number;
  actual_ctr: number;
  actual_conversion_rate: number;
  roas_variance: number;
  revenue_variance: number;
  conversion_variance: number;
  performance_score: number;
  performance_rating: string;
  is_profitable: boolean;
  needs_optimization: boolean;
  roi_percentage: number;
  budget_utilization_percentage: number;
  days_running: number;
  platform_performance: any;
  optimization_notes: string;
  tracking_started: string;
  last_updated: string;
}

const CampaignPerformanceAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<CampaignAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignAnalytics | null>(null);
  const [filterRating, setFilterRating] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCustomCreator, setShowCustomCreator] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);

  useEffect(() => {
    loadCampaignAnalytics();
  }, []);

  const loadCampaignAnalytics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaign_analytics_dashboard')
        .select('*')
        .order('performance_score', { ascending: false });

      if (error) {
        console.error('Error loading campaign analytics:', error);
        return;
      }

      setAnalytics(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshAnalytics = async () => {
    setIsRefreshing(true);
    await loadCampaignAnalytics();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getPerformanceRatingColor = (rating: string) => {
    switch (rating) {
      case 'Excellent': return 'bg-green-500 text-white';
      case 'Good': return 'bg-blue-500 text-white';
      case 'Average': return 'bg-yellow-500 text-white';
      case 'Poor': return 'bg-orange-500 text-white';
      case 'Terrible': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 10) return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    if (variance < -10) return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    return <div className="h-4 w-4" />; // neutral
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 10) return 'text-green-600';
    if (variance < -10) return 'text-red-600';
    return 'text-gray-600';
  };

  const getCampaignTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'awareness': 'bg-blue-500',
      'conversion': 'bg-green-500',
      'retargeting': 'bg-purple-500',
      'seasonal': 'bg-orange-500',
      'custom': 'bg-gray-500'
    };
    return colors[type] || 'bg-gray-500';
  };

  const exportAnalytics = () => {
    const dataStr = JSON.stringify(analytics, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `campaign-analytics-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const filteredAnalytics = analytics.filter(campaign => {
    if (filterRating !== 'all' && campaign.performance_rating !== filterRating) return false;
    if (filterStatus !== 'all' && campaign.campaign_status !== filterStatus) return false;
    return true;
  });

  const overallStats = {
    totalCampaigns: analytics.length,
    activeCampaigns: analytics.filter(c => c.campaign_status === 'Active').length,
    excellentCampaigns: analytics.filter(c => c.performance_rating === 'Excellent').length,
    profitableCampaigns: analytics.filter(c => c.is_profitable).length,
    totalSpent: analytics.reduce((sum, c) => sum + (c.actual_spent || 0), 0),
    totalRevenue: analytics.reduce((sum, c) => sum + (c.actual_revenue || 0), 0),
    averageROAS: analytics.length > 0 ? 
      analytics.reduce((sum, c) => sum + (c.actual_roas || 0), 0) / analytics.length : 0
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading campaign analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Campaign Performance Analytics</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Comprehensive performance tracking and insights for your marketing campaigns
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Button 
            onClick={refreshAnalytics} 
            variant="outline" 
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={exportAnalytics}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </motion.div>

      {/* Overview Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4"
      >
        <Card className="col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Campaigns</p>
                <p className="text-xl md:text-2xl font-bold">{overallStats.totalCampaigns}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-xl md:text-2xl font-bold text-green-600">{overallStats.activeCampaigns}</p>
              </div>
              <Zap className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Excellent</p>
                <p className="text-xl md:text-2xl font-bold text-yellow-600">{overallStats.excellentCampaigns}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Profitable</p>
                <p className="text-xl md:text-2xl font-bold text-purple-600">{overallStats.profitableCampaigns}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Spent</p>
                <p className="text-lg md:text-xl font-bold text-red-600 flex items-center gap-1">
                  {overallStats.totalSpent.toLocaleString()}
                  <SARIcon className="h-3 w-3" />
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-lg md:text-xl font-bold text-green-600 flex items-center gap-1">
                  {overallStats.totalRevenue.toLocaleString()}
                  <SARIcon className="h-3 w-3" />
                </p>
              </div>
              <ShoppingCart className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg ROAS</p>
                <p className="text-lg md:text-xl font-bold text-blue-600">
                  {overallStats.averageROAS.toFixed(1)}x
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Ratings</option>
            <option value="Excellent">Excellent</option>
            <option value="Good">Good</option>
            <option value="Average">Average</option>
            <option value="Poor">Poor</option>
            <option value="Terrible">Terrible</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Paused">Paused</option>
          </select>
        </div>
      </motion.div>

      {/* Campaign Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"
      >
        {filteredAnalytics.map((campaign, index) => (
          <motion.div
            key={campaign.campaign_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-300"
              onClick={() => setSelectedCampaign(campaign)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge className={`${getCampaignTypeColor(campaign.campaign_type)} text-white`}>
                    {campaign.campaign_type.toUpperCase()}
                  </Badge>
                  <Badge className={getPerformanceRatingColor(campaign.performance_rating)}>
                    {campaign.performance_rating}
                  </Badge>
                </div>
                <CardTitle className="text-lg line-clamp-2">{campaign.strategy_name}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <span>{campaign.creator_name}</span>
                  <span>•</span>
                  <span>{campaign.days_running} days</span>
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Performance Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Performance Score</span>
                    <span className="font-bold">{campaign.performance_score}/100</span>
                  </div>
                  <Progress value={campaign.performance_score} className="h-2" />
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Spent</div>
                    <div className="font-bold flex items-center gap-1">
                      {campaign.actual_spent?.toLocaleString() || 0}
                      <SARIcon className="h-3 w-3" />
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Revenue</div>
                    <div className="font-bold text-green-600 flex items-center gap-1">
                      {campaign.actual_revenue?.toLocaleString() || 0}
                      <SARIcon className="h-3 w-3" />
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">ROAS</div>
                    <div className="font-bold text-blue-600">
                      {campaign.actual_roas?.toFixed(1) || 0}x
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">ROI</div>
                    <div className={`font-bold ${campaign.roi_percentage > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {campaign.roi_percentage?.toFixed(1) || 0}%
                    </div>
                  </div>
                </div>

                {/* Status Indicators */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {campaign.is_profitable ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">
                      {campaign.is_profitable ? 'Profitable' : 'Not Profitable'}
                    </span>
                  </div>
                  
                  {campaign.needs_optimization && (
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      Needs Optimization
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Empty State */}
      {filteredAnalytics.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Campaign Data Found</h3>
          <p className="text-gray-600">
            {analytics.length === 0 
              ? "No campaigns have been created yet."
              : "No campaigns match your current filters."}
          </p>
        </motion.div>
      )}

      {/* Detailed Campaign Modal */}
      <AnimatePresence>
        {selectedCampaign && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedCampaign(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedCampaign.strategy_name}</h2>
                    <p className="text-gray-600">Detailed Performance Analysis</p>
                  </div>
                  <div className="flex gap-2">
                    {selectedCampaign.campaign_status === 'Active' && (
                      <Button 
                        onClick={() => setShowPerformanceModal(true)}
                        className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                      >
                        <Target className="h-4 w-4 mr-2" />
                        Update Performance
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setSelectedCampaign(null)}>
                      Close
                    </Button>
                  </div>
                </div>

                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 md:grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="platforms">Platforms</TabsTrigger>
                    <TabsTrigger value="insights">Insights</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Campaign Details
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Type</span>
                            <Badge className={getCampaignTypeColor(selectedCampaign.campaign_type)}>
                              {selectedCampaign.campaign_type}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Priority</span>
                            <span className="font-medium">{selectedCampaign.priority_level}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status</span>
                            <span className="font-medium">{selectedCampaign.campaign_status}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Duration</span>
                            <span className="font-medium">{selectedCampaign.duration_days} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Running</span>
                            <span className="font-medium">{selectedCampaign.days_running} days</span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Budget & Spend
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Budget</span>
                            <span className="font-bold flex items-center gap-1">
                              {selectedCampaign.target_budget_recommended.toLocaleString()}
                              <SARIcon className="h-3 w-3" />
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Spent</span>
                            <span className="font-bold flex items-center gap-1">
                              {selectedCampaign.actual_spent?.toLocaleString() || 0}
                              <SARIcon className="h-3 w-3" />
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Utilization</span>
                            <span className="font-medium">
                              {selectedCampaign.budget_utilization_percentage?.toFixed(1) || 0}%
                            </span>
                          </div>
                          <Progress 
                            value={selectedCampaign.budget_utilization_percentage || 0} 
                            className="mt-2" 
                          />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Star className="h-5 w-5" />
                            Performance Rating
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="text-center">
                            <div className="text-3xl font-bold mb-2">
                              {selectedCampaign.performance_score}/100
                            </div>
                            <Badge 
                              className={`${getPerformanceRatingColor(selectedCampaign.performance_rating)} mb-3`}
                            >
                              {selectedCampaign.performance_rating}
                            </Badge>
                          </div>
                          <Progress 
                            value={selectedCampaign.performance_score} 
                            className="h-3" 
                          />
                          <div className="flex items-center justify-center gap-2 mt-3">
                            {selectedCampaign.is_profitable ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-sm">
                              {selectedCampaign.is_profitable ? 'Profitable Campaign' : 'Needs Improvement'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="performance" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Expected vs Actual Performance</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">ROAS</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">
                                  {selectedCampaign.expected_roas.toFixed(1)}x →
                                </span>
                                <span className="font-bold">
                                  {selectedCampaign.actual_roas?.toFixed(1) || 0}x
                                </span>
                                {getVarianceIcon(selectedCampaign.roas_variance)}
                                <span className={`text-sm ${getVarianceColor(selectedCampaign.roas_variance)}`}>
                                  {selectedCampaign.roas_variance > 0 ? '+' : ''}{selectedCampaign.roas_variance?.toFixed(1) || 0}%
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Revenue</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500 flex items-center gap-1">
                                  {selectedCampaign.expected_revenue.toLocaleString()}
                                  <SARIcon className="h-2 w-2" /> →
                                </span>
                                <span className="font-bold flex items-center gap-1">
                                  {selectedCampaign.actual_revenue?.toLocaleString() || 0}
                                  <SARIcon className="h-3 w-3" />
                                </span>
                                {getVarianceIcon(selectedCampaign.revenue_variance)}
                                <span className={`text-sm ${getVarianceColor(selectedCampaign.revenue_variance)}`}>
                                  {selectedCampaign.revenue_variance > 0 ? '+' : ''}{selectedCampaign.revenue_variance?.toFixed(1) || 0}%
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Conversions</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">
                                  {selectedCampaign.expected_conversions} →
                                </span>
                                <span className="font-bold">
                                  {selectedCampaign.actual_conversions || 0}
                                </span>
                                {getVarianceIcon(selectedCampaign.conversion_variance)}
                                <span className={`text-sm ${getVarianceColor(selectedCampaign.conversion_variance)}`}>
                                  {selectedCampaign.conversion_variance > 0 ? '+' : ''}{selectedCampaign.conversion_variance?.toFixed(1) || 0}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Key Metrics</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                              <div className="text-2xl font-bold text-blue-600">
                                {selectedCampaign.actual_cpc?.toFixed(2) || 0}
                              </div>
                              <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                                CPC <SARIcon className="h-3 w-3" />
                              </div>
                            </div>
                            
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <div className="text-2xl font-bold text-green-600">
                                {selectedCampaign.actual_ctr?.toFixed(2) || 0}%
                              </div>
                              <div className="text-sm text-gray-600">CTR</div>
                            </div>
                            
                            <div className="text-center p-3 bg-purple-50 rounded-lg">
                              <div className="text-2xl font-bold text-purple-600">
                                {selectedCampaign.actual_conversion_rate?.toFixed(2) || 0}%
                              </div>
                              <div className="text-sm text-gray-600">Conversion Rate</div>
                            </div>
                            
                            <div className="text-center p-3 bg-orange-50 rounded-lg">
                              <div className="text-2xl font-bold text-orange-600">
                                {selectedCampaign.roi_percentage?.toFixed(1) || 0}%
                              </div>
                              <div className="text-sm text-gray-600">ROI</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="platforms" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Platform Performance Breakdown</CardTitle>
                        <CardDescription>
                          Performance metrics by advertising platform
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {selectedCampaign.platform_performance && 
                            Object.entries(selectedCampaign.platform_performance).map(([platform, performance]: [string, any]) => (
                              <div key={platform} className="p-4 border rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-semibold">{platform}</h4>
                                  <Badge variant="outline">
                                    {performance.conversions || 0} conversions
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-600">Spent</span>
                                    <div className="font-bold flex items-center gap-1">
                                      {performance.spent?.toLocaleString() || 0}
                                      <SARIcon className="h-3 w-3" />
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Clicks</span>
                                    <div className="font-bold">{performance.clicks || 0}</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Revenue</span>
                                    <div className="font-bold text-green-600 flex items-center gap-1">
                                      {performance.revenue?.toLocaleString() || 0}
                                      <SARIcon className="h-3 w-3" />
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">ROAS</span>
                                    <div className="font-bold text-blue-600">
                                      {performance.spent > 0 ? (performance.revenue / performance.spent).toFixed(1) : 0}x
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          }
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="insights" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Optimization Notes & Insights</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {selectedCampaign.optimization_notes ? (
                            <div className="p-4 bg-blue-50 rounded-lg">
                              <h4 className="font-semibold mb-2">Current Notes:</h4>
                              <p className="text-gray-700">{selectedCampaign.optimization_notes}</p>
                            </div>
                          ) : (
                            <div className="p-4 bg-gray-50 rounded-lg text-center">
                              <p className="text-gray-600">No optimization notes available yet.</p>
                            </div>
                          )}

                          {/* Auto-generated insights based on performance */}
                          <div className="space-y-3">
                            <h4 className="font-semibold">Performance Analysis:</h4>
                            
                            {selectedCampaign.performance_score >= 85 && (
                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <span className="font-medium text-green-800">Excellent Performance</span>
                                </div>
                                <p className="text-green-700 text-sm">
                                  This campaign is performing exceptionally well. Consider scaling the budget or replicating the strategy.
                                </p>
                              </div>
                            )}

                            {selectedCampaign.performance_score < 50 && (
                              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                  <span className="font-medium text-red-800">Needs Immediate Attention</span>
                                </div>
                                <p className="text-red-700 text-sm">
                                  Performance is below expectations. Review targeting, creative assets, and budget allocation.
                                </p>
                              </div>
                            )}

                            {!selectedCampaign.is_profitable && (
                              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <TrendingDown className="h-4 w-4 text-orange-500" />
                                  <span className="font-medium text-orange-800">Not Profitable</span>
                                </div>
                                <p className="text-orange-700 text-sm">
                                  ROAS is below 1.0. Focus on conversion optimization and cost reduction strategies.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Campaign Creator Modal */}
      <CustomCampaignCreator
        isOpen={showCustomCreator}
        onClose={() => setShowCustomCreator(false)}
        onCampaignCreated={() => {
          setShowCustomCreator(false);
          refreshAnalytics();
        }}
      />

      {/* Performance Update Modal */}
      <AnimatePresence>
        {showPerformanceModal && selectedCampaign && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowPerformanceModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Update Campaign Performance</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPerformanceModal(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Campaign: {selectedCampaign.strategy_name}</Label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="actualSpent">Spent (SAR)</Label>
                      <div className="relative mt-1">
                        <Input
                          id="actualSpent"
                          type="number"
                          placeholder={selectedCampaign.actual_spent?.toString() || "0"}
                          className="pr-10"
                        />
                        <SARIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="actualRevenue">Revenue (SAR)</Label>
                      <div className="relative mt-1">
                        <Input
                          id="actualRevenue"
                          type="number"
                          placeholder={selectedCampaign.actual_revenue?.toString() || "0"}
                          className="pr-10"
                        />
                        <SARIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="actualClicks">Clicks</Label>
                      <Input
                        id="actualClicks"
                        type="number"
                        placeholder={selectedCampaign.actual_clicks?.toString() || "0"}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="actualConversions">Conversions</Label>
                      <Input
                        id="actualConversions"
                        type="number"
                        placeholder={selectedCampaign.actual_conversions?.toString() || "0"}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="optimizationNotes">Optimization Notes</Label>
                    <Textarea
                      id="optimizationNotes"
                      placeholder="Add notes about campaign performance and optimizations..."
                      className="mt-1 h-20"
                      defaultValue={selectedCampaign.optimization_notes || ''}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowPerformanceModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        const spent = parseFloat((document.getElementById('actualSpent') as HTMLInputElement)?.value) || selectedCampaign.actual_spent || 0;
                        const revenue = parseFloat((document.getElementById('actualRevenue') as HTMLInputElement)?.value) || selectedCampaign.actual_revenue || 0;
                        const clicks = parseInt((document.getElementById('actualClicks') as HTMLInputElement)?.value) || selectedCampaign.actual_clicks || 0;
                        const conversions = parseInt((document.getElementById('actualConversions') as HTMLInputElement)?.value) || selectedCampaign.actual_conversions || 0;
                        const notes = (document.getElementById('optimizationNotes') as HTMLTextAreaElement)?.value || '';

                        try {
                          const { error } = await supabase
                            .from('campaign_performance_tracking')
                            .upsert({
                              campaign_id: selectedCampaign.campaign_id,
                              user_id: user?.id,
                              actual_spent: spent,
                              actual_revenue: revenue,
                              actual_clicks: clicks,
                              actual_conversions: conversions,
                              optimization_notes: notes,
                              is_active: true,
                              tracking_start_date: new Date().toISOString().split('T')[0]
                            });

                          if (error) {
                            console.error('Error updating performance:', error);
                            toast.error('Failed to update performance');
                          } else {
                            toast.success('✅ Performance updated successfully!');
                            setShowPerformanceModal(false);
                            refreshAnalytics();
                          }
                        } catch (error) {
                          console.error('Error:', error);
                          toast.error('Failed to update performance');
                        }
                      }}
                      className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                    >
                      Update Performance
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CampaignPerformanceAnalytics; 