# Changelog

All notable changes to RANI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned Features
- Code-signed builds for macOS and Windows
- Automatic update system
- Public beta program
- Enhanced RAG performance optimizations

---

## [1.0.0-beta.1] - 2025-11-07

### 🎉 First Private Beta Release

This is the first beta release of RANI (formerly Glass), rebrandred and prepared for private beta testing.

### Added

#### Core Features
- **Multi-Provider AI Support**: OpenAI, Anthropic (Claude), Google (Gemini), and Ollama
- **Ask Feature**: AI assistance with screen context awareness
- **Listen Mode**: Voice-to-text questions with AI responses
- **Document Management**: Upload, view, and manage PDF documents
- **RAG System**: Local embeddings via Ollama (nomic-embed-text, qwen3-embedding:8b) and OpenAI embeddings
- **Research Discovery**: Semantic Scholar and arXiv integration for paper search
- **Zotero Integration**: Sync research library and manage citations

#### Infrastructure
- **Error Logging**: Comprehensive error tracking for beta testing
- **Firebase Security Rules**: Proper data access controls
- **Beta Build System**: Automated build script for distribution
- **Environment Configuration**: Template for required environment variables

#### Documentation
- **Beta Tester Guide**: Comprehensive installation and usage instructions
- **Testing Checklist**: Manual QA checklist for releases
- **Distribution Guide**: Step-by-step beta release process
- **README Updates**: Beta status and download instructions

### Changed

#### Rebranding
- **App Name**: Glass → RANI (Research Assistant for Novel Inquiry)
- **App ID**: `com.pickle.glass` → `com.rani.research`
- **Protocol**: `pickleglass://` → `rani://`
- **Product Name**: Glass → RANI throughout codebase

#### Build System
- **Auto-Updates**: Disabled for manual beta distribution
- **Code Signing**: Removed (unsigned builds for private beta)
- **Build Scripts**: Added `build:mac`, `build:win`, `build:beta` commands

#### Version
- Bumped from `0.3.0` to `1.0.0-beta.1`

### Fixed
- Various stability improvements from previous Glass version
- Database initialization improvements
- Firebase authentication flow

### Security
- API keys now encrypted via `encryptionService.js`
- Firebase security rules enforce user data isolation
- Environment variables properly ignored in git

### Known Issues

#### Expected (Beta Limitations)
- **macOS Security Warning**: "Unidentified Developer" (unsigned app)
  - **Workaround**: Right-click → Open
- **Windows SmartScreen Warning**: (unsigned app)
  - **Workaround**: More info → Run anyway
- **No Auto-Updates**: Manual distribution via email/Google Drive
- **Performance**: First Ollama query may take 30+ seconds (cold start)
- **Large PDFs**: Embedding 100+ page documents can take 5-10 minutes

#### Known Bugs
- (None reported yet - first beta!)

### Developer Notes

#### Build Process
```bash
# Build for both platforms
./scripts/build-beta.sh

# Build for specific platform
npm run build:mac
npm run build:win
```

#### Distribution
- Builds output to `dist/beta-releases/v1.0.0-beta.1/`
- Includes DMG (macOS), EXE (Windows), README, and CHANGELOG
- Manual distribution via Google Drive

#### Testing
- See `TESTING_CHECKLIST.md` for QA process
- See `docs/BETA_GUIDE.md` for tester instructions

---

## [0.3.0] - 2024-XX-XX (Glass Version)

### Previous Glass Version
This was the last version before the RANI rebrand. Changes from Glass development included:
- Basic AI chat functionality
- Screen capture and analysis
- PDF upload and viewing
- Multiple AI provider support
- Firebase backend

---

## Version History

- **v1.0.0-beta.1** (2025-11-07) - First RANI beta release
- **v0.3.0** (2024-XX-XX) - Last Glass version
- Earlier versions tracked in Glass repository

---

## Beta Release Schedule

- **v1.0.0-beta.1**: Initial private beta (2025-11-07)
- **v1.0.0-beta.2**: Planned after initial feedback (~2 weeks)
- **v1.0.0-rc.1**: Release candidate (TBD)
- **v1.0.0**: Public release (TBD)

---

## Contributing

Beta testers: Please report issues via:
- Email: [your-email@example.com]
- GitHub Issues: https://github.com/jasjeevsingh/rani/issues

Developers: See `CONTRIBUTING.md` for contribution guidelines.

---

## Links

- [Repository](https://github.com/jasjeevsingh/rani)
- [Beta Guide](docs/BETA_GUIDE.md)
- [Testing Checklist](TESTING_CHECKLIST.md)
- [Distribution Guide](BETA_DISTRIBUTION.md)
- [License](LICENSE)
