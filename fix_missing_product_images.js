// Comprehensive script to fix missing product images in orders
// Run this in browser console on the Warehouse Dashboard page

console.log(`
🖼️ PRODUCT IMAGES FIX SCRIPT
============================

This script will:
1. Check all orders for missing product images
2. Fetch images from WooCommerce API
3. Update order_items with image URLs
4. Fix existing orders automatically

Instructions:
1. Open Warehouse Dashboard
2. Open Browser Console (F12)
3. Paste this entire script
4. Run: fixAllMissingImages()
`);

async function fixAllMissingImages() {
  console.log('🚀 Starting comprehensive image fix...');
  let fixedCount = 0;
  let errorCount = 0;
  
  try {
    // Step 1: Get all orders that might need image fixes
    const { data: orders, error } = await supabase
      .from('order_submissions')
      .select('*')
      .not('order_items', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100); // Process last 100 orders

    if (error) {
      console.error('❌ Error fetching orders:', error);
      return;
    }

    console.log(`📦 Found ${orders.length} orders to check`);

    for (const order of orders) {
      try {
        console.log(`\n🔍 Checking order ${order.order_number || order.id}...`);
        
        // Check if any items are missing images
        const needsImageFix = order.order_items.some(item => !item.image_url);
        
        if (!needsImageFix) {
          console.log(`✅ Order ${order.order_number || order.id} already has all images`);
          continue;
        }

        console.log(`🔧 Fixing images for order ${order.order_number || order.id}...`);

        // Update each item with missing image
        const updatedItems = await Promise.all(
          order.order_items.map(async (item) => {
            if (item.image_url) {
              return item; // Already has image
            }

            console.log(`  📸 Fetching image for: ${item.product_name} (ID: ${item.product_id})`);
            
            try {
              // Check if wooCommerceAPI is available
              if (typeof wooCommerceAPI === 'undefined') {
                console.warn('⚠️ wooCommerceAPI not available, using fallback method');
                return {
                  ...item,
                  image_url: null
                };
              }

              // Fetch product details from WooCommerce
              const productDetails = await wooCommerceAPI.fetchProduct(item.product_id);
              const imageUrl = productDetails?.images?.[0]?.src || null;
              
              if (imageUrl) {
                console.log(`  ✅ Found image: ${imageUrl.substring(0, 50)}...`);
              } else {
                console.log(`  ⚠️ No image found for product ${item.product_id}`);
              }
              
              return {
                ...item,
                image_url: imageUrl
              };
            } catch (err) {
              console.warn(`  ❌ Failed to fetch image for product ${item.product_id}:`, err.message);
              errorCount++;
              return {
                ...item,
                image_url: null
              };
            }
          })
        );

        // Update the order in database
        const { error: updateError } = await supabase
          .from('order_submissions')
          .update({ 
            order_items: updatedItems,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);

        if (updateError) {
          console.error(`❌ Failed to update order ${order.order_number || order.id}:`, updateError);
          errorCount++;
        } else {
          console.log(`✅ Updated order ${order.order_number || order.id}`);
          fixedCount++;
        }

        // Add small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (err) {
        console.error(`❌ Error processing order ${order.order_number || order.id}:`, err);
        errorCount++;
      }
    }

    console.log(`\n🎉 IMAGE FIX COMPLETE!`);
    console.log(`✅ Fixed: ${fixedCount} orders`);
    console.log(`❌ Errors: ${errorCount} orders`);
    
    if (fixedCount > 0) {
      console.log('🔄 Refreshing page to see changes...');
      setTimeout(() => window.location.reload(), 2000);
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Quick function to fix a single order
async function fixSingleOrderImages(orderIdOrNumber) {
  console.log(`🔧 Fixing images for order: ${orderIdOrNumber}`);
  
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

    console.log(`📦 Found order: ${order.order_number || order.id}`);

    const updatedItems = await Promise.all(
      order.order_items.map(async (item) => {
        if (item.image_url) {
          console.log(`✅ ${item.product_name} already has image`);
          return item;
        }

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
      console.log('✅ Order updated successfully!');
      setTimeout(() => window.location.reload(), 1000);
    }

  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

// Debug function to check current image status
async function checkImageStatus() {
  console.log('🔍 Checking image status for recent orders...');
  
  const { data: orders, error } = await supabase
    .from('order_submissions')
    .select('id, order_number, order_items')
    .not('order_items', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📊 Analyzing ${orders.length} recent orders...\n`);

  let ordersWithImages = 0;
  let ordersWithoutImages = 0;
  let totalItems = 0;
  let itemsWithImages = 0;

  orders.forEach(order => {
    console.log(`📦 Order ${order.order_number || order.id}:`);
    
    let orderHasAllImages = true;
    
    order.order_items.forEach((item, index) => {
      totalItems++;
      const hasImage = !!item.image_url;
      if (hasImage) itemsWithImages++;
      if (!hasImage) orderHasAllImages = false;
      
      console.log(`  ${index + 1}. ${item.product_name} - ${hasImage ? '✅ Has image' : '❌ Missing image'}`);
    });
    
    if (orderHasAllImages) {
      ordersWithImages++;
    } else {
      ordersWithoutImages++;
    }
    console.log('');
  });

  console.log(`📈 SUMMARY:`);
  console.log(`  Orders with all images: ${ordersWithImages}`);
  console.log(`  Orders missing images: ${ordersWithoutImages}`);
  console.log(`  Items with images: ${itemsWithImages}/${totalItems} (${Math.round(itemsWithImages/totalItems*100)}%)`);
}

// Export functions to global scope
window.fixAllMissingImages = fixAllMissingImages;
window.fixSingleOrderImages = fixSingleOrderImages;
window.checkImageStatus = checkImageStatus;

console.log(`
🛠️ AVAILABLE COMMANDS:
======================

1. checkImageStatus()
   - Check current image status

2. fixSingleOrderImages(orderNumber)
   - Fix specific order
   - Example: fixSingleOrderImages('#33393')

3. fixAllMissingImages()
   - Fix all orders with missing images
   - Processes last 100 orders

🔧 Run any command above to get started!
`); 