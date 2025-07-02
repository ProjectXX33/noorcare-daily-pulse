import React, { createContext, useContext, useState, useEffect } from 'react';
import wooCommerceAPI, { isWooCommerceConfigured } from '@/lib/woocommerceApi';
import { toast } from 'sonner';

export interface LoyalCustomer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  total_spent: number;
  orders_count: number;
  avg_order_value: number;
  first_order_date: string;
  last_order_date: string;
  loyalty_tier: 'Diamond' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze';
  avatar?: string;
}

interface LoyalCustomersContextType {
  customers: LoyalCustomer[];
  loading: boolean;
  error: string | null;
  progress: number;
  stage: string;
  details: string;
  startFetching: () => void;
  clearData: () => void;
}

const LoyalCustomersContext = createContext<LoyalCustomersContextType | undefined>(undefined);

export const LoyalCustomersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<LoyalCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [details, setDetails] = useState('');

  // Determine loyalty tier based on spending amount only
  const determineLoyaltyTier = (totalSpent: number, ordersCount: number): LoyalCustomer['loyalty_tier'] => {
    if (totalSpent > 3000) return 'Diamond';
    if (totalSpent > 2000) return 'Platinum';
    if (totalSpent > 1000) return 'Gold';
    if (totalSpent > 200) return 'Silver';
    return 'Bronze'; // 200 SAR or less
  };

  const fetchAllCustomers = async () => {
    try {
      console.log('🔄 fetchAllCustomers called - Current state:', { loading, customers: customers.length });
      
      setLoading(true);
      setError(null);
      setProgress(0);
      setStage('Loading All Customers');
      setDetails('Starting customer download...');

      console.log('🔄 Starting background customer fetch process...');

      // Fetch latest 5000 customers (increased limit)
      let allCustomers: any[] = [];
      let currentPage = 1;
      const perPage = 100;
      const maxCustomers = 5000; // Limit to latest 5000 customers
      let hasMore = true;

      while (hasMore && allCustomers.length < maxCustomers) {
        const pageCustomers = await wooCommerceAPI.fetchCustomers({
          per_page: perPage,
          page: currentPage,
          orderby: 'registered_date',
          order: 'desc' // Get newest customers first
        });

        allCustomers = [...allCustomers, ...pageCustomers];

        setProgress(Math.min(15 + (currentPage * 3), 60));
        setDetails(`Downloaded ${allCustomers.length} latest customers (page ${currentPage})...`);

        console.log(`📄 Fetched page ${currentPage}: ${pageCustomers.length} customers (total: ${allCustomers.length})`);

        if (pageCustomers.length < perPage || allCustomers.length >= maxCustomers) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }

      // Trim to exact limit if we got more
      if (allCustomers.length > maxCustomers) {
        allCustomers = allCustomers.slice(0, maxCustomers);
      }

      setProgress(60);
      setStage('🔍 Analyzing Latest Customer Data');
      setDetails(`Processing ${allCustomers.length} latest customers for spending analysis...`);

      const allCustomersData: LoyalCustomer[] = [];
      let processedCount = 0;
      const batchSize = 3; // Even smaller batches for faster UI updates
      const totalBatches = Math.ceil(allCustomers.length / batchSize);

      for (let i = 0; i < allCustomers.length; i += batchSize) {
        const batch = allCustomers.slice(i, Math.min(i + batchSize, allCustomers.length));
        const currentBatch = Math.floor(i / batchSize) + 1;

        // Update progress more frequently for better UX
        const batchProgress = 60 + ((currentBatch - 1) / totalBatches) * 25;
        setProgress(Math.round(batchProgress));
        setStage('📊 Processing Customer Orders');
        setDetails(`Processing batch ${currentBatch}/${totalBatches} - Found ${allCustomersData.length} customers with orders`);

        // Process batch in parallel
        const batchPromises = batch.map(async (customer) => {
          try {
            processedCount++;
            const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email;
            
            // Update details with current customer being processed (only for first customer in batch)
            if (batch.indexOf(customer) === 0) {
              setDetails(`Processing ${customerName} (${processedCount}/${allCustomers.length})...`);
            }
            
            console.log(`Processing customer ${processedCount}/${allCustomers.length}: ${customer.email}`);

            if (!customer.email || (!customer.first_name && !customer.last_name) || !customer.is_paying_customer) {
              return null; // Skip customers who haven't made purchases
            }

            // Fetch ALL orders for this customer (no date restrictions for all-time data)
            let allOrders: any[] = [];
            let orderPage = 1;
            let hasMoreOrders = true;
            
            // Fetch orders more efficiently - limit to recent orders for speed
            const orders = await wooCommerceAPI.fetchOrdersForCustomer(customer.id, {
              per_page: 100, // Get more orders in single request
              page: 1, // Only first page for speed
              status: 'completed',
              orderby: 'date',
              order: 'desc'
            });
            
            allOrders = orders; // Use only the most recent 100 orders for faster processing

            const completedOrders = allOrders.filter(order => order.status === 'completed');
            const totalSpent = completedOrders.reduce((sum, order) => sum + parseFloat(order.total || '0'), 0);
            const ordersCount = completedOrders.length;
            const avgOrderValue = ordersCount > 0 ? totalSpent / ordersCount : 0;

            // Include ALL customers with orders (for all-time analysis)
            if (ordersCount > 0) {
              const firstOrder = completedOrders.sort((a, b) => 
                new Date(a.date_created).getTime() - new Date(b.date_created).getTime()
              )[0];
              
              const lastOrder = completedOrders.sort((a, b) => 
                new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
              )[0];

              return {
                id: customer.id,
                name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email,
                email: customer.email,
                phone: customer.billing?.phone || '',
                address: `${customer.billing?.city || ''}, ${customer.billing?.country || ''}`.replace(', ,', '').trim(),
                total_spent: Math.round(totalSpent),
                orders_count: ordersCount,
                avg_order_value: Math.round(avgOrderValue),
                first_order_date: firstOrder.date_created.split('T')[0],
                last_order_date: lastOrder.date_created.split('T')[0],
                loyalty_tier: determineLoyaltyTier(totalSpent, ordersCount),
                avatar: customer.avatar_url || ''
              };
            }
            return null;
          } catch (customerError) {
            console.warn(`Error processing customer ${customer.id}:`, customerError.message);
            return null;
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            allCustomersData.push(result.value);
          }
        });

        console.log(`✅ Batch ${currentBatch} complete. Found ${allCustomersData.length} customers with orders.`);
      }

      // Final sorting by spending and take top 100
      setProgress(85);
      setStage('🏆 Ranking Top 100 Customers');
      setDetails('Sorting by total spending to find top 100...');

      const sortedCustomers = allCustomersData
        .sort((a, b) => {
          // Primary sort: total spent (descending)
          if (b.total_spent !== a.total_spent) {
            return b.total_spent - a.total_spent;
          }
          // Secondary sort: number of orders (descending)
          return b.orders_count - a.orders_count;
        })
        .slice(0, 100); // Take top 100 customers

      setProgress(100);
      setStage('✅ Complete');
      setDetails(`Successfully loaded top ${sortedCustomers.length} loyal customers!`);

      console.log(`✅ Found top ${sortedCustomers.length} loyal customers from ${processedCount} latest customers checked`);
      console.log(`💰 Top customer spent: ${sortedCustomers[0]?.total_spent || 0} SAR with ${sortedCustomers[0]?.orders_count || 0} orders`);

      setCustomers(sortedCustomers);

      if (sortedCustomers.length > 0) {
        toast.success(`Loaded top ${sortedCustomers.length} loyal customers from latest 5000 customers`);
      } else {
        throw new Error('No customers with orders found in WooCommerce.');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Unknown error occurred';
      
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_NETWORK')) {
        errorMessage = 'Network connection failed. Please check your internet connection and try again.';
      } else if (error.message.includes('timeout') || error.message.includes('AbortError')) {
        errorMessage = 'Request timed out. The server may be slow with large datasets. Please try again.';
      } else if (error.message.includes('HTML page') || error.message.includes('<!DOCTYPE')) {
        errorMessage = 'WooCommerce REST API configuration issue. Please verify the API is enabled on your store.';
      } else if (error.message.includes('401') || error.message.includes('authentication')) {
        errorMessage = 'Authentication failed. Please check your WooCommerce API credentials.';
      } else if (error.message.includes('403') || error.message.includes('forbidden')) {
        errorMessage = 'Access denied. Please check your WooCommerce API permissions.';
      } else if (error.message.includes('404')) {
        errorMessage = 'WooCommerce API endpoint not found. Please check your store URL and API configuration.';
      } else {
        errorMessage = `Failed to load customer data: ${error.message}`;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const startFetching = () => {
    if (!isWooCommerceConfigured()) {
      setError('WooCommerce API is not configured. Please check your settings.');
      return;
    }

    // Prevent multiple simultaneous requests
    if (loading) {
      console.log('🚫 Fetch already in progress, ignoring duplicate request');
      return;
    }

    console.log('🚀 Starting fresh customer fetch process...');
    
    // Test API connection first
    wooCommerceAPI.testConnection()
      .then((isConnected) => {
        if (!isConnected) {
          setError('Unable to connect to WooCommerce API. Please check your internet connection and try again.');
          return;
        }
        
        // If connection test passes, start fetching
        fetchAllCustomers();
      })
      .catch((error) => {
        console.error('🔥 WooCommerce connection test failed:', error);
        setError(`Connection test failed: ${error.message}`);
      });
  };

  const clearData = () => {
    setCustomers([]);
    setError(null);
    setProgress(0);
    setStage('');
    setDetails('');
  };

  const contextValue: LoyalCustomersContextType = {
    customers,
    loading,
    error,
    progress,
    stage,
    details,
    startFetching,
    clearData
  };

  return (
    <LoyalCustomersContext.Provider value={contextValue}>
      {children}
    </LoyalCustomersContext.Provider>
  );
};

export const useLoyalCustomers = () => {
  const context = useContext(LoyalCustomersContext);
  if (context === undefined) {
    throw new Error('useLoyalCustomers must be used within a LoyalCustomersProvider');
  }
  return context;
}; 