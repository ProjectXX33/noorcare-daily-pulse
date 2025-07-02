import { OrderSubmission, OrderItem } from './orderSubmissionsApi';

// Payment Gateway Configuration
interface PaymentGatewayConfig {
  tabby: {
    apiKey: string;
    secretKey: string;
    merchantCode: string;
    language: string;
    timeout: number;
    baseUrl: string;
  };
  tamara: {
    apiUrl: string;
    merchantToken: string;
    notificationKey: string;
    publicKey: string;
  };
  paypal: {
    clientId: string;
    baseUrl: string;
  };
  stripe: {
    publishableKey: string;
    baseUrl: string;
  };
}

// Payment gateway configuration (you should move these to environment variables)
const PAYMENT_CONFIG: PaymentGatewayConfig = {
  tabby: {
    apiKey: import.meta.env.VITE_TABBY_API_KEY || 'pk_0698b694-6843-4b4b-b70f-dd68f76cf0a4',
    secretKey: import.meta.env.VITE_TABBY_SECRET_KEY || '',
    merchantCode: import.meta.env.VITE_TABBY_MERCHANT_CODE || 'SA',
    language: import.meta.env.VITE_TABBY_LANGUAGE || 'ar',
    timeout: parseInt(import.meta.env.VITE_TABBY_TIMEOUT || '320'),
    baseUrl: 'https://checkout.tabby.ai'
  },
  tamara: {
    apiUrl: import.meta.env.VITE_TAMARA_API_URL || 'https://api.tamara.co',
    merchantToken: import.meta.env.VITE_TAMARA_MERCHANT_TOKEN || '',
    notificationKey: import.meta.env.VITE_TAMARA_NOTIFICATION_KEY || '',
    publicKey: import.meta.env.VITE_TAMARA_PUBLIC_KEY || ''
  },
  paypal: {
    clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || '',
    baseUrl: 'https://www.paypal.com'
  },
  stripe: {
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
    baseUrl: 'https://checkout.stripe.com'
  }
};

// Payment method types
export type PaymentMethodType = 'cod' | 'tabby' | 'tamara' | 'paypal' | 'stripe' | 'bacs' | 'cheque';

// Payment session data
export interface PaymentSession {
  sessionId: string;
  orderId: string;
  checkoutUrl: string;
  expiresAt: Date;
}

// Generate a unique session ID
const generateSessionId = (): string => {
  return 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

// Generate a unique order ID for payment gateways
const generatePaymentOrderId = (): string => {
  return 'ord_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

// Format order items for payment gateways
const formatOrderItemsForGateway = (items: OrderItem[]): any[] => {
  return items.map(item => ({
    name: item.product_name,
    sku: item.sku || `product-${item.product_id}`,
    quantity: item.quantity,
    unit_price: parseFloat(item.price),
    total_amount: parseFloat(item.price) * item.quantity
  }));
};

// Create Tabby checkout session
export const createTabbyCheckout = async (orderData: OrderSubmission): Promise<PaymentSession> => {
  const sessionId = generateSessionId();
  const orderId = generatePaymentOrderId();
  
  // Tabby checkout URL with parameters
  const checkoutUrl = new URL(`${PAYMENT_CONFIG.tabby.baseUrl}/otp`);
  checkoutUrl.searchParams.set('apiKey', PAYMENT_CONFIG.tabby.apiKey);
  checkoutUrl.searchParams.set('lang', PAYMENT_CONFIG.tabby.language === 'ar' ? 'ara' : 'en');
  checkoutUrl.searchParams.set('merchantCode', PAYMENT_CONFIG.tabby.merchantCode);
  checkoutUrl.searchParams.set('product', 'installments');
  checkoutUrl.searchParams.set('sessionId', sessionId);
  checkoutUrl.searchParams.set('orderId', orderId);
  checkoutUrl.searchParams.set('amount', orderData.total_amount.toString());
  checkoutUrl.searchParams.set('currency', 'SAR');
  checkoutUrl.searchParams.set('timeout', PAYMENT_CONFIG.tabby.timeout.toString());
  checkoutUrl.searchParams.set('fl', '1');
  
  // Add customer information
  checkoutUrl.searchParams.set('customer_first_name', orderData.customer_first_name);
  checkoutUrl.searchParams.set('customer_last_name', orderData.customer_last_name);
  checkoutUrl.searchParams.set('customer_phone', orderData.customer_phone);
  if (orderData.customer_email) {
    checkoutUrl.searchParams.set('customer_email', orderData.customer_email);
  }
  
  return {
    sessionId,
    orderId,
    checkoutUrl: checkoutUrl.toString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
  };
};

// Create Tamara checkout session
export const createTamaraCheckout = async (orderData: OrderSubmission): Promise<PaymentSession> => {
  const sessionId = generateSessionId();
  const orderId = generatePaymentOrderId();
  
  // Tamara checkout URL with parameters
  const checkoutUrl = new URL('https://checkout.tamara.co/login');
  checkoutUrl.searchParams.set('locale', 'ar_SA');
  checkoutUrl.searchParams.set('orderId', orderId);
  checkoutUrl.searchParams.set('sessionId', sessionId);
  checkoutUrl.searchParams.set('amount', orderData.total_amount.toString());
  checkoutUrl.searchParams.set('currency', 'SAR');
  checkoutUrl.searchParams.set('id_match_another_user', 'changing_phone');
  checkoutUrl.searchParams.set('ivr', 'ivr_enabled');
  checkoutUrl.searchParams.set('payment_plan_content', 'new');
  checkoutUrl.searchParams.set('payment_fee_popup', 'detail');
  checkoutUrl.searchParams.set('checkout_canary', 'false');
  
  // Generate checkout ID
  const checkoutId = 'checkout_' + Math.random().toString(36).substr(2, 9);
  checkoutUrl.searchParams.set('checkoutId', checkoutId);
  
  return {
    sessionId,
    orderId,
    checkoutUrl: checkoutUrl.toString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
  };
};

// Create PayPal checkout session
export const createPayPalCheckout = async (orderData: OrderSubmission): Promise<PaymentSession> => {
  const sessionId = generateSessionId();
  const orderId = generatePaymentOrderId();
  
  // For PayPal, we would typically use their SDK to create a checkout
  // This is a simplified URL structure - you'll need to implement proper PayPal integration
  const checkoutUrl = new URL(`${PAYMENT_CONFIG.paypal.baseUrl}/checkoutnow`);
  checkoutUrl.searchParams.set('token', sessionId);
  checkoutUrl.searchParams.set('amount', orderData.total_amount.toString());
  checkoutUrl.searchParams.set('currency_code', 'SAR');
  
  return {
    sessionId,
    orderId,
    checkoutUrl: checkoutUrl.toString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
  };
};

// Create Stripe checkout session
export const createStripeCheckout = async (orderData: OrderSubmission): Promise<PaymentSession> => {
  const sessionId = generateSessionId();
  const orderId = generatePaymentOrderId();
  
  // For Stripe, you would typically create a checkout session via their API
  // This is a placeholder URL structure
  const checkoutUrl = new URL(`${PAYMENT_CONFIG.stripe.baseUrl}/pay`);
  checkoutUrl.searchParams.set('session_id', sessionId);
  
  return {
    sessionId,
    orderId,
    checkoutUrl: checkoutUrl.toString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
  };
};

// Main payment gateway service
export class PaymentGatewayService {
  
  // Create checkout session based on payment method
  static async createCheckoutSession(
    paymentMethod: PaymentMethodType,
    orderData: OrderSubmission
  ): Promise<PaymentSession | null> {
    
    try {
      switch (paymentMethod) {
        case 'tabby':
          return await createTabbyCheckout(orderData);
          
        case 'tamara':
          return await createTamaraCheckout(orderData);
          
        case 'paypal':
          return await createPayPalCheckout(orderData);
          
        case 'stripe':
          return await createStripeCheckout(orderData);
          
        case 'cod':
        case 'bacs':
        case 'cheque':
          // These don't need external checkout sessions
          return null;
          
        default:
          throw new Error(`Unsupported payment method: ${paymentMethod}`);
      }
    } catch (error) {
      console.error(`Error creating ${paymentMethod} checkout session:`, error);
      throw error;
    }
  }
  
  // Get payment method display information
  static getPaymentMethodInfo(methodId: string) {
    const paymentMethods: Record<string, { title: string; description: string; requiresRedirect: boolean }> = {
      cod: {
        title: 'Cash on Delivery',
        description: 'Pay with cash when your order is delivered',
        requiresRedirect: false
      },
      tabby: {
        title: 'Tabby - Pay in 4 installments',
        description: 'Split your payment into 4 interest-free installments',
        requiresRedirect: true
      },
      tamara: {
        title: 'Tamara - Buy now, pay later',
        description: 'Pay later in flexible installments',
        requiresRedirect: true
      },
      paypal: {
        title: 'PayPal',
        description: 'Pay securely with your PayPal account',
        requiresRedirect: true
      },
      stripe: {
        title: 'Credit/Debit Card',
        description: 'Pay securely with your credit or debit card',
        requiresRedirect: true
      },
      bacs: {
        title: 'Bank Transfer',
        description: 'Direct bank transfer',
        requiresRedirect: false
      },
      cheque: {
        title: 'Cheque Payment',
        description: 'Pay by cheque',
        requiresRedirect: false
      }
    };
    
    return paymentMethods[methodId] || {
      title: methodId,
      description: 'Payment method',
      requiresRedirect: false
    };
  }
  
  // Check if payment method is configured
  static isPaymentMethodConfigured(methodId: PaymentMethodType): boolean {
    switch (methodId) {
      case 'tabby':
        return !!(PAYMENT_CONFIG.tabby.apiKey && PAYMENT_CONFIG.tabby.secretKey);
      case 'tamara':
        return !!PAYMENT_CONFIG.tamara.merchantToken;
      case 'paypal':
        return !!PAYMENT_CONFIG.paypal.clientId;
      case 'stripe':
        return !!PAYMENT_CONFIG.stripe.publishableKey;
      case 'cod':
      case 'bacs':
      case 'cheque':
        return true; // These don't require configuration
      default:
        return false;
    }
  }
}

export default PaymentGatewayService; 