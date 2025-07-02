import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStrategy } from '@/contexts/StrategyContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import CustomCampaignCreator from '@/components/CustomCampaignCreator';
import { 
  TrendingUp, 
  Target, 
  Calendar, 
  DollarSign, 
  BarChart3, 
  Zap, 
  Award,
  Clock,
  Users,
  ShoppingCart,
  ArrowRight,
  Lightbulb,
  CheckCircle,
  AlertTriangle,
  Star,
  Download,
  Plus,
  Save,
  RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';

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

interface CampaignRecommendation {
  id: string;
  type: 'awareness' | 'conversion' | 'retargeting' | 'seasonal' | 'supplements' | 'ramadan' | 'custom';
  title: string;
  description: string;
  targetProducts: any[];
  budget: {
    min: number;
    recommended: number;
    max: number;
  };
  duration: {
    weeks: number;
    startDate: string;
    endDate: string;
  };
  expectedResults: {
    clicks: number;
    conversions: number;
    revenue: number;
    roas: number;
    cpc: number;
    ctr: number;
  };
  strategy: {
    audience: string[];
    platforms: string[];
    adFormats: string[];
    keywords: string[];
    marketFocus: string;
    compliance: string[];
  };
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  isApproved?: boolean;
  approvedAt?: string;
  isCustom?: boolean;
  marketStudy?: {
    targetAge: string;
    targetGender: string;
    targetCities: string[];
    culturalConsiderations: string[];
    localTrends: string[];
  };
}

// Old SAUDI_SPECIFIC_CAMPAIGNS removed - now using EXPANDED_SAUDI_CAMPAIGNS only

// Enhanced Arabic product keywords for better targeting
const ARABIC_PRODUCT_CATEGORIES = {
  'مكملات البروتين': ['بروتين واي', 'بروتين نباتي', 'بروتين حلال', 'كازين', 'أحماض أمينية'],
  'مكملات الجمال': ['كولاجين', 'بيوتين', 'فيتامين هـ', 'أوميغا 3', 'مضادات الأكسدة'],
  'مكملات الطاقة': ['كرياتين', 'كافيين طبيعي', 'جينسنغ', 'تورين', 'فيتامينات ب'],
  'مكملات النساء': ['حمض الفوليك', 'حديد', 'كالسيوم', 'فيتامين د', 'مغنيسيوم'],
  'مكملات الرجال': ['زنك', 'فيتامين د3', 'تستوستيرون طبيعي', 'ليكوبين', 'سيلينيوم'],
  'مكملات كبار السن': ['جلوكوزامين', 'كوندرويتين', 'كالسيوم', 'فيتامين ك2', 'كوكيو 10'],
  'مكملات الأطفال': ['فيتامينات متعددة', 'أوميغا 3 للأطفال', 'كالسيوم للنمو', 'فيتامين د', 'بروبيوتيك'],
  'مكملات المناعة': ['فيتامين سي', 'زنك', 'إشنسا', 'عكبر النحل', 'فيتامين د3'],
  'مكملات الوزن': ['جارسينيا كامبوجيا', 'شاي أخضر', 'كيتونات التوت', 'كروم', 'ليبو 6'],
  'مكملات النوم': ['ميلاتونين', 'فاليريان', 'ماغنوليا', 'باشن فلاور', 'جليسين'],
  'مكملات الهضم': ['بروبيوتيك', 'إنزيمات هضمية', 'ألياف طبيعية', 'جذر الزنجبيل', 'بيتاين'],
  'مكملات القلب': ['أوميغا 3', 'كوكيو 10', 'مغنيسيوم', 'هوثورن', 'ناتوكيناز'],
  'مكملات المخ': ['جنكة بيلوبا', 'فوسفاتيديل سيرين', 'باكوبا مونييري', 'روديولا', 'أسيتيل كارنيتين'],
  'مكملات الكبد': ['شوك الحليب', 'كركم', 'أرتيشوك', 'دانديليون', 'NAC'],
  'مكملات العظام': ['كالسيوم مع د3', 'مغنيسيوم', 'فيتامين ك2', 'بورون', 'سترونتيوم']
};

// Helper functions for Saudi market data
const generateSaudiKeywords = (campaignType: string): string[] => {
  const keywordMap: Record<string, string[]> = {
    'Protein Dominance': ['مكملات البروتين', 'بروتين حلال', 'مكملات الجيم', 'بناء العضلات', 'بروتين نباتي', 'protein supplements', 'whey protein', 'plant protein', 'gym nutrition'],
    'Beauty Wellness': ['مكملات الجمال', 'فيتامينات للبشرة', 'كولاجين', 'جمال طبيعي', 'فيتامين د', 'beauty supplements', 'collagen', 'vitamin D', 'hair vitamins'],
    'Executive Energy': ['مكملات الطاقة', 'فيتامينات للتركيز', 'مكملات المدراء', 'تخفيف الضغط', 'طاقة العمل', 'energy supplements', 'stress relief', 'cognitive enhancement', 'executive health'],
    'Ramadan Fitness': ['مكملات رمضان', 'فيتامينات الصيام', 'طاقة الإفطار', 'لياقة رمضان', 'مكملات حلال', 'ramadan supplements', 'iftar nutrition', 'energy for fasting', 'halal supplements'],
    'Weight Management': ['إنقاص الوزن', 'حارق الدهون', 'مكملات الرجيم', 'تخسيس طبيعي', 'كبح الشهية', 'weight loss', 'fat burner', 'diet supplements', 'appetite suppressant'],
    'Immunity Boost': ['تقوية المناعة', 'فيتامين سي', 'زنك', 'وقاية طبيعية', 'مقاومة الأمراض', 'immunity boost', 'vitamin C', 'zinc', 'immune support'],
    'Hair Skin Nails': ['جمال الشعر', 'نضارة البشرة', 'تقوية الأظافر', 'بيوتين', 'كولاجين طبيعي', 'hair beauty', 'skin glow', 'nail strength', 'biotin', 'collagen'],
    'Energy Vitality': ['طاقة طبيعية', 'مكافحة التعب', 'حيوية يومية', 'منشط طبيعي', 'فيتامينات الطاقة', 'natural energy', 'fatigue relief', 'daily vitality', 'energy vitamins'],
    'Digestive Health': ['صحة الهضم', 'بروبيوتيك', 'صحة الأمعاء', 'هضم طبيعي', 'انزيمات هضمية', 'digestive health', 'probiotics', 'gut health', 'digestive enzymes'],
    'Brain Cognitive': ['تقوية الذاكرة', 'تحسين التركيز', 'نشاط ذهني', 'مكملات المخ', 'أوميغا 3', 'memory enhancement', 'focus improvement', 'brain supplements', 'omega 3'],
    'Heart Health': ['صحة القلب', 'كوليسترول طبيعي', 'ضغط الدم', 'أوميغا 3', 'مضادات الأكسدة', 'heart health', 'cholesterol support', 'blood pressure', 'cardiovascular'],
    'Sleep Recovery': ['تحسين النوم', 'ميلاتونين طبيعي', 'نوم عميق', 'تعافي سريع', 'استرخاء طبيعي', 'sleep improvement', 'melatonin', 'deep sleep', 'recovery'],
    'Anti Aging': ['مكافحة الشيخوخة', 'مضادات الأكسدة', 'كولاجين متقدم', 'شباب دائم', 'مكملات عمر', 'anti aging', 'antioxidants', 'advanced collagen', 'longevity'],
    'Sports Performance': ['أداء رياضي', 'تحمل عضلي', 'طاقة تدريب', 'انتعاش سريع', 'قوة طبيعية', 'sports performance', 'muscle endurance', 'workout energy', 'natural strength'],
    'Diabetes Support': ['دعم السكري', 'تنظيم السكر', 'مكملات السكري', 'سكر طبيعي', 'انسولين طبيعي', 'diabetes support', 'blood sugar', 'glucose control', 'natural insulin'],
    'Maternal Health': ['مكملات الحمل', 'فيتامينات النفاس', 'صحة الأم', 'حمض الفوليك', 'فيتامينات للحامل', 'prenatal vitamins', 'pregnancy supplements', 'maternal health', 'folic acid'],
    'Bone Joint Health': ['مكملات العظام', 'فيتامين د', 'كالسيوم', 'صحة المفاصل', 'هشاشة العظام', 'bone health', 'joint supplements', 'calcium', 'osteoporosis prevention'],
    'Liver Detox': ['تنظيف الكبد', 'ديتوكس طبيعي', 'حماية الكبد', 'تطهير الجسم', 'شوك الحليب', 'liver detox', 'natural cleanse', 'liver protection', 'milk thistle'],
    'Thyroid Support': ['الغدة الدرقية', 'توازن هرموني', 'دعم الدرقية', 'أيودين طبيعي', 'تنظيم هرمونات', 'thyroid support', 'hormone balance', 'natural iodine', 'thyroid health'],
    'Menopause Support': ['سن اليأس', 'انقطاع الطمث', 'هرمونات طبيعية', 'دعم النساء', 'توازن هرموني', 'menopause support', 'hormone balance', 'women support', 'natural relief']
  };
  
  return keywordMap[campaignType] || ['مكملات غذائية', 'فيتامينات', 'صحة طبيعية', 'supplements', 'health', 'nutrition', 'vitamins', 'wellness'];
};

const generateIslamicCompliance = (campaignType: string): string[] => {
  const baseCompliance = [
    'Halal certification mandatory (65% purchase intent increase)',
    'Honest ingredient disclosure per Prophet\'s teachings',
    'No interest-based payment plans (Riba-free)',
    'Transparent pricing without gouging (Qist principle)',
    'Allow returns post-purchase (buyer remorse relief)',
    'Allocate 5% revenue to Sadaqah (charity) programs'
  ];
  
  const specificCompliance: Record<string, string[]> = {
    'Beauty Wellness': ['Female spokesperson preference', 'Private setting imagery', 'Modest advertising approach'],
    'Ramadan Fitness': ['Cultural sensitivity in all content', 'Family-friendly messaging', 'Respectful timing (avoid prayer times)'],
    'Maternal Health': ['Family values emphasis', 'Medical professional endorsements', 'Conservative visual approach'],
    'Bone Joint Health': ['Respectful elderly representation', 'Family care values emphasis', 'Healthcare professional endorsements']
  };
  
  return [...baseCompliance, ...(specificCompliance[campaignType] || [])];
};

// Smart product categorization based on keywords, descriptions, and tags
const categorizeProductsByKeywords = (products: any[]) => {
  const categories = {
    protein: [] as any[],
    vitamins: [] as any[],
    supplements: [] as any[],
    beauty: [] as any[],
    fitness: [] as any[],
    health: [] as any[],
    weight: [] as any[],
    immunity: [] as any[],
    energy: [] as any[],
    digestive: [] as any[],
    brain: [] as any[],
    heart: [] as any[],
    sleep: [] as any[],
    antiaging: [] as any[],
    sports: [] as any[],
    diabetes: [] as any[],
    maternal: [] as any[],
    bone: [] as any[],
    liver: [] as any[],
    thyroid: [] as any[],
    menopause: [] as any[],
    men: [] as any[],
    women: [] as any[],
    seniors: [] as any[],
    children: [] as any[]
  };

  products.forEach(product => {
    const searchText = `${product.name} ${product.description || ''} ${product.short_description || ''} ${product.categories?.map((c: any) => c.name).join(' ') || ''} ${product.tags?.map((t: any) => t.name).join(' ') || ''}`.toLowerCase();
    
    // Protein & Fitness
    if (searchText.includes('protein') || searchText.includes('whey') || searchText.includes('casein') || searchText.includes('amino') || searchText.includes('creatine') || searchText.includes('bcaa') || searchText.includes('بروتين')) {
      categories.protein.push(product);
    }
    if (searchText.includes('fitness') || searchText.includes('gym') || searchText.includes('muscle') || searchText.includes('bodybuilding') || searchText.includes('workout') || searchText.includes('لياقة') || searchText.includes('عضلات')) {
      categories.fitness.push(product);
    }
    if (searchText.includes('sports') || searchText.includes('athletic') || searchText.includes('performance') || searchText.includes('endurance') || searchText.includes('رياضة')) {
      categories.sports.push(product);
    }

    // Vitamins & Supplements
    if (searchText.includes('vitamin') || searchText.includes('multivitamin') || searchText.includes('فيتامين')) {
      categories.vitamins.push(product);
    }
    if (searchText.includes('supplement') || searchText.includes('nutrition') || searchText.includes('مكمل') || searchText.includes('مكملات')) {
      categories.supplements.push(product);
    }

    // Beauty & Wellness
    if (searchText.includes('beauty') || searchText.includes('skin') || searchText.includes('hair') || searchText.includes('nail') || searchText.includes('collagen') || searchText.includes('biotin') || searchText.includes('جمال') || searchText.includes('بشرة') || searchText.includes('شعر')) {
      categories.beauty.push(product);
    }

    // Health Categories
    if (searchText.includes('weight') || searchText.includes('fat') || searchText.includes('slim') || searchText.includes('diet') || searchText.includes('وزن') || searchText.includes('تخسيس') || searchText.includes('رجيم')) {
      categories.weight.push(product);
    }
    if (searchText.includes('immunity') || searchText.includes('immune') || searchText.includes('defense') || searchText.includes('مناعة') || searchText.includes('مقاومة')) {
      categories.immunity.push(product);
    }
    if (searchText.includes('energy') || searchText.includes('vitality') || searchText.includes('fatigue') || searchText.includes('طاقة') || searchText.includes('حيوية')) {
      categories.energy.push(product);
    }
    if (searchText.includes('digestive') || searchText.includes('probiotic') || searchText.includes('gut') || searchText.includes('هضم') || searchText.includes('أمعاء')) {
      categories.digestive.push(product);
    }
    if (searchText.includes('brain') || searchText.includes('memory') || searchText.includes('cognitive') || searchText.includes('focus') || searchText.includes('ذاكرة') || searchText.includes('تركيز')) {
      categories.brain.push(product);
    }
    if (searchText.includes('heart') || searchText.includes('cardiovascular') || searchText.includes('omega') || searchText.includes('قلب') || searchText.includes('أوميغا')) {
      categories.heart.push(product);
    }
    if (searchText.includes('sleep') || searchText.includes('melatonin') || searchText.includes('rest') || searchText.includes('نوم') || searchText.includes('استرخاء')) {
      categories.sleep.push(product);
    }
    if (searchText.includes('aging') || searchText.includes('anti-aging') || searchText.includes('antioxidant') || searchText.includes('شيخوخة') || searchText.includes('مضاد')) {
      categories.antiaging.push(product);
    }
    if (searchText.includes('diabetes') || searchText.includes('blood sugar') || searchText.includes('glucose') || searchText.includes('سكري') || searchText.includes('سكر')) {
      categories.diabetes.push(product);
    }
    if (searchText.includes('prenatal') || searchText.includes('pregnancy') || searchText.includes('maternal') || searchText.includes('folic') || searchText.includes('حمل') || searchText.includes('أمومة')) {
      categories.maternal.push(product);
    }
    if (searchText.includes('bone') || searchText.includes('calcium') || searchText.includes('joint') || searchText.includes('عظام') || searchText.includes('مفاصل')) {
      categories.bone.push(product);
    }
    if (searchText.includes('liver') || searchText.includes('detox') || searchText.includes('cleanse') || searchText.includes('كبد') || searchText.includes('تنظيف')) {
      categories.liver.push(product);
    }
    if (searchText.includes('thyroid') || searchText.includes('hormone') || searchText.includes('درقية') || searchText.includes('هرمون')) {
      categories.thyroid.push(product);
    }
    if (searchText.includes('menopause') || searchText.includes('women') || searchText.includes('female') || searchText.includes('سن اليأس') || searchText.includes('نساء')) {
      categories.menopause.push(product);
      categories.women.push(product);
    }

    // Demographics
    if (searchText.includes('men') || searchText.includes('male') || searchText.includes('testosterone') || searchText.includes('رجال')) {
      categories.men.push(product);
    }
    if (searchText.includes('senior') || searchText.includes('elderly') || searchText.includes('كبار السن')) {
      categories.seniors.push(product);
    }
    if (searchText.includes('children') || searchText.includes('kids') || searchText.includes('pediatric') || searchText.includes('أطفال')) {
      categories.children.push(product);
    }

    // General health if no specific category
    if (searchText.includes('health') || searchText.includes('wellness') || searchText.includes('صحة')) {
      categories.health.push(product);
    }
  });

  return categories;
};

// Generate target products based on category
const generateTargetProducts = (productCategory?: string, products: any[] = []) => {
  if (!products || products.length === 0) return [];
  
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
  
  // Filter for Arabic products only
  const arabicProducts = products.filter(product => detectProductLanguage(product) === 'ar');
  
  if (arabicProducts.length === 0) {
    console.log('⚠️ No Arabic products found for campaign targeting');
    return [];
  }
  
  console.log(`🎯 Targeting ${arabicProducts.length} Arabic products out of ${products.length} total products`);
  
  // Debug: Check image data in Arabic products
  if (arabicProducts.length > 0) {
    console.log('🔍 Arabic product sample for campaign targeting:', {
      firstProduct: arabicProducts[0]?.name,
      images: arabicProducts[0]?.images,
      imageCount: arabicProducts[0]?.images?.length || 0,
      firstImageSrc: arabicProducts[0]?.images?.[0]?.src,
      imageStructure: arabicProducts[0]?.images?.[0]
    });
  }
  
  // Use smart categorization on Arabic products only
  const categorizedProducts = categorizeProductsByKeywords(arabicProducts);
  
  // Get products from the specified category
  let relevantProducts = [];
  if (productCategory && categorizedProducts[productCategory as keyof typeof categorizedProducts]) {
    relevantProducts = categorizedProducts[productCategory as keyof typeof categorizedProducts];
  }
  
  // If no relevant products found, use high-performing Arabic products
  if (relevantProducts.length === 0) {
    relevantProducts = arabicProducts
      .filter(p => p.total_sales > 0)
      .sort((a, b) => b.total_sales - a.total_sales);
  }
  
  // Sort by sales performance and take top products
  const sortedProducts = relevantProducts
    .sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0))
    .slice(0, 4);
  
  // If not enough products, add some from general health category (Arabic only)
  if (sortedProducts.length < 3) {
    const healthProducts = (categorizedProducts.health || [])
      .filter(p => !sortedProducts.includes(p))
      .slice(0, 3 - sortedProducts.length);
    
    return [...sortedProducts, ...healthProducts];
  }
  
  return sortedProducts;
};

// Expanded Saudi-specific campaigns with smart product targeting
const EXPANDED_SAUDI_CAMPAIGNS = [
  {
    type: 'Protein Dominance',
    title: '🏋️ هيمنة مكملات البروتين - Protein Supplement Dominance',
    description: 'استهداف القطاع الأسرع نمواً في المكملات الغذائية بحلول بروتين مخصصة',
    confidence: 95,
    priority: 'High',
    productCategory: 'protein',
    budget: { min: 12000, recommended: 20000, max: 35000 },
    expectedResults: { roas: 3.2, revenue: 64000, conversions: 220 },
    arabicKeywords: ['مكملات البروتين', 'بروتين حلال', 'مكملات الجيم', 'بناء العضلات'],
    marketData: { size: '1.2B$+', growth: '8.5%', opportunity: '30.3% fitness enthusiasts' }
  },
  {
    type: 'Beauty Wellness',
    title: '👩 ثورة الجمال من الداخل - Beauty-from-Within Revolution',
    description: 'استهداف النساء السعوديات الواعيات صحياً بمكملات الجمال',
    confidence: 88,
    priority: 'High',
    productCategory: 'beauty',
    budget: { min: 15000, recommended: 25000, max: 40000 },
    expectedResults: { roas: 2.8, revenue: 70000, conversions: 190 },
    arabicKeywords: ['مكملات الجمال', 'فيتامينات للبشرة', 'كولاجين', 'جمال طبيعي'],
    marketData: { size: '950M$', growth: '7.2%', opportunity: '82.8% women use vitamins' }
  },
  {
    type: 'Executive Energy',
    title: '💼 إدارة الطاقة والضغط للمدراء - Executive Stress & Energy Management',
    description: 'حلول راقية لتخفيف الضغط وتعزيز الإدراك للمهنيين',
    confidence: 90,
    priority: 'High',
    productCategory: 'energy',
    budget: { min: 20000, recommended: 35000, max: 60000 },
    expectedResults: { roas: 3.5, revenue: 122500, conversions: 175 },
    arabicKeywords: ['مكملات الطاقة', 'فيتامينات للتركيز', 'مكملات المدراء'],
    marketData: { size: '1.1B$', growth: '9.2%', opportunity: '82.1% urban professionals' }
  },
  {
    type: 'Ramadan Fitness',
    title: '🌙 صحة ولياقة رمضان - Ramadan Health & Fitness',
    description: 'مكملات طاقة متوافقة مع الإفطار للياقة رمضانية',
    confidence: 92,
    priority: 'High',
    productCategory: 'fitness',
    budget: { min: 18000, recommended: 30000, max: 50000 },
    expectedResults: { roas: 3.8, revenue: 114000, conversions: 280 },
    arabicKeywords: ['مكملات رمضان', 'فيتامينات الصيام', 'طاقة الإفطار'],
    marketData: { size: '850M$', growth: '12%', opportunity: 'Cultural significance' }
  },
  {
    type: 'Weight Management',
    title: '⚖️ إدارة الوزن الذكية - Smart Weight Management',
    description: 'حلول علمية لإنقاص الوزن وتعزيز التمثيل الغذائي',
    confidence: 85,
    priority: 'High',
    productCategory: 'weight',
    budget: { min: 15000, recommended: 28000, max: 45000 },
    expectedResults: { roas: 2.9, revenue: 81200, conversions: 200 },
    arabicKeywords: ['إنقاص الوزن', 'حارق الدهون', 'مكملات الرجيم'],
    marketData: { size: '45% market share', growth: '8.1%', opportunity: 'Rising obesity rates' }
  },
  {
    type: 'Immunity Boost',
    title: '🛡️ تعزيز المناعة - Immunity Boost & Prevention',
    description: 'مكملات تقوية المناعة للوقاية من الأمراض',
    confidence: 88,
    priority: 'High',
    productCategory: 'immunity',
    budget: { min: 12000, recommended: 22000, max: 38000 },
    expectedResults: { roas: 3.1, revenue: 68200, conversions: 185 },
    arabicKeywords: ['تقوية المناعة', 'فيتامين سي', 'زنك', 'وقاية طبيعية'],
    marketData: { size: '35% market share', growth: '10.5%', opportunity: 'Post-COVID awareness' }
  },
  {
    type: 'Hair Skin Nails',
    title: '💅 جمال الشعر والبشرة والأظافر - Hair, Skin & Nails Beauty',
    description: 'مكملات متخصصة لجمال الشعر والبشرة والأظافر',
    confidence: 86,
    priority: 'High',
    productCategory: 'beauty',
    budget: { min: 14000, recommended: 25000, max: 42000 },
    expectedResults: { roas: 2.7, revenue: 67500, conversions: 170 },
    arabicKeywords: ['جمال الشعر', 'نضارة البشرة', 'تقوية الأظافر'],
    marketData: { size: '600M$', growth: '9.8%', opportunity: 'Natural beauty trend' }
  },
  {
    type: 'Energy Vitality',
    title: '⚡ الطاقة والحيوية - Energy & Vitality Enhancement',
    description: 'منشطات طبيعية للطاقة والحيوية اليومية',
    confidence: 84,
    priority: 'Medium',
    productCategory: 'energy',
    budget: { min: 10000, recommended: 18000, max: 30000 },
    expectedResults: { roas: 2.5, revenue: 45000, conversions: 150 },
    arabicKeywords: ['طاقة طبيعية', 'مكافحة التعب', 'حيوية يومية'],
    marketData: { size: '380M$', growth: '7.5%', opportunity: 'Busy lifestyles' }
  },
  {
    type: 'Digestive Health',
    title: '🌿 صحة الجهاز الهضمي - Digestive Health & Gut Wellness',
    description: 'مكملات البروبيوتيك وصحة الأمعاء',
    confidence: 81,
    priority: 'Medium',
    productCategory: 'digestive',
    budget: { min: 8000, recommended: 15000, max: 25000 },
    expectedResults: { roas: 2.3, revenue: 34500, conversions: 115 },
    arabicKeywords: ['صحة الهضم', 'بروبيوتيك', 'صحة الأمعاء'],
    marketData: { size: '290M$', growth: '6.9%', opportunity: 'Gut health awareness' }
  },
  {
    type: 'Brain Cognitive',
    title: '🧠 تعزيز الذاكرة والتركيز - Brain & Cognitive Enhancement',
    description: 'مكملات تحسين الذاكرة والوظائف الإدراكية',
    confidence: 83,
    priority: 'Medium',
    productCategory: 'brain',
    budget: { min: 12000, recommended: 20000, max: 35000 },
    expectedResults: { roas: 2.8, revenue: 56000, conversions: 140 },
    arabicKeywords: ['تقوية الذاكرة', 'تحسين التركيز', 'نشاط ذهني'],
    marketData: { size: '450M$', growth: '8.7%', opportunity: 'Work stress increase' }
  },
  {
    type: 'Heart Health',
    title: '❤️ صحة القلب والأوعية - Heart & Cardiovascular Health',
    description: 'مكملات دعم صحة القلب والدورة الدموية',
    confidence: 79,
    priority: 'Medium',
    productCategory: 'heart',
    budget: { min: 10000, recommended: 18000, max: 28000 },
    expectedResults: { roas: 2.4, revenue: 43200, conversions: 120 },
    arabicKeywords: ['صحة القلب', 'كوليسترول طبيعي', 'ضغط الدم'],
    marketData: { size: '520M$', growth: '7.8%', opportunity: 'Heart disease rise' }
  },
  {
    type: 'Sleep Recovery',
    title: '😴 النوم والتعافي - Sleep & Recovery Enhancement',
    description: 'مكملات تحسين جودة النوم والتعافي',
    confidence: 85,
    priority: 'Medium',
    productCategory: 'sleep',
    budget: { min: 9000, recommended: 16000, max: 27000 },
    expectedResults: { roas: 2.6, revenue: 41600, conversions: 130 },
    arabicKeywords: ['تحسين النوم', 'ميلاتونين طبيعي', 'نوم عميق'],
    marketData: { size: '310M$', growth: '9.1%', opportunity: 'Sleep disorders rise' }
  },
  {
    type: 'Anti Aging',
    title: '🔄 مكافحة الشيخوخة - Anti-Aging & Longevity',
    description: 'مكملات إبطاء علامات الشيخوخة والحفاظ على الشباب',
    confidence: 87,
    priority: 'High',
    productCategory: 'antiaging',
    budget: { min: 16000, recommended: 28000, max: 45000 },
    expectedResults: { roas: 3.0, revenue: 84000, conversions: 168 },
    arabicKeywords: ['مكافحة الشيخوخة', 'مضادات الأكسدة', 'كولاجين متقدم'],
    marketData: { size: '780M$', growth: '11.2%', opportunity: 'Aging population' }
  },
  {
    type: 'Sports Performance',
    title: '🏃 أداء رياضي متقدم - Advanced Sports Performance',
    description: 'مكملات متخصصة لتحسين الأداء الرياضي',
    confidence: 91,
    priority: 'High',
    productCategory: 'sports',
    budget: { min: 18000, recommended: 32000, max: 55000 },
    expectedResults: { roas: 3.4, revenue: 108800, conversions: 192 },
    arabicKeywords: ['أداء رياضي', 'تحمل عضلي', 'طاقة تدريب'],
    marketData: { size: '920M$', growth: '10.8%', opportunity: 'Fitness industry boom' }
  },
  {
    type: 'Diabetes Support',
    title: '🩺 دعم مرضى السكري - Diabetes Support & Management',
    description: 'مكملات طبيعية لدعم مرضى السكري',
    confidence: 88,
    priority: 'High',
    productCategory: 'diabetes',
    budget: { min: 14000, recommended: 25000, max: 40000 },
    expectedResults: { roas: 2.9, revenue: 72500, conversions: 145 },
    arabicKeywords: ['دعم السكري', 'تنظيم السكر', 'مكملات السكري'],
    marketData: { size: '580M$', growth: '8.3%', opportunity: '7M+ diabetes cases' }
  },
  {
    type: 'Maternal Health',
    title: '🤱 صحة الأمومة والولادة - Maternal & Prenatal Wellness',
    description: 'حلول شاملة لمكملات ما قبل وبعد الولادة',
    confidence: 82,
    priority: 'High',
    productCategory: 'maternal',
    budget: { min: 10000, recommended: 18000, max: 30000 },
    expectedResults: { roas: 2.6, revenue: 46800, conversions: 140 },
    arabicKeywords: ['مكملات الحمل', 'فيتامينات النفاس', 'صحة الأم'],
    marketData: { size: '420M$', growth: '6.8%', opportunity: 'Vision 2030 health' }
  },
  {
    type: 'Bone Joint Health',
    title: '🦴 صحة العظام والمفاصل - Senior Bone & Joint Wellness',
    description: 'حلول شاملة لصحة العظام للسكان المسنين المتزايدين',
    confidence: 78,
    priority: 'Medium',
    productCategory: 'bone',
    budget: { min: 12000, recommended: 20000, max: 32000 },
    expectedResults: { roas: 2.4, revenue: 48000, conversions: 160 },
    arabicKeywords: ['مكملات العظام', 'فيتامين د', 'كالسيوم'],
    marketData: { size: '680M$', growth: '8.9%', opportunity: '23.7% seniors by 2050' }
  },
  {
    type: 'Liver Detox',
    title: '🫘 تنظيف الكبد - Liver Detox & Cleansing',
    description: 'مكملات تنظيف وحماية الكبد الطبيعية',
    confidence: 82,
    priority: 'Medium',
    productCategory: 'liver',
    budget: { min: 11000, recommended: 19000, max: 32000 },
    expectedResults: { roas: 2.5, revenue: 47500, conversions: 125 },
    arabicKeywords: ['تنظيف الكبد', 'ديتوكس طبيعي', 'حماية الكبد'],
    marketData: { size: '340M$', growth: '7.1%', opportunity: 'Liver health awareness' }
  },
  {
    type: 'Thyroid Support',
    title: '🦋 دعم الغدة الدرقية - Thyroid Support & Balance',
    description: 'مكملات دعم وظائف الغدة الدرقية الطبيعية',
    confidence: 80,
    priority: 'Medium',
    productCategory: 'thyroid',
    budget: { min: 10000, recommended: 17000, max: 28000 },
    expectedResults: { roas: 2.4, revenue: 40800, conversions: 108 },
    arabicKeywords: ['الغدة الدرقية', 'توازن هرموني', 'دعم الدرقية'],
    marketData: { size: '280M$', growth: '6.7%', opportunity: 'Thyroid disorders rise' }
  },
  {
    type: 'Menopause Support',
    title: '🌸 دعم سن اليأس - Menopause Support & Relief',
    description: 'مكملات طبيعية لدعم النساء في سن اليأس',
    confidence: 85,
    priority: 'Medium',
    productCategory: 'menopause',
    budget: { min: 12000, recommended: 21000, max: 35000 },
    expectedResults: { roas: 2.7, revenue: 56700, conversions: 135 },
    arabicKeywords: ['سن اليأس', 'انقطاع الطمث', 'هرمونات طبيعية'],
    marketData: { size: '390M$', growth: '8.5%', opportunity: 'Aging women population' }
  },
  // Additional 10 campaigns for 30+ total
  {
    type: 'Men Health',
    title: '💪 صحة الرجال المتقدمة - Advanced Men\'s Health',
    description: 'مكملات متخصصة لصحة الرجال وتعزيز القوة',
    confidence: 89,
    priority: 'High',
    productCategory: 'men',
    budget: { min: 15000, recommended: 26000, max: 42000 },
    expectedResults: { roas: 3.1, revenue: 80600, conversions: 155 },
    arabicKeywords: ['صحة الرجال', 'تقوية الجسم', 'فيتامينات الرجال'],
    marketData: { size: '650M$', growth: '9.5%', opportunity: 'Male health awareness' }
  },
  {
    type: 'Women Wellness',
    title: '🌺 عافية المرأة الشاملة - Comprehensive Women\'s Wellness',
    description: 'برنامج شامل لصحة المرأة في جميع مراحل الحياة',
    confidence: 87,
    priority: 'High',
    productCategory: 'women',
    budget: { min: 16000, recommended: 28000, max: 45000 },
    expectedResults: { roas: 2.9, revenue: 81200, conversions: 180 },
    arabicKeywords: ['صحة المرأة', 'عافية نسائية', 'فيتامينات النساء'],
    marketData: { size: '850M$', growth: '8.8%', opportunity: 'Women empowerment' }
  },
  {
    type: 'Senior Wellness',
    title: '👴 صحة كبار السن - Senior Comprehensive Wellness',
    description: 'حلول صحية متكاملة لكبار السن وتحسين جودة الحياة',
    confidence: 84,
    priority: 'Medium',
    productCategory: 'seniors',
    budget: { min: 14000, recommended: 24000, max: 38000 },
    expectedResults: { roas: 2.6, revenue: 62400, conversions: 130 },
    arabicKeywords: ['صحة كبار السن', 'شيخوخة صحية', 'فيتامينات المسنين'],
    marketData: { size: '720M$', growth: '10.2%', opportunity: 'Aging population growth' }
  },
  {
    type: 'Children Health',
    title: '👶 صحة الأطفال - Children\'s Health & Development',
    description: 'مكملات آمنة وفعالة لنمو وتطور الأطفال',
    confidence: 86,
    priority: 'High',
    productCategory: 'children',
    budget: { min: 12000, recommended: 20000, max: 35000 },
    expectedResults: { roas: 2.8, revenue: 56000, conversions: 140 },
    arabicKeywords: ['صحة الأطفال', 'فيتامينات الأطفال', 'نمو طبيعي'],
    marketData: { size: '480M$', growth: '7.8%', opportunity: 'Parent health awareness' }
  },
  {
    type: 'Mood Mental',
    title: '🧘 الصحة النفسية والمزاج - Mood & Mental Wellness',
    description: 'مكملات طبيعية لتحسين المزاج والصحة النفسية',
    confidence: 83,
    priority: 'Medium',
    productCategory: 'brain',
    budget: { min: 11000, recommended: 19000, max: 32000 },
    expectedResults: { roas: 2.5, revenue: 47500, conversions: 125 },
    arabicKeywords: ['تحسين المزاج', 'صحة نفسية', 'استقرار عاطفي'],
    marketData: { size: '380M$', growth: '12.5%', opportunity: 'Mental health awareness' }
  },
  {
    type: 'Workplace Wellness',
    title: '🏢 صحة مكان العمل - Workplace Wellness Solutions',
    description: 'حلول صحية للموظفين لتحسين الأداء والرفاهية',
    confidence: 88,
    priority: 'High',
    productCategory: 'energy',
    budget: { min: 18000, recommended: 32000, max: 50000 },
    expectedResults: { roas: 3.2, revenue: 102400, conversions: 160 },
    arabicKeywords: ['صحة الموظفين', 'إنتاجية العمل', 'راحة المكتب'],
    marketData: { size: '950M$', growth: '11.8%', opportunity: 'Corporate wellness trend' }
  },
  {
    type: 'Travel Health',
    title: '✈️ صحة المسافرين - Travel Health & Immunity',
    description: 'مكملات خاصة للمسافرين والحجاج',
    confidence: 81,
    priority: 'Medium',
    productCategory: 'immunity',
    budget: { min: 10000, recommended: 18000, max: 30000 },
    expectedResults: { roas: 2.7, revenue: 48600, conversions: 135 },
    arabicKeywords: ['صحة المسافرين', 'مناعة السفر', 'فيتامينات الحج'],
    marketData: { size: '320M$', growth: '9.8%', opportunity: 'Hajj & Umrah travel' }
  },
  {
    type: 'Stress Relief',
    title: '🌿 تخفيف التوتر والإجهاد - Stress Relief & Relaxation',
    description: 'مكملات طبيعية لتخفيف التوتر والاسترخاء',
    confidence: 85,
    priority: 'High',
    productCategory: 'brain',
    budget: { min: 13000, recommended: 22000, max: 36000 },
    expectedResults: { roas: 2.8, revenue: 61600, conversions: 154 },
    arabicKeywords: ['تخفيف التوتر', 'استرخاء طبيعي', 'هدوء نفسي'],
    marketData: { size: '420M$', growth: '10.5%', opportunity: 'Modern life stress' }
  },
  {
    type: 'Seasonal Health',
    title: '🌤️ الصحة الموسمية - Seasonal Health Adaptation',
    description: 'مكملات للتكيف مع التغيرات الموسمية والمناخية',
    confidence: 82,
    priority: 'Medium',
    productCategory: 'immunity',
    budget: { min: 9000, recommended: 16000, max: 28000 },
    expectedResults: { roas: 2.4, revenue: 38400, conversions: 120 },
    arabicKeywords: ['صحة موسمية', 'تكيف مناخي', 'مقاومة البرد'],
    marketData: { size: '290M$', growth: '8.2%', opportunity: 'Climate awareness' }
  },
  {
    type: 'Vegan Plant',
    title: '🌱 النباتية والصحة الطبيعية - Vegan & Plant-Based Wellness',
    description: 'مكملات نباتية طبيعية للأشخاص النباتيين',
    confidence: 80,
    priority: 'Medium',
    productCategory: 'supplements',
    budget: { min: 11000, recommended: 19000, max: 32000 },
    expectedResults: { roas: 2.6, revenue: 49400, conversions: 130 },
    arabicKeywords: ['مكملات نباتية', 'صحة طبيعية', 'نباتي حلال'],
    marketData: { size: '350M$', growth: '15.2%', opportunity: 'Plant-based trend' }
  }
];

const CampaignStrategyCreator: React.FC = () => {
  const { user } = useAuth();
  const { products, loading: strategyLoading } = useStrategy();
  const [recommendations, setRecommendations] = useState<CampaignRecommendation[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignRecommendation | null>(null);
  const [customStrategies, setCustomStrategies] = useState<CampaignRecommendation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCreateCustom, setShowCreateCustom] = useState(false);

  // Manage body scroll when modal is open
  useEffect(() => {
    if (selectedCampaign) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [selectedCampaign]);

  useEffect(() => {
    if (products.length > 0) {
      generateCampaignRecommendations();
    }
  }, [products]);

  const generateCampaignRecommendations = async () => {
    setIsGenerating(true);
    
    // Check if we have Arabic products
    const detectProductLanguage = (product: any): 'ar' | 'en' => {
      if (product.language) return product.language;
      if (product.sku?.endsWith('-ar')) return 'ar';
      if (product.sku?.endsWith('-en')) return 'en';
      const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/;
      const productName = product.name || '';
      const productDesc = product.description || product.short_description || '';
      if (arabicPattern.test(productName) || arabicPattern.test(productDesc)) return 'ar';
      return 'en';
    };
    
    const arabicProducts = products.filter(product => detectProductLanguage(product) === 'ar');
    
    if (arabicProducts.length === 0) {
      setIsGenerating(false);
      toast.error('No Arabic products found. Please ensure you have Arabic products with SKU ending in "-ar" or Arabic text in names.');
      return;
    }
    
    console.log(`🎯 Found ${arabicProducts.length} Arabic products out of ${products.length} total products for campaign targeting`);
    
    // Simulate AI analysis time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const recommendations: CampaignRecommendation[] = [];

    // Generate campaigns from our expanded Saudi campaigns
    const categorizedProducts = categorizeProductsByKeywords(products);
    
         EXPANDED_SAUDI_CAMPAIGNS.forEach((campaign, index) => {
       const targetProducts = generateTargetProducts(campaign.productCategory, products);
      
      recommendations.push({
        id: `saudi-campaign-${index}`,
        type: 'supplements',
        title: campaign.title,
        description: campaign.description,
        targetProducts: targetProducts,
        budget: campaign.budget,
        duration: {
          weeks: 4,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        expectedResults: {
          clicks: Math.round(campaign.budget.recommended / 2.5), // Average CPC
          conversions: campaign.expectedResults.conversions,
          revenue: campaign.expectedResults.revenue,
          roas: campaign.expectedResults.roas,
          cpc: 2.5,
          ctr: 2.2
        },
        strategy: {
          audience: [
            'نساء سعوديات 25-45',
            'رجال مهتمون بالصحة 30-50', 
            'عائلات واعية صحياً',
            'محترفون في المدن الكبرى'
          ],
          platforms: ['Facebook/Instagram', 'Snapchat', 'TikTok', 'Google Ads'],
          adFormats: ['فيديوهات تعليمية', 'صور منتجات', 'قصص نجاح', 'إعلانات كاروسيل'],
          keywords: [...campaign.arabicKeywords, 'مكملات غذائية', 'صحة طبيعية', 'شراء أونلاين'],
          marketFocus: 'السعودية - الرياض، جدة، الدمام',
          compliance: generateIslamicCompliance(campaign.type)
        },
        priority: campaign.priority === 'High' ? 'high' : campaign.priority === 'Medium' ? 'medium' : 'low',
        confidence: campaign.confidence,
        marketStudy: {
          targetAge: '25-45',
          targetGender: campaign.productCategory === 'men' ? 'Male' : 
                        campaign.productCategory === 'women' || campaign.productCategory === 'beauty' ? 'Female' : 'Both',
          targetCities: ['الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة'],
          culturalConsiderations: [
            'حلال معتمد',
            'مناسب للثقافة الإسلامية',
            'تراخيص وزارة الصحة',
            'مراعاة قيم المجتمع السعودي'
          ],
          localTrends: ['ازدياد الوعي الصحي', 'نمو سوق المكملات', 'اهتمام بالصحة الوقائية']
        }
      });
    });

    // 5. Flash Sale Campaign
    const saleProducts = products.filter(p => p.campaign_performance === 'average' || p.campaign_performance === 'good').slice(0, 6);
    if (saleProducts.length > 0) {
      recommendations.push({
        id: 'flash-sale',
        type: 'conversion',
        title: 'Flash Sale Promotion',
        description: 'Drive urgency with limited-time offers on selected products',
        targetProducts: saleProducts,
        budget: {
          min: 600,
          recommended: 1200,
          max: 2400
        },
        duration: {
          weeks: 2,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        expectedResults: {
          clicks: 600,
          conversions: 36,
          revenue: 2700,
          roas: 2.25,
          cpc: 2.0,
          ctr: 3.2
        },
        strategy: {
          audience: ['Website visitors', 'Email subscribers', 'Previous customers'],
          platforms: ['Facebook/Instagram', 'Google Ads'],
          adFormats: ['Countdown timer ads', 'Limited stock alerts', 'Discount showcases'],
          keywords: ['Sale', 'Discount', 'Limited time', 'Special offer'],
          marketFocus: 'Saudi Arabia - Urban areas',
          compliance: ['Arabic language support', 'Cultural appropriateness', 'Local regulations']
        },
        priority: 'high',
        confidence: 88
      });
    }

    // 6. Cross-Sell Campaign
    const crossSellProducts = products.filter(p => p.total_sales > 0).slice(0, 8);
    if (crossSellProducts.length > 0) {
      recommendations.push({
        id: 'cross-sell',
        type: 'conversion',
        title: 'Cross-Sell & Upsell',
        description: 'Increase average order value by promoting complementary products',
        targetProducts: crossSellProducts,
        budget: {
          min: 400,
          recommended: 800,
          max: 1600
        },
        duration: {
          weeks: 4,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        expectedResults: {
          clicks: 400,
          conversions: 20,
          revenue: 1600,
          roas: 2.0,
          cpc: 2.0,
          ctr: 2.8
        },
        strategy: {
          audience: ['Recent purchasers', 'Product page visitors', 'Cart abandoners'],
          platforms: ['Facebook/Instagram', 'Google Display'],
          adFormats: ['Product bundles', 'Recommendation carousels', 'Complete the look'],
          keywords: ['Bundle deals', 'Complete set', 'Also bought', 'Recommended'],
          marketFocus: 'Saudi Arabia - Urban areas',
          compliance: ['Arabic language support', 'Cultural appropriateness', 'Local regulations']
        },
        priority: 'medium',
        confidence: 82
      });
    }

    // 7. Saudi Arabia Dietary Supplements Campaign
    const supplementProducts = products.filter(p => 
      p.category.toLowerCase().includes('supplement') || 
      p.category.toLowerCase().includes('vitamin') ||
      p.category.toLowerCase().includes('health') ||
      p.name.toLowerCase().includes('vitamin') ||
      p.name.toLowerCase().includes('omega')
    ).slice(0, 10);
    
    if (supplementProducts.length > 0) {
      recommendations.push({
        id: 'saudi-supplements',
        type: 'supplements',
        title: '🇸🇦 Saudi Arabia Supplements Market',
        description: 'Target health-conscious Saudi consumers in the $1.2B+ supplements market with 7-9% annual growth',
        targetProducts: supplementProducts,
        budget: {
          min: 2000,
          recommended: 4500,
          max: 8000
        },
        duration: {
          weeks: 8,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 56 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        expectedResults: {
          clicks: 2250,
          conversions: 135,
          revenue: 10125,
          roas: 2.25,
          cpc: 2.0,
          ctr: 4.2
        },
        strategy: {
          audience: ['Health-conscious Saudi adults 20-45', 'Gym-goers in Riyadh/Jeddah/Dammam', 'Working professionals', 'Parents seeking family health'],
          platforms: ['Instagram', 'Snapchat', 'Google Ads', 'TikTok'],
          adFormats: ['Arabic influencer collaborations', 'Fitness lifestyle videos', 'Health testimonials', 'Before/after transformations'],
          keywords: ['مكملات غذائية', 'فيتامين د', 'أوميغا 3', 'كولاجين', 'supplements Saudi', 'vitamins Riyadh'],
          marketFocus: 'Saudi Arabia - Urban areas (Riyadh, Jeddah, Dammam)',
          compliance: ['SFDA registration required', 'Arabic labeling mandatory', 'Halal certification', 'Dosage warnings in Arabic']
        },
        priority: 'high',
        confidence: 92,
        marketStudy: {
          targetAge: '20-45 years',
          targetGender: 'Both (women lead in beauty/wellness)',
          targetCities: ['Riyadh', 'Jeddah', 'Dammam', 'Mecca', 'Medina'],
          culturalConsiderations: ['Halal certification critical', 'Arabic language preference', 'Trust in international brands', 'Family health focus'],
          localTrends: ['Vitamin D deficiency awareness', 'Fitness culture growth', 'Preventive healthcare', 'Weight management']
        }
      });
    }

    // 8. Ramadan Special Campaign
    const currentMonth = new Date().getMonth();
    const isRamadanSeason = currentMonth >= 2 && currentMonth <= 4; // March-May (approximate)
    
    if (isRamadanSeason) {
      recommendations.push({
        id: 'ramadan-special',
        type: 'ramadan',
        title: 'Ramadan & Eid Special Campaign',
        description: 'Capitalize on increased spending during holy month with culturally-appropriate campaigns',
        targetProducts: products.filter(p => p.campaign_performance !== 'terrible').slice(0, 12),
        budget: {
          min: 3000,
          recommended: 6000,
          max: 12000
        },
        duration: {
          weeks: 6,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        expectedResults: {
          clicks: 3000,
          conversions: 180,
          revenue: 13500,
          roas: 2.25,
          cpc: 2.0,
          ctr: 5.2
        },
        strategy: {
          audience: ['Saudi families preparing for Ramadan', 'Gift buyers for Eid', 'Health-conscious Muslims', 'Traditional shoppers'],
          platforms: ['Instagram', 'Snapchat', 'TikTok', 'Google Ads'],
          adFormats: ['Ramadan-themed videos', 'Family gathering content', 'Gift guide carousels', 'Iftar health tips'],
          keywords: ['رمضان كريم', 'عيد مبارك', 'هدايا العيد', 'صحة رمضان', 'Ramadan gifts', 'Eid shopping'],
          marketFocus: 'Saudi Arabia - All major cities during holy month',
          compliance: ['Culturally sensitive content', 'Islamic values alignment', 'Family-friendly messaging', 'Respectful timing (avoid during prayer times)']
        },
        priority: 'high',
        confidence: 88,
        marketStudy: {
          targetAge: '25-50 years',
          targetGender: 'Both (emphasis on family purchases)',
          targetCities: ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar'],
          culturalConsiderations: ['Islamic values', 'Family togetherness', 'Charity and giving', 'Breaking fast traditions'],
          localTrends: ['Increased family spending', 'Health during fasting', 'Gift-giving culture', 'Social gatherings']
        }
      });
    }

    // 9. Gen Z Saudi Market
    const trendingProducts = products.filter(p => p.total_sales > 0).slice(0, 8);
    if (trendingProducts.length > 0) {
      recommendations.push({
        id: 'genz-saudi',
        type: 'awareness',
        title: 'Gen Z Saudi Arabia Lifestyle',
        description: 'Target young Saudi consumers (18-30) with TikTok-first, Arabic-speaking campaigns',
        targetProducts: trendingProducts,
        budget: {
          min: 1500,
          recommended: 3000,
          max: 6000
        },
        duration: {
          weeks: 4,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        expectedResults: {
          clicks: 1500,
          conversions: 45,
          revenue: 3375,
          roas: 1.125,
          cpc: 2.0,
          ctr: 6.8
        },
        strategy: {
          audience: ['Saudi Gen Z (18-30)', 'University students', 'Young professionals', 'Social media influencers'],
          platforms: ['TikTok', 'Snapchat', 'Instagram'],
          adFormats: ['Short-form videos', 'Interactive content', 'Influencer collaborations', 'Trend-based content'],
          keywords: ['تريند', 'لايف ستايل', 'جيل الألفية', 'شباب السعودية', 'Saudi lifestyle', 'trending Saudi'],
          marketFocus: 'Saudi Arabia - Young urban population',
          compliance: ['Age-appropriate content', 'Modern Islamic values', 'Arabic-first content', 'Local slang usage']
        },
        priority: 'medium',
        confidence: 78,
        marketStudy: {
          targetAge: '18-30 years',
          targetGender: 'Both (high social media usage)',
          targetCities: ['Riyadh', 'Jeddah', 'Dammam', 'Khobar'],
          culturalConsiderations: ['Modern lifestyle adoption', 'Tech-savvy behavior', 'Social media influence', 'Brand consciousness'],
          localTrends: ['TikTok popularity', 'Local influencers', 'Fitness trends', 'Fashion consciousness']
        }
      });
    }

    // 10. Professional Women Saudi Market
    const professionalProducts = products.filter(p => p.campaign_performance === 'good' || p.campaign_performance === 'excellent').slice(0, 6);
    if (professionalProducts.length > 0) {
      recommendations.push({
        id: 'professional-women-saudi',
        type: 'conversion',
        title: 'Saudi Professional Women Market',
        description: 'Target empowered Saudi women in corporate roles with premium lifestyle products',
        targetProducts: professionalProducts,
        budget: {
          min: 2500,
          recommended: 5000,
          max: 10000
        },
        duration: {
          weeks: 6,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        expectedResults: {
          clicks: 2500,
          conversions: 125,
          revenue: 12500,
          roas: 2.5,
          cpc: 2.0,
          ctr: 3.8
        },
        strategy: {
          audience: ['Working Saudi women 25-45', 'Corporate professionals', 'Entrepreneurs', 'Career-focused mothers'],
          platforms: ['Instagram', 'LinkedIn', 'Google Ads'],
          adFormats: ['Professional lifestyle content', 'Success stories', 'Premium product showcases', 'Work-life balance tips'],
          keywords: ['المرأة العاملة', 'نجاح المرأة', 'لايف ستايل راقي', 'working women Saudi', 'professional lifestyle'],
          marketFocus: 'Saudi Arabia - Business districts and professional areas',
          compliance: ['Professional imagery', 'Empowerment messaging', 'Cultural sensitivity', 'Premium positioning']
        },
        priority: 'high',
        confidence: 85,
        marketStudy: {
          targetAge: '25-45 years',
          targetGender: 'Female (working professionals)',
          targetCities: ['Riyadh (King Abdullah Financial District)', 'Jeddah (business areas)', 'Dammam', 'Khobar'],
          culturalConsiderations: ['Women empowerment', 'Professional growth', 'Quality over quantity', 'Time efficiency'],
          localTrends: ['Career advancement', 'Work-life balance', 'Premium products', 'Self-investment']
        }
      });
    }

    // 11. Traditional Holiday Campaign
    const currentMonthHoliday = new Date().getMonth();
    const isHolidaySeason = currentMonthHoliday >= 10 || currentMonthHoliday <= 1; // Nov, Dec, Jan
    
    if (isHolidaySeason) {
      recommendations.push({
        id: 'seasonal',
        type: 'seasonal',
        title: 'Winter Holiday Season Boost',
        description: 'Capitalize on increased shopping demand during winter holiday season',
        targetProducts: products.filter(p => p.campaign_performance !== 'terrible').slice(0, 8),
        budget: {
          min: 1000,
          recommended: 2500,
          max: 5000
        },
        duration: {
          weeks: 8,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 56 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        expectedResults: {
          clicks: 1250,
          conversions: 75,
          revenue: 5625,
          roas: 2.25,
          cpc: 2.0,
          ctr: 3.8
        },
        strategy: {
          audience: ['Holiday shoppers', 'Gift buyers', 'Seasonal interest groups', 'Saudi families'],
          platforms: ['Instagram', 'Snapchat', 'Google Shopping'],
          adFormats: ['Holiday-themed videos', 'Gift guide carousels', 'Seasonal collections', 'Family moments'],
          keywords: ['عروض الشتاء', 'هدايا الشتاء', 'تسوق موسمي', 'Holiday gifts', 'Winter deals'],
          marketFocus: 'Saudi Arabia - All major cities',
          compliance: ['Family-friendly content', 'Cultural appropriateness', 'Arabic translations', 'Local customs respect']
        },
        priority: 'high',
        confidence: 85,
        marketStudy: {
          targetAge: '25-50 years',
          targetGender: 'Both (gift buyers)',
          targetCities: ['Riyadh', 'Jeddah', 'Dammam', 'Mecca', 'Medina'],
          culturalConsiderations: ['Gift-giving traditions', 'Family celebrations', 'Modest spending', 'Quality preferences'],
          localTrends: ['Seasonal shopping', 'Family gatherings', 'Winter activities', 'Home comfort']
        }
      });
    }



    // Additional non-duplicate campaigns can be added here if needed

    setRecommendations(recommendations);
    setIsGenerating(false);
  };

  const getCampaignTypeColor = (type: string) => {
    switch (type) {
      case 'awareness': return 'bg-blue-500';
      case 'conversion': return 'bg-green-500';
      case 'retargeting': return 'bg-purple-500';
      case 'seasonal': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500 bg-red-100';
      case 'medium': return 'text-yellow-500 bg-yellow-100';
      case 'low': return 'text-green-500 bg-green-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  const exportStrategy = (campaign: CampaignRecommendation) => {
    try {
      const platformBudgets = calculatePlatformBudgets(campaign);
      
      // Prepare data for Excel export
      const exportData = [{
        'Campaign Title': campaign.title,
        'Description': campaign.description,
        'Campaign Type': campaign.type,
        'Priority': campaign.priority,
        'Confidence Score': campaign.confidence,
        'Min Budget (SAR)': campaign.budget.min,
        'Recommended Budget (SAR)': campaign.budget.recommended,
        'Max Budget (SAR)': campaign.budget.max,
        'Duration (Weeks)': campaign.duration?.weeks || 4,
        'Expected ROAS': campaign.expectedResults.roas,
        'Expected Revenue (SAR)': campaign.expectedResults.revenue,
        'Expected Conversions': campaign.expectedResults.conversions,
        'Expected Clicks': campaign.expectedResults.clicks,
        'Expected CPC (SAR)': campaign.expectedResults.cpc,
        'Expected CTR (%)': campaign.expectedResults.ctr,
        'Target Audiences': campaign.strategy.audience.join(', '),
        'Platforms': campaign.strategy.platforms.join(', '),
        'Ad Formats': campaign.strategy.adFormats.join(', '),
        'Keywords': campaign.strategy.keywords.join(', '),
        'Market Focus': campaign.strategy.marketFocus,
        'Compliance': campaign.strategy.compliance.join(', '),
        'Target Products Count': campaign.targetProducts.length,
        'Platform Budget Breakdown': platformBudgets.map(p => `${p.platform}: ${p.budget} SAR (${p.percentage}%)`).join('; ')
      }];

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Auto-fit column widths
      const columnWidths = [
        { wch: 25 }, // Campaign Title
        { wch: 40 }, // Description
        { wch: 15 }, // Type
        { wch: 10 }, // Priority
        { wch: 12 }, // Confidence
        { wch: 15 }, // Min Budget
        { wch: 18 }, // Recommended Budget
        { wch: 15 }, // Max Budget
        { wch: 12 }, // Duration
        { wch: 12 }, // ROAS
        { wch: 15 }, // Revenue
        { wch: 15 }, // Conversions
        { wch: 12 }, // Clicks
        { wch: 12 }, // CPC
        { wch: 10 }, // CTR
        { wch: 30 }, // Audiences
        { wch: 25 }, // Platforms
        { wch: 25 }, // Ad Formats
        { wch: 30 }, // Keywords
        { wch: 20 }, // Market Focus
        { wch: 25 }, // Compliance
        { wch: 15 }, // Products Count
        { wch: 50 }  // Platform Breakdown
      ];
      ws['!cols'] = columnWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Campaign Strategy');
      
      const filename = `strategy-${campaign.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xlsx`;
      XLSX.writeFile(wb, filename);

    } catch (error) {
      console.error('Error exporting strategy:', error);
      toast.error('Failed to export strategy. Please try again.');
    }
  };

  const calculatePlatformBudgets = (campaign: CampaignRecommendation) => {
    const totalBudget = campaign.budget.recommended;
    const platforms = campaign.strategy.platforms;
    
    // Platform allocation based on type and effectiveness
    const allocations: Record<string, number> = {
      'Facebook/Instagram': 0.4,
      'Google Ads': 0.35,
      'TikTok': 0.15,
      'Google Shopping': 0.3,
      'Google Display': 0.2,
      'Pinterest': 0.1,
      'Snapchat': 0.1,
      'Google Discovery': 0.25
    };

    return platforms.map(platform => ({
      platform,
      budget: Math.round(totalBudget * (allocations[platform] || 0.2)),
      percentage: Math.round((allocations[platform] || 0.2) * 100)
    }));
  };

  // Approve campaign and save to database
  const approveCampaign = async (campaign: CampaignRecommendation) => {
    if (!user) {
      toast.error('Please log in to approve campaigns');
      return;
    }

    try {
      // Calculate platform budgets
      const platformBudgets = calculatePlatformBudgets(campaign);
      
      // Prepare campaign data for database
      const campaignData = {
        created_by: user.id,
        title: campaign.title,
        description: campaign.description,
        campaign_type: campaign.type.toLowerCase(),
        priority: campaign.priority.toLowerCase(),
        confidence_score: campaign.confidence,
        status: 'active',
        budget_min: campaign.budget.min,
        budget_recommended: campaign.budget.recommended,
        budget_max: campaign.budget.max,
        duration_weeks: campaign.duration?.weeks || 4,
        expected_clicks: campaign.expectedResults.clicks,
        expected_conversions: campaign.expectedResults.conversions,
        expected_revenue: campaign.expectedResults.revenue,
        expected_roas: campaign.expectedResults.roas,
        expected_cpc: campaign.expectedResults.cpc,
        expected_ctr: campaign.expectedResults.ctr,
        target_audiences: campaign.strategy.audience,
        platforms: campaign.strategy.platforms,
        ad_formats: campaign.strategy.adFormats,
        keywords: campaign.strategy.keywords,
        platform_budgets: platformBudgets,
        target_product_ids: campaign.targetProducts.map(p => p.id || p),
        is_template: false,
        is_public: false,
        approved_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('custom_campaign_strategies')
        .insert([campaignData])
        .select()
        .single();

      if (error) {
        console.error('Error saving campaign:', error);
        toast.error('Failed to approve campaign. Please try again.');
        return;
      }

      // Mark campaign as approved
      const updatedRecommendations = recommendations.map(rec => 
        rec.id === campaign.id 
          ? { ...rec, isApproved: true, approvedAt: new Date().toISOString() }
          : rec
      );
      setRecommendations(updatedRecommendations);
      
      // Update selected campaign if it's the approved one
      if (selectedCampaign?.id === campaign.id) {
        setSelectedCampaign({ ...selectedCampaign, isApproved: true, approvedAt: new Date().toISOString() });
      }

      toast.success('✅ Campaign approved and saved to Saved Campaigns!');
      
      // Also save to localStorage as backup
      const savedCampaigns = JSON.parse(localStorage.getItem('savedCampaigns') || '[]');
      savedCampaigns.push({
        ...campaign,
        id: data.id,
        status: 'active',
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        isCustom: false
      });
      localStorage.setItem('savedCampaigns', JSON.stringify(savedCampaigns));
      
      // Close modal after approval
      setTimeout(() => {
        setSelectedCampaign(null);
      }, 1500);

    } catch (error) {
      console.error('Error approving campaign:', error);
      toast.error('Failed to approve campaign. Please try again.');
    }
  };

  // Save custom campaign
  const saveCustomCampaign = async (campaign: CampaignRecommendation) => {
    if (!user) {
      toast.error('Please log in to save campaigns');
      return;
    }

    try {
      const platformBudgets = calculatePlatformBudgets(campaign);
      
      const campaignData = {
        created_by: user.id,
        title: campaign.title,
        description: campaign.description,
        campaign_type: 'custom',
        priority: campaign.priority.toLowerCase(),
        confidence_score: campaign.confidence,
        status: 'draft',
        budget_min: campaign.budget.min,
        budget_recommended: campaign.budget.recommended,
        budget_max: campaign.budget.max,
        duration_weeks: campaign.duration?.weeks || 4,
        expected_clicks: campaign.expectedResults.clicks,
        expected_conversions: campaign.expectedResults.conversions,
        expected_revenue: campaign.expectedResults.revenue,
        expected_roas: campaign.expectedResults.roas,
        expected_cpc: campaign.expectedResults.cpc,
        expected_ctr: campaign.expectedResults.ctr,
        target_audiences: campaign.strategy.audience,
        platforms: campaign.strategy.platforms,
        ad_formats: campaign.strategy.adFormats,
        keywords: campaign.strategy.keywords,
        platform_budgets: platformBudgets,
        target_product_ids: campaign.targetProducts.map(p => p.id || p),
        is_template: false,
        is_public: false
      };

      const { data, error } = await supabase
        .from('custom_campaign_strategies')
        .insert([campaignData])
        .select()
        .single();

      if (error) {
        console.error('Error saving custom campaign:', error);
        toast.error('Failed to create campaign. Please try again.');
        return;
      }

      toast.success('💾 Custom campaign saved to Saved Campaigns!');
      
      // Add to custom strategies
      setCustomStrategies(prev => [...prev, { ...campaign, isCustom: true }]);

      // Also save to localStorage as backup
      const savedCampaigns = JSON.parse(localStorage.getItem('savedCampaigns') || '[]');
      savedCampaigns.push({
        ...campaign,
        id: data.id,
        status: 'draft',
        createdAt: new Date().toISOString(),
        isCustom: true
      });
      localStorage.setItem('savedCampaigns', JSON.stringify(savedCampaigns));

    } catch (error) {
      console.error('Error saving custom campaign:', error);
      toast.error('Failed to create campaign. Please try again.');
    }
  };

  const generateCampaignInsights = (campaign: CampaignRecommendation) => {
    return [
      {
        type: 'optimization',
        title: 'Budget Optimization',
        description: `Start with ${Math.round(campaign.budget.recommended * 0.7).toLocaleString()} SAR and scale up based on performance. Monitor ROAS closely in first week.`
      },
      {
        type: 'targeting',
        title: 'Audience Insights',
        description: `Focus on ${campaign.strategy.audience[0]} for best initial results. Expand to other audiences after 3-5 days of data collection.`
      },
      {
        type: 'creative',
        title: 'Creative Strategy',
        description: `${campaign.strategy.adFormats[0]} typically perform best for ${campaign.type} campaigns. Test 3-5 variations in first week.`
      },
      {
        type: 'timeline',
        title: 'Success Timeline',
        description: `Expect initial results within 24-48 hours. Optimize after 3 days of data. Scale successful ads in week 2.`
      }
    ];
  };



  if (strategyLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading strategy data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          🎯 Professional Campaign Strategy Creator
        </h1>
        <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto px-4">
          AI-powered campaign recommendations targeting <span className="font-semibold text-green-600">🇸🇦 Arabic products only</span>, 
          based on your actual product performance data, market analysis, and proven advertising strategies.
        </p>
      </motion.div>

      {/* Generate Button */}
      {recommendations.length === 0 && !isGenerating && (
        <div className="text-center space-y-3 px-4">
          <Button 
            onClick={generateCampaignRecommendations}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 w-full sm:w-auto"
          >
            <Lightbulb className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-sm sm:text-base">Generate Campaign Strategies</span>
          </Button>
          <Button 
            onClick={() => setShowCreateCustom(true)}
            size="lg"
            variant="outline"
            className="border-2 border-green-500 text-green-700 hover:bg-green-50 w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-sm sm:text-base">Create Custom Campaign</span>
          </Button>
        </div>
      )}

      {/* Action Buttons when recommendations exist */}
      {recommendations.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-6 px-4">
          <Button 
            onClick={generateCampaignRecommendations}
            disabled={isGenerating}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 w-full sm:w-auto"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            <span className="text-sm sm:text-base">{isGenerating ? 'Generating...' : 'Regenerate Strategies'}</span>
          </Button>
          <Button 
            onClick={() => setShowCreateCustom(true)}
            variant="outline"
            className="border-2 border-green-500 text-green-700 hover:bg-green-50 w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="text-sm sm:text-base">Create Custom Campaign</span>
          </Button>
        </div>
      )}

      {/* Loading State */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12"
          >
            <div className="inline-flex items-center gap-4 bg-blue-50 p-6 rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <div>
                <h3 className="font-semibold text-blue-900">Analyzing Your Data</h3>
                <p className="text-blue-600 text-sm">Generating personalized campaign strategies...</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Campaign Recommendations */}
      <AnimatePresence>
        {recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 px-4"
          >
            {recommendations.map((campaign, index) => (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-300"
                  onClick={() => setSelectedCampaign(campaign)}
                >
                  <CardHeader className="pb-3 p-4 sm:p-6">
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <Badge className={`${getCampaignTypeColor(campaign.type)} text-white text-xs`}>
                        {campaign.type.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className={`${getPriorityColor(campaign.priority)} text-xs`}>
                        {campaign.priority} priority
                      </Badge>
                    </div>
                    <CardTitle className="text-base sm:text-lg leading-tight">{campaign.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">{campaign.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 p-4 sm:p-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-gray-600">Confidence</span>
                        <div className="flex items-center gap-2">
                          <Progress value={campaign.confidence} className="w-12 sm:w-16 h-2" />
                          <span className="font-medium text-xs sm:text-sm">{campaign.confidence}%</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                        <div>
                          <div className="text-gray-600">Budget</div>
                          <div className="font-bold text-green-600 flex items-center gap-1 text-xs sm:text-sm">
                            {campaign.budget.recommended.toLocaleString()}
                            <SARIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600">Expected ROAS</div>
                          <div className="font-bold text-blue-600 text-xs sm:text-sm">
                            {campaign.expectedResults.roas.toFixed(1)}x
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-gray-600">{campaign.duration.weeks} weeks</span>
                        <span className="text-gray-600">{campaign.targetProducts.length} products</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

            {/* Detailed Campaign View */}
      <AnimatePresence>
        {selectedCampaign && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay flex items-center justify-center p-4"
            onClick={() => setSelectedCampaign(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4 sm:mb-6 gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-2xl font-bold leading-tight pr-2">{selectedCampaign.title}</h2>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{selectedCampaign.description}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedCampaign(null)}
                    className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-auto sm:px-4 p-0 sm:p-2"
                  >
                    <span className="hidden sm:inline">Close</span>
                    <span className="sm:hidden">✕</span>
                  </Button>
                </div>

                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 text-xs sm:text-sm h-auto gap-1 p-1">
                    <TabsTrigger value="overview" className="text-xs sm:text-sm py-2 px-2 sm:px-3">
                      <span className="hidden sm:inline">Overview</span>
                      <span className="sm:hidden">📊</span>
                    </TabsTrigger>
                    <TabsTrigger value="budget" className="text-xs sm:text-sm py-2 px-2 sm:px-3">
                      <span className="hidden sm:inline">Budget</span>
                      <span className="sm:hidden">💰</span>
                    </TabsTrigger>
                    <TabsTrigger value="strategy" className="text-xs sm:text-sm py-2 px-2 sm:px-3">
                      <span className="hidden sm:inline">Strategy</span>
                      <span className="sm:hidden">🎯</span>
                    </TabsTrigger>
                    <TabsTrigger value="products" className="text-xs sm:text-sm py-2 px-2 sm:px-3">
                      <span className="hidden sm:inline">Products</span>
                      <span className="sm:hidden">📦</span>
                    </TabsTrigger>
                    <TabsTrigger value="timeline" className="text-xs sm:text-sm py-2 px-2 sm:px-3">
                      <span className="hidden sm:inline">Timeline</span>
                      <span className="sm:hidden">📅</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4 sm:space-y-6 mt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {/* Budget */}
                                              <Card>
                        <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                            <SARIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                            <span className="text-sm sm:text-base">Budget Range (SAR)</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-6 pt-0">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs sm:text-sm text-gray-600">Minimum</span>
                              <span className="font-medium flex items-center gap-1 text-xs sm:text-sm">
                                {selectedCampaign.budget.min.toLocaleString()}
                                <SARIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs sm:text-sm text-gray-600">Recommended</span>
                              <span className="font-bold text-green-600 flex items-center gap-1 text-xs sm:text-sm">
                                {selectedCampaign.budget.recommended.toLocaleString()}
                                <SARIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs sm:text-sm text-gray-600">Maximum</span>
                              <span className="font-medium flex items-center gap-1 text-xs sm:text-sm">
                                {selectedCampaign.budget.max.toLocaleString()}
                                <SARIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Expected Results */}
                      <Card>
                        <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                            <span className="text-sm sm:text-base">Expected Results</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-6 pt-0">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs sm:text-sm text-gray-600">Revenue</span>
                              <span className="font-bold text-green-600 flex items-center gap-1 text-xs sm:text-sm">
                                {selectedCampaign.expectedResults.revenue.toLocaleString()}
                                <SARIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs sm:text-sm text-gray-600">Conversions</span>
                              <span className="font-medium text-xs sm:text-sm">{selectedCampaign.expectedResults.conversions}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs sm:text-sm text-gray-600">ROAS</span>
                              <span className="font-bold text-blue-600 text-xs sm:text-sm">{selectedCampaign.expectedResults.roas.toFixed(1)}x</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs sm:text-sm text-gray-600">CTR</span>
                              <span className="font-medium text-xs sm:text-sm">{selectedCampaign.expectedResults.ctr}%</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Campaign Info */}
                      <Card className="sm:col-span-2 lg:col-span-1">
                        <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                            <Target className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                            <span className="text-sm sm:text-base">Campaign Info</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-6 pt-0">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs sm:text-sm text-gray-600">Duration</span>
                              <span className="font-medium text-xs sm:text-sm">{selectedCampaign.duration.weeks} weeks</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs sm:text-sm text-gray-600">Products</span>
                              <span className="font-medium text-xs sm:text-sm">{selectedCampaign.targetProducts.length}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs sm:text-sm text-gray-600">Confidence</span>
                              <span className="font-bold text-green-600 text-xs sm:text-sm">{selectedCampaign.confidence}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs sm:text-sm text-gray-600">Priority</span>
                              <Badge className={`${getPriorityColor(selectedCampaign.priority)} text-xs`}>
                                {selectedCampaign.priority}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="budget" className="space-y-4 sm:space-y-6 mt-4">
                    <div className="grid gap-4 sm:gap-6">
                                              <Card>
                        <CardHeader className="p-3 sm:p-6">
                          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <SARIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="text-sm sm:text-base">Platform Budget Breakdown</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-6 pt-0">
                          <div className="space-y-3 sm:space-y-4">
                            {calculatePlatformBudgets(selectedCampaign).map((platform, index) => (
                              <div key={index} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm sm:text-base truncate">{platform.platform}</div>
                                  <div className="text-xs sm:text-sm text-gray-600">{platform.percentage}% of total budget</div>
                                </div>
                                <div className="text-right flex-shrink-0 ml-2">
                                  <div className="font-bold text-green-600 flex items-center gap-1 text-xs sm:text-sm">
                                    {platform.budget.toLocaleString()}
                                    <SARIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                  </div>
                                  <div className="text-xs text-gray-500">Recommended</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Campaign Insights & Recommendations</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {generateCampaignInsights(selectedCampaign).map((insight, index) => (
                              <div key={index} className="border-l-4 border-blue-500 pl-4">
                                <h4 className="font-semibold text-sm">{insight.title}</h4>
                                <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="strategy" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Target Audiences
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {selectedCampaign.strategy.audience.map((audience, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm">{audience}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5" />
                            Platforms
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {selectedCampaign.strategy.platforms.map((platform, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-blue-500" />
                                <span className="text-sm">{platform}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Star className="h-5 w-5" />
                            Ad Formats
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {selectedCampaign.strategy.adFormats.map((format, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-purple-500" />
                                <span className="text-sm">{format}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Keywords
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {selectedCampaign.strategy.keywords.map((keyword, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="products" className="space-y-4">
                    <h3 className="text-lg font-semibold">Target Products ({selectedCampaign.targetProducts.length})</h3>
                    <div className="grid gap-3 sm:gap-4">
                      {selectedCampaign.targetProducts.map((product, index) => {
                        // Detect product language
                        const detectProductLanguage = (product: any): 'ar' | 'en' => {
                          if (product.language) return product.language;
                          if (product.sku?.endsWith('-ar')) return 'ar';
                          if (product.sku?.endsWith('-en')) return 'en';
                          const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/;
                          const productName = product.name || '';
                          const productDesc = product.description || product.short_description || '';
                          if (arabicPattern.test(productName) || arabicPattern.test(productDesc)) return 'ar';
                          return 'en';
                        };

                        // Generate Polylang external URL (same logic as SavedCampaigns)
                        const generateExternalUrl = (product: any) => {
                          // Use product permalink if available (direct from WooCommerce)
                          if (product.permalink && product.permalink !== '') {
                            return product.permalink;
                          }
                          
                          // Generate Polylang-compatible URL
                          const baseUrl = 'https://noorcaregcc.com';
                          const language = detectProductLanguage(product);
                          const productSlug = product.slug || `product-${product.id}`;
                          
                          if (language === 'ar') {
                            // For Arabic products with Polylang
                            return `${baseUrl}/ar/product/${productSlug}/`;
                          } else {
                            // For English products
                            return `${baseUrl}/product/${productSlug}/`;
                          }
                        };

                        // Calculate performance level
                        const getPerformanceLevel = (sales: number): string => {
                          if (sales >= 100) return 'excellent';
                          if (sales >= 50) return 'good';
                          if (sales >= 10) return 'average';
                          if (sales >= 1) return 'poor';
                          return 'terrible';
                        };

                        // Get performance color
                        const getPerformanceColor = (performance: string): string => {
                          switch (performance) {
                            case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
                            case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
                            case 'average': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
                            case 'poor': return 'bg-orange-100 text-orange-800 border-orange-200';
                            case 'terrible': return 'bg-red-100 text-red-800 border-red-200';
                            default: return 'bg-gray-100 text-gray-800 border-gray-200';
                          }
                        };

                        const language = detectProductLanguage(product);
                        const externalUrl = generateExternalUrl(product);
                        const performance = getPerformanceLevel(product.total_sales || 0);

                        return (
                          <Card 
                            key={index} 
                            className="hover:shadow-md transition-all duration-200 cursor-pointer group"
                            onClick={() => window.open(externalUrl, '_blank')}
                          >
                            <CardContent className="p-3 sm:p-4">
                              <div className="flex items-start gap-2 sm:gap-3">
                                {/* Product Image */}
                                <div className="flex-shrink-0">
                                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                                    {(() => {
                                      // Debug: Log product image data for this specific product
                                      console.log(`🔍 Professional Campaign - Product "${product.name}" image data:`, {
                                        images: product.images,
                                        imageCount: product.images?.length || 0,
                                        firstImage: product.images?.[0],
                                        imageType: typeof product.images?.[0]
                                      });
                                      
                                      return product.images && product.images.length > 0 ? (
                                        <img 
                                          src={
                                            typeof product.images[0] === 'string' 
                                              ? product.images[0] 
                                              : product.images[0]?.src || product.images[0]?.url || product.images[0]
                                          }
                                          alt={product.name}
                                          className="w-full h-full object-cover"
                                          onLoad={(e) => {
                                            console.log('✅ Professional Campaign image loaded:', e.currentTarget.src);
                                          }}
                                          onError={(e) => {
                                            console.warn('❌ Professional Campaign image failed:', e.currentTarget.src);
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
                                        <svg className="w-4 h-4 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                      );
                                    })()}
                                  </div>
                                </div>

                                {/* Product Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                                    <h4 className="font-medium text-sm sm:text-base leading-tight">{product.name}</h4>
                                    <Badge 
                                      className={`text-xs px-1.5 py-0.5 self-start sm:self-auto ${language === 'ar' 
                                        ? 'bg-green-100 text-green-800 border-green-200' 
                                        : 'bg-blue-100 text-blue-800 border-blue-200'
                                      }`}
                                    >
                                      {language === 'ar' ? '🇸🇦 عربي' : '🇺🇸 English'}
                                    </Badge>
                                  </div>
                                  <p className="text-xs sm:text-sm text-gray-600 truncate mb-1 sm:mb-2">{product.category}</p>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    <span className="text-xs text-gray-500">Open in store</span>
                                  </div>
                                </div>

                                {/* Price & Performance */}
                                <div className="text-right flex-shrink-0">
                                  <div className="font-bold flex items-center gap-1 justify-end text-xs sm:text-sm">
                                    {(product.revenue || product.price * product.total_sales || 0).toLocaleString()}
                                    <SARIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                  </div>
                                  <div className="text-xs text-gray-600">{product.total_sales || 0} sales</div>
                                  <div className="text-xs text-gray-600">
                                    Price: {(product.price || product.regular_price || 0).toLocaleString()} SAR
                                  </div>
                                  <Badge 
                                    className={`mt-1 text-xs border ${getPerformanceColor(performance)}`}
                                  >
                                    {performance}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </TabsContent>

                  <TabsContent value="timeline" className="space-y-4 sm:space-y-6 mt-4">
                    <div className="grid gap-4 sm:gap-6">
                                              <Card>
                        <CardHeader className="p-3 sm:p-6">
                          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="text-sm sm:text-base">Campaign Timeline</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-6 pt-0">
                          <div className="space-y-3 sm:space-y-4">
                            <div className="flex flex-col sm:flex-row items-center justify-between p-3 sm:p-4 bg-blue-50 rounded-lg gap-2 sm:gap-4">
                              <div className="text-center sm:text-left">
                                <div className="font-medium text-sm sm:text-base">Start Date</div>
                                <div className="text-xs sm:text-sm text-gray-600">{selectedCampaign.duration.startDate}</div>
                              </div>
                              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 rotate-90 sm:rotate-0" />
                              <div className="text-center sm:text-right">
                                <div className="font-medium text-sm sm:text-base">End Date</div>
                                <div className="text-xs sm:text-sm text-gray-600">{selectedCampaign.duration.endDate}</div>
                              </div>
                            </div>
                            
                            <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                              <div className="font-bold text-base sm:text-lg">{selectedCampaign.duration.weeks} Weeks</div>
                              <div className="text-xs sm:text-sm text-gray-600">Total Campaign Duration</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="p-3 sm:p-6">
                          <CardTitle className="text-base sm:text-lg">Weekly Milestones</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-6 pt-0">
                          <div className="space-y-3 sm:space-y-4">
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs sm:text-sm flex-shrink-0 mt-0.5">1</div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm sm:text-base">Campaign Setup & Launch</div>
                                <div className="text-xs sm:text-sm text-gray-600 leading-relaxed">Create ads, set up tracking, launch campaigns</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 font-bold text-xs sm:text-sm flex-shrink-0 mt-0.5">2</div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm sm:text-base">Performance Monitoring</div>
                                <div className="text-xs sm:text-sm text-gray-600 leading-relaxed">Analyze initial results, optimize targeting</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xs sm:text-sm flex-shrink-0 mt-0.5">3</div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm sm:text-base">Optimization Phase</div>
                                <div className="text-xs sm:text-sm text-gray-600 leading-relaxed">Adjust bids, test new creatives, scale winning ads</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-xs sm:text-sm flex-shrink-0 mt-0.5">4</div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm sm:text-base">Final Push & Analysis</div>
                                <div className="text-xs sm:text-sm text-gray-600 leading-relaxed">Maximize performance, prepare final report</div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-3 sm:gap-4 px-3 sm:px-0">
                  <Button 
                    className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 h-12 sm:h-auto"
                    size="lg"
                    onClick={() => approveCampaign(selectedCampaign)}
                    disabled={selectedCampaign?.isApproved}
                  >
                    <CheckCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-sm sm:text-base">
                      {selectedCampaign?.isApproved ? 'Campaign Approved ✅' : 'Approve Campaign'}
                    </span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={() => exportStrategy(selectedCampaign)}
                    className="flex items-center gap-2 h-12 sm:h-auto sm:flex-shrink-0"
                  >
                    <Download className="h-4 w-4" />
                    <span className="text-sm sm:text-base">Export to Excel</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Campaign Creator Modal */}
      <AnimatePresence>
        {showCreateCustom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto"
            onClick={() => setShowCreateCustom(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden my-2 sm:my-0"
              onClick={(e) => e.stopPropagation()}
            >
              <CustomCampaignCreator
                isOpen={showCreateCustom}
                onClose={() => setShowCreateCustom(false)}
                onCampaignCreated={() => {
                  setShowCreateCustom(false);
                  // Optionally refresh campaigns
                  generateCampaignRecommendations();
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CampaignStrategyCreator; 