# Beta Distribution Checklist

This document outlines the complete process for building and distributing RANI beta releases to testers.

## Pre-Release Checklist

### 1. Version Management

- [ ] Update version in `package.json`:
  ```bash
  npm version 1.0.0-beta.X --no-git-tag-version
  ```
  
- [ ] Update `CHANGELOG.md` with changes in this release:
  ```markdown
  ## [1.0.0-beta.X] - YYYY-MM-DD
  
  ### Added
  - New feature 1
  - New feature 2
  
  ### Fixed
  - Bug fix 1
  - Bug fix 2
  
  ### Changed
  - Change 1
  
  ### Known Issues
  - Issue 1
  - Issue 2
  ```

- [ ] Commit version bump:
  ```bash
  git add package.json CHANGELOG.md
  git commit -m "chore: bump version to 1.0.0-beta.X"
  ```

### 2. Code Quality

- [ ] Run linter and fix issues:
  ```bash
  npm run lint
  ```

- [ ] Test app locally in development:
  ```bash
  npm run start
  ```

- [ ] Check for console errors in DevTools

- [ ] Test critical features:
  - [ ] Ask AI with at least 2 providers
  - [ ] Listen mode
  - [ ] Document upload
  - [ ] Settings save/load

## Build Process

### 3. Build Beta Release

- [ ] Run the build script:
  ```bash
  ./scripts/build-beta.sh
  ```

- [ ] Wait for build to complete (5-10 minutes)

- [ ] Verify builds were created:
  ```bash
  ls -la dist/beta-releases/v1.0.0-beta.X/
  ```
  
  Should see:
  - `RANI-X.X.X-universal.dmg` (macOS)
  - `RANI-Setup-X.X.X.exe` (Windows)
  - `README.txt`
  - `CHANGELOG.txt`

### 4. Update Release Notes

- [ ] Edit `dist/beta-releases/v1.0.0-beta.X/CHANGELOG.txt`

- [ ] Add actual changes for this version

- [ ] List any known issues

- [ ] Update `README.txt` if installation steps changed

## Testing

### 5. Local Testing

#### macOS Testing
- [ ] Install on your Mac:
  1. Open the DMG
  2. Drag to Applications (replace existing)
  3. Right-click → Open
  4. Verify it launches

- [ ] Test core features:
  - [ ] Sign in with Google
  - [ ] Ask a question
  - [ ] Upload a PDF
  - [ ] Check settings persistence
  - [ ] Close and reopen app

#### Windows Testing (if available)
- [ ] Install on Windows VM or machine
- [ ] Test core features (same as macOS)

### 6. Error Log Check

- [ ] Launch app and use it normally for 5 minutes

- [ ] Check error logs:
  - macOS: `~/Library/Application Support/RANI/error-logs.txt`
  - Windows: `%APPDATA%\RANI\error-logs.txt`

- [ ] Verify no critical errors

- [ ] If errors found, fix and rebuild

## Distribution

### 7. Upload to Google Drive

- [ ] Create folder: `RANI Beta v1.0.0-beta.X`

- [ ] Upload entire `dist/beta-releases/v1.0.0-beta.X/` folder

- [ ] Set folder permissions: "Anyone with the link can view"

- [ ] Copy shareable link

- [ ] Test link in incognito mode

### 8. Notify Beta Testers

- [ ] Send email to beta testers:

```
Subject: RANI Beta v1.0.0-beta.X Available

Hi Beta Testers!

A new RANI beta is ready for testing.

📦 Download: [Google Drive Link]

✨ What's New:
- [Feature 1]
- [Feature 2]
- [Bug fix 1]

⚠️ Known Issues:
- [Issue 1]
- [Issue 2]

📖 Installation:
See the README.txt file in the download folder for detailed instructions.

🐛 Reporting Issues:
- Reply to this email
- Text/call me
- GitHub: https://github.com/jasjeevsingh/rani/issues

🙏 What to Test:
- All AI providers (OpenAI, Anthropic, Google, Ollama)
- Document upload and embedding
- Listen mode
- Research search
- Zotero sync
- Any new features listed above

Thanks for your help making RANI better!

Best,
[Your Name]
```

- [ ] Send email or text notification

- [ ] Post update in beta testing group chat (if applicable)

## Tracking

### 9. Feedback Collection

Create a tracking spreadsheet or document:

| Tester Name | OS | Version Installed | Feedback Date | Issues Reported | Status |
|-------------|----|--------------------|---------------|-----------------|--------|
| John Doe    | macOS 14 | 1.0.0-beta.X | 2025-11-08 | Login slow | Fixed in beta.X+1 |
| Jane Smith  | Win 11   | 1.0.0-beta.X | 2025-11-09 | PDF upload works! | - |

- [ ] Create/update feedback tracking

- [ ] Log all reported issues

- [ ] Respond to testers within 24 hours

### 10. Issue Management

For each reported issue:

- [ ] Create GitHub issue (if not duplicate)

- [ ] Label as `beta`, `bug`, or `enhancement`

- [ ] Assign to milestone (e.g., "Beta Phase" or "v1.0.0")

- [ ] Update tester on status

- [ ] Close issue when fixed

## Post-Release

### 11. Git Tagging

- [ ] Tag the release:
  ```bash
  git tag v1.0.0-beta.X
  git push origin v1.0.0-beta.X
  ```

- [ ] Push the branch:
  ```bash
  git push origin sidebar-ui
  ```

### 12. Documentation

- [ ] Update any changed documentation

- [ ] Add screenshots if UI changed

- [ ] Update `docs/BETA_GUIDE.md` if needed

## Timeline

Typical release cadence:

- **Week 1-2**: Development and bug fixes
- **Week 2**: Internal testing
- **Week 2**: Build and distribute to testers
- **Week 3**: Collect feedback
- **Week 3-4**: Fix critical issues
- **Week 4**: Next beta release

## Release Criteria

Only release when:

✅ All critical bugs from previous beta are fixed
✅ App launches successfully on both platforms
✅ No data loss or corruption issues
✅ Core features (Ask, Listen, Documents) working
✅ At least basic testing completed

## Emergency Rollback

If a critical bug is found after distribution:

1. **Notify testers immediately**:
   ```
   Subject: URGENT - Do Not Use RANI v1.0.0-beta.X
   
   A critical bug was found in the latest beta.
   Please do not use it until further notice.
   
   We're working on a fix and will send beta.X+1 soon.
   
   Sorry for the inconvenience!
   ```

2. **Remove from Google Drive**

3. **Fix the bug**

4. **Build hotfix beta.X+1**

5. **Distribute immediately**

## Automation Opportunities (Future)

For public release, automate:
- [ ] GitHub Actions for building
- [ ] Automatic changelog generation
- [ ] Release notes from commits
- [ ] Auto-update delivery

But for private beta, manual distribution is fine.

## Questions?

If anything is unclear:
1. Check this checklist
2. Review `scripts/build-beta.sh`
3. Read `docs/BETA_GUIDE.md`
4. Ask in the team chat

## Version History

Track all beta releases:

- `v1.0.0-beta.1` - Initial beta release (YYYY-MM-DD)
- `v1.0.0-beta.2` - Bug fixes and improvements (YYYY-MM-DD)
- [Continue tracking...]

---

**Remember**: Beta testing is about learning. Bugs are expected and feedback is gold! 🚀
