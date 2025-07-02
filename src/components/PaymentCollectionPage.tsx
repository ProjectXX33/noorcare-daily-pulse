import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  CreditCard, 
  Banknote, 
  Truck, 
  Package, 
  User, 
  MapPin, 
  Phone,
  CheckCircle,
  ArrowLeft,
  Loader2,
  ShoppingCart,
  Mail
} from 'lucide-react';
import { OrderSubmission, OrderItem } from '@/lib/orderSubmissionsApi';
import wooCommerceAPI, { WooCommercePaymentMethod } from '@/lib/woocommerceApi';
import { supabase } from '@/integrations/supabase/client';
import PaymentGatewayService, { PaymentMethodType } from '@/lib/paymentGatewayService';

interface PaymentCollectionPageProps {
  orderData: OrderSubmission;
  onBack: () => void;
  onPaymentComplete: (paymentMethod: string) => void;
}

const PaymentCollectionPage: React.FC<PaymentCollectionPageProps> = ({
  orderData,
  onBack,
  onPaymentComplete
}) => {
  const [paymentMethods, setPaymentMethods] = useState<WooCommercePaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Fetch payment methods on component mount
  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    setIsLoadingPaymentMethods(true);
    try {
      let methods = await wooCommerceAPI.fetchPaymentMethods();
      
      // Add our custom payment methods that might not be in WooCommerce
      const customPaymentMethods: WooCommercePaymentMethod[] = [
        {
          id: 'tabby',
          title: 'Tabby - Pay in 4 installments', 
          description: 'Split your payment into 4 interest-free installments',
          order: 10,
          enabled: PaymentGatewayService.isPaymentMethodConfigured('tabby'),
          method_title: 'Tabby',
          method_description: 'Pay in installments with Tabby',
          settings: {}
        },
        {
          id: 'tamara',
          title: 'Tamara - Buy now, pay later',
          description: 'Pay later in flexible installments',
          order: 11,
          enabled: PaymentGatewayService.isPaymentMethodConfigured('tamara'),
          method_title: 'Tamara',
          method_description: 'Buy now, pay later with Tamara',
          settings: {}
        }
      ];

      // Add custom methods if they're not already present
      customPaymentMethods.forEach(customMethod => {
        const existingMethod = methods.find(m => m.id === customMethod.id);
        if (!existingMethod && customMethod.enabled) {
          methods.push(customMethod);
        }
      });

      // Filter only enabled methods
      methods = methods.filter(method => method.enabled);

      setPaymentMethods(methods);
      
      // Auto-select first available payment method
      if (methods.length > 0) {
        setSelectedPaymentMethod(methods[0].id);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      
      // Fallback to default payment methods if API fails
      const fallbackMethods: WooCommercePaymentMethod[] = [
        {
          id: 'cod',
          title: 'Cash on Delivery',
          description: 'Pay with cash upon delivery.',
          order: 1,
          enabled: true,
          method_title: 'Cash on Delivery',
          method_description: 'Pay with cash when your order is delivered.',
          settings: {}
        },
        {
          id: 'tabby',
          title: 'Tabby - Pay in 4 installments',
          description: 'Split your payment into 4 interest-free installments',
          order: 2,
          enabled: PaymentGatewayService.isPaymentMethodConfigured('tabby'),
          method_title: 'Tabby',
          method_description: 'Pay in installments with Tabby',
          settings: {}
        },
        {
          id: 'tamara',
          title: 'Tamara - Buy now, pay later',
          description: 'Pay later in flexible installments',
          order: 3,
          enabled: PaymentGatewayService.isPaymentMethodConfigured('tamara'),
          method_title: 'Tamara',
          method_description: 'Buy now, pay later with Tamara',
          settings: {}
        },
        {
          id: 'bacs',
          title: 'Direct Bank Transfer',
          description: 'Make your payment directly into our bank account.',
          order: 4,
          enabled: true,
          method_title: 'Direct Bank Transfer',
          method_description: 'Make your payment directly into our bank account.',
          settings: {}
        }
      ].filter(method => method.enabled);
      
      setPaymentMethods(fallbackMethods);
      
      if (fallbackMethods.length > 0) {
        setSelectedPaymentMethod(fallbackMethods[0].id);
      }
      
      toast.error('Failed to load payment methods, using defaults');
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!selectedPaymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    setIsProcessingPayment(true);
    try {
      // Update the order with selected payment method
      const selectedMethod = paymentMethods.find(method => method.id === selectedPaymentMethod);
      
      if (!selectedMethod) {
        throw new Error('Selected payment method not found');
      }

      // Get payment method info from our service
      const paymentInfo = PaymentGatewayService.getPaymentMethodInfo(selectedPaymentMethod);

      // Update order in database with payment method
      const { error: updateError } = await supabase
        .from('order_submissions')
        .update({
          payment_method: paymentInfo.title,
          payment_status: selectedPaymentMethod === 'cod' ? 'pending' : 'awaiting_payment',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderData.id);

      if (updateError) {
        throw new Error(`Failed to update order: ${updateError.message}`);
      }

      // Check if this payment method requires external checkout
      if (paymentInfo.requiresRedirect) {
        try {
          // Create checkout session with payment gateway
          console.log(`Creating ${selectedPaymentMethod} checkout session...`);
          const paymentSession = await PaymentGatewayService.createCheckoutSession(
            selectedPaymentMethod as PaymentMethodType,
            orderData
          );

          if (paymentSession && paymentSession.checkoutUrl) {
            // Store payment session info in the order for tracking
            const { error: sessionError } = await supabase
              .from('order_submissions')
              .update({
                internal_notes: `Payment session created: ${paymentSession.sessionId}`,
                updated_at: new Date().toISOString()
              })
              .eq('id', orderData.id);

            if (sessionError) {
              console.warn('Failed to update payment session info:', sessionError);
            }

            toast.success(`Redirecting to ${paymentInfo.title}...`);
            
            // Add a small delay to show the success message
            setTimeout(() => {
              // Redirect to payment gateway
              window.location.href = paymentSession.checkoutUrl;
            }, 1000);
            
            return;
          } else {
            throw new Error('Failed to create payment session');
          }
        } catch (gatewayError) {
          console.error(`Error creating ${selectedPaymentMethod} checkout:`, gatewayError);
          throw new Error(`Failed to redirect to ${paymentInfo.title}. Please try again.`);
        }
      }

      // For non-redirect payment methods (COD, Bank Transfer, etc.)
      if (orderData.woocommerce_order_id) {
        try {
          // Note: WooCommerce doesn't allow updating payment method after order creation
          // This would require creating a new order or using payment gateway webhooks
          console.log('Order payment method updated locally. WooCommerce integration would require payment gateway setup.');
        } catch (wooError) {
          console.warn('Could not update WooCommerce order payment method:', wooError);
        }
      }

      toast.success(`Payment method selected: ${paymentInfo.title}`);
      onPaymentComplete(selectedPaymentMethod);
      
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast.error(`Failed to process payment: ${error.message}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const getPaymentMethodIcon = (methodId: string) => {
    switch (methodId) {
      case 'cod':
        return <Banknote className="w-5 h-5" />;
      case 'tabby':
        return <CreditCard className="w-5 h-5 text-pink-600" />;
      case 'tamara':
        return <CreditCard className="w-5 h-5 text-green-600" />;
      case 'bacs':
      case 'cheque':
        return <CreditCard className="w-5 h-5" />;
      case 'paypal':
        return <CreditCard className="w-5 h-5 text-blue-600" />;
      case 'stripe':
      case 'stripe_cc':
        return <CreditCard className="w-5 h-5 text-purple-600" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Complete Your Payment</h1>
          <p className="text-gray-600">Order #{orderData.order_number}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Name</Label>
                    <p className="text-gray-900">{orderData.customer_first_name} {orderData.customer_last_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Phone</Label>
                    <p className="text-gray-900 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {orderData.customer_phone}
                    </p>
                  </div>
                  {orderData.customer_email && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Email</Label>
                      <p className="text-gray-900 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {orderData.customer_email}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Address</Label>
                    <p className="text-gray-900 flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      <span>
                        {orderData.billing_address_1}
                        {orderData.billing_address_2 && `, ${orderData.billing_address_2}`}
                        <br />
                        {orderData.billing_city}, {orderData.billing_country}
                      </span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Order Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(orderData.order_items as OrderItem[]).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.product_name}</h3>
                        {item.sku && (
                          <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                        )}
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {formatPrice(parseFloat(item.price) * item.quantity)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatPrice(parseFloat(item.price))} each
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Select Payment Method
                </CardTitle>
                <CardDescription>
                  Choose how you would like to pay for your order
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPaymentMethods ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="ml-2">Loading payment methods...</span>
                  </div>
                ) : (
                  <RadioGroup
                    value={selectedPaymentMethod}
                    onValueChange={setSelectedPaymentMethod}
                    className="space-y-3"
                  >
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedPaymentMethod === method.id
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedPaymentMethod(method.id)}
                      >
                        <RadioGroupItem value={method.id} id={method.id} />
                        <div className="flex items-center gap-3 flex-1">
                          {getPaymentMethodIcon(method.id)}
                          <div>
                            <Label htmlFor={method.id} className="font-medium cursor-pointer">
                              {method.title}
                            </Label>
                            <p className="text-sm text-gray-600">{method.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Total & Payment */}
          <div className="space-y-6">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatPrice(orderData.subtotal)}</span>
                  </div>
                  
                  {orderData.discount_amount && orderData.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{formatPrice(orderData.discount_amount)}</span>
                    </div>
                  )}
                  
                  {orderData.shipping_amount && orderData.shipping_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Truck className="w-4 h-4" />
                        Shipping
                      </span>
                      <span>{formatPrice(orderData.shipping_amount)}</span>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span className="text-emerald-600">{formatPrice(orderData.total_amount)}</span>
                  </div>
                </div>

                <Button
                  onClick={handleProcessPayment}
                  disabled={!selectedPaymentMethod || isProcessingPayment}
                  className="w-full"
                  size="lg"
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete Payment
                    </>
                  )}
                </Button>

                {selectedPaymentMethod === 'cod' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Cash on Delivery:</strong> You will pay when your order is delivered to your address.
                    </p>
                  </div>
                )}

                {selectedPaymentMethod === 'tabby' && (
                  <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
                    <p className="text-sm text-pink-800">
                      <strong>Tabby:</strong> You will be redirected to Tabby to split your payment into 4 interest-free installments.
                    </p>
                  </div>
                )}

                {selectedPaymentMethod === 'tamara' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      <strong>Tamara:</strong> You will be redirected to Tamara to pay later in flexible installments.
                    </p>
                  </div>
                )}

                {selectedPaymentMethod && 
                 !['cod', 'tabby', 'tamara', 'bacs', 'cheque'].includes(selectedPaymentMethod) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-800">
                      <strong>Note:</strong> You will be redirected to complete your payment securely.
                    </p>
                  </div>
                )}

                {['bacs', 'cheque'].includes(selectedPaymentMethod) && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-sm text-gray-800">
                      <strong>Bank Transfer/Cheque:</strong> Payment instructions will be provided after order confirmation.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCollectionPage; 