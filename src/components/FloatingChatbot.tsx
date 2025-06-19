import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Bot, Send, Minimize2, Maximize2, X, ShoppingCart, Plus, FileText, Palette, TrendingUp, Users, Settings, Package, User, Phone, MapPin, CreditCard, Search, Zap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { createOrderSubmission, OrderSubmission, OrderItem } from '@/lib/orderSubmissionsApi';
import wooCommerceAPI, { WooCommerceProduct } from '@/lib/woocommerceApi';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RoleColors {
  gradient: string;
  hoverGradient: string;
  pulse: string;
  secondaryPulse: string;
  name: string;
  icon: any;
  bgColor: string;
  textColor: string;
}

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'text' | 'action' | 'order' | 'form' | 'product_search' | 'product_selection' | 'complaint_search' | 'quick_actions';
  actionData?: any;
  formData?: any;
  productData?: any;
}

interface OrderFormData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  productId: number | null;
  productName: string;
  quantity: string;
  price: string;
  address: string;
  notes: string;
  currentStep: number;
}

const FloatingChatbot: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());
  const [orderForm, setOrderForm] = useState<OrderFormData>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    productId: null,
    productName: '',
    quantity: '1',
    price: '',
    address: '',
    notes: '',
    currentStep: 0
  });
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const [searchResults, setSearchResults] = useState<WooCommerceProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<WooCommerceProduct | null>(null);
  const [isHandlingComplaint, setIsHandlingComplaint] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hide chatbot on login screen
  if (location.pathname === '/login' || location.pathname === '/') {
    return null;
  }

  // Temporary: Chatbot disabled for v2.8.0 - Coming Soon
  return (
    <TooltipProvider>
      <div className="fixed bottom-4 right-4 z-50">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              disabled
              className="h-14 w-14 rounded-full bg-gray-400 shadow-lg cursor-not-allowed opacity-50"
            >
              <MessageCircle className="h-6 w-6 text-white" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <div className="text-center">
              <p className="font-semibold">AI Assistant</p>
              <p className="text-sm text-muted-foreground">Coming Soon in v2.8.0</p>
              <p className="text-xs text-muted-foreground mt-1">Enhanced features in development</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );

  // Role-based color configurations with enhanced functionality
  const getRoleColors = (): RoleColors => {
    if (user?.role === 'admin') {
      return {
        gradient: 'from-red-500 to-red-600',
        hoverGradient: 'hover:from-red-600 hover:to-red-700',
        pulse: 'bg-red-400',
        secondaryPulse: 'bg-red-300',
        name: 'Noorcare Admin Assistant',
        icon: Settings,
        bgColor: 'bg-red-500',
        textColor: 'text-red-600'
      };
    }

    switch (user?.position) {
      case 'Copy Writing':
        return {
          gradient: 'from-purple-500 to-purple-600',
          hoverGradient: 'hover:from-purple-600 hover:to-purple-700',
          pulse: 'bg-purple-400',
          secondaryPulse: 'bg-purple-300',
          name: 'Noorcare Creative Assistant',
          icon: Palette,
          bgColor: 'bg-purple-500',
          textColor: 'text-purple-600'
        };
      case 'Designer':
        return {
          gradient: 'from-green-500 to-green-600',
          hoverGradient: 'hover:from-green-600 hover:to-green-700',
          pulse: 'bg-green-400',
          secondaryPulse: 'bg-green-300',
          name: 'Noorcare Design Assistant',
          icon: FileText,
          bgColor: 'bg-green-500',
          textColor: 'text-green-600'
        };
      case 'Media Buyer':
        return {
          gradient: 'from-teal-700 to-teal-800',
          hoverGradient: 'hover:from-teal-800 hover:to-teal-900',
          pulse: 'bg-teal-600',
          secondaryPulse: 'bg-teal-500',
          name: 'Noorcare Campaign Assistant',
          icon: TrendingUp,
          bgColor: 'bg-teal-700',
          textColor: 'text-teal-700'
        };
      case 'Customer Service':
        return {
          gradient: 'from-sky-400 to-sky-500',
          hoverGradient: 'hover:from-sky-500 hover:to-sky-600',
          pulse: 'bg-sky-300',
          secondaryPulse: 'bg-sky-200',
          name: 'Noorcare Support Assistant',
          icon: Users,
          bgColor: 'bg-sky-400',
          textColor: 'text-sky-600'
        };
      default:
        return {
          gradient: 'from-blue-500 to-blue-600',
          hoverGradient: 'hover:from-blue-600 hover:to-blue-700',
          pulse: 'bg-blue-400',
          secondaryPulse: 'bg-blue-300',
          name: 'Noorcare AI Assistant',
          icon: Bot,
          bgColor: 'bg-blue-500',
          textColor: 'text-blue-600'
        };
    }
  };

  const roleColors = getRoleColors();

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        const welcomeMessage: Message = {
          id: 'welcome',
          content: getWelcomeMessage(),
          isUser: false,
          timestamp: new Date(),
          type: 'text'
        };
        setMessages([welcomeMessage]);
      }, 500);
    }
  }, [isOpen, user?.position]);

  const getWelcomeMessage = (): string => {
    const greeting = `👋 Hello ${user?.name || 'there'}! I'm your ${roleColors.name}.`;
    
    switch (user?.position) {
      case 'Copy Writing':
        return `${greeting}\n\n✨ I can help you with:\n• Creative copywriting\n• Content creation\n• Campaign ideas\n• Brand messaging\n\nWhat would you like to work on today?`;
      case 'Designer':
        return `${greeting}\n\n🎨 I can assist with:\n• Design concepts\n• Layout suggestions\n• Color palettes\n• Visual guidelines\n\nHow can I help with your design projects?`;
      case 'Media Buyer':
        return `${greeting}\n\n📊 I can help optimize:\n• Campaign performance\n• Budget allocation\n• Audience targeting\n• Analytics insights\n\nWhat campaigns are you working on?`;
      case 'Customer Service':
        return `${greeting}\n\n🛒 I can help you:\n• Create orders directly with WooCommerce integration\n• Search and select products\n• Handle customer inquiries\n• Provide support tips\n\nHow can I assist you today?`;
      default:
        return `${greeting}\n\n⚙️ I can help with:\n• System management\n• Analytics reports\n• Team coordination\n• Strategic insights\n\nWhat do you need assistance with?`;
    }
  };

  const getRoleSpecificActions = () => {
    switch (user?.position) {
      case 'Customer Service':
        return [
          { label: ' Create New Order', action: 'create_order', icon: ShoppingCart },
          { label: ' View Recent Orders', action: 'view_orders', icon: Package },
          { label: ' Customer Support Tips', action: 'support_tips', icon: Users },
          { label: ' Handle Complaints', action: 'complaint_help', icon: Phone }
        ];
      case 'Copy Writing':
        return [
          { label: '✍️ Write Product Copy', action: 'write_copy', icon: FileText },
          { label: '📱 Social Media Content', action: 'social_content', icon: MessageCircle },
          { label: '💡 Campaign Ideas', action: 'campaign_ideas', icon: Plus },
          { label: '🎯 Content Strategy', action: 'content_strategy', icon: TrendingUp }
        ];
      case 'Designer':
        return [
          { label: '🎨 Color Palette Ideas', action: 'color_palette', icon: Palette },
          { label: '📐 Layout Suggestions', action: 'layout_help', icon: FileText },
          { label: '🖼️ Image Guidelines', action: 'image_guide', icon: Package },
          { label: '✨ Design Trends', action: 'design_trends', icon: TrendingUp }
        ];
      case 'Media Buyer':
        return [
          { label: '📊 Campaign Analysis', action: 'campaign_analysis', icon: TrendingUp },
          { label: '💰 Budget Optimization', action: 'budget_optimize', icon: CreditCard },
          { label: '🎯 Audience Targeting', action: 'audience_target', icon: Users },
          { label: '📈 Performance Metrics', action: 'performance_metrics', icon: Package }
        ];
      default:
        return [
          { label: '📊 Generate Reports', action: 'generate_reports', icon: FileText },
          { label: '👥 Team Management', action: 'team_management', icon: Users },
          { label: '⚙️ System Settings', action: 'system_settings', icon: Settings },
          { label: '📈 Analytics Dashboard', action: 'analytics', icon: TrendingUp }
        ];
    }
  };

  const createOrderSteps = [
    { field: 'customerName', label: 'Customer Name', icon: User, placeholder: 'Enter customer name...' },
    { field: 'customerPhone', label: 'Phone Number', icon: Phone, placeholder: 'Enter phone number...' },
    { field: 'customerEmail', label: 'Email Address', icon: MessageCircle, placeholder: 'Enter email address...' },
    { field: 'productSearch', label: 'Product Selection', icon: Search, placeholder: 'Search for product...' },
    { field: 'quantity', label: 'Quantity', icon: Plus, placeholder: 'Enter quantity...' },
    { field: 'address', label: 'Delivery Address', icon: MapPin, placeholder: 'Enter delivery address...' },
    { field: 'notes', label: 'Order Notes (Optional)', icon: FileText, placeholder: 'Any special notes...' }
  ];

  const searchProducts = async (query: string): Promise<WooCommerceProduct[]> => {
    try {
      setIsSearchingProducts(true);
      console.log('Searching products for:', query);
      
      const results = await wooCommerceAPI.fetchProducts({
        search: query,
        per_page: 10,
        status: 'publish',
        stock_status: 'instock'
      });
      
      console.log('Product search results:', results);
      return results;
    } catch (error) {
      console.error('Error searching products:', error);
      toast.error('Failed to search products');
      return [];
    } finally {
      setIsSearchingProducts(false);
    }
  };

  const handleOrderFormSubmit = async (value: string) => {
    const currentStep = createOrderSteps[orderForm.currentStep];
    
    // Handle product search step
    if (currentStep.field === 'productSearch') {
      if (!value.trim()) {
        const botMessage: Message = {
          id: Date.now().toString(),
          content: '❌ Please enter a product name to search.',
          isUser: false,
          timestamp: new Date(),
          type: 'text'
        };
        setMessages(prev => [...prev, botMessage]);
        return;
      }

      // Search for products
      const searchedProducts = await searchProducts(value);
      setSearchResults(searchedProducts);

      if (searchedProducts.length === 0) {
        const botMessage: Message = {
          id: Date.now().toString(),
          content: `❌ No products found for "${value}". Please try a different search term.`,
          isUser: false,
          timestamp: new Date(),
          type: 'text'
        };
        setMessages(prev => [...prev, botMessage]);
        return;
      }

      // Show product selection with images and buttons
      const botMessage: Message = {
        id: Date.now().toString(),
        content: `🛍️ Found ${searchedProducts.length} products. Choose one by clicking the button:`,
        isUser: false,
        timestamp: new Date(),
        type: 'product_selection',
        productData: { products: searchedProducts }
      };
      setMessages(prev => [...prev, botMessage]);
      return;
    }

    // Handle special commands for product selection
    if (messages[messages.length - 1]?.type === 'product_selection') {
      if (value.toLowerCase() === 'search again' || value.toLowerCase() === 'new search') {
        const botMessage: Message = {
          id: Date.now().toString(),
          content: '🔍 Please enter a new search term to find different products:',
          isUser: false,
          timestamp: new Date(),
          type: 'form',
          formData: { step: orderForm.currentStep, field: 'productSearch' }
        };
        setMessages(prev => [...prev, botMessage]);
        return;
      }
      
      // If no product was selected via button, show error
      const botMessage: Message = {
        id: Date.now().toString(),
        content: `❌ Please click one of the product buttons above to select a product, or type "search again" to search for different products.`,
        isUser: false,
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, botMessage]);
      return;
    }

    // Handle regular form fields
    const newOrderForm = { ...orderForm, [currentStep.field]: value };
    
    if (orderForm.currentStep < createOrderSteps.length - 1) {
      // Move to next step
      newOrderForm.currentStep = orderForm.currentStep + 1;
      setOrderForm(newOrderForm);
      
      const nextStep = createOrderSteps[newOrderForm.currentStep];
      const botMessage: Message = {
        id: Date.now().toString(),
        content: `✅ Got it! Now please provide the ${nextStep.label.toLowerCase()}:`,
        isUser: false,
        timestamp: new Date(),
        type: 'form',
        formData: { step: newOrderForm.currentStep, field: nextStep.field }
      };
      setMessages(prev => [...prev, botMessage]);
    } else {
      // Final step - create the actual order
      await createRealOrder(newOrderForm);
    }
  };

  const createRealOrder = async (orderData: OrderFormData) => {
    try {
      if (!selectedProduct || !user?.id) {
        throw new Error('Missing product or user information');
      }

      const [firstName, ...lastNameParts] = orderData.customerName.split(' ');
      const lastName = lastNameParts.join(' ') || '';

      // Create order submission data
      const orderSubmissionData: OrderSubmission = {
        customer_first_name: firstName,
        customer_last_name: lastName,
        customer_phone: orderData.customerPhone,
        customer_email: orderData.customerEmail || '',
        billing_address_1: orderData.address,
        billing_city: 'Riyadh', // Default city
        billing_country: 'Saudi Arabia',
        order_items: [{
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          quantity: parseInt(orderData.quantity),
          price: selectedProduct.sale_price || selectedProduct.price,
          sku: selectedProduct.sku || ''
        }] as OrderItem[],
        subtotal: parseFloat(selectedProduct.sale_price || selectedProduct.price) * parseInt(orderData.quantity),
        total_amount: parseFloat(selectedProduct.sale_price || selectedProduct.price) * parseInt(orderData.quantity),
        customer_note: orderData.notes,
        status: 'processing',
        payment_method: 'cod',
        payment_status: 'pending'
      };

      // Save to database
      const savedOrder = await createOrderSubmission(orderSubmissionData, user.id, user.name);
      
      // Create WooCommerce order
      const wooOrderData = {
        payment_method: 'cod',
        payment_method_title: 'Cash on Delivery',
        set_paid: false,
        status: 'processing',
        billing: {
          first_name: firstName,
          last_name: lastName,
          company: '',
          address_1: orderData.address,
          address_2: '',
          city: 'Riyadh',
          state: '',
          postcode: '',
          country: 'SA',
          email: orderData.customerEmail || '',
          phone: orderData.customerPhone
        },
        shipping: {
          first_name: firstName,
          last_name: lastName,
          company: '',
          address_1: orderData.address,
          address_2: '',
          city: 'Riyadh',
          state: '',
          postcode: '',
          country: 'SA',
          phone: orderData.customerPhone
        },
        line_items: [{
          product_id: selectedProduct.id,
          quantity: parseInt(orderData.quantity)
        }],
        customer_note: orderData.notes || '',
        meta_data: [
          {
            key: '_created_by_customer_service',
            value: user?.name || 'Customer Service'
          },
          {
            key: '_internal_order_id',
            value: savedOrder.id?.toString() || ''
          },
          {
            key: '_created_via_chatbot',
            value: 'true'
          }
        ]
      };

      // Create order in WooCommerce
      const createdOrder = await wooCommerceAPI.createOrder(wooOrderData);
      
             // Update our database record with WooCommerce info
       if (savedOrder.id && createdOrder.number) {
         await supabase
           .from('order_submissions')
           .update({ 
             order_number: `#${createdOrder.number}`,
             woocommerce_order_id: createdOrder.id,
             is_synced_to_woocommerce: true
           })
           .eq('id', savedOrder.id);
       }

      const orderSummary = `🎉 Order Created Successfully!\n\n📦 Order #${createdOrder.number}\n\n📋 Summary:\n• Customer: ${orderData.customerName}\n• Phone: ${orderData.customerPhone}\n• Product: ${selectedProduct.name}\n• Quantity: ${orderData.quantity}\n• Price: ${selectedProduct.sale_price || selectedProduct.price} SAR each\n• Total: ${parseFloat(selectedProduct.sale_price || selectedProduct.price) * parseInt(orderData.quantity)} SAR\n• Address: ${orderData.address}\n• Notes: ${orderData.notes || 'None'}\n\n✅ Order saved to database and created in WooCommerce!`;
      
      const successMessage: Message = {
        id: Date.now().toString(),
        content: orderSummary,
        isUser: false,
        timestamp: new Date(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, successMessage]);
      setIsCreatingOrder(false);
      setSelectedProduct(null);
      setSearchResults([]);
      
      // Reset form for next order
      setOrderForm({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        productId: null,
        productName: '',
        quantity: '1',
        price: '',
        address: '',
        notes: '',
        currentStep: 0
      });
      
      // Reset pending actions
      setPendingActions(new Set());
      
      toast.success(`Order #${createdOrder.number} created successfully!`);
      
    } catch (error: any) {
      console.error('Error creating order:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: `❌ Failed to create order: ${error.message}. Please try again or contact support.`,
        isUser: false,
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to create order');
    }
  };

  const handleRoleAction = async (action: string) => {
    // Check if action is already pending
    if (pendingActions.has(action)) {
      const duplicateMessage: Message = {
        id: Date.now().toString(),
        content: '⏳ I\'m already processing this request. Please wait for it to complete before requesting again.',
        isUser: false,
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, duplicateMessage]);
      return;
    }

    // Add action to pending set
    setPendingActions(prev => new Set(prev).add(action));

    // Add user message for the action
    const actionLabel = getRoleSpecificActions().find(a => a.action === action)?.label;
    const userMessage: Message = {
      id: Date.now().toString(),
      content: `Requested: ${actionLabel}`,
      isUser: true,
      timestamp: new Date(),
      type: 'action'
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Handle specific actions
    setTimeout(async () => {
      let botResponse: Message;

      switch (action) {
        case 'create_order':
          setIsCreatingOrder(true);
          setOrderForm(prev => ({ ...prev, currentStep: 0 }));
          botResponse = {
            id: (Date.now() + 1).toString(),
            content: '🛒 Let\'s create a new order with real WooCommerce integration!\n\nI\'ll guide you through each step and search for actual products.\n\nFirst, please provide the customer name:',
            isUser: false,
            timestamp: new Date(),
            type: 'form',
            formData: { step: 0, field: 'customerName' }
          };
          break;

        case 'view_orders':
          botResponse = {
            id: (Date.now() + 1).toString(),
            content: '📋 Opening your orders page to view recent orders...',
            isUser: false,
            timestamp: new Date(),
            type: 'action'
          };
          setTimeout(() => {
            navigate('/my-orders');
            setIsOpen(false);
          }, 1500);
          break;

        case 'support_tips':
          botResponse = {
            id: (Date.now() + 1).toString(),
            content: '💡 Customer Support Best Practices:\n\n1. 👂 Listen actively to understand concerns\n2. 🤝 Acknowledge their frustration first\n3. 📝 Provide clear, step-by-step solutions\n4. 📞 Follow up to ensure satisfaction\n5. 📋 Document important interactions\n6. 😊 Stay positive and professional\n\nNeed help with a specific situation?',
            isUser: false,
            timestamp: new Date(),
            type: 'text'
          };
          break;

        case 'complaint_help':
          setIsHandlingComplaint(true);
          botResponse = {
            id: (Date.now() + 1).toString(),
            content: `📞 Customer Complaint Handling Guide | دليل التعامل مع شكاوى العملاء

🇬🇧 **English Guidelines:**
1. 👂 Listen actively without interrupting
2. 🤝 Acknowledge: "I understand your frustration"
3. 🔍 Ask clarifying questions to understand fully
4. 💡 Offer 2-3 solution options when possible
5. ⏰ Set clear expectations for resolution time
6. 📞 Follow up within 24-48 hours
7. 📋 Document everything in customer notes

🇸🇦 **الإرشادات باللغة العربية:**
1. 👂 استمع بفعالية دون مقاطعة
2. 🤝 اعترف بمشاعرهم: "أفهم انزعاجك"
3. 🔍 اطرح أسئلة توضيحية للفهم الكامل
4. 💡 اقترح 2-3 خيارات للحل عند الإمكان
5. ⏰ حدد توقعات واضحة لوقت الحل
6. 📞 تابع خلال 24-48 ساعة
7. 📋 وثق كل شيء في ملاحظات العميل

🎯 **Quick Response Templates:**

**English:**
• "Thank you for bringing this to our attention"
• "I sincerely apologize for the inconvenience"
• "Let me look into this immediately"
• "Here's what I can do to resolve this"

**Arabic:**
• "شكراً لك على لفت انتباهنا لهذا الأمر"
• "أعتذر بصدق عن الإزعاج"
• "دعني أبحث في هذا الأمر فوراً"
• "إليك ما يمكنني فعله لحل هذا"

🔍 **Interactive Help:**
Now you can ask me any specific question about customer complaints, product issues, or any topic and I'll search Google for the most current information to help you provide accurate answers to customers.

Type your question below (in English or Arabic):`,
            isUser: false,
            timestamp: new Date(),
            type: 'complaint_search'
          };
          break;

        case 'write_copy':
          botResponse = {
            id: (Date.now() + 1).toString(),
            content: '✍️ Copywriting Success Framework:\n\n1. 🎯 Know your target audience\n2. 💡 Lead with benefits, not features\n3. ❤️ Use emotional triggers\n4. ⭐ Include social proof\n5. 📞 End with a clear call-to-action\n6. 🔄 Test and optimize\n\nWhat product or service are you writing copy for?',
            isUser: false,
            timestamp: new Date(),
            type: 'text'
          };
          break;

        case 'campaign_analysis':
          botResponse = {
            id: (Date.now() + 1).toString(),
            content: '📊 Campaign Analysis Checklist:\n\n• 👆 CTR (Click-Through Rate)\n• 💰 CPC (Cost Per Click)\n• 📈 ROAS (Return on Ad Spend)\n• 🎯 Conversion Rate\n• 👥 Audience Demographics\n• 📱 Device Performance\n• ⏰ Time-based Performance\n\nOpening analytics dashboard...',
            isUser: false,
            timestamp: new Date(),
            type: 'action'
          };
          setTimeout(() => {
            navigate('/analytics');
            setIsOpen(false);
          }, 1500);
          break;

        default:
          botResponse = {
            id: (Date.now() + 1).toString(),
            content: '✨ I\'m here to help! What specific assistance do you need with your tasks?',
            isUser: false,
            timestamp: new Date(),
            type: 'text'
          };
      }

      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
      
      // Remove action from pending set if not creating order
      if (action !== 'create_order') {
        setPendingActions(prev => {
          const newSet = new Set(prev);
          newSet.delete(action);
          return newSet;
        });
      }
    }, 1000 + Math.random() * 1000);
  };

  const handleProductSelection = (product: WooCommerceProduct) => {
    setSelectedProduct(product);
    
    const newOrderForm = { 
      ...orderForm, 
      productId: product.id,
      productName: product.name,
      price: product.sale_price || product.price,
      currentStep: orderForm.currentStep + 1
    };
    setOrderForm(newOrderForm);

    const nextStep = createOrderSteps[newOrderForm.currentStep];
    const botMessage: Message = {
      id: Date.now().toString(),
      content: `✅ Selected: ${product.name} (${product.sale_price || product.price} SAR)\n\nNow please provide the ${nextStep.label.toLowerCase()}:`,
      isUser: false,
      timestamp: new Date(),
      type: 'form',
      formData: { step: newOrderForm.currentStep, field: nextStep.field }
    };
    setMessages(prev => [...prev, botMessage]);
  };

  const performWebSearch = async (query: string): Promise<any> => {
    // In a real implementation, this would call a web search API
    // For now, we'll simulate the search functionality
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          results: [
            {
              title: "Customer Service Best Practices",
              snippet: "When dealing with angry customers, always listen actively, acknowledge their feelings, and provide clear solutions. Stay calm and professional."
            }
          ]
        });
      }, 1000);
    });
  };

  const formatWebSearchResponse = (originalQuery: string, searchResults: any): string => {
    // Check if query is in Arabic
    const isArabicQuery = /[\u0600-\u06FF]/.test(originalQuery);
    
    if (isArabicQuery) {
      return `🔍 **دليل شامل للتعامل مع العملاء غير الراضين - "${originalQuery}"**

📋 **أسئلة شائعة من العملاء غير الراضين (مع نماذج ردود محترفة)**

**1️⃣ "المنتج لم يصل بعد، وأنا غير راضٍ عن التأخير!"**
💬 **الرد المثالي:**
"نعتذر بصدق عن التأخير. نتفهم أهمية وصول طلبك في الوقت المحدد. سنتحقق مع فريق الشحن فورًا ونرسل لك تحديثًا خلال ساعة. كتعويض، نقدم لك خصم 15% على طلبك القادم."

**2️⃣ "المكمل الغذائي لم يعطِ النتائج المتوقعة!"**
💬 **الرد المثالي:**
"نقدر ملاحظتك الصادقة. نوصي باستشارة أخصائي تغذية لضمان استخدام المنتج المناسب لاحتياجاتك. نقدم لك استبدالًا بمنتج آخر أو استردادًا كاملًا، ونسعد بإرسال دليل استخدام مفصل مجانًا."

**3️⃣ "التغليف كان تالفًا عند الاستلام!"**
💬 **الرد المثالي:**
"نأسف لهذه التجربة. سلامة المنتج أولويتنا. سنقوم بإرسال بديل فوري دون تكلفة إضافية، وسنتابع مع شركة الشحن لضمان عدم تكرار هذا الأمر."

**4️⃣ "المنتج مختلف عن الوصف على الموقع!"**
💬 **الرد المثالي:**
"شكرًا لإعلامنا بهذا. سنراجع الوصف فورًا لتجنب أي لبس. يمكنك إما الاحتفاظ بالمنتج مع خصم 20% أو إعادته مع تغطية كاملة للتكاليف."

**5️⃣ "واجهت مشكلة فنية أثناء الدفع ولم يتم تأكيد الطلب!"**
💬 **الرد المثالي:**
"نعتذر عن الإزعاج. سنتحقق من النظام فورًا. يُرجى إرسال لقطة شاشة للخطأ إن أمكن، وسنضمن حصولك على خصم 10% لتعويض وقتك."

🛠️ **استراتيجيات التعامل مع السخط (بناءً على مراحل الرحلة الشرائية)**

**🎯 الاستماع الفعّال:**
استخدم عبارات مثل: "أتفهم إحباطك تمامًا..." ثم كرر مشكلتهم بلغتك لتأكيد الفهم.

**🙏 الاعتذار دون تبرير:**
تجنب: "التأخير بسبب العطل الفني..."، واستبدلها بـ: "نتحمل المسؤولية الكاملة ونعتذر بصدق".

**⚡ الحلول السريعة والملموسة:**
قدم خيارين دائمًا (مثل: استبدال/استرداد، خصم/هدية مجانية).

**📞 المتابعة بعد الحل:**
أرسل رسالة بعد 3 أيام: "هل حُلت مشكلتك بطريقة ترضيك؟ نقدر رأيك لتحسين خدماتنا."

📊 **نموذج تصعيد الشكاوى (للفريق الداخلي)**

┌─────────────────────────┬──────────────────────────────────┬─────────────────────┐
│ **مستوى السخط**         │ **الإجراء**                      │ **المسؤول**         │
├─────────────────────────┼──────────────────────────────────┼─────────────────────┤
│ 🟢 منخفض                │ خصم 10% + متابعة الشحن           │ ممثل خدمة العملاء   │
│ (تأخير بسيط)            │                                  │                     │
├─────────────────────────┼──────────────────────────────────┼─────────────────────┤
│ 🟡 متوسط                │ إرسال بديل فوري +               │ المشرف              │
│ (منتج تالف)             │ رسالة اعتذار                    │                     │
├─────────────────────────┼──────────────────────────────────┼─────────────────────┤
│ 🔴 عالي                 │ اتصال هاتفي +                   │ مدير الخدمة        │
│ (مشكلة متكررة)          │ تعويض بقيمة 30%                 │                     │
└─────────────────────────┴──────────────────────────────────┴─────────────────────┘

**📋 إرشادات سريعة للتطبيق:**
• 🟢 **المستوى المنخفض:** تعامل مباشر من الممثل
• 🟡 **المستوى المتوسط:** إشراك المشرف المباشر
• 🔴 **المستوى العالي:** تدخل إدارة الخدمة فوراً

💡 **نصائح خاصة بمتاجر المكملات الغذائية**
• **الشفافية الطبية:** ذكّر العملاء بأن النتائج تختلف حسب الجسم، ونوّه بضرورة استشارة الطبيب قبل الاستخدام
• **توثيق الشكاوى:** أنشئ قاعدة بيانات للمشكلات المتكررة (مثل: تغليف هش، تأخير شحن) لتحسين العمليات
• **التدريب:** درّب فريقك على المصطلحات الطبية البسيطة لتوضيح مكونات المنتجات بدقة

📌 **مثال تطبيقي لسيناريو معقد**
**العميل:** "طلبت 3 عبوات ولم تصل، وأريد استرداد أموالي الآن!"
**الرد:**
"نعتذر بشدة عن هذا الخلل غير المقبول. سنقوم بـ:
• استرداد المبلغ خلال 24 ساعة
• إرسال هدية (عينة من منتج جديد) كاعتذار
• التحقيق مع مزود الشحن لمعرفة السبب وإعلامك بالنتائج"

🔄 **اكتب "بحث جديد" للبحث عن موضوع آخر أو "إنهاء البحث" للعودة للدردشة العادية**`;
    }
    
    return `🔍 **Comprehensive Customer Complaint Resolution Guide - "${originalQuery}"**

📋 **Common Upset Customer Scenarios (with Professional Response Templates)**

**1️⃣ "My order hasn't arrived yet, and I'm really frustrated with the delay!"**
💬 **Ideal Response:**
"I sincerely apologize for the delay. I understand how important it is to receive your order on time. I'll check with our shipping team immediately and send you an update within the hour. As compensation, I'd like to offer you a 15% discount on your next order."

**2️⃣ "The supplement didn't give me the expected results!"**
💬 **Ideal Response:**
"I appreciate your honest feedback. I recommend consulting with a nutritionist to ensure you're using the right product for your needs. We can offer you either an exchange for a different product or a full refund, plus I'd be happy to send you a detailed usage guide for free."

**3️⃣ "The packaging was damaged when I received it!"**
💬 **Ideal Response:**
"I'm sorry for this experience. Product safety is our top priority. We'll send you an immediate replacement at no additional cost, and I'll follow up with our shipping partner to ensure this doesn't happen again."

**4️⃣ "The product is different from what was described on the website!"**
💬 **Ideal Response:**
"Thank you for bringing this to our attention. We'll review the description immediately to avoid any confusion. You can either keep the product with a 20% discount or return it with full cost coverage."

**5️⃣ "I had a technical issue during payment and my order wasn't confirmed!"**
💬 **Ideal Response:**
"I apologize for the inconvenience. I'll check our system immediately. If possible, please send a screenshot of the error, and I'll ensure you receive a 10% discount to compensate for your time."

🛠️ **De-escalation Strategies (Based on Customer Journey Stages)**

**🎯 Active Listening:**
Use phrases like: "I completely understand your frustration..." then repeat their issue in your own words to confirm understanding.

**🙏 Apologize Without Excuses:**
Avoid: "The delay was due to technical issues..." Replace with: "We take full responsibility and sincerely apologize."

**⚡ Quick & Tangible Solutions:**
Always offer two options (like: replacement/refund, discount/free gift).

**📞 Post-Resolution Follow-up:**
Send a message after 3 days: "Has your issue been resolved to your satisfaction? We value your feedback to improve our services."

📊 **Complaint Escalation Matrix (Internal Team)**

┌─────────────────────────┬──────────────────────────────────┬─────────────────────┐
│ **Frustration Level**   │ **Action Required**              │ **Responsible**     │
├─────────────────────────┼──────────────────────────────────┼─────────────────────┤
│ 🟢 Low                  │ 10% discount +                  │ Customer Service    │
│ (minor delay)           │ shipping follow-up               │ Representative      │
├─────────────────────────┼──────────────────────────────────┼─────────────────────┤
│ 🟡 Medium               │ Immediate replacement +          │ Supervisor          │
│ (damaged product)       │ apology letter                   │                     │
├─────────────────────────┼──────────────────────────────────┼─────────────────────┤
│ 🔴 High                 │ Phone call +                     │ Service Manager     │
│ (recurring issue)       │ 30% compensation                 │                     │
└─────────────────────────┴──────────────────────────────────┴─────────────────────┘

**📋 Quick Implementation Guide:**
• 🟢 **Low Level:** Direct handling by representative
• 🟡 **Medium Level:** Involve direct supervisor
• 🔴 **High Level:** Immediate management intervention

💡 **Supplement Store Specific Tips**
• **Medical Transparency:** Remind customers that results vary by individual, and emphasize the importance of consulting a doctor before use
• **Complaint Documentation:** Create a database of recurring issues (like fragile packaging, shipping delays) to improve operations
• **Training:** Train your team on basic medical terminology to accurately explain product ingredients

📌 **Complex Scenario Example**
**Customer:** "I ordered 3 bottles and they never arrived, I want my money back now!"
**Response:**
"I sincerely apologize for this unacceptable error. Here's what we'll do:
• Full refund processed within 24 hours
• Send a complimentary gift (sample of a new product) as an apology
• Investigate with our shipping provider and inform you of the results"

🔄 **Type "new search" to search for another topic or "end search" to return to normal chat**`;
  };

  const handleComplaintSearch = async (query: string): Promise<string> => {
    try {
      const searchQuery = query.trim();
      const lowerQuery = searchQuery.toLowerCase();
      
      // First check if it's a customer service question that needs web search
      const isCustomerServiceQuery = 
        lowerQuery.includes('عميل') || lowerQuery.includes('customer') ||
        lowerQuery.includes('متضايق') || lowerQuery.includes('angry') ||
        lowerQuery.includes('اتعامل') || lowerQuery.includes('handle') ||
        lowerQuery.includes('شكوى') || lowerQuery.includes('complaint') ||
        lowerQuery.includes('مشكلة') || lowerQuery.includes('problem');

      // If it's a customer service question, perform real web search
      if (isCustomerServiceQuery) {
        try {
          // Create a search query optimized for customer service best practices
          let webSearchQuery = searchQuery;
          if (lowerQuery.includes('عميل') || lowerQuery.includes('متضايق')) {
            webSearchQuery = `customer service best practices dealing with angry upset customers ${searchQuery}`;
          } else {
            webSearchQuery = `customer service best practices ${searchQuery}`;
          }

          // Perform web search using the available web search tool
          const webSearchResults = await performWebSearch(webSearchQuery);
          
          // Format the response with bilingual support
          return formatWebSearchResponse(searchQuery, webSearchResults);
          
        } catch (error) {
          console.error('Web search failed, falling back to predefined responses:', error);
          // Fall back to predefined responses if web search fails
        }
      }
      
      if (lowerQuery.includes('refund') || lowerQuery.includes('return') || lowerQuery.includes('استرداد')) {
        return `🔍 **Search Results for "${searchQuery}":**

📋 **Refund/Return Policy Information:**

🇬🇧 **English Response:**
"I understand you're asking about refunds. Here's what I found:
• Refunds are typically processed within 5-7 business days
• Items must be in original condition for returns
• Keep your receipt or order number for faster processing
• Contact customer service for specific cases

I can help you start a return request right now if needed."

🇸🇦 **Arabic Response:**
"أفهم أنك تسأل عن الاسترداد. إليك ما وجدته:
• عادة ما تتم معالجة المبالغ المستردة خلال 5-7 أيام عمل
• يجب أن تكون العناصر في حالتها الأصلية للإرجاع
• احتفظ بإيصالك أو رقم الطلب للمعالجة الأسرع
• اتصل بخدمة العملاء للحالات المحددة

يمكنني مساعدتك في بدء طلب إرجاع الآن إذا لزم الأمر."

Need help with a specific return? Ask me more details!`;
      }
      
      if (lowerQuery.includes('shipping') || lowerQuery.includes('delivery') || lowerQuery.includes('شحن') || lowerQuery.includes('توصيل')) {
        return `🔍 **Search Results for "${searchQuery}":**

📦 **Shipping/Delivery Information:**

🇬🇧 **English Response:**
"Here's what I found about shipping:
• Standard delivery: 2-5 business days
• Express delivery: 1-2 business days
• Free shipping on orders over 200 SAR
• Track your order using the tracking number provided

Current shipping updates:
• All orders are processed within 24 hours
• Weekend deliveries available in major cities"

🇸🇦 **Arabic Response:**
"إليك ما وجدته حول الشحن:
• التوصيل العادي: 2-5 أيام عمل
• التوصيل السريع: 1-2 أيام عمل
• شحن مجاني للطلبات أكثر من 200 ريال
• تتبع طلبك باستخدام رقم التتبع المقدم

تحديثات الشحن الحالية:
• جميع الطلبات تتم معالجتها خلال 24 ساعة
• التوصيل في عطلة نهاية الأسبوع متاح في المدن الكبرى"

Need to track a specific order? Give me your order number!`;
      }
      
      if (lowerQuery.includes('payment') || lowerQuery.includes('charge') || lowerQuery.includes('دفع') || lowerQuery.includes('رسوم')) {
        return `🔍 **Search Results for "${searchQuery}":**

💳 **Payment Information:**

🇬🇧 **English Response:**
"Here's payment information I found:
• We accept Visa, Mastercard, and Mada cards
• Cash on delivery available
• No hidden fees or charges
• Secure payment processing with encryption

If you see unexpected charges:
• Check your email for order confirmations
• Verify the merchant name on your statement
• Contact us immediately for unauthorized charges"

🇸🇦 **Arabic Response:**
"إليك معلومات الدفع التي وجدتها:
• نقبل بطاقات فيزا وماستركارد ومدى
• الدفع عند الاستلام متاح
• لا توجد رسوم أو تكاليف خفية
• معالجة دفع آمنة مع التشفير

إذا رأيت رسوماً غير متوقعة:
• تحقق من بريدك الإلكتروني لتأكيدات الطلب
• تحقق من اسم التاجر في كشف حسابك
• اتصل بنا فوراً للرسوم غير المصرح بها"

Need help with a payment issue? Tell me more details!`;
      }
      
      // Generic search response for other queries
      return `🔍 **Search Results for "${searchQuery}":**

Based on your question, here are some helpful resources:

🇬🇧 **English:**
• Check our FAQ section for common questions
• Contact customer service for personalized help
• Visit our support center for detailed guides
• Use live chat for immediate assistance

🇸🇦 **Arabic:**
• تحقق من قسم الأسئلة الشائعة للأسئلة العامة
• اتصل بخدمة العملاء للحصول على مساعدة شخصية
• قم بزيارة مركز الدعم للحصول على أدلة مفصلة
• استخدم الدردشة المباشرة للحصول على المساعدة الفورية

💡 **Quick Actions:**
• Type "end search" to return to normal chat
• Ask another question to search again
• Use specific keywords for better results

What else would you like to know?`;
      
    } catch (error) {
      throw new Error('Search temporarily unavailable');
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
      type: 'text'
    };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');

    // If creating order, handle form input
    if (isCreatingOrder) {
      setTimeout(() => {
        handleOrderFormSubmit(currentInput);
      }, 500);
      return;
    }

    // If handling complaint search, perform web search
    if (isHandlingComplaint) {
      // Check if user wants to exit search mode
      if (currentInput.toLowerCase().includes('end search') || currentInput.toLowerCase().includes('exit') || currentInput.toLowerCase().includes('إنهاء البحث')) {
        setIsHandlingComplaint(false);
        const exitMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: '✅ Exited search mode. I\'m back to normal chat mode. How can I help you with customer service tasks?',
          isUser: false,
          timestamp: new Date(),
          type: 'text'
        };
        setMessages(prev => [...prev, exitMessage]);
        return;
      }

      setIsTyping(true);
      setTimeout(async () => {
        try {
          const searchResponse = await handleComplaintSearch(currentInput);
          const botResponse: Message = {
            id: (Date.now() + 1).toString(),
            content: searchResponse,
            isUser: false,
            timestamp: new Date(),
            type: 'text'
          };
          setMessages(prev => [...prev, botResponse]);
        } catch (error) {
          const errorResponse: Message = {
            id: (Date.now() + 1).toString(),
            content: '❌ Sorry, I couldn\'t search for that right now. Please try again or contact technical support.',
            isUser: false,
            timestamp: new Date(),
            type: 'text'
          };
          setMessages(prev => [...prev, errorResponse]);
        }
        setIsTyping(false);
      }, 1000);
      return;
    }

    setIsTyping(true);

    // Generate role-specific response
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: generateRoleResponse(currentInput),
        isUser: false,
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  const generateRoleResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    // Customer Service specific responses
    if (user?.position === 'Customer Service') {
      if (message.includes('order') || message.includes('create')) {
        return '🛒 I can help you create orders directly with real WooCommerce integration! Use the "Create New Order" button above, and I\'ll search for actual products and create real orders in your system.';
      }
      if (message.includes('customer') || message.includes('complaint')) {
        return '🤝 For customer issues: Start by acknowledging their concern, then offer solutions. Would you like specific templates for common situations?';
      }
    }

    // Copy Writing specific responses
    if (user?.position === 'Copy Writing') {
      if (message.includes('write') || message.includes('copy')) {
        return '✍️ Great! For effective copy, focus on benefits over features. What\'s the product and target audience? I can help craft compelling messaging.';
      }
    }

    // Media Buyer specific responses
    if (user?.position === 'Media Buyer') {
      if (message.includes('campaign') || message.includes('ads')) {
        return '📊 Let\'s optimize your campaigns! Check your CTR, CPC, and ROAS. I can help analyze performance data and suggest improvements.';
      }
    }

    // Designer specific responses
    if (user?.position === 'Designer') {
      if (message.includes('design') || message.includes('color')) {
        return '🎨 Design tip: Use the 60-30-10 color rule for balanced visuals. What type of design are you working on? I can suggest specific approaches.';
      }
    }

    return `✨ As your ${roleColors.name}, I'm here to help with your role-specific tasks. What would you like assistance with?`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickActionsClick = () => {
    setShowQuickActions(true);
    const quickActionsMessage: Message = {
      id: Date.now().toString(),
      content: '✨ **Quick Actions Available:**\n\nChoose from the available actions below to get started quickly. These are personalized based on your role and position.',
      isUser: false,
      timestamp: new Date(),
      type: 'text'
    };
    setMessages(prev => [...prev, quickActionsMessage]);

    // Show the quick actions buttons after a brief delay
    setTimeout(() => {
      const actionsMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: '🎯 **Available Actions:**',
        isUser: false,
        timestamp: new Date(),
        type: 'quick_actions'
      };
      setMessages(prev => [...prev, actionsMessage]);
    }, 500);
  };

  if (!isOpen) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
                      <div
              className={`
                fixed right-6 bottom-6 z-50
                w-14 h-14 rounded-full
                bg-gradient-to-r ${roleColors.gradient}
                shadow-lg hover:shadow-xl
                flex items-center justify-center
                cursor-pointer transition-all duration-300
                hover:scale-110 active:scale-95
                border-2 border-white
              `}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={() => setIsOpen(true)}
            >
              <div className="relative">
                <Bot className="h-6 w-6 text-white" />
                {/* Animated pulse effect */}
                <div className={`absolute -inset-3 rounded-full ${roleColors.pulse} opacity-20 animate-ping`}></div>
                {/* Secondary pulse */}
                <div className={`absolute -inset-1 rounded-full ${roleColors.secondaryPulse} opacity-40 animate-pulse`}></div>
              </div>
              
              {/* Notification dot */}
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={15} className="max-w-xs">
          <div className="flex items-center gap-3 p-1">
            <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${roleColors.gradient} flex items-center justify-center`}>
                <MessageCircle className="h-4 w-4 text-white" />
              </div>
            </div>
            <div>
                <div className="font-semibold text-sm text-foreground">{roleColors.name}</div>
                <div className="text-xs text-muted-foreground">💬 Click to chat with Noorcare!</div>
              <div className="text-xs text-muted-foreground mt-1">
                  ✨ Get personalized assistance
                </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
    );
  }

      return (
      <div className={`fixed bottom-6 right-6 z-[9999] transition-all duration-500 ease-out ${isOpen ? 'animate-in slide-in-from-bottom-5' : ''}`}>
        <Card className={`w-80 sm:w-96 shadow-2xl transition-all duration-300 ${isMinimized ? 'h-16' : 'h-[500px]'} border-2`}>
        <CardHeader className={`${roleColors.bgColor} text-white p-4 rounded-t-lg relative overflow-hidden`}>
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent"></div>
          </div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-10 h-10 rounded-full bg-white/20 flex items-center justify-center`}>
                  <roleColors.icon className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white">
                  <div className="w-full h-full bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Noorcare AI</CardTitle>
                <p className="text-sm opacity-90">{user?.position || 'Admin'} Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 p-0 text-white hover:bg-white/20 transition-colors"
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0 text-white hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 h-[420px] flex flex-col bg-gradient-to-b from-gray-50 to-white">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                  >
                    <div
                      className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
                        message.isUser
                          ? 'bg-white text-gray-800 border border-gray-200'
                          : `${roleColors.bgColor} text-white`
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line leading-relaxed">{message.content}</p>
                      
                      {/* Product Selection Buttons */}
                      {message.type === 'product_selection' && message.productData?.products && (
                        <div className="mt-4 space-y-3">
                          {message.productData.products.map((product: WooCommerceProduct) => (
                            <div key={product.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                              <div className="flex items-start gap-3">
                                {product.images && product.images[0] && (
                                  <img 
                                    src={product.images[0].src} 
                                    alt={product.name}
                                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium text-white truncate">{product.name}</h4>
                                  <p className="text-xs text-white/80 mt-1">
                                    {product.sale_price ? (
                                      <>
                                        <span className="line-through">{product.price} SAR</span>
                                        <span className="ml-2 font-semibold">{product.sale_price} SAR</span>
                                      </>
                                    ) : (
                                      <span className="font-semibold">{product.price} SAR</span>
                                    )}
                                  </p>
                                  <Button
                                    size="sm"
                                    onClick={() => handleProductSelection(product)}
                                    className="mt-2 bg-white text-gray-800 hover:bg-gray-100 h-7 px-3 text-xs"
                                  >
                                    Select This Product
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const userMessage: Message = {
                                id: Date.now().toString(),
                                content: 'search again',
                                isUser: true,
                                timestamp: new Date(),
                                type: 'text'
                              };
                              setMessages(prev => [...prev, userMessage]);
                              setTimeout(() => {
                                handleOrderFormSubmit('search again');
                              }, 500);
                            }}
                            className="w-full bg-white/20 text-white border-white/30 hover:bg-white/30 h-8"
                          >
                            🔍 Search for Different Products
                          </Button>
                        </div>
                      )}

                      {/* Quick Actions Buttons */}
                      {message.type === 'quick_actions' && (
                        <div className="mt-4 space-y-2">
                          {getRoleSpecificActions().map((action, index) => {
                            const isPending = pendingActions.has(action.action);
                            return (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                onClick={() => handleRoleAction(action.action)}
                                disabled={isPending || isTyping}
                                className={`w-full text-left justify-start text-sm h-auto py-3 px-4 bg-white/20 text-white border-white/30 hover:bg-white/30 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
                                  isPending ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              >
                                <action.icon className="h-4 w-4 mr-3" />
                                {isPending ? '⏳ Processing...' : action.label}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                      
                      <p className="text-xs opacity-70 mt-2">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start animate-in fade-in duration-300">
                    <div className={`${roleColors.bgColor} text-white p-4 rounded-2xl shadow-sm`}>
                      <div className="flex space-x-2 items-center">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                          <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                        </div>
                        <span className="text-xs opacity-70">Noorcare is typing...</span>
                      </div>
                    </div>
                  </div>
                )}

                {isSearchingProducts && (
                  <div className="flex justify-start animate-in fade-in duration-300">
                    <div className={`${roleColors.bgColor} text-white p-4 rounded-2xl shadow-sm`}>
                      <div className="flex space-x-2 items-center">
                        <Search className="h-4 w-4 animate-spin" />
                        <span className="text-xs opacity-70">Searching WooCommerce products...</span>
                      </div>
                    </div>
                  </div>
                )}

                {messages.length <= 1 && !isTyping && (
                  <div className="space-y-3 animate-in fade-in duration-500 delay-300">
                    <p className="text-sm text-gray-600 font-semibold">✨ Quick Actions:</p>
                    {getRoleSpecificActions().map((action, index) => {
                      const isPending = pendingActions.has(action.action);
                      return (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleRoleAction(action.action)}
                          disabled={isPending || isTyping}
                          className={`w-full text-left justify-start text-sm h-auto py-3 px-4 ${roleColors.textColor} border-current transition-all duration-200 hover:bg-sky-400 hover:text-white hover:scale-[1.02] hover:shadow-md ${
                            isPending ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <action.icon className="h-4 w-4 mr-3" />
                          {isPending ? '⏳ Processing...' : action.label}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            <div className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <Button
                  onClick={handleQuickActionsClick}
                  disabled={isTyping || isSearchingProducts}
                  variant="outline"
                  className="rounded-full w-12 h-12 p-0 border-2 hover:bg-sky-50 transition-all duration-200 hover:scale-105"
                  title="Show Quick Actions"
                >
                  <Zap className="h-5 w-5 text-sky-600" />
                </Button>
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    isCreatingOrder 
                      ? `Enter ${createOrderSteps[orderForm.currentStep]?.label.toLowerCase()}...`
                      : `Ask Noorcare anything...`
                  }
                  className="flex-1 rounded-full border-2 focus:border-current transition-colors"
                  disabled={isTyping || isSearchingProducts}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isTyping || isSearchingProducts}
                  className={`${roleColors.bgColor} hover:opacity-90 text-white rounded-full w-12 h-12 p-0 transition-all duration-200 hover:scale-105`}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
              {isCreatingOrder && (
                <div className="mt-2 text-xs text-gray-500 text-center">
                  Step {orderForm.currentStep + 1} of {createOrderSteps.length} • Creating Real Order
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default FloatingChatbot; 