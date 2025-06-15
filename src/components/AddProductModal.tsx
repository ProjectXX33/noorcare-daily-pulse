import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, Save, Loader2, Upload, Globe, CheckCircle, AlertCircle, Wand2, Link } from 'lucide-react';
import { CopyWritingProduct } from '@/contexts/CopyWritingProductsContext';
import { CopyWritingEditor } from '@/components/CopyWritingEditor';
import { toast } from 'sonner';

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

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Omit<CopyWritingProduct, 'id'>) => Promise<CopyWritingProduct | null>;
  categories: Array<{ id: number; name: string; slug: string; count: number; }>;
  uploadProductImage: (productId: number, file: File) => Promise<boolean>;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categories,
  uploadProductImage
}) => {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    // English version
    en: {
    name: '',
      slug: '',
    description: '',
    short_description: '',
      categories: [] as string[],
      tags: [] as string[],
    },
    // Arabic version
    ar: {
      name: '',
      slug: '',
      description: '',
      short_description: '',
      categories: [] as string[],
      tags: [] as string[],
    },
    // Shared data
    sku: '',
    regular_price: '',
    sale_price: '',
    stock_status: 'instock',
    featured: false,
    image: null as File | null,
    createBothLanguages: true
  });

  const [activeTab, setActiveTab] = useState<'en' | 'ar'>('en');

  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');

  // SEO Helper Functions
  const generateSlugFromName = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  };

  const validateSlugSEO = (slug: string): { isValid: boolean; issues: string[]; suggestions: string[] } => {
    const issues: string[] = [];
    const suggestions: string[] = [];

    if (!slug) {
      issues.push('Slug is required');
      return { isValid: false, issues, suggestions };
    }

    // Check length
    if (slug.length > 50) {
      issues.push('Slug too long (over 50 characters)');
      suggestions.push('Shorten to under 50 characters for better SEO');
    }
    if (slug.length < 3) {
      issues.push('Slug too short (under 3 characters)');
      suggestions.push('Use at least 3 characters for better SEO');
    }

    // Check format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      issues.push('Contains invalid characters');
      suggestions.push('Use only lowercase letters, numbers, and hyphens');
    }
    if (slug.startsWith('-') || slug.endsWith('-')) {
      issues.push('Starts or ends with hyphen');
      suggestions.push('Remove leading/trailing hyphens');
    }
    if (slug.includes('--')) {
      issues.push('Contains consecutive hyphens');
      suggestions.push('Use single hyphens only');
    }

    // SEO best practices
    if (!/[a-z]/.test(slug)) {
      suggestions.push('Add descriptive words for better SEO');
    }
    if (slug.split('-').length > 6) {
      suggestions.push('Consider shorter, more concise slug');
    }

    return { 
      isValid: issues.length === 0, 
      issues, 
      suggestions: suggestions.slice(0, 3) // Limit to 3 suggestions
    };
  };

  const getSlugSEOScore = (slug: string): number => {
    if (!slug) return 0;
    
    let score = 50; // Base score
    
    // Length scoring
    if (slug.length >= 10 && slug.length <= 30) score += 20;
    else if (slug.length >= 5 && slug.length <= 50) score += 10;
    
    // Format scoring
    if (/^[a-z0-9-]+$/.test(slug)) score += 15;
    if (!slug.startsWith('-') && !slug.endsWith('-')) score += 10;
    if (!slug.includes('--')) score += 5;
    
    return Math.min(100, score);
  };

  // Enhanced SEO Functions for Descriptions - Based on Professional Guidelines
  const validateDescriptionSEO = (description: string, type: 'short' | 'long'): { 
    score: number; 
    issues: string[]; 
    suggestions: string[] 
  } => {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // Remove HTML tags for analysis
    const plainText = description.replace(/<[^>]*>/g, '').trim();
    const wordCount = plainText.split(/\s+/).filter(w => w.length > 0).length;
    const charCount = plainText.length;

    // Detect if content is Arabic
    const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/;
    const isArabicContent = arabicPattern.test(plainText);

    // Define keywords for both languages
    const englishKeywords = ['health', 'care', 'vitamin', 'supplement', 'natural', 'organic', 'premium', 'quality'];
    const arabicKeywords = ['صحة', 'رعاية', 'فيتامين', 'مكمل', 'طبيعي', 'عضوي', 'ممتاز', 'جودة', 'علاج', 'دواء', 'طب', 'غذائي'];
    const primaryKeywords = isArabicContent ? arabicKeywords : englishKeywords;

    if (type === 'short') {
      // 🎯 SHORT DESCRIPTION SEO RULES (Meta Description/Product Snippet)
      // Purpose: Entice clicks from search results or social shares
      
      if (charCount === 0) {
        return { score: 0, issues: ['Meta description is empty'], suggestions: ['Add compelling short description (50-160 chars)'] };
      }

      // ✅ Length: 50-160 characters (including spaces)
      if (charCount >= 50 && charCount <= 160) {
        score += 35;
        suggestions.push('✅ Perfect meta description length (50-160 chars)');
      } else if (charCount < 50) {
        score += 10;
        issues.push('Too short - may not be compelling enough');
        suggestions.push('🎯 Expand to 50-160 characters for better click-through');
      } else {
        score += 15;
        issues.push('Too long - will be truncated in search results');
        suggestions.push('✂️ Shorten to 50-160 characters to avoid truncation');
      }

      // ✅ Primary Keyword: Front-load main keyword within first 1-2 sentences
      const firstSentence = plainText.split(/[.!?]/)[0] || '';
      const hasEarlyKeyword = primaryKeywords.some(keyword => 
        firstSentence.toLowerCase().includes(keyword)
      );
      if (hasEarlyKeyword) {
        score += 20;
        suggestions.push('✅ Primary keyword front-loaded in first sentence');
      } else {
        suggestions.push('🎯 Include main keyword in first sentence for better SEO');
      }

      // ✅ Secondary Keywords/LSI: If space allows, include related terms
      const englishLSI = ['benefits', 'support', 'formula', 'extract', 'pure', 'effective', 'daily', 'wellness'];
      const arabicLSI = ['فوائد', 'دعم', 'تركيبة', 'مستخلص', 'نقي', 'فعال', 'يومي', 'عافية', 'صحي', 'مفيد'];
      const lsiKeywords = isArabicContent ? arabicLSI : englishLSI;
      
      const hasLSI = lsiKeywords.some(lsi => plainText.toLowerCase().includes(lsi));
      if (hasLSI && charCount <= 160) {
        score += 15;
        suggestions.push('✅ Good use of related keywords');
      } else if (charCount < 120) {
        if (isArabicContent) {
          suggestions.push('💡 أضف كلمات مرتبطة مثل "فوائد"، "فعال"، "تركيبة"');
        } else {
          suggestions.push('💡 Add related terms like "benefits", "effective", "formula"');
        }
      }

      // ✅ Tone & CTA: Active, benefit-driven tone with call-to-action
      const englishCTA = ['shop now', 'learn more', 'discover', 'get yours', 'buy now', 'order today', 'try now', 'explore'];
      const arabicCTA = ['تسوق الآن', 'اعرف المزيد', 'اكتشف', 'احصل عليه', 'اشتري الآن', 'اطلب اليوم', 'جرب الآن', 'استكشف'];
      const ctaPhrases = isArabicContent ? arabicCTA : englishCTA;
      
      const hasCTA = ctaPhrases.some(cta => plainText.toLowerCase().includes(cta));
      if (hasCTA) {
        score += 15;
        suggestions.push('✅ Contains call-to-action phrase');
      } else {
        if (isArabicContent) {
          suggestions.push('📢 أضف دعوة للعمل مثل "تسوق الآن"، "اعرف المزيد"، "اكتشف"');
        } else {
          suggestions.push('📢 Add CTA like "Shop now", "Learn more", "Discover"');
        }
      }

      // ✅ Benefit-driven language
      const englishBenefits = ['best', 'premium', 'effective', 'proven', 'results', 'benefits', 'powerful', 'advanced', 'superior', 'trusted'];
      const arabicBenefits = ['أفضل', 'ممتاز', 'فعال', 'مثبت', 'نتائج', 'فوائد', 'قوي', 'متقدم', 'متفوق', 'موثوق', 'مضمون'];
      const benefitWords = isArabicContent ? arabicBenefits : englishBenefits;
      
      const benefitCount = benefitWords.filter(word => plainText.toLowerCase().includes(word)).length;
      if (benefitCount >= 2) {
        score += 15;
        suggestions.push('✅ Strong benefit-driven language');
      } else if (benefitCount === 1) {
        score += 10;
        suggestions.push('💪 Good benefit language - consider adding more');
      } else {
        if (isArabicContent) {
          suggestions.push('💪 أضف كلمات تعبر عن الفوائد مثل "مثبت"، "فعال"، "ممتاز"');
        } else {
          suggestions.push('💪 Include benefit words like "proven", "effective", "premium"');
        }
      }

    } else {
      // 🎯 LONG DESCRIPTION SEO RULES (Product Pages)
      // Purpose: Educate, persuade, and provide content depth Google loves
      
      if (wordCount === 0) {
        return { score: 0, issues: ['Product description is empty'], suggestions: ['Add detailed description (300-1000+ words)'] };
      }

      // ✅ Length & Structure: Aim for 300-1000+ words
      if (wordCount >= 300 && wordCount <= 1000) {
        score += 25;
        suggestions.push('✅ Optimal word count for SEO depth (300-1000 words)');
      } else if (wordCount > 1000) {
        score += 20;
        suggestions.push('📚 Excellent depth! Consider H2/H3 headings for structure');
      } else if (wordCount >= 150) {
        score += 15;
        suggestions.push('📈 Expand to 300+ words for better search visibility');
      } else {
        score += 5;
        issues.push('Too short for comprehensive product information');
        suggestions.push('📝 Expand to at least 300 words for SEO benefits');
      }

      // ✅ Break into logical sections with H2/H3 headings
      const hasHeadings = /<h[2-6]>/i.test(description);
      if (hasHeadings) {
        score += 15;
        suggestions.push('✅ Good structure with H2/H3 headings');
      } else if (wordCount > 200) {
        suggestions.push('🏗️ Break into sections: Benefits, Features, Usage, FAQ');
      }

      // ✅ Primary keyword in first paragraph and subheading
      const firstParagraph = plainText.substring(0, 200);
      const hasKeywordInFirst = primaryKeywords.some(keyword => 
        firstParagraph.toLowerCase().includes(keyword)
      );
      if (hasKeywordInFirst) {
        score += 15;
        suggestions.push('✅ Primary keyword in opening paragraph');
      } else {
        suggestions.push('🎯 Include main keyword in first paragraph');
      }

      // ✅ Keyword Strategy: Primary keyword density ~1-2%
      const keywordMatches = primaryKeywords.reduce((count, keyword) => {
        const matches = (plainText.toLowerCase().match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
        return count + matches;
      }, 0);
      const keywordDensity = (keywordMatches / wordCount) * 100;
      
      if (keywordDensity >= 1 && keywordDensity <= 2) {
        score += 15;
        suggestions.push('✅ Perfect keyword density (1-2%)');
      } else if (keywordDensity > 2) {
        issues.push('Keyword density too high - may appear spammy');
        suggestions.push('⚖️ Reduce keyword repetition to 1-2%');
      } else if (keywordDensity > 0) {
        score += 10;
        suggestions.push('💡 Consider adding more relevant keywords (aim for 1-2%)');
      } else {
        suggestions.push('🎯 Include relevant keywords (health, care, supplement, etc.)');
      }

      // ✅ Readability & Formatting: Keep paragraphs < 3-4 sentences
      const paragraphs = plainText.split('\n').filter(p => p.trim().length > 0);
      const longParagraphs = paragraphs.filter(p => {
        const sentences = p.split(/[.!?]/).filter(s => s.trim().length > 0);
        return sentences.length > 4;
      });
      
      if (longParagraphs.length === 0) {
        score += 10;
        suggestions.push('✅ Good paragraph structure (< 4 sentences)');
      } else {
        suggestions.push('📝 Break long paragraphs into 3-4 sentences max');
      }

      // ✅ Use bullet lists, bold key terms, and short sentences
      const hasLists = /<ul>|<ol>|<li>/i.test(description) || /[•·-]\s/.test(plainText);
      const hasBold = /<b>|<strong>/i.test(description);
      
      if (hasLists && hasBold) {
        score += 15;
        suggestions.push('✅ Excellent formatting with lists and bold text');
      } else if (hasLists || hasBold) {
        score += 10;
        suggestions.push('📋 Good formatting - consider adding more lists/bold text');
      } else if (wordCount > 150) {
        suggestions.push('📋 Use bullet points and bold key features');
      }

      // ✅ Engagement & Trust Signals
      const englishTrust = ['customer', 'review', 'testimonial', 'guarantee', 'certified', 'tested', 'approved', 'trusted', 'verified'];
      const arabicTrust = ['عميل', 'مراجعة', 'شهادة', 'ضمان', 'معتمد', 'مختبر', 'موافق', 'موثوق', 'محقق', 'تقييم'];
      const trustWords = isArabicContent ? arabicTrust : englishTrust;
      
      const hasTrustSignals = trustWords.some(word => plainText.toLowerCase().includes(word));
      if (hasTrustSignals) {
        score += 10;
        suggestions.push('✅ Includes trust signals and social proof');
      } else {
        if (isArabicContent) {
          suggestions.push('🏆 أضف إشارات الثقة: "مختبر"، "معتمد"، "تقييمات العملاء"');
        } else {
          suggestions.push('🏆 Add trust signals: "tested", "certified", "customer reviews"');
        }
      }

      // ✅ Clear call-to-action at the end
      const lastSentences = plainText.split(/[.!?]/).slice(-2).join(' ').toLowerCase();
      const englishEndCTAs = ['add to cart', 'buy now', 'order today', 'shop now', 'get yours', 'purchase now'];
      const arabicEndCTAs = ['أضف للسلة', 'اشتري الآن', 'اطلب اليوم', 'تسوق الآن', 'احصل عليه', 'اشتري الآن'];
      const endCTAs = isArabicContent ? arabicEndCTAs : englishEndCTAs;
      
      const hasEndCTA = endCTAs.some(cta => lastSentences.includes(cta));
      
      if (hasEndCTA) {
        score += 10;
        suggestions.push('✅ Strong closing call-to-action');
      } else {
        if (isArabicContent) {
          suggestions.push('📢 أضف دعوة واضحة للعمل في النهاية: "أضف للسلة"، "اشتري الآن"');
        } else {
          suggestions.push('📢 Add clear CTA at end: "Add to Cart", "Buy Now"');
        }
      }
    }

    // 🎯 COMMON CHECKS FOR BOTH TYPES

    // ✅ Keep sentences short for readability
    const sentences = plainText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.length > 0 ? plainText.length / sentences.length : 0;
    
    if (avgSentenceLength <= 20) {
      score += 5;
      suggestions.push('✅ Good sentence length for readability');
    } else if (avgSentenceLength > 25) {
      issues.push('Some sentences are too long for easy reading');
      suggestions.push('✂️ Use shorter sentences (under 20 words each)');
    }

    // ✅ Avoid keyword stuffing (natural language)
    const words = plainText.toLowerCase().split(/\s+/);
    const wordFreq = words.reduce((freq, word) => {
      if (word.length > 3) {
        freq[word] = (freq[word] || 0) + 1;
      }
      return freq;
    }, {} as Record<string, number>);
    
    const maxFreq = Math.max(...Object.values(wordFreq));
    if (maxFreq / words.length > 0.05) {
      issues.push('Keyword stuffing detected - sounds unnatural');
      suggestions.push('📝 Use more varied vocabulary and synonyms');
    } else {
      score += 5;
    }

    // ✅ Uniqueness check
    const genericPhrases = ['product description', 'click here', 'lorem ipsum', 'coming soon'];
    const hasGenericContent = genericPhrases.some(phrase => plainText.toLowerCase().includes(phrase));
    if (!hasGenericContent) {
      score += 5;
    } else {
      issues.push('Contains generic phrases - make it unique');
    }

    return { 
      score: Math.min(100, score), 
      issues: issues.slice(0, 4), 
      suggestions: suggestions.slice(0, 4) 
    };
  };

  const getDescriptionSEOColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleSave = async () => {
    // Validation - check if at least one language has required fields
    const hasEnglishName = formData.en.name.trim() !== '';
    const hasArabicName = formData.ar.name.trim() !== '';
    const hasPrice = formData.regular_price.trim() !== '';

    if ((!hasEnglishName && !hasArabicName) || !hasPrice) {
      toast.error('Please provide at least one product name and a price');
      return;
    }

    setSaving(true);
    try {
      const results: CopyWritingProduct[] = [];
      let englishProduct: CopyWritingProduct | null = null;
      let arabicProduct: CopyWritingProduct | null = null;

      // Create English version if filled
      if (hasEnglishName) {
        const englishData: Omit<CopyWritingProduct, 'id'> = {
          name: formData.en.name,
          slug: formData.en.slug || generateSlugFromName(formData.en.name),
        permalink: '',
          description: formData.en.description,
          short_description: formData.en.short_description,
          sku: formData.sku + (formData.sku ? '-en' : ''),
        price: formData.sale_price || formData.regular_price,
        regular_price: formData.regular_price,
        sale_price: formData.sale_price,
        on_sale: !!formData.sale_price,
        stock_status: formData.stock_status as 'instock' | 'outofstock',
        total_sales: 0,
        featured: formData.featured,
          categories: formData.en.categories.map(categoryName => {
            // Find the real category from the available categories
            const realCategory = categories.find(cat => cat.name === categoryName);
            return realCategory ? {
              id: realCategory.id,
              name: realCategory.name,
              slug: realCategory.slug
            } : {
              id: 0, // Will be created as new category by WooCommerce
              name: categoryName,
              slug: categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-')
            };
          }),
          tags: formData.en.tags.map((name, index) => ({
            id: 9999 + index,
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-')
        })),
          images: [],
          date_created: new Date().toISOString(),
          date_modified: new Date().toISOString(),
          average_rating: '0',
          rating_count: 0,
          language: 'en',
          polylang_translations: {}
        };

        englishProduct = await onSave(englishData);
        if (englishProduct) {
          // Make sure language is properly set
          englishProduct.language = 'en';
          results.push(englishProduct);
          
          // Upload image to English product if image exists
          if (formData.image) {
            try {
              console.log(`📸 Uploading image to English product: ${englishProduct.name} (ID: ${englishProduct.id})`);
              const uploadSuccess = await uploadProductImage(englishProduct.id, formData.image);
              if (uploadSuccess) {
                console.log(`✅ Image uploaded to English product: ${englishProduct.name}`);
                toast.success(`📸 Image uploaded to English product successfully!`);
              } else {
                throw new Error('Upload returned false');
              }
            } catch (error) {
              console.error('Failed to upload image to English product:', error);
              toast.error(`Failed to upload image to English product: ${error.message}`);
            }
          }
        }
      }

      // Create Arabic version if filled
      if (hasArabicName) {
        const arabicData: Omit<CopyWritingProduct, 'id'> = {
          name: formData.ar.name,
          slug: formData.ar.slug || generateSlugFromName(formData.ar.name),
          permalink: '',
          description: formData.ar.description,
          short_description: formData.ar.short_description,
          sku: formData.sku + (formData.sku ? '-ar' : ''),
          price: formData.sale_price || formData.regular_price,
          regular_price: formData.regular_price,
          sale_price: formData.sale_price,
          on_sale: !!formData.sale_price,
          stock_status: formData.stock_status as 'instock' | 'outofstock',
          total_sales: 0,
          featured: formData.featured,
          categories: formData.ar.categories.map(categoryName => {
            // Find the real category from the available categories
            const realCategory = categories.find(cat => cat.name === categoryName);
            return realCategory ? {
              id: realCategory.id,
              name: realCategory.name,
              slug: realCategory.slug
            } : {
              id: 0, // Will be created as new category by WooCommerce
              name: categoryName,
              slug: categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-')
            };
          }),
          tags: formData.ar.tags.map((name, index) => ({
            id: 10999 + index,
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-')
        })),
        images: [],
        date_created: new Date().toISOString(),
        date_modified: new Date().toISOString(),
        average_rating: '0',
          rating_count: 0,
          language: 'ar',
          polylang_translations: {}
        };

        arabicProduct = await onSave(arabicData);
        if (arabicProduct) {
          // Make sure language is properly set
          arabicProduct.language = 'ar';
          results.push(arabicProduct);
          
          // Upload image to Arabic product if image exists
          if (formData.image) {
            try {
              console.log(`📸 Uploading image to Arabic product: ${arabicProduct.name} (ID: ${arabicProduct.id})`);
              const uploadSuccess = await uploadProductImage(arabicProduct.id, formData.image);
              if (uploadSuccess) {
                console.log(`✅ Image uploaded to Arabic product: ${arabicProduct.name}`);
                toast.success(`📸 Image uploaded to Arabic product successfully!`);
              } else {
                throw new Error('Upload returned false');
              }
            } catch (error) {
              console.error('Failed to upload image to Arabic product:', error);
              toast.error(`Failed to upload image to Arabic product: ${error.message}`);
            }
          }
        }
      }

      // Link the products with Polylang translations if both were created
      if (englishProduct && arabicProduct) {
        try {
          console.log('🔗 Linking bilingual products via meta data...');
          
          // Method 1: Update both products with translation meta data
          const linkPromises = [
            // Add English translation ID to Arabic product
            fetch(`https://nooralqmar.com/wp-json/wc/v3/products/${arabicProduct.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + btoa('ck_dc373790e65a510998fbc7278cb12b987d90b04a:cs_815de347330e130a58e3e53e0f87b0cd4f0de90f'),
              },
              body: JSON.stringify({
                meta_data: [
                  { key: '_english_translation_id', value: englishProduct.id.toString() },
                  { key: 'language', value: 'ar' },
                  { key: 'translation_group', value: `bilingual_${englishProduct.id}_${arabicProduct.id}` }
                ]
              }),
            }),
            // Add Arabic translation ID to English product
            fetch(`https://nooralqmar.com/wp-json/wc/v3/products/${englishProduct.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + btoa('ck_dc373790e65a510998fbc7278cb12b987d90b04a:cs_815de347330e130a58e3e53e0f87b0cd4f0de90f'),
              },
              body: JSON.stringify({
                meta_data: [
                  { key: '_arabic_translation_id', value: arabicProduct.id.toString() },
                  { key: 'language', value: 'en' },
                  { key: 'translation_group', value: `bilingual_${englishProduct.id}_${arabicProduct.id}` }
                ]
              }),
            })
          ];

          const results = await Promise.all(linkPromises);
          console.log('✅ Products linked successfully via meta data');
          
        } catch (linkError) {
          console.error('⚠️ Product linking failed (products still created):', linkError);
        }

        // Update both products with translation links in the UI
        englishProduct.polylang_translations = {
          en: englishProduct.id.toString(),
          ar: arabicProduct.id.toString()
        };
        
        arabicProduct.polylang_translations = {
          en: englishProduct.id.toString(),
          ar: arabicProduct.id.toString()
        };

        toast.success(`🔗 Successfully created 2 linked products:\n🇺🇸 "${englishProduct.name}" (ID: ${englishProduct.id})\n🇸🇦 "${arabicProduct.name}" (ID: ${arabicProduct.id})\n\nBoth products have the same price and image!`, { duration: 6000 });
      } else if (results.length > 0) {
        const product = results[0];
        toast.success(`✅ Created ${results.length === 1 ? 'single' : results.length} product(s): "${product.name}" (ID: ${product.id})`);
      }

      if (results.length > 0) {
        // Reset form
        setFormData({
          en: { name: '', slug: '', description: '', short_description: '', categories: [], tags: [] },
          ar: { name: '', slug: '', description: '', short_description: '', categories: [], tags: [] },
          sku: '', regular_price: '', sale_price: '', stock_status: 'instock',
          featured: false, image: null, createBothLanguages: true
        });
        onClose();
      }
    } catch (error) {
      console.error('Error creating products:', error);
      toast.error('Failed to create products');
    } finally {
      setSaving(false);
    }
  };

  const addCategory = () => {
    if (newCategory && !formData[activeTab].categories.includes(newCategory)) {
      setFormData(prev => ({
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          categories: [...prev[activeTab].categories, newCategory]
        }
      }));
      setNewCategory('');
    }
  };

  const removeCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        categories: prev[activeTab].categories.filter(c => c !== category)
      }
    }));
  };

  const addTag = () => {
    if (newTag && !formData[activeTab].tags.includes(newTag)) {
      setFormData(prev => ({
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          tags: [...prev[activeTab].tags, newTag]
        }
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        tags: prev[activeTab].tags.filter(t => t !== tag)
      }
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[100vw] sm:max-w-2xl lg:max-w-4xl max-h-[100vh] sm:max-h-[95vh] overflow-y-auto p-3 sm:p-4 lg:p-6 m-0 sm:m-4 rounded-none sm:rounded-lg">
        <DialogHeader className="pb-3 border-b border-gray-200">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-left">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-600" />
              <span className="text-lg sm:text-xl font-semibold">Add New Product</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Globe className="w-4 h-4" />
              <span>Multi-Language Support</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Dual Language Creation Toggle */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <div className="flex flex-col gap-3">
              <div>
                <h3 className="font-semibold text-blue-900 mb-1 text-sm sm:text-base">🌐 Bilingual Product Creation</h3>
                <p className="text-xs sm:text-sm text-blue-700">Create linked English and Arabic versions automatically</p>
              </div>
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <Label htmlFor="createBothLanguages" className="text-sm font-medium flex-1">
                  Create Both Languages {formData.createBothLanguages && '🔗'}
                </Label>
                <Switch
                  id="createBothLanguages"
                  checked={formData.createBothLanguages}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, createBothLanguages: checked }))}
                />
              </div>
            </div>
          </div>

          {/* Language Tabs */}
          <div className="border-b border-gray-200">
            <nav className="grid grid-cols-2 gap-1 sm:flex sm:space-x-8 sm:gap-0" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('en')}
                className={`py-3 px-2 sm:px-1 border-b-2 font-medium text-sm transition-all ${
                  activeTab === 'en'
                    ? 'border-blue-500 text-blue-600 bg-blue-50 sm:bg-transparent'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <USAFlag className="w-5 h-3 flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate">English</span>
                  {formData.en.name && <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></span>}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('ar')}
                className={`py-3 px-2 sm:px-1 border-b-2 font-medium text-sm transition-all ${
                  activeTab === 'ar'
                    ? 'border-blue-500 text-blue-600 bg-blue-50 sm:bg-transparent'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <KSAFlag className="w-5 h-3 flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate">العربية</span>
                  {formData.ar.name && <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></span>}
                </div>
              </button>
            </nav>
          </div>

          {/* Language-Specific Information */}
          <div className="space-y-3 sm:space-y-4" dir="ltr">
            <h3 className="text-base sm:text-lg font-semibold flex flex-col sm:flex-row sm:items-center gap-2 text-left">
              <span>{activeTab === 'en' ? 'English Information' : 'Arabic Information / المعلومات العربية'}</span>
              <div className="flex items-center gap-1">
                {activeTab === 'ar' ? (
                  <KSAFlag className="w-5 h-3" />
                ) : (
                  <USAFlag className="w-5 h-3" />
                )}
                <span className="text-xs text-gray-500">{activeTab.toUpperCase()}</span>
              </div>
            </h3>
            
              <div className="space-y-2">
                <Label htmlFor="name" className="text-left block">
                  {activeTab === 'en' ? 'Product Name *' : 'Product Name * / اسم المنتج *'}
                </Label>
                <Input
                  id="name"
                  value={formData[activeTab].name}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    [activeTab]: { ...prev[activeTab], name: e.target.value }
                  }))}
                  placeholder={activeTab === 'ar' ? 'اسم المنتج...' : 'Enter product name...'}
                  dir="ltr"
                  className="text-left w-full"
                />
              </div>

            {/* Custom SEO Slug Field */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <Label htmlFor="slug" className="flex items-center gap-2 text-left text-sm">
                  <Link className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">
                    {activeTab === 'en' ? 'Custom URL Slug (SEO)' : 'Custom URL Slug (SEO) / رابط مخصص'}
                  </span>
                  <span className="text-xs text-gray-500">(Optional)</span>
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const autoSlug = generateSlugFromName(formData[activeTab].name);
                    setFormData(prev => ({ 
                      ...prev, 
                      [activeTab]: { ...prev[activeTab], slug: autoSlug }
                    }));
                    toast.success('Auto-generated SEO-friendly slug!');
                  }}
                  className="text-xs whitespace-nowrap"
                  disabled={!formData[activeTab].name}
                >
                  <Wand2 className="w-3 h-3 mr-1" />
                  Auto Generate
                </Button>
              </div>
              
              <div className="relative">
                <Input
                  id="slug"
                  value={formData[activeTab].slug}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                    setFormData(prev => ({ 
                      ...prev, 
                      [activeTab]: { ...prev[activeTab], slug: value }
                    }));
                  }}
                  placeholder={activeTab === 'ar' ? 'my-product-slug' : 'my-product-slug'}
                  className="pr-10"
                />
                {formData[activeTab].slug && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    {validateSlugSEO(formData[activeTab].slug).isValid ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                )}
              </div>

              {/* SEO Score and Validation */}
              {formData[activeTab].slug && (
                <div className="mt-2 space-y-2">
                  {/* SEO Score Bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 whitespace-nowrap">SEO Score:</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-0">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          getSlugSEOScore(formData[activeTab].slug) >= 80 ? 'bg-green-500' :
                          getSlugSEOScore(formData[activeTab].slug) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${getSlugSEOScore(formData[activeTab].slug)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium whitespace-nowrap">
                      {getSlugSEOScore(formData[activeTab].slug)}/100
                    </span>
                  </div>

                  {/* Validation Messages */}
                  {(() => {
                    const validation = validateSlugSEO(formData[activeTab].slug);
                    return (
                      <div className="space-y-1">
                        {validation.issues.map((issue, index) => (
                          <div key={index} className="flex items-center gap-1 text-xs text-red-600">
                            <AlertCircle className="w-3 h-3" />
                            {issue}
                          </div>
                        ))}
                        {validation.suggestions.map((suggestion, index) => (
                          <div key={index} className="flex items-center gap-1 text-xs text-blue-600">
                            <CheckCircle className="w-3 h-3" />
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* URL Preview */}
                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">
                    <span className="font-medium">URL Preview:</span><br />
                    <span className="text-blue-600 break-all">
                      https://nooralqmar.com/product/{formData[activeTab].slug || 'your-product-slug'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <CopyWritingEditor
                label={activeTab === 'en' ? 'Short Description' : 'Short Description / الوصف القصير'}
                value={formData[activeTab].short_description}
                onChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  [activeTab]: { ...prev[activeTab], short_description: value }
                }))}
                placeholder={activeTab === 'ar' ? 'وصف قصير للمنتج...' : 'Brief product description...'}
                height="100px"
                showCharCount={true}
                maxChars={160}
              />
              
              {/* SEO Score for Short Description */}
              {formData[activeTab].short_description && (
                <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">SEO Score (Short):</span>
                    <span className="text-xs sm:text-sm font-bold whitespace-nowrap">
                      {validateDescriptionSEO(formData[activeTab].short_description, 'short').score}/100
                    </span>
                  </div>
                  
                  {/* Score Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        getDescriptionSEOColor(validateDescriptionSEO(formData[activeTab].short_description, 'short').score)
                      }`}
                      style={{ 
                        width: `${validateDescriptionSEO(formData[activeTab].short_description, 'short').score}%` 
                      }}
                    />
                  </div>

                  {/* Issues and Suggestions */}
                  {(() => {
                    const analysis = validateDescriptionSEO(formData[activeTab].short_description, 'short');
                    return (
                      <div className="space-y-1 text-xs">
                        {analysis.issues.map((issue, index) => (
                          <div key={index} className="flex items-start gap-1 text-red-600">
                            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{issue}</span>
                          </div>
                        ))}
                        {analysis.suggestions.map((suggestion, index) => (
                          <div key={index} className="flex items-start gap-1 text-blue-600">
                            <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{suggestion}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <CopyWritingEditor
                label={activeTab === 'en' ? 'Full Description' : 'Full Description / الوصف الكامل'}
                value={formData[activeTab].description}
                onChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  [activeTab]: { ...prev[activeTab], description: value }
                }))}
                placeholder={activeTab === 'ar' ? 'وصف مفصل للمنتج...' : 'Detailed product description...'}
                height="150px"
              />
              
              {/* SEO Score for Long Description */}
              {formData[activeTab].description && (
                <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">SEO Score (Full Description):</span>
                    <span className="text-sm font-bold">
                      {validateDescriptionSEO(formData[activeTab].description, 'long').score}/100
                    </span>
                  </div>
                  
                  {/* Score Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        getDescriptionSEOColor(validateDescriptionSEO(formData[activeTab].description, 'long').score)
                      }`}
                      style={{ 
                        width: `${validateDescriptionSEO(formData[activeTab].description, 'long').score}%` 
                      }}
                    />
                  </div>

                  {/* Word Count and Analysis */}
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span>
                      Words: {formData[activeTab].description.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(w => w.length > 0).length}
                    </span>
                    <span>
                      Characters: {formData[activeTab].description.replace(/<[^>]*>/g, '').length}
                    </span>
                  </div>

                  {/* Issues and Suggestions */}
                  {(() => {
                    const analysis = validateDescriptionSEO(formData[activeTab].description, 'long');
                    return (
                      <div className="space-y-1 text-xs">
                        {analysis.issues.map((issue, index) => (
                          <div key={index} className="flex items-start gap-1 text-red-600">
                            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{issue}</span>
                          </div>
                        ))}
                        {analysis.suggestions.map((suggestion, index) => (
                          <div key={index} className="flex items-start gap-1 text-blue-600">
                            <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{suggestion}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Shared Information */}
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              🔗 Shared Information
              <span className="text-sm text-gray-600">(applies to both languages)</span>
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="sku">SKU (Optional)</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                placeholder="Product SKU (will add -en/-ar automatically)"
                />
              </div>
            </div>

          {/* Product Image Upload */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-semibold">Product Image</h3>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6">
              <div className="text-center">
                {formData.image ? (
                  <div className="space-y-2">
                    <img
                      src={URL.createObjectURL(formData.image)}
                      alt="Product preview"
                      className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-lg mx-auto"
                    />
                    <p className="text-xs sm:text-sm text-gray-600 truncate px-2">{formData.image.name}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, image: null }))}
                      className="text-xs sm:text-sm"
                    >
                      Remove Image
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto" />
                    <div>
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          console.log('📸 File input changed:', e.target.files);
                          const file = e.target.files?.[0];
                          if (file) {
                            console.log('✅ Image selected:', file.name, file.size, 'bytes');
                            setFormData(prev => ({ ...prev, image: file }));
                            toast.success(`Image selected: ${file.name}`);
                          }
                        }}
                      />
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => {
                          console.log('🖱️ Choose Image button clicked');
                          document.getElementById('image-upload')?.click();
                        }}
                        className="text-xs sm:text-sm"
                      >
                        Choose Image
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 px-2">
                      Recommended: 800x800px, JPG or PNG, max 5MB
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-semibold">Pricing (SAR)</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="regular_price" className="text-sm">Regular Price (SAR) *</Label>
                <Input
                  id="regular_price"
                  type="number"
                  step="0.01"
                  value={formData.regular_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, regular_price: e.target.value }))}
                  placeholder="0.00"
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sale_price" className="text-sm">Sale Price (SAR)</Label>
                <Input
                  id="sale_price"
                  type="number"
                  step="0.01"
                  value={formData.sale_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, sale_price: e.target.value }))}
                  placeholder="Leave empty if not on sale"
                  className="text-base"
                />
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-start space-x-2">
              <Label htmlFor="featured" className="text-sm flex-1">Featured Product</Label>
              <Switch
                id="featured"
                checked={formData.featured}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock_status" className="text-sm">Stock Status</Label>
              <Select value={formData.stock_status} onValueChange={(value) => setFormData(prev => ({ ...prev, stock_status: value }))}>
                <SelectTrigger className="text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instock">In Stock</SelectItem>
                  <SelectItem value="outofstock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Categories - Language Specific */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-semibold flex flex-col sm:flex-row sm:items-center gap-2 text-left">
              <span>{activeTab === 'en' ? 'Categories' : 'Categories / التصنيفات'}</span>
              <span className="text-xs sm:text-sm text-gray-600">
                ({activeTab === 'en' ? 'English' : 'Arabic'} version)
              </span>
            </h3>
            
            {categories.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">
                  WooCommerce Categories ({activeTab === 'en' ? 'English' : 'Arabic'}):
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 sm:max-h-40 overflow-y-auto p-2 border rounded-lg">
                  {categories
                    .filter(cat => {
                      // Enhanced language detection for categories
                      const hasArabic = /[\u0600-\u06FF\u0750-\u077F]/.test(cat.name);
                      const hasEnglish = /[a-zA-Z]/.test(cat.name);
                      
                      // More sophisticated filtering
                      if (activeTab === 'ar') {
                        // For Arabic tab: show categories that have Arabic characters
                        // OR categories that are clearly Arabic (even if they have some English)
                        const isArabicCategory = hasArabic || 
                          cat.name.includes('العربية') || 
                          cat.name.includes('عربي') ||
                          (!hasEnglish && !hasArabic); // Numbers or symbols only - show in both
                        
                        console.log(`🔍 AR Category "${cat.name}": hasArabic=${hasArabic}, hasEnglish=${hasEnglish}, isArabicCategory=${isArabicCategory}`);
                        return isArabicCategory;
                      } else {
                        // For English tab: show categories that have English characters but NO Arabic
                        // OR categories that are clearly English
                        const isEnglishCategory = (hasEnglish && !hasArabic) || 
                          cat.name.toLowerCase().includes('english') ||
                          cat.name.toLowerCase().includes('en') ||
                          (!hasEnglish && !hasArabic); // Numbers or symbols only - show in both
                        
                        console.log(`🔍 EN Category "${cat.name}": hasArabic=${hasArabic}, hasEnglish=${hasEnglish}, isEnglishCategory=${isEnglishCategory}`);
                        return isEnglishCategory;
                      }
                    })
                    .map(cat => (
                    <div key={cat.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`cat-${cat.id}-${activeTab}`}
                        checked={formData[activeTab].categories.includes(cat.name)}
                        onCheckedChange={(checked) => {
                          console.log(`📂 Category ${checked ? 'selected' : 'deselected'}: "${cat.name}" (${activeTab})`);
                          if (checked) {
                            setFormData(prev => ({ 
                              ...prev, 
                              [activeTab]: { 
                                ...prev[activeTab], 
                                categories: [...prev[activeTab].categories, cat.name] 
                              }
                            }));
                          } else {
                            setFormData(prev => ({ 
                              ...prev, 
                              [activeTab]: { 
                                ...prev[activeTab], 
                                categories: prev[activeTab].categories.filter(c => c !== cat.name) 
                              }
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={`cat-${cat.id}-${activeTab}`} className="text-sm text-left">
                        <span className="flex items-center gap-1">
                          {activeTab === 'ar' ? '🔤' : '🔠'} {cat.name} ({cat.count})
                        </span>
                      </Label>
              </div>
                  ))}
            </div>
                <div className="text-xs text-gray-500 mt-2">
                  {activeTab === 'en' 
                    ? '💡 Showing English categories (no Arabic characters)' 
                    : '💡 عرض التصنيفات العربية (تحتوي على أحرف عربية)'
                  }
                  <br />
                  <span className="text-xs text-blue-600">
                    {activeTab === 'en' 
                      ? 'If you see Arabic categories here, they may have mixed language names' 
                      : 'إذا رأيت تصنيفات إنجليزية هنا، فقد تحتوي على أسماء مختلطة'
                    }
                  </span>
          </div>
              </div>
            )}

            {/* Custom Category Input */}
            <div className="space-y-2">
              <Label className="text-left block">
                {activeTab === 'en' ? 'Add Custom Category:' : 'Add Custom Category / إضافة تصنيف مخصص:'}
              </Label>
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                  placeholder={activeTab === 'ar' ? 'اسم التصنيف...' : 'Custom category name'}
                onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                  dir={activeTab === 'ar' ? 'rtl' : 'ltr'}
                  className={`flex-1 ${activeTab === 'ar' ? 'text-right' : 'text-left'}`}
              />
                <Button type="button" onClick={addCategory} size="sm">
                  <Plus className="w-4 h-4" />
              </Button>
            </div>
                </div>

            {formData[activeTab].categories.length > 0 && (
              <div className="space-y-2">
                <Label className="text-left block">
                  {activeTab === 'en' ? 'Selected Categories:' : 'Selected Categories / التصنيفات المحددة:'}
                </Label>
                <div className="flex flex-wrap gap-2 justify-start">
                  {formData[activeTab].categories.map(cat => (
                    <Badge key={cat} variant="secondary" className="flex items-center gap-1">
                    {cat}
                    <X 
                        className="w-3 h-3 cursor-pointer hover:text-red-500" 
                      onClick={() => removeCategory(cat)}
                    />
                  </Badge>
                ))}
                </div>
              </div>
            )}
          </div>

          {/* Tags - Language Specific */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-semibold flex flex-col sm:flex-row sm:items-center gap-2 text-left">
              <span>{activeTab === 'en' ? 'Tags' : 'Tags / الكلمات المفتاحية'}</span>
              <span className="text-xs sm:text-sm text-gray-600">
                ({activeTab === 'en' ? 'English' : 'Arabic'} version)
              </span>
            </h3>
            
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder={activeTab === 'ar' ? 'إضافة كلمة مفتاحية...' : 'Add tag'}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                dir={activeTab === 'ar' ? 'rtl' : 'ltr'}
                className={`flex-1 ${activeTab === 'ar' ? 'text-right' : 'text-left'}`}
              />
              <Button type="button" onClick={addTag} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {formData[activeTab].tags.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-start">
                {formData[activeTab].tags.map(tag => (
                  <Badge key={tag} variant="outline" className="flex items-center gap-1">
                    #{tag}
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-red-500" 
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="order-2 sm:order-1 text-sm sm:text-base"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || (!formData.en.name && !formData.ar.name) || !formData.regular_price}
              className="bg-green-600 hover:bg-green-700 order-1 sm:order-2 text-sm sm:text-base"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span className="hidden sm:inline">Creating Products...</span>
                  <span className="sm:hidden">Creating...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">
                    {formData.createBothLanguages ? 'Create Linked Products 🔗' : 'Create Product'}
                  </span>
                  <span className="sm:hidden">
                    {formData.createBothLanguages ? 'Create Both 🔗' : 'Create'}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 