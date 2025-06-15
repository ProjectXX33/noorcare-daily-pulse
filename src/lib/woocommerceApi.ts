// WooCommerce API integration
// Add your WooCommerce store credentials here

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

class WooCommerceAPI {
  private config: WooCommerceConfig;

  constructor(config: WooCommerceConfig) {
    this.config = config;
  }

  private getAuthHeader(): string {
    const credentials = btoa(`${this.config.consumerKey}:${this.config.consumerSecret}`);
    return `Basic ${credentials}`;
  }

  private getApiUrl(endpoint: string): string {
    return `${this.config.url}/wp-json/${this.config.version}/${endpoint}`;
  }

  async fetchProducts(params?: {
    per_page?: number;
    page?: number;
    search?: string;
    category?: string;
    status?: string;
    stock_status?: string;
    orderby?: string;
    order?: string;
  }): Promise<WooCommerceProduct[]> {
    try {
      const searchParams = new URLSearchParams();
      
      if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.search) searchParams.append('search', params.search);
      if (params?.category) searchParams.append('category', params.category);
      if (params?.status) searchParams.append('status', params.status);
      if (params?.stock_status) searchParams.append('stock_status', params.stock_status);

      const url = `${this.getApiUrl('products')}?${searchParams.toString()}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
      }

      const products: WooCommerceProduct[] = await response.json();
      return products;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  async createOrder(orderData: WooCommerceOrderData): Promise<WooCommerceOrder> {
    try {
      const url = this.getApiUrl('orders');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('WooCommerce API Error:', errorData);
        throw new Error(`Failed to create order: ${response.statusText}`);
      }

      const order: WooCommerceOrder = await response.json();
      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async getOrder(orderId: number): Promise<WooCommerceOrder> {
    try {
      const url = this.getApiUrl(`orders/${orderId}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch order: ${response.statusText}`);
      }

      const order: WooCommerceOrder = await response.json();
      return order;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  }

  async updateOrder(orderId: number, orderData: Partial<WooCommerceOrderData>): Promise<WooCommerceOrder> {
    try {
      const url = this.getApiUrl(`orders/${orderId}`);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update order: ${response.statusText}`);
      }

      const order: WooCommerceOrder = await response.json();
      return order;
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  }

  async fetchCoupons(params?: {
    per_page?: number;
    page?: number;
    search?: string;
    status?: string;
  }): Promise<WooCommerceCoupon[]> {
    try {
      const searchParams = new URLSearchParams();
      
      if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.search) searchParams.append('search', params.search);
      if (params?.status) searchParams.append('status', params.status);

      const url = `${this.getApiUrl('coupons')}?${searchParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader()
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch coupons: ${response.status} ${errorText}`);
      }

      const coupons: WooCommerceCoupon[] = await response.json();
      return coupons;
    } catch (error) {
      console.error('Error fetching coupons:', error);
      throw error;
    }
  }

  async getCouponByCode(code: string): Promise<WooCommerceCoupon | null> {
    try {
      const coupons = await this.fetchCoupons({ search: code, per_page: 10 });
      const exactMatch = coupons.find(coupon => coupon.code.toLowerCase() === code.toLowerCase());
      return exactMatch || null;
    } catch (error) {
      console.error('Error fetching coupon by code:', error);
      return null;
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      console.log('🔍 Testing WooCommerce API connection...');
      console.log('📍 URL:', this.config.url);
      console.log('🔑 Consumer Key:', this.config.consumerKey ? `${this.config.consumerKey.substring(0, 10)}...` : 'NOT SET');
      console.log('🔐 Consumer Secret:', this.config.consumerSecret ? `${this.config.consumerSecret.substring(0, 10)}...` : 'NOT SET');

      // Test products endpoint since you confirmed it works
      const testUrl = this.getApiUrl('products');
      console.log('🌐 Testing products API endpoint:', testUrl);

      const response = await fetch(`${testUrl}?per_page=1`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      console.log('📊 Response status:', response.status);
      console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        
        if (response.status === 401) {
          return {
            success: false,
            message: 'Authentication failed - check your API keys',
            details: { status: response.status, error: errorText }
          };
        } else if (response.status === 404) {
          return {
            success: false,
            message: 'WooCommerce API endpoint not found - check if WooCommerce REST API is enabled',
            details: { status: response.status, error: errorText }
          };
        } else {
          return {
            success: false,
            message: `API request failed: ${response.statusText}`,
            details: { status: response.status, error: errorText }
          };
        }
      }

      const data = await response.json();
      console.log('✅ API Response:', data);

      return {
        success: true,
        message: 'WooCommerce API connection successful',
        details: data
      };
    } catch (error) {
      console.error('💥 Connection test failed:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return {
          success: false,
          message: 'Network error - unable to reach WooCommerce site',
          details: { error: error.message }
        };
      }
      
      return {
        success: false,
        message: `Connection test failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  async fetchCustomers(params?: {
    per_page?: number;
    page?: number;
    search?: string;
    email?: string;
    orderby?: string;
    order?: string;
    role?: string;
  }): Promise<WooCommerceCustomer[]> {
    try {
      console.log('🔍 Fetching customers with params:', params);
      
      const searchParams = new URLSearchParams();
      
      if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.search) searchParams.append('search', params.search);
      if (params?.email) searchParams.append('email', params.email);
      if (params?.orderby) searchParams.append('orderby', params.orderby);
      if (params?.order) searchParams.append('order', params.order);
      if (params?.role) searchParams.append('role', params.role);

      const url = `${this.getApiUrl('customers')}?${searchParams.toString()}`;
      console.log('🌐 Request URL:', url);
      
      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });
      const responseTime = Date.now() - startTime;
      
      console.log(`⏱️ API Response time: ${responseTime}ms`);
      console.log('📊 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`Failed to fetch customers: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const customers: WooCommerceCustomer[] = await response.json();
      console.log(`✅ Successfully fetched ${customers.length} customers`);
      return customers;
    } catch (error) {
      console.error('💥 Error fetching customers:', error);
      throw error;
    }
  }

  async getCustomer(customerId: number): Promise<WooCommerceCustomer> {
    try {
      const url = this.getApiUrl(`customers/${customerId}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch customer: ${response.statusText}`);
      }

      const customer: WooCommerceCustomer = await response.json();
      return customer;
    } catch (error) {
      console.error('Error fetching customer:', error);
      throw error;
    }
  }

  async fetchOrdersForCustomer(customerId: number, params?: {
    per_page?: number;
    page?: number;
    status?: string;
    orderby?: string;
    order?: string;
  }): Promise<WooCommerceOrder[]> {
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('customer', customerId.toString());
      
      if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.status) searchParams.append('status', params.status);
      if (params?.orderby) searchParams.append('orderby', params.orderby);
      if (params?.order) searchParams.append('order', params.order);

      const url = `${this.getApiUrl('orders')}?${searchParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch customer orders: ${response.statusText}`);
      }

      const orders: WooCommerceOrder[] = await response.json();
      return orders;
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      throw error;
    }
  }

  async fetchCategories(params?: {
    per_page?: number;
    page?: number;
    search?: string;
    orderby?: string;
    order?: string;
    hide_empty?: boolean;
  }): Promise<Array<{
    id: number;
    name: string;
    slug: string;
    parent: number;
    description: string;
    display: string;
    image: {
      id: number;
      src: string;
      name: string;
      alt: string;
    } | null;
    menu_order: number;
    count: number;
  }>> {
    try {
      const searchParams = new URLSearchParams();
      
      if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.search) searchParams.append('search', params.search);
      if (params?.orderby) searchParams.append('orderby', params.orderby);
      if (params?.order) searchParams.append('order', params.order);
      if (params?.hide_empty !== undefined) searchParams.append('hide_empty', params.hide_empty.toString());

      const url = `${this.getApiUrl('products/categories')}?${searchParams.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.statusText}`);
      }

      const categories = await response.json();
      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  async uploadProductImage(productId: number, imageFile: File): Promise<{
    id: number;
    src: string;
    name: string;
    alt: string;
  }> {
    try {
      console.log(`📷 Using WordPress Application Password auth - Product ${productId}...`);
      console.log(`📋 File details: ${imageFile.name}, size: ${imageFile.size} bytes, type: ${imageFile.type}`);

      // Step 1: Upload image to WordPress media library using Application Password
      console.log('🔄 Step 1: Uploading to WordPress media library...');
      
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('title', imageFile.name.replace(/\.[^/.]+$/, ''));
      formData.append('alt_text', imageFile.name.replace(/\.[^/.]+$/, ''));

      const mediaUrl = `${this.config.url}/wp-json/wp/v2/media`;
      console.log('🔗 Media upload URL:', mediaUrl);

      // Use WordPress Application Password authentication (username:application_password)
      const wpAuth = btoa(`${WP_CREDENTIALS.username}:${WP_CREDENTIALS.password}`);
      console.log('🔑 Using WordPress authentication:');
      console.log(`   Username: ${WP_CREDENTIALS.username}`);
      console.log(`   Password: ${WP_CREDENTIALS.password.substring(0, 4)}...${WP_CREDENTIALS.password.substring(-4)} (Application Password)`);
      console.log('   Auth header:', `Basic ${wpAuth.substring(0, 20)}...`);

      const mediaResponse = await fetch(mediaUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${wpAuth}`,
        },
        body: formData,
      });

      if (!mediaResponse.ok) {
        const errorText = await mediaResponse.text();
        console.error('❌ WordPress media upload failed:', errorText);
        console.error('💡 This usually means:');
        console.error('   1. WordPress Application Password is invalid');
        console.error('   2. User "ProjectX" doesn\'t have media upload permissions');
        console.error('   3. WordPress REST API is disabled');
        
        // Try using WooCommerce API to create media instead
        console.log('🔄 Trying WooCommerce media creation as fallback...');
        
        try {
          const wooMediaResponse = await fetch(this.getApiUrl('media'), {
            method: 'POST',
            headers: {
              'Authorization': this.getAuthHeader(), // WooCommerce auth
            },
            body: formData,
          });

          if (wooMediaResponse.ok) {
            const wooMediaResult = await wooMediaResponse.json();
            console.log('✅ WooCommerce media upload succeeded:', wooMediaResult);
            
            const imageData = {
              id: wooMediaResult.id,
              src: wooMediaResult.source_url || wooMediaResult.url,
              name: wooMediaResult.title || imageFile.name,
              alt: wooMediaResult.alt || imageFile.name.replace(/\.[^/.]+$/, '')
            };

            console.log('🎉 Image upload completed via WooCommerce API:', imageData);
            return imageData;
          }
        } catch (wooError) {
          console.error('⚠️ WooCommerce media API also failed:', wooError);
        }

        throw new Error(`All media upload methods failed. Primary error: ${mediaResponse.status} - ${errorText}`)
      }

      const mediaResult = await mediaResponse.json();
      console.log('✅ WordPress media uploaded successfully:', mediaResult);

      // Step 2: Add the media image to the product using WooCommerce API
      console.log('🔄 Step 2: Adding image to product via WooCommerce API...');
      
      const imageData = {
        id: mediaResult.id,
        src: mediaResult.source_url || mediaResult.guid?.rendered,
        name: mediaResult.title?.rendered || imageFile.name,
        alt: mediaResult.alt_text || imageFile.name.replace(/\.[^/.]+$/, '')
      };

      // Update product with the new image using WooCommerce auth
      const updateResponse = await fetch(this.getApiUrl(`products/${productId}`), {
        method: 'PUT',
        headers: {
          'Authorization': this.getAuthHeader(), // WooCommerce auth
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: [imageData] // Add as first image
        }),
      });

      if (!updateResponse.ok) {
        const updateError = await updateResponse.text();
        console.error('⚠️ Failed to add image to product:', updateError);
        // Return the image data anyway since media upload succeeded
      } else {
        console.log('✅ Product updated with new image');
      }

      console.log('🎉 Image upload completed:', imageData);
      return imageData;
      
    } catch (error) {
      console.error('💥 Error uploading product image:', error);
      throw error;
    }
  }

  // Note: Custom endpoints removed - using direct WooCommerce API and meta data instead

  async deleteProduct(productId: number): Promise<boolean> {
    try {
      console.log(`🗑️ WooCommerceAPI: Deleting product ${productId}...`);
      
      const response = await fetch(`${this.getApiUrl(`products/${productId}`)}?force=true`, {
        method: 'DELETE',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        }
      });

      console.log(`🗑️ WooCommerceAPI: Delete response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ WooCommerce delete failed:', errorText);
        throw new Error(`Delete failed: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const result = await response.json();
      console.log('✅ WooCommerceAPI: Product deleted successfully:', result);
      return true;

    } catch (error) {
      console.error('💥 WooCommerceAPI: Delete failed:', error);
      throw error;
    }
  }

}

// Create singleton instance
const wooCommerceAPI = new WooCommerceAPI(WOOCOMMERCE_CONFIG);

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
    if (connectionResult.success) {
      console.log('✅ Connection successful:', connectionResult.message);
      console.log('   API Details:', connectionResult.details);
    } else {
      console.log('❌ Connection failed:', connectionResult.message);
      console.log('   Error details:', connectionResult.details);
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
  } catch (error) {
    console.log('❌ Customer fetch failed:', error.message);
    return;
  }
  
  console.log('\n🎉 All tests passed! Your WooCommerce API is working properly.');
  console.log('💡 You can now use the Loyal Customers feature.');
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