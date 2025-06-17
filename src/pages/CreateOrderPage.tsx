import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  ShoppingCart, 
  User, 
  MapPin, 
  Phone, 
  Package, 
  Plus,
  Trash2,
  DollarSign,
  Loader2,
  Search,
  Tag,
  Truck,
  X,
  FileText,
  CheckCircle,
  Eye,
  Star,
  Info
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import wooCommerceAPI, { isWooCommerceConfigured } from '@/lib/woocommerceApi';
import { createOrderSubmission, OrderSubmission, OrderItem as OrderSubmissionItem } from '@/lib/orderSubmissionsApi';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: number;
  name: string;
  price: string;
  stock_status: string;
  regular_price: string;
  sale_price?: string;
  sku?: string;
  categories?: Array<{ name: string }>;
  description?: string;
  short_description?: string;
  images?: Array<{
    id: number;
    src: string;
    name: string;
    alt: string;
  }>;
  average_rating?: string;
  rating_count?: number;
  total_sales?: number;
  featured?: boolean;
}

interface OrderItem {
  product: Product;
  quantity: number;
}

interface BillingInfo {
  first_name: string;
  last_name: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone: string;
}

interface CouponInfo {
  code: string;
  discount_type: 'percent' | 'fixed_cart';
  amount: string;
  description: string;
}

const CreateOrderPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Strict access control - redirect if not Customer Service
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    
    if (user.position !== 'Customer Service') {
      console.warn('Access denied: User is not Customer Service');
      navigate(user.role === 'admin' ? '/dashboard' : '/employee-dashboard', { replace: true });
      return;
    }
  }, [user, navigate]);

  // Don't render page content if user is not Customer Service
  if (!user || user.position !== 'Customer Service') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponInfo | null>(null);
  const [customerNote, setCustomerNote] = useState('');
  const [includeShipping, setIncludeShipping] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductDetailsOpen, setIsProductDetailsOpen] = useState(false);
  const [billingInfo, setBillingInfo] = useState<BillingInfo>({
    first_name: '',
    last_name: '',
    address_1: '',
    address_2: '',
    city: '',
    state: '',
    postcode: '',
    country: 'Saudi Arabia',
    phone: ''
  });

  // Fetch recent products on mount
  useEffect(() => {
    const fetchRecentProducts = async () => {
      setIsLoadingProducts(true);
      try {
        console.log('WooCommerce configured:', isWooCommerceConfigured());
        
        if (isWooCommerceConfigured()) {
          console.log('Attempting to fetch from WooCommerce API...');
          // Fetch recent 4 products from WooCommerce
          const results = await wooCommerceAPI.fetchProducts({
            per_page: 4,
            orderby: 'date',
            order: 'desc',
            status: 'publish',
            stock_status: 'instock'
          });
          
          console.log('WooCommerce API results:', results);
          
          const convertedProducts: Product[] = results.map(product => ({
            id: product.id,
            name: product.name,
            price: product.price,
            regular_price: product.regular_price,
            sale_price: product.sale_price,
            stock_status: product.stock_status,
            sku: product.sku,
            categories: product.categories.map(cat => ({ name: cat.name })),
            description: product.description,
            short_description: product.short_description,
            images: product.images,
            average_rating: product.average_rating,
            rating_count: product.rating_count,
            total_sales: product.total_sales,
            featured: product.featured
          }));
          
          setProducts(convertedProducts);
          console.log(`Loaded ${convertedProducts.length} recent products from WooCommerce`);
        } else {
          console.log('Using mock data...');
          // Fallback to mock data
          const mockProducts: Product[] = [
            {
              id: 1,
              name: "Premium WordPress Theme",
              price: "99.00",
              regular_price: "99.00",
              stock_status: "instock",
              sku: "THEME-001",
              categories: [{ name: "Themes" }]
            },
            {
              id: 2,
              name: "Website Development Service",
              price: "499.00",
              regular_price: "599.00",
              sale_price: "499.00",
              stock_status: "instock",
              sku: "DEV-001",
              categories: [{ name: "Services" }]
            },
            {
              id: 3,
              name: "SEO Optimization Package",
              price: "199.00",
              regular_price: "199.00",
              stock_status: "instock",
              sku: "SEO-001",
              categories: [{ name: "Services" }]
            },
            {
              id: 4,
              name: "Logo Design Service",
              price: "149.00",
              regular_price: "149.00",
              stock_status: "instock",
              sku: "LOGO-001",
              categories: [{ name: "Design" }]
            }
          ];
          
          setProducts(mockProducts);
          console.log(`Mock mode: Loaded ${mockProducts.length} products`);
        }
      } catch (error) {
        console.error('Error fetching recent products:', error);
        toast.error('Failed to load products');
        // Set fallback products even if there's an error
        const fallbackProducts: Product[] = [
          {
            id: 1,
            name: "Premium WordPress Theme",
            price: "99.00",
            regular_price: "99.00",
            stock_status: "instock",
            sku: "THEME-001",
            categories: [{ name: "Themes" }]
          },
          {
            id: 2,
            name: "Website Development Service",
            price: "499.00",
            regular_price: "599.00",
            sale_price: "499.00",
            stock_status: "instock",
            sku: "DEV-001",
            categories: [{ name: "Services" }]
          }
        ];
        setProducts(fallbackProducts);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchRecentProducts();
  }, []);

  // Search products from WooCommerce
  const searchProducts = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      // Reset to recent products when search is cleared
      if (isWooCommerceConfigured()) {
        const results = await wooCommerceAPI.fetchProducts({
          per_page: 4,
          orderby: 'date',
          order: 'desc',
          status: 'publish',
          stock_status: 'instock'
        });
        
        const convertedProducts: Product[] = results.map(product => ({
          id: product.id,
          name: product.name,
          price: product.price,
          regular_price: product.regular_price,
          sale_price: product.sale_price,
          stock_status: product.stock_status,
          sku: product.sku,
          categories: product.categories.map(cat => ({ name: cat.name }))
        }));
        
        setProducts(convertedProducts);
      }
      return;
    }

    setIsSearching(true);
    try {
      if (isWooCommerceConfigured()) {
        // Use real WooCommerce API
        const results = await wooCommerceAPI.fetchProducts({
          search: searchQuery,
          per_page: 20,
          status: 'publish',
          stock_status: 'instock'
        });
        
        // Convert WooCommerce product format to our Product interface
        const convertedProducts: Product[] = results.map(product => ({
          id: product.id,
          name: product.name,
          price: product.price,
          regular_price: product.regular_price,
          sale_price: product.sale_price,
          stock_status: product.stock_status,
          sku: product.sku,
          categories: product.categories.map(cat => ({ name: cat.name })),
          description: product.description,
          short_description: product.short_description,
          images: product.images,
          average_rating: product.average_rating,
          rating_count: product.rating_count,
          total_sales: product.total_sales,
          featured: product.featured
        }));
        
        setProducts(convertedProducts);
        console.log(`Found ${convertedProducts.length} products from WooCommerce`);
      } else {
        // Fallback to mock data for testing
        const mockProducts: Product[] = [
          {
            id: 1,
            name: "Premium WordPress Theme",
            price: "99.00",
            regular_price: "99.00",
            stock_status: "instock",
            sku: "THEME-001",
            categories: [{ name: "Themes" }]
          },
          {
            id: 2,
            name: "Website Development Service",
            price: "499.00",
            regular_price: "599.00",
            sale_price: "499.00",
            stock_status: "instock",
            sku: "DEV-001",
            categories: [{ name: "Services" }]
          },
          {
            id: 3,
            name: "SEO Optimization Package",
            price: "199.00",
            regular_price: "199.00",
            stock_status: "instock",
            sku: "SEO-001",
            categories: [{ name: "Services" }]
          },
          {
            id: 4,
            name: "Logo Design Service",
            price: "149.00",
            regular_price: "149.00",
            stock_status: "instock",
            sku: "LOGO-001",
            categories: [{ name: "Design" }]
          }
        ];
        
        // Filter mock products by search term
        const filtered = mockProducts.filter(product =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        setProducts(filtered);
        console.log(`Mock mode: Found ${filtered.length} products`);
      }
    } catch (error) {
      console.error('Error searching products:', error);
      toast.error('Failed to search products');
      setProducts([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input with debouncing
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm.trim()) {
        searchProducts(searchTerm);
      } else {
        // Reset to recent products when search is cleared
        if (isWooCommerceConfigured()) {
          wooCommerceAPI.fetchProducts({
            per_page: 4,
            orderby: 'date',
            order: 'desc',
            status: 'publish',
            stock_status: 'instock'
          }).then(results => {
            const convertedProducts: Product[] = results.map(product => ({
              id: product.id,
              name: product.name,
              price: product.price,
              regular_price: product.regular_price,
              sale_price: product.sale_price,
              stock_status: product.stock_status,
              sku: product.sku,
              categories: product.categories.map(cat => ({ name: cat.name })),
              description: product.description,
              short_description: product.short_description,
              images: product.images,
              average_rating: product.average_rating,
              rating_count: product.rating_count,
              total_sales: product.total_sales,
              featured: product.featured
            }));
            setProducts(convertedProducts);
          });
        }
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  const handleBillingChange = (field: keyof BillingInfo, value: string) => {
    setBillingInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const viewProductDetails = (product: Product) => {
    setSelectedProduct(product);
    setIsProductDetailsOpen(true);
  };

  const addProductToOrder = (product: Product) => {
    const existingItem = orderItems.find(item => item.product.id === product.id);
    
    if (existingItem) {
      setOrderItems(prev => 
        prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setOrderItems(prev => [...prev, { product, quantity: 1 }]);
    }
    
    toast.success(`Added ${product.name} to order`);
  };

  const removeProductFromOrder = (productId: number) => {
    setOrderItems(prev => prev.filter(item => item.product.id !== productId));
    toast.info('Product removed from order');
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeProductFromOrder(productId);
      return;
    }
    
    setOrderItems(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((total, item) => {
      const price = parseFloat(item.product.sale_price || item.product.price);
      return total + (price * item.quantity);
    }, 0);
  };

  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    
    const subtotal = calculateSubtotal();
    if (appliedCoupon.discount_type === 'percent') {
      return (subtotal * parseFloat(appliedCoupon.amount)) / 100;
    } else {
      return parseFloat(appliedCoupon.amount);
    }
  };

  const calculateShipping = () => {
    if (!includeShipping) return 0;
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const totalAfterDiscount = subtotal - discount;
    return totalAfterDiscount < 200 ? 10 : 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const shipping = calculateShipping();
    return (subtotal - discount + shipping).toFixed(2);
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    try {
      if (isWooCommerceConfigured()) {
        // Fetch real coupon from WooCommerce
        console.log('Fetching coupon from WooCommerce:', couponCode);
        const wcCoupon = await wooCommerceAPI.getCouponByCode(couponCode);
        
        if (wcCoupon) {
          // Check if coupon is valid and not expired
          const now = new Date();
          const expires = wcCoupon.date_expires ? new Date(wcCoupon.date_expires) : null;
          
          if (expires && expires < now) {
            toast.error('This coupon has expired');
            return;
          }

          // Convert WooCommerce coupon to our format
          const convertedCoupon: CouponInfo = {
            code: wcCoupon.code,
            discount_type: wcCoupon.discount_type === 'percent' ? 'percent' : 'fixed_cart',
            amount: wcCoupon.amount,
            description: wcCoupon.description || `${wcCoupon.amount}${wcCoupon.discount_type === 'percent' ? '%' : ' SAR'} off`
          };

          setAppliedCoupon(convertedCoupon);
          toast.success(`Coupon "${wcCoupon.code}" applied! ${convertedCoupon.description}`, {
            description: `Valid WooCommerce coupon`
          });
          setCouponCode('');
        } else {
          toast.error('Invalid coupon code');
        }
      } else {
        // Fallback to mock coupons for testing
        const mockCoupons: CouponInfo[] = [
          { code: 'SAVE10', discount_type: 'percent', amount: '10', description: '10% off' },
          { code: 'WELCOME50', discount_type: 'fixed_cart', amount: '50', description: '50 SAR off' },
          { code: 'NEWCUSTOMER', discount_type: 'percent', amount: '15', description: '15% off for new customers' }
        ];

        const foundCoupon = mockCoupons.find(
          coupon => coupon.code.toLowerCase() === couponCode.toLowerCase()
        );

        if (foundCoupon) {
          setAppliedCoupon(foundCoupon);
          toast.success(`Coupon "${foundCoupon.code}" applied! ${foundCoupon.description}`, {
            description: 'Test mode coupon'
          });
          setCouponCode('');
        } else {
          toast.error('Invalid coupon code');
        }
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      toast.error('Failed to validate coupon. Please try again.');
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    toast.info('Coupon removed');
  };

  const validateForm = (): boolean => {
    if (!billingInfo.first_name || !billingInfo.last_name) {
      toast.error('Customer name is required');
      return false;
    }
    
    if (!billingInfo.address_1 || !billingInfo.city) {
      toast.error('Address is required');
      return false;
    }
    
    if (!billingInfo.phone) {
      toast.error('Phone number is required');
      return false;
    }
    
    if (orderItems.length === 0) {
      toast.error('Please add at least one product to the order');
      return false;
    }
    
    return true;
  };

  const createOrder = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      // Prepare order submission data for our database
      const orderSubmissionData: OrderSubmission = {
        customer_first_name: billingInfo.first_name,
        customer_last_name: billingInfo.last_name,
        customer_phone: billingInfo.phone,
        customer_email: '',
        billing_address_1: billingInfo.address_1,
        billing_address_2: billingInfo.address_2,
        billing_city: billingInfo.city,
        billing_state: billingInfo.state,
        billing_postcode: billingInfo.postcode,
        billing_country: billingInfo.country,
        order_items: orderItems.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          price: item.product.sale_price || item.product.price,
          sku: item.product.sku,
          regular_price: item.product.regular_price,
          sale_price: item.product.sale_price
        })),
        subtotal: calculateSubtotal(),
        discount_amount: calculateDiscount(),
        shipping_amount: calculateShipping(),
        total_amount: parseFloat(calculateTotal()),
        coupon_code: appliedCoupon?.code,
        coupon_discount_type: appliedCoupon?.discount_type,
        coupon_amount: appliedCoupon?.amount,
        customer_note: customerNote,
        include_shipping: includeShipping,
        status: 'processing',
        payment_method: 'cod',
        payment_status: 'pending'
      };

      // Save to our database first
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      const savedOrder = await createOrderSubmission(orderSubmissionData, user.id, user.name);
      console.log('Order saved to database:', savedOrder);

      // Prepare order data for WooCommerce API
      const orderData = {
        payment_method: 'cod', // Cash on delivery
        payment_method_title: 'Cash on Delivery',
        set_paid: false,
        billing: billingInfo,
        shipping: billingInfo, // Use same address for shipping
        line_items: orderItems.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity
        })),
        shipping_lines: includeShipping && calculateShipping() > 0 ? [
          {
            method_id: 'flat_rate',
            method_title: 'Standard Shipping',
            total: calculateShipping().toString()
          }
        ] : [],
        coupon_lines: appliedCoupon ? [
          {
            code: appliedCoupon.code
          }
        ] : [],
        customer_note: customerNote,
        meta_data: [
          {
            key: '_created_by_customer_service',
            value: user?.name || 'Customer Service'
          },
          {
            key: '_created_at',
            value: new Date().toISOString()
          },
          {
            key: '_customer_service_note',
            value: customerNote
          },
          {
            key: '_internal_order_id',
            value: savedOrder.id?.toString() || ''
          }
        ],
        status: 'processing' // Set order status to processing
      };
      
      console.log('Creating order in WooCommerce with data:', orderData);
      
      if (isWooCommerceConfigured()) {
        try {
          // Create real order in WooCommerce
          const createdOrder = await wooCommerceAPI.createOrder(orderData);
          console.log('Order created successfully:', createdOrder);
          
          // Update our database record with the real WooCommerce order number
          if (savedOrder.id && createdOrder.number) {
            try {
              await supabase
                .from('order_submissions')
                .update({ 
                  order_number: `#${createdOrder.number}`,
                  woocommerce_order_id: createdOrder.id,
                  is_synced_to_woocommerce: true
                })
                .eq('id', savedOrder.id);
              
              console.log(`Updated order ${savedOrder.id} with WooCommerce number: #${createdOrder.number}`);
            } catch (updateError) {
              console.error('Failed to update order with WooCommerce number:', updateError);
            }
          }
          
          toast.success(`Order #${createdOrder.number} created successfully!`, {
            description: `Total: ${calculateTotal()} SAR - Saved to database and WooCommerce`
          });
        } catch (wcError) {
          console.error('WooCommerce sync failed:', wcError);
          toast.warning(`Order saved locally but WooCommerce sync failed`, {
            description: `Order #${savedOrder.order_number} - Total: ${calculateTotal()} SAR`
          });
        }
      } else {
        // Fallback for testing without WooCommerce
        console.log('WooCommerce not configured, order saved to database only');
        toast.success('Order created successfully!', {
          description: `Order #${savedOrder.order_number} - Total: ${calculateTotal()} SAR`
        });
      }

      // Reset form after successful order creation
      setBillingInfo({
        first_name: '',
        last_name: '',
        address_1: '',
        address_2: '',
        city: '',
        state: '',
        postcode: '',
        country: 'Saudi Arabia',
        phone: ''
      });
      setOrderItems([]);
      setAppliedCoupon(null);
      setCouponCode('');
      setCustomerNote('');
      setIncludeShipping(true);
      
    } catch (error) {
      console.error('Error creating order:', error);
      
      // Show specific error message
      if (error instanceof Error) {
        toast.error(`Failed to create order: ${error.message}`);
      } else {
        toast.error('Failed to create order. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user has Customer Service access
  // Temporarily allow all users for testing
  if (false && user?.position !== 'Customer Service') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Access Denied</CardTitle>
            <CardDescription>
              This page is only accessible to Customer Service representatives.
            </CardDescription>
          </CardHeader>
        </Card>
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
              <ShoppingCart className="h-6 w-6 md:h-8 md:w-8" />
              Create Order
            </h1>
            <p className="mt-1 md:mt-2 text-emerald-100 text-sm md:text-base">
              Customer Service - WooCommerce Order Creation
            </p>
            <div className="mt-2 md:mt-3 flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Customer Service Tool</span>
                <span className="sm:hidden">CS Tool</span>
              </span>
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">{orderItems.length} items in cart</span>
                <span className="sm:hidden">{orderItems.length} items</span>
              </span>
              {calculateSubtotal() > 0 && (
                <span className="flex items-center gap-1">
                  <svg className="riyal-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1124.14 1256.39" width="12" height="13.432" style={{display:'inline-block',verticalAlign:'-0.125em'}}>
                    <path fill="currentColor" d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
                    <path fill="currentColor" d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
                  </svg>
                  <span className="hidden sm:inline">Total: {calculateTotal()} SAR</span>
                  <span className="sm:hidden">{calculateTotal()} SAR</span>
                </span>
              )}
            </div>
          </div>
          <div className="flex justify-end md:text-right">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs md:text-sm">
              <span className="hidden sm:inline">Real-time Integration</span>
              <span className="sm:hidden">Live</span>
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left Column - Customer Info & Products */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Customer Billing Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
              <CardDescription>
                Enter the customer's billing details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={billingInfo.first_name}
                    onChange={(e) => handleBillingChange('first_name', e.target.value)}
                    placeholder="John"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={billingInfo.last_name}
                    onChange={(e) => handleBillingChange('last_name', e.target.value)}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={billingInfo.phone}
                  onChange={(e) => handleBillingChange('phone', e.target.value)}
                  placeholder="+966 50 123 4567"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="address_1">Address Line 1 *</Label>
                <Input
                  id="address_1"
                  value={billingInfo.address_1}
                  onChange={(e) => handleBillingChange('address_1', e.target.value)}
                  placeholder="123 King Fahd Road"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="address_2">Address Line 2</Label>
                <Input
                  id="address_2"
                  value={billingInfo.address_2}
                  onChange={(e) => handleBillingChange('address_2', e.target.value)}
                  placeholder="Apt 4B (optional)"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={billingInfo.city}
                    onChange={(e) => handleBillingChange('city', e.target.value)}
                    placeholder="Riyadh"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={billingInfo.state}
                    onChange={(e) => handleBillingChange('state', e.target.value)}
                    placeholder="Riyadh Province"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="country">Country</Label>
                <Select value={billingInfo.country} onValueChange={(value) => handleBillingChange('country', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Saudi Arabia">Saudi Arabia</SelectItem>
                    <SelectItem value="United Arab Emirates">United Arab Emirates</SelectItem>
                    <SelectItem value="Kuwait">Kuwait</SelectItem>
                    <SelectItem value="Qatar">Qatar</SelectItem>
                    <SelectItem value="Bahrain">Bahrain</SelectItem>
                    <SelectItem value="Oman">Oman</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Customer Note */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Customer Note
              </CardTitle>
              <CardDescription>
                Add any special instructions or notes for this order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Customer provided note:&#10;&#10;Customer notes about the order..."
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Product Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Search Products
                {isSearching && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
              <CardDescription>
                Search from 332+ products - Click on a product to add it to the order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    placeholder="Search by product name or SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>

                {isSearching ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>Searching products...</p>
                  </div>
                ) : searchTerm && products.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">No products found for "{searchTerm}"</p>
                    <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
                  </div>
                ) : searchTerm && products.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    {products.map((product) => (
                    <div
                      key={product.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-sm">{product.name}</h4>
                        <Badge variant={product.stock_status === 'instock' ? 'default' : 'destructive'}>
                          {product.stock_status === 'instock' ? 'In Stock' : 'Out of Stock'}
                        </Badge>
                      </div>
                      
                      {product.sku && (
                        <p className="text-xs text-muted-foreground mb-2">SKU: {product.sku}</p>
                      )}
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {product.sale_price ? (
                            <>
                              <span className="font-bold text-emerald-600 flex items-center gap-1">
                                <svg className="riyal-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1124.14 1256.39" width="14" height="15.432" style={{display:'inline-block',verticalAlign:'-0.125em'}}>
                                  <path fill="currentColor" d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
                                  <path fill="currentColor" d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
                                </svg>
                                {product.sale_price}
                              </span>
                              <span className="text-sm line-through text-muted-foreground flex items-center gap-1">
                                <svg className="riyal-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1124.14 1256.39" width="12" height="13.432" style={{display:'inline-block',verticalAlign:'-0.125em'}}>
                                  <path fill="currentColor" d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
                                  <path fill="currentColor" d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
                                </svg>
                                {product.regular_price}
                              </span>
                            </>
                          ) : (
                            <span className="font-bold flex items-center gap-1">
                              <svg className="riyal-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1124.14 1256.39" width="14" height="15.432" style={{display:'inline-block',verticalAlign:'-0.125em'}}>
                                <path fill="currentColor" d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
                                <path fill="currentColor" d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
                              </svg>
                              {product.price}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => viewProductDetails(product)}>
                            <Eye className="h-3 w-3 sm:mr-1" />
                            <span className="hidden sm:inline">View Details</span>
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => addProductToOrder(product)}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                        </div>
                      </div>
                    </div>
                                        ))}
                    </div>
                  ) : !searchTerm && products.length > 0 ? (
                    <>
                      <div className="border-b pb-3 mb-4">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Package className="h-4 w-4" />
                          Available Products
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Click on a product to add it to the order
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        {products.map((product) => (
                          <div
                            key={product.id}
                            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-semibold text-sm">{product.name}</h4>
                              <Badge variant={product.stock_status === 'instock' ? 'default' : 'destructive'}>
                                {product.stock_status === 'instock' ? 'In Stock' : 'Out of Stock'}
                              </Badge>
                            </div>
                            
                            {product.sku && (
                              <p className="text-xs text-muted-foreground mb-2">SKU: {product.sku}</p>
                            )}
                            
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                {product.sale_price ? (
                                  <>
                                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                                      <svg className="riyal-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1124.14 1256.39" width="14" height="15.432" style={{display:'inline-block',verticalAlign:'-0.125em'}}>
                                        <path fill="currentColor" d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
                                        <path fill="currentColor" d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
                                      </svg>
                                      {product.sale_price}
                                    </span>
                                    <span className="text-sm line-through text-muted-foreground flex items-center gap-1">
                                      <svg className="riyal-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1124.14 1256.39" width="12" height="13.432" style={{display:'inline-block',verticalAlign:'-0.125em'}}>
                                        <path fill="currentColor" d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
                                        <path fill="currentColor" d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
                                      </svg>
                                      {product.regular_price}
                                    </span>
                                  </>
                                ) : (
                                  <span className="font-bold flex items-center gap-1">
                                    <svg className="riyal-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1124.14 1256.39" width="14" height="15.432" style={{display:'inline-block',verticalAlign:'-0.125em'}}>
                                      <path fill="currentColor" d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
                                      <path fill="currentColor" d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
                                    </svg>
                                    {product.price}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" onClick={() => viewProductDetails(product)}>
                                  <Eye className="h-3 w-3 sm:mr-1" />
                                  <span className="hidden sm:inline">View Details</span>
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => addProductToOrder(product)}>
                                <Plus className="h-3 w-3 mr-1" />
                                Add
                              </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">Start typing to search for products</p>
                      <p className="text-sm text-muted-foreground mt-1">Search by name, SKU, or category</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
        </div>

        {/* Right Column - Order Summary */}
        <div className="space-y-4 md:space-y-6">
          {/* Coupon Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Coupon Code
              </CardTitle>
              <CardDescription>
                Apply a discount code to this order
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {appliedCoupon ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-emerald-700">{appliedCoupon.code}</p>
                    <p className="text-sm text-emerald-600">{appliedCoupon.description}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={removeCoupon}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && applyCoupon()}
                  />
                  <Button onClick={applyCoupon} disabled={!couponCode.trim()}>
                    Apply
                  </Button>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                Available codes: noor10, noor15, noor20
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="riyal-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1124.14 1256.39" width="20" height="22" style={{display:'inline-block',verticalAlign:'-0.125em'}}>
                  <path fill="currentColor" d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
                  <path fill="currentColor" d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
                </svg>
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orderItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No items in order yet
                </p>
              ) : (
                <>
                  <div className="space-y-3">
                    {orderItems.map((item) => (
                      <div key={item.product.id} className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <svg className="riyal-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1124.14 1256.39" width="10" height="11.432" style={{display:'inline-block',verticalAlign:'-0.125em'}}>
                              <path fill="currentColor" d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
                              <path fill="currentColor" d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
                            </svg>
                            {item.product.sale_price || item.product.price} each
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 1)}
                            className="w-16 h-8 text-center"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeProductFromOrder(item.product.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Separator />
                  
                  {/* Order Calculation Breakdown */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="flex items-center gap-1">
                        <svg className="riyal-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1124.14 1256.39" width="12" height="13.432" style={{display:'inline-block',verticalAlign:'-0.125em'}}>
                          <path fill="currentColor" d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
                          <path fill="currentColor" d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
                        </svg>
                        {calculateSubtotal().toFixed(2)}
                      </span>
                    </div>
                    
                    {appliedCoupon && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Discount ({appliedCoupon.code}):</span>
                        <span className="flex items-center gap-1">
                          -<svg className="riyal-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1124.14 1256.39" width="12" height="13.432" style={{display:'inline-block',verticalAlign:'-0.125em'}}>
                            <path fill="currentColor" d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
                            <path fill="currentColor" d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
                          </svg>
                          {calculateDiscount().toFixed(2)}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span>Shipping:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIncludeShipping(!includeShipping)}
                          className="h-6 px-2 text-xs"
                        >
                          <Truck className="h-3 w-3 mr-1" />
                          {includeShipping ? 'Remove' : 'Add'}
                        </Button>
                      </div>
                      <div className="text-right">
                        {includeShipping ? (
                          <div>
                            <span className="flex items-center gap-1">
                              <svg className="riyal-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1124.14 1256.39" width="12" height="13.432" style={{display:'inline-block',verticalAlign:'-0.125em'}}>
                                <path fill="currentColor" d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
                                <path fill="currentColor" d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
                              </svg>
                              {calculateShipping().toFixed(2)}
                            </span>
                            {calculateShipping() === 0 && (
                              <div className="text-xs text-emerald-600">Free shipping over 200 SAR</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No shipping</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total:</span>
                    <span className="flex items-center gap-1">
                      <svg className="riyal-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1124.14 1256.39" width="16" height="17.432" style={{display:'inline-block',verticalAlign:'-0.125em'}}>
                        <path fill="currentColor" d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
                        <path fill="currentColor" d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
                      </svg>
                      {calculateTotal()}
                    </span>
                  </div>
                </>
              )}
              
              <Button
                onClick={createOrder}
                disabled={isLoading || orderItems.length === 0}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Order...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Create Order
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Product Details Modal */}
      <Dialog open={isProductDetailsOpen} onOpenChange={setIsProductDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Product Details</span>
            </DialogTitle>
            <DialogDescription className="text-sm">
              Detailed information about this product
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4 sm:space-y-6">
              {/* Product Header */}
              <div className="flex items-start gap-3 sm:gap-4">
                {selectedProduct.images && selectedProduct.images.length > 0 ? (
                  <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border">
                    <img
                      src={selectedProduct.images[0].src}
                      alt={selectedProduct.images[0].alt || selectedProduct.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div className="w-full h-full bg-muted flex items-center justify-center hidden">
                      <Package className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                    </div>
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-muted flex items-center justify-center border">
                    <Package className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2 leading-tight">{selectedProduct.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant={selectedProduct.stock_status === 'instock' ? 'default' : 'destructive'} className="text-xs">
                      {selectedProduct.stock_status === 'instock' ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                    {selectedProduct.featured && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                  </div>
                  
                  {selectedProduct.sku && (
                    <p className="text-xs sm:text-sm text-muted-foreground">SKU: {selectedProduct.sku}</p>
                  )}
                </div>
              </div>

              {/* Price Section */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pricing
                </h4>
                <div className="flex items-center gap-4">
                  {selectedProduct.sale_price ? (
                    <>
                      <div className="text-2xl font-bold text-emerald-600 flex items-center gap-1">
                        <svg className="riyal-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1124.14 1256.39" width="24" height="26" style={{display:'inline-block',verticalAlign:'-0.125em'}}>
                          <path fill="currentColor" d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
                          <path fill="currentColor" d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
                        </svg>
                        {selectedProduct.sale_price}
                        <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-800">On Sale</Badge>
                      </div>
                      <div className="text-lg line-through text-muted-foreground flex items-center gap-1">
                        <svg className="riyal-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1124.14 1256.39" width="18" height="20" style={{display:'inline-block',verticalAlign:'-0.125em'}}>
                          <path fill="currentColor" d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
                          <path fill="currentColor" d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
                        </svg>
                        {selectedProduct.regular_price}
                      </div>
                    </>
                  ) : (
                    <div className="text-2xl font-bold flex items-center gap-1">
                      <svg className="riyal-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1124.14 1256.39" width="24" height="26" style={{display:'inline-block',verticalAlign:'-0.125em'}}>
                        <path fill="currentColor" d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
                        <path fill="currentColor" d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
                      </svg>
                      {selectedProduct.price}
                    </div>
                  )}
                </div>
              </div>

              {/* Product Description */}
              {selectedProduct.description && (
                <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <h4 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-2">
                    <Info className="h-5 w-5 text-blue-600" />
                    Product Description
                  </h4>
                  <div 
                    className={`prose prose-slate max-w-none text-slate-700 leading-7 text-base ${
                      /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(selectedProduct.description) 
                        ? 'text-right' 
                        : 'text-left'
                    }`}
                    style={{
                      lineHeight: '1.75',
                      fontSize: '16px',
                      fontFamily: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(selectedProduct.description)
                        ? '"Noto Sans Arabic", "Cairo", "Amiri", "Scheherazade New", system-ui, -apple-system, sans-serif'
                        : 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      direction: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(selectedProduct.description) ? 'rtl' : 'ltr'
                    }}
                    dangerouslySetInnerHTML={{ 
                      __html: selectedProduct.description
                        .replace(/<p>/gi, `<p class="mb-4 text-slate-700 ${/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(selectedProduct.description) ? 'text-right' : 'text-left'}">`)
                        .replace(/<h[1-6]([^>]*)>/gi, `<h$1 class="font-bold text-slate-800 mt-6 mb-3 ${/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(selectedProduct.description) ? 'text-right' : 'text-left'}">`)
                        .replace(/<ul>/gi, `<ul class="list-disc mb-4 space-y-2 text-slate-700 ${/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(selectedProduct.description) ? 'list-inside text-right' : 'list-inside text-left'}">`)
                        .replace(/<ol>/gi, `<ol class="list-decimal mb-4 space-y-2 text-slate-700 ${/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(selectedProduct.description) ? 'list-inside text-right' : 'list-inside text-left'}">`)
                        .replace(/<li>/gi, `<li class="text-slate-700 ${/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(selectedProduct.description) ? 'text-right' : 'text-left'}">`)
                        .replace(/<strong>/gi, '<strong class="font-semibold text-slate-800">')
                        .replace(/<b>/gi, '<b class="font-semibold text-slate-800">')
                        .replace(/<em>/gi, '<em class="italic text-slate-600">')
                        .replace(/<i>/gi, '<i class="italic text-slate-600">')
                        .replace(/<a([^>]*)>/gi, '<a$1 class="text-blue-600 hover:text-blue-800 underline">')
                    }}
                  />
                </div>
              )}

              {/* Product Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {selectedProduct.average_rating && (
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="font-semibold">{selectedProduct.average_rating}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Rating</p>
                  </div>
                )}
                
                {selectedProduct.rating_count && (
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="font-semibold mb-1">{selectedProduct.rating_count}</div>
                    <p className="text-xs text-muted-foreground">Reviews</p>
                  </div>
                )}
                
                {selectedProduct.total_sales && (
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="font-semibold mb-1">{selectedProduct.total_sales}</div>
                    <p className="text-xs text-muted-foreground">Sales</p>
                  </div>
                )}
                
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="font-semibold mb-1">ID: {selectedProduct.id}</div>
                  <p className="text-xs text-muted-foreground">Product ID</p>
                </div>
              </div>

              {/* Categories */}
              {selectedProduct.categories && selectedProduct.categories.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.categories.map((category, index) => (
                      <Badge key={index} variant="outline">
                        {category.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  onClick={() => {
                    addProductToOrder(selectedProduct);
                    setIsProductDetailsOpen(false);
                  }}
                  className="flex-1"
                  disabled={selectedProduct.stock_status !== 'instock'}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Order
                </Button>
                <Button variant="outline" onClick={() => setIsProductDetailsOpen(false)}>
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

export default CreateOrderPage; 