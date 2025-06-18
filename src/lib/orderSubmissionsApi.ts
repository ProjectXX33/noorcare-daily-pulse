import { supabase } from '@/integrations/supabase/client';
import { PostgrestError } from '@supabase/supabase-js';
import wooCommerceAPI from '@/lib/woocommerceApi';

export interface OrderItem {
  product_id: number;
  product_name: string;
  quantity: number;
  price: string;
  sku?: string;
  regular_price?: string;
  sale_price?: string;
}

export interface OrderSubmission {
  id?: number;
  order_number?: string;
  woocommerce_order_id?: number;
  created_by_user_id?: string;
  created_by_name?: string;
  created_at?: string;
  updated_at?: string;
  
  // Customer Information
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  customer_email?: string;
  
  // Billing Address
  billing_address_1: string;
  billing_address_2?: string;
  billing_city: string;
  billing_state?: string;
  billing_postcode?: string;
  billing_country?: string;
  
  // Order Details
  order_items: OrderItem[];
  subtotal: number;
  discount_amount?: number;
  shipping_amount?: number;
  total_amount: number;
  
  // Coupon Information
  coupon_code?: string;
  coupon_discount_type?: string;
  coupon_amount?: string;
  
  // Custom Discount Information
  custom_discount_type?: string;
  custom_discount_amount?: number;
  custom_discount_reason?: string;
  
  // Additional Information
  customer_note?: string;
  internal_notes?: string;
  include_shipping?: boolean;
  
  // Order Status
  status?: string;
  payment_method?: string;
  payment_status?: string;
  
  // WooCommerce Integration
  is_synced_to_woocommerce?: boolean;
  sync_error?: string;
  last_sync_attempt?: string;
}

export interface OrderSubmissionFilters {
  search?: string;
  status?: string;
  created_by_user_id?: string;
  date_from?: string;
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
  customer_service_name?: string;
}

// Create a new order submission
export const createOrderSubmission = async (orderData: OrderSubmission, userId: string, userName?: string): Promise<OrderSubmission> => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log('Creating order for user:', userId);

    // Generate temporary order number - will be updated with WooCommerce number if sync succeeds
    const orderNumber = `TEMP-${Date.now()}`;

    const submissionData = {
      ...orderData,
      created_by_user_id: userId,
      created_by_name: userName || 'Unknown User',
      order_number: orderNumber,
    };

    console.log('Submitting order data:', submissionData);

    const { data, error } = await supabase
      .from('order_submissions')
      .insert(submissionData)
      .select('*')
      .single();

    if (error) {
      console.error('Error creating order submission:', error);
      throw new Error(`Failed to create order: ${error.message}`);
    }

    console.log('Order created successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in createOrderSubmission:', error);
    throw error;
  }
};

// Get orders for current user (Customer Service)
export const getMyOrderSubmissions = async (userId: string, filters: OrderSubmissionFilters = {}): Promise<OrderSubmission[]> => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    let query = supabase
      .from('order_submissions')
      .select('*')
      .eq('created_by_user_id', userId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.search) {
      query = query.ilike('search_text', `%${filters.search}%`);
    }

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    if (filters.min_amount !== undefined) {
      query = query.gte('total_amount', filters.min_amount);
    }

    if (filters.max_amount !== undefined) {
      query = query.lte('total_amount', filters.max_amount);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching my orders:', error);
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getMyOrderSubmissions:', error);
    throw error;
  }
};

// Get all orders (Admin only)
export const getAllOrderSubmissions = async (filters: OrderSubmissionFilters = {}): Promise<OrderSubmission[]> => {
  try {
    // Note: This function is designed to be called only by admin users
    // Access control should be handled by the calling component

    let query = supabase
      .from('order_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.search) {
      query = query.ilike('search_text', `%${filters.search}%`);
    }

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters.created_by_user_id) {
      query = query.eq('created_by_user_id', filters.created_by_user_id);
    }

    if (filters.customer_service_name) {
      query = query.ilike('created_by_name', `%${filters.customer_service_name}%`);
    }

    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    if (filters.min_amount !== undefined) {
      query = query.gte('total_amount', filters.min_amount);
    }

    if (filters.max_amount !== undefined) {
      query = query.lte('total_amount', filters.max_amount);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching all orders:', error);
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllOrderSubmissions:', error);
    throw error;
  }
};

// Update order submission
export const updateOrderSubmission = async (id: number, updates: Partial<OrderSubmission>): Promise<OrderSubmission> => {
  try {
    const { data, error } = await supabase
      .from('order_submissions')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating order submission:', error);
      throw new Error(`Failed to update order: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in updateOrderSubmission:', error);
    throw error;
  }
};

// Delete order submission (Admin only)
export const deleteOrderSubmission = async (id: number): Promise<void> => {
  try {
    const { error } = await supabase
      .from('order_submissions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting order submission:', error);
      throw new Error(`Failed to delete order: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in deleteOrderSubmission:', error);
    throw error;
  }
};

// Get order statistics for dashboard
export const getOrderStatistics = async (userId: string, isAdmin: boolean = false): Promise<{
  total_orders: number;
  total_revenue: number;
  pending_orders: number;
  processing_orders: number;
  completed_orders: number;
}> => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    let query = supabase.from('order_submissions').select('*');
    
    // If not admin, only get current user's orders
    if (!isAdmin) {
      query = query.eq('created_by_user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching order statistics:', error);
      throw new Error(`Failed to fetch statistics: ${error.message}`);
    }

    const orders = data || [];
    
    return {
      total_orders: orders.length,
      total_revenue: orders.reduce((sum, order) => sum + Number(order.total_amount), 0),
      pending_orders: orders.filter(order => order.status === 'pending').length,
      processing_orders: orders.filter(order => order.status === 'processing').length,
      completed_orders: orders.filter(order => order.status === 'completed').length,
    };
  } catch (error) {
    console.error('Error in getOrderStatistics:', error);
    throw error;
  }
};

// Get customer service representatives with order counts (Admin only)
export const getCustomerServiceOrderStats = async (): Promise<{
  user_id: string;
  user_name: string;
  order_count: number;
  total_revenue: number;
}[]> => {
  try {
    // Note: This function is designed to be called only by admin users
    // Access control should be handled by the calling component

    const { data, error } = await supabase
      .from('order_submissions')
      .select('created_by_user_id, created_by_name, total_amount');

    if (error) {
      console.error('Error fetching customer service stats:', error);
      throw new Error(`Failed to fetch statistics: ${error.message}`);
    }

    // Group by user and calculate stats
    const userStats = new Map();
    
    data?.forEach(order => {
      const userId = order.created_by_user_id;
      const userName = order.created_by_name;
      const amount = Number(order.total_amount);
      
      if (userStats.has(userId)) {
        const stats = userStats.get(userId);
        stats.order_count += 1;
        stats.total_revenue += amount;
      } else {
        userStats.set(userId, {
          user_id: userId,
          user_name: userName,
          order_count: 1,
          total_revenue: amount,
        });
      }
    });

    return Array.from(userStats.values()).sort((a, b) => b.order_count - a.order_count);
  } catch (error) {
    console.error('Error in getCustomerServiceOrderStats:', error);
    throw error;
  }
};

// Sync order status from WooCommerce
export const syncOrderStatusFromWooCommerce = async (orderSubmissionId: number): Promise<{
  success: boolean;
  message: string;
  updatedStatus?: string;
}> => {
  try {
    console.log('Syncing order status for submission:', orderSubmissionId);

    // Get the order submission from database
    const { data: orderSubmission, error: fetchError } = await supabase
      .from('order_submissions')
      .select('*')
      .eq('id', orderSubmissionId)
      .single();

    if (fetchError || !orderSubmission) {
      throw new Error(`Order submission not found: ${fetchError?.message}`);
    }

    // Check if the order has a WooCommerce order ID
    if (!orderSubmission.woocommerce_order_id) {
      return {
        success: false,
        message: 'Order has not been synced to WooCommerce yet'
      };
    }

    console.log('Fetching WooCommerce order:', orderSubmission.woocommerce_order_id);

    // Fetch the order from WooCommerce
    const wooOrder = await wooCommerceAPI.getOrder(orderSubmission.woocommerce_order_id);
    
    console.log('WooCommerce order status:', wooOrder.status);

    // Map WooCommerce status to our internal status
    const statusMap: { [key: string]: string } = {
      'pending': 'pending',
      'processing': 'processing', 
      'on-hold': 'on-hold',
      'completed': 'completed',
      'cancelled': 'cancelled',
      'refunded': 'refunded',
      'failed': 'failed'
    };

    const mappedStatus = statusMap[wooOrder.status] || wooOrder.status;

    // Update the status in our database if it's different
    if (orderSubmission.status !== mappedStatus) {
      const { error: updateError } = await supabase
        .from('order_submissions')
        .update({ 
          status: mappedStatus,
          last_sync_attempt: new Date().toISOString()
        })
        .eq('id', orderSubmissionId);

      if (updateError) {
        throw new Error(`Failed to update order status: ${updateError.message}`);
      }

      console.log(`Order status updated from '${orderSubmission.status}' to '${mappedStatus}'`);

      return {
        success: true,
        message: `Order status synced successfully: ${mappedStatus}`,
        updatedStatus: mappedStatus
      };
    } else {
      return {
        success: true,
        message: 'Order status is already up to date',
        updatedStatus: mappedStatus
      };
    }

  } catch (error) {
    console.error('Error syncing order status:', error);
    
    // Update last sync attempt even if failed
    await supabase
      .from('order_submissions')
      .update({ 
        last_sync_attempt: new Date().toISOString(),
        sync_error: error.message
      })
      .eq('id', orderSubmissionId);

    return {
      success: false,
      message: `Failed to sync order status: ${error.message}`
    };
  }
};

// Retry syncing an order that failed to sync to WooCommerce
export const retrySyncOrderToWooCommerce = async (orderSubmissionId: number): Promise<{
  success: boolean;
  message: string;
  orderNumber?: string;
}> => {
  try {
    console.log('🔄 Retrying WooCommerce sync for order:', orderSubmissionId);

    // Get the order submission from database
    const { data: orderSubmission, error: fetchError } = await supabase
      .from('order_submissions')
      .select('*')
      .eq('id', orderSubmissionId)
      .single();

    if (fetchError || !orderSubmission) {
      throw new Error(`Order submission not found: ${fetchError?.message}`);
    }

    // Check if already synced
    if (orderSubmission.is_synced_to_woocommerce && orderSubmission.woocommerce_order_id) {
      return {
        success: true,
        message: 'Order is already synced to WooCommerce',
        orderNumber: orderSubmission.order_number
      };
    }

    // Prepare order data for WooCommerce
    const orderData = {
      payment_method: orderSubmission.payment_method || 'cod',
      payment_method_title: 'Cash on Delivery',
      set_paid: false,
      status: 'processing',
      billing: {
        first_name: orderSubmission.customer_first_name,
        last_name: orderSubmission.customer_last_name,
        company: '',
        address_1: orderSubmission.billing_address_1,
        address_2: orderSubmission.billing_address_2 || '',
        city: orderSubmission.billing_city,
        state: orderSubmission.billing_state || '',
        postcode: orderSubmission.billing_postcode || '',
        country: orderSubmission.billing_country || 'SA',
        email: orderSubmission.customer_email || '',
        phone: orderSubmission.customer_phone
      },
      shipping: {
        first_name: orderSubmission.customer_first_name,
        last_name: orderSubmission.customer_last_name,
        company: '',
        address_1: orderSubmission.billing_address_1,
        address_2: orderSubmission.billing_address_2 || '',
        city: orderSubmission.billing_city,
        state: orderSubmission.billing_state || '',
        postcode: orderSubmission.billing_postcode || '',
        country: orderSubmission.billing_country || 'SA',
        phone: orderSubmission.customer_phone
      },
      line_items: (orderSubmission.order_items as OrderItem[]).map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      })),
      shipping_lines: orderSubmission.include_shipping && orderSubmission.shipping_amount && orderSubmission.shipping_amount > 0 ? [
        {
          method_id: 'flat_rate',
          method_title: 'Standard Shipping',
          total: orderSubmission.shipping_amount.toString()
        }
      ] : [],
      coupon_lines: orderSubmission.coupon_code ? [
        {
          code: orderSubmission.coupon_code
        }
      ] : [],
      customer_note: orderSubmission.customer_note || '',
      meta_data: [
        {
          key: '_created_by_customer_service',
          value: orderSubmission.created_by_name || 'Customer Service'
        },
        {
          key: '_internal_order_id',
          value: orderSubmission.id?.toString() || ''
        },
        {
          key: '_retry_sync',
          value: 'true'
        }
      ]
    };

    console.log('📦 Creating order in WooCommerce (retry):', orderData);

    // Create order in WooCommerce
    const createdOrder = await wooCommerceAPI.createOrder(orderData);

    console.log('✅ Order successfully created in WooCommerce:', createdOrder);

    // Update our database record with the real WooCommerce order info
    const { error: updateError } = await supabase
      .from('order_submissions')
      .update({
        order_number: `#${createdOrder.number}`,
        woocommerce_order_id: createdOrder.id,
        is_synced_to_woocommerce: true,
        sync_error: null,
        last_sync_attempt: new Date().toISOString(),
        status: 'processing'
      })
      .eq('id', orderSubmissionId);

    if (updateError) {
      throw new Error(`Failed to update order record: ${updateError.message}`);
    }

    return {
      success: true,
      message: `Order successfully synced to WooCommerce as #${createdOrder.number}`,
      orderNumber: `#${createdOrder.number}`
    };

  } catch (error: any) {
    console.error('❌ Error retrying WooCommerce sync:', error);

    // Update last sync attempt and error
    await supabase
      .from('order_submissions')
      .update({
        sync_error: error.message || 'Retry sync failed',
        last_sync_attempt: new Date().toISOString(),
        is_synced_to_woocommerce: false
      })
      .eq('id', orderSubmissionId);

    return {
      success: false,
      message: `Failed to sync order to WooCommerce: ${error.message}`
    };
  }
};

// Sync all order statuses from WooCommerce (for orders that have WooCommerce IDs)
export const syncAllOrderStatusesFromWooCommerce = async (): Promise<{
  success: boolean;
  message: string;
  synced_count: number;
  errors: string[];
}> => {
  try {
    console.log('Starting bulk sync of order statuses...');

    // Get all orders that have WooCommerce order IDs
    const { data: orders, error: fetchError } = await supabase
      .from('order_submissions')
      .select('id, woocommerce_order_id, status, order_number')
      .not('woocommerce_order_id', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch orders: ${fetchError.message}`);
    }

    if (!orders || orders.length === 0) {
      return {
        success: true,
        message: 'No orders found with WooCommerce IDs to sync',
        synced_count: 0,
        errors: []
      };
    }

    console.log(`Found ${orders.length} orders to sync`);

    let syncedCount = 0;
    const errors: string[] = [];

    // Sync each order (with a small delay to avoid overwhelming the API)
    for (const order of orders) {
      try {
        const result = await syncOrderStatusFromWooCommerce(order.id);
        if (result.success) {
          syncedCount++;
        } else {
          errors.push(`Order ${order.order_number}: ${result.message}`);
        }
        
        // Small delay to avoid API rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        errors.push(`Order ${order.order_number}: ${error.message}`);
      }
    }

    return {
      success: true,
      message: `Sync completed. ${syncedCount}/${orders.length} orders synced successfully`,
      synced_count: syncedCount,
      errors: errors
    };

  } catch (error) {
    console.error('Error in bulk sync:', error);
    return {
      success: false,
      message: `Bulk sync failed: ${error.message}`,
      synced_count: 0,
      errors: [error.message]
    };
  }
}; 