# Firebase Deployment Instructions

## Deploying Firestore Security Rules

The `firestore.rules` file has been created with proper security rules for RANI. Follow these steps to deploy them:

### 1. Install Firebase CLI (if not already installed)

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

This will open your browser for authentication.

### 3. Select Your Project

Make sure you're using the correct Firebase project:

```bash
firebase use --add
```

Select your RANI Firebase project from the list, or if you already know the project ID:

```bash
firebase use your-project-id
```

### 4. Deploy the Security Rules

```bash
firebase deploy --only firestore:rules
```

### 5. Verify Deployment

After deployment, you should see:

```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/your-project-id/overview
```

### 6. Test the Rules (Optional)

You can test the rules in the Firebase Console:

1. Go to: https://console.firebase.google.com
2. Select your project
3. Navigate to **Firestore Database** → **Rules** tab
4. Click **Rules playground** to test scenarios

### Alternative: Deploy via Firebase Console

If you prefer not to use the CLI:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your RANI project
3. Navigate to **Firestore Database** → **Rules**
4. Copy the contents of `firestore.rules` into the editor
5. Click **Publish**

## What the Rules Do

The deployed rules ensure:

- ✅ Users can only read/write their own data
- ✅ Documents are only accessible to their owner
- ✅ Document chunks are protected by user ID
- ✅ Conversations are private to the user
- ✅ Settings are user-specific
- ❌ All other access is denied by default

## Troubleshooting

### Error: "No project active"

Run:
```bash
firebase use --add
```

### Error: "Permission denied"

Make sure you're logged in:
```bash
firebase login
```

### Error: "Firestore has not been set up"

You need to enable Firestore in your Firebase project first:
1. Go to Firebase Console
2. Navigate to Firestore Database
3. Click "Create database"

### Error: "Rules contain syntax errors"

Check the `firestore.rules` file for any typos. The rules should start with:
```
rules_version = '2';
service cloud.firestore {
  ...
}
```

## Post-Deployment

After deploying, test that:
1. You can sign in to RANI
2. You can upload a document
3. The document is saved to Firestore
4. Only you can access your documents

## Regular Updates

When you update the rules in the future:

1. Edit `firestore.rules`
2. Run `firebase deploy --only firestore:rules`
3. Test the changes

## Resources

- [Firestore Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Security Rules Language](https://firebase.google.com/docs/rules/rules-language)
