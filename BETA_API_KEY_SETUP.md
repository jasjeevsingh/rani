# Beta API Key Setup Guide

## Overview
For the private beta, RANI can provide a shared OpenAI API key so testers don't need to provide their own. This allows beta testers to use the app for free without managing their own API keys.

## Setup Instructions

### 1. Add Your OpenAI API Key

Edit the `.env.beta` file in the project root:

```bash
# .env.beta
BETA_OPENAI_API_KEY=sk-proj-your-actual-openai-api-key-here
```

**Important:** 
- Replace `your-openai-api-key-here` with your actual OpenAI API key
- This file is automatically gitignored and will NOT be committed to version control
- Keep this file secure and never share it publicly

### 2. Build the Beta Installer

The `.env.beta` file will be automatically bundled into the app when you build:

```bash
npm run build:mac
# or
npm run build:win
```

### 3. Distribute to Testers

When testers install and run the app:

1. **Welcome Screen** appears with two options:
   - **"Quick start with default API key"** ← Uses your shared beta key (NEW!)
   - **"Use Personal API keys"** ← Allows them to enter their own keys

2. **Quick Start Flow:**
   - Click "Let's Go!"
   - App automatically configures OpenAI with the beta key
   - Default models are selected:
     - LLM: `gpt-4o-mini`
     - STT: `gpt-4o-mini-transcribe`
     - Embedding: `text-embedding-3-small`
   - Proceeds to permission setup (if needed) then main app

3. **Personal API Key Flow:**
   - Click "Enter Your API Key"
   - Shows API key entry screen
   - They can add their own OpenAI, Anthropic, Google AI, or Ollama keys

## How It Works

### Architecture

1. **`.env.beta`** - Stores the beta API key (gitignored)
2. **`betaConfigService.js`** - Loads and manages the beta key
3. **`HeaderController.js`** - Handles the "Quick start" button click
4. **`WelcomeHeader.js`** - UI component with the two options

### Code Flow

```
User clicks "Let's Go!" 
  ↓
HeaderController.handleLoginOption()
  ↓
Check if beta key exists
  ↓
betaConfigService.configureBetaApiKey()
  ↓
Set OpenAI API key + Select default models
  ↓
Check permissions
  ↓
Show permission setup OR go to main app
```

### Key Files Modified

- **`/src/features/common/services/betaConfigService.js`** - New service to manage beta key
- **`/src/bridge/featureBridge.js`** - Added IPC handlers for beta config
- **`/src/preload.js`** - Exposed beta config API to renderer
- **`/src/ui/app/HeaderController.js`** - Updated to configure beta key on quick start
- **`/src/ui/app/WelcomeHeader.js`** - Updated UI text (already done by user)
- **`/.env.beta`** - New file for beta key storage (gitignored)
- **`/.gitignore`** - Added `.env.beta` explicitly

## Security Considerations

### API Key Protection

✅ **What's Secure:**
- `.env.beta` is gitignored - never committed to repository
- Key is bundled into app.asar during build (not easily accessible)
- Users never see the actual key value

⚠️ **Limitations:**
- Advanced users can extract keys from app.asar
- No rate limiting per user (all beta users share same key)
- You're responsible for OpenAI API costs

### Best Practices

1. **Monitor Usage:**
   - Check OpenAI dashboard regularly
   - Set up billing alerts
   - Consider usage limits on the key

2. **Limited Distribution:**
   - Only share beta builds with trusted testers
   - Keep tester count small (<20 people)
   - Rotate the key after beta period ends

3. **Alternative Approach:**
   - For public beta, recommend users provide their own keys
   - Use the shared key only for very limited private beta

## Testing the Setup

### Before Building

```bash
# 1. Add your key to .env.beta
echo "BETA_OPENAI_API_KEY=sk-proj-your-key-here" > .env.beta

# 2. Verify it's gitignored
git check-ignore .env.beta
# Should output: .env.beta

# 3. Test in development
npm start
# Click "Let's Go!" and verify it works
```

### After Building

```bash
# 1. Build the installer
npm run build:mac

# 2. Install the DMG on a fresh system or new user account

# 3. Launch app and verify:
#    - Welcome screen shows "Quick start" option
#    - Clicking "Let's Go!" configures the app automatically
#    - App proceeds to permission setup then works normally
```

## Troubleshooting

### "No beta API key available" Error

**Cause:** `.env.beta` file is missing or key is not set

**Fix:**
```bash
# Create .env.beta file
cat > .env.beta << EOF
BETA_OPENAI_API_KEY=sk-proj-your-actual-key-here
EOF

# Rebuild the app
npm run build:mac
```

### Quick Start Falls Back to API Key Entry

**Cause:** Beta key failed to configure or is invalid

**Fix:**
1. Check OpenAI API key is valid
2. Verify key has correct permissions
3. Check console logs for specific error
4. Try the key manually in OpenAI Playground

### Key Not Found in Packaged App

**Cause:** `.env.beta` wasn't included in build

**Fix:**
1. Ensure `.env.beta` exists in project root before building
2. Check that `electron-builder.yml` includes the file:
   ```yaml
   files:
     - .env.beta
   ```

## Switching Between Modes

Beta testers can always switch from beta key to personal keys:

1. Open Settings (gear icon)
2. Go to "Model Settings"
3. Remove the OpenAI provider
4. Add their own API keys

This allows flexibility for testers who want to use their own keys partway through testing.

## Cost Estimation

### Typical Beta User Usage

- **Light use:** ~$0.50-1/month (few queries per day)
- **Moderate use:** ~$2-5/month (daily active use)
- **Heavy use:** ~$10-20/month (extensive testing)

### Total Cost for Beta (20 users, 1 month)

- **Conservative:** $10-20
- **Realistic:** $40-100
- **High usage:** $200-400

**Recommendation:** Set a $100-200 budget and monitor closely in the first week.

## Next Steps

1. ✅ Add your OpenAI key to `.env.beta`
2. ✅ Test in development (`npm start`)
3. ✅ Build beta installer (`npm run build:mac`)
4. ✅ Test the DMG installation
5. ✅ Distribute to select beta testers
6. ⚠️ Monitor OpenAI usage dashboard
7. 🔄 Collect feedback and iterate

## FAQ

**Q: Can I use multiple API keys for different testers?**  
A: Not with this setup. All testers share the same key. For user-specific keys, you'd need Firebase + backend key management.

**Q: What happens if I exceed my OpenAI quota?**  
A: The app will show "API key invalid" errors. You'd need to add more credits or ask testers to use their own keys.

**Q: Can I rotate the key during beta?**  
A: Yes, but you'd need to rebuild and redistribute the installer.

**Q: Is this secure enough for public beta?**  
A: No. This is only suitable for limited private beta (<20 trusted users). For public beta, implement proper backend key management or require users to provide their own keys.
