# Firebase Quick Setup - Action Items

## 🎯 What You Need to Do RIGHT NOW

### 1. Create Firebase Project (5 minutes)
```
1. Go to: https://console.firebase.google.com/
2. Click "Add project"
3. Name: "RANI"
4. Project ID: "rani-ai" (or note what you choose)
5. Click "Create project"
```

### 2. Get Your Firebase Config (2 minutes)
```
1. In Firebase Console → Project Settings (gear icon)
2. Scroll to "Your apps" → Click Web icon (</>)
3. App nickname: "RANI Web"
4. Enable Firebase Hosting: Yes
5. Copy the firebaseConfig object
```

You'll see something like:
```javascript
const firebaseConfig = {
    apiKey: "AIza...",
    authDomain: "rani-app.firebaseapp.com",
    projectId: "rani-app",
    storageBucket: "rani-app.firebasestorage.app",
    messagingSenderId: "123...",
    appId: "1:123...",
};
```

### 3. Update YOUR Code (3 minutes)

**File: `src/features/common/services/firebaseClient.js`**

Find this section and replace with YOUR values:
```javascript
const firebaseConfig = {
    apiKey: 'PASTE_YOUR_API_KEY_HERE',
    authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT_ID.firebasestorage.app',
    messagingSenderId: 'PASTE_YOUR_SENDER_ID_HERE',
    appId: 'PASTE_YOUR_APP_ID_HERE',
};
```

**File: `.firebaserc`** (if your project ID is NOT `rani-app`)
```json
{
  "projects": {
    "default": "YOUR_ACTUAL_PROJECT_ID"
  }
}
```

### 4. Enable Firebase Services (5 minutes)

**a. Authentication:**
```
Firebase Console → Authentication → Get started
→ Google provider → Enable → Save
```

**b. Firestore:**
```
Firebase Console → Firestore Database → Create database
→ Production mode → Choose location (us-central1) → Enable
```

**c. Functions (requires Blaze plan):**
```
Firebase Console → Functions → Upgrade to Blaze plan
(Free tier available, you only pay for usage)
```

### 5. Deploy to Firebase (5 minutes)

**Open terminal in your project directory:**

```bash
# Login to Firebase
firebase login

# Verify you're logged in
firebase projects:list

# Deploy functions
cd functions
npm install
cd ..
firebase deploy --only functions

# Copy the function URLs from output!
```

**Expected output:**
```
✔  Deploy complete!

Function URL (raniAuthCallback): https://us-west1-YOUR_ID.cloudfunctions.net/raniAuthCallback
Function URL (stripeWebhook): https://us-west1-YOUR_ID.cloudfunctions.net/stripeWebhook
```

### 6. Update Function URLs (2 minutes)

**File: `src/index.js`** (around line 559)

Change:
```javascript
const functionUrl = 'https://us-west1-rani-app.cloudfunctions.net/raniAuthCallback';
```

To YOUR deployed URL:
```javascript
const functionUrl = 'https://us-west1-YOUR_PROJECT_ID.cloudfunctions.net/raniAuthCallback';
```

### 7. Deploy Firestore Rules (1 minute)

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### 8. Set Up Stripe Environment Variables (3 minutes)

**Option A: Using Firebase CLI**
```bash
firebase functions:config:set \
  stripe.secret_key="sk_test_YOUR_KEY" \
  stripe.webhook_secret="whsec_YOUR_SECRET" \
  stripe.price_id="price_YOUR_PRICE_ID"

firebase deploy --only functions
```

**Option B: Using .env file in functions/**
Create `functions/.env`:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
```

Then redeploy:
```bash
firebase deploy --only functions
```

---

## ✅ Verification Steps

### Test 1: Firebase Connection
```bash
npm start
# Try signing in with Google
# Check console for "Firebase initialized" message
```

### Test 2: Firestore Working
```
1. Sign in to app
2. Open Firebase Console → Firestore
3. Should see "users" collection with your user
```

### Test 3: Functions Deployed
```bash
# List deployed functions
firebase functions:list

# Should show:
# - raniAuthCallback
# - stripeWebhook
```

---

## 🆘 Common Issues

**"Project not found"**
→ Check `.firebaserc` has correct project ID

**"Permission denied" in Firestore**
→ Run: `firebase deploy --only firestore:rules`

**Functions won't deploy**
→ Upgrade to Blaze plan in Firebase Console

**Stripe webhooks not working**
→ Check environment variables: `firebase functions:config:get`

---

## 📞 Need Help?

1. Check `FIREBASE_SETUP_GUIDE.md` for detailed explanations
2. Check Firebase Console → Functions → Logs for errors
3. Run commands with `--debug` flag for more info
