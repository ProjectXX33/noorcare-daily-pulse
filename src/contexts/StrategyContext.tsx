import React, { createContext, useContext, useState, useEffect } from 'react';
import wooCommerceAPI from '@/lib/woocommerceApi';
import { toast } from 'sonner';

export interface Product {
  id: number;
  name: string;
  sku: string;
  slug?: string;
  description?: string;
  short_description?: string;
  images?: any[];
  total_sales: number;
  quantity_sold: number;
  revenue: number;
  profit_margin: number;
  conversion_rate: number;
  views: number;
  category: string;
  stock_status: string;
  rating: number;
  reviews_count: number;
  last_sale_date: string;
  trend: 'up' | 'down' | 'stable';
  campaign_performance: 'excellent' | 'good' | 'average' | 'poor' | 'terrible';
  permalink: string;
  language?: string;
}

export interface Order {
  id: number;
  number: string;
  status: string;
  total: number;
  date_created: string;
  date_completed: string;
  line_items: any[];
  customer_id: number;
}

export interface StrategyInsight {
  type: 'best_performer' | 'worst_performer' | 'opportunity' | 'risk';
  title: string;
  description: string;
  products: Product[];
  action: string;
  priority: 'high' | 'medium' | 'low';
}

export interface StrategyStats {
  total_products: number;
  total_revenue: number;
  best_performers: number;
  worst_performers: number;
  avg_conversion: number;
  total_orders: number;
  monthly_orders: number;
}

interface StrategyContextType {
  products: Product[];
  orders: Order[];
  insights: StrategyInsight[];
  stats: StrategyStats;
  loading: boolean;
  error: string | null;
  progress: number;
  stage: string;
  details: string;
  startFetching: () => void;
  clearData: () => void;
  refreshData: () => void;
  isBackgroundProcessing: boolean;
}

const StrategyContext = createContext<StrategyContextType | undefined>(undefined);

const STORAGE_KEY = 'strategy_data_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export const StrategyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [insights, setInsights] = useState<StrategyInsight[]>([]);
  const [stats, setStats] = useState<StrategyStats>({
    total_products: 0,
    total_revenue: 0,
    best_performers: 0,
    worst_performers: 0,
    avg_conversion: 0,
    total_orders: 0,
    monthly_orders: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [details, setDetails] = useState('');
  const [isBackgroundProcessing, setIsBackgroundProcessing] = useState(false);

  // Load from localStorage on component mount
  useEffect(() => {
    const loadFromCache = () => {
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const now = Date.now();
          
          if (now - timestamp < CACHE_DURATION) {
            console.log('📦 Loading strategy data from cache...');
            setProducts(data.products || []);
            setOrders(data.orders || []);
            setInsights(data.insights || []);
            setStats(data.stats || {});
            toast.success(`📦 Loaded ${data.products?.length || 0} products and ${data.orders?.length || 0} orders from cache`);
            return true;
          } else {
            console.log('🗑️ Cache expired, removing old data...');
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error('Error loading from cache:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
      return false;
    };

    const hasCache = loadFromCache();
    if (!hasCache && products.length === 0 && orders.length === 0) {
      console.log('🚀 No cache found, starting fresh fetch...');
      fetchStrategyData();
    }
  }, []);

  // Save to localStorage when data changes
  const saveToCache = (products: Product[], orders: Order[], insights: StrategyInsight[], stats: StrategyStats) => {
    try {
      const cacheData = {
        data: { products, orders, insights, stats },
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData));
      console.log('💾 Strategy data saved to cache');
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  const fetchAllOrders = async (): Promise<any[]> => {
    setDetails('📊 Fetching ALL completed orders...');
    
    try {
      // Use the new fetchAllOrders method that handles ALL pagination automatically
      const allOrders = await wooCommerceAPI.fetchAllOrders({
        status: 'completed',
        maxOrders: 50000 // Increased limit to get all orders
      });
      
      console.log(`✅ Successfully fetched ${allOrders.length} completed orders`);
      setDetails(`✅ Loaded ${allOrders.length} completed orders successfully`);
      
      return allOrders;
      
    } catch (error: any) {
      console.error('❌ Error fetching all orders:', error);
      throw error;
    }
  };

  const fetchAllProducts = async (): Promise<any[]> => {
    setDetails('📊 Fetching ALL products...');
    
    try {
      // Use the new fetchAllProducts method that handles ALL pagination automatically
      const allProducts = await wooCommerceAPI.fetchAllProducts({
        status: 'publish',
        orderby: 'menu_order',
        order: 'asc',
        maxProducts: 10000 // Increased limit to get all products
      });
      
      console.log(`✅ Successfully fetched ${allProducts.length} products`);
      setDetails(`✅ Loaded ${allProducts.length} products successfully`);
      
      return allProducts;
      
    } catch (error: any) {
      console.error('❌ Error fetching all products:', error);
      throw error;
    }
  };

  const fetchStrategyData = async () => {
    try {
      console.log('🔄 fetchStrategyData called - Loading completed orders and products...');
      
      setLoading(true);
      setIsBackgroundProcessing(true);
      setError(null);
      setProgress(0);
      setStage('🔌 Connecting to WooCommerce API...');
      setDetails('Testing connection and preparing for order analysis...');

      console.log('🔄 Starting background strategy fetch process...');

      // Test connection first
      setProgress(5);
      const connectionOk = await wooCommerceAPI.testConnection();
      if (!connectionOk) {
        throw new Error('Unable to connect to WooCommerce API. Please check your API configuration and server status.');
      }

      // Progressive loading - all in one smooth process
      setProgress(5);
      setStage('🚀 Initializing strategy analysis...');
      setDetails('Preparing to analyze your business data...');
      
      await new Promise(resolve => setTimeout(resolve, 200));
      setProgress(10);
      
      // Fetch everything in parallel for faster loading
      setStage('📊 Fetching all business data...');
      setDetails('Loading orders and products simultaneously...');
      
      let wooOrders: any[] = [];
      let wooProducts: any[] = [];
      let ordersAccessible = true;
      
      try {
        // Fetch both orders and products in parallel
        setProgress(15);
        const [ordersResult, productsResult] = await Promise.allSettled([
          fetchAllOrders(),
          fetchAllProducts()
        ]);
        
        setProgress(35);
        
        // Handle orders result
        if (ordersResult.status === 'fulfilled') {
          wooOrders = ordersResult.value;
          console.log(`✅ Successfully fetched ${wooOrders.length} orders`);
          setProgress(45);
        } else {
          console.warn('⚠️ Orders not accessible, using product-based analysis:', ordersResult.reason?.message);
          ordersAccessible = false;
          wooOrders = [];
          setProgress(40);
        }
        
        // Handle products result
        if (productsResult.status === 'fulfilled') {
          wooProducts = productsResult.value;
          console.log(`✅ Successfully fetched ${wooProducts.length} products`);
          setProgress(55);
        } else {
          throw new Error(`Failed to fetch products: ${productsResult.reason?.message}`);
        }
        
      } catch (error: any) {
        console.error('❌ Failed to fetch data:', error);
        throw error;
      }

      setProgress(60);
      setStage('⚡ Processing order and product data...');
      setDetails(`Analyzing ${wooOrders.length} orders and ${wooProducts.length} products...`);

      // Create product performance map based on available data
      const productOrderMap = new Map<number, { quantity: number, revenue: number, orderCount: number }>();
      
      if (ordersAccessible && wooOrders.length > 0) {
        // Process orders to calculate real product performance
        wooOrders.forEach(order => {
          order.line_items?.forEach((item: any) => {
            const productId = item.product_id;
            const quantity = item.quantity || 0;
            const revenue = parseFloat(item.total || '0');
            
            if (productOrderMap.has(productId)) {
              const existing = productOrderMap.get(productId)!;
              productOrderMap.set(productId, {
                quantity: existing.quantity + quantity,
                revenue: existing.revenue + revenue,
                orderCount: existing.orderCount + 1
              });
            } else {
              productOrderMap.set(productId, {
                quantity: quantity,
                revenue: revenue,
                orderCount: 1
              });
            }
          });
        });
        console.log(`📊 Processed ${wooOrders.length} orders for product performance mapping`);
      } else {
        console.log('📊 Using product total_sales data for performance analysis');
      }

      // Convert products with real order data - smooth progress
      const convertedProducts: Product[] = wooProducts.map((wooProduct, index) => {
        if (index % 10 === 0) {
          const processingProgress = 60 + (index / wooProducts.length) * 25; // 60% to 85%
          setProgress(Math.round(processingProgress));
          setDetails(`🧮 Processing product ${index + 1}/${wooProducts.length}...`);
        }
        
        const productId = wooProduct.id;
        const orderData = productOrderMap.get(productId) || { quantity: 0, revenue: 0, orderCount: 0 };
        
        // Use order data if available, otherwise fall back to product total_sales
        const totalSalesFromProduct = wooProduct.total_sales || 0;
        const realSales = ordersAccessible && orderData.quantity > 0 ? orderData.quantity : totalSalesFromProduct;
        const realRevenue = ordersAccessible && orderData.revenue > 0 ? orderData.revenue : 
                           (parseFloat(wooProduct.price || wooProduct.regular_price || '0') * realSales);
        const orderCount = ordersAccessible ? orderData.orderCount : (realSales > 0 ? Math.ceil(realSales / 2) : 0);
        
        const rating = parseFloat(wooProduct.average_rating || '0');
        
        // Calculate performance based on available sales data (orders or products) - More optimized classification
        let performance: 'excellent' | 'good' | 'average' | 'poor' | 'terrible';
        
        // Use dynamic thresholds based on the overall sales distribution
        // This prevents everything from being classified as poor/terrible
        const totalSalesValue = realSales + (rating * 5); // Combine sales and rating for better scoring
        const priceValue = parseFloat(wooProduct.price || wooProduct.regular_price || '0');
        const revenueScore = realRevenue / Math.max(priceValue, 1); // Revenue relative to price
        
        // More balanced classification system
        if ((realSales >= 15 && rating >= 4.0) || (realSales >= 25 && rating >= 3.5) || totalSalesValue >= 35) {
          performance = 'excellent';
        } else if ((realSales >= 8 && rating >= 3.5) || (realSales >= 12 && rating >= 3.0) || totalSalesValue >= 25) {
          performance = 'good';
        } else if ((realSales >= 3 && rating >= 3.0) || (realSales >= 5 && rating >= 2.5) || totalSalesValue >= 15) {
          performance = 'average';
        } else if (realSales >= 1 || rating >= 2.0 || totalSalesValue >= 5) {
          performance = 'poor';
        } else {
          performance = 'terrible';
        }

        // Better trend calculation
        const lastModified = new Date(wooProduct.date_modified);
        const daysSinceModified = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24);
        const trend = realSales > 0 && daysSinceModified < 30 ? 'up' : realSales > 0 ? 'stable' : 'down';

        return {
          id: productId,
          name: wooProduct.name,
          sku: wooProduct.sku || '',
          slug: wooProduct.slug || '',
          description: wooProduct.description || '',
          short_description: wooProduct.short_description || '',
          images: wooProduct.images || [],
          total_sales: realSales, // Real sales from completed orders
          quantity_sold: realSales,
          revenue: realRevenue, // Real revenue from completed orders
          profit_margin: 20, // Default margin
          conversion_rate: Math.min(rating * 2 + orderCount, 15),
          views: realSales * 15, // Estimate views
          category: wooProduct.categories?.[0]?.name || 'Uncategorized',
          stock_status: wooProduct.stock_status === 'instock' ? 'in_stock' : 
                       wooProduct.stock_status === 'outofstock' ? 'out_of_stock' : 'low_stock',
          rating: rating,
          reviews_count: wooProduct.rating_count || 0,
          last_sale_date: wooProduct.date_modified,
          trend: trend,
          campaign_performance: performance,
          permalink: wooProduct.permalink || `https://noorcaregcc.com/product/${wooProduct.slug || wooProduct.id}`,
          language: wooProduct.language || (wooProduct.sku && wooProduct.sku.endsWith('-ar') ? 'ar' : 'en')
        };
      });

      // Convert orders
      const convertedOrders: Order[] = wooOrders.map(order => ({
        id: order.id,
        number: order.number,
        status: order.status,
        total: parseFloat(order.total || '0'),
        date_created: order.date_created,
        date_completed: order.date_completed || order.date_created,
        line_items: order.line_items || [],
        customer_id: order.customer_id || 0
      }));

      setProgress(86);
      setStage('🎯 Generating strategic insights...');
      setDetails('Creating performance recommendations from real order data...');
      
             // Generate insights based on real order performance with improved thresholds
       const generatedInsights: StrategyInsight[] = [
          {
            type: 'best_performer' as const,
            title: 'Top Performing Products',
            description: 'Your highest-selling products with strong performance metrics',
            products: convertedProducts
              .filter(p => p.campaign_performance === 'excellent' || p.campaign_performance === 'good')
              .sort((a, b) => (b.total_sales * b.rating) - (a.total_sales * a.rating))
              .slice(0, 5),
            action: 'Scale these successful products with increased marketing budget and inventory',
            priority: 'high' as const
          },
          {
            type: 'opportunity' as const,
            title: 'Growth Opportunities',
            description: 'Products with good ratings or recent activity but room for sales growth',
            products: convertedProducts
              .filter(p => 
                (p.rating >= 3.5 && p.total_sales < 10) || 
                (p.campaign_performance === 'average' && p.rating >= 3.0)
              )
              .sort((a, b) => b.rating - a.rating)
              .slice(0, 5),
            action: 'Create targeted marketing campaigns and optimize product descriptions',
            priority: 'medium' as const
          },
          {
            type: 'worst_performer' as const,
            title: 'Products Needing Review',
            description: 'Products with low performance that may need optimization',
            products: convertedProducts
              .filter(p => p.campaign_performance === 'terrible' || (p.campaign_performance === 'poor' && p.rating < 2.5))
              .sort((a, b) => a.total_sales - b.total_sales)
              .slice(0, 5),
            action: 'Review pricing, improve descriptions, enhance images, or consider discontinuation',
            priority: 'medium' as const
          },
          {
            type: 'risk' as const,
            title: 'Inventory & Stock Alerts',
            description: 'Products that may have inventory or availability issues',
            products: convertedProducts
              .filter(p => 
                p.stock_status === 'low_stock' || 
                p.stock_status === 'out_of_stock' ||
                (p.campaign_performance === 'good' && p.stock_status !== 'in_stock')
              )
              .slice(0, 5),
            action: 'Coordinate with inventory team to restock popular items and maintain availability',
            priority: 'high' as const
          }
        ].filter(insight => insight.products.length > 0);

      setProgress(92);
      setStage('📊 Calculating performance metrics...');
      setDetails('Finalizing strategy dashboard with real data...');

      // Calculate monthly orders (if available)
      let monthlyOrders = 0;
      if (ordersAccessible && convertedOrders.length > 0) {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        monthlyOrders = convertedOrders.filter(order => {
          const orderDate = new Date(order.date_completed);
          return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
        }).length;
      } else {
        // Estimate monthly orders from recent product activity
        const recentlyActiveProducts = convertedProducts.filter(p => {
          const lastModified = new Date(p.last_sale_date);
          const daysSince = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24);
          return daysSince <= 30 && p.total_sales > 0;
        });
        monthlyOrders = Math.round(recentlyActiveProducts.reduce((sum, p) => sum + p.total_sales, 0) * 0.1); // 10% of total sales as monthly estimate
      }
      
      const calculatedStats: StrategyStats = {
        total_products: convertedProducts.length,
        total_revenue: convertedProducts.reduce((sum, p) => sum + p.revenue, 0),
        best_performers: convertedProducts.filter(p => p.campaign_performance === 'excellent').length,
        worst_performers: convertedProducts.filter(p => p.campaign_performance === 'poor' || p.campaign_performance === 'terrible').length,
        avg_conversion: convertedProducts.length > 0 ? convertedProducts.reduce((sum, p) => sum + p.conversion_rate, 0) / convertedProducts.length : 0,
        total_orders: convertedOrders.length,
        monthly_orders: monthlyOrders
      };

      setProgress(97);
      setStage('✅ Strategy analysis complete!');
      setDetails(`Successfully analyzed ${convertedOrders.length} orders and ${convertedProducts.length} products`);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setProducts(convertedProducts);
      setOrders(convertedOrders);
      setInsights(generatedInsights);
      setStats(calculatedStats);

      // Save to cache
      saveToCache(convertedProducts, convertedOrders, generatedInsights, calculatedStats);

      console.log(`✅ Strategy analysis complete: ${convertedOrders.length} orders and ${convertedProducts.length} products analyzed`);
      console.log(`💰 Total revenue: ${calculatedStats.total_revenue} SAR`);

      if (ordersAccessible && convertedOrders.length > 0) {
        toast.success(`🎯 Strategy Analysis Complete! Analyzed ${convertedOrders.length} orders and ${convertedProducts.length} products.`);
      } else if (convertedProducts.length > 0) {
        toast.success(`🎯 Strategy Analysis Complete! Analyzed ${convertedProducts.length} products (orders not accessible).`);
      } else {
        throw new Error('No products found in WooCommerce store.');
      }
      
      setProgress(100);
      
    } catch (error: any) {
      console.error('Error fetching strategy data:', error);
      setError(error.message);
      setStage('❌ Analysis failed');
      setProgress(0);
      
      if (error.message?.includes('HTML page') || error.message?.includes('<!DOCTYPE')) {
        toast.error('🚫 WooCommerce API configuration error. Please check your REST API settings.');
        setError('WooCommerce REST API is not properly configured. Please contact your administrator.');
      } else if (error.message?.includes('timeout') || error.name === 'AbortError') {
        toast.error(`⏱️ Server timeout loading order data. Try refreshing or contact your hosting provider.`);
        setError('API request timed out. Your server may be slow handling large datasets.');
      } else if (error.message?.includes('CORS') || error.message?.includes('Failed to fetch')) {
        toast.error('🚫 Unable to connect to WooCommerce API. Please check your server configuration.');
        setError('Connection failed. Check your WooCommerce API configuration and server status.');
      } else {
        toast.error(`❌ Failed to load strategy data: ${error.message}`);
        setError(error.message);
      }
      
      // Reset to empty state
      setProducts([]);
      setOrders([]);
      setInsights([]);
      setStats({
        total_products: 0,
        total_revenue: 0,
        best_performers: 0,
        worst_performers: 0,
        avg_conversion: 0,
        total_orders: 0,
        monthly_orders: 0
      });
    } finally {
      setLoading(false);
      setIsBackgroundProcessing(false);
    }
  };

  const startFetching = () => {
    if (loading) {
      console.log('🚫 Fetch already in progress, ignoring duplicate request');
      return;
    }

    console.log('🚀 Starting fresh strategy fetch process...');
    fetchStrategyData();
  };

  const clearData = () => {
    setProducts([]);
    setOrders([]);
    setInsights([]);
    setStats({
      total_products: 0,
      total_revenue: 0,
      best_performers: 0,
      worst_performers: 0,
      avg_conversion: 0,
      total_orders: 0,
      monthly_orders: 0
    });
    setError(null);
    setProgress(0);
    setStage('');
    setDetails('');
    setLoading(false);
    setIsBackgroundProcessing(false);
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ Strategy data cleared');
  };

  const refreshData = () => {
    clearData();
    startFetching();
  };

  const value: StrategyContextType = {
    products,
    orders,
    insights,
    stats,
    loading,
    error,
    progress,
    stage,
    details,
    startFetching,
    clearData,
    refreshData,
    isBackgroundProcessing
  };

  return (
    <StrategyContext.Provider value={value}>
      {children}
    </StrategyContext.Provider>
  );
};

export const useStrategy = () => {
  const context = useContext(StrategyContext);
  if (context === undefined) {
    throw new Error('useStrategy must be used within a StrategyProvider');
  }
  return context;
}; 