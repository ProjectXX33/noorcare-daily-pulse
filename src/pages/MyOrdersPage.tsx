import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  Edit3
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  getMyOrderSubmissions, 
  getOrderStatistics,
  syncOrderStatusFromWooCommerce,
  syncAllOrderStatusesFromWooCommerce,
  retrySyncOrderToWooCommerce,
  OrderSubmission, 
  OrderSubmissionFilters,
  syncOrderFromWooCommerce
} from '@/lib/orderSubmissionsApi';
import EditOrderModal from '@/components/EditOrderModal';
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

const MyOrdersPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [orders, setOrders] = useState<OrderSubmission[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingOrderId, setSyncingOrderId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderSubmission | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [isEditOrderOpen, setIsEditOrderOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<OrderSubmission | null>(null);
  const [stats, setStats] = useState({
    total_orders: 0,
    total_revenue: 0,
    pending_orders: 0,
    processing_orders: 0,
    completed_orders: 0
  });

  // Filter states
  const [filters, setFilters] = useState<OrderSubmissionFilters>({
    search: '',
    status: '',
    date_from: '',
    date_to: ''
  });

  // Access control
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    
    // Allow both Customer Service users and admins
    if (user.position !== 'Customer Service' && user.role !== 'admin') {
      console.warn('Access denied: User is not Customer Service or Admin');
      navigate('/employee-dashboard', { replace: true });
      return;
    }
  }, [user, navigate]);

  // Fetch orders and statistics
  const fetchData = async (showRefreshMessage = false) => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    try {
      setIsRefreshing(showRefreshMessage);
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      const [ordersData, statsData] = await Promise.all([
        getMyOrderSubmissions(user.id, filters),
        getOrderStatistics(user.id, user.role === 'admin')
      ]);
      
      setOrders(ordersData);
      setFilteredOrders(ordersData);
      setStats(statsData);
      
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
    if (user && (user.position === 'Customer Service' || user.role === 'admin')) {
      fetchData();
    } else if (user) {
      // User is loaded but doesn't have access
      setIsLoading(false);
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
        order.billing_city.toLowerCase().includes(searchTerm)
      );
    }
    
    // Status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(order => order.status === filters.status);
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
      date_from: '',
      date_to: ''
    });
  };

  // Sync only this employee's orders with WooCommerce
  const handleSyncAllOrders = async () => {
    if (!user) return;
    
    try {
      setIsSyncing(true);
      toast.info(`📥 Starting enhanced sync for your orders...`);
      
      // Get only this user's orders that have WooCommerce IDs
      const myOrdersToSync = orders.filter(order => order.woocommerce_order_id);
      
      if (myOrdersToSync.length === 0) {
        toast.info('No WooCommerce orders found to sync');
        return;
      }
      
      let syncedCount = 0;
      let errorCount = 0;
      
      for (const order of myOrdersToSync) {
        try {
          const result = await syncOrderFromWooCommerce(order.id!);
          if (result.success) {
            syncedCount++;
            console.log(`✅ Synced order ${order.order_number}: ${result.updatedFields?.length || 0} fields updated`);
          } else {
            errorCount++;
          }
          
          // Small delay between syncs
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error syncing order ${order.order_number}:`, error);
          errorCount++;
        }
      }
      
      // Show results
      if (syncedCount > 0) {
        toast.success(`✅ Enhanced sync completed. ${syncedCount} of your orders synced from WooCommerce`);
      }
      if (errorCount > 0) {
        toast.warning(`⚠️ ${errorCount} orders had sync errors`);
      }
      
      // Refresh data to show updated statuses
      await fetchData();
      
    } catch (error) {
      console.error('Error syncing orders:', error);
      toast.error('Failed to sync orders with WooCommerce');
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync individual order with loading animation
  const handleSyncOrder = async (orderId: number) => {
    try {
      setSyncingOrderId(orderId);
      toast.info('📥 Syncing order from WooCommerce...');
      
      const result = await syncOrderFromWooCommerce(orderId);
      
      if (result.success) {
        if (result.updatedFields && result.updatedFields.length > 0) {
          toast.success(`✅ Order synced successfully. Updated fields: ${result.updatedFields.join(', ')}`);
        } else {
          toast.success('✅ Order is already up to date with WooCommerce');
        }
        // Refresh data to show updated status
        await fetchData();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error syncing order:', error);
      toast.error('Failed to sync order with WooCommerce');
    } finally {
      setSyncingOrderId(null);
    }
  };

  // Retry syncing failed order to WooCommerce
  const handleRetrySync = async (orderId: number) => {
    try {
      toast.info('Retrying WooCommerce sync...');
      
      const result = await retrySyncOrderToWooCommerce(orderId);
      
      if (result.success) {
        toast.success(result.message);
        // Refresh data to show updated order number
        await fetchData();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error retrying sync:', error);
      toast.error('Failed to retry sync with WooCommerce');
    }
  };

  // View order details
  const viewOrderDetails = (order: OrderSubmission) => {
    setSelectedOrder(order);
    setIsOrderDetailsOpen(true);
  };

  // Edit order
  const editOrder = (order: OrderSubmission) => {
    setOrderToEdit(order);
    setIsEditOrderOpen(true);
  };

  // Handle order updated
  const handleOrderUpdated = () => {
    fetchData(true);
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
  if (!user || (user.position !== 'Customer Service' && user.role !== 'admin')) {
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
          <p className="text-muted-foreground">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg p-4 md:p-6 text-white">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 md:gap-3">
              <SARIcon className="h-6 w-6 md:h-8 md:w-8" />
              My Orders
            </h1>
            <p className="mt-1 md:mt-2 text-emerald-100 text-sm md:text-base">
              View and manage your submitted orders
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => fetchData(true)} 
              disabled={isRefreshing || isSyncing}
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
            <Button 
              onClick={handleSyncAllOrders} 
              disabled={isRefreshing || isSyncing}
              variant="outline"
              className="bg-green-500/10 border-green-300/20 text-white hover:bg-green-500/20"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync from WooCommerce
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
              <Package className="h-8 w-8 text-emerald-600" />
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

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Customer name, phone, order #..."
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
          <CardTitle>Orders ({filteredOrders.length})</CardTitle>
          <CardDescription>
            {filteredOrders.length === orders.length 
              ? `Showing all ${orders.length} orders`
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
                  ? "You haven't created any orders yet. Start by creating your first order!"
                  : "Try adjusting your filters to find the orders you're looking for."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <Card key={order.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-3 sm:p-4">
                    {/* Mobile-First Layout */}
                    <div className="space-y-3">
                      {/* Header Row - Order Number, Status, and Amount */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-base sm:text-lg truncate">{order.order_number}</h3>
                            {getStatusBadge(order.status || 'pending')}
                          </div>
                          {order.is_synced_to_woocommerce && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs mt-1">
                              <span className="hidden sm:inline">Synced to WooCommerce</span>
                              <span className="sm:hidden">Synced</span>
                            </Badge>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg sm:text-2xl font-bold text-emerald-600 flex items-center gap-1">
                            <SARIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                            {order.total_amount.toFixed(2)}
                          </p>
                          {order.discount_amount && order.discount_amount > 0 && (
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Discount: -{order.discount_amount.toFixed(2)} SAR
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Customer Info Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{order.customer_first_name} {order.customer_last_name}</span>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{order.customer_phone}</span>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{order.billing_city}</span>
                        </div>
                      </div>
                      
                      {/* Date and Items Info */}
                      <div className="flex items-center justify-between gap-2 text-xs sm:text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">
                            {order.created_at && new Date(order.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          <span className="sm:hidden">
                            {order.created_at && new Date(order.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: '2-digit'
                            })}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                          {order.order_items.length} item{order.order_items.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100">
                        <Button
                          onClick={() => viewOrderDetails(order)}
                          variant="outline"
                          size="sm"
                          className="flex-1 sm:flex-none"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">View Details</span>
                          <span className="sm:hidden">Details</span>
                        </Button>

                        <Button
                          onClick={() => editOrder(order)}
                          variant="outline"
                          size="sm"
                          className="flex-1 sm:flex-none bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Edit Order</span>
                          <span className="sm:hidden">Edit</span>
                        </Button>
                        
                        {order.woocommerce_order_id && (
                          <Button
                            onClick={() => handleSyncOrder(order.id!)}
                            variant="outline"
                            size="sm"
                            disabled={syncingOrderId === order.id}
                            className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 disabled:opacity-50 flex-1 sm:flex-none"
                          >
                            {syncingOrderId === order.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-1" />
                            )}
                            <span className="hidden sm:inline">
                              {syncingOrderId === order.id ? 'Syncing...' : 'Sync from WooCommerce'}
                            </span>
                            <span className="sm:hidden">
                              {syncingOrderId === order.id ? 'Syncing...' : 'Sync'}
                            </span>
                          </Button>
                        )}
                        
                        {!order.is_synced_to_woocommerce && order.order_number?.startsWith('TEMP-') && (
                          <Button
                            onClick={() => handleRetrySync(order.id!)}
                            variant="outline"
                            size="sm"
                            className="bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700 flex-1 sm:flex-none"
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Retry Sync</span>
                            <span className="sm:hidden">Retry</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <div>
                      <Label className="text-sm font-medium">WooCommerce Sync</Label>
                      <div className="flex items-center gap-2 mt-1">
                        {selectedOrder.is_synced_to_woocommerce && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Synced
                          </Badge>
                        )}
                        {!selectedOrder.is_synced_to_woocommerce && selectedOrder.order_number?.startsWith('TEMP-') && (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            Needs Sync
                          </Badge>
                        )}
                        {selectedOrder.woocommerce_order_id && (
                          <Button
                            onClick={() => handleSyncOrder(selectedOrder.id!)}
                            variant="outline"
                            size="sm"
                            disabled={syncingOrderId === selectedOrder.id}
                            className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 disabled:opacity-50"
                          >
                            {syncingOrderId === selectedOrder.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-1" />
                            )}
                            {syncingOrderId === selectedOrder.id ? 'Syncing...' : ' Sync from WooCommerce'}
                          </Button>
                        )}
                        {!selectedOrder.is_synced_to_woocommerce && selectedOrder.order_number?.startsWith('TEMP-') && (
                          <Button
                            onClick={() => handleRetrySync(selectedOrder.id!)}
                            variant="outline"
                            size="sm"
                            className="bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700"
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Retry Sync
                          </Button>
                        )}
                      </div>
                    </div>
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
                      <span className="text-emerald-600">{selectedOrder.total_amount.toFixed(2)} SAR</span>
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

      {/* Edit Order Modal */}
      <EditOrderModal
        order={orderToEdit}
        isOpen={isEditOrderOpen}
        onClose={() => setIsEditOrderOpen(false)}
        onOrderUpdated={handleOrderUpdated}
      />
    </div>
  );
};

export default MyOrdersPage; 