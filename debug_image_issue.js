// Debug script to check product image issue
// Run this in browser console on the Warehouse Dashboard page

async function debugProductImages() {
  console.log('🔍 DEBUG: Checking product image issue...');
  
  try {
    // 1. Check what's in the database for recent orders
    console.log('📋 Step 1: Checking database order_items...');
    const { data: orders, error } = await supabase
      .from('order_submissions')
      .select('id, order_number, order_items')
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) {
      console.error('❌ Database error:', error);
      return;
    }

    console.log(`📦 Found ${orders.length} recent orders`);
    
    for (const order of orders) {
      console.log(`\n🔍 Order ${order.order_number || order.id}:`);
      console.log('Raw order_items:', order.order_items);
      
      if (order.order_items && Array.isArray(order.order_items)) {
        order.order_items.forEach((item, index) => {
          console.log(`  Item ${index + 1}: ${item.product_name}`);
          console.log(`    - Product ID: ${item.product_id}`);
          console.log(`    - Has image_url: ${!!item.image_url}`);
          console.log(`    - Image URL: ${item.image_url || 'NULL'}`);
        });
      }
    }

    // 2. Test WooCommerce API directly
    console.log('\n🌐 Step 2: Testing WooCommerce API...');
    
    if (orders.length > 0 && orders[0].order_items && orders[0].order_items.length > 0) {
      const firstItem = orders[0].order_items[0];
      console.log(`🧪 Testing API for product ID: ${firstItem.product_id}`);
      
      try {
        const productDetails = await wooCommerceAPI.fetchProduct(firstItem.product_id);
        console.log('✅ WooCommerce API response:', productDetails);
        console.log('🖼️ Product images:', productDetails?.images);
        
        if (productDetails?.images && productDetails.images.length > 0) {
          console.log(`📸 First image URL: ${productDetails.images[0].src}`);
        } else {
          console.log('⚠️ No images found for this product in WooCommerce');
        }
      } catch (apiError) {
        console.error('❌ WooCommerce API error:', apiError);
      }
    }

    // 3. Check if wooCommerceAPI is available
    console.log('\n🔧 Step 3: Checking API availability...');
    console.log('wooCommerceAPI available:', typeof wooCommerceAPI !== 'undefined');
    console.log('supabase available:', typeof supabase !== 'undefined');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Quick fix function for a single order
async function fixSingleOrder(orderIdOrNumber) {
  console.log(`🔧 Fixing single order: ${orderIdOrNumber}`);
  
  try {
    const { data: order, error } = await supabase
      .from('order_submissions')
      .select('*')
      .or(`id.eq.${orderIdOrNumber},order_number.eq.${orderIdOrNumber}`)
      .single();

    if (error) {
      console.error('❌ Order not found:', error);
      return;
    }

    console.log('📦 Found order:', order.order_number || order.id);

    const updatedItems = await Promise.all(
      order.order_items.map(async (item) => {
        console.log(`🖼️ Fetching image for: ${item.product_name} (ID: ${item.product_id})`);
        
        try {
          const productDetails = await wooCommerceAPI.fetchProduct(item.product_id);
          const imageUrl = productDetails?.images?.[0]?.src || null;
          
          console.log(`📸 Image URL: ${imageUrl || 'None found'}`);
          
          return {
            ...item,
            image_url: imageUrl
          };
        } catch (err) {
          console.warn(`⚠️ Failed to fetch image for product ${item.product_id}:`, err);
          return {
            ...item,
            image_url: null
          };
        }
      })
    );

    const { error: updateError } = await supabase
      .from('order_submissions')
      .update({ 
        order_items: updatedItems,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('❌ Update failed:', updateError);
    } else {
      console.log('✅ Order updated successfully! Refreshing page...');
      setTimeout(() => window.location.reload(), 1000);
    }

  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

// Export functions
window.debugProductImages = debugProductImages;
window.fixSingleOrder = fixSingleOrder;

console.log(`
🔍 DEBUG COMMANDS LOADED
=======================

1. Run: debugProductImages()
   - Checks database and WooCommerce API

2. Run: fixSingleOrder(orderNumber)
   - Fixes a specific order
   - Example: fixSingleOrder('#123')

`); 