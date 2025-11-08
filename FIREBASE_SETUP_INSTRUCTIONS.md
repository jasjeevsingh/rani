# Firebase Setup Instructions for RANI

## Issue: Account Access

Your current Google account (`jasjeev@sas.upenn.edu`) doesn't have access to the Firebase project `pickle-3651a`.

## Solutions

### Option 1: Login with the Correct Account (Recommended)

The `pickle-3651a` project was likely created with a different Google account. You need to:

1. **Logout from current account**:
   ```bash
   firebase logout
   ```

2. **Login with the account that owns the Firebase project**:
   ```bash
   firebase login
   ```
   
3. **When the browser opens, sign in with the correct Google account** (the one that created the Firebase project for Glass/Pickle)

4. **Deploy the rules**:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Option 2: Add Your Current Account to the Project

If you want to use `jasjeev@sas.upenn.edu`, you need to add it to the Firebase project:

1. **Go to Firebase Console**: https://console.firebase.google.com/

2. **Login with the account that owns `pickle-3651a`**

3. **Select the `pickle-3651a` project**

4. **Go to Settings → Users and Permissions**

5. **Click "Add Member"**

6. **Add `jasjeev@sas.upenn.edu`** with **"Editor"** or **"Owner"** role

7. **Then try again**:
   ```bash
   firebase use pickle-3651a
   firebase deploy --only firestore:rules
   ```

### Option 3: Create a New Firebase Project for RANI

If you don't have access to the original account, create a fresh Firebase project:

1. **Go to**: https://console.firebase.google.com/

2. **Click "Add Project"**

3. **Name it**: `rani` or `rani-beta`

4. **Enable Google Analytics**: Optional

5. **After creation, go to Project Settings** and note the **Project ID**

6. **Enable Firestore**:
   - Go to Firestore Database
   - Click "Create database"
   - Choose "Production mode"
   - Select a location (e.g., `us-central1`)

7. **Create a database named "rani"**:
   - In Firestore, you need to create a database instance named `rani` to match the code
   - This might require using the Firebase CLI or console

8. **Update your code** with the new Firebase config:
   - Edit `src/features/common/services/firebaseClient.js`
   - Replace the `firebaseConfig` object with your new project's config
   - Get config from: Firebase Console → Project Settings → General → Your apps

9. **Update `.firebaserc`**:
   ```json
   {
     "projects": {
       "default": "your-new-project-id"
     }
   }
   ```

10. **Deploy the rules**:
    ```bash
    firebase use your-new-project-id
    firebase deploy --only firestore:rules
    ```

## Quick Deploy (Once Access is Resolved)

After you have access to the correct project:

```bash
# Make sure you're using the right project
firebase use pickle-3651a

# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Verify deployment
firebase firestore:rules
```

## Verification

After deployment, verify the rules are active:

1. **Firebase Console**: https://console.firebase.google.com/project/pickle-3651a/firestore/rules

2. **Check that your rules match** the content of `firestore.rules`

3. **Test by running the app**:
   ```bash
   npm start
   ```

4. **Try signing in and uploading a document** to verify Firestore access works

## Troubleshooting

### "No projects found"
- You're logged in with an account that doesn't own any Firebase projects
- Login with a different account or create a new project

### "Permission denied"
- Your account doesn't have editor/owner permissions
- Get added to the project by the owner
- Or create a new Firebase project

### "Database not found"
- The Firestore database named "rani" doesn't exist
- The code specifically requests `getFirestore(firebaseApp, 'rani')`
- You may need to create this database in the Firebase Console

## Current Status

✅ Firebase CLI installed
✅ Logged in as: `jasjeev@sas.upenn.edu`
❌ No access to project: `pickle-3651a`

**Next Steps**: Choose one of the options above to resolve access.

## Need Help?

If you're stuck:

1. Check which Google account created the original Glass/Pickle project
2. Use that account to login to Firebase CLI
3. Or add your current account to the project
4. Or create a fresh Firebase project for RANI

Once access is resolved, deployment takes just 30 seconds! 🚀
