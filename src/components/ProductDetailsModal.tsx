import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  Package,
  Tag,
  Star,
  TrendingUp,
  TrendingDown,
  Ruler,
  Weight,
  Eye,
  EyeOff,
  ShoppingCart,
  ExternalLink,
  Info,
  ImageIcon,
  Loader2
} from 'lucide-react';
import { WooCommerceProduct } from '@/lib/woocommerceApi';
import { supabase } from '@/lib/supabase';

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: number;
  productSku?: string;
  productName?: string;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  isOpen,
  onClose,
  productId,
  productSku,
  productName
}) => {
  const [product, setProduct] = useState<WooCommerceProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (isOpen && (productId || productSku)) {
      fetchProductDetails();
    }
  }, [isOpen, productId, productSku]);

  const fetchProductDetails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Fetching product details from WooCommerce for:', { productId, productSku, productName });
      
      // Import WooCommerce API
      const wooCommerceAPI = (await import('@/lib/woocommerceApi')).default;
      
      let wooProduct: WooCommerceProduct | null = null;
      
      if (productId) {
        // Fetch by product ID
        console.log('🔍 Fetching by product ID:', productId);
        try {
          wooProduct = await wooCommerceAPI.fetchProduct(productId);
          console.log('✅ Found product by ID:', wooProduct);
        } catch (idError) {
          console.error('❌ Error fetching by ID:', idError);
        }
      }
      
      // If not found by ID, try searching by SKU
      if (!wooProduct && productSku) {
        console.log('🔍 Searching by SKU:', productSku);
        try {
          const products = await wooCommerceAPI.fetchProducts({ search: productSku, per_page: 10 });
          if (products && products.length > 0) {
            // Look for exact SKU match
            const exactSkuMatch = products.find(p => p.sku === productSku);
            wooProduct = exactSkuMatch || products[0];
            console.log('✅ Found product by SKU search:', wooProduct);
          }
        } catch (skuError) {
          console.error('❌ Error searching by SKU:', skuError);
        }
      }
      
      // If still not found, try searching by name
      if (!wooProduct && productName) {
        console.log('🔍 Searching by name:', productName);
        try {
          const products = await wooCommerceAPI.fetchProducts({ 
            search: productName, 
            per_page: 10 
          });
          if (products && products.length > 0) {
            // Find exact match or closest match
            const exactMatch = products.find(p => 
              p.name.toLowerCase() === productName.toLowerCase()
            );
            wooProduct = exactMatch || products[0];
            console.log('✅ Found product by name search:', wooProduct);
          }
        } catch (nameError) {
          console.error('❌ Error searching by name:', nameError);
        }
      }
      
      if (wooProduct) {
        setProduct(wooProduct);
        console.log('✅ Successfully loaded product details from WooCommerce');
      } else {
        setError('Product not found in WooCommerce. This may be a custom product or the product may have been deleted.');
      }
    } catch (err) {
      console.error('❌ Error fetching product details from WooCommerce:', err);
      setError('Failed to fetch product details from WooCommerce. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    return numPrice > 0 ? `${numPrice.toFixed(2)} SAR` : 'N/A';
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'instock':
        return 'bg-green-100 text-green-800';
      case 'outofstock':
        return 'bg-red-100 text-red-800';
      case 'onbackorder':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStockStatusText = (status: string) => {
    switch (status) {
      case 'instock':
        return 'In Stock';
      case 'outofstock':
        return 'Out of Stock';
      case 'onbackorder':
        return 'On Backorder';
      default:
        return 'Unknown';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Details
          </DialogTitle>
          <DialogDescription>
            Detailed product information and specifications
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading product details...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">
              <Info className="h-8 w-8 mx-auto mb-2" />
              {error}
            </div>
            <Button onClick={fetchProductDetails} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {product && !loading && (
          <div className="space-y-6">
            {/* Product Header */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Product Images */}
              <div className="space-y-4">
                {product.images && product.images.length > 0 ? (
                  <div className="space-y-2">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border">
                      <img
                        src={product.images[selectedImageIndex]?.src}
                        alt={product.images[selectedImageIndex]?.alt || product.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          console.log('❌ Image failed to load:', e);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    {product.images.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto">
                        {product.images.map((image, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedImageIndex(index)}
                            className={`flex-shrink-0 w-16 h-16 rounded border overflow-hidden ${
                              selectedImageIndex === index ? 'ring-2 ring-blue-500' : ''
                            }`}
                          >
                            <img
                              src={image.src}
                              alt={image.alt || product.name}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-square rounded-lg bg-gray-100 border flex items-center justify-center">
                    <ImageIcon className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
                  {product.sku && (
                    <p className="text-sm text-gray-600 mb-2">
                      <Tag className="inline w-4 h-4 mr-1" />
                      SKU: {product.sku}
                    </p>
                  )}
                </div>

                {/* Pricing */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-green-600">
                      {formatPrice(product.price)}
                    </span>
                    {product.on_sale && product.regular_price !== product.price && (
                      <span className="text-lg text-gray-500 line-through">
                        {formatPrice(product.regular_price)}
                      </span>
                    )}
                  </div>
                  {product.on_sale && (
                    <Badge variant="destructive" className="w-fit">
                      On Sale
                    </Badge>
                  )}
                </div>

                {/* Stock Status */}
                <div className="space-y-2">
                  <Badge className={getStockStatusColor(product.stock_status)}>
                    {getStockStatusText(product.stock_status)}
                  </Badge>
                  {product.stock_quantity !== null && product.manage_stock && (
                    <p className="text-sm text-gray-600">
                      <Package className="inline w-4 h-4 mr-1" />
                      Quantity: {product.stock_quantity} units
                    </p>
                  )}
                </div>

                {/* Categories */}
                {product.categories && product.categories.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Categories</Label>
                    <div className="flex flex-wrap gap-2">
                      {product.categories.map((category) => (
                        <Badge key={category.id} variant="secondary">
                          {category.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Product Stats */}
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-sm text-gray-600">Total Sales</div>
                    <div className="text-lg font-semibold">{product.total_sales}</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-sm text-gray-600">Rating</div>
                    <div className="text-lg font-semibold flex items-center justify-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      {product.average_rating} ({product.rating_count})
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Descriptions */}
            {(product.short_description || product.description) && (
              <div className="space-y-4">
                {product.short_description && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Short Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: product.short_description }}
                      />
                    </CardContent>
                  </Card>
                )}

                {product.description && product.description !== product.short_description && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Full Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: product.description }}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Physical Properties */}
            {(product.weight || product.dimensions.length || product.dimensions.width || product.dimensions.height) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Ruler className="w-5 h-5" />
                    Physical Properties
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {product.weight && (
                      <div className="text-center p-3 bg-gray-50 rounded">
                        <Weight className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                        <div className="text-sm text-gray-600">Weight</div>
                        <div className="font-semibold">{product.weight}</div>
                      </div>
                    )}
                    {product.dimensions.length && (
                      <div className="text-center p-3 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">Length</div>
                        <div className="font-semibold">{product.dimensions.length}</div>
                      </div>
                    )}
                    {product.dimensions.width && (
                      <div className="text-center p-3 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">Width</div>
                        <div className="font-semibold">{product.dimensions.width}</div>
                      </div>
                    )}
                    {product.dimensions.height && (
                      <div className="text-center p-3 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">Height</div>
                        <div className="font-semibold">{product.dimensions.height}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Product Attributes */}
            {product.attributes && product.attributes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Product Attributes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {product.attributes.map((attribute) => (
                      <div key={attribute.id} className="border-b pb-2 last:border-b-0">
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-sm">{attribute.name}:</span>
                          <div className="text-sm text-gray-600 text-right max-w-xs">
                            {attribute.options.join(', ')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Additional Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Product Type:</span>
                    <span className="ml-2 capitalize">{product.type}</span>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <span className="ml-2 capitalize">{product.status}</span>
                  </div>
                  <div>
                    <span className="font-medium">Shipping Required:</span>
                    <span className="ml-2">{product.shipping_required ? 'Yes' : 'No'}</span>
                  </div>
                  <div>
                    <span className="font-medium">Virtual Product:</span>
                    <span className="ml-2">{product.virtual ? 'Yes' : 'No'}</span>
                  </div>
                  <div>
                    <span className="font-medium">Reviews Allowed:</span>
                    <span className="ml-2">{product.reviews_allowed ? 'Yes' : 'No'}</span>
                  </div>
                  <div>
                    <span className="font-medium">Sold Individually:</span>
                    <span className="ml-2">{product.sold_individually ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
