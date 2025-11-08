# RANI Beta Tester Guide

Welcome to the RANI beta testing program! Thank you for helping us improve RANI before the public release.

## Table of Contents

1. [What is RANI?](#what-is-rani)
2. [Installation](#installation)
3. [First Launch Setup](#first-launch-setup)
4. [What to Test](#what-to-test)
5. [Reporting Issues](#reporting-issues)
6. [Known Limitations](#known-limitations)
7. [FAQ](#faq)

---

## What is RANI?

**RANI** (Research Assistant for Novel Inquiry) is an AI-powered research copilot that helps researchers:

- **Ask**: Get AI answers with screen context awareness
- **Listen**: Use voice to ask questions hands-free
- **Research**: Discover and analyze academic papers
- **Annotate**: Upload, embed, and search through PDF documents
- **Integrate**: Sync with Zotero for seamless library management

## Installation

### macOS Installation

1. **Download** the `RANI-X.X.X-universal.dmg` file
   - Works on both Intel and Apple Silicon Macs
   - macOS 11 (Big Sur) or later required

2. **Open the DMG** by double-clicking it

3. **Drag RANI** to your Applications folder

4. **⚠️ Important Security Step** (unsigned app):
   - **Right-click** (or Control-click) on RANI in Applications
   - Select **"Open"** from the context menu
   - Click **"Open"** in the security dialog
   
   > **Note**: Do NOT double-click the app the first time. You must right-click → Open.
   > This is required because the beta is not code-signed yet.

5. **Grant Permissions** when prompted:
   - **Microphone**: Required for Listen mode (voice input)
   - **Screen Recording**: Required for Ask feature with screen context

   If you miss these prompts:
   - Go to **System Preferences → Security & Privacy → Privacy**
   - Add RANI to Microphone and Screen Recording manually

### Windows Installation

1. **Download** the `RANI-Setup-X.X.X.exe` file
   - Windows 10 or Windows 11 required

2. **Run the installer** by double-clicking it

3. **If Windows Defender SmartScreen appears**:
   - Click **"More info"**
   - Click **"Run anyway"**
   
   > **Note**: This warning is normal for unsigned applications.
   > Future public releases will be code-signed.

4. **Follow the installation wizard**
   - Choose install location (or use default)
   - Choose whether to create desktop shortcut

5. **Launch RANI** from Start Menu or Desktop

### Verifying Installation

After installing, verify:
- [ ] App icon appears in Applications (macOS) or Start Menu (Windows)
- [ ] App launches without crashing
- [ ] You see the sign-in screen

---

## First Launch Setup

### 1. Sign In

RANI requires authentication for cloud sync and AI access.

- **Click "Sign in with Google"**
- Authorize RANI in your browser
- You'll be redirected back to the app

### 2. Configure AI Provider

You have several options:

#### Option A: Use OpenAI (Recommended for Beta)
1. Go to **Settings** (⚙️ icon)
2. Click **AI Providers**
3. Select **OpenAI**
4. Enter your OpenAI API key
   - Get one at: https://platform.openai.com/api-keys
5. Click **Save**

#### Option B: Use Anthropic (Claude)
1. Go to Settings → AI Providers
2. Select **Anthropic**
3. Enter your Anthropic API key
   - Get one at: https://console.anthropic.com/
4. Click Save

#### Option C: Use Google AI (Gemini)
1. Go to Settings → AI Providers
2. Select **Google**
3. Enter your Google AI API key
   - Get one at: https://ai.google.dev/
4. Click Save

#### Option D: Use Ollama (Local AI)
1. **Install Ollama** on your computer:
   - Visit: https://ollama.ai
   - Download and install for your OS
   
2. **Pull a model**:
   ```bash
   ollama pull llama3.2
   ```

3. **In RANI**:
   - Go to Settings → AI Providers
   - Select **Ollama**
   - Verify URL is `http://localhost:11434`
   - Select your model (e.g., llama3.2)
   - Click Save

### 3. Test Basic Features

Before diving deep, test that everything works:

1. **Test Ask**:
   - Click the RANI icon in the menu bar/system tray
   - Type a question: "What is machine learning?"
   - Press Enter
   - Verify you get a response

2. **Test Listen** (optional):
   - Click the microphone icon
   - Grant microphone permission if prompted
   - Speak a question
   - Verify it's transcribed and answered

3. **Test Documents** (optional):
   - Click Documents tab
   - Upload a PDF
   - Verify it appears in the list

---

## What to Test

As a beta tester, we especially want feedback on these areas:

### Core Features to Test

#### 1. Ask AI
- [ ] Ask questions with different AI providers
- [ ] Test with screen context (capture screen)
- [ ] Try long conversations (10+ messages)
- [ ] Switch providers mid-conversation
- [ ] Test with code snippets in questions
- [ ] Test with images/screenshots

**Test scenarios**:
- "Explain this code" (with screen capture)
- "Summarize my screen"
- "What's the weather?" (general knowledge)
- "Help me debug this error" (technical)

#### 2. Listen Mode
- [ ] Activate voice input
- [ ] Speak clearly
- [ ] Try with background noise
- [ ] Test with technical terms
- [ ] Verify transcription accuracy

**Test scenarios**:
- Short questions (< 10 words)
- Long questions (> 30 words)
- Technical jargon
- Multiple questions in one recording

#### 3. Document Management
- [ ] Upload PDFs (various sizes: 1MB, 10MB, 50MB)
- [ ] View uploaded documents
- [ ] Delete documents
- [ ] Annotate PDFs
- [ ] Search within documents

**Test scenarios**:
- Upload research paper
- Upload textbook chapter
- Upload presentation slides
- Try corrupted/password-protected PDF

#### 4. Document Embedding (RAG)
- [ ] Embed document with OpenAI
- [ ] Embed document with Ollama
- [ ] Ask questions about embedded document
- [ ] Verify relevant chunks are retrieved
- [ ] Test with multiple documents

**Test scenarios**:
- "What are the key findings in this paper?"
- "Summarize the methodology section"
- "What did the authors conclude?"
- "Compare results across these 3 papers"

#### 5. Research Search
- [ ] Search Semantic Scholar
- [ ] Search arXiv
- [ ] Download papers
- [ ] Import to Zotero (if configured)

**Test scenarios**:
- Search by keywords
- Search by author
- Search by year range
- Filter by field

#### 6. Zotero Integration (Optional)
- [ ] Connect Zotero account
- [ ] Sync library
- [ ] Import papers from RANI
- [ ] View Zotero items in RANI

**Prerequisites**:
- Zotero installed
- Zotero API key configured

#### 7. Settings Persistence
- [ ] Change AI provider
- [ ] Restart app
- [ ] Verify settings saved
- [ ] Change theme (if available)
- [ ] Test import/export settings

### Edge Cases to Test

These are scenarios that might break things:

- [ ] **No internet connection** - What happens?
- [ ] **Invalid API key** - Do you get a clear error?
- [ ] **Extremely long question** (1000+ words)
- [ ] **Rapid consecutive questions** (10 in 10 seconds)
- [ ] **Large PDF** (100+ MB)
- [ ] **Many documents** (100+ PDFs)
- [ ] **Long conversation** (100+ messages)
- [ ] **Minimize/maximize window** rapidly
- [ ] **Sleep/wake computer** with app running
- [ ] **Switch networks** (WiFi → Ethernet → WiFi)

### Performance Testing

- [ ] Time to launch (should be < 5 seconds)
- [ ] Response time for AI queries (should be < 10 seconds)
- [ ] Document embedding time (note duration)
- [ ] Memory usage (check Activity Monitor / Task Manager)
- [ ] Battery drain (for laptops)

### UI/UX Testing

- [ ] Is navigation intuitive?
- [ ] Are error messages clear?
- [ ] Do tooltips help?
- [ ] Is text readable?
- [ ] Do colors make sense?
- [ ] Are buttons accessible?
- [ ] Does dark mode work (if available)?
- [ ] Window resizing smooth?
- [ ] Keyboard shortcuts working?

---

## Reporting Issues

### How to Report

We prefer feedback via:

1. **Email**: [your-email@example.com]
   - Best for detailed bug reports
   - Include screenshots/logs

2. **Text/Call**: (if you have the number)
   - Best for urgent issues
   - Quick questions

3. **GitHub Issues**: https://github.com/jasjeevsingh/rani/issues
   - Best for technical users
   - Allows tracking and discussion

### What to Include

For bug reports, please provide:

1. **RANI Version**
   - Find in: Help → About
   - Example: `1.0.0-beta.2`

2. **Operating System**
   - macOS: Version (e.g., "macOS 14.1 Sonoma")
   - Windows: Version (e.g., "Windows 11 22H2")

3. **Steps to Reproduce**
   ```
   1. Open RANI
   2. Click Ask
   3. Type "test question"
   4. Press Enter
   5. App crashes
   ```

4. **Expected Behavior**
   - What you thought should happen

5. **Actual Behavior**
   - What actually happened

6. **Screenshots** (if applicable)
   - Capture the error or unexpected behavior

7. **Error Logs** (if available)
   - macOS: `~/Library/Application Support/RANI/error-logs.txt`
   - Windows: `%APPDATA%\RANI\error-logs.txt`
   - In app: Help → View Error Logs

### Feature Requests

We love feature ideas! Please include:

1. **What** you want
2. **Why** it would be useful
3. **How** you imagine it working

### Priority Levels

Help us prioritize by indicating severity:

- **🔴 Critical**: App crashes, data loss, can't use RANI
- **🟠 High**: Major feature broken, but workaround exists
- **🟡 Medium**: Minor bug, doesn't block usage
- **🟢 Low**: Enhancement, cosmetic issue

### Response Time

We aim to:
- Acknowledge reports within 24 hours
- Fix critical bugs in next beta release
- Address high-priority issues within 2 releases
- Consider all feedback for public release

---

## Known Limitations

These are expected in the beta:

### Security Warnings

- **macOS**: "Unidentified Developer" warning
  - **Why**: App is not code-signed
  - **Workaround**: Right-click → Open
  - **Fixed in**: Public release (with code signing)

- **Windows**: "Windows Defender SmartScreen" warning
  - **Why**: App is not code-signed
  - **Workaround**: Click "More info" → "Run anyway"
  - **Fixed in**: Public release (with code signing)

### No Auto-Updates

- **Current**: Manual updates via email/Google Drive
- **Future**: Automatic update notifications and installation

### Beta-Specific Issues

- [ ] Some UI polish pending
- [ ] Performance not fully optimized
- [ ] Error messages may be technical
- [ ] Some features experimental

### Performance Considerations

- **First Ollama query**: May take 30+ seconds (cold start)
- **Large PDF embedding**: Can take 5-10 minutes with OpenAI
- **Memory usage**: May increase with many documents

---

## FAQ

### General

**Q: How often will beta updates be released?**  
A: Approximately every 1-2 weeks, depending on feedback and bugs.

**Q: Will my data be preserved between updates?**  
A: Yes, all data is stored locally and in Firebase. Updates won't delete your documents or conversations.

**Q: Can I use RANI without an internet connection?**  
A: Partially. Ollama (local AI) works offline, but cloud AI providers and sync require internet.

**Q: Is my data private?**  
A: Yes. Documents are stored locally and in your Firebase account. API keys are encrypted. We don't access your data.

### Installation

**Q: Why do I get a security warning on macOS?**  
A: The beta is not code-signed (costs $99/year). Public release will be signed. Use right-click → Open.

**Q: Can I install on multiple computers?**  
A: Yes! Your data syncs via Firebase, so you can use RANI on all your devices.

**Q: How do I uninstall RANI?**  
A: 
- macOS: Drag RANI from Applications to Trash
- Windows: Control Panel → Uninstall a Program → RANI

### Features

**Q: Which AI provider is best?**  
A: 
- **OpenAI**: Most capable, fastest
- **Anthropic**: Great for longer contexts
- **Google**: Good balance of cost/performance
- **Ollama**: Free, private, but slower

**Q: How much do AI providers cost?**  
A: 
- OpenAI: ~$0.01-0.03 per query
- Anthropic: ~$0.01-0.02 per query
- Google: ~$0.001-0.01 per query
- Ollama: Free (runs locally)

**Q: What's the difference between Ask and Listen?**  
A: Ask uses text input, Listen uses voice input. Both do the same thing otherwise.

**Q: What does "embedding" a document mean?**  
A: It converts your document into a searchable format so RANI can find relevant sections when you ask questions.

**Q: Should I embed with OpenAI or Ollama?**  
A: 
- **OpenAI**: Faster, higher quality, costs ~$0.10 per 100 pages
- **Ollama**: Free, slower, runs locally

### Troubleshooting

**Q: RANI won't launch on macOS**  
A: 
1. Did you right-click → Open? (Don't double-click)
2. Check System Preferences → Security & Privacy → Allow RANI
3. Try: `xattr -cr /Applications/RANI.app` in Terminal

**Q: RANI crashes on Windows**  
A:
1. Check Windows Defender didn't block it
2. Try running as Administrator
3. Check antivirus settings

**Q: AI responses are slow**  
A:
- OpenAI/Anthropic: Check internet connection
- Ollama: First query is slow (cold start), subsequent queries faster

**Q: Document won't upload**  
A:
- Check file size (max 100MB recommended)
- Ensure it's a valid PDF
- Try a different PDF

**Q: Settings don't save**  
A:
- Restart the app
- Check file permissions
- Check error logs

**Q: How do I clear the cache?**  
A: Settings → Advanced → Clear Cache

**Q: Where are my files stored?**  
A:
- macOS: `~/Library/Application Support/RANI/`
- Windows: `%APPDATA%\RANI\`

---

## Tips for Effective Testing

1. **Use RANI daily**: The best bugs are found through real usage
2. **Try edge cases**: Upload weird PDFs, ask strange questions
3. **Note performance**: If something feels slow, mention it
4. **Compare providers**: Try the same query with different AIs
5. **Test updates**: Each new beta may fix or break things
6. **Share feedback early**: Don't wait for perfect bug reports
7. **Be honest**: Negative feedback is valuable!

---

## Thank You!

Your participation in beta testing is invaluable. Every bug you find, every feature suggestion you make, and every minute you spend testing helps make RANI better for thousands of future users.

We're building RANI together! 🚀

---

## Contact

- **Email**: [your-email@example.com]
- **GitHub**: https://github.com/jasjeevsingh/rani
- **Docs**: https://jasjeevsingh.github.io/rani

---

**Last Updated**: November 2025  
**RANI Version**: 1.0.0-beta.1
