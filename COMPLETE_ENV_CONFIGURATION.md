# Complete .env Configuration

Copy this to your `.env` file and replace the placeholder values with your actual credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# WooCommerce Configuration
VITE_WOOCOMMERCE_URL=https://nooralqmar.com/
VITE_WOOCOMMERCE_CONSUMER_KEY=ck_dc373790e65a510998fbc7278cb12b987d90b04a
VITE_WOOCOMMERCE_CONSUMER_SECRET=cs_815de347330e130a58e3e53e0f87b0cd4f0de90f

# WordPress Credentials
VITE_WP_USERNAME=ProjectX
VITE_WP_PASSWORD=tTx0 3O6f MiCs EKsB nzJq cQBn

# Payment Gateway Configuration

# Tabby Payment Gateway (from your WooCommerce settings)
VITE_TABBY_API_KEY=pk_test_your-actual-tabby-public-key
VITE_TABBY_SECRET_KEY=sk_test_your-actual-tabby-secret-key
VITE_TABBY_MERCHANT_CODE=SA
VITE_TABBY_LANGUAGE=ar
VITE_TABBY_TIMEOUT=320

# Tamara Payment Gateway (from your dashboard)
VITE_TAMARA_API_URL=https://api.tamara.co
VITE_TAMARA_MERCHANT_TOKEN=ey0eXAi0uKV1QiLCJhbGci0iJSUzI1NiJ9.eyJhY2NvdW50X2lkIjoiNjA5NmMwOC0c1LC2kdcl6WY1STdxFX0j1FUkNIQU5IlI0simIn4Cl6MTq4MDA5MDUxNzswYWFNZSJ9NCOzk4nN2g9YZGFi9aHrGOnVYY1_7KtfoudVpm28PJ5INAlNAeQz+q21AtkX9eCHuT7GnGv80VaOrQHxXgt-xNnXPsJA0rPsGKsO9TjJnfXJimIqQ0TbqJfXPGLyKYpTdnU3MrQb+oWs0xnO'Y2sqjcyOZirtqJKiGXfYnXkMjdpwbIGwvw6tGWTh4rq9YZGFi94hDg
VITE_TAMARA_NOTIFICATION_KEY=94b21446-9eca-4fc5-bff8-9107a0837206
VITE_TAMARA_PUBLIC_KEY=4c6fb3f4-965c-4e87-ad64-adc3aec53112

# Other Payment Gateways (Optional)
# PayPal Configuration
VITE_PAYPAL_CLIENT_ID=your-paypal-client-id

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_your-stripe-publishable-key

# Application Settings
NODE_ENV=development
```

## What you need to do:

### For Tabby:
1. **Copy your actual Tabby keys** from your WooCommerce Tabby settings:
   - Replace `pk_test_your-actual-tabby-public-key` with your real public key
   - Replace `sk_test_your-actual-tabby-secret-key` with your real secret key

### For Tamara:
The Tamara configuration is already complete based on your dashboard screenshot.

## Your Actual Keys:

Based on your screenshots, you need to:

1. **Go to your WooCommerce admin** → Tabby settings
2. **Copy the Merchant Public Key** (starts with `pk_test_` or `pk_live_`)
3. **Copy the Merchant Secret Key** (starts with `sk_test_` or `sk_live_`)
4. **Replace the placeholder values** in the .env file

## Example with your format:
```env
# Tabby (replace with your actual keys from WooCommerce)
VITE_TABBY_API_KEY=pk_test_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_TABBY_SECRET_KEY=sk_test_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_TABBY_MERCHANT_CODE=SA
VITE_TABBY_LANGUAGE=ar
VITE_TABBY_TIMEOUT=320
```

Once you add these to your `.env` file and restart your development server, both Tabby and Tamara payments will work correctly! 