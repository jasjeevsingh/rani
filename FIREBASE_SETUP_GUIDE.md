# Firebase Setup Guide for RANI

This guide will help you set up a new Firebase project for RANI under your own account.

## ✅ What Was Refactored

All references to the old project naming have been updated:

### Changed Project IDs
- **Old**: `pickle-3651a`
- **New**: `rani-app`

### Changed Function Names
- **Old**: `pickleGlassAuthCallback`
- **New**: `raniAuthCallback`

### Changed Environment Variables
- **Old**: `pickleglass_API_URL`, `pickleglass_WEB_URL`, etc.
- **New**: `RANI_API_URL`, `RANI_WEB_URL`, etc.

### Changed Global Objects
- **Old**: `window.pickleGlass`
- **New**: `window.rani`

### Changed Config Directory
- **Old**: `~/.pickleglass`
- **New**: `~/.rani`

---

## 🚀 Step-by-Step Firebase Setup

### 1. Create a New Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. **Project name**: `RANI` or `RANI App`
4. **Project ID**: Use `rani-app` (recommended) or let Firebase generate one
   - ⚠️ If you use a different ID, update `.firebaserc` with your actual project ID
5. **Google Analytics**: Optional (you can enable it later)
6. Click **"Create project"**

### 2. Get Your Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Under **Your apps**, click **Web** (</> icon)
3. **App nickname**: `RANI Web`
4. **Enable Firebase Hosting**: ✅ Yes
5. Click **"Register app"**
6. Copy the `firebaseConfig` object

### 3. Update Firebase Client Configuration

Open `src/features/common/services/firebaseClient.js` and replace the config with your values:

```javascript
const firebaseConfig = {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT_ID.firebasestorage.app',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    appId: 'YOUR_APP_ID',
    measurementId: 'YOUR_MEASUREMENT_ID' // Optional
};
```

**Current placeholder values** (update these):
```javascript
authDomain: 'rani-app.firebaseapp.com',
projectId: 'rani-app',
storageBucket: 'rani-app.firebasestorage.app',
```

### 4. Enable Firebase Services

#### a. Enable Authentication
1. Go to **Authentication** → **Get started**
2. Enable **Google Sign-in**:
   - Click **Google** provider
   - Toggle **Enable**
   - Add your email as a test user
   - Save

#### b. Enable Firestore Database
1. Go to **Firestore Database** → **Create database**
2. Choose **Production mode** (rules are already in `firestore.rules`)
3. Select your preferred location (e.g., `us-central1`)
4. Click **Enable**

#### c. Enable Cloud Functions
1. Go to **Functions** → **Get started**
2. Follow the upgrade prompt if needed (Blaze plan required for outbound requests)
3. Note: You'll deploy functions in step 7

#### d. Enable Hosting (Optional)
1. Go to **Hosting** → **Get started**
2. Follow the setup wizard (already configured in `firebase.json`)

### 5. Update Firebase Project ID

If you used a different project ID than `rani-app`, update `.firebaserc`:

```json
{
  "projects": {
    "default": "YOUR_ACTUAL_PROJECT_ID"
  }
}
```

### 6. Install Firebase CLI and Login

```bash
# Install Firebase CLI globally (if not already installed)
npm install -g firebase-tools

# Login to your Firebase account
firebase login

# Verify you're logged in
firebase projects:list
```

You should see your new RANI project listed.

### 7. Deploy Firebase Functions

```bash
# Navigate to functions directory
cd functions

# Install dependencies
npm install

# Go back to project root
cd ..

# Deploy functions
firebase deploy --only functions

# Expected output:
# ✔  Deploy complete!
# Function URL (raniAuthCallback): https://us-west1-YOUR_PROJECT_ID.cloudfunctions.net/raniAuthCallback
# Function URL (stripeWebhook): https://us-west1-YOUR_PROJECT_ID.cloudfunctions.net/stripeWebhook
```

**⚠️ Copy the function URLs** - you'll need them!

### 8. Update Function URLs in Code

#### a. Update Auth Callback URL

Open `src/index.js` and update line 559:

```javascript
const functionUrl = 'https://us-west1-YOUR_PROJECT_ID.cloudfunctions.net/raniAuthCallback';
```

Replace `YOUR_PROJECT_ID` with your actual Firebase project ID.

#### b. Update Stripe Webhook URL

When you set up Stripe webhooks (see STRIPE_SETUP.md), use:

```
https://us-west1-YOUR_PROJECT_ID.cloudfunctions.net/stripeWebhook
```

### 9. Deploy Firestore Security Rules

```bash
firebase deploy --only firestore:rules
```

This deploys the rules from `firestore.rules`.

### 10. Deploy Firestore Indexes (if needed)

```bash
firebase deploy --only firestore:indexes
```

This deploys the indexes from `firestore.indexes.json`.

### 11. Set Environment Variables for Functions

Your Cloud Functions need environment variables for Stripe:

```bash
# Set Stripe environment variables
firebase functions:config:set \
  stripe.secret_key="sk_test_YOUR_STRIPE_SECRET_KEY" \
  stripe.publishable_key="pk_test_YOUR_STRIPE_PUBLISHABLE_KEY" \
  stripe.webhook_secret="whsec_YOUR_WEBHOOK_SECRET" \
  stripe.price_id="price_YOUR_PRICE_ID"

# Redeploy functions to use new config
firebase deploy --only functions
```

**Note**: For newer Firebase SDK, you can also use `.env` files with `functions/.env`:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 12. Test Your Setup

#### a. Test Firebase Connection

```bash
# Run the app locally
npm start

# Try signing in with Google
# Check console for Firebase connection logs
```

#### b. Test Cloud Functions

```bash
# Test auth callback
curl -X POST \
  https://us-west1-YOUR_PROJECT_ID.cloudfunctions.net/raniAuthCallback \
  -H "Content-Type: application/json" \
  -d '{"token":"test"}'

# Expected: Error (invalid token) but function is reachable
```

#### c. Test Firestore

1. Sign in to the app
2. Check Firebase Console → Firestore
3. You should see a `users` collection with your user document

---

## 🔐 Update Your .env Files

If you have any `.env` or `.env.beta` files, update the environment variables:

```bash
# Old naming
# pickleglass_API_URL=...
# pickleglass_WEB_URL=...

# New naming
RANI_API_URL=http://localhost:9001
RANI_WEB_URL=http://localhost:3000

# Firebase Config (from Firebase Console)
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=rani-app.firebaseapp.com
FIREBASE_PROJECT_ID=rani-app

# Stripe Config
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
```

---

## 📋 Checklist

- [ ] Created new Firebase project with ID `rani-app` (or custom ID)
- [ ] Updated `.firebaserc` with project ID
- [ ] Got Firebase config and updated `firebaseClient.js`
- [ ] Enabled Authentication (Google Sign-in)
- [ ] Enabled Firestore Database
- [ ] Installed Firebase CLI and logged in
- [ ] Deployed Cloud Functions
- [ ] Updated auth callback URL in `src/index.js`
- [ ] Deployed Firestore rules and indexes
- [ ] Set Stripe environment variables for functions
- [ ] Updated `.env` files with new naming
- [ ] Tested Firebase connection locally
- [ ] Verified Firestore collections are created

---

## 🐛 Troubleshooting

### "Project not found" error
- Check `.firebaserc` has the correct project ID
- Run `firebase use YOUR_PROJECT_ID` to switch projects

### "Permission denied" on Firestore
- Deploy security rules: `firebase deploy --only firestore:rules`
- Check `firestore.rules` matches your requirements

### Cloud Functions not deploying
- Ensure you're on Firebase Blaze plan (required for outbound requests)
- Check `functions/package.json` dependencies are installed
- Run `firebase deploy --only functions --debug` for detailed logs

### Auth callback not working
- Verify the function URL in `src/index.js` matches your deployed function
- Check Firebase Console → Functions for error logs
- Ensure CORS is configured (already set in `functions/index.js`)

### Stripe webhooks failing
- Verify webhook URL in Stripe Dashboard matches deployed function
- Check environment variables are set: `firebase functions:config:get`
- View function logs: `firebase functions:log`

---

## 🎉 Next Steps

1. **Set up Stripe** - Follow `STRIPE_SETUP.md` to configure Stripe payment
2. **Test locally** - Run `npm start` and test all features
3. **Build for production** - Run `npm run build` to create distributable
4. **Deploy to Firebase Hosting** (optional) - `firebase deploy --only hosting`

---

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Cloud Functions for Firebase](https://firebase.google.com/docs/functions)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
