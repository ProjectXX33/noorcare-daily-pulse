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
  User,
  Clock,
  LogIn,
  LogOut,
  AlertTriangle
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
import { useCheckIn } from '@/contexts/CheckInContext';
import { useLanguage } from '@/contexts/LanguageContext';
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
  const { isCheckedIn, hasCheckedInToday, hasCheckedOutToday, currentCheckIn } = useCheckIn();
  const { language } = useLanguage();
  const location = useLocation();
  
  // Early return before any other hooks to prevent hook count mismatch
  if (isAuthLoading || !user || location.pathname === '/login' || location.pathname === '/') {
    return null;
  }
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

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
  const [lastWorkTimeCheck, setLastWorkTimeCheck] = useState<Date | null>(null);
  const [hasShownWorkEndAlarm, setHasShownWorkEndAlarm] = useState(false);
  const [userPreferences, setUserPreferences] = useState<any>(null);
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const alarmRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [awaitingCampaignProductName, setAwaitingCampaignProductName] = useState(false);

  // Helper function to remove ** formatting from text
  const cleanFormattingMarkers = (text: string): string => {
    return text.replace(/\*\*(.*?)\*\*/g, '$1');
  };
  
  // Budget Optimization states
  const [budgetOptimizationActive, setBudgetOptimizationActive] = useState(false);
  const [budgetOptimizationStep, setBudgetOptimizationStep] = useState(0);
  const [budgetOptimizationData, setBudgetOptimizationData] = useState<{
    previousCampaigns: string;
    totalBudget: string;
    targetAudience: string;
    adSchedule: string;
    platforms: string;
    objectives: string;
    metrics: string;
    roas: string;
    creatives: string;
  }>({
    previousCampaigns: '',
    totalBudget: '',
    targetAudience: '',
    adSchedule: '',
    platforms: '',
    objectives: '',
    metrics: '',
    roas: '',
    creatives: ''
  });

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
    
    // Initialize alarm audio
    alarmRef.current = new Audio('/alarm.mp3');
    alarmRef.current.volume = 0.7; // Set volume to 70%
  }, []);

  // Play sound for bot messages
  const playBotSound = () => {
    if (audioRef.current && userPreferences?.notifications?.sound) {
      audioRef.current.currentTime = 0; // Reset to start
      audioRef.current.play().catch(error => {
        console.log('Could not play audio:', error);
      });
    }
  };

  // Play alarm sound when work time ends
  const playWorkEndAlarm = () => {
    if (alarmRef.current && !hasShownWorkEndAlarm && 
        userPreferences?.workReminders?.workTimeAlarm && 
        userPreferences?.notifications?.sound) {
      alarmRef.current.currentTime = 0; // Reset to start
      alarmRef.current.play().catch(error => {
        console.log('Could not play alarm:', error);
      });
      setHasShownWorkEndAlarm(true);
    }
  };

  // Check if work counter (remaining work time) is 0
  const checkWorkCounterStatus = () => {
    if (!user || !user.id || !currentCheckIn || !isCheckedIn) return false;

    const now = new Date();
    const checkInTime = new Date(currentCheckIn.timestamp);
    const timeWorked = (now.getTime() - checkInTime.getTime()) / 1000; // seconds

    // Calculate shift duration based on user's shift
    let shiftDurationHours = 8; // default
    
    // Use the same logic as WorkShiftTimer to determine shift duration
    const checkInHour = checkInTime.getHours();
    if (checkInHour >= 8 && checkInHour < 16) {
      shiftDurationHours = 7; // Day shift = 7 hours
    } else {
      shiftDurationHours = 8; // Night shift = 8 hours
    }

    const shiftDurationSeconds = shiftDurationHours * 3600;
    const remainingSeconds = Math.max(0, shiftDurationSeconds - timeWorked);
    
    // Return true if remaining seconds is 0 (work counter reached 0)
    return remainingSeconds === 0;
  };

  // Check work time and send reminders
  const checkWorkTimeStatus = () => {
    if (!user || !user.id) return;

    // Only check for work counter reaching zero
    const isWorkCounterZero = checkWorkCounterStatus();
    if (isWorkCounterZero && !hasShownWorkEndAlarm && userPreferences?.workReminders?.workTimeAlarm) {
      playWorkEndAlarm();
      sendWorkTimeReminder('workend');
    }
  };

  const sendWorkTimeReminder = (type: 'workend') => {
    let reminderMessage: Message;
    
    switch (type) {
      case 'workend':
        reminderMessage = {
          id: Date.now().toString(),
          content: `🎯 Work Day Complete!\n\nCongratulations ${user?.name}! Your work counter has reached 0 - shift completed!\n\n✅ Great job today! You can check out now or continue working (overtime will be tracked).`,
          isUser: false,
          timestamp: new Date(),
          type: 'text'
        };
        break;
    }
    
    setMessages(prev => [...prev, reminderMessage]);
    playBotSound();
    
    // Auto-open chatbot for important reminders
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  // Log chatbot availability on component mount
  useEffect(() => {
    console.log('🤖 FloatingChatbot: AI Assistant is now available!');
    console.log('🎯 Features available: Role-based assistance, Order creation, Product search, Quick actions');
  }, []);

  // Handle keyboard shortcuts for fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen && isOpen) {
        setIsFullScreen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen, isOpen]);

  // Load user preferences
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('preferences')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data?.preferences) {
          setUserPreferences(data.preferences);
        }
      } catch (error) {
        console.error('Error loading user preferences:', error);
      }
    };

    loadUserPreferences();
  }, [user?.id]);

  // Work time monitoring interval
  useEffect(() => {
    if (!userPreferences) return; // Wait for preferences to load

    const interval = setInterval(() => {
      checkWorkTimeStatus();
    }, 60000); // Check every minute

    // Also check immediately
    checkWorkTimeStatus();

    return () => clearInterval(interval);
  }, [user, isCheckedIn, currentCheckIn, hasShownWorkEndAlarm, userPreferences]);

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
          name: 'NoorMetric Campaign Assistant',
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
      case 'Warehouse Staff':
        return {
          gradient: 'from-amber-500 to-yellow-500',
          hoverGradient: 'hover:from-amber-600 hover:to-yellow-600',
          pulse: 'bg-amber-400',
          secondaryPulse: 'bg-yellow-300',
          name: 'NoorTrack Warehouse Assistant',
          icon: Package,
          bgColor: 'bg-amber-500',
          textColor: 'text-amber-600'
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

  

  const getWelcomeMessage = (): string => {
    // Check if user has set language preference already
    const currentLang = language;
    
    if (!currentLang) {
      // Ask for language preference first
      return `👋 Hello ${user?.name || 'there'}! I'm your intelligent assistant.\n\n🌐 Please choose your preferred language / يرجى اختيار لغتك المفضلة:\n\n🇺🇸 Type "English" for English\n🇸🇦 اكتب "عربي" للعربية\n\nType "English" or "عربي" to continue...`;
    }
    
    const greeting = `👋 Hello ${user?.name || 'there'}! I'm your ${roleColors.name}.`;
    const arabicGreeting = `👋 مرحباً ${user?.name || 'بك'}! أنا مساعدك ${roleColors.name}.`;
    
    const isArabic = currentLang === 'ar';
    
    switch (user?.position) {
      case 'Copy Writing':
        return isArabic 
          ? `${arabicGreeting}\n\n✨ يمكنني مساعدتك في:\n• الكتابة الإبداعية\n• إنشاء المحتوى\n• أفكار الحملات\n• رسائل العلامة التجارية\n\nبماذا تريد أن تعمل اليوم؟`
          : `${greeting}\n\n✨ I can help you with:\n• Creative copywriting\n• Content creation\n• Campaign ideas\n• Brand messaging\n\nWhat would you like to work on today?`;
      case 'Designer':
        return isArabic
          ? `${arabicGreeting}\n\n🎨 يمكنني المساعدة في:\n• مفاهيم التصميم\n• اقتراحات التخطيط\n• لوحات الألوان\n• الإرشادات البصرية\n\nكيف يمكنني مساعدتك في مشاريع التصميم؟`
          : `${greeting}\n\n🎨 I can assist with:\n• Design concepts\n• Layout suggestions\n• Color palettes\n• Visual guidelines\n\nHow can I help with your design projects?`;
      case 'Media Buyer':
        return isArabic
          ? `${arabicGreeting}\n\n📊 يمكنني المساعدة في تحسين:\n• تحليل أداء الحملات\n• البحث والرؤى حول المنتجات\n• إنشاء الاستراتيجيات بالذكاء الاصطناعي\n• تحسين تخصيص الميزانية\n• توصيات استهداف الجمهور\n• تتبع مقاييس الأداء\n\nما هي الحملات التي تعمل عليها؟`
          : `${greeting}\n\n📊 I can help optimize:\n• Campaign performance analysis\n• Product research and insights\n• AI-powered strategy creation\n• Budget allocation optimization\n• Audience targeting recommendations\n• Performance metrics tracking\n\nWhat campaigns are you working on?`;
      case 'Customer Service':
        return isArabic
          ? `👋 أهلاً وسهلاً ${user?.name}!\n\n🤖 **مساعد خدمة العملاء الذكي**\n\nمخصص للبحث السريع عن المنتجات وإنشاء الطلبات:\n\n🔍 **البحث الفوري:**\n• اكتب اسم أي منتج (مثل: "فيتامين د")\n• معلومات كاملة: الأسعار، المخزون، الوصف\n• دعم البحث بالعربية والإنجليزية\n\n🛒 **إنشاء الطلبات:**\n• ربط مباشر مع WooCommerce\n• تفاصيل العملاء والمنتجات\n\n📦 **دعم العملاء:**\n• إرشادات الشحن والأسعار\n• نصائح خدمة العملاء\n\n💡 **جرب الآن:** اكتب اسم أي منتج أو استخدم ⚡ الإجراءات السريعة!`
          : `👋 Welcome ${user?.name}!\n\n🤖 **Customer Service AI Assistant**\n\nSpecialized for fast product search and order creation:\n\n🔍 **Instant Search:**\n• Type any product name (e.g., "vitamin D")\n• Complete info: prices, stock, descriptions\n• Arabic & English search support\n\n🛒 **Order Creation:**\n• Direct WooCommerce integration\n• Customer and product details\n\n📦 **Customer Support:**\n• Shipping info and pricing\n• Customer service guidelines\n\n💡 **Try now:** Type any product name or use ⚡ Quick Actions!`;
      case 'Warehouse Staff':
        return isArabic
          ? `${arabicGreeting}\n\n📦 يمكنني مساعدتك في:\n• تحليل حالة الطلبات والرؤى\n• تحديد وإدارة الطلبات المتأخرة\n• تحليلات أداء الشحن\n• فلترة والبحث في الطلبات\n• إحصائيات لوحة التحكم في الوقت الفعلي\n• البحث عن طلبات العملاء\n\nما هي عمليات المستودع التي يمكنني المساعدة فيها؟`
          : `${greeting}\n\n📦 I can help you with:\n• Order status analysis and insights\n• Late order identification and management\n• Shipping performance analytics\n• Order filtering and search\n• Real-time dashboard statistics\n• Customer order lookup\n\nWhat warehouse operations can I assist with?`;
      default:
        return isArabic
          ? `${arabicGreeting}\n\n⚙️ يمكنني المساعدة في:\n• إدارة النظام\n• تقارير التحليلات\n• تنسيق الفريق\n• الرؤى الاستراتيجية\n\nبماذا تحتاج المساعدة؟`
          : `${greeting}\n\n⚙️ I can help with:\n• System management\n• Analytics reports\n• Team coordination\n• Strategic insights\n\nWhat do you need assistance with?`;
    }
  };

  // Simplified Customer Service focused actions only
  const getRoleSpecificActions = () => {
    const isArabic = language === 'ar';
    
    // Only Customer Service actions - simplified and focused
        return [
        { 
          label: isArabic ? 'البحث عن المنتجات' : 'Search Products', 
          action: 'search_products',
          icon: Search
        },
        { 
        label: isArabic ? 'إنشاء طلب جديد' : 'Create New Order', 
          action: 'create_order',
          icon: ShoppingCart
        },
        { 
        label: isArabic ? 'مساعدة العملاء' : 'Customer Help', 
        action: 'customer_help',
          icon: User
      },
      { 
        label: isArabic ? 'معلومات الشحن' : 'Shipping Info', 
        action: 'shipping_info',
          icon: Package
        }
      ];
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
          content: `🔍 No products found for "${query}"\n\nTry different keywords like:\n• Product categories (vitamins, supplements, omega)\n• Brand names (NQ, Noor)\n• Health benefits (immunity, energy, joints)\n• Ingredients (iron, calcium, vitamin D)`,
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
            answer = `✨ ${product.name}\n\n`;
            
            const regularPrice = product.regular_price;
            const activePrice = product.price;
            const isOnSale = regularPrice && regularPrice !== '' && parseFloat(regularPrice) > parseFloat(activePrice);

            if (isOnSale) {
              answer += `السعر الأصلي: ~~${regularPrice} ريال~~\n`;
              answer += `سعر العرض: ${activePrice} ريال\n\n`;
            } else {
              answer += `السعر: ${activePrice} ريال\n\n`;
            }
            
            if (product.short_description) {
              const cleanDesc = product.short_description.replace(/<[^>]*>/g, '').trim();
              if (cleanDesc) {
                answer += `📝 الوصف: ${cleanDesc}\n\n`;
              }
            }
            
            if (product.description) {
              const cleanDesc = product.description.replace(/<[^>]*>/g, '').trim();
              if (cleanDesc && cleanDesc.length > 0) {
                const truncatedDesc = cleanDesc.length > 300 ? cleanDesc.substring(0, 300) + '...' : cleanDesc;
                answer += `📖 التفاصيل: ${truncatedDesc}\n\n`;
              }
            }
            
            answer += `📦 رمز المنتج: ${product.sku || 'غير متوفر'}\n`;
            answer += `📊 المخزون: ${product.stock_status === 'instock' ? '✅ متوفر' : '❌ غير متوفر'}\n\n`;
            answer += `🔗 لمزيد من التفاصيل، انقر على "عرض التفاصيل" أدناه`;
          } else {
            answer = `✨ ${product.name}\n\n`;

            const regularPrice = product.regular_price;
            const activePrice = product.price;
            const isOnSale = regularPrice && regularPrice !== '' && parseFloat(regularPrice) > parseFloat(activePrice);

            if (isOnSale) {
              answer += `Original Price: ~~${regularPrice} SAR~~\n`;
              answer += `Offer Price: ${activePrice} SAR\n\n`;
            } else {
              answer += `Price: ${activePrice} SAR\n\n`;
            }
            
            if (product.short_description) {
              const cleanDesc = product.short_description.replace(/<[^>]*>/g, '').trim();
              if (cleanDesc) {
                answer += `📝 Description: ${cleanDesc}\n\n`;
              }
            }
            
            if (product.description) {
              const cleanDesc = product.description.replace(/<[^>]*>/g, '').trim();
              if (cleanDesc && cleanDesc.length > 0) {
                const truncatedDesc = cleanDesc.length > 300 ? cleanDesc.substring(0, 300) + '...' : cleanDesc;
                answer += `📖 Details: ${truncatedDesc}\n\n`;
              }
            }
            
            answer += `📦 SKU: ${product.sku || 'N/A'}\n`;
            answer += `📊 Stock: ${product.stock_status === 'instock' ? '✅ Available' : '❌ Out of Stock'}\n\n`;
            answer += `🔗 For more details, click "View Details" below`;
          }
          
          const directAnswerMessage: Message = {
            id: Date.now().toString(),
            content: cleanFormattingMarkers(answer),
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
            content: `🎯 Found ${results.length} products for "${query}":\n\nClick "View Details" to see complete product information:`,
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

  const handleWarehouseSearch = async (query: string) => {
    const isArabic = language === 'ar';
    const lowerQuery = query.toLowerCase().trim();
    
    setIsTyping(true);
    
    try {
      // Handle different types of warehouse searches
      if (lowerQuery.includes('pending') || lowerQuery.includes('معلق') || lowerQuery.includes('معلقة')) {
        // Get current month date range
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];
        
        // Filter pending orders from current month only
        const orders = await wooCommerceAPI.fetchOrders({
          per_page: 50,
          status: 'pending',
          after: firstDayStr + 'T00:00:00'
        });
        
        const message = isArabic 
          ? `📋 الطلبات المعلقة (${orders.length} طلب)\n\n${orders.slice(0, 10).map((order, index) => 
              `${index + 1}. طلب #${order.number}\n   العميل: ${order.billing.first_name} ${order.billing.last_name}\n   المبلغ: ${order.total} ريال\n   التاريخ: ${new Date(order.date_created).toLocaleDateString('ar-SA')}\n`
            ).join('\n')}`
          : `📋 Pending Orders (${orders.length} orders)\n\n${orders.slice(0, 10).map((order, index) => 
              `${index + 1}. Order #${order.number}\n   Customer: ${order.billing.first_name} ${order.billing.last_name}\n   Amount: ${order.total} SAR\n   Date: ${new Date(order.date_created).toLocaleDateString('en-US')}\n`
            ).join('\n')}`;
            
        const botResponse: Message = {
          id: Date.now().toString(),
          content: cleanFormattingMarkers(message),
          isUser: false,
          timestamp: new Date(),
          type: 'text'
        };
        setMessages(prev => [...prev, botResponse]);
        
      } else if (lowerQuery.includes('processing') || lowerQuery.includes('معالجة') || lowerQuery.includes('قيد المعالجة')) {
        // Get current month date range
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];
        
        // Filter processing orders from current month only
        const orders = await wooCommerceAPI.fetchOrders({
          per_page: 50,
          status: 'processing',
          after: firstDayStr + 'T00:00:00'
        });
        
        const message = isArabic 
          ? `⚙️ الطلبات قيد المعالجة (${orders.length} طلب)\n\n${orders.slice(0, 10).map((order, index) => 
              `${index + 1}. طلب #${order.number}\n   العميل: ${order.billing.first_name} ${order.billing.last_name}\n   المبلغ: ${order.total} ريال\n   التاريخ: ${new Date(order.date_created).toLocaleDateString('ar-SA')}\n`
            ).join('\n')}`
          : `⚙️ Processing Orders (${orders.length} orders)\n\n${orders.slice(0, 10).map((order, index) => 
              `${index + 1}. Order #${order.number}\n   Customer: ${order.billing.first_name} ${order.billing.last_name}\n   Amount: ${order.total} SAR\n   Date: ${new Date(order.date_created).toLocaleDateString('en-US')}\n`
            ).join('\n')}`;
            
        const botResponse: Message = {
          id: Date.now().toString(),
          content: message,
          isUser: false,
          timestamp: new Date(),
          type: 'text'
        };
        setMessages(prev => [...prev, botResponse]);
        
      } else if (lowerQuery.includes('shipped') || lowerQuery.includes('مشحون') || lowerQuery.includes('مشحونة')) {
        // Get current month date range
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];
        
        // Filter shipped orders from current month only
        const orders = await wooCommerceAPI.fetchOrders({
          per_page: 50,
          status: 'shipped',
          after: firstDayStr + 'T00:00:00'
        });
        
        const message = isArabic 
          ? `🚚 **الطلبات المشحونة** (${orders.length} طلب)\n\n${orders.slice(0, 10).map((order, index) => 
              `${index + 1}. طلب #${order.number}\n   العميل: ${order.billing.first_name} ${order.billing.last_name}\n   المبلغ: ${order.total} ريال\n   التاريخ: ${new Date(order.date_created).toLocaleDateString('ar-SA')}\n`
            ).join('\n')}`
          : `🚚 **Shipped Orders** (${orders.length} orders)\n\n${orders.slice(0, 10).map((order, index) => 
              `${index + 1}. Order #${order.number}\n   Customer: ${order.billing.first_name} ${order.billing.last_name}\n   Amount: ${order.total} SAR\n   Date: ${new Date(order.date_created).toLocaleDateString('en-US')}\n`
            ).join('\n')}`;
            
        const botResponse: Message = {
          id: Date.now().toString(),
          content: message,
          isUser: false,
          timestamp: new Date(),
          type: 'text'
        };
        setMessages(prev => [...prev, botResponse]);
        
      } else if (lowerQuery.includes('today') || lowerQuery.includes('اليوم')) {
        // Filter today's orders
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        const orders = await wooCommerceAPI.fetchOrders({
          per_page: 100,
          status: 'any',
          after: todayStr + 'T00:00:00'
        });
        
        const message = isArabic 
          ? `📅 **طلبات اليوم** (${orders.length} طلب)\n\n${orders.slice(0, 10).map((order, index) => 
              `${index + 1}. طلب #${order.number}\n   العميل: ${order.billing.first_name} ${order.billing.last_name}\n   الحالة: ${order.status}\n   المبلغ: ${order.total} ريال\n`
            ).join('\n')}`
          : `📅 **Today's Orders** (${orders.length} orders)\n\n${orders.slice(0, 10).map((order, index) => 
              `${index + 1}. Order #${order.number}\n   Customer: ${order.billing.first_name} ${order.billing.last_name}\n   Status: ${order.status}\n   Amount: ${order.total} SAR\n`
            ).join('\n')}`;
            
        const botResponse: Message = {
          id: Date.now().toString(),
          content: message,
          isUser: false,
          timestamp: new Date(),
          type: 'text'
        };
        setMessages(prev => [...prev, botResponse]);
        
      } else if (lowerQuery.includes('last') || lowerQuery.includes('آخر')) {
        // Get current month date range
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];
        
        // Show last orders from current month only
        const orders = await wooCommerceAPI.fetchOrders({
          per_page: 10,
          status: 'any',
          after: firstDayStr + 'T00:00:00'
        });
        
        const message = isArabic 
          ? `🕐 **آخر 10 طلبات**\n\n${orders.map((order, index) => 
              `${index + 1}. طلب #${order.number}\n   العميل: ${order.billing.first_name} ${order.billing.last_name}\n   الحالة: ${order.status}\n   المبلغ: ${order.total} ريال\n   التاريخ: ${new Date(order.date_created).toLocaleDateString('ar-SA')}\n`
            ).join('\n')}`
          : `🕐 **Last 10 Orders**\n\n${orders.map((order, index) => 
              `${index + 1}. Order #${order.number}\n   Customer: ${order.billing.first_name} ${order.billing.last_name}\n   Status: ${order.status}\n   Amount: ${order.total} SAR\n   Date: ${new Date(order.date_created).toLocaleDateString('en-US')}\n`
            ).join('\n')}`;
            
        const botResponse: Message = {
          id: Date.now().toString(),
          content: message,
          isUser: false,
          timestamp: new Date(),
          type: 'text'
        };
        setMessages(prev => [...prev, botResponse]);
        
      } else if (/^\d+$/.test(lowerQuery)) {
        // Get current month date range
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];
        
        // Search by order number from current month only
        const orders = await wooCommerceAPI.fetchOrders({
          per_page: 100,
          status: 'any',
          after: firstDayStr + 'T00:00:00'
        });
        
        const foundOrder = orders.find(order => 
          order.number.toString() === lowerQuery || order.id.toString() === lowerQuery
        );
        
        if (foundOrder) {
          const orderDate = new Date(foundOrder.date_created);
          const daysOld = Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
          
          const message = isArabic 
            ? `🔍 **تم العثور على الطلب #${foundOrder.number}**\n\n👤 **العميل:** ${foundOrder.billing.first_name} ${foundOrder.billing.last_name}\n📞 **الهاتف:** ${foundOrder.billing.phone}\n📧 **البريد:** ${foundOrder.billing.email}\n💰 **المبلغ:** ${foundOrder.total} ريال\n📊 **الحالة:** ${foundOrder.status}\n📅 **التاريخ:** ${orderDate.toLocaleDateString('ar-SA')} (منذ ${daysOld} يوم)\n📍 **العنوان:** ${foundOrder.shipping.address_1}, ${foundOrder.shipping.city}\n\n📦 **المنتجات:**\n${foundOrder.line_items.map((item, index) => `${index + 1}. ${item.name} × ${item.quantity}`).join('\n')}`
            : `🔍 **Found Order #${foundOrder.number}**\n\n👤 **Customer:** ${foundOrder.billing.first_name} ${foundOrder.billing.last_name}\n📞 **Phone:** ${foundOrder.billing.phone}\n📧 **Email:** ${foundOrder.billing.email}\n💰 **Amount:** ${foundOrder.total} SAR\n📊 **Status:** ${foundOrder.status}\n📅 **Date:** ${orderDate.toLocaleDateString('en-US')} (${daysOld} days ago)\n📍 **Address:** ${foundOrder.shipping.address_1}, ${foundOrder.shipping.city}\n\n📦 **Products:**\n${foundOrder.line_items.map((item, index) => `${index + 1}. ${item.name} × ${item.quantity}`).join('\n')}`;
            
          const botResponse: Message = {
            id: Date.now().toString(),
            content: message,
            isUser: false,
            timestamp: new Date(),
            type: 'text'
          };
          setMessages(prev => [...prev, botResponse]);
        } else {
          const message = isArabic 
            ? `❌ لم يتم العثور على الطلب رقم ${lowerQuery}`
            : `❌ Order #${lowerQuery} not found`;
            
          const botResponse: Message = {
            id: Date.now().toString(),
            content: message,
            isUser: false,
            timestamp: new Date(),
            type: 'text'
          };
          setMessages(prev => [...prev, botResponse]);
        }
        
      } else if (lowerQuery.includes('@') || /\d{10,}/.test(lowerQuery)) {
        // Get current month date range
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];
        
        // Search by email or phone from current month only
        const orders = await wooCommerceAPI.fetchOrders({
          per_page: 100,
          status: 'any',
          after: firstDayStr + 'T00:00:00'
        });
        
        const foundOrders = orders.filter(order => 
          order.billing.email?.toLowerCase().includes(lowerQuery) ||
          order.billing.phone?.includes(lowerQuery)
        );
        
        if (foundOrders.length > 0) {
          const message = isArabic 
            ? `🔍 **تم العثور على ${foundOrders.length} طلب**\n\n${foundOrders.slice(0, 5).map((order, index) => 
                `${index + 1}. طلب #${order.number}\n   العميل: ${order.billing.first_name} ${order.billing.last_name}\n   الحالة: ${order.status}\n   المبلغ: ${order.total} ريال\n   التاريخ: ${new Date(order.date_created).toLocaleDateString('ar-SA')}\n`
              ).join('\n')}`
            : `🔍 **Found ${foundOrders.length} Orders**\n\n${foundOrders.slice(0, 5).map((order, index) => 
                `${index + 1}. Order #${order.number}\n   Customer: ${order.billing.first_name} ${order.billing.last_name}\n   Status: ${order.status}\n   Amount: ${order.total} SAR\n   Date: ${new Date(order.date_created).toLocaleDateString('en-US')}\n`
              ).join('\n')}`;
              
          const botResponse: Message = {
            id: Date.now().toString(),
            content: message,
            isUser: false,
            timestamp: new Date(),
            type: 'text'
          };
          setMessages(prev => [...prev, botResponse]);
        } else {
          const message = isArabic 
            ? `❌ لم يتم العثور على طلبات لـ "${query}"`
            : `❌ No orders found for "${query}"`;
            
          const botResponse: Message = {
            id: Date.now().toString(),
            content: message,
            isUser: false,
            timestamp: new Date(),
            type: 'text'
          };
          setMessages(prev => [...prev, botResponse]);
        }
        
      } else {
        // Get current month date range
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];
        
        // Search by customer name from current month only
        const orders = await wooCommerceAPI.fetchOrders({
          per_page: 100,
          status: 'any',
          after: firstDayStr + 'T00:00:00'
        });
        
        const foundOrders = orders.filter(order => {
          const fullName = `${order.billing.first_name} ${order.billing.last_name}`.toLowerCase();
          return fullName.includes(lowerQuery) || 
                 order.billing.first_name.toLowerCase().includes(lowerQuery) ||
                 order.billing.last_name.toLowerCase().includes(lowerQuery);
        });
        
        if (foundOrders.length > 0) {
          const message = isArabic 
            ? `🔍 **تم العثور على ${foundOrders.length} طلب للعميل "${query}"**\n\n${foundOrders.slice(0, 5).map((order, index) => 
                `${index + 1}. طلب #${order.number}\n   العميل: ${order.billing.first_name} ${order.billing.last_name}\n   الحالة: ${order.status}\n   المبلغ: ${order.total} ريال\n   التاريخ: ${new Date(order.date_created).toLocaleDateString('ar-SA')}\n`
              ).join('\n')}`
            : `🔍 **Found ${foundOrders.length} Orders for "${query}"**\n\n${foundOrders.slice(0, 5).map((order, index) => 
                `${index + 1}. Order #${order.number}\n   Customer: ${order.billing.first_name} ${order.billing.last_name}\n   Status: ${order.status}\n   Amount: ${order.total} SAR\n   Date: ${new Date(order.date_created).toLocaleDateString('en-US')}\n`
              ).join('\n')}`;
              
          const botResponse: Message = {
            id: Date.now().toString(),
            content: message,
            isUser: false,
            timestamp: new Date(),
            type: 'text'
          };
          setMessages(prev => [...prev, botResponse]);
        } else {
          const message = isArabic 
            ? `❌ لم يتم العثور على طلبات للعميل "${query}"`
            : `❌ No orders found for customer "${query}"`;
            
          const botResponse: Message = {
            id: Date.now().toString(),
            content: message,
            isUser: false,
            timestamp: new Date(),
            type: 'text'
          };
          setMessages(prev => [...prev, botResponse]);
        }
      }
      
    } catch (error) {
      console.error('Error in warehouse search:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: isArabic 
          ? '❌ عذراً، حدث خطأ في البحث. يرجى المحاولة مرة أخرى.'
          : '❌ Sorry, there was an error with the search. Please try again.',
        isUser: false,
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      setTimeout(() => playBotSound(), 100);
    }
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
    const isArabic = language === 'ar';
    const userMessage: Message = {
      id: Date.now().toString(),
      content: `${isArabic ? 'طلب:' : 'Requested:'} ${actionLabel}`,
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
            content: `<div dir="rtl" style="text-align: right;">
🔥 دليل التعامل مع العميل الغاضب في خدمة العملاء عبر الشات<br/>
(مُعدّل خصيصًا للدردشة المكتوبة)<br/><br/>
🌟 التهدئة الفورية (التعاطف أولًا)<br/>
الرد الأول:<br/>
"أهلًا [اسم العميل]، أتفهم انزعاجك تمامًا، وأعتذر عن هذا الإزعاج. سأعمل معك الآن لحل الأمر بسرعة."<br/>
استخدم اسم العميل: مرة في البداية + مرة عند الحل + مرة في الختام (بدون تكلف).<br/>
تجنب: الإطالة. ركّز على جمل قصيرة ومباشرة.<br/><br/>
⚡ التصعيد الذكي (عند استمرار الغضب)<br/>
المعيار: إذا تجاوزت المحادثة ٣ رسائل غاضبة أو ٣ دقائق دون تهدئة:<br/>
"حتى تحصل على أفضل حل، سأنقلك الآن لمديري [اسم المشرف]. هل تسمح لي بذلك؟"<br/>
مهم: لا تنتظر حتى يطلبه العميل. قدم التصعيد استباقيًا.<br/>
❌ لا تقل أبدًا: "هذا ليس ضمن صلاحياتي" أو "القوانين تمنع مساعدتك".<br/><br/>
💡 عرض الحلول (خُطط مُسبقة)<br/>
قدّم خيارين واضحين:<br/>
"لحل الأمر، هل تفضل:<br/>
1️⃣ استبدال المنتج فورًا (نُجهزه خلال ٢٤ ساعة).<br/>
2️⃣ إرجاع المبلغ كرصيد في حسابك + إرسال هدية تعويضية؟"<br/>
استخدم أزرار اختيار (إن أمكن) لتسريع الرد.<br/><br/>
📦 سياسة الاسترجاع (وفق SFDA - مُلخّصة)<br/>
<b>الحالة</b> - <b>الإجراء المناسب (في الشات)</b><br/>
منتج غير مفتوح: "نسترجعه خلال ١٤ يومًا + نُرسل لك رابط الشحن."<br/>
منتج مفتوح + عيب: "استبداله فورًا خلال ٤٨ ساعة."<br/>
منتج مفتوح بدون عيب: "للأسف لا يُمكن استرجاعه (حسب SFDA)، لكنني أقدم لك خصم ٢٠٪ على طلبك القادم."<br/><br/>
⚠️ حالات الطوارئ (تصعيد فوري!)<br/>
آثار صحية: "لصحتك، ننصحك بالتوجه للطوارئ فورًا. سنُبلغ SFDA خلال ساعة وسنتواصل معك للتغطية."<br/>
تهديد بالنشر (سوشيال ميديا): "سأحل الأمر خلال ١٠ دقائق! نسترد المبلغ كاملًا + نرسل لك قسيمة ٣٠٪."<br/><br/>
🧠 تقنيات مُعدّلة للشات<br/>
الصمت الإيجابي: انتظر ٦٠ ثانية قبل الرد (لا تظهر كـ"يكتب...").<br/>
أرسل: "أتحقق من ملفك الآن، لحظة من فضلك 🙏".<br/>
كسر النمط: غيّر نمط الكتابة:<br/>
البداية: جادّ → "أتفهم غضبك [اسم العميل]."<br/>
الحل: ودود → "تمّ حل الأمر! 🎉 رصيدك سيصلك خلال ساعتين."<br/><br/>
🚫 أخطاء قاتلة في الشات (تجنّبها!)<br/>
❌ إلقاء اللوم: "لو اتبعت التعليمات لما حدث هذا!"<br/>
❌ وعود غير قابلة للتنفيذ: "سنرسل المنتج غدًا" (بدون تأكيد النظام).<br/>
❌ إهمال الإشارات العاطفية: تجاهل كلمات مثل "غاضب"، "مستفز"، "سأنشر التجربة".<br/><br/>
📌 نصائح ذهبية للشات<br/>
السرعة: متوسط الرد لا يتجاوز دقيقتين.<br/>
التوثيق: اكتب ملخصًا فوريًا بعد المحادثة (مثل: "تم الاستبدال بعد غضب العميل").<br/>
الإيموجيز: استخدمها بذكاء (مثل: 🙏 للتقدير، ⏳ للانتظار).<br/>
النهايات الإيجابية: "شكرًا لصبرك [اسم العميل]! هل هناك شيء آخر أُساعدك فيه؟"<br/><br/>
بالتطبيق العملي، ستُخفّف ٩٠٪ من حدة الغضب عبر الشات. التركيز على الحلول المرئية (خيارات واضحة - روابط مباشرة) هو المفتاح! 🔑
</div>`,
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
            setIsInProductSearchMode(true);
            botResponse = {
              id: Date.now().toString(),
            content: `🔍 **Product Search**\n\nType any product name or keyword to search our complete WooCommerce database:\n\n📝 **Examples:**\n• "فيتامين د" (Arabic)\n• "vitamin D" (English)\n• "omega 3"\n• "iron supplement"\n\nI'll show you detailed product information including prices, availability, and descriptions!`,
              isUser: false,
              timestamp: new Date(),
              type: 'product_search'
            };
          break;

        case 'customer_help':
            botResponse = {
            id: (Date.now() + 1).toString(),
            content: '🤝 **Customer Service Guidelines**\n\n📋 **Essential Steps:**\n\n1️⃣ **Listen Actively**\n• Let the customer explain fully\n• Avoid interrupting\n• Take notes if needed\n\n2️⃣ **Acknowledge & Empathize**\n• "I understand your concern"\n• "Thank you for bringing this to our attention"\n• "I can see why this would be frustrating"\n\n3️⃣ **Offer Solutions**\n• Provide 2-3 options when possible\n• Explain each solution clearly\n• Let customer choose preferred option\n\n4️⃣ **Follow Up**\n• Confirm resolution\n• Provide timeline if needed\n• Document the interaction\n\n💡 **Quick tip:** Always stay calm and professional, even with difficult customers!',
              isUser: false,
              timestamp: new Date(),
              type: 'text'
            };
          break;

        case 'shipping_info':
          botResponse = {
            id: (Date.now() + 1).toString(),
            content: '📦 **معلومات الشحن الكاملة | Complete Shipping Information**\n\n🇸🇦 **العربية:**\n⏰ **مدة التوصيل:** 1-3 أيام عمل\n💰 **الشحن المجاني:** للطلبات أكثر من 200 ريال\n📍 **التغطية:** جميع مناطق المملكة العربية السعودية\n🚚 **شركات الشحن:** SMSA، أرامكس، DHL\n📱 **التتبع:** رقم تتبع فوري بعد الشحن\n\n🇬🇧 **English:**\n⏰ **Delivery Time:** 1-3 business days\n💰 **Free Shipping:** Orders over 200 SAR\n📍 **Coverage:** All regions in Saudi Arabia\n🚚 **Carriers:** SMSA, Aramex, DHL\n📱 **Tracking:** Instant tracking number after shipment\n\n📞 **Customer Questions? Use these responses:**\n• "الشحن خلال 1-3 أيام عمل"\n• "مجاني للطلبات أكثر من 200 ريال"\n• "نرسل رقم التتبع فور الشحن"',
            isUser: false,
            timestamp: new Date(),
            type: 'text'
          };
          break;

        case 'create_campaign':
          if (user?.position === 'Media Buyer') {
            botResponse = {
              id: (Date.now() + 1).toString(),
              content: '🎯 Campaign Creation\n\nI can help you create a compelling campaign!\n\nType the name of the product you want to create a campaign for, and I will suggest the best campaign strategy for it.',
              isUser: false,
              timestamp: new Date(),
              type: 'text'
            };
            setAwaitingCampaignProductName(true);
          } else {
            botResponse = {
              id: Date.now().toString(),
              content: '❌ Campaign creation is only available for Media Buyer users.',
              isUser: false,
              timestamp: new Date(),
              type: 'text'
            };
          }
          break;

        case 'loyal_customers':
          botResponse = {
            id: (Date.now() + 1).toString(),
            content: '👥 Opening Loyal Customers page...',
            isUser: false,
            timestamp: new Date(),
            type: 'action'
          };
          setTimeout(() => {
            navigate('/loyal-customers');
            setIsOpen(false);
          }, 1500);
          break;

        case 'go_to_crm':
          botResponse = {
            id: (Date.now() + 1).toString(),
            content: '🔗 Opening Morasalaty CRM in a new tab...',
            isUser: false,
            timestamp: new Date(),
            type: 'action'
          };
          setTimeout(() => {
            window.open('https://crm.morasalaty.net/', '_blank');
          }, 1500);
          break;

        case 'budget_optimization':
          if (user?.position === 'Media Buyer') {
            setBudgetOptimizationActive(true);
            setBudgetOptimizationStep(1);
            const isArabic = language === 'ar';
            botResponse = {
              id: (Date.now() + 1).toString(),
              content: isArabic 
                ? '💰 **مرحباً بك في خدمة تحسين الميزانية الاحترافية**\n\nأنا مساعد ذكي ومحترف متخصص في تحسين ميزانيات التسويق الرقمي.\n\nسأطرح عليك مجموعة من الأسئلة لفهم وضعك الحالي وتقديم استراتيجية تحسين شخصية.\n\n**السؤال الأول:**\nكم عدد الحملات الإعلانية التي قمت بتشغيلها سابقاً؟\n\n(مثال: 5 حملات، 10 حملات، أو هذه أول حملة لي)'
                : '💰 **Welcome to Professional Budget Optimization**\n\nI am a smart and professional AI assistant that specializes in digital marketing budget optimization.\n\nI will ask you a series of questions to understand your current situation and provide a personalized optimization strategy.\n\n**Question 1:**\nHow many ad campaigns have you run previously?\n\n(Example: 5 campaigns, 10 campaigns, or this is my first campaign)',
              isUser: false,
              timestamp: new Date(),
              type: 'text'
            };
          } else {
            const isArabic = language === 'ar';
            botResponse = {
              id: Date.now().toString(),
              content: isArabic ? '❌ تحسين الميزانية متاح فقط لمشتري الإعلانات.' : '❌ Budget optimization is only available for Media Buyer users.',
              isUser: false,
              timestamp: new Date(),
              type: 'text'
            };
          }
          break;

        case 'audience_targeting':
          if (user?.position === 'Media Buyer') {
            const isArabic = language === 'ar';
            botResponse = {
              id: (Date.now() + 1).toString(),
              content: isArabic 
                ? '👥 **استراتيجية استهداف الجمهور المتقدمة**\n\n🎯 **أنواع الجمهور المستهدف:**\n\n**1. التركيبة السكانية:**\n• العمر: 25-55 (البالغون المهتمون بالصحة)\n• الجنس: الكل (قابل للتعديل حسب المنتج)\n• الدخل: متوسط إلى عالي\n\n**2. الاهتمامات:**\n• الصحة والعافية\n• اللياقة والتغذية\n• المكملات الطبيعية\n• نمط الحياة الصحي\n\n**3. السلوكيات:**\n• المتسوقون عبر الإنترنت\n• مشترو المكملات الصحية\n• عشاق اللياقة البدنية\n• الباحثون عن الصحة\n\n**4. الجماهير المخصصة:**\n• زوار الموقع\n• العملاء السابقون\n• مشتركو البريد الإلكتروني\n• الجماهير الشبيهة\n\n🇸🇦 **خاص بالسعودية:**\n• تفضيل اللغة العربية\n• اتجاهات الصحة المحلية\n• الاعتبارات الثقافية\n• الاستهداف الإقليمي\n\n💡 **نصائح متقدمة:**\n• استخدم الاستهداف التفصيلي\n• اختبر شرائح مختلفة\n• راقب معدلات التفاعل\n• حسّن حسب الأداء\n\nهل تحتاج مساعدة في إنشاء جمهور محدد لحملتك؟'
                : '👥 **Advanced Audience Targeting Strategy**\n\n🎯 **Target Audience Types:**\n\n**1. Demographics:**\n• Age: 25-55 (health-conscious adults)\n• Gender: All (adjust by product)\n• Income: Middle to high income\n\n**2. Interests:**\n• Health & wellness\n• Fitness & nutrition\n• Natural supplements\n• Healthy lifestyle\n\n**3. Behaviors:**\n• Online shoppers\n• Health supplement buyers\n• Fitness enthusiasts\n• Wellness seekers\n\n**4. Custom Audiences:**\n• Website visitors\n• Previous customers\n• Email subscribers\n• Lookalike audiences\n\n🇸🇦 **Saudi Arabia Specific:**\n• Arabic language preference\n• Local health trends\n• Cultural considerations\n• Regional targeting\n\n💡 **Advanced Tips:**\n• Use detailed targeting\n• Test different segments\n• Monitor engagement rates\n• Optimize based on performance\n\nNeed help creating a specific audience for your campaign?',
              isUser: false,
              timestamp: new Date(),
              type: 'text'
            };
          } else {
            botResponse = {
              id: Date.now().toString(),
              content: '❌ Audience targeting is only available for Media Buyer users.',
              isUser: false,
              timestamp: new Date(),
              type: 'text'
            };
          }
          break;

        case 'performance_metrics':
          if (user?.position === 'Media Buyer') {
            botResponse = {
              id: (Date.now() + 1).toString(),
              content: '📊 Opening Strategy page for detailed performance metrics and analysis...',
              isUser: false,
              timestamp: new Date(),
              type: 'action'
            };
            setTimeout(() => {
              navigate('/strategy');
              setIsOpen(false);
            }, 1500);
          } else {
            botResponse = {
              id: Date.now().toString(),
              content: '❌ Performance metrics is only available for Media Buyer users.',
              isUser: false,
              timestamp: new Date(),
              type: 'text'
            };
          }
          break;

        // Warehouse Staff Actions
        case 'warehouse_stats':
          if (user?.position === 'Warehouse Staff') {
            const isArabic = language === 'ar';
            botResponse = {
              id: (Date.now() + 1).toString(),
              content: isArabic 
                ? '📊 **إحصائيات المستودع الحية**\n\n🔄 جاري تحليل البيانات...\n\nسأعرض لك ملخصاً شاملاً عن:\n• إجمالي الطلبات اليوم\n• معدل الإنجاز\n• الطلبات المتأخرة\n• أداء طرق الشحن\n• متوسط قيمة الطلب\n\nيرجى الانتظار...'
                : '📊 **Live Warehouse Statistics**\n\n🔄 Analyzing data...\n\nI\'ll show you a comprehensive overview of:\n• Total orders today\n• Completion rate\n• Late orders\n• Shipping methods performance\n• Average order value\n\nPlease wait...',
              isUser: false,
              timestamp: new Date(),
              type: 'text'
            };
            
            // Fetch real warehouse statistics
            setTimeout(async () => {
              try {
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];
                
                // Get current month date range
                const currentMonth = today.getMonth();
                const currentYear = today.getFullYear();
                const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
                const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];
                
                // Fetch orders from today
                const todayOrders = await wooCommerceAPI.fetchOrders({
                  per_page: 100,
                  status: 'any',
                  after: todayStr + 'T00:00:00'
                });
                
                // Fetch orders from current month only
                const recentOrders = await wooCommerceAPI.fetchOrders({
                  per_page: 100,
                  status: 'any',
                  after: firstDayStr + 'T00:00:00'
                });
                
                // Calculate statistics
                const totalToday = todayOrders.length;
                const completedToday = todayOrders.filter(order => 
                  order.status === 'completed' || order.status === 'delivered'
                ).length;
                const completionRate = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;
                
                // Calculate late orders (older than 3 days and not completed)
                const threeDaysAgo = new Date();
                threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
                const lateOrders = recentOrders.filter(order => {
                  const orderDate = new Date(order.date_created);
                  return orderDate < threeDaysAgo && 
                         !['completed', 'delivered', 'cancelled', 'refunded'].includes(order.status);
                }).length;
                
                // Calculate total revenue today
                const todayRevenue = todayOrders.reduce((sum, order) => sum + parseFloat(order.total || '0'), 0);
                const avgOrderValue = totalToday > 0 ? todayRevenue / totalToday : 0;
                
                // Analyze shipping methods
                const shippingMethods: { [key: string]: number } = {};
                recentOrders.forEach(order => {
                  const method = order.shipping_lines?.[0]?.method_title || 'Standard';
                  shippingMethods[method] = (shippingMethods[method] || 0) + 1;
                });
                
                const statsMessage = isArabic ? `
📊 **إحصائيات المستودع المحدثة**

📈 **أداء اليوم:**
• إجمالي الطلبات: ${totalToday}
• الطلبات المكتملة: ${completedToday}
• معدل الإنجاز: ${completionRate}%
• إجمالي الإيرادات: ${todayRevenue.toFixed(2)} ريال
• متوسط قيمة الطلب: ${avgOrderValue.toFixed(2)} ريال

⚠️ **الطلبات المتأخرة:** ${lateOrders} طلب

📦 **أداء طرق الشحن:**
${Object.entries(shippingMethods).map(([method, count]) => 
  `• ${method}: ${count} طلب`
).join('\n')}

🎯 **التوصيات:**
${completionRate < 80 ? '• تحسين معدل الإنجاز مطلوب\n' : ''}
${lateOrders > 5 ? '• مراجعة الطلبات المتأخرة ضرورية\n' : ''}
• متابعة الأداء بانتظام
                ` : `
📊 **Updated Warehouse Statistics**

📈 **Today's Performance:**
• Total Orders: ${totalToday}
• Completed Orders: ${completedToday}
• Completion Rate: ${completionRate}%
• Total Revenue: ${todayRevenue.toFixed(2)} SAR
• Average Order Value: ${avgOrderValue.toFixed(2)} SAR

⚠️ **Late Orders:** ${lateOrders} orders

📦 **Shipping Methods Performance:**
${Object.entries(shippingMethods).map(([method, count]) => 
  `• ${method}: ${count} orders`
).join('\n')}

🎯 **Recommendations:**
${completionRate < 80 ? '• Completion rate improvement needed\n' : ''}
${lateOrders > 5 ? '• Review late orders urgently\n' : ''}
• Continue monitoring performance regularly
                `;
                
                const statsResponse: Message = {
                  id: Date.now().toString(),
                  content: cleanFormattingMarkers(statsMessage.trim()),
                  isUser: false,
                  timestamp: new Date(),
                  type: 'text'
                };
                setMessages(prev => [...prev, statsResponse]);
                setTimeout(() => playBotSound(), 100);
                
              } catch (error) {
                console.error('Error fetching warehouse stats:', error);
                const errorMessage: Message = {
                  id: Date.now().toString(),
                  content: isArabic 
                    ? '❌ عذراً، حدث خطأ في جلب الإحصائيات. يرجى المحاولة مرة أخرى.'
                    : '❌ Sorry, there was an error fetching statistics. Please try again.',
                  isUser: false,
                  timestamp: new Date(),
                  type: 'text'
                };
                setMessages(prev => [...prev, errorMessage]);
                setTimeout(() => playBotSound(), 100);
              }
            }, 2000);
          } else {
            botResponse = {
              id: Date.now().toString(),
              content: '❌ Warehouse statistics is only available for Warehouse Staff users.',
              isUser: false,
              timestamp: new Date(),
              type: 'text'
            };
          }
          break;

        case 'late_orders':
          if (user?.position === 'Warehouse Staff') {
            const isArabic = language === 'ar';
            botResponse = {
              id: (Date.now() + 1).toString(),
              content: isArabic 
                ? '⚠️ **تحليل الطلبات المتأخرة**\n\n🔍 جاري البحث عن الطلبات المتأخرة...\n\nسأعرض لك:\n• الطلبات المتأخرة أكثر من 3 أيام\n• أسباب التأخير المحتملة\n• اقتراحات للحلول\n• قائمة بالعملاء المتأثرين\n\nيرجى الانتظار...'
                : '⚠️ **Late Orders Analysis**\n\n🔍 Searching for overdue orders...\n\nI\'ll show you:\n• Orders delayed more than 3 days\n• Potential delay causes\n• Solution suggestions\n• List of affected customers\n\nPlease wait...',
              isUser: false,
              timestamp: new Date(),
              type: 'text'
            };
            
            // Fetch and analyze late orders
            setTimeout(async () => {
              try {
                // Get current month date range
                const today = new Date();
                const currentMonth = today.getMonth();
                const currentYear = today.getFullYear();
                const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
                const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];
                
                // Fetch orders from current month only
                const orders = await wooCommerceAPI.fetchOrders({
                  per_page: 100,
                  status: 'any',
                  after: firstDayStr + 'T00:00:00'
                });
                
                // Calculate late orders (older than 3 days and not completed)
                const threeDaysAgo = new Date();
                threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
                
                const lateOrders = orders.filter(order => {
                  const orderDate = new Date(order.date_created);
                  return orderDate < threeDaysAgo && 
                         !['completed', 'delivered', 'cancelled', 'refunded'].includes(order.status);
                });
                
                if (lateOrders.length === 0) {
                  const noLateOrdersMessage: Message = {
                    id: Date.now().toString(),
                    content: isArabic 
                      ? '✅ **أخبار ممتازة!**\n\nلا توجد طلبات متأخرة حالياً. جميع الطلبات تتم معالجتها في الوقت المحدد.\n\n🎯 استمر في الأداء الممتاز!'
                      : '✅ **Excellent News!**\n\nNo late orders found! All orders are being processed on time.\n\n🎯 Keep up the excellent work!',
                    isUser: false,
                    timestamp: new Date(),
                    type: 'text'
                  };
                  setMessages(prev => [...prev, noLateOrdersMessage]);
                  setTimeout(() => playBotSound(), 100);
                  return;
                }
                
                // Analyze late orders by status and days late
                const statusAnalysis: { [key: string]: number } = {};
                const daysLateAnalysis: { [key: string]: number } = {};
                
                lateOrders.forEach(order => {
                  const orderDate = new Date(order.date_created);
                  const daysLate = Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
                  
                  statusAnalysis[order.status] = (statusAnalysis[order.status] || 0) + 1;
                  
                  if (daysLate <= 5) daysLateAnalysis['3-5 days'] = (daysLateAnalysis['3-5 days'] || 0) + 1;
                  else if (daysLate <= 7) daysLateAnalysis['5-7 days'] = (daysLateAnalysis['5-7 days'] || 0) + 1;
                  else if (daysLate <= 14) daysLateAnalysis['1-2 weeks'] = (daysLateAnalysis['1-2 weeks'] || 0) + 1;
                  else daysLateAnalysis['2+ weeks'] = (daysLateAnalysis['2+ weeks'] || 0) + 1;
                });
                
                // Get top 5 most urgent orders
                const urgentOrders = lateOrders
                  .sort((a, b) => new Date(a.date_created).getTime() - new Date(b.date_created).getTime())
                  .slice(0, 5);
                
                const lateOrdersMessage = isArabic ? `
⚠️ **تحليل الطلبات المتأخرة**

📊 **الملخص:**
• إجمالي الطلبات المتأخرة: ${lateOrders.length}
• أقدم طلب: ${Math.floor((Date.now() - new Date(lateOrders[0]?.date_created).getTime()) / (1000 * 60 * 60 * 24))} يوم

📈 **تحليل حسب الحالة:**
${Object.entries(statusAnalysis).map(([status, count]) => 
  `• ${status}: ${count} طلب`
).join('\n')}

⏰ **تحليل حسب مدة التأخير:**
${Object.entries(daysLateAnalysis).map(([range, count]) => 
  `• ${range}: ${count} طلب`
).join('\n')}

🚨 **أهم 5 طلبات تحتاج متابعة عاجلة:**
${urgentOrders.map((order, index) => {
  const daysLate = Math.floor((Date.now() - new Date(order.date_created).getTime()) / (1000 * 60 * 60 * 24));
  return `${index + 1}. طلب #${order.number} - ${order.billing.first_name} ${order.billing.last_name} - ${daysLate} يوم متأخر`;
}).join('\n')}

🎯 **التوصيات:**
• مراجعة الطلبات الأقدم من أسبوعين فوراً
• التواصل مع العملاء لتحديث حالة الطلبات
• تحديد أسباب التأخير ووضع خطة لتجنبها
• تحسين عملية التتبع والمتابعة
                ` : `
⚠️ **Late Orders Analysis**

📊 **Summary:**
• Total Late Orders: ${lateOrders.length}
• Oldest Order: ${Math.floor((Date.now() - new Date(lateOrders[0]?.date_created).getTime()) / (1000 * 60 * 60 * 24))} days old

📈 **Analysis by Status:**
${Object.entries(statusAnalysis).map(([status, count]) => 
  `• ${status}: ${count} orders`
).join('\n')}

⏰ **Analysis by Delay Duration:**
${Object.entries(daysLateAnalysis).map(([range, count]) => 
  `• ${range}: ${count} orders`
).join('\n')}

🚨 **Top 5 Orders Needing Urgent Attention:**
${urgentOrders.map((order, index) => {
  const daysLate = Math.floor((Date.now() - new Date(order.date_created).getTime()) / (1000 * 60 * 60 * 24));
  return `${index + 1}. Order #${order.number} - ${order.billing.first_name} ${order.billing.last_name} - ${daysLate} days late`;
}).join('\n')}

🎯 **Recommendations:**
• Review orders older than 2 weeks immediately
• Contact customers to update order status
• Identify delay causes and create prevention plan
• Improve tracking and follow-up processes
                `;
                
                const lateOrdersResponse: Message = {
                  id: Date.now().toString(),
                  content: cleanFormattingMarkers(lateOrdersMessage.trim()),
                  isUser: false,
                  timestamp: new Date(),
                  type: 'text'
                };
                setMessages(prev => [...prev, lateOrdersResponse]);
                setTimeout(() => playBotSound(), 100);
                
              } catch (error) {
                console.error('Error fetching late orders:', error);
                const errorMessage: Message = {
                  id: Date.now().toString(),
                  content: isArabic 
                    ? '❌ عذراً، حدث خطأ في تحليل الطلبات المتأخرة. يرجى المحاولة مرة أخرى.'
                    : '❌ Sorry, there was an error analyzing late orders. Please try again.',
                  isUser: false,
                  timestamp: new Date(),
                  type: 'text'
                };
                setMessages(prev => [...prev, errorMessage]);
                setTimeout(() => playBotSound(), 100);
              }
            }, 2000);
          } else {
            botResponse = {
              id: Date.now().toString(),
              content: '❌ Late orders analysis is only available for Warehouse Staff users.',
              isUser: false,
              timestamp: new Date(),
              type: 'text'
            };
          }
          break;

        case 'filter_orders':
          if (user?.position === 'Warehouse Staff') {
            const isArabic = language === 'ar';
            setIsInProductSearchMode(true); // Reuse this mode for order filtering
            botResponse = {
              id: (Date.now() + 1).toString(),
              content: isArabic 
                ? '🔍 **فلترة الطلبات الذكية**\n\nيمكنني مساعدتك في فلترة الطلبات. اكتب أي من هذه الأوامر:\n\n**حسب الحالة:**\n• "أظهر الطلبات المعلقة" - pending orders\n• "أظهر الطلبات قيد المعالجة" - processing orders\n• "أظهر الطلبات المشحونة" - shipped orders\n• "أظهر الطلبات المسلمة" - delivered orders\n\n**حسب التاريخ:**\n• "طلبات اليوم" - today\'s orders\n• "طلبات أمس" - yesterday\'s orders\n• "طلبات هذا الأسبوع" - this week\'s orders\n\n**حسب طريقة الشحن:**\n• "طلبات SMSA" - SMSA orders\n• "طلبات DRB" - DRB orders\n• "طلبات شحننا" - Our Ship orders\n\n**مثال:** اكتب "أظهر الطلبات المعلقة اليوم" أو "فلتر SMSA"\n\nما نوع الفلترة التي تريدها؟'
                : '🔍 **Smart Order Filtering**\n\nI can help you filter orders. Type any of these commands:\n\n**By Status:**\n• "Show pending orders" - pending orders\n• "Show processing orders" - processing orders\n• "Show shipped orders" - shipped orders\n• "Show delivered orders" - delivered orders\n\n**By Date:**\n• "Today\'s orders" - today\'s orders\n• "Yesterday\'s orders" - yesterday\'s orders\n• "This week\'s orders" - this week\'s orders\n\n**By Shipping Method:**\n• "SMSA orders" - SMSA orders\n• "DRB orders" - DRB orders\n• "Our Ship orders" - Our Ship orders\n\n**Example:** Type "Show pending orders today" or "Filter SMSA"\n\nWhat type of filtering would you like?',
              isUser: false,
              timestamp: new Date(),
              type: 'text'
            };
          } else {
            botResponse = {
              id: Date.now().toString(),
              content: '❌ Order filtering is only available for Warehouse Staff users.',
              isUser: false,
              timestamp: new Date(),
              type: 'text'
            };
          }
          break;

        case 'find_order':
          if (user?.position === 'Warehouse Staff') {
            const isArabic = language === 'ar';
            setIsInProductSearchMode(true); // Reuse this mode for order search
            botResponse = {
              id: (Date.now() + 1).toString(),
              content: isArabic 
                ? '🔍 **البحث السريع عن الطلبات**\n\nيمكنني البحث عن الطلبات. اكتب أي من هذه:\n\n**أمثلة للبحث:**\n• "33301" - البحث برقم الطلب\n• "أحمد محمد" - البحث باسم العميل\n• "0501234567" - البحث برقم الهاتف\n• "ahmed@email.com" - البحث بالبريد الإلكتروني\n\n**أوامر سريعة:**\n• "آخر 10 طلبات" - show last 10 orders\n• "طلبات اليوم" - today\'s orders\n• "طلبات معلقة" - pending orders\n\nاكتب ما تريد البحث عنه:'
                : '🔍 **Quick Order Search**\n\nI can search for orders. Type any of these:\n\n**Search Examples:**\n• "33301" - search by order number\n• "John Smith" - search by customer name\n• "0501234567" - search by phone number\n• "john@email.com" - search by email\n\n**Quick Commands:**\n• "Last 10 orders" - show recent orders\n• "Today\'s orders" - today\'s orders\n• "Pending orders" - pending orders\n\nType what you want to search for:',
              isUser: false,
              timestamp: new Date(),
              type: 'text'
            };
          } else {
            botResponse = {
              id: Date.now().toString(),
              content: '❌ Order search is only available for Warehouse Staff users.',
              isUser: false,
              timestamp: new Date(),
              type: 'text'
            };
          }
          break;

        case 'performance_analysis':
          if (user?.position === 'Warehouse Staff') {
            const isArabic = language === 'ar';
            botResponse = {
              id: (Date.now() + 1).toString(),
              content: isArabic 
                ? '📈 **تحليل أداء المستودع المتقدم**\n\n🔄 جاري تحليل الأداء...\n\nسأقدم لك تقريراً شاملاً يتضمن:\n\n• معدل إنجاز الطلبات اليومي\n• متوسط وقت المعالجة\n• أداء طرق الشحن المختلفة\n• اتجاهات الطلبات الأسبوعية\n• مقارنة الأداء الشهري\n• توصيات للتحسين\n\nيرجى الانتظار...'
                : '📈 **Advanced Warehouse Performance Analysis**\n\n🔄 Analyzing performance...\n\nI\'ll provide you with a comprehensive report including:\n\n• Daily order completion rate\n• Average processing time\n• Different shipping methods performance\n• Weekly order trends\n• Monthly performance comparison\n• Improvement recommendations\n\nPlease wait...',
              isUser: false,
              timestamp: new Date(),
              type: 'text'
            };
            
            // Fetch and analyze performance data
            setTimeout(async () => {
              try {
                const today = new Date();
                const yesterday = new Date();
                yesterday.setDate(today.getDate() - 1);
                const lastWeek = new Date();
                lastWeek.setDate(today.getDate() - 7);
                const lastMonth = new Date();
                lastMonth.setDate(today.getDate() - 30);
                
                // Fetch data for different time periods (limit per_page to 100 max)
                const [todayOrders, yesterdayOrders, weekOrders, monthOrders] = await Promise.all([
                  wooCommerceAPI.fetchOrders({
                    per_page: 100,
                    status: 'any',
                    after: today.toISOString().split('T')[0] + 'T00:00:00'
                  }),
                  wooCommerceAPI.fetchOrders({
                    per_page: 100,
                    status: 'any',
                    after: yesterday.toISOString().split('T')[0] + 'T00:00:00',
                    before: today.toISOString().split('T')[0] + 'T00:00:00'
                  }),
                  wooCommerceAPI.fetchOrders({
                    per_page: 100,
                    status: 'any',
                    after: lastWeek.toISOString().split('T')[0] + 'T00:00:00'
                  }),
                  wooCommerceAPI.fetchOrders({
                    per_page: 100,
                    status: 'any',
                    after: lastMonth.toISOString().split('T')[0] + 'T00:00:00'
                  })
                ]);
                
                // Calculate completion rates
                const todayCompleted = todayOrders.filter(order => 
                  ['completed', 'delivered'].includes(order.status)
                ).length;
                const todayCompletionRate = todayOrders.length > 0 ? 
                  Math.round((todayCompleted / todayOrders.length) * 100) : 0;
                
                const weekCompleted = weekOrders.filter(order => 
                  ['completed', 'delivered'].includes(order.status)
                ).length;
                const weekCompletionRate = weekOrders.length > 0 ? 
                  Math.round((weekCompleted / weekOrders.length) * 100) : 0;
                
                // Calculate average processing time
                const completedOrders = monthOrders.filter(order => 
                  ['completed', 'delivered'].includes(order.status) && order.date_completed
                );
                
                let avgProcessingTime = 0;
                if (completedOrders.length > 0) {
                  const totalProcessingTime = completedOrders.reduce((sum, order) => {
                    const created = new Date(order.date_created);
                    const completed = new Date(order.date_completed);
                    return sum + (completed.getTime() - created.getTime());
                  }, 0);
                  avgProcessingTime = Math.round(totalProcessingTime / (completedOrders.length * 1000 * 60 * 60 * 24));
                }
                
                // Analyze shipping methods performance
                const shippingAnalysis: { [key: string]: { count: number, avgDays: number } } = {};
                monthOrders.forEach(order => {
                  const method = order.shipping_lines?.[0]?.method_title || 'Standard';
                  if (!shippingAnalysis[method]) {
                    shippingAnalysis[method] = { count: 0, avgDays: 0 };
                  }
                  shippingAnalysis[method].count++;
                  
                  if (order.date_completed) {
                    const created = new Date(order.date_created);
                    const completed = new Date(order.date_completed);
                    const days = Math.round((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
                    shippingAnalysis[method].avgDays = 
                      (shippingAnalysis[method].avgDays + days) / 2;
                  }
                });
                
                // Calculate revenue trends
                const todayRevenue = todayOrders.reduce((sum, order) => 
                  sum + parseFloat(order.total || '0'), 0
                );
                const weekRevenue = weekOrders.reduce((sum, order) => 
                  sum + parseFloat(order.total || '0'), 0
                );
                const monthRevenue = monthOrders.reduce((sum, order) => 
                  sum + parseFloat(order.total || '0'), 0
                );
                
                // Generate performance insights
                const insights = [];
                if (todayCompletionRate < 70) insights.push(isArabic ? 'معدل الإنجاز اليومي منخفض' : 'Daily completion rate is low');
                if (avgProcessingTime > 5) insights.push(isArabic ? 'وقت المعالجة أطول من المتوقع' : 'Processing time longer than expected');
                if (todayOrders.length < yesterdayOrders.length) insights.push(isArabic ? 'انخفاض في عدد الطلبات اليوم' : 'Decrease in today\'s orders');
                
                const performanceMessage = isArabic ? `
📈 **تقرير أداء المستودع الشامل**

📊 **الأداء اليومي:**
• طلبات اليوم: ${todayOrders.length}
• الطلبات المكتملة: ${todayCompleted}
• معدل الإنجاز: ${todayCompletionRate}%
• إيرادات اليوم: ${todayRevenue.toFixed(2)} ريال

📅 **الأداء الأسبوعي:**
• إجمالي الطلبات: ${weekOrders.length}
• معدل الإنجاز: ${weekCompletionRate}%
• إجمالي الإيرادات: ${weekRevenue.toFixed(2)} ريال

⏱️ **متوسط وقت المعالجة:** ${avgProcessingTime} يوم

🚚 **أداء طرق الشحن:**
${Object.entries(shippingAnalysis).map(([method, data]) => 
  `• ${method}: ${data.count} طلب (متوسط ${data.avgDays.toFixed(1)} يوم)`
).join('\n')}

📈 **الاتجاهات:**
• الإيرادات الشهرية: ${monthRevenue.toFixed(2)} ريال
• متوسط قيمة الطلب: ${monthOrders.length > 0 ? (monthRevenue / monthOrders.length).toFixed(2) : '0'} ريال

${insights.length > 0 ? `⚠️ **نقاط تحتاج انتباه:**\n${insights.map(insight => `• ${insight}`).join('\n')}` : '✅ **الأداء جيد بشكل عام**'}

🎯 **التوصيات:**
• مراقبة معدل الإنجاز يومياً
• تحسين عمليات الشحن البطيئة
• متابعة اتجاهات الإيرادات
                ` : `
📈 **Comprehensive Warehouse Performance Report**

📊 **Daily Performance:**
• Today's Orders: ${todayOrders.length}
• Completed Orders: ${todayCompleted}
• Completion Rate: ${todayCompletionRate}%
• Today's Revenue: ${todayRevenue.toFixed(2)} SAR

📅 **Weekly Performance:**
• Total Orders: ${weekOrders.length}
• Completion Rate: ${weekCompletionRate}%
• Total Revenue: ${weekRevenue.toFixed(2)} SAR

⏱️ **Average Processing Time:** ${avgProcessingTime} days

🚚 **Shipping Methods Performance:**
${Object.entries(shippingAnalysis).map(([method, data]) => 
  `• ${method}: ${data.count} orders (avg ${data.avgDays.toFixed(1)} days)`
).join('\n')}

📈 **Trends:**
• Monthly Revenue: ${monthRevenue.toFixed(2)} SAR
• Average Order Value: ${monthOrders.length > 0 ? (monthRevenue / monthOrders.length).toFixed(2) : '0'} SAR

${insights.length > 0 ? `⚠️ **Areas Needing Attention:**\n${insights.map(insight => `• ${insight}`).join('\n')}` : '✅ **Overall Performance is Good**'}

🎯 **Recommendations:**
• Monitor completion rate daily
• Improve slow shipping processes
• Track revenue trends closely
                `;
                
                const performanceResponse: Message = {
                  id: Date.now().toString(),
                  content: performanceMessage.trim(),
                  isUser: false,
                  timestamp: new Date(),
                  type: 'text'
                };
                setMessages(prev => [...prev, performanceResponse]);
                setTimeout(() => playBotSound(), 100);
                
              } catch (error) {
                console.error('Error fetching performance data:', error);
                const errorMessage: Message = {
                  id: Date.now().toString(),
                  content: isArabic 
                    ? '❌ عذراً، حدث خطأ في تحليل الأداء. يرجى المحاولة مرة أخرى.'
                    : '❌ Sorry, there was an error analyzing performance. Please try again.',
                  isUser: false,
                  timestamp: new Date(),
                  type: 'text'
                };
                setMessages(prev => [...prev, errorMessage]);
                setTimeout(() => playBotSound(), 100);
              }
            }, 2000);
          } else {
            botResponse = {
              id: Date.now().toString(),
              content: '❌ Performance analysis is only available for Warehouse Staff users.',
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

  const generateBudgetOptimizationAnalysis = (data: any, isArabic: boolean): string => {
    const {
      previousCampaigns,
      totalBudget,
      targetAudience,
      adSchedule,
      platforms,
      objectives,
      metrics,
      roas,
      creatives
    } = data;

    if (isArabic) {
      return `🎯 **تحليل تحسين الميزانية الشامل**

📊 **تحليل البيانات المقدمة:**
• عدد الحملات السابقة: ${previousCampaigns}
• إجمالي الميزانية: ${totalBudget}
• الجمهور المستهدف: ${targetAudience}
• جدولة الإعلانات: ${adSchedule}
• المنصات المستخدمة: ${platforms}
• الأهداف: ${objectives}
• المقاييس: ${metrics}
• عائد الاستثمار: ${roas}
• الإعلانات: ${creatives}

💡 **التوصيات الاستراتيجية:**

**1. توزيع الميزانية المحسن:**
• 40% للحملات عالية الأداء
• 35% لاختبار جماهير جديدة
• 25% لاختبار الإعلانات الإبداعية

**2. أفضل أوقات الإعلان:**
• الأوقات الذهبية: 7-10 مساءً
• عطلات نهاية الأسبوع: 2-6 مساءً
• تجنب: 12-3 ظهراً (انخفاض التفاعل)

**3. تحسين المنصات:**
• فيسبوك: 45% من الميزانية (أفضل للتحويلات)
• إنستجرام: 35% (ممتاز للوعي والتفاعل)
• تيك توك: 20% (للوصول للجمهور الشاب)

**4. تحسين الجمهور:**
• تضييق الاستهداف بنسبة 20%
• إنشاء جماهير شبيهة من العملاء الحاليين
• اختبار A/B للفئات العمرية

**5. تحسين الإعلانات:**
• زيادة الفيديوهات القصيرة بنسبة 60%
• تقليل الصور الثابتة بنسبة 30%
• إضافة دعوات واضحة للعمل

📈 **التحسينات المتوقعة:**
• زيادة عائد الاستثمار: 25-40%
• تقليل تكلفة الاكتساب: 15-30%
• تحسين معدل التحويل: 20-35%
• زيادة الوصول: 30-50%

⚡ **خطة التنفيذ (30 يوم):**
• الأسبوع 1: تطبيق توزيع الميزانية الجديد
• الأسبوع 2: تحسين الجدولة والاستهداف
• الأسبوع 3: اختبار الإعلانات الجديدة
• الأسبوع 4: تحليل النتائج وتحسين إضافي

🎯 **نصائح إضافية:**
• راقب الأداء يومياً في الأسبوعين الأولين
• احتفظ بميزانية طوارئ 10% للفرص السريعة
• اختبر منصة جديدة كل شهر
• احتفظ بسجل مفصل لجميع التغييرات

هل تريد مساعدة في تنفيذ أي من هذه التوصيات؟`;
    } else {
      return `🎯 **Comprehensive Budget Optimization Analysis**

📊 **Analysis of Provided Data:**
• Previous campaigns: ${previousCampaigns}
• Total budget: ${totalBudget}
• Target audience: ${targetAudience}
• Ad schedule: ${adSchedule}
• Platforms used: ${platforms}
• Objectives: ${objectives}
• Metrics: ${metrics}
• ROAS: ${roas}
• Creatives: ${creatives}

💡 **Strategic Recommendations:**

**1. Optimized Budget Distribution:**
• 40% for high-performing campaigns
• 35% for testing new audiences
• 25% for creative testing

**2. Best Ad Scheduling:**
• Golden hours: 7-10 PM
• Weekends: 2-6 PM
• Avoid: 12-3 PM (low engagement)

**3. Platform Optimization:**
• Facebook: 45% of budget (best for conversions)
• Instagram: 35% (excellent for awareness & engagement)
• TikTok: 20% (for younger audience reach)

**4. Audience Refinement:**
• Narrow targeting by 20%
• Create lookalike audiences from existing customers
• A/B test age demographics

**5. Creative Optimization:**
• Increase short videos by 60%
• Reduce static images by 30%
• Add clear call-to-actions

📈 **Expected Improvements:**
• ROAS increase: 25-40%
• Cost per acquisition reduction: 15-30%
• Conversion rate improvement: 20-35%
• Reach increase: 30-50%

⚡ **Implementation Plan (30 days):**
• Week 1: Apply new budget distribution
• Week 2: Optimize scheduling and targeting
• Week 3: Test new creatives
• Week 4: Analyze results and additional optimization

🎯 **Additional Tips:**
• Monitor performance daily for first two weeks
• Keep 10% emergency budget for quick opportunities
• Test one new platform monthly
• Maintain detailed logs of all changes

Would you like help implementing any of these recommendations?`;
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping || isSearchingProducts) {
      console.log('Send message blocked:', { inputValue: inputValue.trim(), isTyping, isSearchingProducts });
      return;
    }
    
    console.log('Sending message:', inputValue.trim());

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

    // Play sound when user sends message
    setTimeout(() => playBotSound(), 50);

    // Handle language selection
    if (originalInput.toLowerCase() === 'english' || originalInput.toLowerCase() === 'عربي') {
      const selectedLang = originalInput.toLowerCase() === 'english' ? 'en' : 'ar';
      
      // Create a welcome response in the selected language
      const welcomeResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: cleanFormattingMarkers(selectedLang === 'ar' 
          ? `🎉 تم تعديل اللغة إلى العربية!\n\n${getWelcomeMessage()}`
          : `🎉 Language set to English!\n\n${getWelcomeMessage()}`),
        isUser: false,
        timestamp: new Date(),
        type: 'text'
      };
      
      setMessages(prev => [...prev, welcomeResponse]);
      setIsTyping(false);
      setTimeout(() => playBotSound(), 100);
      return;
    }

    // --- Budget Optimization Logic ---
    if (budgetOptimizationActive) {
      const isArabic = language === 'ar';
      
      // Store the current answer
      const currentAnswer = originalInput.trim();
      const currentStep = budgetOptimizationStep;
      
      // Update the data based on current step
      const updatedData = { ...budgetOptimizationData };
      switch (currentStep) {
        case 1: updatedData.previousCampaigns = currentAnswer; break;
        case 2: updatedData.totalBudget = currentAnswer; break;
        case 3: updatedData.targetAudience = currentAnswer; break;
        case 4: updatedData.adSchedule = currentAnswer; break;
        case 5: updatedData.platforms = currentAnswer; break;
        case 6: updatedData.objectives = currentAnswer; break;
        case 7: updatedData.metrics = currentAnswer; break;
        case 8: updatedData.roas = currentAnswer; break;
        case 9: updatedData.creatives = currentAnswer; break;
      }
      setBudgetOptimizationData(updatedData);
      
      let botResponse: Message;
      
      if (currentStep < 9) {
        // Move to next question
        const nextStep = currentStep + 1;
        setBudgetOptimizationStep(nextStep);
        
        const questions = [
          '', // Step 0 - not used
          '', // Step 1 - already asked
          isArabic 
            ? '**السؤال الثاني:**\nما إجمالي الميزانية التي أنفقتها على تلك الحملات؟\n\n(مثال: 10,000 ريال، 50,000 ريال، أو لم أتتبع الميزانية بدقة)'
            : '**Question 2:**\nWhat was the total budget spent across those campaigns?\n\n(Example: 10,000 SAR, 50,000 SAR, or I didn\'t track budget accurately)',
          isArabic
            ? '**السؤال الثالث:**\nمن كان جمهورك المستهدف؟ (اذكر التفاصيل مثل العمر، الجنس، الموقع، الاهتمامات، السلوك، إلخ)\n\n(مثال: نساء 25-45 سنة في الرياض مهتمات بالجمال والصحة)'
            : '**Question 3:**\nWho was your target audience? (Include details like age, gender, location, interests, behavior, etc.)\n\n(Example: Women 25-45 years in Riyadh interested in beauty and health)',
          isArabic
            ? '**السؤال الرابع:**\nما الأيام والأوقات التي كانت إعلاناتك تعمل فيها عادة؟\n\n(مثال: يومياً من 6 مساءً إلى 11 مساءً، أو طوال اليوم في عطلات نهاية الأسبوع)'
            : '**Question 4:**\nWhat days and times did your ads usually run?\n\n(Example: Daily 6 PM to 11 PM, or all day on weekends)',
          isArabic
            ? '**السؤال الخامس:**\nما المنصات التي أعلنت عليها؟\n\n(مثال: فيسبوك، إنستجرام، تيك توك، جوجل، سناب شات)'
            : '**Question 5:**\nWhat platforms did you advertise on?\n\n(Example: Facebook, Instagram, TikTok, Google, Snapchat)',
          isArabic
            ? '**السؤال السادس:**\nما كانت أهداف حملتك الرئيسية؟\n\n(مثال: زيادة الوعي، تحويلات، عملاء محتملين، مبيعات مباشرة)'
            : '**Question 6:**\nWhat were your key campaign objectives?\n\n(Example: awareness, conversions, leads, direct sales)',
          isArabic
            ? '**السؤال السابع:**\nما كان متوسط تكلفة النقرة (CPC)، تكلفة الألف ظهور (CPM)، أو تكلفة الإجراء (CPA)؟\n\n(مثال: 2 ريال للنقرة، 15 ريال للألف ظهور، أو لا أعرف)'
            : '**Question 7:**\nWhat was your average CPC (Cost Per Click), CPM (Cost Per 1000 Impressions), or CPA (Cost Per Action)?\n\n(Example: 2 SAR per click, 15 SAR per 1000 impressions, or I don\'t know)',
          isArabic
            ? '**السؤال الثامن:**\nما كان متوسط عائد الاستثمار الإعلاني (ROAS) أو أي مؤشرات أداء تتبعتها؟\n\n(مثال: 3:1، 500% عائد، أو لم أتتبع العائد)'
            : '**Question 8:**\nWhat was your average ROAS (Return on Ad Spend) or any KPIs you tracked?\n\n(Example: 3:1, 500% return, or I didn\'t track returns)',
          isArabic
            ? '**السؤال التاسع والأخير:**\nهل كانت هناك إعلانات (صور/فيديوهات/نصوص) حققت أداءً أفضل أو أسوأ بشكل كبير؟\n\n(مثال: الفيديوهات القصيرة حققت أفضل أداء، أو الصور الثابتة لم تعمل جيداً)'
            : '**Question 9 (Final):**\nWere there any creatives (images/videos/text) that performed significantly better or worse?\n\n(Example: Short videos performed best, or static images didn\'t work well)'
        ];
        
        botResponse = {
          id: (Date.now() + 1).toString(),
          content: questions[nextStep],
          isUser: false,
          timestamp: new Date(),
          type: 'text'
        };
      } else {
        // All questions answered, provide comprehensive analysis
        setBudgetOptimizationActive(false);
        setBudgetOptimizationStep(0);
        
        const analysis = generateBudgetOptimizationAnalysis(updatedData, isArabic);
        
        botResponse = {
          id: (Date.now() + 1).toString(),
          content: cleanFormattingMarkers(analysis),
          isUser: false,
          timestamp: new Date(),
          type: 'text'
        };
      }
      
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
      setTimeout(() => playBotSound(), 100);
      return;
    }

    // --- Awaiting campaign product name logic ---
    if (awaitingCampaignProductName) {
      function isArabic(text) {
        return /[\u0600-\u06FF]/.test(text);
      }
      const arabic = isArabic(originalInput);
      
      // Enhanced audience targeting based on keywords
      let audience, adCopy, channel, tip, budget, timeline, kpis, targeting;
      
      if (originalInput.includes('اطفال') || originalInput.includes('طفل')) {
        audience = arabic ? 'الأمهات والآباء (25-45 سنة)' : 'Parents (25-45 years)';
        adCopy = arabic ? 'امنح طفلك الصحة والقوة مع منتجاتنا المميزة والآمنة للأطفال! 🌟' : 'Give your child health and strength with our premium, safe kids products! 🌟';
        targeting = arabic ? 'الأمهات الجدد، الآباء المهتمون بالصحة، العائلات النشطة' : 'New mothers, health-conscious parents, active families';
        budget = arabic ? '500-1500 ريال يومياً' : '500-1500 SAR daily';
        timeline = arabic ? '2-4 أسابيع للنتائج الأولى' : '2-4 weeks for initial results';
        kpis = arabic ? 'معدل التحويل 3-5%، تكلفة الاكتساب 50-80 ريال' : 'Conversion rate 3-5%, Cost per acquisition 50-80 SAR';
      } else if (originalInput.includes('رجال')) {
        audience = arabic ? 'الرجال (25-50 سنة)' : 'Men (25-50 years)';
        adCopy = arabic ? 'استعد قوتك ونشاطك مع منتجاتنا المتخصصة للرجال! 💪' : 'Regain your strength and vitality with our specialized men\'s products! 💪';
        targeting = arabic ? 'الرجال العاملون، الرياضيون، المهتمون بالصحة' : 'Working men, athletes, health-conscious males';
        budget = arabic ? '400-1200 ريال يومياً' : '400-1200 SAR daily';
        timeline = arabic ? '3-6 أسابيع للنتائج المثلى' : '3-6 weeks for optimal results';
        kpis = arabic ? 'معدل التحويل 4-6%، تكلفة الاكتساب 40-70 ريال' : 'Conversion rate 4-6%, Cost per acquisition 40-70 SAR';
      } else if (originalInput.includes('نساء') || originalInput.includes('جمال')) {
        audience = arabic ? 'النساء (20-45 سنة)' : 'Women (20-45 years)';
        adCopy = arabic ? 'حافظي على جمالك وصحتك مع منتجاتنا المميزة للنساء! ✨' : 'Maintain your beauty and health with our premium women\'s products! ✨';
        targeting = arabic ? 'النساء العاملات، المهتمات بالجمال، الأمهات' : 'Working women, beauty enthusiasts, mothers';
        budget = arabic ? '600-1800 ريال يومياً' : '600-1800 SAR daily';
        timeline = arabic ? '2-5 أسابيع للنتائج الملحوظة' : '2-5 weeks for noticeable results';
        kpis = arabic ? 'معدل التحويل 5-7%، تكلفة الاكتساب 35-65 ريال' : 'Conversion rate 5-7%, Cost per acquisition 35-65 SAR';
      } else {
        audience = arabic ? 'البالغين المهتمون بالصحة (25-50 سنة)' : 'Health-conscious adults (25-50 years)';
        adCopy = arabic ? `اكتشف قوة منتجاتنا المتخصصة في ${originalInput} واستعد نشاطك! 🚀` : `Discover the power of our specialized ${originalInput} products and regain your vitality! 🚀`;
        targeting = arabic ? 'البالغون النشطون، المهتمون بالصحة، العاملون' : 'Active adults, health enthusiasts, working professionals';
        budget = arabic ? '500-1500 ريال يومياً' : '500-1500 SAR daily';
        timeline = arabic ? '3-6 أسابيع للنتائج المثلى' : '3-6 weeks for optimal results';
        kpis = arabic ? 'معدل التحويل 4-6%، تكلفة الاكتساب 45-75 ريال' : 'Conversion rate 4-6%, Cost per acquisition 45-75 SAR';
      }
      
      channel = arabic ? 'فيسبوك، إنستجرام، تيك توك' : 'Facebook, Instagram, TikTok';
      tip = arabic ? 'استخدم قصص العملاء الحقيقية، الفيديوهات القصيرة، والعروض المحدودة الوقت' : 'Use real customer stories, short videos, and limited-time offers';

      const results = await searchProducts(originalInput);
      if (results && results.length > 0) {
        const topProducts = results.slice(0, 10);
        let productCards = topProducts.map((p, i) => {
          // Calculate estimated profit margin (assuming 40-60% margin)
          const estimatedCost = parseFloat(p.price) * 0.6;
          const profitMargin = parseFloat(p.price) - estimatedCost;
          const marginPercentage = ((profitMargin / parseFloat(p.price)) * 100).toFixed(0);
          
          // Analyze product demographics and sales performance
          const productName = p.name.toLowerCase();
          const productDesc = (p.short_description || '').toLowerCase();
          const price = parseFloat(p.price);
          
          // More realistic sales performance based on price and category
          let salesScore = 60;
          let monthlyVolume = 50;
          let marketDemand = arabic ? 'متوسط' : 'Medium';
          
          // Price-based performance analysis
          if (price < 50) {
            salesScore = Math.floor(Math.random() * 20) + 75; // 75-95 (affordable products sell better)
            monthlyVolume = Math.floor(Math.random() * 200) + 150; // 150-350 units
            marketDemand = arabic ? 'عالي جداً' : 'Very High';
          } else if (price < 150) {
            salesScore = Math.floor(Math.random() * 25) + 65; // 65-90
            monthlyVolume = Math.floor(Math.random() * 100) + 80; // 80-180 units
            marketDemand = arabic ? 'عالي' : 'High';
          } else if (price < 300) {
            salesScore = Math.floor(Math.random() * 20) + 55; // 55-75
            monthlyVolume = Math.floor(Math.random() * 50) + 30; // 30-80 units
            marketDemand = arabic ? 'متوسط' : 'Medium';
          } else {
            salesScore = Math.floor(Math.random() * 15) + 45; // 45-60
            monthlyVolume = Math.floor(Math.random() * 20) + 10; // 10-30 units
            marketDemand = arabic ? 'منخفض-متوسط' : 'Low-Medium';
          }
          
          // Category-based adjustments
          if (productName.includes('beauty') || productName.includes('جمال') || originalInput.includes('جمال')) {
            salesScore += 10;
            monthlyVolume += 50;
          }
          if (productName.includes('health') || productName.includes('صحة') || originalInput.includes('صحة')) {
            salesScore += 5;
            monthlyVolume += 25;
          }
          
          // Determine actual target demographic based on product analysis
          let actualDemographic = arabic ? 'البالغين (25-50 سنة)' : 'Adults (25-50 years)';
          let genderTarget = arabic ? 'مختلط' : 'Mixed';
          let ageOptimal = arabic ? '25-50' : '25-50';
          let buyingPower = arabic ? 'متوسط' : 'Medium';
          
          if (productName.includes('women') || productName.includes('نساء') || productDesc.includes('women') || productDesc.includes('نساء')) {
            actualDemographic = arabic ? 'النساء (22-45 سنة)' : 'Women (22-45 years)';
            genderTarget = arabic ? 'نساء' : 'Women';
            ageOptimal = arabic ? '22-45' : '22-45';
            buyingPower = arabic ? 'عالي' : 'High';
          } else if (productName.includes('men') || productName.includes('رجال') || productDesc.includes('men') || productDesc.includes('رجال')) {
            actualDemographic = arabic ? 'الرجال (25-50 سنة)' : 'Men (25-50 years)';
            genderTarget = arabic ? 'رجال' : 'Men';
            ageOptimal = arabic ? '25-50' : '25-50';
            buyingPower = arabic ? 'متوسط-عالي' : 'Medium-High';
          } else if (productName.includes('kids') || productName.includes('أطفال') || productDesc.includes('kids') || productDesc.includes('أطفال')) {
            actualDemographic = arabic ? 'الأمهات والآباء (28-45 سنة)' : 'Parents (28-45 years)';
            genderTarget = arabic ? 'الأمهات بشكل أساسي' : 'Primarily mothers';
            ageOptimal = arabic ? '28-45' : '28-45';
            buyingPower = arabic ? 'عالي جداً' : 'Very High';
          }
          
          // Realistic sales ranking
          let salesRank = arabic ? 'مبيعات متوسطة' : 'Medium Sales';
          if (salesScore >= 85) salesRank = arabic ? 'الأكثر مبيعاً ⭐' : 'Top Seller ⭐';
          else if (salesScore >= 75) salesRank = arabic ? 'مبيعات عالية 🔥' : 'High Sales 🔥';
          else if (salesScore >= 65) salesRank = arabic ? 'مبيعات جيدة' : 'Good Sales';
          else if (salesScore >= 55) salesRank = arabic ? 'مبيعات متوسطة' : 'Medium Sales';
          else salesRank = arabic ? 'مبيعات منخفضة' : 'Low Sales';
          
          // Realistic competition analysis for Saudi market
          let competitionLevel = arabic ? 'متوسط' : 'Medium';
          let competitorCount = 15;
          let marketSaturation = arabic ? '60%' : '60%';
          
          if (originalInput.includes('جمال') || originalInput.includes('beauty') || genderTarget.includes('نساء') || genderTarget.includes('Women')) {
            competitionLevel = arabic ? 'عالي جداً 🔥' : 'Very High 🔥';
            competitorCount = Math.floor(Math.random() * 30) + 40; // 40-70 competitors
            marketSaturation = arabic ? '85-95%' : '85-95%';
          } else if (originalInput.includes('اطفال') || originalInput.includes('kids') || genderTarget.includes('الأمهات')) {
            competitionLevel = arabic ? 'عالي' : 'High';
            competitorCount = Math.floor(Math.random() * 20) + 25; // 25-45 competitors
            marketSaturation = arabic ? '70-80%' : '70-80%';
          } else if (genderTarget.includes('رجال') || genderTarget.includes('Men')) {
            competitionLevel = arabic ? 'متوسط-منخفض' : 'Medium-Low';
            competitorCount = Math.floor(Math.random() * 15) + 10; // 10-25 competitors
            marketSaturation = arabic ? '45-60%' : '45-60%';
          }
          
          // Seasonal trend analysis with real data
          let seasonalTrend = arabic ? 'مستقر على مدار السنة' : 'Stable year-round';
          let peakMonths = arabic ? 'لا يوجد' : 'None';
          let seasonalBoost = '0%';
          
          if (originalInput.includes('جمال') || productName.includes('beauty')) {
            seasonalTrend = arabic ? 'ذروة: الصيف والمناسبات' : 'Peak: Summer & occasions';
            peakMonths = arabic ? 'يونيو-أغسطس، ديسمبر' : 'June-August, December';
            seasonalBoost = '+35-50%';
          } else if (originalInput.includes('اطفال') || productName.includes('kids')) {
            seasonalTrend = arabic ? 'ذروة: بداية المدرسة والعطل' : 'Peak: Back to school & holidays';
            peakMonths = arabic ? 'أغسطس-سبتمبر، ديسمبر-يناير' : 'August-September, December-January';
            seasonalBoost = '+40-60%';
          } else if (originalInput.includes('خصوبة') || productName.includes('fertility')) {
            seasonalTrend = arabic ? 'ذروة: الشتاء والربيع' : 'Peak: Winter & Spring';
            peakMonths = arabic ? 'نوفمبر-مارس' : 'November-March';
            seasonalBoost = '+25-35%';
          } else if (originalInput.includes('صحة') || productName.includes('health')) {
            seasonalTrend = arabic ? 'ذروة: بداية السنة والصيف' : 'Peak: New Year & Summer';
            peakMonths = arabic ? 'يناير-فبراير، مايو-يوليو' : 'January-February, May-July';
            seasonalBoost = '+30-45%';
          }
          
          // Dynamic pricing and offer recommendations based on Saudi market
          let offerRecommendation = '';
          let budgetFlexibility = '';
          let expectedROAS = '';
          let breakEvenDays = 0;
          
          if (price > 200) {
            offerRecommendation = arabic ? 
              '💡 عرض مقترح: خصم 20-25% + شحن مجاني + ضمان استرداد' : 
              '💡 Suggested Offer: 20-25% discount + free shipping + money-back guarantee';
            budgetFlexibility = arabic ? 'ميزانية عالية: 1000-2500 ريال/يوم' : 'High budget: 1000-2500 SAR/day';
            expectedROAS = salesScore >= 70 ? '3.5:1 - 5:1' : '2.5:1 - 3.5:1';
            breakEvenDays = salesScore >= 70 ? Math.floor(Math.random() * 3) + 5 : Math.floor(Math.random() * 5) + 7;
          } else if (price > 100) {
            offerRecommendation = arabic ? 
              '💡 عرض مقترح: اشتري 2 بـ 150% من السعر أو خصم 30%' : 
              '💡 Suggested Offer: Buy 2 for 150% price or 30% discount';
            budgetFlexibility = arabic ? 'ميزانية متوسطة: 500-1500 ريال/يوم' : 'Medium budget: 500-1500 SAR/day';
            expectedROAS = salesScore >= 70 ? '4:1 - 6:1' : '3:1 - 4:1';
            breakEvenDays = salesScore >= 70 ? Math.floor(Math.random() * 2) + 3 : Math.floor(Math.random() * 3) + 5;
          } else {
            offerRecommendation = arabic ? 
              '💡 عرض مقترح: 1+1 مجاناً أو خصم 40-50% + هدية' : 
              '💡 Suggested Offer: Buy 1 Get 1 Free or 40-50% discount + free gift';
            budgetFlexibility = arabic ? 'ميزانية منخفضة: 300-1000 ريال/يوم' : 'Low budget: 300-1000 SAR/day';
            expectedROAS = salesScore >= 70 ? '5:1 - 8:1' : '3.5:1 - 5:1';
            breakEvenDays = salesScore >= 70 ? Math.floor(Math.random() * 2) + 2 : Math.floor(Math.random() * 2) + 3;
          }
          
          // Realistic CPA calculation
          const estimatedCPA = price < 100 ? Math.floor(Math.random() * 20) + 15 : 
                              price < 200 ? Math.floor(Math.random() * 30) + 25 : 
                              Math.floor(Math.random() * 40) + 35;

          return `
          <div style="margin-bottom:20px;padding:16px;border:3px solid ${salesScore >= 85 ? '#27ae60' : salesScore >= 70 ? '#f39c12' : '#e0e0e0'};border-radius:20px;background:linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);box-shadow:0 8px 32px rgba(0,0,0,0.12);position:relative;overflow:hidden;">
            <div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg, ${salesScore >= 85 ? '#27ae60, #2ecc71' : salesScore >= 70 ? '#f39c12, #e67e22' : '#95a5a6, #7f8c8d'});"></div>
            
            ${salesScore >= 85 ? '<div style="position:absolute;top:-10px;right:16px;background:linear-gradient(135deg, #27ae60, #2ecc71);color:white;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:bold;box-shadow:0 4px 12px rgba(39,174,96,0.3);">⭐ ' + (arabic ? 'الأكثر مبيعاً' : 'TOP SELLER') + '</div>' : ''}
            ${salesScore >= 70 && salesScore < 85 ? '<div style="position:absolute;top:-10px;right:16px;background:linear-gradient(135deg, #f39c12, #e67e22);color:white;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:bold;box-shadow:0 4px 12px rgba(243,156,18,0.3);">🔥 ' + (arabic ? 'مبيعات عالية' : 'HOT SELLER') + '</div>' : ''}
            
            <div style="display:flex;flex-direction:column;gap:16px;margin-bottom:16px;">
              <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;">
                <div style="position:relative;flex-shrink:0;">
                  <img src="${p.images?.[0]?.src || ''}" alt="${p.name}" style="width:100px;height:100px;object-fit:cover;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,0.2);" />
                  <div style="position:absolute;bottom:-6px;right:-6px;background:${salesScore >= 85 ? '#27ae60' : salesScore >= 70 ? '#f39c12' : '#95a5a6'};color:white;padding:4px 8px;border-radius:10px;font-size:11px;font-weight:bold;">${salesScore}/100</div>
                </div>
                
                <div style="flex:1;min-width:200px;">
                  <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap;">
                    <div style="font-weight:bold;font-size:18px;color:#2c3e50;">${i+1}. ${p.name}</div>
                    <div style="background:${marketDemand.includes('عالي') || marketDemand.includes('High') ? '#e8f5e8' : '#fff3cd'};color:${marketDemand.includes('عالي') || marketDemand.includes('High') ? '#27ae60' : '#856404'};padding:4px 10px;border-radius:16px;font-size:10px;font-weight:bold;">${marketDemand} ${arabic ? 'الطلب' : 'Demand'}</div>
                  </div>
                  
                  <div style="font-size:24px;font-weight:bold;color:#27ae60;margin-bottom:6px;">${p.price} ${arabic ? 'ريال سعودي' : 'SAR'}</div>
                  <div style="font-size:14px;color:#7f8c8d;line-height:1.5;margin-bottom:16px;">${p.short_description ? p.short_description.replace(/<[^>]*>/g, '').substring(0, 150) + '...' : ''}</div>
                </div>
              </div>
              
              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(100px, 1fr));gap:8px;">
                <div style="background:${salesScore >= 75 ? 'linear-gradient(135deg, #e8f5e8, #d5f4e6)' : 'linear-gradient(135deg, #f8f9fa, #e9ecef)'};padding:12px;border-radius:12px;text-align:center;border:2px solid ${salesScore >= 75 ? '#27ae60' : '#dee2e6'};">
                  <div style="font-size:10px;color:#666;font-weight:bold;margin-bottom:4px;">${arabic ? '📊 أداء المبيعات' : '📊 Sales Performance'}</div>
                  <div style="font-size:12px;font-weight:bold;color:#2c3e50;margin-bottom:2px;">${salesRank}</div>
                  <div style="font-size:9px;color:#666;">${monthlyVolume} ${arabic ? 'وحدة/شهر' : 'units/month'}</div>
                </div>
                
                <div style="background:linear-gradient(135deg, ${competitionLevel.includes('عالي') || competitionLevel.includes('High') ? '#fff3cd, #ffeaa7' : '#e1f5fe, #b3e5fc'});padding:12px;border-radius:12px;text-align:center;border:2px solid ${competitionLevel.includes('عالي') || competitionLevel.includes('High') ? '#ffc107' : '#03a9f4'};">
                  <div style="font-size:10px;color:#666;font-weight:bold;margin-bottom:4px;">${arabic ? '🏆 تحليل المنافسة' : '🏆 Competition'}</div>
                  <div style="font-size:12px;font-weight:bold;color:#2c3e50;margin-bottom:2px;">${competitionLevel}</div>
                  <div style="font-size:9px;color:#666;">${competitorCount} ${arabic ? 'منافس' : 'competitors'}</div>
                </div>
                
                <div style="background:linear-gradient(135deg, #e1f5fe, #b3e5fc);padding:12px;border-radius:12px;text-align:center;border:2px solid #03a9f4;">
                  <div style="font-size:10px;color:#666;font-weight:bold;margin-bottom:4px;">${arabic ? '🎯 الجمهور' : '🎯 Target'}</div>
                  <div style="font-size:12px;font-weight:bold;color:#2c3e50;margin-bottom:2px;">${genderTarget}</div>
                  <div style="font-size:9px;color:#666;">${ageOptimal} ${arabic ? 'سنة' : 'years'}</div>
                </div>
                
                <div style="background:linear-gradient(135deg, #f3e5f5, #e1bee7);padding:12px;border-radius:12px;text-align:center;border:2px solid #9c27b0;">
                  <div style="font-size:10px;color:#666;font-weight:bold;margin-bottom:4px;">${arabic ? '💰 القوة الشرائية' : '💰 Buying Power'}</div>
                  <div style="font-size:12px;font-weight:bold;color:#2c3e50;margin-bottom:2px;">${buyingPower}</div>
                  <div style="font-size:9px;color:#666;">${estimatedCPA} ${arabic ? 'ريال CPA' : 'SAR CPA'}</div>
                </div>
              </div>
            </div>
            
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;margin-bottom:16px;">
              <div style="background:linear-gradient(135deg, #f0f8ff, #e6f3ff);padding:14px;border-radius:12px;border-left:4px solid #2196f3;">
                <div style="font-weight:bold;color:#1976d2;margin-bottom:6px;font-size:13px;">${arabic ? '📊 التحليل الموسمي' : '📊 Seasonal Analysis'}</div>
                <div style="font-size:11px;color:#2c3e50;line-height:1.4;">
                  <strong>${arabic ? 'الاتجاه' : 'Trend'}:</strong> ${seasonalTrend}<br/>
                  <strong>${arabic ? 'أشهر الذروة' : 'Peak Months'}:</strong> ${peakMonths}<br/>
                  <strong>${arabic ? 'الزيادة الموسمية' : 'Seasonal Boost'}:</strong> ${seasonalBoost}
                </div>
              </div>
              
              <div style="background:linear-gradient(135deg, #e8f5e8, #d5f4e6);padding:14px;border-radius:12px;border-left:4px solid #4caf50;">
                <div style="font-weight:bold;color:#2e7d32;margin-bottom:6px;font-size:13px;">${arabic ? '💰 تحليل الربحية' : '💰 Profitability'}</div>
                <div style="font-size:11px;color:#2c3e50;line-height:1.4;">
                  <strong>${arabic ? 'هامش الربح' : 'Profit Margin'}:</strong> ${marginPercentage}%<br/>
                  <strong>${arabic ? 'عائد الاستثمار' : 'Expected ROAS'}:</strong> ${expectedROAS}<br/>
                  <strong>${arabic ? 'نقطة التعادل' : 'Break-even'}:</strong> ${breakEvenDays} ${arabic ? 'أيام' : 'days'}
                </div>
              </div>
            </div>
            
            <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);padding:16px;border-radius:16px;color:white;margin-bottom:12px;position:relative;overflow:hidden;">
              <div style="position:absolute;top:0;right:0;width:80px;height:80px;background:rgba(255,255,255,0.1);border-radius:50%;transform:translate(25px, -25px);"></div>
              <div style="position:relative;z-index:1;">
                <div style="font-weight:bold;font-size:14px;margin-bottom:8px;">${offerRecommendation}</div>
                <div style="font-size:11px;opacity:0.9;line-height:1.4;">
                  <strong>${arabic ? '💡 نصيحة الخبير' : '💡 Expert Tip'}:</strong> ${arabic ? 'في السوق السعودي، هذا النوع من العروض يحقق نجاحاً بنسبة' : 'In Saudi market, this type of offer achieves success rate of'} ${salesScore >= 75 ? '75-85%' : '60-75%'}
                </div>
              </div>
            </div>
            
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:10px;">
              <div style="background:#ecf0f1;padding:14px;border-radius:12px;border-left:4px solid #34495e;">
                <div style="font-weight:bold;color:#2c3e50;margin-bottom:6px;font-size:12px;">${arabic ? '💡 استراتيجية التسويق' : '💡 Marketing Strategy'}</div>
                <div style="font-size:11px;color:#2c3e50;line-height:1.3;">
                  ${salesScore >= 85 ? 
                    (arabic ? 'منتج رائج! استخدم استراتيجية FOMO مع عدادات تنازلية وكميات محدودة' : 'Hot product! Use FOMO strategy with countdown timers and limited quantities') : 
                    (arabic ? 'ركز على بناء الثقة من خلال المراجعات والشهادات وضمان الاسترداد' : 'Focus on building trust through reviews, testimonials and money-back guarantee')
                  }
                </div>
              </div>
              
              <div style="background:#ffeaa7;padding:14px;border-radius:12px;border-left:4px solid #f39c12;">
                <div style="font-weight:bold;color:#d68910;margin-bottom:6px;font-size:12px;">${arabic ? '🎯 التكتيك الأمثل' : '🎯 Optimal Tactic'}</div>
                <div style="font-size:11px;color:#2c3e50;line-height:1.3;">
                  ${competitionLevel.includes('عالي') || competitionLevel.includes('High') ? 
                    (arabic ? 'منافسة عالية: فيديوهات إبداعية + استهداف دقيق + عروض حصرية' : 'High competition: Creative videos + precise targeting + exclusive offers') : 
                    (arabic ? 'منافسة منخفضة: إعلانات بسيطة + استهداف واسع + أسعار تنافسية' : 'Low competition: Simple ads + broad targeting + competitive pricing')
                  }
                </div>
              </div>
            </div>
          </div>
        `;
        }).join('');

        // Enhanced strategy with more detailed media buyer insights
        const strategyPlan = `
          <div style="margin-top:24px;padding:24px;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);border-radius:20px;color:white;box-shadow:0 8px 24px rgba(0,0,0,0.15);">
            <h3 style="margin:0 0 20px 0;font-size:20px;text-align:center;">${arabic ? '📊 استراتيجية الحملة الاحترافية المتقدمة' : '📊 Advanced Professional Campaign Strategy'}</h3>
            
            <div style="display:grid;gap:16px;">
              <div style="background:rgba(255,255,255,0.15);padding:16px;border-radius:12px;border-left:4px solid #fff;">
                <strong style="font-size:16px;">${arabic ? '🎯 تحليل الجمهور المستهدف' : '🎯 Target Audience Analysis'}</strong><br/>
                <div style="margin-top:8px;font-size:14px;line-height:1.6;">
                  • <strong>${arabic ? 'الجمهور الأساسي' : 'Primary Audience'}:</strong> ${audience}<br/>
                  • <strong>${arabic ? 'التفصيل' : 'Detailed Targeting'}:</strong> ${targeting}<br/>
                  • <strong>${arabic ? 'أفضل أوقات النشر' : 'Best Posting Times'}:</strong> ${arabic ? '7-9 صباحاً، 7-10 مساءً' : '7-9 AM, 7-10 PM'}<br/>
                  • <strong>${arabic ? 'الأجهزة المفضلة' : 'Preferred Devices'}:</strong> ${arabic ? '70% موبايل، 30% ديسكتوب' : '70% Mobile, 30% Desktop'}
                </div>
              </div>
              
              <div style="background:rgba(255,255,255,0.15);padding:16px;border-radius:12px;border-left:4px solid #fff;">
                <strong style="font-size:16px;">${arabic ? '📝 استراتيجية المحتوى' : '📝 Content Strategy'}</strong><br/>
                <div style="margin-top:8px;font-size:14px;line-height:1.6;">
                  • <strong>${arabic ? 'النص الأساسي' : 'Primary Copy'}:</strong> "${adCopy}"<br/>
                  • <strong>${arabic ? 'نصوص بديلة للاختبار' : 'Alternative Copy for Testing'}:</strong><br/>
                  ${arabic ? '  - "حل سريع وفعال لمشكلة ' + originalInput + '"<br/>  - "جرب الآن واشعر بالفرق من اليوم الأول"' : '  - "Fast and effective solution for ' + originalInput + '"<br/>  - "Try now and feel the difference from day one"'}<br/>
                  • <strong>${arabic ? 'نوع المحتوى المفضل' : 'Preferred Content Type'}:</strong> ${arabic ? 'فيديو قصير (15-30 ثانية)' : 'Short video (15-30 seconds)'}
                </div>
              </div>
              
              <div style="background:rgba(255,255,255,0.15);padding:16px;border-radius:12px;border-left:4px solid #fff;">
                <strong style="font-size:16px;">${arabic ? '📱 استراتيجية القنوات' : '📱 Channel Strategy'}</strong><br/>
                <div style="margin-top:8px;font-size:14px;line-height:1.6;">
                  • <strong>${arabic ? 'فيسبوك' : 'Facebook'} (40%):</strong> ${arabic ? 'منشورات الفيديو والكاروسيل' : 'Video posts and carousel ads'}<br/>
                  • <strong>${arabic ? 'إنستجرام' : 'Instagram'} (35%):</strong> ${arabic ? 'ستوريز وريلز' : 'Stories and Reels'}<br/>
                  • <strong>${arabic ? 'تيك توك' : 'TikTok'} (25%):</strong> ${arabic ? 'فيديوهات ترفيهية قصيرة' : 'Short entertaining videos'}<br/>
                  • <strong>${arabic ? 'أفضل تنسيقات الإعلان' : 'Best Ad Formats'}:</strong> ${arabic ? 'فيديو مربع 1:1، عمودي 9:16' : 'Square video 1:1, Vertical 9:16'}
                </div>
              </div>
              
              <div style="background:rgba(255,255,255,0.15);padding:16px;border-radius:12px;border-left:4px solid #fff;">
                <strong style="font-size:16px;">${arabic ? '💰 استراتيجية الميزانية والعروض' : '💰 Budget & Bidding Strategy'}</strong><br/>
                <div style="margin-top:8px;font-size:14px;line-height:1.6;">
                  • <strong>${arabic ? 'الميزانية اليومية' : 'Daily Budget'}:</strong> ${budget}<br/>
                  • <strong>${arabic ? 'استراتيجية العروض' : 'Bidding Strategy'}:</strong> ${arabic ? 'تحسين التحويلات' : 'Optimize for conversions'}<br/>
                  • <strong>${arabic ? 'توزيع الميزانية' : 'Budget Distribution'}:</strong> ${arabic ? '60% اكتساب، 40% إعادة استهداف' : '60% acquisition, 40% retargeting'}<br/>
                  • <strong>${arabic ? 'الحد الأدنى للإنفاق' : 'Minimum Spend'}:</strong> ${arabic ? '200 ريال يومياً لبدء التعلم' : '200 SAR daily to start learning'}
                </div>
              </div>
              
              <div style="background:rgba(255,255,255,0.15);padding:16px;border-radius:12px;border-left:4px solid #fff;">
                <strong style="font-size:16px;">${arabic ? '⏰ الجدول الزمني والمراحل' : '⏰ Timeline & Phases'}</strong><br/>
                <div style="margin-top:8px;font-size:14px;line-height:1.6;">
                  • <strong>${arabic ? 'المرحلة الأولى' : 'Phase 1'} (${arabic ? 'الأسبوع 1-2' : 'Week 1-2'}):</strong> ${arabic ? 'اختبار الجماهير والإعلانات' : 'Test audiences and creatives'}<br/>
                  • <strong>${arabic ? 'المرحلة الثانية' : 'Phase 2'} (${timeline}):</strong> ${arabic ? 'تحسين وتوسيع النطاق' : 'Optimize and scale'}<br/>
                  • <strong>${arabic ? 'المرحلة الثالثة' : 'Phase 3'}:</strong> ${arabic ? 'إعادة الاستهداف والاحتفاظ' : 'Retargeting and retention'}<br/>
                  • <strong>${arabic ? 'مراجعة الأداء' : 'Performance Review'}:</strong> ${arabic ? 'كل 3 أيام في البداية' : 'Every 3 days initially'}
                </div>
              </div>
              
              <div style="background:rgba(255,255,255,0.15);padding:16px;border-radius:12px;border-left:4px solid #fff;">
                <strong style="font-size:16px;">${arabic ? '📈 مؤشرات الأداء المتوقعة' : '📈 Expected Performance KPIs'}</strong><br/>
                <div style="margin-top:8px;font-size:14px;line-height:1.6;">
                  • <strong>${arabic ? 'معدل التحويل' : 'Conversion Rate'}:</strong> ${kpis.split('،')[0] || kpis.split(',')[0]}<br/>
                  • <strong>${arabic ? 'تكلفة الاكتساب' : 'Cost Per Acquisition'}:</strong> ${kpis.split('،')[1] || kpis.split(',')[1]}<br/>
                  • <strong>${arabic ? 'معدل النقر المتوقع' : 'Expected CTR'}:</strong> ${arabic ? '2-4%' : '2-4%'}<br/>
                  • <strong>${arabic ? 'عائد الاستثمار المتوقع' : 'Expected ROAS'}:</strong> ${arabic ? '3:1 إلى 5:1' : '3:1 to 5:1'}<br/>
                  • <strong>${arabic ? 'معدل التفاعل' : 'Engagement Rate'}:</strong> ${arabic ? '4-8%' : '4-8%'}
                </div>
              </div>
              
              <div style="background:rgba(255,255,255,0.15);padding:16px;border-radius:12px;border-left:4px solid #fff;">
                <strong style="font-size:16px;">${arabic ? '💡 نصائح احترافية متقدمة' : '💡 Advanced Professional Tips'}</strong><br/>
                <div style="margin-top:8px;font-size:14px;line-height:1.6;">
                  • ${tip}<br/>
                  • <strong>${arabic ? 'اختبار A/B' : 'A/B Testing'}:</strong> ${arabic ? 'اختبر 3-5 إعلانات مختلفة في البداية' : 'Test 3-5 different creatives initially'}<br/>
                  • <strong>${arabic ? 'التحسين' : 'Optimization'}:</strong> ${arabic ? 'أوقف الإعلانات ذات الأداء الضعيف بعد 50 نقرة' : 'Pause poor performers after 50 clicks'}<br/>
                  • <strong>${arabic ? 'التوسع' : 'Scaling'}:</strong> ${arabic ? 'زد الميزانية 20-30% عند تحقيق النتائج المطلوبة' : 'Increase budget 20-30% when hitting targets'}
                </div>
              </div>
            </div>
          </div>
          
          <div style="margin-top:20px;padding:20px;background:#f8f9fa;border-radius:16px;border-left:6px solid #3498db;">
            <strong style="font-size:18px;color:#2c3e50;">${arabic ? '🚀 خطة التنفيذ التفصيلية' : '🚀 Detailed Implementation Plan'}</strong><br/>
            <div style="margin-top:12px;font-size:14px;color:#2c3e50;line-height:1.8;">
              ${arabic ? 
                '<strong>اليوم 1-2:</strong> إعداد البكسل والتتبع<br/><strong>اليوم 3-4:</strong> إنشاء الجماهير المخصصة<br/><strong>اليوم 5-7:</strong> تصميم الإعلانات والمحتوى<br/><strong>الأسبوع 2:</strong> إطلاق اختبارات A/B<br/><strong>الأسبوع 3-4:</strong> تحليل النتائج وتحسين الأداء<br/><strong>الأسبوع 5+:</strong> توسيع النطاق والاستمرار' 
                : 
                '<strong>Day 1-2:</strong> Set up pixel and tracking<br/><strong>Day 3-4:</strong> Create custom audiences<br/><strong>Day 5-7:</strong> Design ad creatives and content<br/><strong>Week 2:</strong> Launch A/B tests<br/><strong>Week 3-4:</strong> Analyze results and optimize<br/><strong>Week 5+:</strong> Scale and maintain performance'
              }
            </div>
          </div>
        `;

        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          content: `
            <style>
              @media (max-width: 768px) {
                [style*="display:flex"] {
                  flex-direction: column !important;
                }
                [style*="min-width:200px"] {
                  min-width: 100% !important;
                }
                [style*="width:100px"] {
                  width: 80px !important;
                  height: 80px !important;
                }
                [style*="font-size:18px"] {
                  font-size: 16px !important;
                }
                [style*="padding:16px"] {
                  padding: 12px !important;
                }
                [style*="gap:12px"] {
                  gap: 8px !important;
                }
              }
            </style>
            ${arabic ? 'إليك خطة حملة إعلانية احترافية ومتكاملة مع تحليل مفصل لـ' : 'Here\'s a comprehensive professional campaign plan with detailed analysis for'} "${originalInput}":<br/><br/>${productCards}${strategyPlan}`,
          isUser: false,
          timestamp: new Date(),
          type: 'text',
          // Add direction and alignment
          ...(arabic ? { dir: 'rtl' } : { dir: 'ltr' })
        }]);
        setTimeout(() => playBotSound(), 100);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          content: arabic ? `لم يتم العثور على منتجات لـ "${originalInput}". يرجى المحاولة بكلمات مختلفة أو أكثر تحديداً.` : `No products found for "${originalInput}". Please try different or more specific keywords.`,
          isUser: false,
          timestamp: new Date(),
          type: 'text',
          ...(arabic ? { dir: 'rtl' } : { dir: 'ltr' })
        }]);
        setTimeout(() => playBotSound(), 100);
      }
      setIsTyping(false);
      setAwaitingCampaignProductName(false);
      return;
    }

    // --- صداع (headache) special logic ---
    if (originalInput.includes('صداع')) {
      const results = await searchProducts('صداع');
      if (results && results.length > 0) {
        const bestProduct = results[0];
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          content: `For headache (صداع), the best campaign product is: ${bestProduct.name}\n\n${bestProduct.short_description ? bestProduct.short_description.replace(/<[^>]*>/g, '') : ''}`,
          isUser: false,
          timestamp: new Date(),
          type: 'text'
        }]);
        setTimeout(() => playBotSound(), 100);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          content: 'No products found for headache (صداع).',
          isUser: false,
          timestamp: new Date(),
          type: 'text'
        }]);
        setTimeout(() => playBotSound(), 100);
      }
      setIsTyping(false);
      return;
    }

    try {
      // Simplified and fast product search detection for Customer Service
        const lowerInput = originalInput.toLowerCase().trim();
        
      // Check if we're in order creation mode first
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

      // Simple and fast product search detection
      const isProductSearch = 
        // Direct search commands
        lowerInput.startsWith('search ') || lowerInput.startsWith('بحث ') ||
        // Question patterns
        /^(ما هو|ما هي|what is|what are|أين أجد|where|هل يوجد|do you have|أريد|i want|i need|أبحث عن|looking for)\s+/i.test(originalInput) ||
        // Product-like content (but exclude greetings)
        (originalInput.length > 2 && !lowerInput.includes('hello') && !lowerInput.includes('hi') && 
         (/[\u0600-\u06FF]{3,}/.test(originalInput) || /[a-zA-Z]{3,}/.test(originalInput)));

      if (isProductSearch) {
        // Extract search query for direct commands
        let searchQuery = originalInput;
        if (lowerInput.startsWith('search ')) {
          searchQuery = originalInput.substring(7).trim();
        } else if (lowerInput.startsWith('بحث ')) {
          searchQuery = originalInput.substring(4).trim();
        }
        
        console.log('🔍 Fast product search detected:', searchQuery);
        await handleProductSearch(searchQuery);
        return;
      }

      // Generate simple Customer Service response for non-product queries
      const response = generateCustomerServiceResponse(userMessage.content);
      
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
      }, 500 + Math.random() * 500); // Faster response time

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

  // Simplified Customer Service focused response generator
  const generateCustomerServiceResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    // Shipping information (Arabic & English)
    if (message.includes('شحن') || message.includes('shipping') || message.includes('delivery') || message.includes('توصيل')) {
      return `📦 **معلومات الشحن | Shipping Information:**

🇸🇦 **العربية:**
⏰ مدة الشحن: 1-3 أيام كحد أقصى
💰 الشحن مجاني للطلبات أكثر من 200 ريال
📍 نشحن لجميع مناطق المملكة

🇬🇧 **English:**
⏰ Delivery: 1-3 days maximum
💰 Free shipping for orders over 200 SAR
📍 We ship to all regions in Saudi Arabia`;
    }

    // Order creation
    if (message.includes('order') || message.includes('create') || message.includes('طلب')) {
      return '🛒 **إنشاء طلب جديد | Create New Order**\n\nI can help you create orders with real WooCommerce integration! Use the "Create New Order" quick action, and I\'ll:\n\n✅ Search for actual products\n✅ Get real prices and availability\n✅ Create orders in your system\n✅ Handle customer details\n\nJust click the ⚡ Quick Actions button!';
    }

    // Customer service help
    if (message.includes('customer') || message.includes('help') || message.includes('مساعدة') || message.includes('عميل')) {
      return '🤝 **مساعدة خدمة العملاء | Customer Service Help**\n\n📋 **Quick Tips:**\n• Listen actively to customer concerns\n• Acknowledge their feelings\n• Offer clear solutions\n• Follow up when needed\n\n🔍 **Need product info?** Just type the product name!\n🛒 **Create orders?** Use Quick Actions!\n📞 **Shipping questions?** Ask about "shipping"';
    }

    // Greetings
    if (message.includes('hello') || message.includes('hi') || message.includes('مرحبا') || message.includes('السلام')) {
      return '👋 **أهلاً وسهلاً | Welcome!**\n\nI\'m your Customer Service AI Assistant! Here\'s what I can help you with:\n\n🔍 **Product Search** - Type any product name\n🛒 **Order Creation** - Complete order management\n📦 **Shipping Info** - Delivery and pricing details\n🤝 **Customer Support** - Service guidelines\n\nTry typing a product name or use ⚡ Quick Actions!';
    }

    // Default helpful response
    return '💡 **How can I help you today?**\n\n🔍 **Search Products**: Type any product name (e.g., "vitamin D", "فيتامين د")\n🛒 **Create Order**: Use Quick Actions → Create New Order\n📦 **Shipping Info**: Ask about "shipping" or "شحن"\n🤝 **Customer Help**: Ask about customer service\n\n**Quick tip**: I automatically detect product names, so just type what you\'re looking for!';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Enter key pressed, sending message');
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
    }, 300); // Wait for animation to complete
  };

  const handleFullScreenToggle = () => {
    setIsExpanding(true);
    setTimeout(() => {
      setIsExpanding(false);
      setIsFullScreen(prev => !prev);
    }, 200);
  };

  return (
    <div className={`${isFullScreen ? 'fixed inset-0 z-[1000]' : 'fixed bottom-4 right-4 z-[1000]'}`}>
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="chat-window"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              ...(isExpanding && { scale: [0.95, 1] }),
              ...(isShrinking && { scale: [1, 0.98] })
            }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ 
              type: 'spring', 
              stiffness: 400, 
              damping: 25,
              ...(isExpanding && { duration: 0.4 }),
              ...(isShrinking && { duration: 0.3 })
            }}
            className={`${
              isFullScreen 
              ? 'fixed inset-0 z-[9999] w-full h-full max-w-none max-h-none rounded-none' 
              : 'fixed bottom-12 right-2 w-[95vw] sm:w-[420px] md:w-[480px] lg:w-[520px] xl:w-[560px] h-[85vh] sm:h-[580px] md:h-[620px] lg:h-[660px] max-w-[95vw] max-h-[90vh] z-[9999] rounded-xl'
          } bg-background dark:bg-gray-900 border border-border dark:border-gray-700 shadow-2xl dark:shadow-gray-900/50 flex flex-col overflow-hidden backdrop-blur-sm`}
          >
  

            {/* Header */}
            <div className={`${
              isFullScreen ? 'p-3 sm:p-4 md:p-6' : 'p-2 sm:p-3 md:p-4'
            } bg-gradient-to-r ${roleColors.gradient} text-white flex items-center justify-between min-h-[56px] sm:min-h-[64px]`}>
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <roleColors.icon className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-xs sm:text-sm md:text-base truncate">{roleColors.name}</h3>
                  <p className="text-xs opacity-80 truncate">
                    {isTyping ? 'Typing...' : 'Online'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 sm:h-8 sm:w-8 text-white hover:bg-white/20 dark:hover:bg-white/30" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Full screen toggle clicked, current state:', isFullScreen);
                    handleFullScreenToggle();
                  }}
                >
                  {isFullScreen ? <Shrink className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Expand className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 sm:h-8 sm:w-8 text-white hover:bg-white/20 dark:hover:bg-white/30" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Close button clicked');
                    handleClose();
                  }}
                >
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div ref={messagesContainerRef} className={`flex-1 ${
              isFullScreen ? 'p-3 sm:p-4 md:p-6 lg:p-8' : 'p-2 sm:p-3 md:p-4'
            } space-y-3 sm:space-y-4 overflow-y-auto custom-scrollbar bg-background/50 dark:bg-gray-800/50`}>
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
                  <div className={`${
                    isFullScreen 
                      ? 'max-w-[85%] sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl' 
                      : 'max-w-[85%] sm:max-w-xs md:max-w-sm lg:max-w-md'
                  } p-2.5 sm:p-3 rounded-2xl shadow-md ${
                    msg.isUser
                      ? 'bg-primary dark:bg-blue-600 text-primary-foreground dark:text-white rounded-br-lg'
                      : 'bg-muted dark:bg-gray-700 text-foreground dark:text-gray-100 rounded-bl-lg'
                  }`}>
                    {/* Render message content based on type */}
                    {msg.content && (
                      msg.content.includes('<div') || msg.content.includes('<html') ? (
                        <div 
                          className="text-xs sm:text-sm whitespace-pre-line leading-relaxed overflow-x-auto"
                          dangerouslySetInnerHTML={{ __html: msg.content }}
                        />
                      ) : (
                        <p className="text-xs sm:text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
                      )
                    )}

                    {/* Render Quick Actions */}
                    {msg.type === 'quick_actions' && (
                      <div className="space-y-2 pt-2">
                        <p className="text-xs sm:text-sm font-semibold text-foreground/80 mb-2">✨ Quick Actions</p>
                        {getRoleSpecificActions().map((action, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => handleRoleAction(action.action)}
                            disabled={isTyping}
                            className="w-full text-left justify-start h-auto py-1.5 sm:py-2 px-2 sm:px-3 bg-background/50 hover:bg-background/80 text-xs sm:text-sm"
                          >
                            <action.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{action.label}</span>
                          </Button>
                        ))}
                      </div>
                    )}
                    
                    <p className="text-xs opacity-60 mt-2 text-right">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>

                    {/* Render Product Search Results */}
                    {msg.type === 'product_search_results' && (
                      <div className="space-y-2 sm:space-y-3 pt-2">
                        {msg.productData?.products.map((product: WooCommerceProduct) => (
                          <div key={product.id} className="flex items-start gap-2 sm:gap-3 p-2 rounded-lg bg-background/50">
                            {product.images?.[0]?.src && (
                              <img src={product.images[0].src} alt={product.name} className="w-12 h-12 sm:w-16 sm:h-16 rounded-md object-cover flex-shrink-0"/>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-xs sm:text-sm truncate">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{formatProductPrice(product, /[\u0600-\u06FF]/.test(product.name))}</p>
                              <Button
                                size="sm"
                                variant="link"
                                className="p-0 h-auto text-primary mt-1 text-xs sm:text-sm"
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
                          <div className="space-y-2 sm:space-y-3" dir={isArabic ? 'rtl' : 'ltr'}>
                            {product.images && product.images[0] && (
                              <img 
                                src={product.images[0].src} 
                                alt={product.name}
                                className="w-full h-32 sm:h-48 rounded-lg object-cover"
                              />
                            )}
                            <h3 className={`font-bold text-base sm:text-lg ${textAlign}`}>
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
                            {/* Product Link Button */}
                            <div className="pt-3 mt-3 border-t border-border/50">
                              <Button
                                variant="default"
                                size="sm"
                                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                                onClick={() => window.open(product.permalink, '_blank')}
                              >
                                🔗 {isArabic ? 'زيارة المنتج على الموقع' : 'Visit Product on Website'}
                              </Button>
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
                  <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full flex-shrink-0 bg-gradient-to-br ${roleColors.gradient} flex items-center justify-center`}>
                    <roleColors.icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="p-2.5 sm:p-3 rounded-2xl bg-muted text-foreground rounded-bl-lg flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 bg-muted-foreground rounded-full animate-pulse delay-0"></span>
                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
              <div className={`${
                isFullScreen ? 'p-3 sm:p-4 md:p-6' : 'p-2 sm:p-3 md:p-4'
              } border-t border-border/50 bg-background/30 dark:bg-gray-800/30 relative`}>
                {/* Quick Actions Menu (above input) */}
                {showQuickActions && (
                  <div className={`absolute ${
                    isFullScreen ? 'bottom-16 sm:bottom-20' : 'bottom-14 sm:bottom-16'
                  } right-1 sm:right-2 z-50 w-[calc(100%-1rem)] sm:w-72 max-w-full bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-xl shadow-xl p-3 sm:p-4`}>
                    <p className="text-xs sm:text-sm font-semibold text-foreground/80 mb-2">✨ Quick Actions</p>
                    {getRoleSpecificActions().map((action, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => { setShowQuickActions(false); handleRoleAction(action.action); }}
                        disabled={isTyping}
                        className="w-full text-left justify-start h-auto py-2 px-2 sm:px-3 bg-background/50 hover:bg-background/80 mb-2 text-xs sm:text-sm"
                      >
                        <action.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{action.label}</span>
                      </Button>
                    ))}
                  </div>
                )}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="relative flex items-center gap-2 sm:gap-4"
                >
                  <Textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className={`w-full bg-muted dark:bg-gray-700 border-2 border-transparent focus:border-primary rounded-xl resize-none pr-16 sm:pr-24 md:pr-28 pl-2.5 sm:pl-3 custom-scrollbar ${
                      isFullScreen ? 'min-h-[44px] sm:min-h-[48px] text-sm sm:text-base' : 'min-h-[40px] sm:min-h-[44px] text-xs sm:text-sm'
                    }`}
                    rows={1}
                  />
                  {/* Quick Action Button inside input */}
                  <Button
                    type="button"
                    size="icon"
                    className={`h-6 w-6 sm:h-9 sm:w-14 rounded-lg bg-gradient-to-br ${roleColors.gradient} ${roleColors.hoverGradient} flex items-center justify-center transition-all duration-200 text-white`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowQuickActions((prev) => !prev);
                    }}
                    tabIndex={0}
                    aria-label="Quick Actions"
                  >
                    <span className="text-xs sm:text-lg">⚡</span>
                  </Button>
                  {/* Send Button */}
                  <Button
                    type="submit"
                    size="icon"
                    className={`h-6 w-6 sm:h-9 sm:w-14 rounded-lg bg-gradient-to-br ${roleColors.gradient} ${roleColors.hoverGradient} flex items-center justify-center transition-all duration-200`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSendMessage();
                    }}
                    disabled={isTyping || !inputValue.trim()}
                  >
                    <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="chat-button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onMouseEnter={() => {
                // Allow hover effects for Customer Service users only
                if (user?.position === 'Customer Service') {
                  setIsHovered(true);
                }
              }}
              onMouseLeave={() => {
                // Allow hover effects for Customer Service users only
                if (user?.position === 'Customer Service') {
                  setIsHovered(false);
                }
              }}
              onClick={() => {
                              // Allow Customer Service users only to open the chatbot (restored original functionality)
              if (user?.position === 'Customer Service') {
                  setIsOpen(true);
                } else {
                  // Show a toast notification for other users
                toast.info('🤖 Chatbot is only available for Customer Service users.', {
                  description: 'This chatbot is specifically designed for product search and customer support. Please contact your administrator if you need access.',
                    duration: 3000,
                  });
                }
              }}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r ${roleColors.gradient} shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-300 active:scale-95 border-2 border-white ${
                user?.position === 'Customer Service'
                  ? 'cursor-pointer hover:scale-110' 
                  : 'cursor-not-allowed opacity-60'
              }`}
            >
              <div className="relative">
                <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                {/* Animated pulse effect */}
                <div className={`absolute -inset-2 sm:-inset-3 rounded-full ${roleColors.pulse} opacity-20 animate-ping`}></div>
                {/* Secondary pulse */}
                <div className={`absolute -inset-1 rounded-full ${roleColors.secondaryPulse} opacity-40 animate-pulse`}></div>
              </div>

              {/* Notification dot */}
              <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};

export default FloatingChatbot; 