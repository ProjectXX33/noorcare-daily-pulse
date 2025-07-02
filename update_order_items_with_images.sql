-- Check current order_items structure and add image_url field if missing
-- This script will update existing orders to include product images

-- First, let's see what the current order_items look like
SELECT 
  id,
  order_number,
  order_items,
  created_at
FROM order_submissions 
WHERE order_items IS NOT NULL 
LIMIT 3;

-- Function to update order items with image URLs from WooCommerce
-- This is a placeholder - we'll need to call WooCommerce API from the application
-- to get the actual product images and update the JSON

-- Example of what updated order_items should look like:
/*
[
  {
    "product_id": 123,
    "product_name": "Product Name",
    "quantity": 1,
    "price": "100.00",
    "sku": "SKU123",
    "image_url": "https://nooralqmar.com/wp-content/uploads/2024/product.jpg"
  }
]
*/

-- Find orders where at least one order_item has image_url
SELECT DISTINCT o.id, o.order_number
FROM order_submissions o
JOIN LATERAL jsonb_array_elements(o.order_items::jsonb) AS item ON TRUE
WHERE item ? 'image_url'
LIMIT 5;

-- Count orders where at least one item is missing image_url
SELECT COUNT(DISTINCT o.id) AS orders_without_images
FROM order_submissions o
JOIN LATERAL jsonb_array_elements(o.order_items::jsonb) AS item ON TRUE
WHERE NOT (item ? 'image_url') OR item->>'image_url' IS NULL; 