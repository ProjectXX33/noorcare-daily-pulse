import React, { createContext, useContext, useState, useEffect } from 'react';
import wooCommerceAPI from '@/lib/woocommerceApi';
import { toast } from 'sonner';

export interface Product {
  id: number;
  name: string;
  sku: string;
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
}

interface StrategyContextType {
  products: Product[];
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
}

const StrategyContext = createContext<StrategyContextType | undefined>(undefined);

export const StrategyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [insights, setInsights] = useState<StrategyInsight[]>([]);
  const [stats, setStats] = useState<StrategyStats>({
    total_products: 0,
    total_revenue: 0,
    best_performers: 0,
    worst_performers: 0,
    avg_conversion: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [details, setDetails] = useState('');

  const fetchStrategyData = async () => {
    try {
      console.log('🔄 fetchStrategyData called - Current state:', { loading, products: products.length });
      
      setLoading(true);
      setError(null);
      setProgress(0);
      setStage('🔌 Connecting to WooCommerce API...');
      setDetails('Initializing product data analysis...');

      console.log('🔄 Starting background strategy fetch process...');

      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setProgress(15);
      
      setStage('📦 Fetching product data from store...');
      setDetails('Downloading product catalog...');
      
      // Fetch products from WooCommerce
      const wooProducts = await wooCommerceAPI.fetchProducts({
        per_page: 100,
        status: 'publish',
        orderby: 'total_sales',
        order: 'desc'
      });
      
      setProgress(45);
      setStage('⚡ Processing product data...');
      setDetails(`Analyzing ${wooProducts.length} products...`);

      // Convert WooCommerce products to our Product interface
      const convertedProducts: Product[] = wooProducts.map((wooProduct, index) => {
        // Update progress during processing
        if (index % 10 === 0) {
          const processingProgress = 45 + (index / wooProducts.length) * 30;
          setProgress(processingProgress);
          setDetails(`🧮 Analyzing product ${index + 1}/${wooProducts.length}...`);
        }
        
        const price = parseFloat(wooProduct.price || wooProduct.regular_price || '0');
        const totalSales = wooProduct.total_sales || 0;
        const revenue = price * totalSales;
        
        // Calculate profit margin (assuming 20% default)
        const profitMargin = wooProduct.on_sale ? 10 : 20;
        
        // Calculate conversion rate based on rating and sales
        const rating = parseFloat(wooProduct.average_rating || '0');
        const conversionRate = Math.min(rating * 2 + (totalSales / 10), 15);
        
        // Determine trend based on recent activity
        const lastModified = new Date(wooProduct.date_modified);
        const daysSinceModified = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24);
        const trend = daysSinceModified < 7 ? 'up' : daysSinceModified < 30 ? 'stable' : 'down';
        
        // Determine campaign performance
        let performance: 'excellent' | 'good' | 'average' | 'poor' | 'terrible';
        if (totalSales > 50 && rating > 4.5) performance = 'excellent';
        else if (totalSales > 20 && rating > 4.0) performance = 'good';
        else if (totalSales > 10 && rating > 3.5) performance = 'average';
        else if (totalSales > 5) performance = 'poor';
        else performance = 'terrible';

        return {
          id: wooProduct.id,
          name: wooProduct.name,
          sku: wooProduct.sku || '',
          total_sales: totalSales,
          quantity_sold: totalSales,
          revenue: revenue,
          profit_margin: profitMargin,
          conversion_rate: conversionRate,
          views: totalSales * 10, // Estimate views
          category: wooProduct.categories[0]?.name || 'Uncategorized',
          stock_status: wooProduct.stock_status === 'instock' ? 'in_stock' : 
                       wooProduct.stock_status === 'outofstock' ? 'out_of_stock' : 'low_stock',
          rating: rating,
          reviews_count: wooProduct.rating_count || 0,
          last_sale_date: wooProduct.date_modified,
          trend: trend,
          campaign_performance: performance
        };
      });

      setProgress(75);
      setStage('🎯 Generating strategic insights...');
      setDetails('Creating performance recommendations...');
      
      // Generate insights based on real data
      const generatedInsights: StrategyInsight[] = [
         {
           type: 'best_performer' as const,
           title: 'Top Campaign Winners',
           description: 'Products with highest sales and ratings from your WooCommerce store',
           products: convertedProducts
             .filter(p => p.campaign_performance === 'excellent')
             .slice(0, 3),
           action: 'Scale these successful products with increased budget allocation',
           priority: 'high' as const
         },
         {
           type: 'opportunity' as const,
           title: 'High Potential Products',
           description: 'Products with good ratings but low sales - opportunity for growth',
           products: convertedProducts
             .filter(p => p.rating > 4.0 && p.total_sales < 20)
             .slice(0, 3),
           action: 'Create targeted marketing campaigns to boost visibility',
           priority: 'medium' as const
         },
         {
           type: 'worst_performer' as const,
           title: 'Products Needing Attention',
           description: 'Products with poor performance that need optimization',
           products: convertedProducts
             .filter(p => p.campaign_performance === 'poor' || p.campaign_performance === 'terrible')
             .slice(0, 3),
           action: 'Review pricing, improve descriptions, or consider discontinuation',
           priority: 'high' as const
         },
         {
           type: 'risk' as const,
           title: 'Stock Management Alert',
           description: 'Products that may have inventory issues',
           products: convertedProducts
             .filter(p => p.stock_status === 'low_stock' || p.stock_status === 'out_of_stock')
             .slice(0, 3),
           action: 'Coordinate with inventory team to restock popular items',
           priority: 'medium' as const
         }
       ].filter(insight => insight.products.length > 0); // Only include insights with products

      setProgress(90);
      setStage('📊 Calculating performance metrics...');
      setDetails('Finalizing strategy dashboard...');
      
      const calculatedStats: StrategyStats = {
        total_products: convertedProducts.length,
        total_revenue: convertedProducts.reduce((sum, p) => sum + p.revenue, 0),
        best_performers: convertedProducts.filter(p => p.campaign_performance === 'excellent').length,
        worst_performers: convertedProducts.filter(p => p.campaign_performance === 'poor' || p.campaign_performance === 'terrible').length,
        avg_conversion: convertedProducts.reduce((sum, p) => sum + p.conversion_rate, 0) / convertedProducts.length
      };

      setProgress(100);
      setStage('✅ Strategy analysis complete!');
      setDetails(`Successfully analyzed ${convertedProducts.length} products`);
      
      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setProducts(convertedProducts);
      setInsights(generatedInsights);
      setStats(calculatedStats);

      console.log(`✅ Strategy analysis complete: ${convertedProducts.length} products analyzed`);
      console.log(`💰 Total revenue: ${calculatedStats.total_revenue} SAR`);

      if (convertedProducts.length > 0) {
        toast.success(`🎯 Strategy Analysis Complete! Loaded ${convertedProducts.length} products from WooCommerce.`);
      } else {
        throw new Error('No products found in WooCommerce store.');
      }
    } catch (error: any) {
      console.error('Error fetching strategy data:', error);
      setError(error.message);
      setStage('❌ Analysis failed');
      setProgress(0);
      
      // More specific error handling
      if (error.message?.includes('timeout') || error.name === 'AbortError') {
        toast.error('⏱️ Request timed out. Please check your internet connection and try again.');
      } else if (error.message?.includes('CORS') || error.message?.includes('Failed to fetch')) {
        toast.error('🚫 Unable to connect to WooCommerce API. Please check your API configuration.');
      } else {
        toast.error(`❌ Failed to load strategy data: ${error.message}`);
      }
      
      // Reset to empty state
      setProducts([]);
      setInsights([]);
      setStats({
        total_products: 0,
        total_revenue: 0,
        best_performers: 0,
        worst_performers: 0,
        avg_conversion: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const startFetching = () => {
    // Prevent multiple simultaneous requests
    if (loading) {
      console.log('🚫 Fetch already in progress, ignoring duplicate request');
      return;
    }

    console.log('🚀 Starting fresh strategy fetch process...');
    fetchStrategyData();
  };

  const clearData = () => {
    setProducts([]);
    setInsights([]);
    setStats({
      total_products: 0,
      total_revenue: 0,
      best_performers: 0,
      worst_performers: 0,
      avg_conversion: 0
    });
    setError(null);
    setProgress(0);
    setStage('');
    setDetails('');
    setLoading(false);
  };

  const refreshData = () => {
    clearData();
    startFetching();
  };

  // Auto-start fetching when component mounts
  useEffect(() => {
    if (products.length === 0 && !loading && !error) {
      console.log('🔄 Auto-starting strategy data fetch on mount');
      startFetching();
    }
  }, []);

  const value: StrategyContextType = {
    products,
    insights,
    stats,
    loading,
    error,
    progress,
    stage,
    details,
    startFetching,
    clearData,
    refreshData
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