# Stripe Integration Setup Guide

This guide walks through setting up Stripe subscriptions for RANI ($15/month with 7-day free trial).

## Overview

The Stripe integration provides:
- ✅ 7-day free trial for new users
- ✅ $15/month subscription after trial
- ✅ Automatic license validation on app launch
- ✅ Paywall enforcement (app won't run without valid subscription)
- ✅ Stripe Customer Portal for managing billing
- ✅ Real-time webhook updates from Stripe to Firebase

## Architecture

```
User Signs Up
    ↓
Trial Period (7 days)
    ↓
Trial Expires → Paywall Dialog
    ↓
User Clicks "Subscribe" → Stripe Checkout
    ↓
Payment Successful → Webhook to Firebase
    ↓
Firestore Updated → App Validates → Access Granted
```

## Prerequisites

1. **Stripe Account**: Create account at [stripe.com](https://stripe.com)
2. **Firebase Project**: Already configured in RANI
3. **Node.js 18+**: For Firebase Functions

## Step 1: Stripe Dashboard Setup

### 1.1 Create Product

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Click **"+ Add product"**
3. Configure:
   - **Name**: `RANI Subscription`
   - **Description**: `Monthly subscription for RANI Research Assistant`
   - **Pricing model**: `Standard pricing`
   - **Price**: `$15.00 USD`
   - **Billing period**: `Monthly`
   - **Free trial**: `7 days` (optional - we handle this in code)
4. Click **"Save product"**
5. **Copy the Price ID** (starts with `price_xxx`) - you'll need this for `.env`

### 1.2 Get API Keys

1. Go to [Stripe Dashboard → Developers → API Keys](https://dashboard.stripe.com/test/apikeys)
2. **For testing** (recommended first):
   - Copy **Publishable key** (starts with `pk_test_xxx`)
   - Copy **Secret key** (starts with `sk_test_xxx`) - Click "Reveal test key"
3. **For production**:
   - Toggle to "Live mode"
   - Copy **Publishable key** (starts with `pk_live_xxx`)
   - Copy **Secret key** (starts with `sk_live_xxx`)

### 1.3 Configure Webhooks

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **"+ Add endpoint"**
3. Configure:
   - **Endpoint URL**: `https://us-west1-<your-project>.cloudfunctions.net/stripeWebhook`
     - Replace `<your-project>` with your Firebase project ID
     - Example: `https://us-west1-pickle-3651a.cloudfunctions.net/stripeWebhook`
   - **Description**: `RANI Subscription Webhooks`
   - **Events to send**:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
4. Click **"Add endpoint"**
5. **Copy the Signing secret** (starts with `whsec_xxx`) - you'll need this for `.env`

## Step 2: Environment Configuration

### 2.1 Update `.env.beta` (Main App)

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
STRIPE_PRICE_ID=price_YOUR_PRICE_ID_HERE

# Trial Configuration
TRIAL_PERIOD_DAYS=7
```

### 2.2 Update Firebase Functions Environment

```bash
# Navigate to functions directory
cd functions

# Set environment variables
firebase functions:config:set \
  stripe.secret_key="sk_test_YOUR_SECRET_KEY_HERE" \
  stripe.webhook_secret="whsec_YOUR_WEBHOOK_SECRET_HERE"
```

Or add to `functions/.env`:

```bash
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

### 2.3 Update Firestore Security Rules

Add to `firestore.rules`:

```javascript
match /users/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow write: if request.auth != null && request.auth.uid == userId;
  
  // Allow Cloud Functions to update subscription fields
  allow update: if request.auth.token.admin == true
                || (request.resource.data.diff(resource.data).affectedKeys()
                    .hasOnly(['subscription_status', 'subscription_id', 
                             'stripe_customer_id', 'subscription_start_date',
                             'subscription_end_date', 'subscription_cancel_at']));
}
```

## Step 3: Database Migration

The database schema has already been updated, but you need to run migrations for existing users.

### 3.1 SQLite Migration (Local Mode)

The migration runs automatically on app startup, but you can manually trigger it:

```javascript
// In src/features/common/services/databaseInitializer.js
const migration = require('../migrations/add_subscription_fields');
migration.runMigration(db);
```

### 3.2 Firestore Migration (Firebase Mode)

For existing users, their subscription status will be set to `trial` on first login with the updated code.

## Step 4: Install Dependencies

```bash
# Main app
npm install

# Web renderer
cd pickleglass_web
npm install

# Firebase Functions
cd ../functions
npm install
```

## Step 5: Deploy Firebase Functions

```bash
# From project root
cd functions

# Deploy webhook handler
firebase deploy --only functions:stripeWebhook

# Verify deployment
firebase functions:log --only stripeWebhook
```

## Step 6: Testing

### 6.1 Use Stripe Test Mode

Stripe provides test card numbers:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires authentication**: `4000 0025 0000 3155`
- Use any future expiration date
- Use any 3-digit CVC
- Use any ZIP code

### 6.2 Test Flow

1. **New User Trial**:
   ```bash
   npm start
   ```
   - Sign up with new email
   - Check database: `subscription_status` should be `trial`
   - Verify `trial_end_date` is 7 days from now

2. **Trial Expiry**:
   ```javascript
   // Manually set trial_end_date in past for testing
   UPDATE users SET trial_end_date = 0 WHERE uid = 'test_user';
   ```
   - Restart app
   - Should see "Trial Expired" paywall

3. **Subscribe**:
   - Click "Subscribe Now"
   - Complete Stripe Checkout with test card `4242 4242 4242 4242`
   - Should redirect back to app

4. **Webhook Processing**:
   - Check Firebase Functions logs:
     ```bash
     firebase functions:log --only stripeWebhook
     ```
   - Verify Firestore: `subscription_status` should be `active`

5. **App Access**:
   - Restart app
   - Should grant access without paywall
   - Verify features work (Ask, Listen, Research)

6. **Cancel Subscription**:
   - Open Stripe Customer Portal
   - Cancel subscription
   - Webhook should update status to `canceled`
   - App should continue working until `subscription_end_date`

### 6.3 Webhook Testing

Test webhooks locally with Stripe CLI:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local Firebase emulator
stripe listen --forward-to localhost:5001/pickle-3651a/us-west1/stripeWebhook

# Trigger test events
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_succeeded
```

## Step 7: Production Deployment

### 7.1 Switch to Live Mode

1. Update `.env.beta` with live keys:
   ```bash
   STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
   STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_LIVE_WEBHOOK_SECRET
   ```

2. Update Firebase Functions config:
   ```bash
   firebase functions:config:set \
     stripe.secret_key="sk_live_YOUR_LIVE_KEY" \
     stripe.webhook_secret="whsec_YOUR_LIVE_WEBHOOK_SECRET"
   ```

3. Update Stripe webhook endpoint to use production URL

4. Deploy:
   ```bash
   npm run build
   firebase deploy --only functions:stripeWebhook
   ```

### 7.2 Create Live Webhook

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks) (Live mode)
2. Click **"+ Add endpoint"**
3. Use production Firebase Functions URL
4. Add same events as test webhook
5. Copy new **Signing secret** and update `.env.beta`

## Troubleshooting

### Issue: Webhook not receiving events

**Solution**:
1. Check Firebase Functions logs: `firebase functions:log --only stripeWebhook`
2. Verify webhook URL is correct in Stripe Dashboard
3. Check webhook signing secret matches `.env`
4. Ensure Firebase Functions are deployed: `firebase deploy --only functions`

### Issue: Subscription status not updating

**Solution**:
1. Check webhook handler processed event (Firebase logs)
2. Verify `uid` is in subscription metadata
3. Check Firestore security rules allow updates
4. Manually trigger webhook in Stripe Dashboard → Webhooks → Test webhook

### Issue: Paywall shows even with active subscription

**Solution**:
1. Clear subscription cache: Restart app
2. Check user record in Firestore: `subscription_status` should be `active`
3. Verify `subscription_end_date` is in the future
4. Check Stripe subscription status: https://dashboard.stripe.com/subscriptions

### Issue: "Stripe not configured" error

**Solution**:
1. Verify `.env.beta` has all required variables
2. Check environment variables are loaded: `console.log(process.env.STRIPE_SECRET_KEY)`
3. Restart app after changing `.env`

## Security Best Practices

1. **Never commit** `.env.beta` or any file with API keys
2. **Use test mode** for development and testing
3. **Rotate keys** if accidentally exposed
4. **Monitor webhook logs** for suspicious activity
5. **Set up Stripe alerts** for failed payments
6. **Enable 2FA** on Stripe account

## Monitoring

### Stripe Dashboard

- **Payments**: https://dashboard.stripe.com/payments
- **Subscriptions**: https://dashboard.stripe.com/subscriptions
- **Customers**: https://dashboard.stripe.com/customers
- **Failed payments**: https://dashboard.stripe.com/payments?status%5B%5D=failed

### Firebase

- **Functions logs**: `firebase functions:log --only stripeWebhook`
- **Firestore console**: https://console.firebase.google.com/project/pickle-3651a/firestore

## Next Steps

1. **Set up email notifications** for failed payments
2. **Create dunning emails** for expiring trials
3. **Add analytics** to track conversion rates
4. **Implement referral program** for growth
5. **Add annual billing option** ($150/year, 2 months free)

## Support

- **Stripe Docs**: https://stripe.com/docs
- **Firebase Docs**: https://firebase.google.com/docs
- **RANI Issues**: https://github.com/jasjeevsingh/rani/issues
