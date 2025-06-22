import React, { createContext, useContext, useState, useEffect } from 'react';
import wooCommerceAPI, { isWooCommerceConfigured, WooCommerceProduct } from '@/lib/woocommerceApi';
import supabaseProductsAPI from '@/lib/supabaseProductsApi';
import { toast } from 'sonner';

export interface CopyWritingProduct {
  id: number;
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
  status?: string;
  total_sales: number;
  featured: boolean;
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
    src: string;
    name: string;
    alt: string;
  }>;
  date_created: string;
  date_modified: string;
  average_rating: string;
  rating_count: number;
  // Polylang support
  language?: 'en' | 'ar';
  polylang_translations?: {
    en?: string;
    ar?: string;
  };
}

interface CopyWritingProductsContextType {
  products: CopyWritingProduct[];
  loading: boolean;
  isBackgroundProcessing: boolean;
  error: string | null;
  progress: number;
  stage: string;
  details: string;
  startFetching: () => void;
  clearData: () => void;
  syncProducts: () => void;
  updateProduct: (productId: number, updates: Partial<CopyWritingProduct>) => Promise<boolean>;
  addNewProduct: (product: Omit<CopyWritingProduct, 'id'>) => Promise<CopyWritingProduct | null>;
  deleteProduct: (productId: number) => Promise<boolean>;
  lastSyncTime: string | null;
  isFromCache: boolean;
  // New features
  categories: Array<{ id: number; name: string; slug: string; count: number; }>;
  fetchCategories: () => Promise<void>;
  uploadProductImage: (productId: number, imageFile: File) => Promise<boolean>;
  loadingCategories: boolean;
  fixAllProductLanguages: () => Promise<any>;
}

const CopyWritingProductsContext = createContext<CopyWritingProductsContextType | undefined>(undefined);

// LocalStorage key for caching products
const PRODUCTS_CACHE_KEY = 'copywriting_products_cache';
const CACHE_TIMESTAMP_KEY = 'copywriting_products_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const CopyWritingProductsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<CopyWritingProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [isBackgroundProcessing, setIsBackgroundProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [details, setDetails] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  // New state for categories
  const [categories, setCategories] = useState<Array<{ id: number; name: string; slug: string; count: number; }>>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    loadFromCache();
  }, []);

  const loadFromCache = () => {
    try {
      const cachedProducts = localStorage.getItem(PRODUCTS_CACHE_KEY);
      const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cachedProducts && cacheTimestamp) {
        const timestamp = parseInt(cacheTimestamp);
        const now = Date.now();
        
        // Check if cache is still valid (within 24 hours)
        if (now - timestamp < CACHE_DURATION) {
          const products = JSON.parse(cachedProducts);
          console.log(`📦 Loaded ${products.length} products from localStorage cache`);
          setProducts(products);
          setLastSyncTime(new Date(timestamp).toISOString());
          setIsFromCache(true);
          toast.success(`Loaded ${products.length} products from cache`);
          return;
        } else {
          // Cache expired, remove it
          localStorage.removeItem(PRODUCTS_CACHE_KEY);
          localStorage.removeItem(CACHE_TIMESTAMP_KEY);
          console.log('🕒 Cache expired, will fetch fresh data');
        }
      }
    } catch (error) {
      console.error('❌ Error loading from cache:', error);
      // Clear corrupted cache
      localStorage.removeItem(PRODUCTS_CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    }
  };

  const saveToCache = (products: CopyWritingProduct[]) => {
    try {
      const timestamp = Date.now();
      localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, timestamp.toString());
      console.log(`💾 Saved ${products.length} products to localStorage cache`);
    } catch (error) {
      console.error('❌ Error saving to cache:', error);
      // If localStorage is full, try to clear old data
      try {
        localStorage.removeItem(PRODUCTS_CACHE_KEY);
        localStorage.removeItem(CACHE_TIMESTAMP_KEY);
        localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(products));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      } catch (retryError) {
        console.error('❌ Failed to save to cache even after clearing:', retryError);
      }
    }
  };

  const fetchAllProducts = async (forceRefresh = false) => {
    try {
      console.log('🔄 fetchAllProducts called - Enhanced with REAL-TIME loading');
      
      setLoading(true);
      setIsBackgroundProcessing(true);
      setError(null);
      setProgress(0);
      setIsFromCache(false);

      // If not forcing refresh and we have cached data, use it
      if (!forceRefresh && products.length > 0) {
        console.log('📦 Using existing cached products');
        setLoading(false);
        setIsBackgroundProcessing(false);
        return;
      }

      // Clear existing products for fresh real-time loading
      setProducts([]);
      
      setStage('🔄 Real-Time Loading');
      setDetails('Starting real-time product streaming from WooCommerce...');

      // Test connection first
      setProgress(5);
      setStage('🔍 Testing Connection');
      setDetails('Checking WooCommerce API connection...');
      
      try {
        const testResult = await wooCommerceAPI.testConnection();
        if (!testResult.success) {
          console.error('❌ Connection test failed:', testResult.message, testResult.details);
          throw new Error(`Connection failed: ${testResult.message}`);
        }
        console.log('✅ WooCommerce connection test passed:', testResult.details);
      } catch (connectionError) {
        console.error('❌ Connection test failed:', connectionError);
        console.log('🔄 Will attempt to fetch products anyway...');
      }

      // Real-time streaming variables
      let allProducts: WooCommerceProduct[] = [];
      const perPage = 50; // Smaller batches for faster real-time updates
      let currentPage = 1;
      let hasMore = true;
      let totalFetched = 0;
      let consecutiveEmptyPages = 0;
      const maxConsecutiveEmpty = 5;
      let maxPagesReached = false;

      setProgress(10);
      setStage('🚀 Real-Time Streaming');
      setDetails('Products will appear instantly as they are loaded...');

      // Real-time streaming fetch logic
      while (hasMore && !maxPagesReached && consecutiveEmptyPages < maxConsecutiveEmpty) {
        try {
          console.log(`📄 Real-time fetching page ${currentPage} (${perPage} per page)...`);
          
          const pageProducts = await wooCommerceAPI.fetchProducts({
            per_page: perPage,
            page: currentPage,
            status: 'any',
            orderby: 'id',
            order: 'asc'
          });

          console.log(`📄 Page ${currentPage} response: ${pageProducts.length} products`);

          if (pageProducts.length > 0) {
            // Filter out duplicates by ID
            const newProducts = pageProducts.filter(newProduct => 
              !allProducts.some(existingProduct => existingProduct.id === newProduct.id)
            );
            
            if (newProducts.length > 0) {
              allProducts = [...allProducts, ...newProducts];
              totalFetched = allProducts.length;
              consecutiveEmptyPages = 0;
              
              console.log(`📄 Page ${currentPage}: ${newProducts.length} new products (total: ${totalFetched})`);
              
              // 🚀 REAL-TIME UPDATE: Convert and add products immediately to UI
              const newCopyWritingProducts: CopyWritingProduct[] = newProducts.map(product => {
                // Extract language from meta_data if available
                let productLanguage: 'en' | 'ar' | undefined = undefined;
                
                console.log(`🔍 DEBUG: Product ${product.id} "${product.name}" meta_data:`, product.meta_data);
                console.log(`🔍 DEBUG: Product ${product.id} SKU: "${product.sku}"`);
                
                if (product.meta_data && Array.isArray(product.meta_data)) {
                  const languageMeta = product.meta_data.find(meta => meta.key === 'language');
                  if (languageMeta) {
                    productLanguage = languageMeta.value as 'en' | 'ar';
                    console.log(`🔍 ✅ Product ${product.id} has language meta: ${productLanguage}`);
                  } else {
                    console.log(`🔍 ❌ Product ${product.id} has meta_data but no language key`);
                  }
                } else {
                  console.log(`🔍 ❌ Product ${product.id} has no meta_data or meta_data is not array`);
                }

                // Fallback: detect from SKU suffix
                if (!productLanguage && product.sku) {
                  if (product.sku.endsWith('-en')) {
                    productLanguage = 'en';
                    console.log(`🔍 ✅ Product ${product.id} language detected from SKU: ${productLanguage}`);
                  } else if (product.sku.endsWith('-ar')) {
                    productLanguage = 'ar';
                    console.log(`🔍 ✅ Product ${product.id} language detected from SKU: ${productLanguage}`);
                  } else {
                    console.log(`🔍 ❌ Product ${product.id} SKU "${product.sku}" doesn't end with -en or -ar`);
                  }
                } else if (!productLanguage) {
                  console.log(`🔍 ❌ Product ${product.id} has no SKU to check`);
                }

                return {
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
                  // Set language based on meta_data or SKU detection
                  language: productLanguage
                };
              });

              // Update UI in real-time by adding new products to existing ones
              setProducts(prevProducts => {
                const updatedProducts = [...prevProducts, ...newCopyWritingProducts];
                // Also save to cache in real-time
                saveToCache(updatedProducts);
                return updatedProducts;
              });

              // Dynamic progress calculation
              let progressPercent;
              if (totalFetched <= 361) {
                progressPercent = 10 + ((totalFetched / 361) * 50);
              } else if (totalFetched <= 1000) {
                progressPercent = 60 + (((totalFetched - 361) / (1000 - 361)) * 20);
              } else {
                progressPercent = Math.min(80 + ((totalFetched - 1000) / 100), 90);
              }
              
              setProgress(Math.min(progressPercent, 90));
              setDetails(`🔴 LIVE: ${totalFetched} products loaded${totalFetched > 361 ? ' (Beyond target!)' : ''} - Streaming continues...`);
              
              // Show real-time toast notifications for milestones
              if (totalFetched === 100) {
                toast.success('🎉 First 100 products loaded!');
              } else if (totalFetched === 361) {
                toast.success('🎯 Target reached! 361 products loaded - continuing for more...');
              } else if (totalFetched === 500) {
                toast.success('🚀 500 products loaded! Massive inventory detected!');
              } else if (totalFetched % 200 === 0 && totalFetched > 500) {
                toast.success(`🔥 ${totalFetched} products loaded and counting!`);
              }
            }
            
            // If we got less than requested, we might be near the end
            if (pageProducts.length < perPage) {
              console.log(`📄 Got ${pageProducts.length} < ${perPage}, might be approaching end`);
            }
          } else {
            consecutiveEmptyPages++;
            console.log(`📄 Empty page ${currentPage} (${consecutiveEmptyPages}/${maxConsecutiveEmpty} consecutive empty)`);
          }
          
          currentPage++;
          
          // Enhanced safety limit
          if (currentPage > 200) {
            console.log('📄 Reached maximum safety limit of 200 pages');
            maxPagesReached = true;
          }
          
          // Faster delays for real-time experience
          if (currentPage % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 800)); // Reduced delay
          } else if (currentPage % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 300)); // Reduced delay
          } else {
            await new Promise(resolve => setTimeout(resolve, 100)); // Much faster for real-time
          }
          
        } catch (pageError) {
          console.error(`❌ Error fetching page ${currentPage}:`, pageError);
          
          // Enhanced error handling with real-time feedback
          if (pageError.message.includes('rate') || pageError.message.includes('timeout')) {
            console.log('⏳ Rate limit detected, waiting 2 seconds...');
            setDetails(`⏳ Rate limit detected, pausing for 2 seconds... (${totalFetched} products loaded so far)`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          
          if (pageError.message.includes('404') || pageError.message.includes('No products found')) {
            console.log('📄 Reached end of available products');
            hasMore = false;
            break;
          }
          
          currentPage++;
          if (currentPage > 200) {
            maxPagesReached = true;
          }
        }
      }

      // Enhanced completion logic
      let finalMessage = '';
      if (allProducts.length >= 500) {
        finalMessage = `🚀 MASSIVE SUCCESS! Loaded ${allProducts.length} products in real-time! (${allProducts.length - 361} beyond target) ✨`;
      } else if (allProducts.length >= 361) {
        finalMessage = `✅ SUCCESS! Loaded ${allProducts.length} products in real-time! (${allProducts.length - 361} beyond target) 🎯`;
      } else {
        finalMessage = `📊 Loaded ${allProducts.length} products in real-time (${361 - allProducts.length} fewer than expected target)`;
      }

      // Additional strategies for low counts
      if (allProducts.length < 100) {
        console.log('🔄 Attempting additional real-time fetch strategies...');
        setDetails('🔄 Trying additional loading strategies...');
        
        try {
          const strategies = [
            { status: 'publish' },
            { status: 'private' },
            { status: 'draft' },
            { orderby: 'date', order: 'desc' },
            { orderby: 'title', order: 'asc' },
          ];

          for (const strategy of strategies) {
            console.log(`🔄 Trying strategy:`, strategy);
            const additionalProducts = await wooCommerceAPI.fetchProducts({
              per_page: 100,
              page: 1,
              ...strategy
            });
            
            const uniqueAdditional = additionalProducts.filter(newProduct => 
              !allProducts.some(existingProduct => existingProduct.id === newProduct.id)
            );
            
            if (uniqueAdditional.length > 0) {
              allProducts = [...allProducts, ...uniqueAdditional];
              
              // Real-time update for additional products
              const additionalCopyWritingProducts: CopyWritingProduct[] = uniqueAdditional.map(product => {
                // Extract language from meta_data if available
                let productLanguage: 'en' | 'ar' | undefined = undefined;
                
                console.log(`🔍 DEBUG ADDITIONAL: Product ${product.id} "${product.name}" meta_data:`, product.meta_data);
                console.log(`🔍 DEBUG ADDITIONAL: Product ${product.id} SKU: "${product.sku}"`);
                
                if (product.meta_data && Array.isArray(product.meta_data)) {
                  const languageMeta = product.meta_data.find(meta => meta.key === 'language');
                  if (languageMeta) {
                    productLanguage = languageMeta.value as 'en' | 'ar';
                    console.log(`🔍 ✅ Additional product ${product.id} has language meta: ${productLanguage}`);
                  } else {
                    console.log(`🔍 ❌ Additional product ${product.id} has meta_data but no language key`);
                  }
                } else {
                  console.log(`🔍 ❌ Additional product ${product.id} has no meta_data or meta_data is not array`);
                }

                // Fallback: detect from SKU suffix
                if (!productLanguage && product.sku) {
                  if (product.sku.endsWith('-en')) {
                    productLanguage = 'en';
                    console.log(`🔍 ✅ Additional product ${product.id} language detected from SKU: ${productLanguage}`);
                  } else if (product.sku.endsWith('-ar')) {
                    productLanguage = 'ar';
                    console.log(`🔍 ✅ Additional product ${product.id} language detected from SKU: ${productLanguage}`);
                  } else {
                    console.log(`🔍 ❌ Additional product ${product.id} SKU "${product.sku}" doesn't end with -en or -ar`);
                  }
                } else if (!productLanguage) {
                  console.log(`🔍 ❌ Additional product ${product.id} has no SKU to check`);
                }

                return {
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
                  // Set language based on meta_data or SKU detection
                  language: productLanguage
                };
              });

              setProducts(prevProducts => {
                const updatedProducts = [...prevProducts, ...additionalCopyWritingProducts];
                saveToCache(updatedProducts);
                return updatedProducts;
              });
              
              console.log(`📄 Found ${uniqueAdditional.length} additional unique products with strategy`);
            }
          }
        } catch (additionalError) {
          console.error('❌ Additional fetch strategies failed:', additionalError);
        }
      }

      setProgress(100);
      setStage('✅ Real-Time Loading Complete');
      setDetails(finalMessage);
      setLastSyncTime(new Date().toISOString());

      console.log(`✅ Real-time loading complete: ${allProducts.length} products`);

      // Final success notification
      if (allProducts.length > 0) {
        toast.success(`🔴 LIVE COMPLETE: ${allProducts.length} products loaded in real-time!`);
      } else {
        throw new Error('No products found in WooCommerce.');
      }
    } catch (error) {
      console.error('Error in real-time loading:', error);
      setError(`Failed to load product data: ${error.message}`);
      setStage('❌ Failed');
      setDetails(`Error: ${error.message}`);
      setProgress(0);
    } finally {
      setLoading(false);
      setIsBackgroundProcessing(false);
    }
  };

  const startFetching = () => {
    // Prevent multiple simultaneous requests
    if (loading) {
      console.log('🚫 Fetch already in progress, ignoring duplicate request');
      return;
    }

    console.log('🚀 Starting product fetch process...');
    fetchAllProducts(false); // Don't force refresh if we have cached data
  };

  const syncProducts = () => {
    if (loading) {
      console.log('🚫 Sync already in progress, ignoring duplicate request');
      return;
    }

    console.log('🔄 Force syncing products from WooCommerce...');
    fetchAllProducts(true); // Force refresh
  };

  const updateProduct = async (productId: number, updates: Partial<CopyWritingProduct>): Promise<boolean> => {
    try {
      console.log(`🔄 Updating product ${productId} on WooCommerce...`, updates);

      // Prepare WooCommerce API update data
      const wooUpdateData: any = {};
      if (updates.name) wooUpdateData.name = updates.name;
      if (updates.description) wooUpdateData.description = updates.description;
      if (updates.short_description) wooUpdateData.short_description = updates.short_description;
      if (updates.price) wooUpdateData.regular_price = updates.price;
      if (updates.sale_price) wooUpdateData.sale_price = updates.sale_price;

      console.log('📤 Sending to WooCommerce:', wooUpdateData);

      // Get WooCommerce API configuration
      const wooConfig = (wooCommerceAPI as any).config;
      const authHeader = (wooCommerceAPI as any).getAuthHeader();

      // Update product on WooCommerce with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${wooConfig.url}/wp-json/wc/v3/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(wooUpdateData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ WooCommerce API Error:', errorText);
        throw new Error(`WooCommerce update failed: ${response.status} ${response.statusText}`);
      }

      const updatedProduct = await response.json();
      console.log('✅ WooCommerce update successful:', updatedProduct);

      // Update local state with the response from WooCommerce
      const updatedProducts = products.map(product => 
        product.id === productId ? { 
          ...product, 
          ...updates,
          // Update with any additional data from WooCommerce response
          date_modified: updatedProduct.date_modified || new Date().toISOString()
        } : product
      );
      
      setProducts(updatedProducts);
      
      // Update cache with the new data
      saveToCache(updatedProducts);
      
      toast.success('Product updated successfully on website and cache!');
      return true;
    } catch (error) {
      console.error('❌ Error updating product:', error);
      toast.error(`Failed to update product: ${error.message}`);
      return false;
    }
  };

  const addNewProduct = async (productData: Omit<CopyWritingProduct, 'id'>): Promise<CopyWritingProduct | null> => {
    try {
      console.log('➕ Adding new product to WooCommerce...', productData);

      // Prepare WooCommerce API create data
      const wooCreateData: any = {
        name: productData.name,
        type: 'simple',
        regular_price: productData.regular_price,
        description: productData.description,
        short_description: productData.short_description,
        status: 'publish',
        catalog_visibility: 'visible',
        manage_stock: false,
        stock_status: productData.stock_status || 'instock',
        featured: productData.featured || false,
        categories: productData.categories || [],
        tags: productData.tags || [],
        // Add language information as meta data
        meta_data: [
          {
            key: 'language',
            value: productData.language || 'en'
          },
          {
            key: 'is_bilingual_product',
            value: 'true'
          }
        ]
      };

      if (productData.sku) {
        wooCreateData.sku = productData.sku;
      }

      if (productData.sale_price) {
        wooCreateData.sale_price = productData.sale_price;
      }

      console.log('📤 Sending new product to WooCommerce:', wooCreateData);

      // Get WooCommerce API configuration
      const wooConfig = (wooCommerceAPI as any).config;
      const authHeader = (wooCommerceAPI as any).getAuthHeader();

      // Create product on WooCommerce
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${wooConfig.url}/wp-json/wc/v3/products`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(wooCreateData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ WooCommerce API Error:', errorText);
        throw new Error(`WooCommerce product creation failed: ${response.status} ${response.statusText}`);
      }

      const createdProduct = await response.json();
      console.log('✅ WooCommerce product creation successful:', createdProduct);

      // Convert to CopyWritingProduct format
      const newProduct: CopyWritingProduct = {
        id: createdProduct.id,
        name: createdProduct.name,
        slug: createdProduct.slug,
        permalink: createdProduct.permalink,
        description: createdProduct.description,
        short_description: createdProduct.short_description,
        sku: createdProduct.sku || '',
        price: createdProduct.price,
        regular_price: createdProduct.regular_price,
        sale_price: createdProduct.sale_price || '',
        on_sale: createdProduct.on_sale,
        stock_status: createdProduct.stock_status,
        total_sales: createdProduct.total_sales || 0,
        featured: createdProduct.featured,
        categories: createdProduct.categories || [],
        tags: createdProduct.tags || [],
        images: createdProduct.images || [],
        date_created: createdProduct.date_created,
        date_modified: createdProduct.date_modified,
        average_rating: createdProduct.average_rating || '0',
        rating_count: createdProduct.rating_count || 0,
        // Preserve language information from original productData
        language: productData.language,
        polylang_translations: productData.polylang_translations
      };

      // Update local state
      const updatedProducts = [...products, newProduct];
      setProducts(updatedProducts);
      
      // Update cache
      saveToCache(updatedProducts);
      
      toast.success(`Product "${newProduct.name}" created successfully!`);
      
      // Language will be automatically set by WordPress hooks based on SKU and content
      
      return newProduct;
    } catch (error) {
      console.error('❌ Error creating product:', error);
      toast.error(`Failed to create product: ${error.message}`);
      return null;
    }
  };

  const clearData = () => {
    setProducts([]);
    setError(null);
    setProgress(0);
    setStage('');
    setDetails('');
    setLastSyncTime(null);
    setIsFromCache(false);
    
    // Clear cache
    localStorage.removeItem(PRODUCTS_CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    console.log('🗑️ Cleared products data and cache');
  };

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      console.log('📂 Fetching categories from WooCommerce...');
      const wooCategories = await wooCommerceAPI.fetchCategories({
        per_page: 100,
        hide_empty: false,
        orderby: 'name',
        order: 'asc'
      });
      
      const formattedCategories = wooCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        count: cat.count
      }));
      
      setCategories(formattedCategories);
      console.log(`✅ Loaded ${formattedCategories.length} categories`);
      toast.success(`Loaded ${formattedCategories.length} categories`);
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      toast.error('Failed to fetch categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const uploadProductImage = async (productId: number, imageFile: File): Promise<boolean> => {
    try {
      console.log(`📷 Context: Starting image upload for product ${productId}...`);
      console.log(`📷 Context: File info - name: ${imageFile.name}, size: ${imageFile.size}, type: ${imageFile.type}`);
      
      const imageData = await wooCommerceAPI.uploadProductImage(productId, imageFile);
      console.log('📷 Context: WooCommerce API returned:', imageData);
      
      if (!imageData) {
        console.error('❌ Context: API returned null/undefined imageData');
        throw new Error('API returned empty image data');
      }
      
      if (!imageData.src) {
        console.error('❌ Context: API returned imageData without src:', imageData);
        throw new Error('Image data missing source URL');
      }
      
      // Update product in local state with new image
      const updatedProducts = products.map(product => 
        product.id === productId 
          ? { ...product, images: [imageData, ...product.images] }
          : product
      );
      setProducts(updatedProducts);
      saveToCache(updatedProducts);
      
      console.log('✅ Context: Image uploaded successfully and state updated:', imageData);
      toast.success(`✅ Product image uploaded successfully! Image ID: ${imageData.id}`);
      return true;
    } catch (error) {
      console.error('💥 Context: Error uploading image:', error);
      toast.error(`❌ Failed to upload image: ${error.message}`);
      return false;
    }
  };

  const deleteProduct = async (productId: number): Promise<boolean> => {
    try {
      console.log(`🗑️ Deleting product ${productId}...`);
      toast.info(`🗑️ Deleting product ${productId}...`);

      // Delete from WooCommerce
      const success = await wooCommerceAPI.deleteProduct(productId);
      
      if (success) {
        // Remove from local state
        setProducts(prev => prev.filter(p => p.id !== productId));
        
        // Update cache
        const updatedProducts = products.filter(p => p.id !== productId);
        saveToCache(updatedProducts);
        
        toast.success(`✅ Product ${productId} deleted successfully`);
        return true;
      } else {
        throw new Error('Failed to delete product from WooCommerce');
      }
    } catch (error) {
      console.error('❌ Error deleting product:', error);
      toast.error(`❌ Failed to delete product ${productId}`);
      return false;
    }
  };

  const value = {
    products,
    loading,
    isBackgroundProcessing,
    error,
    progress,
    stage,
    details,
    startFetching,
    clearData,
    syncProducts,
    updateProduct,
    addNewProduct,
    deleteProduct,
    lastSyncTime,
    isFromCache,
    categories,
    fetchCategories,
    uploadProductImage,
    loadingCategories,
    fixAllProductLanguages: async () => {
      toast.info('Language fixing is now automatic via WordPress hooks');
      return { success: true, message: 'Languages are automatically detected' };
    }
  };

  return (
    <CopyWritingProductsContext.Provider value={value}>
      {children}
    </CopyWritingProductsContext.Provider>
  );
};

export const useCopyWritingProducts = () => {
  const context = useContext(CopyWritingProductsContext);
  if (context === undefined) {
    throw new Error('useCopyWritingProducts must be used within a CopyWritingProductsProvider');
      }
    return context;
  }; 