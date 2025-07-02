# How to Get Your Tabby API Keys

## Step-by-Step Guide:

### 1. Access Your WooCommerce Admin
- Go to your WordPress admin dashboard
- Navigate to **WooCommerce** → **Settings** → **Payments**
- Find **Tabby** in the payment methods list

### 2. Copy Your Tabby Keys
From your Tabby settings page (the one you showed in the screenshot):

1. **Merchant Public Key**: 
   - Look for the field that shows `pk_[test]_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   - Copy the entire key (it starts with `pk_test_` or `pk_live_`)

2. **Merchant Secret Key**:
   - Look for the field that shows `sk_[test]_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   - Copy the entire key (it starts with `sk_test_` or `sk_live_`)

### 3. Add to Your .env File

Replace these lines in your `.env` file:

```env
# Tabby Payment Gateway
VITE_TABBY_API_KEY=pk_test_your-actual-public-key-here
VITE_TABBY_SECRET_KEY=sk_test_your-actual-secret-key-here
VITE_TABBY_MERCHANT_CODE=SA
VITE_TABBY_LANGUAGE=ar
VITE_TABBY_TIMEOUT=320
```

### 4. Example of What They Look Like:

```env
# Example (use your actual keys)
VITE_TABBY_API_KEY=pk_test_12345678-1234-1234-1234-123456789012
VITE_TABBY_SECRET_KEY=sk_test_87654321-4321-4321-4321-210987654321
VITE_TABBY_MERCHANT_CODE=SA
VITE_TABBY_LANGUAGE=ar
VITE_TABBY_TIMEOUT=320
```

### 5. Complete .env File

Here's your complete `.env` file with both Tabby and Tamara:

```env
# Supabase Configuration (add your actual values)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# WooCommerce Configuration (you already have these)
VITE_WOOCOMMERCE_URL=https://nooralqmar.com/
VITE_WOOCOMMERCE_CONSUMER_KEY=ck_dc373790e65a510998fbc7278cb12b987d90b04a
VITE_WOOCOMMERCE_CONSUMER_SECRET=cs_815de347330e130a58e3e53e0f87b0cd4f0de90f

# WordPress Credentials
VITE_WP_USERNAME=ProjectX
VITE_WP_PASSWORD=tTx0 3O6f MiCs EKsB nzJq cQBn

# Tabby Payment Gateway (replace with your actual keys)
VITE_TABBY_API_KEY=pk_test_your-actual-public-key-here
VITE_TABBY_SECRET_KEY=sk_test_your-actual-secret-key-here
VITE_TABBY_MERCHANT_CODE=SA
VITE_TABBY_LANGUAGE=ar
VITE_TABBY_TIMEOUT=320

# Tamara Payment Gateway (already configured)
VITE_TAMARA_API_URL=https://api.tamara.co
VITE_TAMARA_MERCHANT_TOKEN=ey0eXAi0uKV1QiLCJhbGci0iJSUzI1NiJ9.eyJhY2NvdW50X2lkIjoiNjA5NmMwOC0c1LC2kdcl6WY1STdxFX0j1FUkNIQU5IlI0simIn4Cl6MTq4MDA5MDUxNzswYWFNZSJ9NCOzk4nN2g9YZGFi9aHrGOnVYY1_7KtfoudVpm28PJ5INAlNAeQz+q21AtkX9eCHuT7GnGv80VaOrQHxXgt-xNnXPsJA0rPsGKsO9TjJnfXJimIqQ0TbqJfXPGLyKYpTdnU3MrQb+oWs0xnO'Y2sqjcyOZirtqJKiGXfYnXkMjdpwbIGwvw6tGWTh4rq9YZGFi94hDg
VITE_TAMARA_NOTIFICATION_KEY=94b21446-9eca-4fc5-bff8-9107a0837206
VITE_TAMARA_PUBLIC_KEY=4c6fb3f4-965c-4e87-ad64-adc3aec53112

# Application Settings
NODE_ENV=development
```

### 6. After Adding the Keys:

1. **Save your .env file**
2. **Restart your development server** (stop and start again)
3. **Test the payment flow**:
   - Create an order
   - Generate payment link
   - Select Tabby or Tamara
   - You should be redirected to their checkout pages

### 7. Important Notes:

- **Test vs Live**: Your keys show `[test]` which means they're for testing
- **Keep Secret**: Never share your secret keys publicly
- **Both Required**: The system needs both public and secret keys to work

Once you add your actual Tabby keys, both Tabby and Tamara payments will work perfectly! 🎉 