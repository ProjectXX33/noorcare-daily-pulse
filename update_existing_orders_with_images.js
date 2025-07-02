// Script to update existing orders with product images from WooCommerce
// Run this in browser console on the Warehouse Dashboard page

async function updateExistingOrdersWithImages() {
  console.log('🚀 Starting to update existing orders with product images...');
  
  try {
    // Get all orders from Supabase
    const { data: orders, error } = await supabase
      .from('order_submissions')
      .select('*')
      .not('order_items', 'is', null);

    if (error) {
      console.error('❌ Error fetching orders:', error);
      return;
    }

    console.log(`📦 Found ${orders.length} orders to check`);

    let updatedCount = 0;

    for (const order of orders) {
      try {
        console.log(`🔍 Checking order ${order.order_number || order.id}...`);
        
        // Check if order_items already have image_url
        const hasImages = order.order_items.some(item => item.image_url);
        if (hasImages) {
          console.log(`✅ Order ${order.order_number || order.id} already has images, skipping`);
          continue;
        }

        // Update each item in order_items with image_url
        const updatedItems = await Promise.all(
          order.order_items.map(async (item) => {
            if (item.image_url) {
              return item; // Already has image
            }

            console.log(`🖼️ Fetching image for product ${item.product_id} (${item.product_name})`);
            
            try {
              // Fetch product details from WooCommerce
              const productDetails = await wooCommerceAPI.fetchProduct(item.product_id);
              const imageUrl = productDetails?.images?.[0]?.src || null;
              
              console.log(`📸 Found image for ${item.product_name}:`, imageUrl);
              
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
        } else {
          console.log(`✅ Updated order ${order.order_number || order.id} with product images`);
          updatedCount++;
        }

        // Add a small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (err) {
        console.error(`❌ Error processing order ${order.order_number || order.id}:`, err);
      }
    }

    console.log(`🎉 Migration complete! Updated ${updatedCount} orders with product images.`);
    console.log('🔄 Refreshing page to see changes...');
    
    // Refresh the page to see updated images
    window.location.reload();

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Instructions to run this script:
console.log(`
🖼️ PRODUCT IMAGES UPDATE SCRIPT
=============================

1. Open your Warehouse Dashboard
2. Open Browser Console (F12)
3. Paste this entire script
4. Run: updateExistingOrdersWithImages()

This will:
- Check all existing orders
- Fetch product images from WooCommerce
- Update order_items with image URLs
- Refresh the page automatically

⚠️ Note: This may take a few minutes for many orders.
`);

// Auto-export for easy access
window.updateExistingOrdersWithImages = updateExistingOrdersWithImages; 