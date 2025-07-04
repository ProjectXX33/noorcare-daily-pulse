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
  Award,
  Copy
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
import wooCommerceAPI from '@/lib/woocommerceApi';
import { supabase } from '@/lib/supabase';
import { syncOrderFromWooCommerce } from '@/lib/orderSubmissionsApi';
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
  const [syncingOrderId, setSyncingOrderId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderSubmission | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
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

  // Access control - Admin and Media Buyer only
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    
    // Only redirect if user is loaded and doesn't have access
    if (user.id && user.role !== 'admin' && user.position !== 'Media Buyer') {
      console.warn('Access denied: User is not admin or media buyer');
      navigate('/dashboard', { replace: true });
      return;
    }
  }, [user, navigate]);

  // Fetch orders and statistics (current month only)
  const fetchData = async (showRefreshMessage = false) => {
    try {
      setIsRefreshing(showRefreshMessage);
      
      // Get current month date range
      const now = new Date();
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      // Add current month filter to existing filters
      const monthlyFilters = {
        ...filters,
        date_from: startOfCurrentMonth.toISOString().split('T')[0], // YYYY-MM-DD format
        date_to: endOfCurrentMonth.toISOString().split('T')[0]
      };
      
      const [ordersData, statsData, csStatsData] = await Promise.all([
        getAllOrderSubmissions(monthlyFilters),
        getOrderStatistics(user?.id || '', true),
        getCustomerServiceOrderStats()
      ]);
      
      setOrders(ordersData);
      setFilteredOrders(ordersData);
      setStats(statsData);
      setCustomerServiceStats(csStatsData);
      
      if (showRefreshMessage) {
        const monthName = startOfCurrentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        toast.success(`${monthName} orders refreshed successfully (${ordersData.length} orders)`);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Bidirectional sync: Update WooCommerce when local order changes
  const syncOrderToWooCommerce = async (order: OrderSubmission) => {
    try {
      if (!order.woocommerce_order_id) {
        console.log('⚠️ Order has no WooCommerce ID, skipping sync');
        return;
      }

      console.log(`🔄 Syncing order ${order.order_number} back to WooCommerce...`);

      // Update WooCommerce order status and price
      // Fix email validation issue - provide default email if invalid or missing
      const isValidEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return email && emailRegex.test(email);
      };
      
      const validEmail = isValidEmail(order.customer_email || '') 
        ? order.customer_email 
        : 'customerservice@nooralqmar.com';

      const updateData = {
        status: order.status,
        total: order.total_amount.toString(),
        billing: {
          first_name: order.customer_first_name,
          last_name: order.customer_last_name,
          phone: order.customer_phone,
          email: validEmail,
          address_1: order.billing_address_1,
          city: order.billing_city,
          state: order.billing_state || '',
          country: order.billing_country || '',
          postcode: order.billing_postcode || ''
        }
      };

      // Use WooCommerce API to update the order
      const wooConfig = {
        url: import.meta.env.VITE_WOOCOMMERCE_URL || 'https://nooralqmar.com/',
        consumerKey: import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY || 'ck_dc373790e65a510998fbc7278cb12b987d90b04a',
        consumerSecret: import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET || 'cs_815de347330e130a58e3e53e0f87b0cd4f0de90f'
      };

      const response = await fetch(`${wooConfig.url}/wp-json/wc/v3/orders/${order.woocommerce_order_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${wooConfig.consumerKey}:${wooConfig.consumerSecret}`)}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        console.log(`✅ Successfully updated WooCommerce order ${order.order_number}`);
        toast.success(`✅ Order ${order.order_number} synced to WooCommerce`);
        
        // Update local record to mark as synced
        await supabase
          .from('order_submissions')
          .update({ 
            last_sync_attempt: new Date().toISOString(),
            is_synced_to_woocommerce: true,
            sync_error: null
          })
          .eq('id', order.id);
      } else {
        const error = await response.text();
        console.error(`❌ Failed to update WooCommerce order:`, error);
        toast.error(`❌ Failed to sync order ${order.order_number} to WooCommerce`);
        
        // Update local record with sync error
        await supabase
          .from('order_submissions')
          .update({ 
            last_sync_attempt: new Date().toISOString(),
            sync_error: error
          })
          .eq('id', order.id);
      }
    } catch (error) {
      console.error('❌ Error syncing to WooCommerce:', error);
      toast.error(`❌ Error syncing order to WooCommerce`);
    }
  };

  // Sync specific order FROM WooCommerce  
  const syncFromWooCommerce = async (order: OrderSubmission) => {
    try {
      setSyncingOrderId(order.id);
      
      if (!order.woocommerce_order_id) {
        toast.error('This order is not linked to WooCommerce');
        return;
      }

      console.log('🔄 Syncing order from WooCommerce:', order.order_number);
      toast.info('📥 Fetching latest data from WooCommerce...');
      
      // Use the enhanced sync function
      const result = await syncOrderFromWooCommerce(order.id);
      
      if (result.success) {
        if (result.updatedFields && result.updatedFields.length > 0) {
          toast.success(`✅ Order updated from WooCommerce. Updated fields: ${result.updatedFields.join(', ')}`);
        } else {
          toast.success('✅ Order is already up to date with WooCommerce');
        }
        
        // Refresh data to show updated information
        await fetchData(false);
      } else {
        toast.error(`❌ Failed to sync order: ${result.message}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to sync order from WooCommerce:', error);
      toast.error('Failed to sync order from WooCommerce');
    } finally {
      setSyncingOrderId(null);
    }
  };

  // Enhanced WooCommerce import sync (WooCommerce → Local only)
  const handleSync = async () => {
    try {
      setIsRefreshing(true);
      toast.info('📥 Starting WooCommerce import sync...');

      // Test WooCommerce connection first
      console.log('🔗 Testing WooCommerce connection...');
      const isConnected = await wooCommerceAPI.testConnection();
      if (!isConnected) {
        console.error('❌ WooCommerce connection failed');
        toast.error('❌ Failed to connect to WooCommerce. Please check your store credentials and connection.');
        return;
      }
      console.log('✅ WooCommerce connection successful');

      const syncStats = {
        new: 0,
        updated: 0,
        errors: 0,
        skipped: 0
      };

      // Import WooCommerce orders to Local
      toast.info('📥 Importing WooCommerce orders and updates...');
      console.log('📦 Fetching recent WooCommerce orders...');
      
      // Get current month's date range
      const now = new Date();
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      console.log(`📅 Syncing orders for current month: ${startOfCurrentMonth.toISOString()} to ${endOfCurrentMonth.toISOString()}`);

      // Fetch orders with all statuses (WooCommerce doesn't support 'any', so we need multiple calls)
      console.log('📦 Fetching orders with multiple status calls...');
      const statusesToSync = ['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed'];
      let allWooOrders: any[] = [];
      
      for (const status of statusesToSync) {
        try {
          console.log(`📦 Fetching ${status} orders...`);
          const statusOrders = await wooCommerceAPI.fetchOrders({
            per_page: 100,
            status: status,
            after: startOfCurrentMonth.toISOString(),
            before: endOfCurrentMonth.toISOString()
          });
          allWooOrders.push(...statusOrders);
          console.log(`✅ Found ${statusOrders.length} ${status} orders`);
          
          // Small delay between status calls
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (statusError) {
          console.error(`❌ Error fetching ${status} orders:`, statusError);
          // Continue with other statuses
        }
      }
      
      const wooOrders = allWooOrders;

      console.log(`📊 Found ${wooOrders.length} WooCommerce orders`);

      // Process each WooCommerce order
      for (const wooOrder of wooOrders) {
        try {
          // Check if order already exists in our system
                      const { data: existingOrder, error: checkError } = await supabase
              .from('order_submissions')
              .select('id, order_number, status, total_amount, updated_at, created_at')
              .eq('woocommerce_order_id', wooOrder.id)
              .maybeSingle();

            if (checkError) {
              console.error(`❌ Error checking existing order ${wooOrder.id}:`, checkError);
              syncStats.errors++;
              continue;
            }

            if (existingOrder) {
              // Order exists - check if it needs updating
              const wooStatus = wooOrder.status === 'completed' ? 'completed' : 
                               wooOrder.status === 'processing' ? 'processing' : 
                               wooOrder.status === 'cancelled' ? 'cancelled' : 'pending';
              
              const wooTotal = parseFloat(wooOrder.total);
              const lastModified = new Date(wooOrder.date_modified);
              const localLastUpdate = new Date(existingOrder.updated_at || existingOrder.created_at);

                          if (existingOrder.status !== wooStatus || 
                  Math.abs(existingOrder.total_amount - wooTotal) > 0.01 ||
                  lastModified > localLastUpdate) {
                
                console.log(`🔄 Updating existing order: ${wooOrder.number}`);
                
                const { error: updateError } = await supabase
                  .from('order_submissions')
                  .update({
                    status: wooStatus,
                    total_amount: wooTotal,
                    subtotal: wooTotal - parseFloat(wooOrder.shipping_total || '0') - parseFloat(wooOrder.total_tax || '0'),
                    shipping_amount: parseFloat(wooOrder.shipping_total || '0'),
                    payment_method: wooOrder.payment_method_title,
                    updated_at: new Date().toISOString(),
                    is_synced_to_woocommerce: true
                  })
                  .eq('id', existingOrder.id);

                if (updateError) {
                  console.error(`❌ Failed to update order ${wooOrder.number}:`, updateError);
                  syncStats.errors++;
                } else {
                  console.log(`✅ Updated order ${wooOrder.number}`);
                  syncStats.updated++;
                }
              } else {
                console.log(`⚠️ Order ${wooOrder.number} is already up to date`);
                syncStats.skipped++;
              }
              continue;
          }

          console.log(`🆕 New order found: ${wooOrder.number} (WooCommerce ID: ${wooOrder.id})`);
          
          // Create new order submission from WooCommerce data
          const orderData = {
            woocommerce_order_id: wooOrder.id,
            order_number: wooOrder.number,
            customer_first_name: wooOrder.billing.first_name,
            customer_last_name: wooOrder.billing.last_name,
            customer_phone: wooOrder.billing.phone || '',
            customer_email: wooOrder.billing.email || '',
            billing_address_1: wooOrder.billing.address_1,
            billing_address_2: wooOrder.billing.address_2 || '',
            billing_city: wooOrder.billing.city,
            billing_state: wooOrder.billing.state || '',
            billing_country: wooOrder.billing.country || '',
            billing_postcode: wooOrder.billing.postcode || '',
            total_amount: parseFloat(wooOrder.total),
            subtotal: parseFloat(wooOrder.total) - parseFloat(wooOrder.shipping_total || '0') - parseFloat(wooOrder.total_tax || '0'),
            shipping_amount: parseFloat(wooOrder.shipping_total || '0'),
            payment_method: wooOrder.payment_method_title,
            status: wooOrder.status === 'completed' ? 'completed' : 
                   wooOrder.status === 'processing' ? 'processing' : 
                   wooOrder.status === 'cancelled' ? 'cancelled' : 'pending',
            order_items: wooOrder.line_items.map(item => ({
              product_id: item.product_id,
              product_name: item.name,
              quantity: item.quantity,
              price: item.price.toString(),
              sku: item.sku || ''
            })),
            created_by_name: 'WooCommerce Import',
            is_synced_to_woocommerce: true,
            created_at: wooOrder.date_created,
            updated_at: wooOrder.date_modified
          };

          const { data: insertedData, error: insertError } = await supabase
            .from('order_submissions')
            .insert(orderData)
            .select();

                      if (insertError) {
              console.error(`❌ Failed to import order ${wooOrder.number}:`, insertError);
              syncStats.errors++;
            } else {
              console.log(`✅ Successfully imported order ${wooOrder.number}`);
              syncStats.new++;
            }

            // Small delay to prevent overwhelming the database
            await new Promise(resolve => setTimeout(resolve, 50));

          } catch (orderError) {
            console.error(`❌ Error processing WooCommerce order ${wooOrder.id}:`, orderError);
            syncStats.errors++;
          }
        }

        // Final status report
        const totalNew = syncStats.new;
        const totalUpdated = syncStats.updated;
        const totalSkipped = syncStats.skipped;
        const totalErrors = syncStats.errors;

        let message = `🎉 WooCommerce Import Complete!\n`;
        if (totalNew > 0) message += `📥 ${totalNew} new orders imported\n`;
        if (totalUpdated > 0) message += `🔄 ${totalUpdated} orders updated\n`;
        if (totalSkipped > 0) message += `⏭️ ${totalSkipped} orders already up to date\n`;
        if (totalErrors > 0) message += `⚠️ ${totalErrors} errors occurred`;

        if (totalErrors > 0) {
          toast.warning(message);
        } else {
          toast.success(message);
        }

        console.log('📊 Import Statistics:', syncStats);

      // Update last sync time
      setLastSyncTime(new Date());

      // Refresh local data
      await fetchData(false);
      
    } catch (error) {
      console.error('❌ Error in WooCommerce sync:', error);
      toast.error('Failed to sync with WooCommerce');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-sync functionality
  useEffect(() => {
    if (!autoSyncEnabled || !user || (user.role !== 'admin' && user.position !== 'Media Buyer')) return;

    const autoSyncInterval = setInterval(() => {
      console.log('🔄 Auto-sync triggered');
      handleSync();
    }, 24 * 60 * 60 * 1000); // Every 24 hours

    return () => clearInterval(autoSyncInterval);
  }, [autoSyncEnabled, user]);

  // Initial data load
  useEffect(() => {
    if (user && (user.role === 'admin' || user.position === 'Media Buyer')) {
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

  // Copy order information in Arabic format
  const copyOrderInArabic = async (order: OrderSubmission) => {
    try {
      // Get payment method in Arabic
      const getPaymentMethodArabic = (method: string) => {
        switch (method?.toLowerCase()) {
          case 'cod':
            return 'الدفع عند الاستلام (COD)';
          case 'bank_transfer':
            return 'تحويل بنكي';
          case 'credit_card':
            return 'بطاقة ائتمان';
          default:
            return 'الدفع عند الاستلام (COD)';
        }
      };

      // Format the Arabic order invoice
      const arabicOrderText = `🌙 نور القمر – فاتورة الطلب

رقم الطلب: #${order.order_number}
اسم العميل: ${order.customer_first_name} ${order.customer_last_name}
رقم الهاتف: ${order.customer_phone}
العنوان: ${order.billing_address_1}${order.billing_address_2 ? ` - ${order.billing_address_2}` : ''}
المدينة: ${order.billing_city}
الدولة: ${order.billing_country}
طريقة الدفع: ${getPaymentMethodArabic(order.payment_method)}

🛒 تفاصيل الطلب:
${order.order_items.map(item => 
`المنتج: ${item.product_name}
الكمية: ${item.quantity}`
).join('\n\n')}

💰 إجمالي الطلب:
${order.total_amount.toFixed(0)} ريال سعودي`;

      // Copy to clipboard
      await navigator.clipboard.writeText(arabicOrderText);
      toast.success('تم نسخ تفاصيل الطلب بالعربية!', {
        description: 'Order details copied in Arabic format',
      });
    } catch (error) {
      console.error('Failed to copy order details:', error);
      toast.error('فشل في نسخ تفاصيل الطلب', {
        description: 'Failed to copy order details',
      });
    }
  };

  // Don't render if user doesn't have access
  if (!user || (user.role !== 'admin' && user.position !== 'Media Buyer')) {
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
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 rounded-lg p-4 md:p-6 text-white">
        <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 md:gap-3">
              <SARIcon className="h-6 w-6 md:h-8 md:w-8" />
              Total Orders - {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h1>
            <p className="mt-1 md:mt-2 text-purple-100 dark:text-purple-200 text-sm md:text-base">
              Admin dashboard - Current month order submissions ({orders.length} orders)
            </p>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-2 w-full sm:w-auto sm:items-center sm:justify-end mt-3 sm:mt-0">
            <Button
              onClick={() => setViewMode(viewMode === 'orders' ? 'stats' : 'orders')}
              variant="outline"
              className="bg-white/10 dark:bg-white/20 border-white/20 dark:border-white/30 text-white hover:bg-white/20 dark:hover:bg-white/30 w-full sm:w-auto"
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
              onClick={handleSync}
              disabled={isRefreshing}
              variant="outline"
              className="bg-white/10 dark:bg-white/20 border-white/20 dark:border-white/30 text-white hover:bg-white/20 dark:hover:bg-white/30 hover:scale-105 transition-all duration-200 w-full sm:w-auto px-4 py-2 flex items-center justify-center text-base gap-2"
            >
              <span className="block text-center">Sync</span>
              {isRefreshing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <RefreshCw className="h-5 w-5" />
              )}
            </Button>
            <Button
              onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
              variant="outline"
              className={`border-white/20 dark:border-white/30 text-white hover:scale-105 transition-all duration-200 w-full sm:w-auto ${
                autoSyncEnabled
                  ? 'bg-green-500/20 dark:bg-green-400/30 hover:bg-green-500/30 dark:hover:bg-green-400/40 border-green-400/50 dark:border-green-300/50'
                  : 'bg-white/10 dark:bg-white/20 hover:bg-white/20 dark:hover:bg-white/30'
              }`}
            >
              {autoSyncEnabled ? '🟢 Auto-Import ON' : '⚪ Auto-Import OFF'}
            </Button>
            {lastSyncTime && (
              <div className="text-white/80 dark:text-white/90 text-sm bg-white/10 dark:bg-white/20 px-3 py-2 rounded-md w-full sm:w-auto text-center">
                Last sync: {lastSyncTime.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sync Status Info */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">WooCommerce Import Status</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {isRefreshing 
                    ? '📥 Importing from WooCommerce...' 
                    : autoSyncEnabled 
                      ? '✅ Auto-import enabled (every 24 hours)' 
                      : '⏸️ Manual import only'
                  }
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {lastSyncTime ? 'Last Sync' : 'Never Synced'}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                {lastSyncTime ? lastSyncTime.toLocaleDateString() : 'Click sync to start'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
                              <p className="text-lg sm:text-2xl font-bold text-purple-600 flex items-center gap-1">
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
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
                            <div className="flex items-center gap-2 min-w-0">
                              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium text-purple-600 truncate">{order.created_by_name}</span>
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
                              onClick={() => copyOrderInArabic(order)}
                              variant="outline"
                              size="sm"
                              className="bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border-purple-300 hover:from-purple-100 hover:to-purple-150 hover:border-purple-400 flex-1 sm:flex-none font-medium shadow-sm"
                            >
                              <Copy className="h-4 w-4 mr-1 text-purple-600" />
                              <span className="hidden sm:inline">Copy Arabic</span>
                              <span className="sm:hidden">📋 نسخ</span>
                            </Button>
                            
                            {order.woocommerce_order_id && (
                              <Button
                                onClick={() => syncFromWooCommerce(order)}
                                variant="outline"
                                size="sm"
                                disabled={syncingOrderId === order.id}
                                className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 disabled:opacity-50 flex-1 sm:flex-none"
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

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => copyOrderInArabic(selectedOrder)}
                  variant="outline"
                  className="bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border-purple-300 hover:from-purple-100 hover:to-purple-150 hover:border-purple-400 font-medium shadow-sm px-6 py-2"
                >
                  <Copy className="h-4 w-4 mr-2 text-purple-600" />
                  Copy Order in Arabic
                </Button>
                <Button
                  onClick={() => setIsOrderDetailsOpen(false)}
                  variant="outline"
                  className="px-6 py-2"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTotalOrdersPage; 