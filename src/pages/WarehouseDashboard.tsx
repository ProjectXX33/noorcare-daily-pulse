import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  Edit3,
  RefreshCw,
  LogOut,
  Filter,
  Search,
  FileText,
  Calendar as LucideCalendar,
  Copy,
  Info,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Hash,
  BarChart2,
  DollarSign,
  Target,
  Download,
  CreditCard
} from 'lucide-react';
import { OrderStatus, OrderNote, OrderStatusHistory } from '@/types';
import { OrderSubmission, OrderItem, getAllOrderSubmissions } from '@/lib/orderSubmissionsApi';
import { supabase } from '@/integrations/supabase/client';
import { getShippingStats, ShippingStats } from '@/lib/shippingService';
import wooCommerceAPI from '@/lib/woocommerceApi';
import { useAutoSync } from '@/hooks/useAutoShiftsCalculation';
import NotificationsMenu from '@/components/NotificationsMenu';
import { createNotification } from '@/lib/notifications';
import { playNotificationSound } from '@/lib/notifications';
import Lottie from 'lottie-react';

// Riyal SVG Icon
const RiyalIcon = ({ className }: { className?: string }) => (
  <svg
    className={className || 'riyal-svg'}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1124.14 1256.39"
    width="14"
    height="15.432"
    style={{ display: 'inline-block', verticalAlign: '-0.125em' }}
  >
    <path fill="currentColor" d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
    <path fill="currentColor" d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
  </svg>
);

// Date formatting utilities - Use WooCommerce dates exactly as they are
const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    // Use WooCommerce date exactly as it comes, just format it nicely
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    // Use WooCommerce date exactly as it comes
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

const formatTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    // Use WooCommerce time exactly as it comes
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return dateString;
  }
};

const WarehouseDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  
  // Auto-sync is handled by local functions below
  // useAutoSync(); // Disabled to avoid conflicts with local sync

  const [orders, setOrders] = useState<OrderSubmission[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderSubmission | null>(null);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
  const [isStatusUpdateOpen, setIsStatusUpdateOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus>('pending');
  const [statusReason, setStatusReason] = useState('');
  const [newNote, setNewNote] = useState('');
  const [shippingMethod, setShippingMethod] = useState<string>('SMSA');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [orderNotes, setOrderNotes] = useState<OrderNote[]>([]);
  const [statusHistory, setStatusHistory] = useState<OrderStatusHistory[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [shippingStats, setShippingStats] = useState<ShippingStats[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncNewOrders, setLastSyncNewOrders] = useState(0);
  const [autoSyncActive, setAutoSyncActive] = useState(false);
  const [lastAutoSyncTime, setLastAutoSyncTime] = useState<Date | null>(null);
  const syncIntervalRef = useRef<{ newOrders: NodeJS.Timeout; regular: NodeJS.Timeout } | null>(null);
  const [isFixingImages, setIsFixingImages] = useState(false);
  const [syncAnimationData, setSyncAnimationData] = useState<any>(null);
  
  // New order highlighting system
  const [newOrderHighlights, setNewOrderHighlights] = useState<Map<number, number>>(new Map());

  // Function to highlight new order until user interacts with it
  const highlightNewOrder = (orderId: number) => {
    const timestamp = Date.now();
    setNewOrderHighlights(prev => new Map(prev).set(orderId, timestamp));
    console.log(`✨ Order ${orderId} highlighted as new - will remain until user interaction`);
  };

  // Function to remove highlight when user interacts with order
  const removeOrderHighlight = (orderId: number) => {
    setNewOrderHighlights(prev => {
      const newMap = new Map(prev);
      const wasHighlighted = newMap.delete(orderId);
      if (wasHighlighted) {
        console.log(`🎯 Order ${orderId} highlight removed due to user interaction`);
      }
      return newMap;
    });
  };

  // Check if order should be highlighted
  const isOrderHighlighted = (orderId: number) => {
    return newOrderHighlights.has(orderId);
  };



  // Load orders and shipping stats on component mount
  useEffect(() => {
    loadOrders();
    loadShippingStats();
    
    // Start automatic WooCommerce sync immediately
    console.log('🚀 Starting automatic WooCommerce sync system...');
    startPeriodicWooCommerceSync();
    
    // Run initial sync after 10 seconds to allow component to fully load
    setTimeout(() => {
      console.log('🔄 Running initial WooCommerce sync...');
      syncFromWooCommerce(false); // false = automatic sync, not manual
      syncNewOrdersFromWooCommerce(); // Also check for new orders immediately
    }, 10000);
    
    // Request notification permission for better new order alerts
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          toast.success('🔔 Browser notifications enabled!', {
            description: 'You will receive notifications for new WooCommerce orders'
          });
        }
      });
    }
    
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current.newOrders);
        clearInterval(syncIntervalRef.current.regular);
      }
    };
  }, []);

  // Load animation data for sync box
  useEffect(() => {
    fetch('/animation/box.json')
      .then(response => response.json())
      .then(data => setSyncAnimationData(data))
      .catch(error => {
        console.error('Failed to load box.json:', error);
        setSyncAnimationData(null);
      });
  }, []);

  // Set up real-time subscription for order updates
  useEffect(() => {
    console.log('🔔 Setting up real-time order subscriptions...');
    
    const subscription = supabase
      .channel('warehouse_order_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_submissions' },
        (payload) => {
          console.log('📡 Real-time order update received:', payload);
          
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          
          // Check if this is a new order (INSERT event)
          const isNewOrder = payload.eventType === 'INSERT';
          // Check if this is a status change (UPDATE event with status change)
          const statusChanged = payload.eventType === 'UPDATE' && 
                               oldRecord?.status !== newRecord?.status;
          
          if (statusChanged || isNewOrder) {
            // Only show notification for actual status changes or new orders
            if (statusChanged) {
              // Map WooCommerce status to display status for notifications
              const getDisplayStatus = (status: string) => {
                const statusMap: { [key: string]: string } = {
                  'completed': 'delivered',
                  'processing': 'processing',
                  'shipped': 'shipped',
                  'cancelled': 'cancelled',
                  'refunded': 'refunded',
                  'on-hold': 'on-hold',
                  'pending': 'pending'
                };
                return statusMap[status] || status;
              };
              
              const oldDisplayStatus = getDisplayStatus(oldRecord?.status || 'unknown');
              const newDisplayStatus = getDisplayStatus(newRecord?.status || 'unknown');
              
              // Enhanced notification for status changes
              toast.success(`📦 Order Status Updated`, {
                description: `Order ${newRecord.order_number || `#${newRecord.id}`}: ${oldDisplayStatus} → ${newDisplayStatus}`,
                duration: 8000,
                action: {
                  label: "View Order",
                  onClick: () => {
                    // Find and open the order
                    const order = orders.find(o => o.id === newRecord.id);
                    if (order) openOrderDetail(order);
                  }
                },
                className: "border-blue-200 bg-blue-50 text-blue-900",
                style: {
                  background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
                  borderColor: "#93c5fd"
                }
              });
            
              // Play notification sound
              const audio = new Audio('/notification-sound.mp3');
              audio.volume = 0.6;
              audio.play().catch(console.error);
            }
            
            if (isNewOrder) {
              // Just play notification sound - the full notification is handled by syncNewOrdersFromWooCommerce
              const audio = new Audio('/notification-sound.mp3');
              audio.volume = 0.8;
              audio.play().catch(console.error);
            }
            
            // Refresh orders and stats
            loadOrders();
            loadShippingStats();
          } else {
            // This is just a sync update, don't show notification
            console.log('📡 Sync update received, no notification needed');
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [orders]); // Add orders dependency to access current orders in the callback

  // Filter orders when search term or status filter changes
  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter]);

  const startPeriodicWooCommerceSync = () => {
    console.log('⏰ Setting up automatic sync intervals...');
    
    // Sync for new orders every 5 minutes
    const newOrderSyncInterval = setInterval(() => {
      console.log('🔍 Auto-checking for new WooCommerce orders...');
      syncNewOrdersFromWooCommerce();
    }, 300000); // 5 minutes (300,000 milliseconds)

    // Regular sync every 5 minutes for status updates
    const regularSyncInterval = setInterval(() => {
      console.log('🔄 Auto-syncing WooCommerce status updates...');
      syncFromWooCommerce(false); // false = automatic sync
    }, 300000); // 5 minutes (300,000 milliseconds)

    // Store both intervals for cleanup
    syncIntervalRef.current = {
      newOrders: newOrderSyncInterval,
      regular: regularSyncInterval
    };
    
    console.log('✅ Automatic sync intervals set: New orders every 5 minutes, Status updates every 5 minutes');
    setAutoSyncActive(true);
    setLastAutoSyncTime(new Date());
  };

  // New function specifically for checking new orders immediately
  const syncNewOrdersFromWooCommerce = async () => {
    try {
      setIsSyncing(true);
      console.log('🔍 Checking for new WooCommerce orders...');
      
      // Get the latest order from our database to compare
      const { data: latestLocalOrder, error: latestError } = await supabase
        .from('order_submissions')
        .select('woocommerce_order_id, created_at')
        .not('woocommerce_order_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestError && latestError.code !== 'PGRST116') {
        console.error('Error getting latest local order:', latestError);
        return;
      }

             // Get recent orders from WooCommerce (all statuses, last 20 orders)
       const recentWooOrders = await wooCommerceAPI.fetchOrders({
         per_page: 20,
         status: 'any' // Fetch all statuses to catch new orders
       });

      let newOrdersFound = 0;

      for (const wooOrder of recentWooOrders) {
        // Check if this order already exists in our database
        const { data: existingOrder, error: checkError } = await supabase
          .from('order_submissions')
          .select('id')
          .eq('woocommerce_order_id', wooOrder.id)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking existing order:', checkError);
          continue;
        }

        // If order doesn't exist, import it immediately
        if (!existingOrder) {
          try {
            const newOrderData = await importWooCommerceOrder(wooOrder);
            newOrdersFound++;
            
            // Highlight the new order for 2 minutes
            if (newOrderData && newOrderData.id) {
              highlightNewOrder(newOrderData.id);
            }
            
            // Individual notifications removed to avoid duplicates - bulk notification handled later
            
            // Play notification sound for new order
            try {
              const audio = new Audio('/notification-sound.mp3');
              audio.volume = 0.8;
              audio.play().catch(() => {}); // Ignore if sound fails
            } catch (e) {}

          } catch (error) {
            console.error(`Error importing new WooCommerce order ${wooOrder.id}:`, error);
          }
        }

        // Stop checking if we've gone past our latest local order (but only if we have a latest order)
        if (latestLocalOrder && wooOrder.id <= latestLocalOrder.woocommerce_order_id) {
          break;
        }
        
        // Also check by date - don't import orders older than 7 days
        const orderDate = new Date(wooOrder.date_created);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        if (orderDate < sevenDaysAgo) {
          break;
        }
      }

      if (newOrdersFound > 0) {
        console.log(`✅ Found and imported ${newOrdersFound} new orders from WooCommerce`);
        setLastSyncNewOrders(newOrdersFound);
        
        // Notify warehouse users about new orders
        const recentOrders = recentWooOrders.slice(0, newOrdersFound);
        await notifyWarehouseAboutNewOrders(newOrdersFound, recentOrders);
        
        // Refresh the orders list to show new orders
        loadOrders();
      } else {
        setLastSyncNewOrders(0);
      }
      
      setLastAutoSyncTime(new Date());

    } catch (error) {
      console.error('Error checking for new WooCommerce orders:', error);
      await notifyAdminsAboutSyncIssues(error instanceof Error ? error.message : 'Unknown sync error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Function to import a WooCommerce order into our database
  const importWooCommerceOrder = async (wooOrder: any) => {
    const orderData = {
      woocommerce_order_id: wooOrder.id,
      order_number: `#${wooOrder.number}`,
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
      status: wooOrder.status === 'completed' ? 'delivered' : 
             wooOrder.status === 'processing' ? 'processing' : 
             wooOrder.status === 'shipped' ? 'shipped' :
             wooOrder.status === 'cancelled' ? 'cancelled' : 'pending',
      woocommerce_status: wooOrder.status, // Store raw WooCommerce status
      order_items: await Promise.all(
        wooOrder.line_items.map(async (item: any) => {
          // Ensure quantity is a valid integer (fallback to 1)
          const quantity = parseInt(item.quantity as any, 10) || 1;

          // Try to get image directly from line item; WooCommerce often omits this
          let imageUrl: string | null = (item as any).image?.src || null;
          
          console.log(`🖼️ Line item ${item.name} initial image:`, imageUrl);

          // If not present, fetch the product details from WooCommerce to get the first image
          if (!imageUrl && item.product_id) {
            try {
              console.log(`🔍 Fetching product details for ID: ${item.product_id}`);
              const productDetails = await wooCommerceAPI.fetchProduct(item.product_id);
              imageUrl = productDetails?.images?.[0]?.src || null;
              console.log(`🖼️ Product ${item.product_id} fetched image:`, imageUrl);
              console.log(`📦 Product details images array:`, productDetails?.images);
            } catch (err) {
              console.warn(`⚠️ Unable to fetch product ${item.product_id} image`, err);
            }
          }

          const orderItem = {
        product_id: item.product_id,
        product_name: item.name,
            quantity: quantity,
            price: item.price?.toString() || '0',
            sku: item.sku || '',
            image_url: imageUrl,
          };
          
          console.log(`✅ Final order item for ${item.name}:`, orderItem);
          return orderItem;
        })
      ),
      created_by_name: 'WooCommerce Import',
      is_synced_to_woocommerce: true,
      created_at: wooOrder.date_created, // Keep WooCommerce date exactly
      updated_at: wooOrder.date_modified, // Keep WooCommerce date exactly
      last_sync_attempt: new Date().toISOString()
    };

    const { data: insertedData, error: insertError } = await supabase
      .from('order_submissions')
      .insert(orderData)
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to insert order: ${insertError.message}`);
    }

    return insertedData;
  };

  // Enhanced sync function with better error handling and logic
  const syncFromWooCommerce = async (isManualSync = false) => {
    try {
      if (isManualSync) {
        console.log('🔄 Starting MANUAL WooCommerce status sync...');
        toast.info('Syncing with WooCommerce...', { description: 'Checking for order status updates.' });
      } else {
        console.log('🔄 Starting automated WooCommerce status sync...');
      }
      setIsSyncing(true);

      // 1. Fetch recent orders from WooCommerce based on modification date (ALL STATUSES)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const wooOrders = await wooCommerceAPI.fetchOrders({
        per_page: 100,
        status: 'any', // Include ALL statuses to catch completed orders too
        modified_after: sevenDaysAgo, // Use the correct parameter here
      });

      if (!wooOrders || wooOrders.length === 0) {
        if (isManualSync) toast.success('Orders are up to date with WooCommerce.');
        console.log('✅ No orders have been modified in WooCommerce recently.');
        return;
      }
      
      console.log(`🔎 Found ${wooOrders.length} orders modified in Woo since ${sevenDaysAgo}`);
      console.log('📋 WooCommerce orders found:', wooOrders.map(o => `#${o.number} (${o.status})`).join(', '));
      const wooOrderIds = wooOrders.map(o => o.id);

      // 2. Get the current status of these orders from our local database
      const { data: localOrders, error: localError } = await supabase
        .from('order_submissions')
        .select('id, woocommerce_order_id, status')
        .in('woocommerce_order_id', wooOrderIds);

      if (localError) {
        console.error('Error fetching local orders for sync:', localError);
        if (isManualSync) toast.error('Failed to fetch local orders for sync.');
        return;
      }

      const localStatusMap = new Map(localOrders.map(o => [o.woocommerce_order_id, { status: o.status, id: o.id }]));
      console.log(`📊 Local orders found: ${localOrders.length}`);
      let syncedCount = 0;
      const promises = [];

      // 3. Compare and update statuses
      for (const wooOrder of wooOrders) {
        const localOrder = localStatusMap.get(wooOrder.id);
        
        const wooStatusMap: { [key: string]: string } = {
          'pending': 'pending', 'processing': 'processing', 'on-hold': 'on-hold',
          'shipped': 'shipped', 'completed': 'delivered', 'cancelled': 'cancelled', 'refunded': 'refunded'
        };
        const newLocalStatus = wooStatusMap[wooOrder.status] || wooOrder.status;

        if (localOrder) {
          console.log(`🔍 Checking order #${wooOrder.number}: WooCommerce=${wooOrder.status} → Local=${newLocalStatus}, Current Local=${localOrder.status}`);
        }
        
        if (localOrder && localOrder.status !== newLocalStatus) {
          console.log(`💡 Status mismatch for Woo order #${wooOrder.number} (ID: ${wooOrder.id}). Woo Status: ${wooOrder.status} (maps to ${newLocalStatus}), Local Status: ${localOrder.status}. Updating...`);
          
          const updatePromise = supabase
            .from('order_submissions')
            .update({ 
              status: newLocalStatus, 
              woocommerce_status: wooOrder.status, // Store raw WooCommerce status
              last_sync_attempt: new Date().toISOString() 
            })
            .eq('id', localOrder.id)
            .then(({ error: updateError }) => {
              if (updateError) {
                console.error(`Error updating order #${wooOrder.number}:`, updateError);
              } else {
                syncedCount++;
                toast.info(`📦 Order ${wooOrder.number} status synced`, {
                  description: `WooCommerce: ${wooOrder.status} → Local: ${newLocalStatus}`,
                });
              }
            });
          promises.push(updatePromise);
        } else if (localOrder) {
          // Even if status is the same, update the WooCommerce status field and sync timestamp
          const updatePromise = supabase
            .from('order_submissions')
            .update({ 
              woocommerce_status: wooOrder.status,
              last_sync_attempt: new Date().toISOString() 
            })
            .eq('id', localOrder.id);
          promises.push(updatePromise);
        }
      }

      await Promise.all(promises);

      if (syncedCount > 0) {
        console.log(`✅ Synced ${syncedCount} order status updates from WooCommerce.`);
        if (isManualSync) toast.success(`Synced ${syncedCount} order(s) from WooCommerce.`);
        await loadOrders(); // Refresh the order list
      } else {
        if (isManualSync) toast.success('All recent orders are already up to date.');
        console.log('✅ All checked order statuses are already in sync.');
      }
      
      if (!isManualSync) {
        setLastAutoSyncTime(new Date());
      }

    } catch (error) {
      console.error('Error in enhanced WooCommerce sync:', error);
      if (isManualSync) toast.error('Failed to sync statuses from WooCommerce.');
    } finally {
      setIsSyncing(false);
    }
  };

  const syncToWooCommerce = async (orderId: number, status: string, reason?: string) => {
    try {
      const { data: order, error } = await supabase
        .from('order_submissions')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error || !order || !order.woocommerce_order_id) {
        console.log('Order not found or no WooCommerce ID');
        return;
      }

      // Map our status to WooCommerce status
      const statusMap: { [key: string]: string } = {
        'pending': 'pending',
        'processing': 'processing',
        'shipped': 'shipped', // Now maps to WooCommerce shipped status
        'delivered': 'completed',
        'cancelled': 'cancelled',
        'refunded': 'refunded',
        'on-hold': 'on-hold'
      };

      const wooStatus = statusMap[status] || status;

      await wooCommerceAPI.updateOrder(order.woocommerce_order_id, {
        status: wooStatus,
        customer_note: reason ? `${order.customer_note || ''}\n\nWarehouse Update: ${reason}`.trim() : order.customer_note
      });

      console.log(`✅ Order ${order.order_number} status synced to WooCommerce: ${wooStatus}`);
    } catch (error) {
      console.error('Error syncing to WooCommerce:', error);
      toast.error('Failed to sync to WooCommerce', {
        description: 'Order updated locally but WooCommerce sync failed'
      });
    }
  };

  // Function to clear database highlighting for final status orders
  const clearDatabaseHighlights = async () => {
    try {
      const { data, error } = await supabase
        .rpc('clear_highlights_for_final_statuses');
      
      if (error) {
        console.error('Error clearing database highlights:', error);
        toast.error('Failed to clear highlights', {
          description: 'Please check the database connection'
        });
        return;
      }
      
      if (data > 0) {
        console.log(`✅ Cleared database highlighting for ${data} orders with final statuses`);
        toast.success(`Cleared highlighting for ${data} completed orders`, {
          description: 'Orders with final statuses no longer highlighted'
        });
        
        // Refresh orders to show the changes (without auto-clearing again)
        const refreshedOrders = await getAllOrderSubmissions();
        setOrders(refreshedOrders);
      }
      // Remove the "No highlighted orders found" notification - it's annoying
    } catch (error) {
      console.error('Error calling clear highlights function:', error);
      toast.error('Failed to clear highlights', {
        description: 'Please try again or contact support'
      });
    }
  };

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await getAllOrderSubmissions();
      setOrders(data);
      console.log('📦 Loaded orders:', data.length);
      
      // Clear database highlights for final status orders
      await clearDatabaseHighlights();
      
      // Clear frontend highlights for orders that are already in final statuses
      setTimeout(() => {
        data.forEach(order => {
          if (order.id && (order.status === 'cancelled' || order.status === 'shipped' || order.status === 'delivered' || order.status === 'completed')) {
            if (isOrderHighlighted(order.id)) {
              removeOrderHighlight(order.id);
              console.log(`🎯 Order ${order.id} frontend highlight cleared (already in final status: ${order.status})`);
            }
          }
        });
      }, 100); // Small delay to ensure state is updated
      
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const loadShippingStats = async () => {
    try {
      const stats = await getShippingStats();
      setShippingStats(stats);
    } catch (error) {
      console.error('Error loading shipping stats:', error);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];
    if (statusFilter !== 'all') {
      if (statusFilter === 'delivered') {
        filtered = filtered.filter(
          (order) => order.status === 'delivered' || order.status === 'completed'
        );
      } else if (statusFilter === 'pending') {
        filtered = filtered.filter(
          (order) => order.status === 'pending' || order.status === 'processing'
        );
      } else {
        filtered = filtered.filter((order) => order.status === statusFilter);
      }
    }
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(
        (order) =>
          (order.order_number && order.order_number.toString().includes(term)) ||
          (order.customer_first_name && order.customer_first_name.toLowerCase().includes(term)) ||
          (order.customer_last_name && order.customer_last_name.toLowerCase().includes(term)) ||
          (order.customer_phone && order.customer_phone.includes(term)) ||
          (order.customer_email && order.customer_email.toLowerCase().includes(term))
      );
    }
    setFilteredOrders(filtered);
  };

  const updateOrderStatus = async () => {
    if (!selectedOrder || !user) return;

    try {
      setIsSyncing(true);

      // Prepare update data
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // If status is shipped, add shipping information
      if (newStatus === 'shipped') {
        updateData.shipping_method = shippingMethod;
        updateData.shipped_at = new Date().toISOString();
        updateData.shipped_by = user.id;
        
        if (trackingNumber.trim()) {
          updateData.tracking_number = trackingNumber.trim();
        }
      }

      const { error } = await supabase
        .from('order_submissions')
        .update(updateData)
        .eq('id', selectedOrder.id);

      if (error) throw error;

      // Remove highlighting when order is marked as cancelled, shipped or delivered
      if ((newStatus === 'cancelled' || newStatus === 'shipped' || newStatus === 'delivered') && selectedOrder.id) {
        // Clear frontend highlighting
        removeOrderHighlight(selectedOrder.id);
        console.log(`🎯 Order ${selectedOrder.id} frontend highlight removed due to status change to ${newStatus}`);
        
        // The database highlighting will be automatically cleared by the trigger
        // But we can also manually ensure it's cleared
        try {
          await supabase
            .from('order_submissions')
            .update({ copied_by_warehouse: false })
            .eq('id', selectedOrder.id);
          console.log(`🗄️ Order ${selectedOrder.id} database highlighting cleared`);
        } catch (dbError) {
          console.warn('Failed to clear database highlighting:', dbError);
        }
      }

      // Add status history record
      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: selectedOrder.id,
          old_status: selectedOrder.status || 'pending',
          new_status: newStatus,
          reason: statusReason || null,
          changed_by: user.id,
          changed_by_name: user.name,
          changed_at: new Date().toISOString()
        });

      if (historyError) console.warn('Failed to log status history:', historyError);

      // If adding a reason, create a note
      if (statusReason.trim()) {
        await addOrderNote(
          `Status changed to ${newStatus}: ${statusReason}`,
          'status_change'
        );
      }

      // Sync to WooCommerce if order has WooCommerce ID
      if (selectedOrder.woocommerce_order_id) {
        await syncToWooCommerce(selectedOrder.id!, newStatus, statusReason);
      }

                // Status change notifications removed as per request

      setIsStatusUpdateOpen(false);
      setStatusReason('');
      setTrackingNumber('');
      loadOrders(); // Refresh orders
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    } finally {
      setIsSyncing(false);
    }
  };

  // Enhanced manual sync that includes new order check
  const manualSyncFromWooCommerce = async () => {
    // This now calls the main sync function with a flag
    await syncFromWooCommerce(true);
  };

  const addOrderNote = async (noteText: string = newNote, noteType: 'general' | 'status_change' | 'cancel_reason' | 'warehouse' = 'warehouse') => {
    if (!selectedOrder || !user || !noteText.trim()) return;

    try {
      const { error } = await supabase
        .from('order_notes')
        .insert({
          order_id: selectedOrder.id,
          note: noteText.trim(),
          created_by: user.id,
          created_by_name: user.name,
          note_type: noteType,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Note added successfully');
      setNewNote('');
      setIsAddNoteOpen(false);
      loadOrderNotes(selectedOrder.id!); // Refresh notes
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    }
  };

  const loadOrderNotes = async (orderId: number) => {
    try {
      const { data, error } = await supabase
        .from('order_notes')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrderNotes(data || []);
    } catch (error) {
      console.error('Error loading order notes:', error);
    }
  };

  const loadStatusHistory = async (orderId: number) => {
    try {
      const { data, error } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('changed_at', { ascending: false });

      if (error) throw error;

      setStatusHistory(data || []);
    } catch (error) {
      console.error('Error loading status history:', error);
    }
  };

  const openOrderDetail = (order: OrderSubmission) => {
    setSelectedOrder(order);
    setIsOrderDetailOpen(true);
    if (order.id) {
      loadOrderNotes(order.id);
      loadStatusHistory(order.id);
      // Remove gold highlighting when user views the order
      removeOrderHighlight(order.id);
    }
  };

  const getStatusBadge = (status: string = 'pending') => {
    // Map 'completed' to 'delivered' for display
    const displayStatus = status === 'completed' ? 'delivered' : status;
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
      'on-hold': 'bg-orange-100 text-orange-800'
    };

    return (
      <Badge className={statusColors[displayStatus as keyof typeof statusColors] || statusColors.pending}>
        {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
      </Badge>
    );
  };

  const getStatusIcon = (status: string = 'pending') => {
    // Map 'completed' to 'delivered' for icon
    const displayStatus = status === 'completed' ? 'delivered' : status;
    switch (displayStatus) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'processing': return <Package className="w-4 h-4" />;
      case 'shipped': return <Truck className="w-4 h-4" />;
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // Update formatPrice to always use English numerals and 2 decimals
  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: false
    });
  };

  // Get Payment Method in Arabic
  const getPaymentMethodArabic = (method: string) => {
    if (!method) return 'غير محدد';
    
    const methodLower = method.toLowerCase();
    
    // Handle Tabby variations
    if (methodLower.includes('tabby')) {
      return 'تابي (Tabby)';
    }
    
    // Handle Tamara variations  
    if (methodLower.includes('tamara')) {
      return 'تمارا (Tamara)';
    }
    
    // Handle COD variations
    if (methodLower.includes('cod') || methodLower.includes('cash on delivery') || methodLower.includes('الدفع عند الاستلام')) {
      return 'الدفع عند الاستلام (COD)';
    }
    
    // Handle bank transfer
    if (methodLower.includes('bank') || methodLower.includes('transfer') || methodLower.includes('تحويل')) {
      return 'تحويل بنكي';
    }
    
    // Handle credit card
    if (methodLower.includes('credit') || methodLower.includes('card') || methodLower.includes('بطاقة')) {
      return 'بطاقة ائتمان';
    }
    
    // Handle PayPal
    if (methodLower.includes('paypal')) {
      return 'باي بال (PayPal)';
    }
    
    // Handle Apple Pay
    if (methodLower.includes('apple') && methodLower.includes('pay')) {
      return 'أبل باي (Apple Pay)';
    }
    
    // Handle Google Pay
    if (methodLower.includes('google') && methodLower.includes('pay')) {
      return 'جوجل باي (Google Pay)';
    }
    
    // Handle STC Pay
    if (methodLower.includes('stc') && methodLower.includes('pay')) {
      return 'دفع السعودية (STC Pay)';
    }
    
    // Handle Mada
    if (methodLower.includes('mada')) {
      return 'مدى (Mada)';
    }
    
    // Default: return original method with Arabic prefix
    return `${method} - غير مترجم`;
  };

  // Get Payment Method in English (for export)
  const getPaymentMethodEnglish = (method: string) => {
    if (!method) return 'Not specified';
    
    const methodLower = method.toLowerCase();
    
    // Handle Tabby variations
    if (methodLower.includes('tabby')) {
      return 'Tabby';
    }
    
    // Handle Tamara variations  
    if (methodLower.includes('tamara')) {
      return 'Tamara';
    }
    
    // Handle COD variations
    if (methodLower.includes('cod') || methodLower.includes('cash on delivery')) {
      return 'Cash on Delivery (COD)';
    }
    
    // Handle bank transfer
    if (methodLower.includes('bank') || methodLower.includes('transfer')) {
      return 'Bank Transfer';
    }
    
    // Handle credit card
    if (methodLower.includes('credit') || methodLower.includes('card')) {
      return 'Credit Card';
    }
    
    // Handle PayPal
    if (methodLower.includes('paypal')) {
      return 'PayPal';
    }
    
    // Handle Apple Pay
    if (methodLower.includes('apple') && methodLower.includes('pay')) {
      return 'Apple Pay';
    }
    
    // Handle Google Pay
    if (methodLower.includes('google') && methodLower.includes('pay')) {
      return 'Google Pay';
    }
    
    // Handle STC Pay
    if (methodLower.includes('stc') && methodLower.includes('pay')) {
      return 'STC Pay';
    }
    
    // Handle Mada
    if (methodLower.includes('mada')) {
      return 'Mada';
    }
    
    // Return original method if no match
    return method;
  };

  // CSV Export Function with Arabic support
  const exportOrdersToCSV = () => {
    try {
      const ordersToExport = filteredOrders.length > 0 ? filteredOrders : orders;
      
      // CSV Headers with Arabic support
      const headers = [
        'Order Number / رقم الطلب',
        'Customer Name / اسم العميل', 
        'Customer Phone / رقم الهاتف',
        'Customer Email / البريد الإلكتروني',
        'Status / الحالة',
        'Payment Method / طريقة الدفع',
        'Payment Method (Arabic) / طريقة الدفع بالعربية',
        'Total Amount (SAR) / المبلغ الإجمالي',
        'Subtotal (SAR) / المبلغ الفرعي',
        'Shipping Amount (SAR) / مبلغ الشحن',
        'Discount Amount (SAR) / مبلغ الخصم',
        'Shipping Method / طريقة الشحن',
        'Tracking Number / رقم التتبع',
        'Order Date / تاريخ الطلب',
        'Order Source / مصدر الطلب',
        'Billing Address / عنوان الفاتورة',
        'Billing City / المدينة',
        'Billing Country / البلد',
        'WooCommerce Order ID',
        'Order Items / المنتجات',
        'Quantities / الكميات'
      ];

      // Convert orders to CSV rows
      const csvData = ordersToExport.map(order => {
        const orderItems = (order.order_items as OrderItem[]) || [];
        const itemNames = orderItems.map(item => item.product_name).join('; ');
        const itemQuantities = orderItems.map(item => `${item.product_name}: ${item.quantity}`).join('; ');
        
        return [
          order.order_number || `#${order.id}`,
          `${order.customer_first_name} ${order.customer_last_name}`.trim(),
          order.customer_phone || '',
          order.customer_email || '',
          order.status || 'pending',
          getPaymentMethodEnglish(order.payment_method || ''),
          getPaymentMethodArabic(order.payment_method || ''),
          formatPrice(order.total_amount || 0),
          formatPrice(order.subtotal || 0),
          formatPrice(order.shipping_amount || 0),
          formatPrice(Number(order.discount_amount) || 0),
          (order as any).shipping_method || 'Not set',
          (order as any).tracking_number || 'No tracking',
          formatDateTime(order.created_at),
          (!order.created_by_user_id || order.created_by_name === 'WooCommerce Import') ? 'WooCommerce' : 'Customer Service',
          `${order.billing_address_1 || ''} ${order.billing_address_2 || ''}`.trim(),
          order.billing_city || '',
          order.billing_country || '',
          order.woocommerce_order_id || 'Not synced',
          itemNames,
          itemQuantities
        ];
      });

      // Create CSV content with UTF-8 BOM for proper Arabic display
      const csvContent = '\uFEFF' + [headers, ...csvData]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      // Create and download file with UTF-8 encoding
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      // Generate filename with timestamp and filter info
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const filterInfo = statusFilter !== 'all' ? `_${statusFilter}` : '';
      const searchInfo = searchTerm ? `_search` : '';
      const filename = `warehouse_orders${filterInfo}${searchInfo}_${timestamp}.csv`;
      
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Orders exported successfully! / تم تصدير الطلبات بنجاح!', {
        description: `${ordersToExport.length} orders exported with Arabic support / تم تصدير ${ordersToExport.length} طلب مع دعم العربية`
      });

      console.log(`📊 Exported ${ordersToExport.length} orders to CSV with Arabic support`);
    } catch (error) {
      console.error('Error exporting orders:', error);
      toast.error('Failed to export orders / فشل في تصدير الطلبات', {
        description: 'Please try again or contact support / يرجى المحاولة مرة أخرى أو الاتصال بالدعم'
      });
    }
  };

  // Copy order information in Arabic format
  const copyOrderInArabic = async (order: OrderSubmission) => {
    try {
      // Format the Arabic order invoice with proper payment method
      const arabicOrderText = `🌙 نور القمر – فاتورة الطلب\n\nرقم الطلب: ${order.order_number}\nاسم العميل: ${order.customer_first_name} ${order.customer_last_name}\nرقم الهاتف: ${order.customer_phone}\nالعنوان: ${order.billing_address_1}${order.billing_address_2 ? ` - ${order.billing_address_2}` : ''}\nالمدينة: ${order.billing_city}\nالدولة: ${order.billing_country}\nطريقة الدفع: ${getPaymentMethodArabic(order.payment_method)}\n\n🛒 تفاصيل الطلب:\n${order.order_items.map(item => 
`المنتج: ${item.product_name}\nالكمية: ${item.quantity}`
).join('\n\n')}\n\n💰 إجمالي الطلب:\n${order.total_amount.toFixed(0)} ريال سعودي`;

      // Clipboard API support check
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(arabicOrderText);
        toast.success('تم نسخ تفاصيل الطلب بالعربية! 📋', {
          description: `Payment Method: ${getPaymentMethodArabic(order.payment_method)} / طريقة الدفع: ${getPaymentMethodArabic(order.payment_method)}`,
        });
      } else {
        // Fallback: legacy execCommand
        const textarea = document.createElement('textarea');
        textarea.value = arabicOrderText;
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          toast.success('تم نسخ تفاصيل الطلب بالعربية! 📋', {
            description: `Payment Method: ${getPaymentMethodArabic(order.payment_method)} (legacy method)`,
          });
        } catch {
          toast.error('فشل في نسخ تفاصيل الطلب ❌', {
            description: 'Clipboard API not supported in this browser / متصفحك لا يدعم النسخ التلقائي',
          });
        }
        document.body.removeChild(textarea);
      }
      // Update copied_by_warehouse in the database
      await supabase
        .from('order_submissions')
        .update({ copied_by_warehouse: true })
        .eq('id', order.id);
      
      // Remove gold highlighting when user copies the order
      if (order.id) {
        removeOrderHighlight(order.id);
      }
      
      // Optionally, refresh orders to reflect the change
      loadOrders();
    } catch (error) {
      console.error('Failed to copy order details:', error);
      toast.error('فشل في نسخ تفاصيل الطلب ❌', {
        description: 'Failed to copy order details / فشل في نسخ تفاصيل الطلب مع طريقة الدفع الصحيحة',
      });
    }
  };

  // Function to fix product images for all orders
  const fixAllProductImages = async () => {
    setIsFixingImages(true);
    console.log('🚀 Starting to fix product images for all orders...');
    
    try {
      // Get all orders that need image fixes
      const { data: orders, error } = await supabase
        .from('order_submissions')
        .select('*')
        .not('order_items', 'is', null);

      if (error) {
        console.error('❌ Error fetching orders:', error);
        toast.error('Failed to fetch orders for image fix');
        return;
      }

      console.log(`📦 Found ${orders.length} orders to check for missing images`);
      toast.info(`Fixing product images for ${orders.length} orders...`, {
        description: 'This may take a few minutes'
      });

      let updatedCount = 0;

      for (const order of orders) {
        try {
          console.log(`🔍 Checking order ${order.order_number || order.id}...`);
          
          // Check if order_items already have image_url
          const hasImages = order.order_items.some((item: any) => item.image_url);
          if (hasImages) {
            console.log(`✅ Order ${order.order_number || order.id} already has images, skipping`);
            continue;
          }

          // Update each item in order_items with image_url
          const updatedItems = await Promise.all(
            order.order_items.map(async (item: any) => {
              if (item.image_url) {
                return item; // Already has image
              }

              console.log(`🖼️ Fetching image for product ${item.product_id} (${item.product_name})`);
              
              try {
                // Fetch product details from WooCommerce
                const productDetails = await wooCommerceAPI.fetchProduct(item.product_id);
                const imageUrl = productDetails?.images?.[0]?.src || null;
                
                console.log(`📸 Found image for ${item.product_name}:`, imageUrl);
                
                return {
                  ...item,
                  image_url: imageUrl
                };
              } catch (err) {
                console.warn(`⚠️ Failed to fetch image for product ${item.product_id}:`, err);
                return {
                  ...item,
                  image_url: null
                };
              }
            })
          );

          // Update the order in database
          const { error: updateError } = await supabase
            .from('order_submissions')
            .update({ 
              order_items: updatedItems,
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id);

          if (updateError) {
            console.error(`❌ Failed to update order ${order.order_number || order.id}:`, updateError);
          } else {
            console.log(`✅ Updated order ${order.order_number || order.id} with product images`);
            updatedCount++;
          }

          // Add a small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (err) {
          console.error(`❌ Error processing order ${order.order_number || order.id}:`, err);
        }
      }

      toast.success(`🎉 Fixed product images for ${updatedCount} orders!`, {
        description: 'Refreshing orders to show updated images...'
      });
      
      // Refresh the orders list to show updated images
      await loadOrders();

    } catch (error) {
      console.error('❌ Image fix failed:', error);
      toast.error('Failed to fix product images');
    } finally {
      setIsFixingImages(false);
    }
  };

  // Warehouse-specific notification functions (admin status change notifications removed per request)

  const notifyWarehouseAboutNewOrders = async (newOrdersCount: number, orders: any[]) => {
    if (newOrdersCount === 0) return;

    try {
      // Get only warehouse users (no admin notifications)
      const { data: warehouseUsers, error } = await supabase
        .from('users')
        .select('id, role')
        .eq('role', 'warehouse');

      if (error || !warehouseUsers || warehouseUsers.length === 0) {
        console.log('No warehouse users found to notify about new orders');
        return;
      }

      const notificationTitle = `🆕 ${newOrdersCount} New Order${newOrdersCount > 1 ? 's' : ''} Received`;
      let notificationMessage = `${newOrdersCount} new order${newOrdersCount > 1 ? 's have' : ' has'} been imported from WooCommerce\n\n`;
      
      // Show details for up to 3 orders
      const ordersToShow = orders.slice(0, 3);
      ordersToShow.forEach((order, index) => {
        notificationMessage += `${index + 1}. Order ${order.order_number || `#${order.id}`}\n`;
        notificationMessage += `   Customer: ${order.customer_name}\n`;
        notificationMessage += `   Total: ${formatPrice(order.total_amount || 0)}\n\n`;
      });

      if (newOrdersCount > 3) {
        notificationMessage += `...and ${newOrdersCount - 3} more order${newOrdersCount - 3 > 1 ? 's' : ''}\n\n`;
      }

      notificationMessage += `📅 Imported: ${formatDateTime(new Date().toISOString())}\n`;
      notificationMessage += `🏪 Source: WooCommerce Auto-Sync`;

      // Send notification only to warehouse users
      for (const warehouseUser of warehouseUsers) {
        await createNotification({
          user_id: warehouseUser.id,
          title: notificationTitle,
          message: notificationMessage,
          related_to: 'warehouse_new_orders',
          related_id: 'bulk',
          created_by: user?.id || warehouseUser.id
        });
      }

      // Play notification sound for warehouse user
      playNotificationSound();

      console.log(`✅ New orders notification sent to ${warehouseUsers.length} warehouse user(s) only`);

    } catch (error) {
      console.error('❌ Error sending new orders notifications to warehouse users:', error);
    }
  };

  const notifyAdminsAboutSyncIssues = async (errorMessage: string, orderCount?: number) => {
    try {
      // Get all admin users
      const { data: admins, error } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin');

      if (error || !admins || admins.length === 0) {
        console.log('No admins found to notify about sync issues');
        return;
      }

      const notificationTitle = `⚠️ WooCommerce Sync Issue`;
      let notificationMessage = `A sync issue occurred while importing orders from WooCommerce\n\n`;
      notificationMessage += `❌ Error: ${errorMessage}\n`;
      
      if (orderCount) {
        notificationMessage += `📦 Orders affected: ${orderCount}\n`;
      }
      
      notificationMessage += `📅 Time: ${formatDateTime(new Date().toISOString())}\n`;
      notificationMessage += `🏪 Reported by: Warehouse System\n\n`;
      notificationMessage += `🔧 Please check the WooCommerce connection and API settings.`;

      // Send notification to each admin
      for (const admin of admins) {
        await createNotification({
          user_id: admin.id,
          title: notificationTitle,
          message: notificationMessage,
          related_to: 'warehouse_sync_error',
          related_id: 'error',
          created_by: user?.id || null
        });
      }

      console.log(`✅ Sync issue notification sent to ${admins.length} admin(s)`);

    } catch (error) {
      console.error('❌ Error sending sync issue notifications to admins:', error);
    }
  };

  // Calculate completion rate for dashboard summary
  const completionRate = orders.length > 0
    ? Math.round((orders.filter(o => o.status === 'delivered' || o.status === 'completed').length / orders.length) * 100)
    : 0;

  if (!user || user.role !== 'warehouse') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You need warehouse access to view this page.</p>
            <Button onClick={() => window.location.href = '/login'}>
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Package className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Warehouse Dashboard</h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <p className="text-xs sm:text-sm text-gray-600">Order Management</p>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-yellow-500 animate-pulse' : autoSyncActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className={`text-xs font-medium ${isSyncing ? 'text-yellow-600' : autoSyncActive ? 'text-green-600' : 'text-gray-600'}`}>
                    {isSyncing ? 'Syncing...' : autoSyncActive ? 'Auto-Sync' : 'Inactive'}
                    {lastSyncNewOrders > 0 && !isSyncing && (
                      <span className="ml-1 text-xs bg-green-100 text-green-800 px-1 rounded">
                        +{lastSyncNewOrders}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
            {/* Sync Box */}
            <div
              onClick={manualSyncFromWooCommerce}
              className="cursor-pointer transition-all duration-300 flex items-center justify-center hover:scale-105"
              title={isSyncing ? "Syncing from WooCommerce..." : "Click to sync from WooCommerce"}
            >
              {syncAnimationData ? (
                <Lottie
                  animationData={syncAnimationData}
                  loop={isSyncing}
                  autoplay={isSyncing}
                  style={{ width: '66px', height: '66px' }}
                />
              ) : (
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
              )}
            </div>
            {/* Notifications */}
            <div className="flex items-center">
              <NotificationsMenu />
            </div>
            {/* User Menu */}
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
              <span className="truncate max-w-20 lg:max-w-none">Welcome, {user.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-red-600 hover:text-red-700"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
            {/* Mobile Logout */}
            <div className="sm:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-red-600 hover:text-red-700 h-8 w-8"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-Optimized Main Content */}
      <div className="p-3 sm:p-6">
        {/* Real-Time Dashboard Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {/* Total Orders */}
          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{orders.length}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs sm:text-sm font-semibold text-blue-700">
                    {formatPrice(orders.reduce((sum, order) => sum + (order.total_amount || 0), 0))}
                  </span>
                  <RiyalIcon className="w-3 h-3 text-blue-500" />
                </div>
              </div>
              <Package className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
            </div>
          </Card>

          {/* Pending Orders */}
          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Pending</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-600">
                  {orders.filter(o => o.status === 'pending' || o.status === 'processing').length}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs sm:text-sm font-semibold text-orange-700">
                    {formatPrice(orders.filter(o => o.status === 'pending' || o.status === 'processing').reduce((sum, order) => sum + (order.total_amount || 0), 0))}
                  </span>
                  <RiyalIcon className="w-3 h-3 text-orange-500" />
                </div>
              </div>
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500" />
            </div>
          </Card>

          {/* Shipped Orders */}
          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Shipped</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">
                  {orders.filter(o => o.status === 'shipped').length}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs sm:text-sm font-semibold text-blue-700">
                    {formatPrice(orders.filter(o => o.status === 'shipped').reduce((sum, order) => sum + (order.total_amount || 0), 0))}
                  </span>
                  <RiyalIcon className="w-3 h-3 text-blue-500" />
                </div>
              </div>
              <Truck className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
            </div>
          </Card>

          {/* Delivered Orders */}
          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Delivered</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  {orders.filter(o => o.status === 'delivered' || o.status === 'completed').length}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs sm:text-sm font-semibold text-green-700">
                    {formatPrice(orders.filter(o => o.status === 'delivered' || o.status === 'completed').reduce((sum, order) => sum + (order.total_amount || 0), 0))}
                  </span>
                  <RiyalIcon className="w-3 h-3 text-green-500" />
                </div>
              </div>
              <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
            </div>
          </Card>

          {/* Cancelled Orders */}
          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Cancelled</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">
                  {orders.filter(o => o.status === 'cancelled').length}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs sm:text-sm font-semibold text-red-700">
                    {formatPrice(orders.filter(o => o.status === 'cancelled').reduce((sum, order) => sum + (order.total_amount || 0), 0))}
                  </span>
                  <RiyalIcon className="w-3 h-3 text-red-500" />
                </div>
              </div>
              <XCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
            </div>
          </Card>
        </div>

        {/* Enhanced Shipping Methods Overview */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3 sm:pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Truck className="w-5 h-5" />
                Shipping Performance Dashboard
              </CardTitle>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Live Data</span>
                </div>
                <span>•</span>
                <span>Updated: {formatTime(new Date().toISOString())}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Real Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              {/* Total Revenue */}
              <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-blue-700">Total Revenue</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-900">{formatPrice(orders.reduce((sum, order) => sum + (order.total_amount || 0), 0))}</p>
                  </div>
                  <div className="flex items-center justify-center rounded-full bg-blue-100 p-2 shadow-sm">
                    <RiyalIcon className="w-6 h-6 text-blue-500" />
                  </div>
                </div>
              </div>

              {/* Average Order Value */}
              <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-green-700">Avg Order Value</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-900">{orders.length > 0 ? formatPrice(orders.reduce((sum, order) => sum + (order.total_amount || 0), 0) / orders.length) : formatPrice(0)}</p>
                  </div>
                  <div className="flex items-center justify-center rounded-full bg-green-100 p-2 shadow-sm">
                    <BarChart2 className="w-6 h-6 text-green-500" />
                  </div>
                </div>
              </div>

              {/* Today's Orders */}
              <div className="p-3 sm:p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-purple-700">Today's Orders</p>
                    <p className="text-xl sm:text-2xl font-bold text-purple-900">{orders.filter(order => {
                        const orderDate = new Date(order.created_at);
                        const today = new Date();
                        return orderDate.toDateString() === today.toDateString();
                    }).length}</p>
                  </div>
                  <div className="flex items-center justify-center rounded-full bg-purple-100 p-2 shadow-sm">
                    <LucideCalendar className="w-6 h-6 text-purple-500" />
                  </div>
                </div>
              </div>

              {/* Completion Rate */}
              <div className="p-3 sm:p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-orange-700">Completion Rate</p>
                    <p className="text-xl sm:text-2xl font-bold text-orange-900">{completionRate}%</p>
                  </div>
                  <div className="flex items-center justify-center rounded-full bg-orange-100 p-2 shadow-sm">
                    <Target className="w-6 h-6 text-orange-500" />
                  </div>
                </div>
              </div>
            </div>

          
       
   
          </CardContent>
        </Card>

        {/* Filters & Search */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-4 sm:items-end">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search orders, customers, phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 text-sm sm:text-base"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="w-full sm:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="text-sm sm:text-base">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>



              {/* Clear Highlights Button */}
              <div className="w-full sm:w-auto">
                <Button
                  onClick={clearDatabaseHighlights}
                  variant="outline"
                  className="w-full sm:w-auto bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300"
                  disabled={isLoading}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Clear Highlights</span>
                  <span className="sm:hidden">Clear</span>
                </Button>
              </div>

              {/* Check New Orders Button */}
              <div className="w-full sm:w-auto">
                <Button
                  onClick={async () => {
                    console.log('🔄 Manually checking for new orders...');
                    toast.info('Checking for new orders...', {
                      description: 'Scanning WooCommerce for new orders'
                    });
                    
                    try {
                      await syncNewOrdersFromWooCommerce();
                      console.log('✅ Manual new order check completed');
                    } catch (error) {
                      console.error('❌ Manual new order check failed:', error);
                      toast.error('Failed to check for new orders');
                    }
                  }}
                  variant="outline"
                  className="w-full sm:w-auto bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300"
                  disabled={isLoading || isSyncing}
                >
                  {isSyncing ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Package className="w-4 h-4 mr-2" />
                  )}
                  <span className="hidden sm:inline">Check New Orders</span>
                  <span className="sm:hidden">Check</span>
                </Button>
              </div>

              {/* Export Button */}
              <div className="w-full sm:w-auto">
                <Button
                  onClick={exportOrdersToCSV}
                  variant="outline"
                  className="w-full sm:w-auto bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300"
                  disabled={isLoading}
                >
                  <Download className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Export CSV</span>
                  <span className="sm:hidden">Export</span>
                  {filteredOrders.length !== orders.length && (
                    <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
                      {filteredOrders.length}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile-Optimized Orders List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-base sm:text-lg">Orders ({filteredOrders.length})</span>
              <Badge variant="outline" className="self-start sm:self-auto">
                {isLoading ? 'Loading...' : 'Live Updates'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading orders...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">No orders found</p>
                <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Shipping</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow 
                          key={order.id} 
                          className={`
                            ${order.copied_by_warehouse ? 'bg-purple-50' : ''}
                            ${isOrderHighlighted(order.id!) ? 'bg-gradient-to-r from-yellow-100 via-amber-50 to-yellow-100 border border-yellow-300 animate-pulse shadow-lg' : ''}
                            transition-all duration-500
                          `}
                        >
                          <TableCell className="font-medium">
                            {order.order_number || `#${order.id}`}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {order.customer_first_name} {order.customer_last_name}
                              </div>
                              {order.customer_email && (
                                <div className="text-sm text-gray-600">{order.customer_email}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{order.customer_phone}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(order.status)}
                              {getStatusBadge(order.status)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <CreditCard className="w-3 h-3 text-gray-400" />
                              <span className="text-xs font-medium">
                                {order.payment_method || 'Not specified'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {(order as any).shipping_method ? (
                                <div className="flex items-center gap-1">
                                  <Truck className="w-3 h-3 text-gray-400" />
                                  <span className="text-xs font-medium">
                                    {(order as any).shipping_method === 'SMSA' && 'SMSA'}
                                    {(order as any).shipping_method === 'DRB' && 'DRB'}
                                    {(order as any).shipping_method === 'STANDARD' && 'Standard'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">Not set</span>
                              )}
                              {(order as any).tracking_number && (
                                <div className="text-xs text-gray-600 mt-1 font-mono">
                                  #{(order as any).tracking_number.substring(0, 8)}...
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            <span className="flex items-center gap-1">
                            {formatPrice(order.total_amount)}
                              <RiyalIcon className="inline-block w-4 h-4 text-gray-500" />
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <LucideCalendar className="w-4 h-4 text-gray-400" />
                              {formatDateTime(order.created_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {(!order.created_by_user_id || order.created_by_name === 'WooCommerce Import') ? (
                              <span className="text-xs font-semibold text-blue-600">WooCommerce</span>
                            ) : (
                              <span className="text-xs font-semibold text-green-600">Customer Service</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openOrderDetail(order)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                              onClick={() => {
                                setSelectedOrder(order);
                                setNewStatus(order.status as OrderStatus || 'pending');
                                setIsStatusUpdateOpen(true);
                                // Remove gold highlighting when user edits the order
                                if (order.id) {
                                  removeOrderHighlight(order.id);
                                }
                              }}
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border-purple-300 hover:from-purple-100 hover:to-purple-150 hover:border-purple-400 font-medium shadow-sm"
                                onClick={() => copyOrderInArabic(order)}
                              >
                                <Copy className="h-4 w-4 mr-1 text-purple-600" />
                                
                                <span className="sm:hidden">📋 نسخ</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-3">
                  {filteredOrders.map((order) => (
                    <Card 
                      key={order.id} 
                      className={`
                        p-4 hover:shadow-md transition-all duration-500
                        ${order.copied_by_warehouse ? 'bg-purple-50' : ''}
                        ${isOrderHighlighted(order.id!) ? 'bg-gradient-to-r from-yellow-100 via-amber-50 to-yellow-100 border-2 border-yellow-400 animate-pulse shadow-xl ring-2 ring-yellow-200' : ''}
                      `}
                    >
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg text-blue-600">
                              {order.order_number || `#${order.id}`}
                            </span>
                            {(!order.created_by_user_id || order.created_by_name === 'WooCommerce Import') ? (
                              <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">WooCommerce</span>
                            ) : (
                              <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded">Customer Service</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(order.status)}
                            {getStatusBadge(order.status)}
                          </div>
                        </div>

                        {/* Customer Info */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Customer</p>
                            <p className="font-medium text-sm">
                              {order.customer_first_name} {order.customer_last_name}
                            </p>
                            {order.customer_phone && (
                              <p className="text-xs text-gray-600">{order.customer_phone}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Total Amount</p>
                            <p className="font-bold text-lg text-green-600 flex items-center gap-1">
                              {formatPrice(order.total_amount)}
                              <RiyalIcon className="inline-block w-4 h-4 text-gray-500" />
                            </p>
                          </div>
                        </div>

                        {/* Payment Method Info */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Payment Method</p>
                            <div className="flex items-center gap-1">
                              <CreditCard className="w-3 h-3 text-gray-400" />
                              <span className="text-xs font-medium">
                                {order.payment_method || 'Not specified'}
                              </span>
                            </div>
                          </div>
                          <div></div>
                        </div>

                        {/* Shipping & Date */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Shipping Method</p>
                            {(order as any).shipping_method ? (
                              <div className="flex items-center gap-1">
                                <Truck className="w-3 h-3 text-gray-400" />
                                <span className="text-xs font-medium">
                                  {(order as any).shipping_method === 'SMSA' && 'SMSA'}
                                  {(order as any).shipping_method === 'DRB' && 'DRB'}
                                  {(order as any).shipping_method === 'STANDARD' && 'Standard'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">Not set</span>
                            )}
                            {(order as any).tracking_number && (
                              <p className="text-xs text-gray-600 mt-1 font-mono">
                                #{(order as any).tracking_number.substring(0, 10)}...
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Order Date</p>
                            <div className="flex items-center gap-1">
                              <LucideCalendar className="w-3 h-3 text-gray-400" />
                              <span className="text-xs">{formatDate(order.created_at)}</span>
                            </div>
                            <p className="text-xs text-gray-500">{formatTime(order.created_at)}</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openOrderDetail(order)}
                            className="flex-1"
                          >
                            <Eye className="w-4 w-4 mr-1" />
                            
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setNewStatus(order.status as OrderStatus || 'pending');
                              setIsStatusUpdateOpen(true);
                              // Remove gold highlighting when user edits the order
                              if (order.id) {
                                removeOrderHighlight(order.id);
                              }
                            }}
                            className="flex-1"
                          >
                            <Edit3 className="w-4 h-4 mr-1" />
                          
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border-purple-300 hover:from-purple-100 hover:to-purple-150 hover:border-purple-400 font-medium shadow-sm flex-1"
                            onClick={() => copyOrderInArabic(order)}
                          >
                            <Copy className="h-4 w-4 mr-1 text-purple-600" />
                            <span className="hidden sm:inline">Copy Arabic</span>
                            
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>



      {/* Order Detail Modal */}
      <Dialog open={isOrderDetailOpen} onOpenChange={setIsOrderDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details - {selectedOrder?.order_number}</DialogTitle>
            <DialogDescription>
              Complete order information and management
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-xs font-medium text-gray-600">Name</Label>
                      <p>{selectedOrder.customer_first_name} {selectedOrder.customer_last_name}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-gray-600">Phone</Label>
                      <p>{selectedOrder.customer_phone}</p>
                    </div>
                    {selectedOrder.customer_email && (
                      <div>
                        <Label className="text-xs font-medium text-gray-600">Email</Label>
                        <p>{selectedOrder.customer_email}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs font-medium text-gray-600">Address</Label>
                      <p>
                        {selectedOrder.billing_address_1}
                        {selectedOrder.billing_address_2 && `, ${selectedOrder.billing_address_2}`}
                        <br />
                        {selectedOrder.billing_city}, {selectedOrder.billing_country}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatPrice(selectedOrder.subtotal)}</span>
                    </div>
                    {selectedOrder.shipping_amount && selectedOrder.shipping_amount > 0 && (
                      <div className="flex justify-between">
                        <span>Shipping:</span>
                        <span>{formatPrice(selectedOrder.shipping_amount)}</span>
                      </div>
                    )}
                    {Number(selectedOrder.discount_amount) > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount:</span>
                        <span>-{formatPrice(Number(selectedOrder.discount_amount))}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>{formatPrice(selectedOrder.total_amount)}</span>
                    </div>

                    {/* Payment Method */}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-gray-500" />
                        Payment Method:
                      </span>
                      <span className="font-medium text-blue-600">
                        {selectedOrder.payment_method || 'Not specified'}
                      </span>
                    </div>
                    
                    {/* Shipping Information */}
                    {selectedOrder.status === 'shipped' && (
                      <div className="mt-4 pt-2 border-t">
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                          <Truck className="w-4 h-4" />
                          Shipping Details
                        </h4>
                        <div className="space-y-1 text-sm">
                          {(selectedOrder as any).shipping_method && (
                            <div className="flex justify-between">
                              <span>Method:</span>
                              <span className="font-medium">
                                {(selectedOrder as any).shipping_method === 'SMSA' && 'SMSA Express'}
                                {(selectedOrder as any).shipping_method === 'DRB' && 'DRB Logistics'}
                                {(selectedOrder as any).shipping_method === 'STANDARD' && 'Standard Shipping'}
                              </span>
                            </div>
                          )}
                          {(selectedOrder as any).tracking_number && (
                            <div className="flex justify-between">
                              <span>Tracking:</span>
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                {(selectedOrder as any).tracking_number}
                              </span>
                            </div>
                          )}
                          {(selectedOrder as any).shipped_at && (
                            <div className="flex justify-between">
                              <span>Shipped:</span>
                              <span>{formatDateTime((selectedOrder as any).shipped_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(selectedOrder.order_items as OrderItem[]).map((item, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded">
                        {/* Product Image */}
                        <div className="flex-shrink-0 w-16 h-16 rounded bg-white border flex items-center justify-center overflow-hidden">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.product_name}
                              className="object-contain w-full h-full"
                              loading="lazy"
                              onLoad={() => console.log(`✅ Image loaded for ${item.product_name}`)}
                              onError={(e) => console.log(`❌ Image failed to load for ${item.product_name}:`, e)}
                            />
                          ) : (
                            <div className="text-gray-300 text-2xl">🛒</div>
                          )}
                        </div>
                        {/* Product Info */}
                        <div className="flex-1">
                          <h4 className="font-medium">{item.product_name}</h4>
                          {item.sku && <p className="text-sm text-gray-600">SKU: {item.sku}</p>}
                          <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatPrice(parseFloat(item.price) * item.quantity)}</p>
                          <p className="text-sm text-gray-600">{formatPrice(parseFloat(item.price))} each</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Status History */}
              {statusHistory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Status History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {statusHistory.map((history) => (
                        <div key={history.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                          <div className="flex-1">
                            <p className="font-medium">
                              Status changed from {history.oldStatus} to {history.newStatus}
                            </p>
                            {history.reason && (
                              <p className="text-sm text-gray-600">Reason: {history.reason}</p>
                            )}
                            <p className="text-xs text-gray-500">
                              By {history.changedByName} on {history.changedAt ? formatDateTime(history.changedAt.toString()) : '—'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    Order Notes
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddNoteOpen(true)}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Add Note
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {orderNotes.map((note) => (
                      <div key={note.id} className="p-3 bg-gray-50 rounded">
                        <p className="text-sm">{note.note}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          By {note.createdByName} on {note.createdAt ? formatDateTime(note.createdAt.toString()) : '—'}
                        </p>
                      </div>
                    ))}
                    {orderNotes.length === 0 && (
                      <p className="text-sm text-gray-500">No notes added yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

                              {/* Source */}
                <div>
                  <Label className="text-xs font-medium text-gray-600">Order Source</Label>
                  <p>
                    {(!selectedOrder?.created_by_user_id || selectedOrder?.created_by_name === 'WooCommerce Import') ? (
                      <span className="text-xs font-semibold text-blue-600">WooCommerce</span>
                    ) : (
                      <span className="text-xs font-semibold text-green-600">Customer Service</span>
                    )}
                  </p>
                </div>

                {/* WooCommerce Sync Status */}
                <div>
                  <Label className="text-xs font-medium text-gray-600">WooCommerce Sync</Label>
                  <p className="flex items-center gap-2">
                    {selectedOrder?.woocommerce_order_id ? (
                      <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Synced (#{selectedOrder.woocommerce_order_id})
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-orange-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Not Synced
                      </span>
                    )}
                  </p>
                  {selectedOrder?.last_sync_attempt && (
                    <p className="text-xs text-gray-500 mt-1">
                      Last sync: {formatDateTime(selectedOrder.last_sync_attempt)}
                    </p>
                  )}
                </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => {
                    setNewStatus(selectedOrder.status as OrderStatus || 'pending');
                    setIsStatusUpdateOpen(true);
                    // Remove gold highlighting when user edits the order
                    if (selectedOrder?.id) {
                      removeOrderHighlight(selectedOrder.id);
                    }
                  }}
                  className="flex-1"
                >
                  Update Status
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsAddNoteOpen(true)}
                  className="flex-1"
                >
                  Add Note
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Update Modal */}
      <Dialog open={isStatusUpdateOpen} onOpenChange={setIsStatusUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Change the status of order {selectedOrder?.order_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={(value) => setNewStatus(value as OrderStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Shipping Method Selection - Only show when status is "shipped" */}
            {newStatus === 'shipped' && (
              <>
                <div>
                  <Label>Shipping Method</Label>
                  <Select value={shippingMethod} onValueChange={setShippingMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SMSA">SMSA Express</SelectItem>
                      <SelectItem value="DRB">DRB Logistics</SelectItem>
                      <SelectItem value="STANDARD">Standard Shipping</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tracking Number (Optional)</Label>
                  <Input
                    placeholder="Enter tracking number..."
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                  />
                </div>
              </>
            )}

            <div>
              <Label>Reason (Optional)</Label>
              <Textarea
                placeholder="Enter reason for status change..."
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusUpdateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateOrderStatus} disabled={isSyncing}>
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                'Update Status'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Modal */}
      <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Order Note</DialogTitle>
            <DialogDescription>
              Add a note to order {selectedOrder?.order_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Note</Label>
              <Textarea
                placeholder="Enter your note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddNoteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => addOrderNote()} disabled={!newNote.trim()}>
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WarehouseDashboard; 