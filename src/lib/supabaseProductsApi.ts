import { supabase } from './supabase';
import wooCommerceAPI from './woocommerceApi';
import { CopyWritingProduct } from '@/contexts/CopyWritingProductsContext';

export interface SupabaseProduct {
  id: number; // WooCommerce product ID
  name: string;
  slug: string;
  permalink: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  stock_status: string;
  total_sales: number;
  featured: boolean;
  categories: any[];
  tags: any[];
  images: any[];
  date_created: string;
  date_modified: string;
  average_rating: string;
  rating_count: number;
  // Supabase specific fields
  synced_at: string;
  last_sync_hash: string; // Hash to detect changes
  created_at: string;
  updated_at: string;
}

class SupabaseProductsAPI {
  private tableName = 'copy_writing_products';

  // Create hash for change detection
  private createProductHash(product: CopyWritingProduct): string {
    const hashData = {
      name: product.name,
      description: product.description,
      short_description: product.short_description,
      price: product.price,
      regular_price: product.regular_price,
      sale_price: product.sale_price,
      stock_status: product.stock_status,
      date_modified: product.date_modified
    };
    return btoa(JSON.stringify(hashData));
  }

  // Store products to Supabase
  async storeProducts(products: CopyWritingProduct[]): Promise<{ success: boolean; message: string; stored: number }> {
    try {
      console.log(`📦 Storing ${products.length} products to Supabase...`);
      
      const supabaseProducts: Partial<SupabaseProduct>[] = products.map(product => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        permalink: product.permalink,
        description: product.description,
        short_description: product.short_description,
        sku: product.sku,
        price: product.price,
        regular_price: product.regular_price,
        sale_price: product.sale_price,
        on_sale: product.on_sale,
        stock_status: product.stock_status,
        total_sales: product.total_sales,
        featured: product.featured,
        categories: product.categories,
        tags: product.tags,
        images: product.images,
        date_created: product.date_created,
        date_modified: product.date_modified,
        average_rating: product.average_rating,
        rating_count: product.rating_count,
        synced_at: new Date().toISOString(),
        last_sync_hash: this.createProductHash(product)
      }));

      // Use upsert to handle both new and existing products
      const { data, error } = await supabase
        .from(this.tableName)
        .upsert(supabaseProducts, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error('❌ Error storing products:', error);
        throw error;
      }

      console.log(`✅ Successfully stored ${data?.length || 0} products to Supabase`);
      return {
        success: true,
        message: `Successfully stored ${data?.length || 0} products`,
        stored: data?.length || 0
      };
    } catch (error) {
      console.error('❌ Failed to store products:', error);
      return {
        success: false,
        message: `Failed to store products: ${error.message}`,
        stored: 0
      };
    }
  }

  // Get products from Supabase
  async getStoredProducts(): Promise<{ success: boolean; products: CopyWritingProduct[]; message: string }> {
    try {
      console.log('📖 Loading products from Supabase...');
      
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .order('total_sales', { ascending: false });

      if (error) {
        console.error('❌ Error loading products:', error);
        throw error;
      }

      const products: CopyWritingProduct[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        permalink: item.permalink,
        description: item.description,
        short_description: item.short_description,
        sku: item.sku,
        price: item.price,
        regular_price: item.regular_price,
        sale_price: item.sale_price,
        on_sale: item.on_sale,
        stock_status: item.stock_status,
        total_sales: item.total_sales,
        featured: item.featured,
        categories: item.categories,
        tags: item.tags,
        images: item.images,
        date_created: item.date_created,
        date_modified: item.date_modified,
        average_rating: item.average_rating,
        rating_count: item.rating_count
      }));

      console.log(`✅ Loaded ${products.length} products from Supabase`);
      return {
        success: true,
        products,
        message: `Loaded ${products.length} products from cache`
      };
    } catch (error) {
      console.error('❌ Failed to load products:', error);
      return {
        success: false,
        products: [],
        message: `Failed to load products: ${error.message}`
      };
    }
  }

  // Check if products need sync (compare with WooCommerce)
  async checkSyncNeeded(): Promise<{ needsSync: boolean; newProducts: number; changedProducts: number }> {
    try {
      console.log('🔍 Checking if sync is needed...');
      
      // Get latest products from WooCommerce (first page only for quick check)
      const latestWooProducts = await wooCommerceAPI.fetchProducts({
        per_page: 50,
        page: 1,
        status: 'publish',
        orderby: 'date',
        order: 'desc'
      });

      // Get stored products from Supabase
      const { data: storedProducts } = await supabase
        .from(this.tableName)
        .select('id, last_sync_hash, date_modified')
        .order('id');

      const storedProductsMap = new Map(
        (storedProducts || []).map(p => [p.id, { hash: p.last_sync_hash, modified: p.date_modified }])
      );

      let newProducts = 0;
      let changedProducts = 0;

      for (const wooProduct of latestWooProducts) {
        const stored = storedProductsMap.get(wooProduct.id);
        
        if (!stored) {
          newProducts++;
        } else {
          // Check if product has been modified
          const currentHash = this.createProductHash(wooProduct as any);
          if (stored.hash !== currentHash) {
            changedProducts++;
          }
        }
      }

      const needsSync = newProducts > 0 || changedProducts > 0;
      
      console.log(`🔍 Sync check result: ${needsSync ? 'SYNC NEEDED' : 'UP TO DATE'}`);
      console.log(`📊 New products: ${newProducts}, Changed products: ${changedProducts}`);

      return { needsSync, newProducts, changedProducts };
    } catch (error) {
      console.error('❌ Error checking sync status:', error);
      return { needsSync: true, newProducts: 0, changedProducts: 0 };
    }
  }

  // Update product in both Supabase and WooCommerce
  async updateProduct(productId: number, updates: Partial<CopyWritingProduct>): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`📝 Updating product ${productId}...`);

      // First update in WooCommerce
      const wooUpdateData: any = {};
      if (updates.name) wooUpdateData.name = updates.name;
      if (updates.description) wooUpdateData.description = updates.description;
      if (updates.short_description) wooUpdateData.short_description = updates.short_description;
      if (updates.price) wooUpdateData.regular_price = updates.price;
      if (updates.sale_price) wooUpdateData.sale_price = updates.sale_price;

      // Update in WooCommerce using the API instance
      const wooResponse = await fetch(`${(wooCommerceAPI as any).config.url}/wp-json/wc/v3/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': (wooCommerceAPI as any).getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(wooUpdateData)
      });

      if (!wooResponse.ok) {
        throw new Error(`WooCommerce update failed: ${wooResponse.statusText}`);
      }

      const updatedWooProduct = await wooResponse.json();

      // Update in Supabase
      const supabaseUpdates = {
        ...updates,
        date_modified: new Date().toISOString(),
        synced_at: new Date().toISOString(),
        last_sync_hash: this.createProductHash(updatedWooProduct),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from(this.tableName)
        .update(supabaseUpdates)
        .eq('id', productId);

      if (error) {
        console.error('❌ Supabase update failed:', error);
        throw error;
      }

      console.log(`✅ Successfully updated product ${productId} in both WooCommerce and Supabase`);
      return {
        success: true,
        message: 'Product updated successfully in both systems'
      };
    } catch (error) {
      console.error('❌ Failed to update product:', error);
      return {
        success: false,
        message: `Failed to update product: ${error.message}`
      };
    }
  }

  // Get last sync time
  async getLastSyncTime(): Promise<string | null> {
    try {
      const { data } = await supabase
        .from(this.tableName)
        .select('synced_at')
        .order('synced_at', { ascending: false })
        .limit(1);

      return data?.[0]?.synced_at || null;
    } catch (error) {
      console.error('❌ Error getting last sync time:', error);
      return null;
    }
  }

  // Clear all stored products
  async clearStoredProducts(): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .neq('id', 0); // Delete all

      if (error) throw error;

      return {
        success: true,
        message: 'All stored products cleared successfully'
      };
    } catch (error) {
      console.error('❌ Error clearing products:', error);
      return {
        success: false,
        message: `Failed to clear products: ${error.message}`
      };
    }
  }
}

export const supabaseProductsAPI = new SupabaseProductsAPI();
export default supabaseProductsAPI; 