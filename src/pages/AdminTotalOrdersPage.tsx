import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  ShoppingCart, 
  Search, 
  Eye, 
  Calendar,
  Filter,
  Package,
  Phone,
  MapPin,
  User,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  Award
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  getAllOrderSubmissions, 
  getOrderStatistics,
  getCustomerServiceOrderStats,
  OrderSubmission, 
  OrderSubmissionFilters 
} from '@/lib/orderSubmissionsApi';
// Remove date-fns dependency and use built-in date formatting

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

const AdminTotalOrdersPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [orders, setOrders] = useState<OrderSubmission[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderSubmission | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [stats, setStats] = useState({
    total_orders: 0,
    total_revenue: 0,
    pending_orders: 0,
    processing_orders: 0,
    completed_orders: 0
  });
  const [customerServiceStats, setCustomerServiceStats] = useState<{
    user_id: string;
    user_name: string;
    order_count: number;
    total_revenue: number;
  }[]>([]);

  // Filter states
  const [filters, setFilters] = useState<OrderSubmissionFilters>({
    search: '',
    status: '',
    customer_service_name: '',
    date_from: '',
    date_to: ''
  });

  // View mode
  const [viewMode, setViewMode] = useState<'orders' | 'stats'>('orders');

  // Access control - Admin only
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    
    if (user.role !== 'admin') {
      console.warn('Access denied: User is not admin');
      navigate('/dashboard', { replace: true });
      return;
    }
  }, [user, navigate]);

  // Fetch orders and statistics
  const fetchData = async (showRefreshMessage = false) => {
    try {
      setIsRefreshing(showRefreshMessage);
      
      const [ordersData, statsData, csStatsData] = await Promise.all([
        getAllOrderSubmissions(filters),
        getOrderStatistics(user?.id || '', true),
        getCustomerServiceOrderStats()
      ]);
      
      setOrders(ordersData);
      setFilteredOrders(ordersData);
      setStats(statsData);
      setCustomerServiceStats(csStatsData);
      
      if (showRefreshMessage) {
        toast.success('Orders refreshed successfully');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial data load
  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchData();
    }
  }, [user]);

  // Apply filters
  useEffect(() => {
    let filtered = [...orders];
    
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(order =>
        order.customer_first_name.toLowerCase().includes(searchTerm) ||
        order.customer_last_name.toLowerCase().includes(searchTerm) ||
        order.customer_phone.includes(searchTerm) ||
        order.order_number?.toLowerCase().includes(searchTerm) ||
        order.billing_city.toLowerCase().includes(searchTerm) ||
        order.created_by_name?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(order => order.status === filters.status);
    }
    
    // Customer service filter
    if (filters.customer_service_name) {
      filtered = filtered.filter(order => 
        order.created_by_name?.toLowerCase().includes(filters.customer_service_name!.toLowerCase())
      );
    }
    
    // Date range filter
    if (filters.date_from) {
      filtered = filtered.filter(order => 
        new Date(order.created_at || '') >= new Date(filters.date_from!)
      );
    }
    
    if (filters.date_to) {
      filtered = filtered.filter(order => 
        new Date(order.created_at || '') <= new Date(filters.date_to!)
      );
    }
    
    setFilteredOrders(filtered);
  }, [orders, filters]);

  // Handle filter changes
  const handleFilterChange = (key: keyof OrderSubmissionFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      customer_service_name: '',
      date_from: '',
      date_to: ''
    });
  };

  // View order details
  const viewOrderDetails = (order: OrderSubmission) => {
    setSelectedOrder(order);
    setIsOrderDetailsOpen(true);
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Processing</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Don't render if user doesn't have access
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading all orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 md:p-6 text-white">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 md:gap-3">
              <SARIcon className="h-6 w-6 md:h-8 md:w-8" />
              Total Orders
            </h1>
            <p className="mt-1 md:mt-2 text-purple-100 text-sm md:text-base">
              Admin dashboard - All customer service order submissions
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setViewMode(viewMode === 'orders' ? 'stats' : 'orders')}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              {viewMode === 'orders' ? (
                <>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Stats
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  View Orders
                </>
              )}
            </Button>
            <Button 
              onClick={() => fetchData(true)} 
              disabled={isRefreshing}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{stats.total_orders}</p>
              </div>
              <Package className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{stats.total_revenue.toFixed(2)} SAR</p>
              </div>
              <SARIcon className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending_orders}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Processing</p>
                <p className="text-2xl font-bold text-blue-600">{stats.processing_orders}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed_orders}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {viewMode === 'stats' ? (
        /* Customer Service Statistics */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Customer Service Performance
            </CardTitle>
            <CardDescription>
              Order statistics by customer service representatives
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Customer Service Rep</TableHead>
                    <TableHead className="text-center">Total Orders</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                    <TableHead className="text-right">Average Order Value</TableHead>
                    <TableHead>Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerServiceStats.map((stat, index) => {
                    const avgOrderValue = stat.order_count > 0 ? stat.total_revenue / stat.order_count : 0;
                    const isTopPerformer = index < 3;
                    
                    return (
                      <TableRow key={stat.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">#{index + 1}</span>
                            {index === 0 && <Award className="h-4 w-4 text-yellow-500" />}
                            {index === 1 && <Award className="h-4 w-4 text-gray-400" />}
                            {index === 2 && <Award className="h-4 w-4 text-amber-600" />}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{stat.user_name}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={isTopPerformer ? 'bg-green-50 text-green-700 border-green-200' : ''}>
                            {stat.order_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {stat.total_revenue.toFixed(2)} SAR
                        </TableCell>
                        <TableCell className="text-right">
                          {avgOrderValue.toFixed(2)} SAR
                        </TableCell>
                        <TableCell>
                          {isTopPerformer ? (
                            <Badge className="bg-green-100 text-green-800 border-green-300">
                              Top Performer
                            </Badge>
                          ) : (
                            <Badge variant="outline">Standard</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {customerServiceStats.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No customer service statistics available</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Advanced Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Customer, phone, order #..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="customer_service">Customer Service Rep</Label>
                  <Input
                    id="customer_service"
                    placeholder="Rep name..."
                    value={filters.customer_service_name}
                    onChange={(e) => handleFilterChange('customer_service_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="date_from">From Date</Label>
                  <Input
                    id="date_from"
                    type="date"
                    value={filters.date_from}
                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="date_to">To Date</Label>
                  <Input
                    id="date_to"
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Orders List */}
          <Card>
            <CardHeader>
              <CardTitle>All Orders ({filteredOrders.length})</CardTitle>
              <CardDescription>
                {filteredOrders.length === orders.length 
                  ? `Showing all ${orders.length} orders from all customer service representatives`
                  : `Showing ${filteredOrders.length} of ${orders.length} orders`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredOrders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-2">No orders found</p>
                  <p className="text-sm text-muted-foreground">
                    {orders.length === 0 
                      ? "No orders have been created yet."
                      : "Try adjusting your filters to find the orders you're looking for."
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((order) => (
                    <Card key={order.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-lg">{order.order_number}</h3>
                              {getStatusBadge(order.status || 'pending')}
                              {order.is_synced_to_woocommerce && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  Synced to WooCommerce
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span>{order.customer_first_name} {order.customer_last_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{order.customer_phone}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{order.billing_city}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-purple-600">{order.created_by_name}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {order.created_at && new Date(order.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                              <span className="flex items-center gap-1">
                                <Package className="h-4 w-4" />
                                {order.order_items.length} items
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col md:items-end space-y-2">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-purple-600">
                                {order.total_amount.toFixed(2)} SAR
                              </p>
                              {order.discount_amount && order.discount_amount > 0 && (
                                <p className="text-sm text-muted-foreground">
                                  Discount: -{order.discount_amount.toFixed(2)} SAR
                                </p>
                              )}
                            </div>
                            <Button
                              onClick={() => viewOrderDetails(order)}
                              variant="outline"
                              size="sm"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Order Details Modal */}
      <Dialog open={isOrderDetailsOpen} onOpenChange={setIsOrderDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Details - {selectedOrder?.order_number}
            </DialogTitle>
            <DialogDescription>
              Complete order information and customer details
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Name</Label>
                      <p>{selectedOrder.customer_first_name} {selectedOrder.customer_last_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Phone</Label>
                      <p>{selectedOrder.customer_phone}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Address</Label>
                      <p>
                        {selectedOrder.billing_address_1}
                        {selectedOrder.billing_address_2 && `, ${selectedOrder.billing_address_2}`}
                        <br />
                        {selectedOrder.billing_city}, {selectedOrder.billing_state}
                        <br />
                        {selectedOrder.billing_postcode} {selectedOrder.billing_country}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Order Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Order Number</Label>
                      <p>{selectedOrder.order_number}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Status</Label>
                      <div className="mt-1">{getStatusBadge(selectedOrder.status || 'pending')}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Created</Label>
                      <p>{selectedOrder.created_at && new Date(selectedOrder.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Payment Method</Label>
                      <p>{selectedOrder.payment_method === 'cod' ? 'Cash on Delivery' : selectedOrder.payment_method}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer Service</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Created by</Label>
                      <p className="font-medium text-purple-600">{selectedOrder.created_by_name}</p>
                    </div>
                    {selectedOrder.is_synced_to_woocommerce && (
                      <div>
                        <Label className="text-sm font-medium">WooCommerce Sync</Label>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 ml-2">
                          Synced
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedOrder.order_items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{item.product_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            SKU: {item.sku || 'N/A'} | Quantity: {item.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{parseFloat(item.price).toFixed(2)} SAR</p>
                          <p className="text-sm text-muted-foreground">
                            Total: {(parseFloat(item.price) * item.quantity).toFixed(2)} SAR
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{selectedOrder.subtotal.toFixed(2)} SAR</span>
                    </div>
                    {selectedOrder.discount_amount && selectedOrder.discount_amount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount ({selectedOrder.coupon_code}):</span>
                        <span>-{selectedOrder.discount_amount.toFixed(2)} SAR</span>
                      </div>
                    )}
                    {selectedOrder.shipping_amount && selectedOrder.shipping_amount > 0 && (
                      <div className="flex justify-between">
                        <span>Shipping:</span>
                        <span>{selectedOrder.shipping_amount.toFixed(2)} SAR</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span className="text-purple-600">{selectedOrder.total_amount.toFixed(2)} SAR</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Notes */}
              {selectedOrder.customer_note && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{selectedOrder.customer_note}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTotalOrdersPage; 