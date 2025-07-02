import { supabase } from '@/integrations/supabase/client';
import { ShippingMethod } from '@/types';

export interface ShippingStats {
  methodName: string;
  methodDisplay: string;
  totalOrders: number;
  pendingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  avgProcessingDays: number;
}

export const shippingService = {
  // Get all active shipping methods
  async getShippingMethods(): Promise<ShippingMethod[]> {
    try {
      const { data, error } = await supabase
        .from('shipping_methods')
        .select('*')
        .eq('is_active', true)
        .order('display_name');

      if (error) throw error;

      return data.map(method => ({
        id: method.id,
        name: method.name,
        displayName: method.display_name,
        isActive: method.is_active
      }));
    } catch (error) {
      console.error('Error fetching shipping methods:', error);
      throw error;
    }
  },

  // Get shipping method display name
  getShippingMethodDisplayName(methodName: string): string {
    const displayNames: Record<string, string> = {
      'SMSA': 'SMSA Express',
      'DRB': 'DRB Logistics',
      'OUR_SHIPPED': 'Our Shipped',
      'STANDARD': 'Standard Shipping'
    };
    
    return displayNames[methodName] || methodName;
  },

  // Get shipping statistics
  async getShippingStats(): Promise<ShippingStats[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_shipping_stats');

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching shipping stats:', error);
      throw error;
    }
  },

  // Update order shipping information
  async updateOrderShipping(orderId: number, shippingMethod: string, trackingNumber?: string): Promise<void> {
    try {
      const updateData: any = {
        shipping_method: shippingMethod,
        shipped_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (trackingNumber?.trim()) {
        updateData.tracking_number = trackingNumber.trim();
      }

      const { error } = await supabase
        .from('order_submissions')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating order shipping:', error);
      throw error;
    }
  },

  // Get orders by shipping method
  async getOrdersByShippingMethod(methodName: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('order_submissions')
        .select(`
          *,
          shipped_by_user:users!shipped_by(name)
        `)
        .eq('shipping_method', methodName)
        .order('shipped_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching orders by shipping method:', error);
      throw error;
    }
  },

  // Quick ship order (set to shipped status with shipping method)
  async quickShipOrder(orderId: number, shippingMethod: string, trackingNumber?: string): Promise<void> {
    try {
      const { error } = await supabase
        .rpc('update_order_shipped_status', {
          order_id: orderId,
          shipping_method_name: shippingMethod,
          tracking_num: trackingNumber || null
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error quick shipping order:', error);
      throw error;
    }
  },

  // Search orders by tracking number
  async searchByTrackingNumber(trackingNumber: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('order_submissions')
        .select('*')
        .ilike('tracking_number', `%${trackingNumber}%`)
        .order('shipped_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error searching by tracking number:', error);
      throw error;
    }
  }
};

// Export individual functions for convenience
export const {
  getShippingMethods,
  getShippingMethodDisplayName,
  getShippingStats,
  updateOrderShipping,
  getOrdersByShippingMethod,
  quickShipOrder,
  searchByTrackingNumber
} = shippingService;

export default shippingService; 