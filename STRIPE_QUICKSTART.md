# Stripe Integration - Quick Start

## ✅ What's Been Implemented

A complete Stripe subscription system for RANI with:
- **$15/month subscriptions**
- **7-day free trials** for new users
- **Automatic license validation** (app won't run without subscription)
- **Stripe-hosted checkout** and billing portal
- **Real-time webhook updates** via Firebase Cloud Functions

---

## 🚀 Quick Setup (5 minutes)

### 1. Create Stripe Product

1. Go to https://dashboard.stripe.com/test/products
2. Click "+ Add product"
3. Set:
   - Name: `RANI Subscription`
   - Price: `$15.00 USD` monthly
4. Copy the **Price ID** (starts with `price_`)

### 2. Get API Keys

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy:
   - **Publishable key** (`pk_test_...`)
   - **Secret key** (`sk_test_...`) - click "Reveal"

### 3. Configure Webhook

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "+ Add endpoint"
3. URL: `https://us-west1-pickle-3651a.cloudfunctions.net/stripeWebhook`
4. Events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy **Signing secret** (`whsec_...`)

### 4. Update Environment

Add to `.env.beta`:

```bash
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
STRIPE_PRICE_ID=price_YOUR_PRICE_ID_HERE
TRIAL_PERIOD_DAYS=7
```

### 5. Deploy Firebase Function

```bash
cd functions
npm install
firebase deploy --only functions:stripeWebhook
```

### 6. Test

```bash
npm install
npm start
```

Test with card: `4242 4242 4242 4242`

---

## 📋 Next Steps

1. **Review Documentation**:
   - `STRIPE_SETUP.md` - Detailed setup guide
   - `STRIPE_IMPLEMENTATION.md` - Technical details

2. **Test Flow**:
   - New user signup → 7-day trial
   - Trial expiration → paywall
   - Subscribe → Stripe checkout
   - Payment → webhook → access granted

3. **Go Live**:
   - Switch to live Stripe keys
   - Update webhook URL
   - Test with real card
   - Monitor dashboard

---

## 🔧 Key Files Changed

```
Modified:
├── package.json (added stripe dependency)
├── .env.beta (added Stripe config)
├── src/
│   ├── index.js (initialize Stripe, check subscription on launch)
│   ├── bridge/featureBridge.js (IPC handlers)
│   ├── features/
│   │   ├── settings/
│   │   │   ├── stripeService.js (NEW - Stripe SDK wrapper)
│   │   │   └── subscriptionGuard.js (NEW - License enforcement)
│   │   └── common/
│   │       ├── config/schema.js (added subscription fields)
│   │       ├── migrations/add_subscription_fields.js (NEW)
│   │       └── repositories/user/firebase.repository.js (trial logic)
├── pickleglass_web/
│   ├── package.json (added @stripe/stripe-js)
│   └── backend_node/
│       ├── index.js (registered subscription routes)
│       └── routes/subscription.js (NEW - API endpoints)
└── functions/
    ├── package.json (added stripe)
    └── index.js (webhook handler)

New Documentation:
├── STRIPE_SETUP.md (step-by-step setup)
├── STRIPE_IMPLEMENTATION.md (technical details)
└── STRIPE_QUICKSTART.md (this file)
```

---

## 💡 How It Works

```
User Signs Up
    ↓
7-Day Trial Starts (automatic)
    ↓
App Launch → Check Subscription
    ↓
┌──────────┬──────────┐
│  Trial   │  Trial   │
│  Active  │  Expired │
└────┬─────┴────┬─────┘
     │          │
  Access     Paywall
  Granted     Shows
     │          │
     │     ┌────┴────┐
     │     │Subscribe│
     │     │or Quit  │
     │     └────┬────┘
     │          │
     │     Stripe Checkout
     │          │
     │     Payment Success
     │          │
     │     Webhook → Firestore
     │          │
     └──────────┴─────────
              │
         Access Granted
```

---

## 🧪 Testing

### Test Cards
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- Expiry: any future date
- CVC: any 3 digits

### Simulate Trial Expiry
```javascript
// In your database
UPDATE users 
SET trial_end_date = 0 
WHERE uid = 'test_user';
```

Restart app → should see paywall

---

## ❓ FAQ

**Q: What happens if Stripe is not configured?**  
A: App runs in development mode - no subscription required.

**Q: Can users bypass the paywall?**  
A: No. The app validates subscription on launch and checks with Stripe's servers.

**Q: What if a payment fails?**  
A: Webhook updates subscription status to `past_due`. User sees paywall on next launch.

**Q: How do users cancel?**  
A: Via Stripe Customer Portal (accessible in Settings → Billing).

**Q: What happens after cancellation?**  
A: User retains access until end of current billing period.

---

## 🆘 Troubleshooting

**Webhook not working?**
```bash
# Check Firebase logs
firebase functions:log --only stripeWebhook

# Test locally
stripe listen --forward-to localhost:5001/.../stripeWebhook
stripe trigger customer.subscription.created
```

**Subscription not updating?**
- Verify `uid` is in Stripe subscription metadata
- Check Firestore security rules allow updates
- Manually trigger webhook in Stripe Dashboard

**Paywall shows incorrectly?**
- Refresh subscription status: `subscription:refresh-status` IPC
- Check Firestore: `subscription_status` should be `active`
- Verify dates are in the future

---

## 📞 Support

- **Setup Issues**: See `STRIPE_SETUP.md`
- **Technical Details**: See `STRIPE_IMPLEMENTATION.md`
- **Stripe Docs**: https://stripe.com/docs/billing
- **GitHub Issues**: https://github.com/jasjeevsingh/rani/issues

---

**Status**: ✅ Core implementation complete  
**Ready for**: Testing with Stripe test mode  
**Before production**: Switch to live keys, verify webhooks

🎉 **You're ready to start charging for subscriptions!**
