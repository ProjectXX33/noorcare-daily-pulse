# Tamara Configuration Example

Based on your Tamara dashboard configuration, here are the exact environment variables you need:

## Environment Variables for Tamara

Add these to your `.env` file:

```env
# Tamara Payment Gateway Configuration
VITE_TAMARA_API_URL=https://api.tamara.co
VITE_TAMARA_MERCHANT_TOKEN=ey0eXAi0uKV1QiLCJhbGci0iJSUzI1NiJ9.eyJhY2NvdW50X2lkIjoiNjA5NmMwOC0c...
VITE_TAMARA_NOTIFICATION_KEY=94b21446-9eca-4fc5-bff8-9107a0837206
VITE_TAMARA_PUBLIC_KEY=4c6fb3f4-965c-4e87-ad64-adc3aec53112
```

## From Your Tamara Dashboard

Based on your screenshot:

1. **Working Mode**: Live Mode ✅
2. **Live API URL**: `https://api.tamara.co` ✅
3. **Live API Token (Merchant Token)**: `ey0eXAi0uKV1QiLCJhbGci0iJSUzI1NiJ9.eyJhY2NvdW50X2lkIjoiNjA5NmMwOC0c...` (your full token)
4. **Live Notification Key**: `94b21446-9eca-4fc5-bff8-9107a0837206`
5. **Live Public Key**: `4c6fb3f4-965c-4e87-ad64-adc3aec53112`

## Complete .env File Example

```env
# Supabase Configuration (existing)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# WooCommerce Configuration (existing)
VITE_WOOCOMMERCE_URL=https://nooralqmar.com/
VITE_WOOCOMMERCE_CONSUMER_KEY=ck_dc373790e65a510998fbc7278cb12b987d90b04a
VITE_WOOCOMMERCE_CONSUMER_SECRET=cs_815de347330e130a58e3e53e0f87b0cd4f0de90f

# Payment Gateway Configuration
# Tabby
VITE_TABBY_API_KEY=pk_0698b694-6843-4b4b-b70f-dd68f76cf0a4
VITE_TABBY_MERCHANT_CODE=SA

# Tamara (your live credentials)
VITE_TAMARA_API_URL=https://api.tamara.co
VITE_TAMARA_MERCHANT_TOKEN=ey0eXAi0uKV1QiLCJhbGci0iJSUzI1NiJ9.eyJhY2NvdW50X2lkIjoiNjA5NmMwOC0c1LC2kdcl6WY1STdxFX0j1FUkNIQU5IlI0simIn4Cl6MTq4MDA5MDUxNzswYWFNZSJ9NCOzk4nN2g9YZGFi9aHrGOnVYY1_7KtfoudVpm28PJ5INAlNAeQz+q21AtkX9eCHuT7GnGv80VaOrQHxXgt-xNnXPsJA0rPsGKsO9TjJnfXJimIqQ0TbqJfXPGLyKYpTdnU3MrQb+oWs0xnO'Y2sqjcyOZirtqJKiGXfYnXkMjdpwbIGwvw6tGWTh4rq9YZGFi94hDg
VITE_TAMARA_NOTIFICATION_KEY=94b21446-9eca-4fc5-bff8-9107a0837206
VITE_TAMARA_PUBLIC_KEY=4c6fb3f4-965c-4e87-ad64-adc3aec53112
```

## Important Notes

1. **Full Merchant Token**: Make sure you copy the complete merchant token from your Tamara dashboard (it's very long!)
2. **Live Mode**: Your Tamara is set to Live Mode, so these are production credentials
3. **Security**: Keep these credentials secure and never commit them to version control

## Testing

Once you add these environment variables:

1. Restart your development server
2. Create a test order
3. Generate a payment link
4. Select "Tamara" as payment method
5. You should be redirected to Tamara's live checkout

The Tamara payment method will now work with your live Tamara merchant account! 