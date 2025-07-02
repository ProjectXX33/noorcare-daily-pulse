# Payment Gateway Setup Guide

This guide explains how to configure payment gateways for the Noorcare Daily Pulse system.

## Overview

The system now supports multiple payment methods including:
- **Cash on Delivery (COD)** - Traditional cash payment on delivery
- **Tabby** - Split payments into 4 interest-free installments
- **Tamara** - Buy now, pay later in flexible installments
- **PayPal** - PayPal payment processing
- **Stripe** - Credit/debit card processing
- **Bank Transfer** - Direct bank transfer
- **Cheque** - Cheque payment method

## Environment Variables

Add these environment variables to your `.env` file:

```env
# Tabby Payment Gateway
VITE_TABBY_API_KEY=pk_your-tabby-api-key
VITE_TABBY_MERCHANT_CODE=SA

# Tamara Payment Gateway
VITE_TAMARA_API_URL=https://api.tamara.co
VITE_TAMARA_MERCHANT_TOKEN=your-tamara-merchant-token
VITE_TAMARA_NOTIFICATION_KEY=your-tamara-notification-key
VITE_TAMARA_PUBLIC_KEY=your-tamara-public-key

# PayPal Configuration
VITE_PAYPAL_CLIENT_ID=your-paypal-client-id

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_your-stripe-publishable-key
```

## Current Implementation Status

### ✅ Implemented Payment Methods

1. **Cash on Delivery (COD)**
   - No external integration required
   - Payment collected upon delivery
   - Status: Fully implemented

2. **Tabby**
   - Redirects to Tabby checkout page
   - URL format: `https://checkout.tabby.ai/otp?...`
   - Status: Basic URL generation implemented
   - **Note**: Currently uses test API key

3. **Tamara**
   - Redirects to Tamara checkout page
   - URL format: `https://checkout.tamara.co/login?...`
   - Status: Basic URL generation implemented
   - **Note**: Requires proper API integration

### 🚧 Needs Proper API Integration

The current implementation generates checkout URLs with parameters, but for production use, you should implement proper API integrations:

#### Tabby Integration
1. Sign up for Tabby merchant account
2. Get production API keys
3. Implement proper checkout session creation via Tabby API
4. Handle payment confirmation webhooks

#### Tamara Integration
1. Sign up for Tamara merchant account
2. Get production API keys
3. Implement proper checkout session creation via Tamara API
4. Handle payment confirmation callbacks

#### PayPal Integration
1. Create PayPal Developer account
2. Get production credentials
3. Integrate PayPal SDK for proper checkout session creation
4. Handle payment confirmation webhooks

#### Stripe Integration
1. Create Stripe account
2. Get production API keys
3. Implement Stripe Checkout or Payment Intents API
4. Handle payment confirmation webhooks

## How It Works

### Payment Flow

1. **Customer selects payment method** on the payment collection page
2. **System checks if method requires external redirect**
3. **For redirect methods** (Tabby, Tamara, PayPal, Stripe):
   - Creates checkout session with payment provider
   - Updates order status to "awaiting_payment"
   - Redirects customer to payment provider
4. **For non-redirect methods** (COD, Bank Transfer):
   - Updates order status locally
   - Shows confirmation message

### File Structure

```
src/lib/
├── paymentGatewayService.ts    # Main payment gateway service
├── paymentLinkGenerator.ts     # Payment link generation
└── woocommerceApi.ts          # WooCommerce integration

src/components/
└── PaymentCollectionPage.tsx   # Payment collection UI
```

## Configuration Steps

### 1. Get Payment Gateway Credentials

- **Tabby**: Contact Tabby for merchant account and API keys
- **Tamara**: Contact Tamara for merchant account and API keys  
- **PayPal**: Visit PayPal Developer Dashboard
- **Stripe**: Visit Stripe Dashboard

### 2. Update Environment Variables

Create `.env` file with your actual API keys:

```env
VITE_TABBY_API_KEY=pk_live_your_actual_tabby_key
VITE_TAMARA_API_URL=https://api.tamara.co
VITE_TAMARA_MERCHANT_TOKEN=your_actual_tamara_merchant_token
VITE_TAMARA_NOTIFICATION_KEY=your_actual_tamara_notification_key
VITE_TAMARA_PUBLIC_KEY=your_actual_tamara_public_key
VITE_PAYPAL_CLIENT_ID=your_actual_paypal_client_id
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_stripe_key
```

### 3. Test Payment Methods

1. Create a test order
2. Generate payment link
3. Test each payment method
4. Verify redirections work correctly

## Security Considerations

1. **Never expose secret keys** in frontend code
2. **Use HTTPS** for all payment redirections
3. **Implement proper webhook validation** for payment confirmations
4. **Store payment session data securely**
5. **Validate all payment callbacks** on your backend

## Troubleshooting

### Common Issues

1. **Payment method not showing**
   - Check if API keys are set in environment variables
   - Verify `PaymentGatewayService.isPaymentMethodConfigured()` returns true

2. **Redirect not working**
   - Check browser console for errors
   - Verify payment gateway URLs are accessible
   - Confirm API keys are valid

3. **Payment not confirmed**
   - Implement proper webhook handling
   - Check payment provider dashboard for transaction status
   - Verify callback URLs are configured correctly

## Next Steps for Production

1. **Implement proper API integrations** instead of URL parameter passing
2. **Set up webhook endpoints** for payment confirmations
3. **Add payment status polling** for better UX
4. **Implement retry mechanisms** for failed payments
5. **Add comprehensive logging** for payment flows
6. **Set up monitoring and alerts** for payment issues

## Support

For implementation support:
- Check payment provider documentation
- Contact payment provider support teams
- Review transaction logs in provider dashboards 