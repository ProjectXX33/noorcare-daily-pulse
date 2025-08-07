import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Save, 
  X, 
  User, 
  Phone, 
  MapPin, 
  Mail, 
  Package, 
  DollarSign,
  Edit3,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { OrderSubmission, OrderItem, updateOrderSubmission } from '@/lib/orderSubmissionsApi';
import { toast } from 'sonner';
import wooCommerceAPI from '@/lib/woocommerceApi';

interface EditOrderModalProps {
  order: OrderSubmission | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated: () => void;
}

const EditOrderModal: React.FC<EditOrderModalProps> = ({ 
  order, 
  isOpen, 
  onClose, 
  onOrderUpdated 
}) => {
  const [formData, setFormData] = useState<Partial<OrderSubmission>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'customer' | 'order' | 'items'>('customer');
  const [originalData, setOriginalData] = useState<Partial<OrderSubmission>>({});

  // Initialize form data when order changes
  useEffect(() => {
    if (order) {
      const initialData = {
        customer_first_name: order.customer_first_name || '',
        customer_last_name: order.customer_last_name || '',
        customer_phone: order.customer_phone || '',
        customer_email: order.customer_email || '',
        billing_address_1: order.billing_address_1 || '',
        billing_address_2: order.billing_address_2 || '',
        billing_city: order.billing_city || '',
        billing_state: order.billing_state || '',
        billing_postcode: order.billing_postcode || '',
        billing_country: order.billing_country || 'Saudi Arabia',
        status: order.status || 'pending',
        total_amount: order.total_amount || 0,
        subtotal: order.subtotal || 0,
        shipping_amount: order.shipping_amount || 0,
        discount_amount: order.discount_amount || 0,
        custom_discount_type: order.custom_discount_type || 'none',
        custom_discount_amount: order.custom_discount_amount || 0,
        custom_discount_reason: order.custom_discount_reason || '',
        custom_shipping_amount: order.custom_shipping_amount || 0,
        customer_note: order.customer_note || '',
        internal_notes: order.internal_notes || '',
        payment_method: order.payment_method || 'cod',
        order_items: order.order_items || []
      };
      
      setOriginalData(initialData);
      setFormData(initialData);
    }
  }, [order]);

  // Helper function to get payment method titles
  const getPaymentMethodTitle = (method: string): string => {
    const methodMap: { [key: string]: string } = {
      'cod': 'Cash on Delivery',
      'bank_transfer': 'Bank Transfer',
      'credit_card': 'Credit Card',
      'tabby': 'Tabby',
      'tamara': 'Tamara'
    };
    return methodMap[method] || method;
  };

  // Function to detect what has changed
  const detectChanges = (original: Partial<OrderSubmission>, current: Partial<OrderSubmission>) => {
    const changes: any = {};

    // Check status change
    if (original.status !== current.status) {
      changes.status = current.status;
    }

    // Check customer info changes
    const customerFields = [
      'customer_first_name', 'customer_last_name', 'customer_phone', 'customer_email',
      'billing_address_1', 'billing_address_2', 'billing_city', 'billing_state', 
      'billing_postcode', 'billing_country'
    ];
    
    const customerInfoChanged = customerFields.some(field => 
      original[field as keyof OrderSubmission] !== current[field as keyof OrderSubmission]
    );
    
    if (customerInfoChanged) {
      changes.customer_info = true;
    }

    // Check pricing changes
    if (original.total_amount !== current.total_amount || 
        original.shipping_amount !== current.shipping_amount ||
        original.custom_shipping_amount !== current.custom_shipping_amount) {
      changes.shipping = true;
    }

    // Check order items changes
    if (JSON.stringify(original.order_items) !== JSON.stringify(current.order_items)) {
      changes.order_items = true;
    }

    // Check notes changes
    if (original.customer_note !== current.customer_note) {
      changes.notes = true;
    }

    // Check payment method changes
    if (original.payment_method !== current.payment_method) {
      changes.payment_method = true;
    }

    return changes;
  };

  // WooCommerce sync function with better error handling
  const syncChangesToWooCommerce = async (changes: any) => {
    if (!order?.woocommerce_order_id) {
      console.log('Order not synced to WooCommerce, skipping sync');
      return;
    }

    console.log('🔄 Syncing changes to WooCommerce:', changes);

    try {
      // Only update status if it's the only change (most reliable)
      if (Object.keys(changes).length === 1 && changes.status) {
        const statusMap: { [key: string]: string } = {
          'pending': 'pending',
          'processing': 'processing',
          'on-hold': 'on-hold',
          'shipped': 'shipped',
          'delivered': 'completed',
          'completed': 'completed',
          'cancelled': 'cancelled',
          'refunded': 'refunded'
        };

        await wooCommerceAPI.updateOrder(order.woocommerce_order_id, {
          status: statusMap[changes.status] || changes.status
        });

        toast.success('✅ Status synced to WooCommerce');
        return;
      }

      // For multiple changes, try customer info separately (safer approach)
      if (changes.customer_info) {
        const firstName = formData.customer_first_name?.trim();
        const lastName = formData.customer_last_name?.trim();
        const address1 = formData.billing_address_1?.trim();
        const city = formData.billing_city?.trim();

        if (firstName && lastName && address1 && city) {
          const customerUpdate = {
            billing: {
              first_name: firstName,
              last_name: lastName,
              address_1: address1,
              address_2: formData.billing_address_2?.trim() || '',
              city: city,
              state: formData.billing_state?.trim() || '',
              postcode: formData.billing_postcode?.trim() || '',
              country: formData.billing_country?.trim() || 'SA',
              email: formData.customer_email?.trim() || '',
              phone: formData.customer_phone?.trim() || ''
            }
          };

          await wooCommerceAPI.updateOrder(order.woocommerce_order_id, customerUpdate);
          console.log('✅ Customer info synced to WooCommerce');
        }
      }

      // Sync status if changed
      if (changes.status) {
        const statusMap: { [key: string]: string } = {
          'pending': 'pending',
          'processing': 'processing',
          'on-hold': 'on-hold',
          'shipped': 'shipped',
          'delivered': 'completed',
          'completed': 'completed',
          'cancelled': 'cancelled',
          'refunded': 'refunded'
        };

        await wooCommerceAPI.updateOrder(order.woocommerce_order_id, {
          status: statusMap[changes.status] || changes.status
        });
        console.log('✅ Status synced to WooCommerce');
      }

      // Sync notes if changed
      if (changes.notes) {
        await wooCommerceAPI.updateOrder(order.woocommerce_order_id, {
          customer_note: formData.customer_note?.trim() || ''
        });
        console.log('✅ Notes synced to WooCommerce');
      }

      toast.success('✅ Changes synced to WooCommerce');

    } catch (error: any) {
      console.error('❌ WooCommerce sync error:', error);
      toast.error('⚠️ WooCommerce sync failed', {
        description: 'Order updated locally but could not sync to store'
      });
    }
  };

  const handleSubmit = async () => {
    if (!order?.id) return;

    setIsSubmitting(true);
    try {
      // Detect what has changed
      const changes = detectChanges(originalData, formData);
      const hasChanges = Object.keys(changes).length > 0;
      
      // Prepare form data for submission
      const submitData = {
        ...formData,
        // Convert "none" back to null for custom discount type
        custom_discount_type: formData.custom_discount_type === 'none' ? null : formData.custom_discount_type
      };
      
      // Update the order in the database first
      await updateOrderSubmission(order.id, submitData);
      
      // If there are changes and order is synced to WooCommerce, sync changes
      if (hasChanges && order.woocommerce_order_id) {
        console.log('🔄 Detected changes:', changes);
        toast.info('🔄 Syncing changes to WooCommerce...', {
          description: 'Please wait while we update your store'
        });
        await syncChangesToWooCommerce(changes);
      }
      
      toast.success('Order updated successfully!');
      onOrderUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Edit Order #{order.order_number}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="customer" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer Info
            </TabsTrigger>
            <TabsTrigger value="order" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Order Details
            </TabsTrigger>
            <TabsTrigger value="items" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Items & Pricing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customer" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.customer_first_name || ''}
                      onChange={(e) => setFormData({ ...formData, customer_first_name: e.target.value })}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.customer_last_name || ''}
                      onChange={(e) => setFormData({ ...formData, customer_last_name: e.target.value })}
                      placeholder="Enter last name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      value={formData.customer_phone || ''}
                      onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.customer_email || ''}
                      onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                      placeholder="Enter email address"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Billing Address
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="address1">Address Line 1 *</Label>
                      <Input
                        id="address1"
                        value={formData.billing_address_1 || ''}
                        onChange={(e) => setFormData({ ...formData, billing_address_1: e.target.value })}
                        placeholder="Enter street address"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="address2">Address Line 2</Label>
                      <Input
                        id="address2"
                        value={formData.billing_address_2 || ''}
                        onChange={(e) => setFormData({ ...formData, billing_address_2: e.target.value })}
                        placeholder="Apartment, suite, etc. (optional)"
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={formData.billing_city || ''}
                        onChange={(e) => setFormData({ ...formData, billing_city: e.target.value })}
                        placeholder="Enter city"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State/Province</Label>
                      <Input
                        id="state"
                        value={formData.billing_state || ''}
                        onChange={(e) => setFormData({ ...formData, billing_state: e.target.value })}
                        placeholder="Enter state or province"
                      />
                    </div>
                    <div>
                      <Label htmlFor="postcode">Postal Code</Label>
                      <Input
                        id="postcode"
                        value={formData.billing_postcode || ''}
                        onChange={(e) => setFormData({ ...formData, billing_postcode: e.target.value })}
                        placeholder="Enter postal code"
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={formData.billing_country || ''}
                        onChange={(e) => setFormData({ ...formData, billing_country: e.target.value })}
                        placeholder="Enter country"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="order" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Order Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="status">Current Status</Label>
                    <Select
                      value={formData.status || 'pending'}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="on-hold">On Hold</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select
                      value={formData.payment_method || 'cod'}
                      onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cod">Cash on Delivery</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="tabby">Tabby</SelectItem>
                        <SelectItem value="tamara">Tamara</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sync Information */}
            {order?.woocommerce_order_id && (
              <Card className="border-emerald-200 bg-emerald-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <RefreshCw className="h-4 w-4" />
                    <span className="text-sm font-medium">WooCommerce Sync</span>
                  </div>
                  <p className="text-sm text-emerald-600 mt-1">
                    This order is synced with WooCommerce. Any changes you make will be automatically updated in your store.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="customerNote">Customer Note</Label>
                  <Textarea
                    id="customerNote"
                    value={formData.customer_note || ''}
                    onChange={(e) => setFormData({ ...formData, customer_note: e.target.value })}
                    placeholder="Add customer note..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="internalNote">Internal Notes</Label>
                  <Textarea
                    id="internalNote"
                    value={formData.internal_notes || ''}
                    onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                    placeholder="Add internal notes..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="items" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="subtotal">Subtotal</Label>
                    <Input
                      id="subtotal"
                      type="number"
                      step="0.01"
                      value={formData.subtotal || 0}
                      onChange={(e) => setFormData({ ...formData, subtotal: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="shipping">Shipping</Label>
                    <Input
                      id="shipping"
                      type="number"
                      step="0.01"
                      value={formData.shipping_amount || 0}
                      onChange={(e) => setFormData({ ...formData, shipping_amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="discount">Discount</Label>
                    <Input
                      id="discount"
                      type="number"
                      step="0.01"
                      value={formData.discount_amount || 0}
                      onChange={(e) => setFormData({ ...formData, discount_amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="total">Total Amount</Label>
                    <Input
                      id="total"
                      type="number"
                      step="0.01"
                      value={formData.total_amount || 0}
                      onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="discountType">Discount Type</Label>
                  <Select
                    value={formData.custom_discount_type || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, custom_discount_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select discount type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Discount</SelectItem>
                      <SelectItem value="percentage">Percentage Discount</SelectItem>
                      <SelectItem value="fixed">Fixed Amount Discount</SelectItem>
                      <SelectItem value="coupon">Coupon Code</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditOrderModal; 