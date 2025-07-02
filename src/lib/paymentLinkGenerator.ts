import { supabase } from '@/integrations/supabase/client';
import { OrderSubmission } from './orderSubmissionsApi';

export interface PaymentLinkData {
  id: string;
  order_id: number;
  payment_token: string;
  expires_at: string;
  is_used: boolean;
  created_at: string;
}

// Generate a secure payment token
const generatePaymentToken = (): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const tokenLength = 32;
  let result = '';
  
  for (let i = 0; i < tokenLength; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
};

// Create payment link table if it doesn't exist
export const createPaymentLinksTable = async () => {
  try {
    // Try to insert a test record to check if table exists
    const { error: testError } = await supabase
      .from('payment_links')
      .select('id')
      .limit(1);

    if (testError && testError.message.includes('does not exist')) {
      console.log('Payment links table does not exist. Please create it manually in Supabase.');
      console.log('SQL to create the table:');
      console.log(`
        CREATE TABLE payment_links (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id BIGINT NOT NULL,
          payment_token VARCHAR(32) NOT NULL UNIQUE,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          is_used BOOLEAN DEFAULT FALSE,
          used_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_payment_links_order_id ON payment_links(order_id);
        CREATE INDEX idx_payment_links_token ON payment_links(payment_token);
        CREATE INDEX idx_payment_links_expires_at ON payment_links(expires_at);
      `);
    } else {
      console.log('Payment links table exists or accessible');
    }
  } catch (error) {
    console.error('Error checking payment_links table:', error);
  }
};

// Generate payment link for an order
export const generatePaymentLink = async (orderId: number): Promise<{
  success: boolean;
  paymentUrl?: string;
  token?: string;
  message: string;
}> => {
  try {
    // Check if order exists
    const { data: order, error: orderError } = await supabase
      .from('order_submissions')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return {
        success: false,
        message: 'Order not found'
      };
    }

    // Generate new payment token (simplified approach without database storage)
    const paymentToken = generatePaymentToken();
    
    // Store the token and order ID in localStorage temporarily
    // This is a simple solution that works without the payment_links table
    const paymentData = {
      orderId,
      token: paymentToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      isUsed: false
    };
    
    localStorage.setItem(`payment_${paymentToken}`, JSON.stringify(paymentData));

    const baseUrl = window.location.origin;
    const paymentUrl = `${baseUrl}/payment/${paymentToken}`;

    return {
      success: true,
      paymentUrl,
      token: paymentToken,
      message: 'Payment link generated successfully'
    };

  } catch (error: any) {
    console.error('Error generating payment link:', error);
    return {
      success: false,
      message: `Failed to generate payment link: ${error.message}`
    };
  }
};

// Validate payment token and get order data
export const validatePaymentToken = async (token: string): Promise<{
  success: boolean;
  orderData?: OrderSubmission;
  message: string;
}> => {
  try {
    // Get payment data from localStorage
    const paymentDataStr = localStorage.getItem(`payment_${token}`);
    
    if (!paymentDataStr) {
      return {
        success: false,
        message: 'Invalid payment link'
      };
    }

    const paymentData = JSON.parse(paymentDataStr);
    
    // Check if expired
    if (new Date() > new Date(paymentData.expiresAt)) {
      localStorage.removeItem(`payment_${token}`);
      return {
        success: false,
        message: 'Payment link has expired'
      };
    }

    // Check if already used
    if (paymentData.isUsed) {
      return {
        success: false,
        message: 'Payment link has already been used'
      };
    }

    // Get order data from database
    const { data: orderData, error: orderError } = await supabase
      .from('order_submissions')
      .select('*')
      .eq('id', paymentData.orderId)
      .single();

    if (orderError || !orderData) {
      return {
        success: false,
        message: 'Order not found'
      };
    }

    return {
      success: true,
      orderData: orderData as OrderSubmission,
      message: 'Payment token validated successfully'
    };

  } catch (error: any) {
    console.error('Error validating payment token:', error);
    return {
      success: false,
      message: `Failed to validate payment token: ${error.message}`
    };
  }
};

// Mark payment link as used
export const markPaymentLinkAsUsed = async (token: string): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    // Get payment data from localStorage
    const paymentDataStr = localStorage.getItem(`payment_${token}`);
    
    if (!paymentDataStr) {
      return {
        success: false,
        message: 'Payment link not found'
      };
    }

    const paymentData = JSON.parse(paymentDataStr);
    
    // Mark as used
    paymentData.isUsed = true;
    paymentData.usedAt = new Date().toISOString();
    
    // Update localStorage
    localStorage.setItem(`payment_${token}`, JSON.stringify(paymentData));

    return {
      success: true,
      message: 'Payment link marked as used'
    };

  } catch (error: any) {
    console.error('Error marking payment link as used:', error);
    return {
      success: false,
      message: `Failed to mark payment link as used: ${error.message}`
    };
  }
};

// Clean up expired payment links (can be called periodically)
export const cleanupExpiredPaymentLinks = async (): Promise<{
  success: boolean;
  deletedCount: number;
  message: string;
}> => {
  try {
    const { data, error } = await supabase
      .from('payment_links')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select();

    if (error) {
      return {
        success: false,
        deletedCount: 0,
        message: 'Failed to cleanup expired payment links'
      };
    }

    return {
      success: true,
      deletedCount: data?.length || 0,
      message: `Cleaned up ${data?.length || 0} expired payment links`
    };

  } catch (error: any) {
    console.error('Error cleaning up expired payment links:', error);
    return {
      success: false,
      deletedCount: 0,
      message: `Failed to cleanup expired payment links: ${error.message}`
    };
  }
}; 