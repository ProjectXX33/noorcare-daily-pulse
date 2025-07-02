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

/**
 * Add custom "Shipped" order status to WooCommerce
 */

// Register the custom order status
function register_shipped_order_status() {
    register_post_status( 'wc-shipped', array(
        'label'                     => 'Shipped',
        'public'                    => true,
        'show_in_admin_status_list' => true,
        'show_in_admin_all_list'    => true,
        'exclude_from_search'       => false,
        'label_count'               => _n_noop( 'Shipped <span class="count">(%s)</span>', 'Shipped <span class="count">(%s)</span>' )
    ) );
}
add_action( 'init', 'register_shipped_order_status' );

// Add the custom status to WooCommerce order statuses
function add_shipped_to_order_statuses( $order_statuses ) {
    $new_order_statuses = array();

    // Add all existing statuses
    foreach ( $order_statuses as $key => $status ) {
        $new_order_statuses[ $key ] = $status;
        
        // Add shipped status after processing
        if ( 'wc-processing' === $key ) {
            $new_order_statuses['wc-shipped'] = 'Shipped';
        }
    }

    return $new_order_statuses;
}
add_filter( 'wc_order_statuses', 'add_shipped_to_order_statuses' );

// Add shipped status to bulk actions
function add_shipped_to_bulk_actions( $bulk_actions ) {
    $bulk_actions['mark_shipped'] = __( 'Mark as shipped', 'woocommerce' );
    return $bulk_actions;
}
add_filter( 'bulk_actions-edit-shop_order', 'add_shipped_to_bulk_actions' );

// Handle the bulk action
function handle_shipped_bulk_action( $redirect_to, $action, $post_ids ) {
    if ( $action !== 'mark_shipped' ) {
        return $redirect_to;
    }

    $changed = 0;
    foreach ( $post_ids as $post_id ) {
        $order = wc_get_order( $post_id );
        if ( $order ) {
            $order->update_status( 'shipped', __( 'Order status changed to shipped via bulk action.', 'woocommerce' ) );
            $changed++;
        }
    }

    $redirect_to = add_query_arg( array(
        'bulk_shipped' => $changed,
    ), $redirect_to );

    return $redirect_to;
}
add_filter( 'handle_bulk_actions-edit-shop_order', 'handle_shipped_bulk_action', 10, 3 );

// Show admin notice for bulk action
function shipped_bulk_action_admin_notice() {
    if ( ! empty( $_REQUEST['bulk_shipped'] ) ) {
        $count = intval( $_REQUEST['bulk_shipped'] );
        printf( '<div id="message" class="updated fade"><p>' .
            _n( 'Changed %s order to shipped.',
                'Changed %s orders to shipped.',
                $count,
                'woocommerce'
            ) . '</p></div>', $count );
    }
}
add_action( 'admin_notices', 'shipped_bulk_action_admin_notice' );

// Add shipped status to reports (optional)
function add_shipped_to_reports( $order_statuses ) {
    $order_statuses[] = 'shipped';
    return $order_statuses;
}
add_filter( 'woocommerce_reports_order_statuses', 'add_shipped_to_reports' );

// Set custom color for shipped status in admin
function shipped_status_color() {
    echo '<style>
        .order-status.status-shipped {
            background: #2ea2cc;
            color: white;
        }
        mark.shipped {
            background: #2ea2cc;
            color: white;
        }
        .widefat .column-order_status mark.shipped {
            background: #2ea2cc;
            color: white;
        }
    </style>';
}
add_action( 'admin_head', 'shipped_status_color' );

// Make shipped status available in order actions dropdown
function add_shipped_to_order_actions( $actions ) {
    global $theorder;
    
    // Only show if order is not already shipped
    if ( $theorder && $theorder->get_status() !== 'shipped' ) {
        $actions['shipped'] = __( 'Mark as shipped', 'woocommerce' );
    }
    
    return $actions;
}
add_filter( 'woocommerce_order_actions', 'add_shipped_to_order_actions' );

// Handle the order action
function handle_shipped_order_action( $order ) {
    $order->update_status( 'shipped', __( 'Order marked as shipped.', 'woocommerce' ) );
}
add_action( 'woocommerce_order_action_shipped', 'handle_shipped_order_action' );

// Add shipped status to order status transitions (for email triggers)
function add_shipped_status_transitions( $transitions ) {
    $transitions['shipped'] = array(
        'from' => array( 'pending', 'processing', 'on-hold' ),
        'to'   => 'shipped'
    );
    return $transitions;
}
add_filter( 'woocommerce_valid_order_statuses_for_payment', 'add_shipped_status_transitions' );

// Optional: Send email when order is shipped (you can customize this)
function trigger_shipped_email( $order_id, $old_status, $new_status ) {
    if ( $new_status === 'shipped' ) {
        // Get the order
        $order = wc_get_order( $order_id );
        
        if ( ! $order ) {
            return;
        }
        
        // You can customize the email content here
        $to = $order->get_billing_email();
        $subject = sprintf( __( 'Your order #%s has been shipped!', 'woocommerce' ), $order->get_order_number() );
        $message = sprintf( 
            __( 'Hi %s,

Your order #%s has been shipped and is on its way to you!

Order Details:
- Order Number: #%s
- Order Date: %s
- Total: %s

You can track your order status by visiting: %s

Thank you for your business!', 'woocommerce' ),
            $order->get_billing_first_name(),
            $order->get_order_number(),
            $order->get_order_number(),
            $order->get_date_created()->format( 'F j, Y' ),
            $order->get_formatted_order_total(),
            $order->get_view_order_url()
        );
        
        // Send the email
        wp_mail( $to, $subject, $message );
        
        // Add order note
        $order->add_order_note( __( 'Shipped notification email sent to customer.', 'woocommerce' ) );
    }
}
add_action( 'woocommerce_order_status_changed', 'trigger_shipped_email', 10, 3 );

// Make shipped orders show as "shipped" in customer account
function display_shipped_status_text( $status, $order ) {
    if ( $order->get_status() === 'shipped' ) {
        return __( 'Shipped', 'woocommerce' );
    }
    return $status;
}
add_filter( 'woocommerce_order_status_name', 'display_shipped_status_text', 10, 2 );

// Optional: Add tracking number meta field support
function add_tracking_number_meta_box() {
    add_meta_box(
        'tracking_number',
        __( 'Tracking Information', 'woocommerce' ),
        'tracking_number_meta_box_callback',
        'shop_order',
        'side',
        'default'
    );
}
add_action( 'add_meta_boxes', 'add_tracking_number_meta_box' );

function tracking_number_meta_box_callback( $post ) {
    $tracking_number = get_post_meta( $post->ID, '_tracking_number', true );
    $shipping_company = get_post_meta( $post->ID, '_shipping_company', true );
    
    wp_nonce_field( 'tracking_number_nonce', 'tracking_number_nonce' );
    
    echo '<p>';
    echo '<label for="shipping_company">' . __( 'Shipping Company:', 'woocommerce' ) . '</label><br>';
    echo '<select name="shipping_company" id="shipping_company" style="width: 100%;">';
    echo '<option value="">' . __( 'Select shipping company', 'woocommerce' ) . '</option>';
    echo '<option value="SMSA"' . selected( $shipping_company, 'SMSA', false ) . '>SMSA Express</option>';
    echo '<option value="DRB"' . selected( $shipping_company, 'DRB', false ) . '>DRB Logistics</option>';
    echo '<option value="ARAMEX"' . selected( $shipping_company, 'ARAMEX', false ) . '>Aramex</option>';
    echo '<option value="OTHER"' . selected( $shipping_company, 'OTHER', false ) . '>Other</option>';
    echo '</select>';
    echo '</p>';
    
    echo '<p>';
    echo '<label for="tracking_number">' . __( 'Tracking Number:', 'woocommerce' ) . '</label><br>';
    echo '<input type="text" name="tracking_number" id="tracking_number" value="' . esc_attr( $tracking_number ) . '" style="width: 100%;" />';
    echo '</p>';
}

function save_tracking_number_meta( $post_id ) {
    if ( ! isset( $_POST['tracking_number_nonce'] ) || ! wp_verify_nonce( $_POST['tracking_number_nonce'], 'tracking_number_nonce' ) ) {
        return;
    }

    if ( isset( $_POST['tracking_number'] ) ) {
        update_post_meta( $post_id, '_tracking_number', sanitize_text_field( $_POST['tracking_number'] ) );
    }
    
    if ( isset( $_POST['shipping_company'] ) ) {
        update_post_meta( $post_id, '_shipping_company', sanitize_text_field( $_POST['shipping_company'] ) );
    }
}
add_action( 'save_post', 'save_tracking_number_meta' );

// Display tracking info in customer emails and account page
function display_tracking_info_in_email( $order, $sent_to_admin, $plain_text, $email ) {
    if ( $order->get_status() === 'shipped' ) {
        $tracking_number = get_post_meta( $order->get_id(), '_tracking_number', true );
        $shipping_company = get_post_meta( $order->get_id(), '_shipping_company', true );
        
        if ( $tracking_number ) {
            echo '<h3>' . __( 'Tracking Information', 'woocommerce' ) . '</h3>';
            echo '<p><strong>' . __( 'Tracking Number:', 'woocommerce' ) . '</strong> ' . esc_html( $tracking_number ) . '</p>';
            if ( $shipping_company ) {
                echo '<p><strong>' . __( 'Shipping Company:', 'woocommerce' ) . '</strong> ' . esc_html( $shipping_company ) . '</p>';
            }
        }
    }
}
add_action( 'woocommerce_email_order_details', 'display_tracking_info_in_email', 20, 4 );

?> 