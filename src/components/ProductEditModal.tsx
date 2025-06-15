import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Save, Edit3, ExternalLink, Upload, Globe, Package } from 'lucide-react';
import { CopyWritingProduct } from '@/contexts/CopyWritingProductsContext';
import { useCopyWritingProducts } from '@/contexts/CopyWritingProductsContext';
import { CopyWritingEditor } from '@/components/CopyWritingEditor';

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

interface ProductEditModalProps {
  product: CopyWritingProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (productId: number, updates: Partial<CopyWritingProduct>) => Promise<boolean>;
}

export const ProductEditModal: React.FC<ProductEditModalProps> = ({
  product,
  isOpen,
  onClose,
  onSave
}) => {
  const { uploadProductImage } = useCopyWritingProducts();
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    short_description: '',
    regular_price: '',
    sale_price: '',
    featured: false,
    language: 'en' as 'en' | 'ar'
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description,
        short_description: product.short_description,
        regular_price: product.regular_price,
        sale_price: product.sale_price || '',
        featured: product.featured,
        language: product.language || 'en'
      });
    }
  }, [product]);

  const handleSave = async () => {
    if (!product) return;

    setSaving(true);
    try {
      const updates: Partial<CopyWritingProduct> = {
        name: formData.name,
        description: formData.description,
        short_description: formData.short_description,
        regular_price: formData.regular_price,
        sale_price: formData.sale_price,
        featured: formData.featured,
        language: formData.language,
        polylang_translations: {
          ...product.polylang_translations,
          [formData.language]: formData.name
        }
      };

      const success = await onSave(product.id, updates);
      if (success) {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!product) return;

    setUploadingImage(true);
    try {
      await uploadProductImage(product.id, file);
    } finally {
      setUploadingImage(false);
    }
  };

  // SEO Helper Functions
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
      // SHORT DESCRIPTION SEO RULES
      if (charCount === 0) {
        return { score: 0, issues: ['Meta description is empty'], suggestions: ['Add compelling short description (50-160 chars)'] };
      }

      // Length: 50-160 characters
      if (charCount >= 50 && charCount <= 160) {
        score += 35;
        suggestions.push('✅ Perfect meta description length (50-160 chars)');
      } else if (charCount < 50) {
        score += 10;
        issues.push(`Too short (${charCount} chars) - should be 50-160`);
        suggestions.push('🔸 Expand with benefits, features, or call-to-action');
      } else {
        score += 15;
        issues.push(`Too long (${charCount} chars) - may be truncated in search results`);
        suggestions.push('✂️ Trim to 160 chars max for full display');
      }

      // Keyword presence
      const hasKeywords = primaryKeywords.some(keyword => 
        plainText.toLowerCase().includes(keyword.toLowerCase())
      );
      if (hasKeywords) {
        score += 25;
        suggestions.push('🎯 Contains relevant keywords');
      } else {
        issues.push('Missing relevant keywords');
        suggestions.push(`💡 Add keywords: ${primaryKeywords.slice(0, 3).join(', ')}`);
      }

      // Call-to-action indicators
      const ctaWords = isArabicContent 
        ? ['اشتري', 'احصل', 'جرب', 'اطلب', 'تسوق', 'اكتشف']
        : ['buy', 'get', 'try', 'order', 'shop', 'discover', 'learn', 'find'];
      const hasCTA = ctaWords.some(cta => plainText.toLowerCase().includes(cta.toLowerCase()));
      if (hasCTA) {
        score += 20;
        suggestions.push('📢 Has call-to-action');
      } else {
        suggestions.push('📢 Consider adding call-to-action words');
      }

      // Front-loading check
      const firstWords = plainText.split(' ').slice(0, 3).join(' ').toLowerCase();
      const hasEarlyKeyword = primaryKeywords.some(keyword => 
        firstWords.includes(keyword.toLowerCase())
      );
      if (hasEarlyKeyword) {
        score += 20;
        suggestions.push('🚀 Keywords front-loaded');
      } else {
        suggestions.push('🚀 Consider moving key terms to the beginning');
      }

    } else {
      // LONG DESCRIPTION SEO RULES
      if (charCount === 0) {
        return { score: 0, issues: ['Description is empty'], suggestions: ['Add detailed product description (300+ words)'] };
      }

      // Length: 300-1000+ words
      if (wordCount >= 300) {
        score += 30;
        suggestions.push(`✅ Good length (${wordCount} words)`);
      } else if (wordCount >= 150) {
        score += 20;
        suggestions.push(`📝 Decent length (${wordCount} words) - consider expanding to 300+`);
      } else {
        score += 10;
        issues.push(`Too short (${wordCount} words) - should be 300+ for SEO`);
        suggestions.push('📝 Expand with features, benefits, usage instructions');
      }

      // Keyword density (1-2%)
      const keywordCount = primaryKeywords.reduce((count, keyword) => {
        const regex = new RegExp(keyword, 'gi');
        return count + (plainText.match(regex) || []).length;
      }, 0);
      const density = (keywordCount / wordCount) * 100;
      
      if (density >= 1 && density <= 2) {
        score += 25;
        suggestions.push(`🎯 Perfect keyword density (${density.toFixed(1)}%)`);
      } else if (density < 1) {
        score += 10;
        suggestions.push(`🎯 Low keyword density (${density.toFixed(1)}%) - add more relevant terms`);
      } else {
        score += 15;
        issues.push(`High keyword density (${density.toFixed(1)}%) - may seem spammy`);
        suggestions.push('⚖️ Reduce keyword repetition for natural flow');
      }

      // Structure check (headings)
      const hasHeadings = /<h[1-6]>/i.test(description);
      if (hasHeadings) {
        score += 20;
        suggestions.push('📋 Has structured headings');
      } else {
        suggestions.push('📋 Add H2/H3 headings for better structure');
      }

      // Trust signals
      const trustSignals = isArabicContent
        ? ['ضمان', 'مضمون', 'آمن', 'موثوق', 'معتمد', 'مرخص']
        : ['guarantee', 'certified', 'safe', 'trusted', 'approved', 'licensed', 'tested'];
      const hasTrustSignals = trustSignals.some(signal => 
        plainText.toLowerCase().includes(signal.toLowerCase())
      );
      if (hasTrustSignals) {
        score += 15;
        suggestions.push('🛡️ Contains trust signals');
      } else {
        suggestions.push('🛡️ Add trust signals (certified, guaranteed, etc.)');
      }

      // Call-to-action at end
      const lastSentence = plainText.split('.').pop()?.toLowerCase() || '';
      const ctaWords = isArabicContent 
        ? ['اشتري', 'احصل', 'جرب', 'اطلب', 'تسوق']
        : ['buy', 'order', 'get', 'try', 'shop', 'contact'];
      const hasEndCTA = ctaWords.some(cta => lastSentence.includes(cta));
      if (hasEndCTA) {
        score += 10;
        suggestions.push('🎯 Has closing call-to-action');
      } else {
        suggestions.push('🎯 End with clear call-to-action');
      }
    }

    return { 
      score: Math.min(100, score), 
      issues: issues.slice(0, 3), 
      suggestions: suggestions.slice(0, 4) 
    };
  };

  const getDescriptionSEOColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[100vw] sm:max-w-4xl max-h-[100vh] sm:max-h-[95vh] overflow-y-auto p-3 sm:p-6 m-0 sm:m-4 rounded-none sm:rounded-lg">
        <DialogHeader className="pb-3 border-b border-gray-200">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-blue-600" />
              <span className="text-lg sm:text-xl font-semibold">Edit Product</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:ml-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Language: {formData.language.toUpperCase()}</span>
                {formData.language === 'ar' ? (
                  <KSAFlag className="w-5 h-3" />
                ) : (
                  <USAFlag className="w-5 h-3" />
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(product.permalink, '_blank')}
                className="w-full sm:w-auto"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Live
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Warning Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800">Live Website Update</p>
                <p className="text-xs text-amber-700">Changes will be applied to your live WooCommerce website immediately.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Left Column - Product Images */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold">Product Images</h3>
              
              {/* Current Images */}
              <div className="space-y-3">
                {product.images.length > 0 ? (
                  product.images.map((image, index) => (
                    <div key={image.id} className="relative group">
                      <img
                        src={image.src}
                        alt={image.alt || product.name}
                        className="w-full h-40 object-cover rounded-lg border"
                      />
                      {index === 0 && (
                        <Badge className="absolute top-2 left-2 bg-blue-500">
                          Main Image
                        </Badge>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="w-full h-40 bg-gray-100 rounded-lg border flex items-center justify-center">
                    <Package className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Upload New Image */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4">
                <div className="text-center">
                  <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mx-auto mb-2" />
                  <div>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file);
                          }
                        }}
                        disabled={uploadingImage}
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        disabled={uploadingImage}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        {uploadingImage ? 'Uploading...' : 'Upload New Image'}
                      </Button>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    JPG, PNG up to 5MB
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Product Details */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Language Selection */}
              <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1 text-sm sm:text-base">Product Language</h3>
                    <p className="text-xs sm:text-sm text-blue-700">Change the language for this product</p>
                  </div>
                  <Select value={formData.language} onValueChange={(value: 'en' | 'ar') => setFormData(prev => ({ ...prev, language: value }))}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">
                        <div className="flex items-center gap-2">
                          <USAFlag className="w-4 h-3" />
                          English
                        </div>
                      </SelectItem>
                      <SelectItem value="ar">
                        <div className="flex items-center gap-2">
                          <KSAFlag className="w-4 h-3" />
                          العربية
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Basic Information */}
              <div className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-sm">Product Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    dir="ltr"
                    className="text-base"
                  />
                </div>

                <div className="space-y-2">
                  <CopyWritingEditor
                    label="Short Description"
                    value={formData.short_description}
                    onChange={(value) => setFormData(prev => ({ ...prev, short_description: value }))}
                    placeholder={formData.language === 'ar' ? 'وصف قصير للمنتج...' : 'Brief product description...'}
                    height="100px"
                    showCharCount={true}
                    maxChars={160}
                  />
                  
                  {/* SEO Score for Short Description */}
                  {(() => {
                    const seoResult = validateDescriptionSEO(formData.short_description, 'short');
                    return (
                      <div className="bg-gray-50 border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">SEO Score (Short):</span>
                          <span className={`font-bold ${getDescriptionSEOColor(seoResult.score)}`}>
                            {seoResult.score}/100
                          </span>
                        </div>
                        
                        {seoResult.issues.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-red-600 mb-1">Issues:</p>
                            <ul className="text-xs text-red-600 space-y-1">
                              {seoResult.issues.map((issue, index) => (
                                <li key={index}>• {issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {seoResult.suggestions.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-blue-600 mb-1">Suggestions:</p>
                            <ul className="text-xs text-blue-600 space-y-1">
                              {seoResult.suggestions.map((suggestion, index) => (
                                <li key={index}>• {suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="space-y-2">
                  <CopyWritingEditor
                    label="Full Description"
                    value={formData.description}
                    onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
                    placeholder={formData.language === 'ar' ? 'وصف مفصل للمنتج...' : 'Detailed product description...'}
                    height="150px"
                  />
                  
                  {/* SEO Score for Full Description */}
                  {(() => {
                    const seoResult = validateDescriptionSEO(formData.description, 'long');
                    return (
                      <div className="bg-gray-50 border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">SEO Score (Full):</span>
                          <span className={`font-bold ${getDescriptionSEOColor(seoResult.score)}`}>
                            {seoResult.score}/100
                          </span>
                        </div>
                        
                        {seoResult.issues.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-red-600 mb-1">Issues:</p>
                            <ul className="text-xs text-red-600 space-y-1">
                              {seoResult.issues.map((issue, index) => (
                                <li key={index}>• {issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {seoResult.suggestions.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-blue-600 mb-1">Suggestions:</p>
                            <ul className="text-xs text-blue-600 space-y-1">
                              {seoResult.suggestions.map((suggestion, index) => (
                                <li key={index}>• {suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-semibold">Pricing (SAR)</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-regular-price" className="text-sm">Regular Price</Label>
                    <Input
                      id="edit-regular-price"
                      type="number"
                      step="0.01"
                      value={formData.regular_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, regular_price: e.target.value }))}
                      className="text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-sale-price" className="text-sm">Sale Price</Label>
                    <Input
                      id="edit-sale-price"
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
                  <Label htmlFor="edit-featured" className="text-sm flex-1">Featured Product</Label>
                  <Switch
                    id="edit-featured"
                    checked={formData.featured}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked }))}
                  />
                </div>
              </div>

              {/* Product Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg space-y-2 text-xs sm:text-sm">
                  <div><strong>Product ID:</strong> {product.id}</div>
                  <div><strong>SKU:</strong> {product.sku || 'N/A'}</div>
                  <div><strong>Stock Status:</strong> 
                    <Badge variant={product.stock_status === 'instock' ? 'default' : 'destructive'} className="ml-2 text-xs">
                      {product.stock_status === 'instock' ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                  </div>
                  <div><strong>Total Sales:</strong> {product.total_sales}</div>
                </div>

                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg space-y-2 text-xs sm:text-sm">
                  <div><strong>Rating:</strong> {product.average_rating} ⭐ ({product.rating_count} reviews)</div>
                  <div><strong>Created:</strong> {new Date(product.date_created).toLocaleDateString()}</div>
                  <div><strong>Modified:</strong> {new Date(product.date_modified).toLocaleDateString()}</div>
                  <div><strong>Categories:</strong> 
                    <div className="flex flex-wrap gap-1 mt-1">
                      {product.categories.map(cat => (
                        <Badge key={cat.id} variant="outline" className="text-xs">
                          {cat.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t bg-white">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto order-1 sm:order-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="hidden sm:inline">Updating Website...</span>
                  <span className="sm:hidden">Updating...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Save to Website</span>
                  <span className="sm:hidden">Save</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 