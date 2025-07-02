import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  AlertCircle,
  CheckCircle,
  Loader2,
  Shield,
  Clock
} from 'lucide-react';
import PaymentCollectionPage from '@/components/PaymentCollectionPage';
import { validatePaymentToken, markPaymentLinkAsUsed } from '@/lib/paymentLinkGenerator';
import { OrderSubmission } from '@/lib/orderSubmissionsApi';

const PaymentPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [orderData, setOrderData] = useState<OrderSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setErrorMessage('No payment token provided');
      setIsLoading(false);
    }
  }, [token]);

  const validateToken = async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const result = await validatePaymentToken(token);
      
      if (result.success && result.orderData) {
        setOrderData(result.orderData);
        setIsValidToken(true);
      } else {
        setErrorMessage(result.message);
        setIsValidToken(false);
      }
    } catch (error: any) {
      console.error('Error validating payment token:', error);
      setErrorMessage('Failed to validate payment link');
      setIsValidToken(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentComplete = async (paymentMethod: string) => {
    if (!token) return;

    try {
      // Mark payment link as used
      await markPaymentLinkAsUsed(token);
      setPaymentCompleted(true);
      
      toast.success('Payment completed successfully!');
    } catch (error: any) {
      console.error('Error completing payment:', error);
      toast.error('Payment completed but failed to update link status');
    }
  };

  const handleBackToOrder = () => {
    // This would typically navigate back to order creation
    // For now, we'll just refresh the page
    window.location.reload();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Validating Payment Link</h2>
            <p className="text-gray-600 text-center">Please wait while we verify your payment link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Payment completed state
  if (paymentCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Completed!</h2>
            <p className="text-gray-600 text-center mb-6">
              Thank you for your payment. Your order has been updated and you will receive a confirmation shortly.
            </p>
            {orderData && (
              <div className="bg-gray-50 rounded-lg p-4 w-full mb-6">
                <h3 className="font-medium text-gray-900 mb-2">Order Details:</h3>
                <p className="text-sm text-gray-600">Order: {orderData.order_number}</p>
                <p className="text-sm text-gray-600">
                  Customer: {orderData.customer_first_name} {orderData.customer_last_name}
                </p>
                <p className="text-sm text-gray-600">
                  Total: {new Intl.NumberFormat('ar-SA', {
                    style: 'currency',
                    currency: 'SAR'
                  }).format(orderData.total_amount)}
                </p>
              </div>
            )}
            <Button
              onClick={() => window.close()}
              className="w-full"
            >
              Close Window
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (!isValidToken || !orderData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Payment Link</h2>
            <p className="text-gray-600 text-center mb-6">
              {errorMessage || 'This payment link is invalid, expired, or has already been used.'}
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 w-full mb-6">
              <h3 className="font-medium text-red-800 mb-2">Common reasons:</h3>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• The link has expired (links are valid for 24 hours)</li>
                <li>• The payment has already been completed</li>
                <li>• The link was typed incorrectly</li>
                <li>• The order was cancelled</li>
              </ul>
            </div>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full"
            >
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid token - show payment collection page
  return (
    <div className="relative">
      {/* Security indicator */}
      <div className="bg-green-600 text-white px-4 py-2 text-center text-sm">
        <div className="flex items-center justify-center gap-2">
          <Shield className="w-4 h-4" />
          <span>Secure Payment Link</span>
          <Clock className="w-4 h-4" />
          <span>Valid for 24 hours</span>
        </div>
      </div>
      
      <PaymentCollectionPage
        orderData={orderData}
        onBack={handleBackToOrder}
        onPaymentComplete={handlePaymentComplete}
      />
    </div>
  );
};

export default PaymentPage; 