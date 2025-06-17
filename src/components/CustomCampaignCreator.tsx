import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  X, 
  Target, 
  Calendar, 
  DollarSign, 
  Users, 
  Zap,
  Globe,
  Save,
  ArrowRight,
  Search,
  ShoppingCart,
  Package
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// SAR Icon Component
const SARIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className || "riyal-svg"} 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 1124.14 1256.39" 
    width="14" 
    height="15.432" 
    style={{display:'inline-block', verticalAlign:'-0.125em'}}
  >
    <path fill="currentColor" d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
    <path fill="currentColor" d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
  </svg>
);

interface CustomCampaignCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onCampaignCreated: () => void;
}

const CustomCampaignCreator: React.FC<CustomCampaignCreatorProps> = ({
  isOpen,
  onClose,
  onCampaignCreated
}) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Product selection state
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    // Basic Info
    strategyName: '',
    description: '',
    campaignType: 'conversion',
    priority: 'medium',
    
    // Budget & Timeline
    budgetMin: '',
    budgetRecommended: '',
    budgetMax: '',
    durationWeeks: '4',
    
    // Targeting
    targetAudiences: [''],
    targetCities: ['Riyadh', 'Jeddah'],
    targetAge: '25-45',
    targetGender: 'both',
    
    // Platforms & Formats
    platforms: ['Facebook/Instagram'],
    adFormats: ['Video ads'],
    keywords: [''],
    
    // Expected Results
    expectedROAS: '2.0',
    expectedRevenue: '',
    expectedConversions: '',
    expectedClicks: '',
    expectedCPC: '2.5',
    expectedCTR: '2.0',
    
    // Advanced
    marketFocus: 'Saudi Arabia - Urban areas',
    compliance: ['Arabic language support', 'Cultural appropriateness'],
    targetProducts: []
  });

  const platforms = [
    'Facebook/Instagram',
    'Google Ads', 
    'TikTok',
    'Snapchat',
    'Twitter',
    'LinkedIn'
  ];

  const adFormats = [
    'Video ads',
    'Image ads', 
    'Carousel ads',
    'Story ads',
    'Reel ads',
    'Shopping ads',
    'Text ads'
  ];

  const targetCities = [
    'Riyadh',
    'Jeddah', 
    'Dammam',
    'Mecca',
    'Medina',
    'Khobar',
    'Tabuk',
    'Abha'
  ];

  const complianceOptions = [
    'Arabic language support',
    'Cultural appropriateness', 
    'Islamic values alignment',
    'SFDA regulations',
    'Local business licensing',
    'Halal certification'
  ];

  // Load products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Helper function to detect Arabic products
  const detectProductLanguage = (product: any): 'ar' | 'en' => {
    // First priority: explicit language field
    if (product.language) {
      return product.language;
    }
    
    // Second priority: check SKU suffix for Polylang
    if (product.sku) {
      if (product.sku.endsWith('-ar')) {
        return 'ar';
      }
      if (product.sku.endsWith('-en')) {
        return 'en';
      }
    }
    
    // Third priority: analyze text content
    const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/;
    const productName = product.name || '';
    const productDesc = product.description || product.short_description || '';
    
    if (arabicPattern.test(productName) || arabicPattern.test(productDesc)) {
      return 'ar';
    }
    
    return 'en';
  };

  const fetchProducts = async (search: string = '') => {
    setLoadingProducts(true);
    try {
      // Get previously selected product IDs to preserve them
      const selectedProductIds = formData.targetProducts;
      
      // First try Supabase copy_writing_products table
      let query = supabase
        .from('copy_writing_products')
        .select('id, name, short_description, description, price, regular_price, sale_price, on_sale, total_sales, images, categories, stock_status, sku, language, permalink, slug')
        .eq('stock_status', 'instock')
        .order('total_sales', { ascending: false })
        .limit(100);

      if (search.trim()) {
        query = query.or(`name.ilike.%${search}%,short_description.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const { data: supabaseProducts, error } = await query;

      let allProducts = [];

      if (supabaseProducts && supabaseProducts.length > 0) {
        // Filter for Arabic products only
        allProducts = supabaseProducts.filter(product => detectProductLanguage(product) === 'ar');
        console.log(`✅ Found ${allProducts.length} Arabic products from Supabase out of ${supabaseProducts.length} total`);
      }

      // If no Arabic products found in Supabase, try WooCommerce API
      if (allProducts.length === 0) {
        try {
          console.log('🔄 No Arabic products in Supabase, trying WooCommerce API...');
          const { default: wooCommerceAPI } = await import('@/lib/woocommerceApi');
          
          const wooProducts = await wooCommerceAPI.fetchProducts({
            per_page: 100,
            page: 1,
            status: 'publish',
            search: search.trim() || undefined
          });

          if (wooProducts && wooProducts.length > 0) {
            // Debug: Check image structure from WooCommerce
            console.log('🔍 WooCommerce products sample:', {
              totalProducts: wooProducts.length,
              firstProduct: wooProducts[0]?.name,
              firstProductImages: wooProducts[0]?.images,
              imageCount: wooProducts[0]?.images?.length || 0,
              firstImageSrc: wooProducts[0]?.images?.[0]?.src,
              imageStructure: wooProducts[0]?.images?.[0]
            });
            
            // Filter for Arabic products only and add required fields
            const arabicWooProducts = wooProducts
              .filter(product => detectProductLanguage(product) === 'ar')
              .map(product => ({
                id: product.id,
                name: product.name || 'Unknown Product',
                short_description: product.short_description || '',
                description: product.description || '',
                price: parseFloat(product.price) || 0,
                regular_price: parseFloat(product.regular_price) || 0,
                sale_price: parseFloat(product.sale_price) || 0,
                on_sale: product.on_sale || false,
                total_sales: product.total_sales || 0,
                images: product.images || [],
                categories: product.categories || [],
                stock_status: product.stock_status || 'instock',
                sku: product.sku || '',
                language: product.language || (product.sku && product.sku.endsWith('-ar') ? 'ar' : 'en'),
                permalink: product.permalink || '',
                slug: product.slug || ''
              }));

            allProducts = arabicWooProducts;
            console.log(`✅ Found ${allProducts.length} Arabic products from WooCommerce out of ${wooProducts.length} total`);
          }
        } catch (wooError) {
          console.error('❌ WooCommerce API error:', wooError);
        }
      }

      // If we have previously selected products, make sure they're included even if they don't match current search
      if (selectedProductIds.length > 0) {
        try {
          console.log(`🔍 Preserving ${selectedProductIds.length} selected products:`, selectedProductIds);
          
          // Fetch the previously selected products specifically
          const { data: selectedProducts } = await supabase
            .from('copy_writing_products')
            .select('id, name, short_description, description, price, regular_price, sale_price, on_sale, total_sales, images, categories, stock_status, sku, language, permalink, slug')
            .in('id', selectedProductIds);

          if (selectedProducts && selectedProducts.length > 0) {
            const selectedArabicProducts = selectedProducts.filter(product => detectProductLanguage(product) === 'ar');
            
            // Merge with search results, avoiding duplicates and putting selected products first
            const existingIds = new Set(allProducts.map(p => p.id));
            const additionalProducts = selectedArabicProducts.filter(p => !existingIds.has(p.id));
            
            // Put selected products first for better UX
            allProducts = [...additionalProducts, ...allProducts];
            console.log(`✅ Preserved ${additionalProducts.length} previously selected products out of ${selectedProducts.length} fetched`);
          } else {
            console.warn('⚠️ Could not fetch selected products from Supabase, trying WooCommerce...');
            
                          // Fallback: try to get selected products from WooCommerce
              try {
                const { default: wooCommerceAPI } = await import('@/lib/woocommerceApi');
                const selectedWooProducts = [];
                
                for (const productId of selectedProductIds) {
                  try {
                    const product = await wooCommerceAPI.fetchProduct(productId);
                    console.log(`🔍 WooCommerce product ${productId} structure:`, {
                      id: product.id,
                      name: product.name,
                      images: product.images,
                      imageCount: product.images?.length || 0,
                      firstImage: product.images?.[0]
                    });
                    
                    if (product && detectProductLanguage(product) === 'ar') {
                      selectedWooProducts.push({
                        id: product.id,
                        name: product.name || 'Unknown Product',
                        short_description: product.short_description || '',
                        description: product.description || '',
                        price: parseFloat(product.price) || 0,
                        regular_price: parseFloat(product.regular_price) || 0,
                        sale_price: parseFloat(product.sale_price) || 0,
                        on_sale: product.on_sale || false,
                        total_sales: product.total_sales || 0,
                        images: product.images || [],
                        categories: product.categories || [],
                        stock_status: product.stock_status || 'instock',
                        sku: product.sku || '',
                        language: product.language || (product.sku && product.sku.endsWith('-ar') ? 'ar' : 'en'),
                        permalink: product.permalink || '',
                        slug: product.slug || ''
                      });
                    }
                  } catch (productError) {
                    console.warn(`Failed to fetch selected product ${productId}:`, productError);
                  }
                }
              
              if (selectedWooProducts.length > 0) {
                const existingIds = new Set(allProducts.map(p => p.id));
                const additionalProducts = selectedWooProducts.filter(p => !existingIds.has(p.id));
                // Put selected products first for better UX
                allProducts = [...additionalProducts, ...allProducts];
                console.log(`✅ Preserved ${additionalProducts.length} selected products from WooCommerce`);
              }
            } catch (wooError) {
              console.error('❌ Failed to fetch selected products from WooCommerce:', wooError);
            }
          }
        } catch (error) {
          console.warn('Could not fetch previously selected products:', error);
        }
      }

      if (allProducts.length === 0) {
        toast.error('No Arabic products found. Please ensure you have Arabic products with SKU ending in "-ar" or Arabic text in names.');
      }

      // Debug: log first product to understand structure
      if (allProducts.length > 0) {
        console.log('🔍 Sample product structure:', {
          id: allProducts[0].id,
          name: allProducts[0].name,
          images: allProducts[0].images,
          imageType: typeof allProducts[0].images?.[0],
          imageStructure: allProducts[0].images?.[0]
        });
      }
      
      setAvailableProducts(allProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleProductSearch = (search: string) => {
    setProductSearch(search);
    fetchProducts(search);
  };

  const toggleProductSelection = (productId: number) => {
    const currentProducts = formData.targetProducts;
    if (currentProducts.includes(productId)) {
      updateFormData('targetProducts', currentProducts.filter(id => id !== productId));
    } else {
      updateFormData('targetProducts', [...currentProducts, productId]);
    }
  };

  const getSelectedProductsInfo = () => {
    return availableProducts.filter(product => formData.targetProducts.includes(product.id));
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addToArray = (field: string) => {
    const current = formData[field as keyof typeof formData] as string[];
    updateFormData(field, [...current, '']);
  };

  const removeFromArray = (field: string, index: number) => {
    const current = formData[field as keyof typeof formData] as string[];
    updateFormData(field, current.filter((_, i) => i !== index));
  };

  const updateArrayItem = (field: string, index: number, value: string) => {
    const current = formData[field as keyof typeof formData] as string[];
    const updated = [...current];
    updated[index] = value;
    updateFormData(field, updated);
  };

  const toggleArrayItem = (field: string, item: string) => {
    const current = formData[field as keyof typeof formData] as string[];
    if (current.includes(item)) {
      updateFormData(field, current.filter(i => i !== item));
    } else {
      updateFormData(field, [...current, item]);
    }
  };

  const calculatePlatformBudgets = () => {
    const budgetAmount = parseFloat(formData.budgetRecommended) || 1000;
    const platformCount = formData.platforms.length;
    const budgetPerPlatform = Math.round(budgetAmount / platformCount);
    
    const budgets: Record<string, number> = {};
    formData.platforms.forEach(platform => {
      budgets[platform] = budgetPerPlatform;
    });
    
    return budgets;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please log in to create campaigns');
      return;
    }

    if (!formData.strategyName || !formData.budgetRecommended) {
      toast.error('Please fill in campaign name and budget');
      return;
    }

    setIsSubmitting(true);

    try {
      const platformBudgets = calculatePlatformBudgets();
      
      const campaignData = {
        created_by: user.id,
        title: formData.strategyName,
        description: formData.description,
        campaign_type: formData.campaignType,
        priority: formData.priority,
        confidence_score: 85,
        status: 'draft',
        
        budget_min: parseFloat(formData.budgetMin) || parseFloat(formData.budgetRecommended) * 0.7,
        budget_recommended: parseFloat(formData.budgetRecommended),
        budget_max: parseFloat(formData.budgetMax) || parseFloat(formData.budgetRecommended) * 1.5,
        duration_weeks: parseInt(formData.durationWeeks),
        
        expected_roas: parseFloat(formData.expectedROAS),
        expected_revenue: parseFloat(formData.expectedRevenue) || parseFloat(formData.budgetRecommended) * parseFloat(formData.expectedROAS),
        expected_conversions: parseInt(formData.expectedConversions) || Math.round(parseFloat(formData.budgetRecommended) / 50),
        expected_clicks: parseInt(formData.expectedClicks) || Math.round(parseFloat(formData.budgetRecommended) / parseFloat(formData.expectedCPC)),
        expected_cpc: parseFloat(formData.expectedCPC),
        expected_ctr: parseFloat(formData.expectedCTR),
        
        target_audiences: formData.targetAudiences.filter(a => a.trim()),
        platforms: formData.platforms,
        ad_formats: formData.adFormats,
        keywords: formData.keywords.filter(k => k.trim()),
        platform_budgets: platformBudgets,
        
        insights: [
          {
            type: 'targeting',
            title: 'Custom Campaign',
            description: `Campaign targeting ${formData.targetAge} in ${formData.targetCities.join(', ')}`
          }
        ],
        
        is_template: false,
        is_public: false,
        ai_recommendation_score: 85, // Custom campaigns get default score
        target_products: formData.targetProducts
      };

      const { data, error } = await supabase
        .from('custom_campaign_strategies')
        .insert([campaignData])
        .select()
        .single();

      if (error) {
        console.error('Error creating campaign:', error);
        toast.error('Failed to create campaign. Please try again.');
        return;
      }

      toast.success('✅ Custom campaign created successfully!');
      onCampaignCreated();
      onClose();
      
      // Reset form
      setCurrentStep(1);
      setFormData({
        strategyName: '',
        description: '',
        campaignType: 'conversion',
        priority: 'medium',
        budgetMin: '',
        budgetRecommended: '',
        budgetMax: '',
        durationWeeks: '4',
        targetAudiences: [''],
        targetCities: ['Riyadh', 'Jeddah'],
        targetAge: '25-45',
        targetGender: 'both',
        platforms: ['Facebook/Instagram'],
        adFormats: ['Video ads'],
        keywords: [''],
        expectedROAS: '2.0',
        expectedRevenue: '',
        expectedConversions: '',
        expectedClicks: '',
        expectedCPC: '2.5',
        expectedCTR: '2.0',
        marketFocus: 'Saudi Arabia - Urban areas',
        compliance: ['Arabic language support', 'Cultural appropriateness'],
        targetProducts: []
      });

    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-xl">
            <div>
              <h2 className="text-xl md:text-2xl font-bold">Create Custom Campaign</h2>
              <p className="text-purple-100 text-sm md:text-base">Design your perfect marketing strategy</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Progress */}
          <div className="px-6 py-4 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Step {currentStep} of 4</span>
              <span className="text-sm text-gray-600">{Math.round((currentStep / 4) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 4) * 100}%` }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            <Tabs value={currentStep.toString()} className="space-y-6">
              
              {/* Step 1: Basic Info */}
              <TabsContent value="1" className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Campaign Basics</h3>
                  <p className="text-gray-600">Let's start with the fundamentals</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="strategyName">Campaign Name *</Label>
                      <Input
                        id="strategyName"
                        value={formData.strategyName}
                        onChange={(e) => updateFormData('strategyName', e.target.value)}
                        placeholder="e.g., Q1 Brand Awareness Campaign"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="campaignType">Campaign Type</Label>
                      <Select value={formData.campaignType} onValueChange={(value) => updateFormData('campaignType', value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="awareness">Brand Awareness</SelectItem>
                          <SelectItem value="conversion">Conversion</SelectItem>
                          <SelectItem value="retargeting">Retargeting</SelectItem>
                          <SelectItem value="seasonal">Seasonal</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="priority">Priority Level</Label>
                      <Select value={formData.priority} onValueChange={(value) => updateFormData('priority', value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High Priority</SelectItem>
                          <SelectItem value="medium">Medium Priority</SelectItem>
                          <SelectItem value="low">Low Priority</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => updateFormData('description', e.target.value)}
                        placeholder="Describe your campaign goals and strategy..."
                        className="mt-1 h-32"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Step 2: Budget & Timeline */}
              <TabsContent value="2" className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Budget & Timeline</h3>
                  <p className="text-gray-600">Set your investment and duration</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Budget Planning
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="budgetRecommended">Recommended Budget (SAR) *</Label>
                        <div className="relative mt-1">
                          <Input
                            id="budgetRecommended"
                            type="number"
                            value={formData.budgetRecommended}
                            onChange={(e) => updateFormData('budgetRecommended', e.target.value)}
                            placeholder="5000"
                            className="pr-10"
                          />
                          <SARIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="budgetMin">Min Budget</Label>
                          <div className="relative mt-1">
                            <Input
                              id="budgetMin"
                              type="number"
                              value={formData.budgetMin}
                              onChange={(e) => updateFormData('budgetMin', e.target.value)}
                              placeholder={formData.budgetRecommended ? (parseFloat(formData.budgetRecommended) * 0.7).toString() : '3500'}
                              className="pr-10"
                            />
                            <SARIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="budgetMax">Max Budget</Label>
                          <div className="relative mt-1">
                            <Input
                              id="budgetMax"
                              type="number"
                              value={formData.budgetMax}
                              onChange={(e) => updateFormData('budgetMax', e.target.value)}
                              placeholder={formData.budgetRecommended ? (parseFloat(formData.budgetRecommended) * 1.5).toString() : '7500'}
                              className="pr-10"
                            />
                            <SARIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Timeline & Goals
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="durationWeeks">Campaign Duration (Weeks)</Label>
                        <Select value={formData.durationWeeks} onValueChange={(value) => updateFormData('durationWeeks', value)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2">2 Weeks</SelectItem>
                            <SelectItem value="3">3 Weeks</SelectItem>
                            <SelectItem value="4">4 Weeks</SelectItem>
                            <SelectItem value="6">6 Weeks</SelectItem>
                            <SelectItem value="8">8 Weeks</SelectItem>
                            <SelectItem value="12">12 Weeks</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="expectedROAS">Expected ROAS</Label>
                          <Input
                            id="expectedROAS"
                            type="number"
                            step="0.1"
                            value={formData.expectedROAS}
                            onChange={(e) => updateFormData('expectedROAS', e.target.value)}
                            placeholder="2.0"
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="expectedCPC">Expected CPC (SAR)</Label>
                          <div className="relative mt-1">
                            <Input
                              id="expectedCPC"
                              type="number"
                              step="0.1"
                              value={formData.expectedCPC}
                              onChange={(e) => updateFormData('expectedCPC', e.target.value)}
                              placeholder="2.5"
                              className="pr-10"
                            />
                            <SARIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Step 3: Targeting */}
              <TabsContent value="3" className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Audience Targeting</h3>
                  <p className="text-gray-600">Define your ideal customers</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Demographics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="targetAge">Target Age</Label>
                        <Select value={formData.targetAge} onValueChange={(value) => updateFormData('targetAge', value)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="18-25">18-25 years</SelectItem>
                            <SelectItem value="25-35">25-35 years</SelectItem>
                            <SelectItem value="25-45">25-45 years</SelectItem>
                            <SelectItem value="35-50">35-50 years</SelectItem>
                            <SelectItem value="45-65">45-65 years</SelectItem>
                            <SelectItem value="18-65">All ages (18-65)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="targetGender">Target Gender</Label>
                        <Select value={formData.targetGender} onValueChange={(value) => updateFormData('targetGender', value)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="both">Both</SelectItem>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Target Cities</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {targetCities.map(city => (
                            <div key={city} className="flex items-center space-x-2">
                              <Checkbox
                                id={city}
                                checked={formData.targetCities.includes(city)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    toggleArrayItem('targetCities', city);
                                  } else {
                                    toggleArrayItem('targetCities', city);
                                  }
                                }}
                              />
                              <Label htmlFor={city} className="text-sm">{city}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Custom Audiences
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Audience Segments</Label>
                        <div className="space-y-2 mt-2">
                          {formData.targetAudiences.map((audience, index) => (
                            <div key={index} className="flex gap-2">
                              <Input
                                value={audience}
                                onChange={(e) => updateArrayItem('targetAudiences', index, e.target.value)}
                                placeholder="e.g., Health-conscious professionals"
                                className="flex-1"
                              />
                              {formData.targetAudiences.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeFromArray('targetAudiences', index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addToArray('targetAudiences')}
                          className="mt-2"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Audience
                        </Button>
                      </div>

                      <div>
                        <Label>Keywords</Label>
                        <div className="space-y-2 mt-2">
                          {formData.keywords.map((keyword, index) => (
                            <div key={index} className="flex gap-2">
                              <Input
                                value={keyword}
                                onChange={(e) => updateArrayItem('keywords', index, e.target.value)}
                                placeholder="e.g., skincare, beauty products"
                                className="flex-1"
                              />
                              {formData.keywords.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeFromArray('keywords', index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addToArray('keywords')}
                          className="mt-2"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Keyword
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Target Products Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Target Products ({formData.targetProducts.length} selected)
                      </CardTitle>
                      <CardDescription>
                        Select specific products to target with this campaign
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Selected Products Summary */}
                      {formData.targetProducts.length > 0 && (
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2">Selected Products:</h4>
                          <div className="flex flex-wrap gap-2">
                            {getSelectedProductsInfo().slice(0, 3).map(product => (
                              <Badge key={product.id} variant="secondary" className="text-xs">
                                {product.name}
                              </Badge>
                            ))}
                            {formData.targetProducts.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{formData.targetProducts.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Product Selector Button */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowProductSelector(!showProductSelector)}
                        className="w-full"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {showProductSelector ? 'Hide Product Selector' : 'Select Target Products'}
                      </Button>

                      {/* Product Selector */}
                      {showProductSelector && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border rounded-lg p-4 space-y-4"
                        >
                          {/* Search */}
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Search products..."
                              value={productSearch}
                              onChange={(e) => handleProductSearch(e.target.value)}
                              className="pl-10"
                            />
                          </div>

                          {/* Products List */}
                          <div className="max-h-64 overflow-y-auto space-y-2">
                            {loadingProducts ? (
                              <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                <span className="ml-2 text-gray-600">Loading products...</span>
                              </div>
                            ) : availableProducts.length > 0 ? (
                              availableProducts.map(product => (
                                <div
                                  key={product.id}
                                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                    formData.targetProducts.includes(product.id)
                                      ? 'bg-blue-50 border-blue-200'
                                      : 'hover:bg-gray-50'
                                  }`}
                                  onClick={() => toggleProductSelection(product.id)}
                                >
                                  <Checkbox
                                    checked={formData.targetProducts.includes(product.id)}
                                    onChange={() => {}} // Handled by onClick above
                                  />
                                  
                                  <div className="flex-shrink-0">
                                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border">
                                      {product.images && product.images.length > 0 ? (
                                        <img
                                          src={
                                            typeof product.images[0] === 'string' 
                                              ? product.images[0] 
                                              : product.images[0]?.src || product.images[0]?.url || product.images[0]
                                          }
                                          alt={product.name}
                                          className="w-full h-full object-cover"
                                          onLoad={(e) => {
                                            console.log('✅ Image loaded successfully:', e.currentTarget.src);
                                          }}
                                          onError={(e) => {
                                            console.warn('❌ Image failed to load:', e.currentTarget.src);
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            target.parentElement!.innerHTML = `
                                              <div class="w-full h-full bg-gray-200 flex items-center justify-center">
                                                <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                                </svg>
                                              </div>
                                            `;
                                          }}
                                        />
                                      ) : (
                                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-medium text-gray-900 truncate">{product.name}</h4>
                                      <Badge 
                                        className={`text-xs px-2 py-0.5 ${detectProductLanguage(product) === 'ar' 
                                          ? 'bg-green-100 text-green-800 border-green-200' 
                                          : 'bg-blue-100 text-blue-800 border-blue-200'
                                        }`}
                                      >
                                        {detectProductLanguage(product) === 'ar' ? '🇸🇦 عربي' : '🇺🇸 English'}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-2">
                                      {product.short_description || 'No description available'}
                                    </p>
                                    
                                    <div className="flex items-center gap-4 mt-2 text-sm">
                                      <span className="font-bold text-green-600 flex items-center gap-1">
                                        {product.on_sale && product.sale_price ? (
                                          <>
                                            <span className="line-through text-gray-400">
                                              {parseFloat(product.regular_price).toLocaleString()}
                                            </span>
                                            <span>{parseFloat(product.sale_price).toLocaleString()}</span>
                                          </>
                                        ) : (
                                          parseFloat(product.price).toLocaleString()
                                        )}
                                        <SARIcon />
                                      </span>
                                      
                                      <span className="text-gray-500">
                                        Sales: {product.total_sales || 0}
                                      </span>
                                      
                                      {product.on_sale && (
                                        <Badge variant="destructive" className="text-xs">Sale</Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>No products found</p>
                                {productSearch && (
                                  <p className="text-sm">Try a different search term</p>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Step 4: Platforms & Final */}
              <TabsContent value="4" className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-2">Platforms & Compliance</h3>
                  <p className="text-gray-600">Choose your channels and ensure compliance</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Advertising Platforms
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Platforms</Label>
                        <div className="grid grid-cols-1 gap-2 mt-2">
                          {platforms.map(platform => (
                            <div key={platform} className="flex items-center space-x-2">
                              <Checkbox
                                id={platform}
                                checked={formData.platforms.includes(platform)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    toggleArrayItem('platforms', platform);
                                  } else {
                                    toggleArrayItem('platforms', platform);
                                  }
                                }}
                              />
                              <Label htmlFor={platform} className="text-sm">{platform}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label>Ad Formats</Label>
                        <div className="grid grid-cols-1 gap-2 mt-2">
                          {adFormats.map(format => (
                            <div key={format} className="flex items-center space-x-2">
                              <Checkbox
                                id={format}
                                checked={formData.adFormats.includes(format)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    toggleArrayItem('adFormats', format);
                                  } else {
                                    toggleArrayItem('adFormats', format);
                                  }
                                }}
                              />
                              <Label htmlFor={format} className="text-sm">{format}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Market & Compliance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="marketFocus">Market Focus</Label>
                        <Input
                          id="marketFocus"
                          value={formData.marketFocus}
                          onChange={(e) => updateFormData('marketFocus', e.target.value)}
                          placeholder="Saudi Arabia - Urban areas"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>Compliance Requirements</Label>
                        <div className="grid grid-cols-1 gap-2 mt-2">
                          {complianceOptions.map(option => (
                            <div key={option} className="flex items-center space-x-2">
                              <Checkbox
                                id={option}
                                checked={formData.compliance.includes(option)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    toggleArrayItem('compliance', option);
                                  } else {
                                    toggleArrayItem('compliance', option);
                                  }
                                }}
                              />
                              <Label htmlFor={option} className="text-sm">{option}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Campaign Preview */}
                      <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border">
                        <h4 className="font-semibold text-purple-800 mb-2">Campaign Preview</h4>
                        <div className="text-sm space-y-1">
                          <div><strong>Name:</strong> {formData.strategyName || 'Untitled Campaign'}</div>
                          <div><strong>Budget:</strong> {formData.budgetRecommended ? `${formData.budgetRecommended} SAR` : 'Not set'}</div>
                          <div><strong>Duration:</strong> {formData.durationWeeks} weeks</div>
                          <div><strong>Platforms:</strong> {formData.platforms.length} selected</div>
                          <div><strong>Expected ROAS:</strong> {formData.expectedROAS}x</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-6 border-t bg-gray-50">
            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  disabled={isSubmitting}
                >
                  Previous
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {currentStep < 4 ? (
                <Button
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  disabled={isSubmitting}
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                  disabled={isSubmitting || !formData.strategyName || !formData.budgetRecommended}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Create Campaign
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CustomCampaignCreator; 