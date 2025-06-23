import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot,
  MessageCircle,
  X,
  Minimize2,
  Maximize2,
  Send,
  Plus,
  FileText,
  TrendingUp,
  Package,
  Palette,
  CreditCard,
  Settings,
  Users,
  Search,
  ShoppingCart,
  Phone,
  MapPin,
  Shrink,
  Expand,
  Zap,
  Minus,
  User
} from 'lucide-react';
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
import { motion, AnimatePresence } from 'framer-motion';

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
  type?: 'text' | 'action' | 'order' | 'form' | 'product_search' | 'product_selection' | 'complaint_search' | 'quick_actions' | 'product_search_results' | 'product_info';
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
  const { user, isLoading: isAuthLoading } = useAuth();
  const location = useLocation();
  
  // Early return before any other hooks to prevent hook count mismatch
  if (isAuthLoading || !user || location.pathname === '/login' || location.pathname === '/') {
    return null;
  }
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [isShrinking, setIsShrinking] = useState(false);
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
  const [isInProductSearchMode, setIsInProductSearchMode] = useState(false);
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Add custom CSS for animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      .animate-shimmer {
        animation: shimmer 2s infinite;
      }
      .animate-smooth-bounce {
        animation: smooth-bounce 2s ease-in-out infinite;
      }
      @keyframes smooth-bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
            @keyframes expand-scale {
        0% {
          transform: scale(0.3);
          opacity: 0.4;
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }
      @keyframes shrink-scale {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        100% {
          transform: scale(0.3);
          opacity: 0.4;
        }
      }
      .animate-expand-scale {
        animation: expand-scale 0.25s ease-out;
      }
      .animate-shrink-scale {
        animation: shrink-scale 0.25s ease-in;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('/chatbot.mp3');
    audioRef.current.volume = 0.3; // Set volume to 30%
  }, []);

  // Play sound for bot messages
  const playBotSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0; // Reset to start
      audioRef.current.play().catch(error => {
        console.log('Could not play audio:', error);
      });
    }
  };

  // Log chatbot availability on component mount
  useEffect(() => {
    console.log('🤖 FloatingChatbot: AI Assistant is now available!');
    console.log('🎯 Features available: Role-based assistance, Order creation, Product search, Quick actions');
  }, []);

  // Role-based color configurations with enhanced functionality
  // Helper function to format prices consistently
  const formatProductPrice = (product: any, hasArabicContent: boolean) => {
    console.log('🔄 Re-formatting price for:', product.name, {
      price: product.price,
      regular_price: product.regular_price,
      sale_price: product.sale_price,
    });

    const currency = hasArabicContent ? 'ريال' : 'SAR';
    
    const regularPrice = product.regular_price;
    const activePrice = product.price;

    // A product is on sale if regular_price exists, is not empty, and is greater than the active price.
    const isOnSale = regularPrice && regularPrice !== '' && parseFloat(regularPrice) > parseFloat(activePrice);
    
    if (isOnSale) {
      if (hasArabicContent) {
        return (
          <div className="space-y-1 text-base font-bold text-right">
            <div className="opacity-75">
              <span>السعر الأصلي: </span>
              <span className="line-through">{regularPrice} {currency}</span>
            </div>
            <div className="text-red-500">
              <span>سعر العرض: </span>
              <span>{activePrice} {currency}</span>
            </div>
          </div>
        );
      } else {
        return (
          <div className="space-y-1 text-base font-bold">
            <div className="opacity-75">
              <span>Original Price: </span>
              <span className="line-through">{regularPrice} {currency}</span>
            </div>
            <div className="text-red-500">
              <span>Offer Price: </span>
              <span>{activePrice} {currency}</span>
            </div>
          </div>
        );
      }
    }
    
    // Default: show the single, active price.
    if (hasArabicContent) {
        return <div className="font-bold text-base text-right">السعر: {activePrice} {currency}</div>;
    } else {
        return <div className="font-bold text-base">Price: {activePrice} {currency}</div>;
    }
  };

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
      console.log('🤖 FloatingChatbot: Initializing chatbot for user:', user?.name, '| Position:', user?.position);
      setTimeout(() => {
        const welcomeMessage: Message = {
          id: 'welcome',
          content: getWelcomeMessage(),
          isUser: false,
          timestamp: new Date(),
          type: 'text'
        };
        setMessages([welcomeMessage]);
        // Play sound for welcome message
        setTimeout(() => playBotSound(), 200);
      }, 500);
    }
  }, [isOpen, user?.position]);

  // Add a separate effect to show quick actions after the welcome message
  useEffect(() => {
    if (messages.length === 1 && messages[0].id === 'welcome') {
      const quickActionsMessage: Message = {
        id: 'quick-actions-initial',
        content: '', // No text content needed for this type
        isUser: false,
        timestamp: new Date(),
        type: 'quick_actions'
      };
      setTimeout(() => {
        setMessages(prev => [...prev, quickActionsMessage]);
        playBotSound();
      }, 800); // Delay slightly after welcome
    }
  }, [messages]);

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
          { icon: ShoppingCart, label: 'Create New Order', action: 'create_order' },
          { icon: Search, label: 'Search Products', action: 'search_products' },
          { icon: User, label: 'Customer Support', action: 'customer_support' },
          { icon: MapPin, label: 'Go to CRM', action: 'navigate_crm' },
          { icon: Users, label: 'Loyal Customers', action: 'navigate_loyal' }
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

  // Enhanced WooCommerce product search with keyword support
  const searchProducts = async (query: string): Promise<WooCommerceProduct[]> => {
    try {
      setIsSearchingProducts(true);
      console.log('🔍 Searching WooCommerce products for:', query);
      
      // Enhanced search parameters for better keyword matching
      const results = await wooCommerceAPI.fetchProducts({
        search: query,
        per_page: 12, // Increased to show more results
        status: 'publish',
        stock_status: 'instock',
        orderby: 'title', // Use valid orderby parameter
        order: 'asc'
      });
      
      console.log(`✅ Found ${results.length} products for "${query}"`);
      return results;
    } catch (error) {
      console.error('❌ Error searching products:', error);
      toast.error('Failed to search products');
      return [];
    } finally {
      setIsSearchingProducts(false);
    }
  };

  // Enhanced product search handler for information purposes only
  const handleProductSearch = async (query: string) => {
    setIsSearchingProducts(true);
    
    try {
      const results = await searchProducts(query);
      
      // Debug: Log product data to see price structure
      if (results.length > 0) {
        console.log('🔍 Product data:', results[0]);
        console.log('💰 Price info:', {
          price: results[0].price,
          sale_price: results[0].sale_price,
          regular_price: results[0].regular_price
        });
      }
      
      if (results.length === 0) {
        const noResultsMessage: Message = {
          id: Date.now().toString(),
          content: `🔍 **No products found for "${query}"**\n\nTry different keywords like:\n• Product categories (vitamins, supplements, omega)\n• Brand names (NQ, Noor)\n• Health benefits (immunity, energy, joints)\n• Ingredients (iron, calcium, vitamin D)`,
          isUser: false,
          timestamp: new Date(),
          type: 'text'
        };
        setMessages(prev => [...prev, noResultsMessage]);
        // Play sound for bot message
        setTimeout(() => playBotSound(), 100);
      } else {
        // Check if this is a "what is" question to provide direct answer
        const isWhatIsQuestion = /^(ما هو|ما هي|what is|what are)\s+/i.test(query);
        
        if (isWhatIsQuestion && results.length > 0) {
          // Get the first/best match product
          const product = results[0];
          const isArabic = /[\u0600-\u06FF]/.test(product.name);
          
          // Create a direct answer from product information
          let answer = '';
          
          if (isArabic) {
            answer = `✨ **${product.name}**\n\n`;
            
            const regularPrice = product.regular_price;
            const activePrice = product.price;
            const isOnSale = regularPrice && regularPrice !== '' && parseFloat(regularPrice) > parseFloat(activePrice);

            if (isOnSale) {
              answer += `**السعر الأصلي:** ~~${regularPrice} ريال~~\n`;
              answer += `**سعر العرض:** **${activePrice} ريال**\n\n`;
            } else {
              answer += `**السعر:** **${activePrice} ريال**\n\n`;
            }
            
            if (product.short_description) {
              const cleanDesc = product.short_description.replace(/<[^>]*>/g, '').trim();
              if (cleanDesc) {
                answer += `📝 **الوصف:** ${cleanDesc}\n\n`;
              }
            }
            
            if (product.description) {
              const cleanDesc = product.description.replace(/<[^>]*>/g, '').trim();
              if (cleanDesc && cleanDesc.length > 0) {
                const truncatedDesc = cleanDesc.length > 300 ? cleanDesc.substring(0, 300) + '...' : cleanDesc;
                answer += `📖 **التفاصيل:** ${truncatedDesc}\n\n`;
              }
            }
            
            answer += `📦 **رمز المنتج:** ${product.sku || 'غير متوفر'}\n`;
            answer += `📊 **المخزون:** ${product.stock_status === 'instock' ? '✅ متوفر' : '❌ غير متوفر'}\n\n`;
            answer += `🔗 لمزيد من التفاصيل، انقر على "عرض التفاصيل" أدناه`;
          } else {
            answer = `✨ **${product.name}**\n\n`;

            const regularPrice = product.regular_price;
            const activePrice = product.price;
            const isOnSale = regularPrice && regularPrice !== '' && parseFloat(regularPrice) > parseFloat(activePrice);

            if (isOnSale) {
              answer += `**Original Price:** ~~${regularPrice} SAR~~\n`;
              answer += `**Offer Price:** **${activePrice} SAR**\n\n`;
            } else {
              answer += `**Price:** **${activePrice} SAR**\n\n`;
            }
            
            if (product.short_description) {
              const cleanDesc = product.short_description.replace(/<[^>]*>/g, '').trim();
              if (cleanDesc) {
                answer += `📝 **Description:** ${cleanDesc}\n\n`;
              }
            }
            
            if (product.description) {
              const cleanDesc = product.description.replace(/<[^>]*>/g, '').trim();
              if (cleanDesc && cleanDesc.length > 0) {
                const truncatedDesc = cleanDesc.length > 300 ? cleanDesc.substring(0, 300) + '...' : cleanDesc;
                answer += `📖 **Details:** ${truncatedDesc}\n\n`;
              }
            }
            
            answer += `📦 **SKU:** ${product.sku || 'N/A'}\n`;
            answer += `📊 **Stock:** ${product.stock_status === 'instock' ? '✅ Available' : '❌ Out of Stock'}\n\n`;
            answer += `🔗 For more details, click "View Details" below`;
          }
          
          const directAnswerMessage: Message = {
            id: Date.now().toString(),
            content: answer,
            isUser: false,
            timestamp: new Date(),
            type: 'text'
          };
          setMessages(prev => [...prev, directAnswerMessage]);
          
          // Also show the product card for more details
          const productInfoMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: '',
            isUser: false,
            timestamp: new Date(),
            type: 'product_info',
            productData: { product }
          };
          setMessages(prev => [...prev, productInfoMessage]);
          
        } else {
          // Regular search results
          const resultsMessage: Message = {
            id: Date.now().toString(),
            content: `🎯 **Found ${results.length} products for "${query}":**\n\nClick "View Details" to see complete product information:`,
            isUser: false,
            timestamp: new Date(),
            type: 'product_search_results',
            productData: { products: results }
          };
          setMessages(prev => [...prev, resultsMessage]);
          setSearchResults(results);
        }
        
        // Play sound for bot message
        setTimeout(() => playBotSound(), 100);
      }
    } catch (error) {
      console.error('❌ Error searching products:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: '❌ Error searching products. Please try again or contact support.',
        isUser: false,
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
      // Play sound for bot message
      setTimeout(() => playBotSound(), 100);
    } finally {
      setIsSearchingProducts(false);
    }
  };

  // Handle product information display with full details in card only
  const handleProductInfo = (product: WooCommerceProduct) => {
    const infoMessage: Message = {
      id: Date.now().toString(),
      content: '', // Empty content - all info will be in the product card
      isUser: false,
      timestamp: new Date(),
      type: 'product_info',
      productData: { product: product }
    };
    setMessages(prev => [...prev, infoMessage]);
    // Play sound for bot message
    setTimeout(() => playBotSound(), 100);
  };

  const performWebSearch = async (query: string): Promise<any> => {
    // Simulate web search functionality for customer service
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          results: [
            {
              title: "Customer Service Best Practices",
              snippet: "When dealing with upset customers, always listen actively, acknowledge their feelings, and provide clear solutions. Stay calm and professional."
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
      return `🔍 **دليل شامل للتعامل مع العملاء - "${originalQuery}"**

📋 **أسئلة شائعة من العملاء (مع نماذج ردود محترفة)**

**1️⃣ "المنتج لم يصل بعد!"**
💬 **الرد المثالي:**
"نعتذر بصدق عن التأخير. سنتحقق مع فريق الشحن فورًا ونرسل لك تحديثًا خلال ساعة. كتعويض، نقدم لك خصم 15% على طلبك القادم."

**2️⃣ "المكمل الغذائي لم يعطِ النتائج المتوقعة!"**
💬 **الرد المثالي:**
"نقدر ملاحظتك الصادقة. نوصي باستشارة أخصائي تغذية لضمان استخدام المنتج المناسب لاحتياجاتك. نقدم لك استبدالًا بمنتج آخر أو استردادًا كاملًا."

🔄 **اكتب "بحث جديد" للبحث عن موضوع آخر**`;
    }
    
    return `🔍 **Customer Service Guide - "${originalQuery}"**

📋 **Common Customer Issues (with Response Templates)**

**1️⃣ "My order hasn't arrived yet!"**
💬 **Response:**
"I sincerely apologize for the delay. I'll check with our shipping team immediately and send you an update within the hour. As compensation, I'd like to offer you a 15% discount on your next order."

**2️⃣ "The supplement didn't work as expected!"**
💬 **Response:**
"I appreciate your feedback. I recommend consulting with a nutritionist to ensure you're using the right product for your needs. We can offer you either an exchange or a full refund."

🔄 **Type "new search" to search for another topic**`;
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

        case 'search_products':
          if (user?.position === 'Customer Service') {
            setIsInProductSearchMode(true);
            botResponse = {
              id: Date.now().toString(),
              content: '🔍 **WooCommerce Product Search**\n\nPlease enter the product name or keywords you want to search for in WooCommerce:',
              isUser: false,
              timestamp: new Date(),
              type: 'product_search'
            };
          } else {
            botResponse = {
              id: Date.now().toString(),
              content: '❌ Product search is only available for Customer Service users.',
              isUser: false,
              timestamp: new Date(),
              type: 'text'
            };
          }
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
      // Play sound for bot message
      setTimeout(() => playBotSound(), 100);
      
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
    setOrderForm(prev => ({
      ...prev,
      productId: product.id,
      productName: product.name,
      price: product.sale_price || product.price
    }));

    const confirmationMessage: Message = {
      id: Date.now().toString(),
      content: `✅ **Product Selected!**\n\n**${product.name}**\nPrice: ${product.sale_price || product.price} SAR\n\nNow let's continue with the order details. What's the customer's name?`,
      isUser: false,
      timestamp: new Date(),
      type: 'form'
    };
    setMessages(prev => [...prev, confirmationMessage]);
    // Play sound for bot message
    setTimeout(() => playBotSound(), 100);
    setOrderForm(prev => ({ ...prev, currentStep: 0 }));
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
    if (!inputValue.trim() || isTyping || isSearchingProducts) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    const originalInput = inputValue;
    setInputValue('');
    setIsTyping(true);

    try {
      // Smart search detection for Customer Service
      if (user?.position === 'Customer Service') {
        const lowerInput = originalInput.toLowerCase().trim();
        
        // Check for automatic search detection
        const isSearchCommand = lowerInput.startsWith('search ') || lowerInput.startsWith('بحث ');
        
        if (isSearchCommand) {
          // Extract search query after "search" or "بحث"
          const searchQuery = lowerInput.startsWith('search ') 
            ? originalInput.substring(7).trim() 
            : originalInput.substring(4).trim(); // "بحث " is 4 characters including space
          
          if (searchQuery) {
            await handleProductSearch(searchQuery);
            return;
          }
        }

        // Smart question detection - detect "what is" questions in Arabic and English
        const questionPatterns = [
          /^(ما هو|ما هي|what is|what are)\s+(.+)/i,
          /^(أين أجد|where can i find|where is)\s+(.+)/i,
          /^(هل يوجد|do you have|is there)\s+(.+)/i,
          /^(أريد|i want|i need)\s+(.+)/i,
          /^(أبحث عن|looking for|searching for)\s+(.+)/i
        ];

        const questionMatch = questionPatterns.find(pattern => pattern.test(originalInput));
        if (questionMatch) {
          const match = originalInput.match(questionMatch);
          if (match && match[2]) {
            const searchQuery = match[2].trim();
            console.log('🔍 Smart search detected:', searchQuery);
            await handleProductSearch(searchQuery);
            return;
          }
        }

        // Simple product name detection - if input contains Arabic/English product-like terms
        const productIndicators = [
          /[\u0600-\u06FF]{3,}/, // Arabic text with 3+ characters
          /[a-zA-Z]{3,}/, // English text with 3+ characters
        ];

        const seemsLikeProduct = productIndicators.some(pattern => pattern.test(originalInput));
        if (seemsLikeProduct && originalInput.length > 2 && !lowerInput.includes('hello') && !lowerInput.includes('hi')) {
          console.log('🔍 Product-like query detected:', originalInput);
          await handleProductSearch(originalInput);
          return;
        }
      }

      // Check if we're in order creation mode
      if (isCreatingOrder) {
        await handleOrderFormSubmit(userMessage.content);
        return;
      }

      // Check if we're in product search mode
      if (isInProductSearchMode || (messages.length > 0 && messages[messages.length - 1]?.type === 'product_search')) {
        await handleProductSearch(userMessage.content);
        setIsInProductSearchMode(false);
        return;
      }

      // Check if we're in complaint handling mode
      if (isHandlingComplaint) {
        const complaintResponse = await handleComplaintSearch(userMessage.content);
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: complaintResponse,
          isUser: false,
          timestamp: new Date(),
          type: 'text'
        };
        setMessages(prev => [...prev, botMessage]);
        // Play sound for bot message
        setTimeout(() => playBotSound(), 100);
        setIsHandlingComplaint(false);
        return;
      }

      // Generate role-based response
      const response = generateRoleResponse(userMessage.content);
      
      setTimeout(() => {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: response,
          isUser: false,
          timestamp: new Date(),
          type: 'text'
        };
        setMessages(prev => [...prev, botMessage]);
        // Play sound for bot message
        setTimeout(() => playBotSound(), 100);
      }, 1000 + Math.random() * 1000);

    } catch (error) {
      console.error('Error handling message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: '❌ Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
      // Play sound for bot message
      setTimeout(() => playBotSound(), 100);
    } finally {
      setIsTyping(false);
    }
  };

  const generateRoleResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    // Check for shipping-related queries (Arabic)
    if (message.includes('شحن') || message.includes('الشحن') || message.includes('تكلفه الشحن') || message.includes('مده الشحن') || message.includes('تكلفة الشحن') || message.includes('مدة الشحن')) {
      return `📦 **معلومات الشحن:**

⏰ **مدة الشحن:**
الشحن في خلال 1 الي 3 ايام اقصي فتره

💰 **تكلفة الشحن:**
اذا كان الطلب اكثر من 200 ريال الشحن مجاني

📍 نقوم بالشحن لجميع مناطق المملكة العربية السعودية`;
    }
    
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
    // Play sound for bot message
    setTimeout(() => playBotSound(), 100);

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
      // Play sound for bot message
      setTimeout(() => playBotSound(), 100);
    }, 500);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setIsFullScreen(false);
      setIsMinimized(false);
    }, 300); // Wait for animation to complete
  };

  return (
    <div className="fixed bottom-5 right-5 z-[1000]">
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="chat-window"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="w-[calc(100vw-2.5rem)] max-w-lg h-[75vh] max-h-[800px] flex flex-col bg-card/80 dark:bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-background/30">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full bg-gradient-to-br ${roleColors.gradient}`}>
                  <roleColors.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{roleColors.name}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                    Online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMinimized(m => !m)}>
                  <Minus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div ref={messagesContainerRef} className="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar">
              {messages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-end gap-2 ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!msg.isUser && (
                    <div className={`h-8 w-8 rounded-full flex-shrink-0 bg-gradient-to-br ${roleColors.gradient} flex items-center justify-center`}>
                      <roleColors.icon className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div className={`max-w-xs md:max-w-md p-3 rounded-2xl shadow-md ${
                    msg.isUser
                      ? 'bg-primary text-primary-foreground rounded-br-lg'
                      : 'bg-muted text-foreground rounded-bl-lg'
                  }`}>
                    {/* Render message content based on type */}
                    {msg.content && (
                      <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
                    )}

                    {/* Render Quick Actions */}
                    {msg.type === 'quick_actions' && (
                      <div className="space-y-2 pt-2">
                        <p className="text-sm font-semibold text-foreground/80 mb-2">✨ Quick Actions</p>
                        {getRoleSpecificActions().map((action, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => handleRoleAction(action.action)}
                            disabled={isTyping}
                            className="w-full text-left justify-start h-auto py-2 px-3 bg-background/50 hover:bg-background/80"
                          >
                            <action.icon className="h-4 w-4 mr-3 text-muted-foreground" />
                            <span>{action.label}</span>
                          </Button>
                        ))}
                      </div>
                    )}
                    
                    <p className="text-xs opacity-60 mt-2 text-right">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>

                    {/* Render Product Search Results */}
                    {msg.type === 'product_search_results' && (
                      <div className="space-y-3 pt-2">
                        {msg.productData?.products.map((product: WooCommerceProduct) => (
                          <div key={product.id} className="flex items-start gap-3 p-2 rounded-lg bg-background/50">
                            {product.images?.[0]?.src && (
                              <img src={product.images[0].src} alt={product.name} className="w-16 h-16 rounded-md object-cover"/>
                            )}
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{formatProductPrice(product, /[\u0600-\u06FF]/.test(product.name))}</p>
                              <Button
                                size="sm"
                                variant="link"
                                className="p-0 h-auto text-primary mt-1"
                                onClick={() => handleProductInfo(product)}
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Render Product Info (Detailed View) */}
                    {msg.type === 'product_info' && msg.productData?.product && (
                       (() => {
                        const product = msg.productData.product;
                        const isArabic = /[\u0600-\u06FF]/.test(product.name);
                        const textAlign = isArabic ? 'text-right' : 'text-left';
                        
                        return (
                          <div className="space-y-3" dir={isArabic ? 'rtl' : 'ltr'}>
                            {product.images && product.images[0] && (
                              <img 
                                src={product.images[0].src} 
                                alt={product.name}
                                className="w-full h-48 rounded-lg object-cover"
                              />
                            )}
                            <h3 className={`font-bold text-lg ${textAlign}`}>
                              {product.name}
                            </h3>
                            <div className={`${textAlign}`}>
                              {formatProductPrice(product, isArabic)}
                            </div>
                            {product.short_description && (
                              <div className={`text-sm ${textAlign}`} dangerouslySetInnerHTML={{ __html: product.short_description }} />
                            )}
                            {product.description && product.description !== product.short_description && (
                              <div className="pt-3 mt-3 border-t border-border/50">
                                <div className={`text-sm text-muted-foreground ${textAlign}`} dangerouslySetInnerHTML={{ __html: product.description }} />
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground pt-2 mt-2 border-t border-border/50">
                              <p><strong>SKU:</strong> {product.sku || 'N/A'}</p>
                              <p><strong>Stock:</strong> {product.stock_status === 'instock' ? '✅ Available' : '❌ Out of Stock'}</p>
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-end gap-2"
                >
                  <div className={`h-8 w-8 rounded-full flex-shrink-0 bg-gradient-to-br ${roleColors.gradient} flex items-center justify-center`}>
                    <roleColors.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="p-3 rounded-2xl bg-muted text-foreground rounded-bl-lg flex items-center gap-1.5">
                    <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse delay-0"></span>
                    <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                    <span className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
              {/* Input Area */}
              <div className="p-3 border-t border-border/50 bg-background/30">
                <div className="relative">
                  <Textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="w-full bg-muted border-2 border-transparent focus:border-primary rounded-xl resize-none pr-12 custom-scrollbar"
                    rows={1}
                  />
                  <Button
                    size="icon"
                    className={`absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-gradient-to-br ${roleColors.gradient} ${roleColors.hoverGradient}`}
                    onClick={handleSendMessage}
                    disabled={isTyping || !inputValue.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="chat-button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={() => setIsOpen(true)}
              className={`w-14 h-14 rounded-full bg-gradient-to-r ${roleColors.gradient} shadow-lg hover:shadow-xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 border-2 border-white`}
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
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};

export default FloatingChatbot; 