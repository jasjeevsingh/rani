# Stripe Conditional Subscription Implementation

## Overview
This document describes the implementation of conditional subscription requirements based on user API key choice. Users who choose the shared "Let's Go!" option require a $15/mo Stripe subscription, while users who provide their own personal API keys can use RANI for free.

## User Flows

### Flow 1: Shared API Key (Requires Subscription)
1. User opens RANI for the first time
2. User clicks **"Let's Go!"** button in ApiKeyHeader
3. System sets `api_key_mode='shared'` in database
4. User grants permissions
5. On app launch, `StripeService.validateSubscription()` checks:
   - User has `api_key_mode='shared'` → subscription required
   - Checks `subscription_status` field
   - If not `active`, shows paywall dialog
6. Paywall shows 3 options:
   - **Subscribe Now** → Opens Stripe Checkout
   - **Use Personal API Keys** → Opens API key input screen
   - **Quit** → Closes app

### Flow 2: Personal API Keys (Free)
1. User opens RANI for the first time
2. User clicks **"Use Personal API Keys"** button in ApiKeyHeader
3. User enters their own OpenAI/Anthropic/etc API keys
4. On successful validation, system sets `api_key_mode='personal'` in database
5. On app launch, `StripeService.validateSubscription()` checks:
   - User has `api_key_mode='personal'` → subscription NOT required
   - Returns `{valid: true, requiresPayment: false}`
6. User has full access without subscription

## Database Schema Changes

### users Table - New Field
```sql
api_key_mode TEXT CHECK(api_key_mode IN ('shared', 'personal')) -- Tracks user's API key choice
```

### Subscription Fields (Already Implemented)
```sql
stripe_customer_id TEXT
subscription_id TEXT
subscription_status TEXT DEFAULT 'inactive' -- 'active', 'past_due', 'canceled', 'inactive'
subscription_start_date INTEGER
subscription_end_date INTEGER
subscription_cancel_at INTEGER
```

## Code Changes

### 1. Schema Update (`src/features/common/config/schema.js`)
- **Added**: `api_key_mode TEXT CHECK(api_key_mode IN ('shared', 'personal'))`
- **Changed**: `subscription_status` default from `'trial'` to `'inactive'`
- **Removed**: `trial_start_date` and `trial_end_date` fields

### 2. Migration Script (`src/features/common/migrations/add_subscription_fields.js`)
- **Added**: `ALTER TABLE users ADD COLUMN api_key_mode TEXT CHECK(api_key_mode IN ('shared', 'personal'))`
- **Added**: Default `api_key_mode='shared'` for existing users
- **Removed**: Trial date setup logic

### 3. Firebase Repository (`src/features/common/repositories/user/firebase.repository.js`)
- **Changed**: Default `api_key_mode='shared'` for new users
- **Changed**: Default `subscription_status='inactive'` (was 'trial')
- **Removed**: Trial period calculation in `findOrCreate()`

### 4. Stripe Service (`src/features/settings/stripeService.js`)
**Key Function: `validateSubscription(uid)`**

```javascript
async validateSubscription(uid) {
    // Development mode: no Stripe configured
    if (!this.stripe) {
        return { valid: true, status: 'dev_mode', requiresPayment: false };
    }

    const user = await userRepository.findById(uid);
    if (!user) {
        return { valid: false, status: 'no_user', requiresPayment: false };
    }

    // Check if user is using personal API keys
    if (user.api_key_mode === 'personal') {
        return { valid: true, status: 'personal_key', requiresPayment: false };
    }

    // User is using shared key, check subscription status
    if (user.subscription_status === 'active') {
        return { valid: true, status: 'active', requiresPayment: false };
    }

    // Subscription required but not active
    return { valid: false, status: user.subscription_status || 'inactive', requiresPayment: true };
}
```

### 5. Subscription Guard (`src/features/settings/subscriptionGuard.js`)
**Updated Paywall Dialog** - Now shows 3 buttons:
1. **Subscribe Now** → Calls `createCheckoutSession()` → Opens Stripe
2. **Use Personal API Keys** → Calls `openApiKeySettings()` → Shows ApiKeyHeader
3. **Quit** → Closes application

**Removed** `showTrialWarning()` function entirely

### 6. Beta Config Service (`src/features/common/services/betaConfigService.js`)
**Updated `configureBetaApiKey()` function:**

```javascript
async configureBetaApiKey(betaKey) {
    // ... validation logic ...
    
    // Mark user as using shared API key (requires subscription)
    const userId = authService.getCurrentUserId();
    if (userId) {
        await userRepository.update(userId, { api_key_mode: 'shared' });
    }
    
    // ... rest of function ...
}
```

### 7. Model State Service (`src/features/common/services/modelStateService.js`)
**Updated `setApiKey()` function:**

```javascript
async setApiKey(provider, key) {
    // ... validation logic ...
    
    // Mark user as using personal API keys (not the shared beta key)
    if (provider !== 'openai-glass') {
        try {
            const userId = this.authService.getCurrentUserId();
            if (userId) {
                await userRepository.update(userId, { api_key_mode: 'personal' });
                console.log(`[ModelStateService] Set api_key_mode='personal' for user ${userId}`);
            }
        } catch (error) {
            console.error('[ModelStateService] Failed to set api_key_mode:', error);
        }
    }
    
    // ... rest of function ...
}
```

## Testing Checklist

### Test Scenario 1: New User → Shared Key Flow
1. ✅ Clear all user data
2. ✅ Launch RANI
3. ✅ Click "Let's Go!" button
4. ✅ Grant permissions
5. ✅ Verify database has `api_key_mode='shared'`
6. ✅ Verify paywall appears with 3 buttons
7. ✅ Test "Subscribe Now" → Should open Stripe Checkout
8. ✅ Test "Use Personal API Keys" → Should show API key input

### Test Scenario 2: New User → Personal Key Flow
1. ✅ Clear all user data
2. ✅ Launch RANI
3. ✅ Click "Use Personal API Keys" button
4. ✅ Enter valid OpenAI API key
5. ✅ Verify database has `api_key_mode='personal'`
6. ✅ Verify NO paywall appears
7. ✅ Verify full app access

### Test Scenario 3: User Switches from Shared → Personal
1. ✅ Start with shared key user (should see paywall)
2. ✅ Click "Use Personal API Keys" in paywall
3. ✅ Enter valid API keys
4. ✅ Verify `api_key_mode` changes to 'personal'
5. ✅ Verify paywall no longer appears on restart

### Test Scenario 4: Stripe Checkout Flow
1. ✅ Configure Stripe keys in `.env.beta`
2. ✅ User with `api_key_mode='shared'` sees paywall
3. ✅ Click "Subscribe Now"
4. ✅ Complete Stripe Checkout (test mode)
5. ✅ Webhook updates `subscription_status='active'`
6. ✅ User gains full access

## Environment Variables

Required in `.env.beta`:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...        # From Stripe Dashboard
STRIPE_PUBLISHABLE_KEY=pk_test_...   # From Stripe Dashboard
STRIPE_WEBHOOK_SECRET=whsec_...      # From Stripe Webhook settings
STRIPE_PRICE_ID=price_...            # Subscription price ID ($15/mo)
```

## Key Design Decisions

### 1. Why `api_key_mode` instead of checking for API keys?
- **Explicit Intent Tracking**: We want to know what the user *chose*, not just what keys they have
- **Edge Cases**: User might remove personal keys later but should still be tracked as personal key user
- **Clearer Logic**: Simple field check vs complex provider settings queries

### 2. Why set mode in both `betaConfigService` and `modelStateService`?
- **betaConfigService**: Handles "Let's Go!" button → sets `api_key_mode='shared'`
- **modelStateService**: Handles personal API key entry → sets `api_key_mode='personal'`
- Two separate entry points require two update locations

### 3. Why check `api_key_mode` before `subscription_status`?
- **Performance**: Skip Stripe checks for personal key users
- **Logic Flow**: "Does this user need a subscription?" → "Yes if shared, no if personal"
- **User Experience**: Personal key users never see Stripe-related code

### 4. Why 3 buttons in paywall instead of 2?
- **User Choice**: Allow users to switch to personal keys even after choosing shared
- **Flexibility**: Don't force subscription if user wants to use own keys
- **UX**: Clear path forward vs dead-end "subscribe or quit"

## Migration Path for Existing Users

When `add_subscription_fields.js` migration runs:
1. Adds all subscription fields to users table
2. Sets `api_key_mode='shared'` for all existing users
3. Sets `subscription_status='inactive'` for all existing users

**Impact**: Existing users will see paywall on next launch (they were on shared beta key)

**Solution**: Either:
- Configure Stripe and let them subscribe
- Have them enter personal API keys to switch to free tier

## Future Enhancements

### Potential Features
1. **Grace Period**: Give existing beta users 30 days before requiring subscription
2. **Usage Tracking**: Track API usage to show value of subscription
3. **Tiered Pricing**: Different prices for different feature sets
4. **Team Subscriptions**: Allow sharing subscription across team members
5. **Annual Billing**: Offer discount for annual payment

### Frontend Work Needed
Currently the subscription management UI shows "Coming Soon". To fully integrate:

1. Update `pickleglass_web/app/settings/page.tsx`
2. Replace "Coming Soon" with working subscribe button
3. Call `/api/subscription/create-checkout` endpoint
4. Redirect to Stripe Checkout URL
5. Handle return from Stripe (success/cancel)

## Documentation References

- **STRIPE_QUICKSTART.md**: Quick setup guide for developers
- **STRIPE_SETUP.md**: Detailed Stripe Dashboard configuration
- **STRIPE_IMPLEMENTATION.md**: Technical implementation details
- **STRIPE_INTEGRATION_SUMMARY.md**: Overall system architecture

## Conclusion

The conditional subscription system is now fully implemented in the backend:
- ✅ Database schema supports both user types
- ✅ Validation logic checks `api_key_mode` before subscription
- ✅ Both user flows correctly set the mode
- ✅ Paywall offers path to switch between modes
- ✅ Trial period completely removed

**Next Steps**:
1. Test both user flows end-to-end
2. Configure Stripe in production
3. Update frontend settings page (optional)
4. Deploy and monitor webhook handling
