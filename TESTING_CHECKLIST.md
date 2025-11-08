# RANI Manual Testing Checklist

Use this checklist before each beta release to ensure quality.

## Pre-Build Testing

### Environment Setup
- [ ] Latest code pulled from git
- [ ] Dependencies up to date: `npm install`
- [ ] No uncommitted changes that should be in build
- [ ] `.env` configured (if needed)

### Code Quality
- [ ] Linter passes: `npm run lint`
- [ ] No TypeScript errors (if applicable)
- [ ] No console.error() in production code
- [ ] All TODOs/FIXMEs reviewed

---

## Build Testing

### Local Development Build
- [ ] App starts: `npm run start`
- [ ] No errors in console on startup
- [ ] All windows load correctly
- [ ] DevTools accessible (View → Toggle Developer Tools)

### Production Build
- [ ] Build completes: `./scripts/build-beta.sh`
- [ ] No build errors or warnings
- [ ] Output files created:
  - [ ] macOS DMG
  - [ ] macOS ZIP
  - [ ] Windows EXE
  - [ ] Windows Portable (if applicable)

---

## Installation Testing

### macOS Installation

#### Intel Mac
- [ ] DMG mounts successfully
- [ ] Drag to Applications works
- [ ] First launch (right-click → Open) succeeds
- [ ] Security dialog appears and can be bypassed
- [ ] App icon correct in Applications folder
- [ ] App appears in Launchpad

#### Apple Silicon Mac
- [ ] DMG mounts successfully
- [ ] Drag to Applications works
- [ ] First launch (right-click → Open) succeeds
- [ ] Security dialog appears and can be bypassed
- [ ] Runs natively (not through Rosetta)
- [ ] Performance acceptable

### Windows Installation

#### Windows 10
- [ ] Installer runs
- [ ] SmartScreen warning appears
- [ ] "More info" → "Run anyway" works
- [ ] Installation completes
- [ ] Desktop shortcut created (if selected)
- [ ] Start menu entry created
- [ ] Uninstaller present

#### Windows 11
- [ ] Installer runs
- [ ] SmartScreen warning appears
- [ ] "More info" → "Run anyway" works
- [ ] Installation completes
- [ ] Pins to taskbar successfully

---

## First Launch Testing

### Authentication
- [ ] App launches to sign-in screen
- [ ] "Sign in with Google" button works
- [ ] Browser opens for authentication
- [ ] Redirect back to app works
- [ ] User sees main interface after sign-in
- [ ] Sign out and sign in again works

### Permissions

#### macOS Permissions
- [ ] Microphone permission prompt appears
- [ ] Screen recording permission prompt appears
- [ ] Permissions can be granted
- [ ] App works after granting permissions
- [ ] Can manually grant in System Preferences

#### Windows Permissions
- [ ] Microphone permission prompt appears (if applicable)
- [ ] Permissions can be granted
- [ ] Windows Defender doesn't block functionality

### Initial UI
- [ ] Main window loads completely
- [ ] All UI elements visible
- [ ] No broken images or icons
- [ ] Tooltips work
- [ ] Menu bar/system tray icon appears

---

## Core Feature Testing

### 1. Ask AI Feature

#### Basic Functionality
- [ ] Ask window opens (click icon or hotkey)
- [ ] Can type question
- [ ] Response appears
- [ ] Response is coherent
- [ ] Can ask follow-up question
- [ ] Conversation history preserved
- [ ] Can start new conversation

#### AI Providers
- [ ] OpenAI works
- [ ] Anthropic works
- [ ] Google AI works
- [ ] Ollama works (if installed)
- [ ] Can switch providers mid-conversation
- [ ] Error handling for invalid API key
- [ ] Error handling for rate limits

#### Screen Context
- [ ] Can capture screen
- [ ] Screen capture preview shows
- [ ] AI analyzes screen correctly
- [ ] Multiple screen captures in one conversation

#### Edge Cases
- [ ] Very long question (1000+ chars)
- [ ] Special characters in question
- [ ] Code blocks in question
- [ ] Rapid successive questions
- [ ] Network disconnection mid-query

### 2. Listen Mode

#### Basic Functionality
- [ ] Listen button activates
- [ ] Microphone permission granted
- [ ] Recording indicator shows
- [ ] Can speak question
- [ ] Transcription appears
- [ ] Transcription is accurate
- [ ] AI responds to transcribed question

#### Audio Quality
- [ ] Works with built-in microphone
- [ ] Works with external microphone
- [ ] Handles background noise reasonably
- [ ] Handles fast speech
- [ ] Handles slow speech
- [ ] Handles technical terms

#### Edge Cases
- [ ] Very quiet speech
- [ ] Very loud speech
- [ ] Long pause mid-sentence
- [ ] Multiple speakers
- [ ] Non-English (if supported)

### 3. Document Management

#### Upload
- [ ] Can select PDF file
- [ ] Upload progress shows
- [ ] Small PDF (< 1MB) uploads
- [ ] Medium PDF (1-10MB) uploads
- [ ] Large PDF (10-50MB) uploads
- [ ] Multiple PDFs upload
- [ ] Upload progress accurate

#### Display
- [ ] Documents list populates
- [ ] Document metadata correct (name, size, date)
- [ ] Can view document details
- [ ] Can open PDF viewer
- [ ] PDF renders correctly
- [ ] Can scroll through PDF
- [ ] Can zoom in/out

#### Management
- [ ] Can delete document
- [ ] Delete confirmation shows
- [ ] Document actually deleted
- [ ] Can rename document (if feature exists)
- [ ] Can search documents
- [ ] Can filter/sort documents

#### Edge Cases
- [ ] Upload corrupted PDF
- [ ] Upload password-protected PDF
- [ ] Upload extremely large PDF (100MB+)
- [ ] Upload non-PDF file
- [ ] Upload 100+ documents

### 4. Document Embedding (RAG)

#### Embedding Process
- [ ] Can click "Embed" button
- [ ] Provider selection works (OpenAI/Ollama)
- [ ] Embedding starts
- [ ] Progress indicator shows
- [ ] Embedding completes
- [ ] Success message appears
- [ ] Document marked as embedded

#### Querying
- [ ] Can ask question about document
- [ ] Relevant chunks retrieved
- [ ] Response references document
- [ ] Sources shown (if applicable)
- [ ] Multiple documents searchable
- [ ] Complex queries work

#### Providers
- [ ] OpenAI embedding works
- [ ] Ollama embedding works
- [ ] Can switch providers for different docs
- [ ] Embedding quality acceptable

#### Edge Cases
- [ ] Embed very large document
- [ ] Embed document with images
- [ ] Embed document with tables
- [ ] Query with no relevant chunks
- [ ] Query spanning multiple documents

### 5. Research Search

#### Semantic Scholar
- [ ] Search opens
- [ ] Can enter search query
- [ ] Results load
- [ ] Results relevant
- [ ] Can view paper details
- [ ] Can download paper
- [ ] Can import to Zotero (if configured)
- [ ] Pagination works

#### arXiv
- [ ] Can search arXiv
- [ ] Results load
- [ ] Can filter by category
- [ ] Can download PDF
- [ ] Download progress shows
- [ ] Downloaded paper accessible

#### General
- [ ] Search history saved
- [ ] Can clear search history
- [ ] Can export search results
- [ ] Network errors handled gracefully

### 6. Zotero Integration (Optional)

#### Setup
- [ ] Can connect Zotero account
- [ ] API key validation works
- [ ] Library syncs
- [ ] Collections visible

#### Functionality
- [ ] Can view Zotero items
- [ ] Can import from RANI to Zotero
- [ ] Can open items in Zotero
- [ ] Metadata syncs correctly
- [ ] Attachments sync

---

## Settings Testing

### General Settings
- [ ] Settings window opens
- [ ] Can change AI provider
- [ ] Can enter API keys
- [ ] API keys saved securely
- [ ] Can change default provider
- [ ] Settings persist after restart

### UI Settings
- [ ] Theme selection works (if available)
- [ ] Font size changes work
- [ ] Language selection works (if multi-lingual)
- [ ] Layout preferences save

### Advanced Settings
- [ ] Can clear cache
- [ ] Can export settings
- [ ] Can import settings
- [ ] Can reset to defaults
- [ ] Database path configurable (if applicable)

### Ollama Settings
- [ ] Can configure Ollama URL
- [ ] Model list populates
- [ ] Can select model
- [ ] Can refresh model list
- [ ] Connection test works

---

## Data Persistence Testing

### After App Restart
- [ ] Conversations preserved
- [ ] Documents still listed
- [ ] Settings retained
- [ ] Authentication persists
- [ ] Recent searches saved

### After System Restart
- [ ] App launches correctly
- [ ] All data intact
- [ ] No corruption
- [ ] Performance normal

### Data Sync (Firebase)
- [ ] Data syncs across devices
- [ ] Conflicts resolved correctly
- [ ] Sync status indicator accurate

---

## Performance Testing

### Startup Performance
- [ ] Cold start < 5 seconds
- [ ] Warm start < 3 seconds
- [ ] UI responsive immediately

### Query Performance
- [ ] Simple query response < 10 seconds
- [ ] Complex query response < 30 seconds
- [ ] Document embedding (100 chunks) < 2 minutes (OpenAI)
- [ ] Document embedding (100 chunks) < 10 minutes (Ollama)

### Memory Usage
- [ ] Idle memory < 200MB
- [ ] With 10 documents < 500MB
- [ ] With 100 documents < 1GB
- [ ] No memory leaks during extended use

### CPU Usage
- [ ] Idle CPU < 5%
- [ ] During AI query < 50% (excluding Ollama)
- [ ] During embedding < 100% (expected)

### Battery Impact (Laptops)
- [ ] Normal usage < 10% per hour
- [ ] Idle < 2% per hour
- [ ] No excessive battery drain

---

## UI/UX Testing

### Navigation
- [ ] All menus accessible
- [ ] Breadcrumbs work (if applicable)
- [ ] Back/forward navigation works
- [ ] Home button returns to main view

### Responsiveness
- [ ] Window resizes smoothly
- [ ] Minimum window size reasonable
- [ ] Maximum window size works
- [ ] Full screen mode works
- [ ] Split view works (if applicable)

### Accessibility
- [ ] Text readable (sufficient contrast)
- [ ] Buttons large enough to click
- [ ] Keyboard navigation works
- [ ] Tab order logical
- [ ] Screen reader compatible (if tested)

### Visual Polish
- [ ] No UI glitches
- [ ] Animations smooth
- [ ] Loading states clear
- [ ] Error states clear
- [ ] Success states clear

---

## Error Handling Testing

### Network Errors
- [ ] Offline mode handled
- [ ] Connection loss mid-query handled
- [ ] Slow network handled
- [ ] Timeout errors clear

### API Errors
- [ ] Invalid API key → clear message
- [ ] Rate limit → clear message
- [ ] Service outage → clear message
- [ ] Malformed response handled

### File Errors
- [ ] Missing file handled
- [ ] Corrupted file handled
- [ ] Permission denied handled
- [ ] Disk full handled

### Database Errors
- [ ] Database locked handled
- [ ] Corruption detected and reported
- [ ] Migration errors handled

---

## Security Testing

### API Key Storage
- [ ] API keys encrypted
- [ ] Keys not in plain text
- [ ] Keys not in logs
- [ ] Keys not exposed in UI

### Authentication
- [ ] Sessions expire appropriately
- [ ] Logout clears session
- [ ] Token refresh works
- [ ] Invalid tokens handled

### File Access
- [ ] App doesn't access unauthorized files
- [ ] Uploaded files sandboxed
- [ ] No arbitrary code execution

---

## Cross-Platform Testing

### macOS Specific
- [ ] Menu bar integration works
- [ ] Dock icon works
- [ ] Notifications work
- [ ] System tray works
- [ ] Keyboard shortcuts work

### Windows Specific
- [ ] System tray icon works
- [ ] Notifications work
- [ ] Start menu integration works
- [ ] Taskbar integration works
- [ ] Keyboard shortcuts work

### Shared
- [ ] File paths handled correctly
- [ ] Line endings handled correctly
- [ ] Clipboard works
- [ ] Drag-and-drop works

---

## Edge Case Testing

### Stress Testing
- [ ] 100+ documents
- [ ] 1000+ messages in conversation
- [ ] 24-hour continuous operation
- [ ] Multiple windows open
- [ ] Rapid open/close cycles

### Boundary Testing
- [ ] Empty input
- [ ] Maximum length input
- [ ] Special characters: `<>&"'`
- [ ] Unicode characters: emoji, CJK
- [ ] SQL injection attempts (should be safe)
- [ ] XSS attempts (should be safe)

### Environmental
- [ ] Low disk space
- [ ] Low memory
- [ ] Slow CPU
- [ ] Slow network
- [ ] VPN active
- [ ] Proxy configured
- [ ] Firewall active

---

## Regression Testing

### Previous Bug Fixes
- [ ] Test all issues from previous betas
- [ ] Verify fixes didn't regress
- [ ] Check related functionality

### Breaking Changes
- [ ] Migration from previous version works
- [ ] Old data loads correctly
- [ ] Settings migrated

---

## Final Checks

### Documentation
- [ ] README.txt accurate
- [ ] CHANGELOG.txt complete
- [ ] Version number correct everywhere

### Build Artifacts
- [ ] File sizes reasonable
- [ ] Checksums match (if applicable)
- [ ] Digital signature present (future)

### Error Logs
- [ ] Check error logs for warnings
- [ ] No unexpected errors
- [ ] Debug logs disabled in production build

---

## Sign-Off

### Tester Information
- **Tester Name**: ________________
- **Date**: ________________
- **Version Tested**: ________________
- **Platform(s)**: ☐ macOS Intel ☐ macOS Apple Silicon ☐ Windows 10 ☐ Windows 11

### Results
- **Total Tests**: ______
- **Passed**: ______
- **Failed**: ______
- **Blocked**: ______

### Critical Issues Found
1. ________________________________________
2. ________________________________________
3. ________________________________________

### Recommendation
- ☐ **Ready for beta release**
- ☐ **Ready with minor issues** (document in release notes)
- ☐ **Not ready** (critical bugs must be fixed)

### Notes
```
[Add any additional notes, observations, or concerns here]
```

---

**Testing completed by**: ________________  
**Date**: ________________  
**Signature**: ________________

---

## Quick Reference

### Fast Testing Path (30 minutes)
For urgent releases, test at minimum:
1. Installation on one platform
2. Sign-in
3. Ask one question with OpenAI
4. Upload one PDF
5. Settings save/load
6. Restart app and verify data persists

### Full Testing Path (4-6 hours)
For stable releases, complete entire checklist.

### Automated Testing (Future)
When automated tests exist:
- Run: `npm test`
- Verify: All tests pass
- Then: Do manual testing for UI/UX

---

**Last Updated**: November 2025  
**Version**: 1.0
