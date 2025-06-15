<?php
/**
 * WooCommerce Polylang Integration - Simplified Version
 * Add this to your WordPress theme's functions.php file
 */

/**
 * Auto-detect and set product language based on content
 */
add_action('woocommerce_new_product', 'auto_set_product_language_on_create');
add_action('woocommerce_update_product', 'auto_set_product_language_on_update');

function auto_set_product_language_on_create($product_id) {
    auto_set_product_language($product_id);
}

function auto_set_product_language_on_update($product_id) {
    auto_set_product_language($product_id);
}

function auto_set_product_language($product_id) {
    $product = wc_get_product($product_id);
    if (!$product) return;

    $sku = $product->get_sku();
    $name = $product->get_name();
    $description = $product->get_description();
    
    $language = 'en'; // Default to English
    
    // Method 1: Check SKU suffix
    if ($sku && substr($sku, -3) === '-ar') {
        $language = 'ar';
    } elseif ($sku && substr($sku, -3) === '-en') {
        $language = 'en';
    } else {
        // Method 2: Check for Arabic characters in name or description
        $text_to_check = $name . ' ' . $description;
        if (preg_match('/[\x{0600}-\x{06FF}]/u', $text_to_check)) {
            $language = 'ar';
        }
    }
    
    // Set language in Polylang if available
    if (function_exists('pll_set_post_language')) {
        pll_set_post_language($product_id, $language);
    }
    
    // Always store in meta as backup
    update_post_meta($product_id, '_product_language', $language);
}

/**
 * Add language info to WooCommerce REST API response
 */
add_filter('woocommerce_rest_prepare_product_object', 'add_language_to_product_api', 10, 3);

function add_language_to_product_api($response, $object, $request) {
    $product_id = $object->get_id();
    
    // Get language from Polylang or meta
    $language = 'en';
    if (function_exists('pll_get_post_language')) {
        $pll_language = pll_get_post_language($product_id);
        if ($pll_language) {
            $language = $pll_language;
        }
    }
    
    // Fallback to meta
    if (!$language || $language === 'en') {
        $meta_language = get_post_meta($product_id, '_product_language', true);
        if ($meta_language) {
            $language = $meta_language;
        }
    }

    // Add translation links
    $translations = array();
    if (function_exists('pll_get_post_translations')) {
        $translations = pll_get_post_translations($product_id);
    } else {
        // Fallback to meta
        $english_id = get_post_meta($product_id, '_english_translation_id', true);
        $arabic_id = get_post_meta($product_id, '_arabic_translation_id', true);
        if ($english_id) $translations['en'] = intval($english_id);
        if ($arabic_id) $translations['ar'] = intval($arabic_id);
    }

    $response->data['language'] = $language;
    $response->data['polylang_language'] = function_exists('pll_get_post_language') ? pll_get_post_language($product_id) : null;
    $response->data['translations'] = $translations;
    
    return $response;
}

/**
 * Enhanced CORS support for React app
 */
add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function($value) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce');
        header('Access-Control-Allow-Credentials: true');
        return $value;
    });
}, 15);

/**
 * Allow WooCommerce API access for our React app
 */
add_filter('woocommerce_rest_check_permissions', function($permission, $context, $object_id, $post_type) {
    // Allow WooCommerce API access for products
    if ($post_type === 'product' && in_array($context, ['read', 'edit', 'create', 'delete'])) {
        return true;
    }
    return $permission;
}, 10, 4); 