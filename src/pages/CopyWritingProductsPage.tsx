import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Package, Star, Tag, Zap, TrendingUp, Search, Eye, ExternalLink, Copy, Edit3, ShoppingCart, Upload, Globe, RefreshCcw, Plus, Trash2, X, Grid3X3, List, Table } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useCopyWritingProducts, CopyWritingProduct } from '@/contexts/CopyWritingProductsContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductEditModal } from '@/components/ProductEditModal';
import { AddProductModal } from '@/components/AddProductModal';


// Flag components
const USAFlag = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 18" fill="none">
    <rect width="24" height="18" fill="#B22234"/>
    <rect width="24" height="1.385" y="1.385" fill="white"/>
    <rect width="24" height="1.385" y="4.154" fill="white"/>
    <rect width="24" height="1.385" y="6.923" fill="white"/>
    <rect width="24" height="1.385" y="9.692" fill="white"/>
    <rect width="24" height="1.385" y="12.462" fill="white"/>
    <rect width="24" height="1.385" y="15.231" fill="white"/>
    <rect width="9.6" height="9.692" fill="#3C3B6E"/>
  </svg>
);

const KSAFlag = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 18" fill="none">
    <rect width="24" height="18" fill="#006C35"/>
    <path d="M4 7h16v4H4z" fill="white"/>
    <text x="12" y="10.5" textAnchor="middle" fontSize="4" fill="#006C35">العربية</text>
  </svg>
);

// Saudi Riyal SVG Icon Component
const RiyalIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className}
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 1124.14 1256.39" 
    width="14" 
    height="15.432" 
    style={{ display: 'inline-block', verticalAlign: '-0.125em' }}
  >
    <path fill="currentColor" d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
    <path fill="currentColor" d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
  </svg>
);

const CopyWritingProductsPage = () => {
  const { 
    products, 
    loading, 
    error, 
    progress, 
    stage, 
    details, 
    startFetching,
    clearData,
    updateProduct,
    deleteProduct,
    lastSyncTime,
    isFromCache,
    syncProducts,
    addNewProduct,
    categories,
    fetchCategories,
    uploadProductImage,
    loadingCategories,
    fixAllProductLanguages
  } = useCopyWritingProducts();

  // Debug logging
  React.useEffect(() => {
    console.log('🔍 CopyWritingProductsPage mounted with state:', {
      loading,
      productsCount: products.length,
      progress,
      stage
    });
  }, []);

  React.useEffect(() => {
    console.log('🔍 State changed:', {
      loading,
      productsCount: products.length,
      progress,
      stage
    });
  }, [loading, products.length, progress, stage]);

  // Load categories on mount
  React.useEffect(() => {
    if (categories.length === 0 && !loadingCategories) {
      fetchCategories();
    }
  }, [categories.length, loadingCategories, fetchCategories]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingProduct, setEditingProduct] = useState<CopyWritingProduct | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  
  const productsPerPage = 50;

  // Enhanced helper function to detect Arabic content with better English detection
  const detectLanguage = React.useCallback((product: CopyWritingProduct): 'ar' | 'en' => {
    try {
      // Safety check for product existence
      if (!product) {
        console.warn('detectLanguage: Product is null or undefined');
        return 'en';
      }

      // First priority: explicit language field (from our bilingual creation)
      if (product.language) {
        return product.language;
      }
      
      // Second priority: check SKU suffix (our products have -en/-ar)
      if (product.sku) {
        if (product.sku.endsWith('-en')) {
          return 'en';
        }
        if (product.sku.endsWith('-ar')) {
          return 'ar';
        }
      }
      
      // Safe fallbacks for text fields
      const productName = product.name || '';
      const productDesc = product.description || '';
      const productShortDesc = product.short_description || '';
      
      // Third priority: analyze text content with improved logic
      const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/;
      const nameHasArabic = arabicPattern.test(productName);
      const descHasArabic = arabicPattern.test(productDesc);
      const shortDescHasArabic = arabicPattern.test(productShortDesc);
      
      // If any field has Arabic characters, it's Arabic
      if (nameHasArabic || descHasArabic || shortDescHasArabic) {
        return 'ar';
      }
      
      // Fourth priority: Check if name has common English patterns
      const englishPatterns = [
        /^[a-zA-Z]+[a-zA-Z0-9\s\-_.!@#$%^&*()+=<>?/]*$/, // Starts with English letters
        /\b(the|and|or|of|in|on|at|to|for|with|by)\b/i, // Common English words
        /\d+/, // Contains numbers (more common in English product names in this context)
      ];
      
      const nameText = productName.toLowerCase().trim();
      
      // Strong English indicators
      if (nameText && englishPatterns.some(pattern => pattern.test(nameText))) {
        return 'en';
      }
      
      // Fifth priority: Check if it's clearly Latin characters with mixed case
      const hasUpperCase = /[A-Z]/.test(productName);
      const hasLowerCase = /[a-z]/.test(productName);
      const isMainlyLatin = /^[a-zA-Z0-9\s\-_.!@#$%^&*()+=<>?/]*$/.test(productName.trim());
      
      if (isMainlyLatin && (hasUpperCase || hasLowerCase)) {
        return 'en';
      }
      
      // Special cases - if product name is clearly English but doesn't match above patterns
      const commonEnglishWords = ['health', 'care', 'vitamin', 'supplement', 'oil', 'cream', 'medicine', 'tablet', 'capsule', 'powder', 'liquid', 'natural', 'organic'];
      if (nameText && commonEnglishWords.some(word => nameText.includes(word))) {
        return 'en';
      }
      
      // Default to English if no clear Arabic indicators
      return 'en';
    } catch (error) {
      console.error('Error in detectLanguage:', error, 'Product:', product);
      // Safe fallback to prevent crashes
      return 'en';
    }
  }, []);

  const filteredProducts = React.useMemo(() => {
    try {
      return products.filter(product => {
        // Safe fallbacks for all fields
        const productName = product.name || '';
        const productDesc = product.description || '';
        const productShortDesc = product.short_description || '';
        const productSku = product.sku || '';
        const productCategories = product.categories || [];
        
        const matchesSearch = 
          productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          productDesc.toLowerCase().includes(searchTerm.toLowerCase()) ||
          productShortDesc.toLowerCase().includes(searchTerm.toLowerCase()) ||
          productSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.id.toString().includes(searchTerm);
        
        const matchesCategory = selectedCategory === 'all' || 
          productCategories.some(cat => cat?.name === selectedCategory);
        
        const matchesStatus = selectedStatus === 'all' || 
          (selectedStatus === 'on_sale' && product.on_sale) ||
          (selectedStatus === 'featured' && product.featured) ||
          (selectedStatus === 'instock' && product.stock_status === 'instock') ||
          (selectedStatus === 'outofstock' && product.stock_status === 'outofstock');

        let matchesLanguage = true;
        try {
          matchesLanguage = selectedLanguage === 'all' ||
            (selectedLanguage === 'en' && detectLanguage(product) === 'en') ||
            (selectedLanguage === 'ar' && detectLanguage(product) === 'ar');
        } catch (error) {
          console.warn('Language detection error for product:', product.id, error);
          // Default to showing the product if language detection fails
          matchesLanguage = selectedLanguage === 'all';
        }
        
        return matchesSearch && matchesCategory && matchesStatus && matchesLanguage;
      });
    } catch (error) {
      console.error('Error filtering products:', error);
      // Return all products if filtering fails to prevent white screen
      return products;
    }
     }, [products, searchTerm, selectedCategory, selectedStatus, selectedLanguage, detectLanguage]);

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedStatus, selectedLanguage]);

  const exportToExcel = () => {
    try {
      if (filteredProducts.length === 0) {
        toast.error('No products to export');
        return;
      }

      const exportData = filteredProducts.map(product => ({
        'Product ID': product.id,
        'Product Name': product.name,
        'SKU': product.sku || 'N/A',
        'Price (SAR)': product.price,
        'Regular Price (SAR)': product.regular_price,
        'Sale Price (SAR)': product.sale_price || 'N/A',
        'On Sale': product.on_sale ? 'Yes' : 'No',
        'Stock Status': product.stock_status,
        'Total Sales': product.total_sales,
        'Featured': product.featured ? 'Yes' : 'No',
        'Average Rating': product.average_rating,
        'Rating Count': product.rating_count,
        'Categories': product.categories.map(cat => cat.name).join(', '),
        'Tags': product.tags.map(tag => tag.name).join(', '),
        'Language': detectLanguage(product),
        'Short Description': product.short_description.replace(/<[^>]*>/g, ''), // Remove HTML tags
        'Date Created': product.date_created.split('T')[0],
        'Date Modified': product.date_modified.split('T')[0],
        'Permalink': product.permalink
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Copy Writing Products');

      const fileName = `copy_writing_products_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success(`Successfully exported ${exportData.length} products to Excel!`);
    } catch (error) {
      console.error('Error exporting products:', error);
      toast.error('Failed to export products');
    }
  };

  // Calculate stats with proper language detection
  const totalProducts = products.length;
  const totalRevenue = products.reduce((sum, product) => sum + parseFloat(product.price || '0'), 0);
  const totalSales = products.reduce((sum, product) => sum + product.total_sales, 0);
  const onSaleProducts = products.filter(p => p.on_sale).length;
  const featuredProducts = products.filter(p => p.featured).length;
  const inStockProducts = products.filter(p => p.stock_status === 'instock').length;
  const arabicProducts = products.filter(p => detectLanguage(p) === 'ar').length;
  const englishProducts = products.filter(p => detectLanguage(p) === 'en').length;

  const copyProductText = (product: any, type: 'name' | 'description' | 'short_description') => {
    let textToCopy = '';
    switch (type) {
      case 'name':
        textToCopy = product.name;
        break;
      case 'description':
        textToCopy = product.description.replace(/<[^>]*>/g, ''); // Remove HTML tags
        break;
      case 'short_description':
        textToCopy = product.short_description.replace(/<[^>]*>/g, ''); // Remove HTML tags
        break;
    }
    
    navigator.clipboard.writeText(textToCopy);
    toast.success(`Copied ${type.replace('_', ' ')} to clipboard!`);
  };

  const handleImageUpload = async (productId: number, file: File) => {
    const success = await uploadProductImage(productId, file);
    if (success) {
      // Refresh the products to show the new image
      // The context already handles updating the local state
    }
  };

  const handleQuickSync = () => {
    console.log('⚡ Quick Sync triggered - Updating cached products only');
    toast.info('⚡ Quick syncing - updating product data...', { duration: 3000 });
    
    // Just sync without clearing cache - this updates existing data
    syncProducts();
  };

  // Helper function to get bilingual product information
  const getBilingualProductInfo = (product: CopyWritingProduct) => {
    const currentLang = detectLanguage(product);
    const linkedProduct = products.find(p => {
      if (p.id === product.id) return false;
      
      // Check if they have similar names or are linked via meta data
      const otherLang = detectLanguage(p);
      if (currentLang === otherLang) return false;
      
      // Check for similar base names (removing language suffixes)
      const baseName1 = product.name.replace(/\s*-\s*(en|ar)$/i, '').trim();
      const baseName2 = p.name.replace(/\s*-\s*(en|ar)$/i, '').trim();
      
      // Check if they share a common base name or SKU pattern
      const sku1 = product.sku?.replace(/-?(en|ar)$/i, '') || '';
      const sku2 = p.sku?.replace(/-?(en|ar)$/i, '') || '';
      
      return (baseName1 === baseName2 && baseName1.length > 0) || 
             (sku1 === sku2 && sku1.length > 0);
    });
    
    if (linkedProduct) {
      const englishProduct = currentLang === 'en' ? product : linkedProduct;
      const arabicProduct = currentLang === 'ar' ? product : linkedProduct;
      
      return {
        hasTranslation: true,
        englishName: englishProduct.name,
        arabicName: arabicProduct.name,
        englishDesc: englishProduct.short_description,
        arabicDesc: arabicProduct.short_description,
        displayTitle: `${englishProduct.name} - ${arabicProduct.name}`,
        displayDesc: englishProduct.short_description || arabicProduct.short_description
      };
    }
    
    return {
      hasTranslation: false,
      englishName: currentLang === 'en' ? product.name : '',
      arabicName: currentLang === 'ar' ? product.name : '',
      englishDesc: currentLang === 'en' ? product.short_description : '',
      arabicDesc: currentLang === 'ar' ? product.short_description : '',
      displayTitle: product.name,
      displayDesc: product.short_description
    };
  };



  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Edit3 className="text-blue-500" />
            Copy Writing Products
          </h1>
          <p className="text-gray-600 mt-1">
            All products from WooCommerce • Perfect for creating compelling copy • Arabic & English Support
          </p>
        </div>
        
        <div className="flex flex-col gap-2">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 rounded-lg">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-blue-700">Loading...</span>
            </div>
          )}
          
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleQuickSync} 
              variant="outline" 
              size="sm"
              disabled={loading}
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              <Zap className="w-4 h-4 mr-2" />
              {loading ? 'Syncing...' : 'Quick Sync'}
            </Button>

            <Button 
              onClick={() => {
                console.log('🔄 Force Refresh clicked - will fetch fresh data from WooCommerce');
                toast.info('🔄 Force refreshing from WooCommerce...');
                syncProducts();
              }} 
              variant="outline" 
              size="sm"
              disabled={loading}
              className="border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Force Refresh'}
            </Button>

            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex items-center border rounded-lg p-1">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="h-8 px-3"
                >
                  <Table className="w-4 h-4 mr-1" />
                  Table
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="h-8 px-3"
                >
                  <Grid3X3 className="w-4 h-4 mr-1" />
                  Cards
                </Button>
              </div>

              <Button 
                onClick={() => setShowAddModal(true)} 
                className="bg-emerald-600 hover:bg-emerald-700"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>


            
            <Button 
              onClick={exportToExcel} 
              className="bg-green-600 hover:bg-green-700"
              disabled={filteredProducts.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>


          </div>
        </div>
      </motion.div>



      {/* Real-Time Loading Progress */}
      {loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg p-6"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-red-900 flex items-center gap-2">
                  🔴 LIVE {stage}
                </h3>
                <p className="text-sm text-red-700">{details}</p>
              </div>
            </div>
            <Progress value={progress} className="w-full" />
            <div className="flex justify-between text-xs text-red-600">
              <span>{progress}% Complete</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Real-time streaming active
              </span>
            </div>
            {products.length > 0 && (
              <div className="bg-white bg-opacity-50 rounded-lg p-3 border border-red-200">
                <p className="text-sm text-red-800 font-medium">
                  📊 {products.length} products loaded so far - Products appearing below in real-time!
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Enhanced Summary Stats */}
      {products.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4"
        >
          <Card className={`${products.length >= 500 ? 'border-green-200 bg-green-50' : products.length >= 361 ? 'border-blue-200 bg-blue-50' : products.length >= 300 ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${products.length >= 500 ? 'bg-green-100' : products.length >= 361 ? 'bg-blue-100' : products.length >= 300 ? 'bg-yellow-100' : 'bg-red-100'}`}>
                  <Package className={`h-5 w-5 ${products.length >= 500 ? 'text-green-600' : products.length >= 361 ? 'text-blue-600' : products.length >= 300 ? 'text-yellow-600' : 'text-red-600'}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold">
                    {totalProducts}
                    {products.length >= 500 && <span className="text-green-600 ml-2">🚀</span>}
                    {products.length >= 361 && products.length < 500 && <span className="text-blue-600 ml-2">✓</span>}
                    {products.length >= 300 && products.length < 361 && <span className="text-yellow-600 ml-2">⚠</span>}
                    {products.length < 300 && <span className="text-red-600 ml-2">⚡</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {products.length >= 500 ? 'Massive inventory loaded! 🎉' : 
                     products.length >= 361 ? 'Full product catalog loaded!' : 
                     products.length >= 300 ? `Loading... (${((products.length / 361) * 100).toFixed(1)}% of expected)` :
                     'Partial load - consider refreshing'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">In Stock</p>
                  <p className="text-2xl font-bold">{inStockProducts}</p>
                  <p className="text-xs text-gray-500">Available for sale</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold">SAR {totalRevenue.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Combined product values</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Tag className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Categories</p>
                  <p className="text-2xl font-bold">{categories.length}</p>
                  <p className="text-xs text-gray-500">Product categories</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Globe className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Languages</p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <USAFlag className="w-4 h-3" />
                      <span className="text-sm font-bold">{englishProducts}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <KSAFlag className="w-4 h-3" />
                      <span className="text-sm font-bold">{arabicProducts}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">EN / AR products</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Cache Performance Notice */}
      {isFromCache && products.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-200 rounded-lg p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <Package className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-900">⚡ Lightning Fast Cache Performance</h3>
              <p className="text-sm text-emerald-700">
                Data loaded instantly from cache • Products updated {new Date(lastSyncTime!).toLocaleDateString()} • 
                Real categories from WooCommerce • Multi-language support active
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filters and Search */}
      {products.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg border p-6 space-y-4"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search products, descriptions, SKU, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="w-full lg:w-48">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories ({categories.length})</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name} ({category.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Language Filter */}
            <div className="w-full lg:w-40">
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="All Languages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  <SelectItem value="en">
                    <div className="flex items-center gap-2">
                      <USAFlag className="w-4 h-3" />
                      English ({englishProducts})
                    </div>
                  </SelectItem>
                  <SelectItem value="ar">
                    <div className="flex items-center gap-2">
                      <KSAFlag className="w-4 h-3" />
                      العربية ({arabicProducts})
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="w-full lg:w-40">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="on_sale">On Sale ({onSaleProducts})</SelectItem>
                  <SelectItem value="featured">Featured ({featuredProducts})</SelectItem>
                  <SelectItem value="instock">In Stock ({inStockProducts})</SelectItem>
                  <SelectItem value="outofstock">Out of Stock ({totalProducts - inStockProducts})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filter Summary */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Showing {filteredProducts.length} of {totalProducts} products</span>
            {(searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all' || selectedLanguage !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setSelectedStatus('all');
                  setSelectedLanguage('all');
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Products Display */}
      {currentProducts.length > 0 && (
        <>
          {viewMode === 'table' ? (
            /* Table View */
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-900">Name</th>
                      <th className="text-left p-3 font-medium text-gray-900">SKU</th>
                      <th className="text-left p-3 font-medium text-gray-900">Stock</th>
                      <th className="text-left p-3 font-medium text-gray-900">Price</th>
                      <th className="text-left p-3 font-medium text-gray-900">Stats</th>
                      <th className="text-left p-3 font-medium text-gray-900">Views</th>
                      <th className="text-left p-3 font-medium text-gray-900">Brands</th>
                      <th className="text-left p-3 font-medium text-gray-900">AIOSEO Details</th>
                      <th className="text-left p-3 font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentProducts.map((product, index) => {
                      const bilingualInfo = getBilingualProductInfo(product);
                      const detectedLang = detectLanguage(product);
                      
                      return (
                        <tr key={product.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              {product.images.length > 0 ? (
                                <img
                                  src={product.images[0].src}
                                  alt={product.images[0].alt || product.name}
                                  className="w-12 h-12 object-cover rounded border"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                                  <Package className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                                  {product.name}
                                </div>
                                <div className="text-sm text-gray-500">ID: {product.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-sm text-gray-600">
                            {product.sku || '—'}
                          </td>
                          <td className="p-3">
                            <Badge variant={product.stock_status === 'instock' ? 'default' : 'destructive'} className="text-xs">
                              {product.stock_status === 'instock' ? 'In stock' : 'Out of stock'}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-green-600">SAR {product.price}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm">{product.average_rating}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <Eye className="w-4 h-4 text-gray-400" />
                              <span className="text-sm">{product.total_sales}</span>
                            </div>
                          </td>
                          <td className="p-3 text-sm text-gray-600">—</td>
                          <td className="p-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">Title:</span>
                                {detectedLang === 'ar' ? (
                                  <KSAFlag className="w-4 h-3" />
                                ) : (
                                  <USAFlag className="w-4 h-3" />
                                )}
                              </div>
                              <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                                {bilingualInfo.displayTitle}
                              </div>
                              <div className="text-xs text-gray-600">
                                <span className="font-medium">Description:</span> {bilingualInfo.displayDesc?.replace(/<[^>]*>/g, '').substring(0, 50) || product.name}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingProduct(product);
                                  setIsEditModalOpen(true);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(product.permalink, '_blank')}
                                className="h-8 w-8 p-0"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                              {detectedLang === 'ar' ? (
                                <KSAFlag className="w-5 h-3" />
                              ) : (
                                <USAFlag className="w-5 h-3" />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Cards View */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
          {currentProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Header with Product Info and Language Flag */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg leading-tight">
                            {(() => {
                              // Try to find the linked translation product
                              const currentLang = detectLanguage(product);
                              const linkedProduct = products.find(p => {
                                if (p.id === product.id) return false;
                                
                                // Check if they have similar names or are linked via meta data
                                const otherLang = detectLanguage(p);
                                if (currentLang === otherLang) return false;
                                
                                // Check for similar base names (removing language suffixes)
                                const baseName1 = product.name.replace(/\s*-\s*(en|ar)$/i, '').trim();
                                const baseName2 = p.name.replace(/\s*-\s*(en|ar)$/i, '').trim();
                                
                                // Check if they share a common base name or SKU pattern
                                const sku1 = product.sku?.replace(/-?(en|ar)$/i, '') || '';
                                const sku2 = p.sku?.replace(/-?(en|ar)$/i, '') || '';
                                
                                return (baseName1 === baseName2 && baseName1.length > 0) || 
                                       (sku1 === sku2 && sku1.length > 0);
                              });
                              
                              if (linkedProduct) {
                                const currentLang = detectLanguage(product);
                                if (currentLang === 'ar') {
                                  return `${product.name} - ${linkedProduct.name}`;
                                } else {
                                  return `${product.name} - ${linkedProduct.name}`;
                                }
                              }
                              
                              return product.name;
                            })()}
                          </h3>
                          {/* Language Flag */}
                          {(() => {
                            const detectedLang = detectLanguage(product);
                            console.log(`🏁 FINAL RESULT: Product ${product.id} "${product.name}" -> ${detectedLang}`);
                            return (
                              <div className="flex items-center gap-1">
                                {detectedLang === 'ar' ? (
                                  <KSAFlag className="w-6 h-4" />
                                ) : (
                                  <USAFlag className="w-6 h-4" />
                                )}
                                <span className="text-xs text-gray-500">
                                  {detectedLang === 'ar' ? 'AR' : 'EN'}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>ID: {product.id}</span>
                          {product.sku && <span>• SKU: {product.sku}</span>}
                        </div>
                      </div>
                      
                      {/* Product Image with Upload Option */}
                      <div className="relative group">
                        {product.images.length > 0 ? (
                          <img
                            src={product.images[0].src}
                            alt={product.images[0].alt || product.name}
                            className="w-20 h-20 object-cover rounded-lg border"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-100 rounded-lg border flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        
                        {/* Upload overlay */}
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleImageUpload(product.id, file);
                                }
                              }}
                            />
                            <Upload className="w-5 h-5 text-white" />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Price and Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <RiyalIcon className="text-green-600" />
                          <span className="font-bold text-lg text-green-600">
                            {product.price}
                          </span>
                        </div>
                        {product.on_sale && product.sale_price && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <span className="line-through">{product.regular_price}</span>
                            <Badge variant="destructive" className="text-xs">SALE</Badge>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {product.featured && <Badge variant="secondary">Featured</Badge>}
                        <Badge variant={product.stock_status === 'instock' ? 'default' : 'destructive'}>
                          {product.stock_status === 'instock' ? 'In Stock' : 'Out of Stock'}
                        </Badge>
                      </div>
                    </div>

                    {/* Categories and Tags */}
                    <div className="space-y-2">
                      {product.categories.map(category => (
                        <Badge key={category.id} variant="outline" className="mr-1 mb-1">
                          {category.name}
                        </Badge>
                      ))}
                    </div>

                    {/* Short Description */}
                    {product.short_description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {product.short_description.replace(/<[^>]*>/g, '')}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          {product.average_rating} ({product.rating_count})
                        </span>
                        <span>{product.total_sales} sales</span>
                      </div>
                      <span>{new Date(product.date_modified).toLocaleDateString()}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyProductText(product, 'name')}
                        className="text-xs"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy Name
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyProductText(product, 'short_description')}
                        className="text-xs"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy Short Desc
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyProductText(product, 'description')}
                        className="text-xs"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy Full Desc
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingProduct(product);
                          setIsEditModalOpen(true);
                        }}
                        className="text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                      >
                        <Edit3 className="w-3 h-3 mr-1" />
                        Edit Product
                      </Button>



                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to move "${product.name}" to trash? This will remove it from the product list.`)) {
                            try {
                              console.log(`🗑️ Moving product to trash: ${product.name} (ID: ${product.id})`);
                              const success = await deleteProduct(product.id);
                              if (success) {
                                toast.success(`Product "${product.name}" moved to trash successfully!`);
                                // The context will handle removing the product from the state
                              } else {
                                toast.error(`Failed to move product "${product.name}" to trash.`);
                              }
                            } catch (error) {
                              console.error('Error moving product to trash:', error);
                              toast.error(`Error moving product to trash: ${error?.message || 'Unknown error'}`);
                            }
                          }
                        }}
                        className="text-xs bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Move to Trash
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(product.permalink, '_blank')}
                        className="text-xs"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View Product
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
          )}
        </>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-8 h-8 p-0"
                >
                  {page}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!loading && products.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <Card>
            <CardContent className="p-8">
              <Edit3 className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Ready to Load All Product Data</h3>
              <p className="text-gray-600 mb-6">
                Click below to fetch ALL products from WooCommerce for your copy writing needs. No limits - we'll load everything with multi-language support!
              </p>
              <Button onClick={startFetching} className="bg-blue-500 hover:bg-blue-600 text-white">
                <Package className="w-4 h-4 mr-2" />
                Load All Products
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Product Edit Modal */}
      <ProductEditModal
        product={editingProduct}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={updateProduct}
      />

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={addNewProduct}
        categories={categories}
        uploadProductImage={uploadProductImage}
      />


    </div>
  );
};

export default CopyWritingProductsPage; 