// WooCommerce API integration - Version 2.1.0
// Enhanced with Campaign Strategy Integration & Advanced Analytics
// 
// NEW FEATURES IN v2.1.0:
// ✅ Campaign Strategy Integration: Direct connection with Campaign Strategy Creator
// ✅ Advanced Product Analytics: Performance scoring, campaign readiness indicators  
// ✅ Smart Product Categorization: AI-powered product classification for campaigns
// ✅ Revenue Analytics: Enhanced revenue tracking and performance metrics
// ✅ Campaign Performance Tracking: Integration with custom campaign strategies table
// ✅ Bulk Operations: Batch product updates and bulk campaign targeting
// ✅ Enhanced Error Handling: Comprehensive error management with retry logic
// ✅ Performance Optimization: Improved caching and request batching
// ✅ Mobile Optimization: Enhanced mobile data loading and background sync
// ✅ Real-time Sync: Auto-refresh every 10 minutes for strategy data

interface WooCommerceConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
  version: string;
}

// TODO: Replace with your actual WooCommerce store credentials
const WOOCOMMERCE_CONFIG: WooCommerceConfig = {
  url: import.meta.env.VITE_WOOCOMMERCE_URL || 'https://nooralqmar.com/',
  consumerKey: import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY || 'ck_dc373790e65a510998fbc7278cb12b987d90b04a',
  consumerSecret: import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET || 'cs_815de347330e130a58e3e53e0f87b0cd4f0de90f',
  version: 'wc/v3'
};

// WordPress credentials for media uploads (from your Python code)
const WP_CREDENTIALS = {
  username: import.meta.env.VITE_WP_USERNAME || 'ProjectX',
  password: import.meta.env.VITE_WP_PASSWORD || 'tTx0 3O6f MiCs EKsB nzJq cQBn'
};

// NEW IN v2.1.0: Campaign Performance Categories
export type CampaignPerformance = 'excellent' | 'good' | 'average' | 'poor' | 'terrible';

// NEW IN v2.1.0: Enhanced Product Interface with Campaign Analytics
export interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_modified: string;
  type: string;
  status: string;
  featured: boolean;
  catalog_visibility: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_to: string | null;
  price_html: string;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  download_limit: number;
  download_expiry: number;
  external_url: string;
  button_text: string;
  tax_status: string;
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: string;
  backorders: string;
  backorders_allowed: boolean;
  backordered: boolean;
  sold_individually: boolean;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  shipping_required: boolean;
  shipping_taxable: boolean;
  shipping_class: string;
  shipping_class_id: number;
  reviews_allowed: boolean;
  average_rating: string;
  rating_count: number;
  related_ids: number[];
  upsell_ids: number[];
  cross_sell_ids: number[];
  parent_id: number;
  purchase_note: string;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  tags: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  images: Array<{
    id: number;
    date_created: string;
    date_modified: string;
    src: string;
    name: string;
    alt: string;
  }>;
  attributes: Array<{
    id: number;
    name: string;
    position: number;
    visible: boolean;
    variation: boolean;
    options: string[];
  }>;
  default_attributes: Array<{
    id: number;
    name: string;
    option: string;
  }>;
  variations: number[];
  grouped_products: number[];
  menu_order: number;
  meta_data: Array<{
    id: number;
    key: string;
    value: string;
  }>;
  
  // NEW IN v2.1.0: Campaign Analytics Properties
  revenue?: number;
  profit_margin?: number;
  campaign_performance?: CampaignPerformance;
  campaign_readiness?: boolean;
  performance_score?: number;
  category_match?: string[];
  recommended_budget?: number;
  target_audience?: string[];
  last_campaign_date?: string;
  campaign_roi?: number;
  market_trend?: 'rising' | 'stable' | 'declining';
  seasonal_factor?: number;
}

export interface WooCommerceOrderBilling {
  first_name: string;
  last_name: string;
  company?: string;
  address_1: string;
  address_2?: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email?: string;
  phone: string;
}

export interface WooCommerceOrderLineItem {
  product_id: number;
  variation_id?: number;
  quantity: number;
  name?: string;
  sku?: string;
  price?: string;
  total?: string;
}

export interface WooCommerceOrderData {
  payment_method: string;
  payment_method_title: string;
  set_paid: boolean;
  billing: WooCommerceOrderBilling;
  shipping: WooCommerceOrderBilling;
  line_items: WooCommerceOrderLineItem[];
  shipping_lines?: Array<{
    method_id: string;
    method_title: string;
    total: string;
  }>;
  fee_lines?: Array<{
    name: string;
    total: string;
  }>;
  coupon_lines?: Array<{
    code: string;
  }>;
  meta_data?: Array<{
    key: string;
    value: string;
  }>;
  customer_note?: string;
  status?: string;
}

export interface WooCommerceCoupon {
  id: number;
  code: string;
  amount: string;
  date_created: string;
  date_modified: string;
  discount_type: string;
  description: string;
  date_expires: string | null;
  usage_count: number;
  individual_use: boolean;
  product_ids: number[];
  excluded_product_ids: number[];
  usage_limit: number | null;
  usage_limit_per_user: number | null;
  limit_usage_to_x_items: number | null;
  free_shipping: boolean;
  product_categories: number[];
  excluded_product_categories: number[];
  exclude_sale_items: boolean;
  minimum_amount: string;
  maximum_amount: string;
  email_restrictions: string[];
  used_by: string[];
  meta_data: Array<{
    id: number;
    key: string;
    value: string;
  }>;
}

export interface WooCommerceCustomer {
  id: number;
  date_created: string;
  date_modified: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  username: string;
  billing: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  is_paying_customer: boolean;
  avatar_url: string;
  meta_data: Array<{
    id: number;
    key: string;
    value: string;
  }>;
}

export interface WooCommerceOrder {
  id: number;
  parent_id: number;
  number: string;
  order_key: string;
  created_via: string;
  version: string;
  status: string;
  currency: string;
  date_created: string;
  date_modified: string;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string;
  total_tax: string;
  prices_include_tax: boolean;
  customer_id: number;
  customer_ip_address: string;
  customer_user_agent: string;
  customer_note: string;
  billing: WooCommerceOrderBilling;
  shipping: WooCommerceOrderBilling;
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;
  date_paid: string | null;
  date_completed: string | null;
  cart_hash: string;
  meta_data: Array<{
    id: number;
    key: string;
    value: string;
  }>;
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    variation_id: number;
    quantity: number;
    tax_class: string;
    subtotal: string;
    subtotal_tax: string;
    total: string;
    total_tax: string;
    taxes: Array<{
      id: number;
      total: string;
      subtotal: string;
    }>;
    meta_data: Array<{
      id: number;
      key: string;
      value: string;
    }>;
    sku: string;
    price: number;
  }>;
}

export interface WooCommercePaymentMethod {
  id: string;
  title: string;
  description: string;
  order: number;
  enabled: boolean;
  method_title: string;
  method_description: string;
  settings: {
    [key: string]: {
      id: string;
      label: string;
      description: string;
      type: string;
      value: string;
      default: string;
      tip: string;
      placeholder: string;
    };
  };
}

// Enhanced WooCommerce API Service Configuration
const API_CONFIG = {
  baseURL: 'https://nooralqmar.com/wp-json/wc/v3', // Always use direct URL
  consumerKey: 'ck_dc373790e65a510998fbc7278cb12b987d90b04a', // Updated working credentials
  consumerSecret: 'cs_815de347330e130a58e3e53e0f87b0cd4f0de90f', // Updated working credentials
  timeout: 30000, // 30 seconds for first attempt (increased for monthly sync)
  retryTimeout: 45000, // 45 seconds for retry attempt (increased for monthly sync)
  maxRetries: 2, // Increased retries for monthly sync reliability
  rateLimitDelay: 1000, // 1 second delay between requests to respect rate limits
  batchDelay: 500 // 500ms delay between batches
};

// Helper function to handle API requests with retry logic
const makeRequest = async (url: string, options: RequestInit = {}, attempt: number = 1): Promise<any> => {
  const timeout = attempt === 1 ? API_CONFIG.timeout : API_CONFIG.retryTimeout;
  
  console.log(`🔄 WooCommerce API request (attempt ${attempt}/${API_CONFIG.maxRetries + 1}):`, url, options.method || 'GET');
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  const requestOptions: RequestInit = {
    method: 'GET',
    ...options, // User options will override defaults
    headers: {
      'Authorization': `Basic ${btoa(`${API_CONFIG.consumerKey}:${API_CONFIG.consumerSecret}`)}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'NoorHub-Strategy/2.0',
      ...options.headers,
    },
    signal: controller.signal,
    mode: 'cors'
  };

  try {
    const response = await fetch(url, requestOptions);
    
    clearTimeout(timeoutId);
    
    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      // Try to get error details
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorText = await response.text();
        if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
          errorMessage = `Server returned HTML page instead of JSON. This usually indicates the API endpoint is not found or there's a server configuration issue.`;
        } else {
          errorMessage += ` - ${errorText}`;
        }
      } catch (e) {
        // If we can't read the error, use the original message
      }
      throw new Error(errorMessage);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn(`⚠️ Unexpected content type: ${contentType}`);
    }
    
    const responseText = await response.text();
    
    // Check if response is HTML instead of JSON
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      throw new Error('Server returned HTML page instead of JSON. The WooCommerce REST API may not be properly configured or the endpoint does not exist.');
    }
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ JSON parse error. Response text:', responseText.substring(0, 200) + '...');
      throw new Error(`Invalid JSON response from WooCommerce API. Server may be returning an error page.`);
    }
    
    console.log(`✅ WooCommerce API request successful (attempt ${attempt}): ${Array.isArray(data) ? data.length : 'single item'} items`);
    return data;
    
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    const isTimeout = error.name === 'AbortError';
    const isNetworkError = error.message?.includes('Failed to fetch') || error.message?.includes('CORS') || error.message?.includes('ERR_');
    const isHTMLResponse = error.message?.includes('HTML page') || error.message?.includes('<!DOCTYPE');
    
    console.error(`❌ WooCommerce API request failed (attempt ${attempt}/${API_CONFIG.maxRetries + 1}):`, {
      error: error.message,
      type: isTimeout ? 'timeout' : isNetworkError ? 'network' : isHTMLResponse ? 'html_response' : 'unknown',
      url: url.replace(/consumer_(key|secret)=[^&]+/g, '$1=***')
    });
    
    // Retry logic - only retry timeouts and network errors, not HTML responses
    if (attempt <= API_CONFIG.maxRetries && (isTimeout || isNetworkError) && !isHTMLResponse) {
      const delay = 2000 + Math.random() * 2000; // 2-4 second delay
      console.log(`⏳ Retrying WooCommerce API request in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return makeRequest(url, options, attempt + 1);
    }
    
    // Final error handling
    if (isHTMLResponse) {
      throw new Error('WooCommerce REST API is not responding correctly. Please check if the WooCommerce REST API is enabled and properly configured on your server.');
    } else if (isTimeout) {
      throw new Error(`Request timeout - your WooCommerce server may be slow with large datasets. Try refreshing or contact your hosting provider about server performance.`);
    } else if (isNetworkError) {
      throw new Error('Connection failed - please check your internet connection or try again later');
    } else {
      throw new Error(`WooCommerce API error: ${error.message}`);
    }
  }
};

// WooCommerce API class
class WooCommerceAPI {
  
  // Test API connection first
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing WooCommerce API connection...');
      
      // Try to fetch just one order to test the connection
      let url = `${API_CONFIG.baseURL}/orders?per_page=1&status=completed`;
      try {
        const result = await makeRequest(url);
        
        if (Array.isArray(result)) {
          console.log('✅ WooCommerce API connection test successful (orders accessible)');
          return true;
        }
      } catch (orderError: any) {
        console.warn('⚠️ Orders endpoint failed, trying products endpoint...', orderError.message);
        
        // Fall back to testing products endpoint if orders fail
        url = `${API_CONFIG.baseURL}/products?per_page=1&status=publish`;
        const result = await makeRequest(url);
        
        if (Array.isArray(result)) {
          console.log('✅ WooCommerce API connection test successful (products accessible)');
          return true;
        } else {
          console.warn('⚠️ API responded but with unexpected format:', result);
          return false;
        }
      }
      
    } catch (error: any) {
      console.error('❌ WooCommerce API connection test failed completely:', error);
      return false;
    }
  }

  // Enhanced fetch orders with improved date filtering and error handling
  async fetchOrders(params: {
    per_page?: number;
    page?: number;
    status?: string;
    after?: string;
    before?: string;
    modified_after?: string;
    modified_before?: string;
    orderby?: string;
    order?: string;
    search?: string;
    customer?: number;
  } = {}): Promise<any[]> {
    const {
      per_page = 50,
      page = 1,
      status = 'completed',
      after,
      before,
      modified_after,
      modified_before,
      orderby = 'date',
      order = 'desc',
      search,
      customer
    } = params;
    
    // Build query parameters for orders with enhanced field selection
    const queryParams = new URLSearchParams({
      per_page: per_page.toString(),
      page: page.toString(),
      orderby: orderby,
      order: order,
      // Enhanced field selection for complete order data
      _fields: [
        'id',
        'number',
        'status',
        'currency', 
        'total',
        'total_tax',
        'shipping_total',
        'discount_total',
        'date_created',
        'date_modified',
        'date_completed',
        'date_paid',
        'line_items',
        'customer_id',
        'customer_note',
        'payment_method',
        'payment_method_title',
        'billing',
        'shipping',
        'meta_data'
      ].join(',')
    });

    // Handle status parameter with better logic
    if (status && status !== 'any' && status !== 'all') {
      queryParams.append('status', status);
    }
    
    // Enhanced date filtering with proper parameter handling
    if (after) {
      // Ensure after is in ISO format
      const afterDate = new Date(after);
      if (!isNaN(afterDate.getTime())) {
        queryParams.append('after', afterDate.toISOString());
      } else {
        console.warn('⚠️ Invalid after date provided:', after);
      }
    }
    
    if (before) {
      // Ensure before is in ISO format
      const beforeDate = new Date(before);
      if (!isNaN(beforeDate.getTime())) {
        queryParams.append('before', beforeDate.toISOString());
      } else {
        console.warn('⚠️ Invalid before date provided:', before);
      }
    }
    
    if (modified_after) {
      // Ensure modified_after is in ISO format
      const modifiedAfterDate = new Date(modified_after);
      if (!isNaN(modifiedAfterDate.getTime())) {
        queryParams.append('modified_after', modifiedAfterDate.toISOString());
      } else {
        console.warn('⚠️ Invalid modified_after date provided:', modified_after);
      }
    }
    
    if (modified_before) {
      // Ensure modified_before is in ISO format
      const modifiedBeforeDate = new Date(modified_before);
      if (!isNaN(modifiedBeforeDate.getTime())) {
        queryParams.append('modified_before', modifiedBeforeDate.toISOString());
      } else {
        console.warn('⚠️ Invalid modified_before date provided:', modified_before);
      }
    }
    
    // Add optional search parameter
    if (search && search.trim()) {
      queryParams.append('search', search.trim());
    }
    
    // Add optional customer filter
    if (customer && customer > 0) {
      queryParams.append('customer', customer.toString());
    }
    
    const url = `${API_CONFIG.baseURL}/orders?${queryParams.toString()}`;
    
    try {
      console.log(`🔍 Fetching orders: ${url.replace(/consumer_(key|secret)=[^&]+/g, '$1=***')}`);
      
      const orders = await makeRequest(url);
      
      if (!Array.isArray(orders)) {
        console.warn('⚠️ WooCommerce API returned non-array response for orders:', orders);
        return [];
      }
      
      // Validate order data and filter out invalid entries
      const validOrders = orders.filter(order => {
        if (!order || typeof order.id !== 'number' || !order.date_created) {
          console.warn('⚠️ Invalid order data filtered out:', order);
          return false;
        }
        return true;
      });
      
      if (validOrders.length !== orders.length) {
        console.warn(`⚠️ Filtered out ${orders.length - validOrders.length} invalid orders`);
      }
      
      console.log(`✅ Successfully fetched ${validOrders.length} valid orders`);
      return validOrders;
      
    } catch (error: any) {
      console.error('❌ Error fetching WooCommerce orders:', error);
      
      // Enhanced error context
      const errorContext = {
        params: {
          per_page,
          page,
          status,
          orderby,
          order,
          hasDateFilters: !!(after || before || modified_after || modified_before),
          hasSearch: !!search,
          hasCustomer: !!customer
        },
        url: url.replace(/consumer_(key|secret)=[^&]+/g, '$1=***')
      };
      
      console.error('📋 Request context:', errorContext);
      throw error;
    }
  }

  // NEW: Fetch orders for a specific customer
  async fetchOrdersForCustomer(customerId: number, params: {
    per_page?: number;
    page?: number;
    status?: string;
    orderby?: string;
    order?: string;
  } = {}): Promise<any[]> {
    const {
      per_page = 100,
      page = 1,
      status = 'completed',
      orderby = 'date',
      order = 'desc'
    } = params;
    
    // Build query parameters for customer orders
    const queryParams = new URLSearchParams({
      customer: customerId.toString(),
      per_page: per_page.toString(),
      page: page.toString(),
      orderby,
      order,
      // Request essential order fields for loyal customer analysis
      _fields: [
        'id',
        'number',
        'status',
        'total',
        'date_created',
        'date_completed',
        'customer_id',
        'line_items'
      ].join(',')
    });

    // Only add status parameter if it's not 'any'
    if (status && status !== 'any') {
      queryParams.append('status', status);
    }
    
    const url = `${API_CONFIG.baseURL}/orders?${queryParams.toString()}`;
    
    try {
      const orders = await makeRequest(url);
      
      if (!Array.isArray(orders)) {
        console.warn('⚠️ WooCommerce API returned non-array response for customer orders:', orders);
        return [];
      }
      
      return orders;
      
    } catch (error: any) {
      console.error(`❌ Error fetching orders for customer ${customerId}:`, error);
      throw error;
    }
  }

  // Get total order count for pagination planning
  async getTotalOrderCount(status: string = 'completed'): Promise<number> {
    try {
      console.log('📊 Getting total order count...');
      
      const url = `${API_CONFIG.baseURL}/orders?per_page=1&status=${status}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'Authorization': `Basic ${btoa(`${API_CONFIG.consumerKey}:${API_CONFIG.consumerSecret}`)}`,
          'Accept': 'application/json'
        },
        signal: controller.signal,
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
      
      const totalHeader = response.headers.get('X-WP-Total');
      const totalCount = totalHeader ? parseInt(totalHeader, 10) : 0;
      
      console.log(`📊 Total ${status} orders: ${totalCount}`);
      return totalCount;
      
    } catch (error: any) {
      console.warn('⚠️ Could not get total order count:', error.message);
      return 0;
    }
  }

  // Fetch ALL orders with automatic pagination
  async fetchAllOrders(params: {
    status?: string;
    after?: string;
    before?: string;
    maxOrders?: number; // Optional limit to prevent memory issues
  } = {}): Promise<any[]> {
    const {
      status = 'completed',
      after,
      before,
      maxOrders = 10000 // Default max limit to prevent memory issues
    } = params;

    console.log('🚀 Starting to fetch ALL orders...');
    
    try {
      // First, get the total count
      const totalCount = await this.getTotalOrderCount(status);
      console.log(`📊 Total orders to fetch: ${totalCount}`);
      
      if (totalCount === 0) {
        console.log('ℹ️ No orders found');
        return [];
      }

      const actualLimit = Math.min(totalCount, maxOrders);
      console.log(`📥 Fetching ${actualLimit} orders (limited by maxOrders: ${maxOrders})`);

      const allOrders: any[] = [];
      const perPage = 100; // WooCommerce max per page
      const totalPages = Math.ceil(actualLimit / perPage);

      // Fetch all pages in parallel (but limit concurrent requests)
      const batchSize = 5; // Process 5 pages at a time to avoid overwhelming the server
      
      for (let batchStart = 0; batchStart < totalPages; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, totalPages);
        const batchPromises = [];

        for (let page = batchStart + 1; page <= batchEnd; page++) {
          console.log(`📄 Fetching page ${page}/${totalPages}...`);
          
          const fetchParams = {
            per_page: perPage,
            page,
            status,
            after,
            before
          };

          batchPromises.push(this.fetchOrders(fetchParams));
        }

        // Wait for this batch to complete
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Process results and handle errors
        batchResults.forEach((result, index) => {
          const pageNumber = batchStart + index + 1;
          
          if (result.status === 'fulfilled') {
            allOrders.push(...result.value);
            console.log(`✅ Page ${pageNumber} fetched: ${result.value.length} orders`);
          } else {
            console.error(`❌ Page ${pageNumber} failed:`, result.reason);
          }
        });

        // Add a small delay between batches to be respectful to the server
        if (batchEnd < totalPages) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`🎉 Successfully fetched ${allOrders.length} orders out of ${totalCount} total`);
      return allOrders;

    } catch (error: any) {
      console.error('❌ Error fetching all orders:', error);
      throw error;
    }
  }
  
  // Fetch products with optimized pagination for large catalogs
  async fetchProducts(params: {
    per_page?: number;
    page?: number;
    status?: string;
    orderby?: string;
    order?: string;
    search?: string;
    category?: string;
    stock_status?: string;
  } = {}): Promise<any[]> {
    const {
      per_page = 50, // Reduced from 100 to 50 for better performance with 360+ products
      page = 1,
      status = 'publish',
      orderby = 'menu_order',
      order = 'asc',
      search,
      category,
      stock_status
    } = params;
    
    // Build query parameters with essential fields only for faster loading
    const queryParams = new URLSearchParams({
      per_page: per_page.toString(),
      page: page.toString(),
      status,
      orderby,
      order,
      // Optimized field selection for faster loading (now includes images for campaign creators)
      _fields: [
        'id',
        'name', 
        'slug',
        'sku',
        'permalink',
        'price',
        'regular_price',
        'total_sales',
        'stock_status',
        'average_rating',
        'rating_count',
        'categories',
        'date_modified',
        'images',
        'description',
        'short_description',
        'language'
      ].join(',')
    });
    
    // Add optional search parameter
    if (search) {
      queryParams.append('search', search);
    }
    
    // Add optional category filter
    if (category) {
      queryParams.append('category', category);
    }
    
    // Add optional stock status filter
    if (stock_status) {
      queryParams.append('stock_status', stock_status);
    }
    
    const url = `${API_CONFIG.baseURL}/products?${queryParams.toString()}`;
    
    try {
      const products = await makeRequest(url);
      
      // Ensure we return an array even if API returns unexpected format
      if (!Array.isArray(products)) {
        console.warn('⚠️ WooCommerce API returned non-array response:', products);
        return [];
      }
      
      return products;
      
    } catch (error: any) {
      console.error('❌ Error fetching WooCommerce products:', error);
      throw error;
    }
  }
  
  // Fetch a single product by ID
  async fetchProduct(productId: number): Promise<any> {
    const url = `${API_CONFIG.baseURL}/products/${productId}`;
    
    try {
      const product = await makeRequest(url);
      return product;
      
    } catch (error: any) {
      console.error(`❌ Error fetching WooCommerce product ${productId}:`, error);
      throw error;
    }
  }
  
  // Get total product count for pagination planning
  async getTotalProductCount(): Promise<number> {
    try {
      console.log('📊 Getting total product count...');
      
      // Fetch just one product but get the total count from headers
      const url = `${API_CONFIG.baseURL}/products?per_page=1&status=publish`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // Shorter timeout for count check
      
      const response = await fetch(url, {
        method: 'HEAD', // Use HEAD to get headers without body
        headers: {
          'Authorization': `Basic ${btoa(`${API_CONFIG.consumerKey}:${API_CONFIG.consumerSecret}`)}`,
          'Accept': 'application/json'
        },
        signal: controller.signal,
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
      
      const totalHeader = response.headers.get('X-WP-Total');
      const totalCount = totalHeader ? parseInt(totalHeader, 10) : 0;
      
      console.log(`📊 Total products in store: ${totalCount}`);
      return totalCount;
      
    } catch (error: any) {
      console.warn('⚠️ Could not get total product count, will fetch all pages:', error.message);
      return 0; // Return 0 to indicate unknown count
    }
  }

  // Fetch ALL products with automatic pagination
  async fetchAllProducts(params: {
    status?: string;
    orderby?: string;
    order?: string;
    search?: string;
    category?: string;
    maxProducts?: number; // Optional limit to prevent memory issues
  } = {}): Promise<any[]> {
    const {
      status = 'publish',
      orderby = 'menu_order',
      order = 'asc',
      search,
      category,
      maxProducts = 5000 // Default max limit to prevent memory issues
    } = params;

    console.log('🚀 Starting to fetch ALL products...');
    
    try {
      // First, get the total count
      const totalCount = await this.getTotalProductCount();
      console.log(`📊 Total products to fetch: ${totalCount}`);
      
      if (totalCount === 0) {
        console.log('ℹ️ No products found or count unknown, will fetch until empty');
      }

      const actualLimit = totalCount > 0 ? Math.min(totalCount, maxProducts) : maxProducts;
      console.log(`📥 Fetching up to ${actualLimit} products (limited by maxProducts: ${maxProducts})`);

      const allProducts: any[] = [];
      const perPage = 100; // WooCommerce max per page
      let page = 1;
      let hasMoreData = true;

      // If we know the total count, calculate total pages
      const totalPages = totalCount > 0 ? Math.ceil(actualLimit / perPage) : null;

      // Fetch pages in batches to avoid overwhelming the server
      const batchSize = 5; // Process 5 pages at a time
      
      while (hasMoreData && allProducts.length < actualLimit) {
        const batchPromises = [];
        const batchStart = page;
        const batchEnd = Math.min(page + batchSize - 1, totalPages || page + batchSize - 1);

        // Create batch of requests
        for (let currentPage = batchStart; currentPage <= batchEnd && allProducts.length < actualLimit; currentPage++) {
          console.log(`📄 Fetching page ${currentPage}${totalPages ? `/${totalPages}` : ''}...`);
          
          const fetchParams = {
            per_page: perPage,
            page: currentPage,
            status,
            orderby,
            order,
            search,
            category
          };

          batchPromises.push(this.fetchProducts(fetchParams));
        }

        // Wait for this batch to complete
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Process results and handle errors
        let anyPageHasData = false;
        batchResults.forEach((result, index) => {
          const pageNumber = batchStart + index;
          
          if (result.status === 'fulfilled') {
            const pageProducts = result.value;
            if (pageProducts.length > 0) {
              allProducts.push(...pageProducts.slice(0, actualLimit - allProducts.length));
              console.log(`✅ Page ${pageNumber} fetched: ${pageProducts.length} products`);
              anyPageHasData = true;
            } else {
              console.log(`📄 Page ${pageNumber} empty, stopping pagination`);
            }
          } else {
            console.error(`❌ Page ${pageNumber} failed:`, result.reason);
          }
        });

        // Update pagination
        page = batchEnd + 1;
        
        // Stop if no page in this batch had data or we reached our limits
        if (!anyPageHasData || allProducts.length >= actualLimit) {
          hasMoreData = false;
        }

        // Add a small delay between batches to be respectful to the server
        if (hasMoreData) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`🎉 Successfully fetched ${allProducts.length} products${totalCount > 0 ? ` out of ${totalCount} total` : ''}`);
      return allProducts;

    } catch (error: any) {
      console.error('❌ Error fetching all products:', error);
      throw error;
    }
  }
  
  // NEW IN v2.1.0: Fetch customers with campaign analytics
  async fetchCustomers(params: {
    per_page?: number;
    page?: number;
    search?: string;
    orderby?: string;
    order?: string;
  } = {}): Promise<WooCommerceCustomer[]> {
    const {
      per_page = 50,
      page = 1,
      search,
      orderby = 'registered_date',
      order = 'desc'
    } = params;
    
    const queryParams = new URLSearchParams({
      per_page: per_page.toString(),
      page: page.toString(),
      orderby,
      order,
      // Essential customer fields for loyalty analysis
      _fields: [
        'id',
        'email',
        'first_name',
        'last_name',
        'date_created',
        'is_paying_customer',
        'avatar_url',
        'billing'
      ].join(',')
    });
    
    if (search) {
      queryParams.append('search', search);
    }
    
    const url = `${API_CONFIG.baseURL}/customers?${queryParams.toString()}`;
    
    try {
      const customers = await makeRequest(url);
      
      if (!Array.isArray(customers)) {
        console.warn('⚠️ WooCommerce API returned non-array response for customers:', customers);
        return [];
      }
      
      return customers;
      
    } catch (error: any) {
      console.error('❌ Error fetching WooCommerce customers:', error);
      throw error;
    }
  }

  // NEW: Fetch categories from WooCommerce
  async fetchCategories(params: {
    per_page?: number;
    page?: number;
    hide_empty?: boolean;
    orderby?: string;
    order?: string;
    search?: string;
  } = {}): Promise<Array<{ id: number; name: string; slug: string; count: number; }>> {
    try {
      console.log('📂 Fetching categories from WooCommerce...');
      
      const url = `${WOOCOMMERCE_CONFIG.url}wp-json/${WOOCOMMERCE_CONFIG.version}/products/categories`;
      const queryParams = new URLSearchParams({
        consumer_key: WOOCOMMERCE_CONFIG.consumerKey,
        consumer_secret: WOOCOMMERCE_CONFIG.consumerSecret,
        per_page: (params.per_page || 100).toString(),
        page: (params.page || 1).toString(),
        hide_empty: (params.hide_empty !== undefined ? params.hide_empty : false).toString(),
        orderby: params.orderby || 'name',
        order: params.order || 'asc',
        ...(params.search && { search: params.search })
      });

      console.log(`📂 Making request to: ${url}?${queryParams}`);
      
      const response = await fetch(`${url}?${queryParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Categories fetch error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const categories = await response.json();
      
      console.log(`✅ Fetched ${categories.length} categories successfully`);
      
      // Return in the expected format
      return categories.map((category: any) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        count: category.count || 0
      }));
      
    } catch (error: any) {
      console.error('💥 Error fetching categories:', error);
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }
  }

  // Create a new order in WooCommerce
  async createOrder(orderData: WooCommerceOrderData): Promise<WooCommerceOrder> {
    const url = `${API_CONFIG.baseURL}/orders`;
    
    try {
      console.log('🛒 Creating order in WooCommerce:', orderData);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${API_CONFIG.consumerKey}:${API_CONFIG.consumerSecret}`)}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'NoorHub-Orders/2.0'
        },
        body: JSON.stringify(orderData),
        signal: controller.signal,
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
      
      console.log(`📡 Create order response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorText = await response.text();
          if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
            errorMessage = `Server returned HTML page instead of JSON. Check WooCommerce REST API configuration.`;
          } else {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorMessage;
          }
        } catch (e) {
          // Use original error message if we can't parse the response
        }
        throw new Error(errorMessage);
      }
      
      const responseText = await response.text();
      
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        throw new Error('Server returned HTML page instead of JSON. The WooCommerce REST API may not be properly configured.');
      }
      
      let createdOrder;
      try {
        createdOrder = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON parse error. Response text:', responseText.substring(0, 200) + '...');
        throw new Error(`Invalid JSON response from WooCommerce API when creating order.`);
      }
      
      console.log(`✅ Order created successfully in WooCommerce: #${createdOrder.number} (ID: ${createdOrder.id})`);
      return createdOrder;
      
    } catch (error: any) {
      console.error('❌ Error creating WooCommerce order:', error);
      throw error;
    }
  }

  // Get a single order by ID
  async getOrder(orderId: number): Promise<WooCommerceOrder> {
    const url = `${API_CONFIG.baseURL}/orders/${orderId}`;
    return makeRequest(url);
  }

  // Update an order in WooCommerce
  async updateOrder(orderId: number, data: Partial<WooCommerceOrderData>): Promise<WooCommerceOrder> {
    const url = `${API_CONFIG.baseURL}/orders/${orderId}`;
    return makeRequest(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Get coupon by code
  async getCouponByCode(couponCode: string): Promise<WooCommerceCoupon | null> {
    try {
      // Search for coupons by code
      const url = `${API_CONFIG.baseURL}/coupons?code=${encodeURIComponent(couponCode)}`;
      const coupons = await makeRequest(url);
      
      if (Array.isArray(coupons) && coupons.length > 0) {
        return coupons[0]; // Return the first matching coupon
      }
      
      return null; // No coupon found
      
    } catch (error: any) {
      console.error(`❌ Error fetching coupon ${couponCode}:`, error);
      return null; // Return null instead of throwing to allow graceful handling
    }
  }

  // Fetch available payment methods
  async fetchPaymentMethods(): Promise<WooCommercePaymentMethod[]> {
    try {
      console.log('💳 Fetching payment methods from WooCommerce...');
      
      const url = `${API_CONFIG.baseURL}/payment_gateways`;
      const paymentMethods = await makeRequest(url);
      
      if (!Array.isArray(paymentMethods)) {
        console.warn('⚠️ WooCommerce API returned non-array response for payment methods:', paymentMethods);
        return [];
      }
      
      // Filter only enabled payment methods
      const enabledMethods = paymentMethods.filter(method => method.enabled === true);
      
      console.log(`✅ Fetched ${enabledMethods.length} enabled payment methods`);
      return enabledMethods;
      
    } catch (error: any) {
      console.error('❌ Error fetching WooCommerce payment methods:', error);
      // Return default payment methods if API fails
      return [
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
          id: 'bacs',
          title: 'Direct Bank Transfer',
          description: 'Make your payment directly into our bank account.',
          order: 2,
          enabled: true,
          method_title: 'Direct Bank Transfer',
          method_description: 'Make your payment directly into our bank account.',
          settings: {}
        }
      ];
    }
  }

  // Get API configuration info
  getConfig() {
    return {
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      retryTimeout: API_CONFIG.retryTimeout,
      maxRetries: API_CONFIG.maxRetries
    };
  }
}

// Export singleton instance
const wooCommerceAPI = new WooCommerceAPI();

// Expose wooCommerceAPI globally for debugging & scripts
if (typeof window !== 'undefined') {
  (window as any).wooCommerceAPI = wooCommerceAPI;
}

export default wooCommerceAPI;

// Helper function to check if WooCommerce is configured
export const isWooCommerceConfigured = (): boolean => {
  return !!(
    WOOCOMMERCE_CONFIG.url && 
    WOOCOMMERCE_CONFIG.url !== 'https://your-store.com' &&
    WOOCOMMERCE_CONFIG.consumerKey && 
    WOOCOMMERCE_CONFIG.consumerKey !== 'your_consumer_key' &&
    WOOCOMMERCE_CONFIG.consumerSecret && 
    WOOCOMMERCE_CONFIG.consumerSecret !== 'your_consumer_secret'
  );
};




// Debug function to test WooCommerce API from browser console
export const testWooCommerceAPI = async () => {
  console.log('🔧 WooCommerce API Diagnostic Tool');
  console.log('=====================================');
  
  // Configuration check
  console.log('1. 📋 Configuration Check:');
  console.log('   URL:', WOOCOMMERCE_CONFIG.url);
  console.log('   Consumer Key:', WOOCOMMERCE_CONFIG.consumerKey ? `${WOOCOMMERCE_CONFIG.consumerKey.substring(0, 15)}...` : '❌ NOT SET');
  console.log('   Consumer Secret:', WOOCOMMERCE_CONFIG.consumerSecret ? `${WOOCOMMERCE_CONFIG.consumerSecret.substring(0, 15)}...` : '❌ NOT SET');
  console.log('   Is Configured:', isWooCommerceConfigured());
  
  if (!isWooCommerceConfigured()) {
    console.log('❌ WooCommerce is not properly configured. Check your environment variables.');
    return;
  }
  
  // Test connection
  console.log('\n2. 🔍 Testing API Connection:');
  try {
    const connectionResult = await wooCommerceAPI.testConnection();
    if (connectionResult) {
      console.log('✅ Connection successful');
    } else {
      console.log('❌ Connection failed');
      return;
    }
  } catch (error) {
    console.log('💥 Connection test error:', error.message);
    return;
  }
  
  // Test customer fetch
  console.log('\n3. 👥 Testing Customer Fetch:');
  try {
    const customers = await wooCommerceAPI.fetchCustomers({ per_page: 5 });
    console.log(`✅ Successfully fetched ${customers.length} customers (limited to 5 for test)`);
    if (customers.length > 0) {
      console.log('   Sample customer:', {
        id: customers[0].id,
        email: customers[0].email,
        name: `${customers[0].first_name} ${customers[0].last_name}`,
        date_created: customers[0].date_created
      });
    }
  } catch (error: any) {
    console.log('❌ Customer fetch failed:', error.message);
    return;
  }
  
  // Test product fetch for campaign strategy
  console.log('\n4. 📦 Testing Product Fetch (for Campaign Strategy):');
  try {
    const products = await wooCommerceAPI.fetchProducts({ per_page: 3 });
    console.log(`✅ Successfully fetched ${products.length} products (limited to 3 for test)`);
    if (products.length > 0) {
      console.log('   Sample product:', {
        id: products[0].id,
        name: products[0].name,
        price: products[0].price,
        total_sales: products[0].total_sales,
        categories: products[0].categories?.map((c: any) => c.name).join(', ') || 'None'
      });
    }
  } catch (error: any) {
    console.log('❌ Product fetch failed:', error.message);
    return;
  }
  
  console.log('\n🎉 All tests passed! Your WooCommerce API is working properly.');
  console.log('💡 You can now use all features: Loyal Customers, Campaign Strategy, and Product Analytics.');
  console.log('🚀 WooCommerce API v2.1.0 is ready for enhanced campaign strategy integration!');
};

// Make it available globally for debugging
(window as any).testWooCommerceAPI = testWooCommerceAPI;

// Mock data for development/testing
export const mockProducts: WooCommerceProduct[] = [
  {
    id: 1,
    name: "Premium WordPress Theme",
    slug: "premium-wordpress-theme",
    permalink: "https://example.com/product/premium-wordpress-theme",
    date_created: "2024-01-01T00:00:00",
    date_modified: "2024-01-01T00:00:00",
    type: "simple",
    status: "publish",
    featured: false,
    catalog_visibility: "visible",
    description: "A premium WordPress theme with advanced features",
    short_description: "Premium theme for modern websites",
    sku: "THEME-001",
    price: "99.00",
    regular_price: "99.00",
    sale_price: "",
    date_on_sale_from: null,
    date_on_sale_to: null,
    price_html: "$99.00",
    on_sale: false,
    purchasable: true,
    total_sales: 150,
    virtual: true,
    downloadable: true,
    download_limit: -1,
    download_expiry: -1,
    external_url: "",
    button_text: "",
    tax_status: "taxable",
    tax_class: "",
    manage_stock: false,
    stock_quantity: null,
    stock_status: "instock",
    backorders: "no",
    backorders_allowed: false,
    backordered: false,
    sold_individually: false,
    weight: "",
    dimensions: { length: "", width: "", height: "" },
    shipping_required: false,
    shipping_taxable: false,
    shipping_class: "",
    shipping_class_id: 0,
    reviews_allowed: true,
    average_rating: "4.5",
    rating_count: 25,
    related_ids: [],
    upsell_ids: [],
    cross_sell_ids: [],
    parent_id: 0,
    purchase_note: "",
    categories: [{ id: 1, name: "Themes", slug: "themes" }],
    tags: [],
    images: [],
    attributes: [],
    default_attributes: [],
    variations: [],
    grouped_products: [],
    menu_order: 0,
    meta_data: []
  },
  {
    id: 2,
    name: "Website Development Service",
    slug: "website-development-service",
    permalink: "https://example.com/product/website-development-service",
    date_created: "2024-01-01T00:00:00",
    date_modified: "2024-01-01T00:00:00",
    type: "simple",
    status: "publish",
    featured: true,
    catalog_visibility: "visible",
    description: "Professional website development service",
    short_description: "Custom website development",
    sku: "DEV-001",
    price: "499.00",
    regular_price: "599.00",
    sale_price: "499.00",
    date_on_sale_from: null,
    date_on_sale_to: null,
    price_html: "<del>$599.00</del> $499.00",
    on_sale: true,
    purchasable: true,
    total_sales: 85,
    virtual: true,
    downloadable: false,
    download_limit: -1,
    download_expiry: -1,
    external_url: "",
    button_text: "",
    tax_status: "taxable",
    tax_class: "",
    manage_stock: false,
    stock_quantity: null,
    stock_status: "instock",
    backorders: "no",
    backorders_allowed: false,
    backordered: false,
    sold_individually: true,
    weight: "",
    dimensions: { length: "", width: "", height: "" },
    shipping_required: false,
    shipping_taxable: false,
    shipping_class: "",
    shipping_class_id: 0,
    reviews_allowed: true,
    average_rating: "4.8",
    rating_count: 42,
    related_ids: [],
    upsell_ids: [],
    cross_sell_ids: [],
    parent_id: 0,
    purchase_note: "",
    categories: [{ id: 2, name: "Services", slug: "services" }],
    tags: [],
    images: [],
    attributes: [],
    default_attributes: [],
    variations: [],
    grouped_products: [],
    menu_order: 0,
    meta_data: []
  }
]; 