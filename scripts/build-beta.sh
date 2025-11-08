#!/bin/bash
set -e

echo "🚀 Building RANI Beta..."
echo "======================================"

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
echo "📦 Version: $VERSION"

# Clean previous builds
echo ""
echo "🧹 Cleaning previous builds..."
rm -rf dist/

# Install dependencies (skip if already installed)
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📥 Installing dependencies..."
    npm ci
fi

# Build renderer
echo ""
echo "🎨 Building renderer..."
npm run build:all

# Build for both platforms
echo ""
echo "🖥️  Building macOS + Windows installers..."
echo "(This may take several minutes...)"
npx electron-builder --mac --win --universal

# Create distribution folder
DIST_FOLDER="dist/beta-releases/v$VERSION"
mkdir -p "$DIST_FOLDER"

# Copy builds to distribution folder
echo ""
echo "📋 Organizing builds into distribution folder..."

# Copy macOS builds
if ls dist/*.dmg 1> /dev/null 2>&1; then
    cp dist/*.dmg "$DIST_FOLDER/" 2>/dev/null || true
    echo "   ✓ Copied macOS DMG"
fi

if ls dist/*.zip 1> /dev/null 2>&1; then
    cp dist/*.zip "$DIST_FOLDER/" 2>/dev/null || true
    echo "   ✓ Copied macOS ZIP"
fi

# Copy Windows builds
if ls dist/*.exe 1> /dev/null 2>&1; then
    cp dist/*.exe "$DIST_FOLDER/" 2>/dev/null || true
    echo "   ✓ Copied Windows Installer"
fi

# Create README for beta testers
echo ""
echo "📝 Creating installation instructions..."
cat > "$DIST_FOLDER/README.txt" << EOF
================================================================================
RANI Beta - Installation Instructions
================================================================================

Version: $VERSION
Build Date: $(date '+%Y-%m-%d %H:%M:%S')
Platform: macOS (Universal) + Windows (x64)

================================================================================
macOS Installation
================================================================================

1. Download RANI-$VERSION-universal.dmg
   (Works on both Intel and Apple Silicon Macs)

2. Open the DMG file by double-clicking it

3. Drag RANI to your Applications folder

4. IMPORTANT - Security Step:
   - Right-click (or Control-click) on RANI in Applications
   - Select "Open" from the menu
   - Click "Open" in the security dialog
   
   Note: This is necessary because the app is not code-signed yet.
   Future releases will not require this step.

5. Grant permissions when prompted:
   - Microphone access (for Listen mode)
   - Screen Recording (for Ask with screen context)

================================================================================
Windows Installation
================================================================================

1. Download RANI-Setup-$VERSION.exe

2. Run the installer by double-clicking it

3. If Windows Defender SmartScreen appears:
   - Click "More info"
   - Click "Run anyway"
   
   Note: This is normal for unsigned applications.
   Future releases will be code-signed.

4. Follow the installation wizard

5. Launch RANI from the Start Menu or Desktop shortcut

================================================================================
First Launch Setup
================================================================================

1. Sign in with your Google account
   (Required for AI access and cloud sync)

2. Configure your AI provider:
   - OpenAI: Add your API key in Settings
   - Anthropic: Add your API key in Settings
   - Google AI: Add your API key in Settings
   - Ollama: Install locally (https://ollama.ai)

3. Test the Ask feature with a simple question

4. Try uploading a PDF document

================================================================================
Troubleshooting
================================================================================

macOS Issues:
-------------
- "App is damaged": Right-click → Open (don't double-click)
- Permissions denied: System Preferences → Security & Privacy → Allow RANI
- Won't open: Check System Preferences → Security & Privacy

Windows Issues:
--------------
- Installer blocked: Click "More info" → "Run anyway"
- Antivirus warning: Add exception for RANI
- Won't launch: Check Windows Defender settings

General Issues:
--------------
- Clear cache: Settings → Advanced → Clear Cache
- Check logs: Help → View Error Logs
- Restart the app

================================================================================
Beta Testing Feedback
================================================================================

Please report any issues or feedback via:
- Email: your-email@example.com
- Text/Call: (if you have the number)
- GitHub Issues: https://github.com/jasjeevsingh/rani/issues

What to test:
- Ask AI with different providers
- Listen mode (voice questions)
- Document upload and embedding
- Research paper search
- Zotero integration
- Settings persistence

Known Beta Limitations:
- No automatic updates (manual updates via email)
- Unsigned builds (security warnings expected)
- Some UI polish pending

================================================================================
System Requirements
================================================================================

macOS:
- macOS 11 (Big Sur) or later
- 4GB RAM minimum, 8GB recommended
- 500MB free disk space

Windows:
- Windows 10 or Windows 11
- 4GB RAM minimum, 8GB recommended
- 500MB free disk space

Optional:
- Ollama for local AI (recommended)
- Zotero for library sync

================================================================================

Thank you for beta testing RANI! 🙏

Your feedback helps make RANI better for everyone.

================================================================================
EOF

# Create a CHANGELOG entry
cat > "$DIST_FOLDER/CHANGELOG.txt" << EOF
RANI v$VERSION - Beta Release

Build Date: $(date '+%Y-%m-%d %H:%M:%S')

Changes in this version:
- [Add your changes here before distributing]

Known Issues:
- [Add any known issues here]

Previous versions:
- See full CHANGELOG.md in the repository

EOF

# Summary
echo ""
echo "======================================"
echo "✅ Build complete!"
echo "======================================"
echo ""
echo "📁 Distribution folder: $DIST_FOLDER"
echo ""
echo "Contents:"
ls -lh "$DIST_FOLDER"
echo ""
echo "Next steps:"
echo "1. Test the builds locally"
echo "2. Update CHANGELOG.txt with actual changes"
echo "3. Upload the distribution folder to Google Drive"
echo "4. Share the link with beta testers"
echo "5. Send notification email"
echo ""
echo "See BETA_DISTRIBUTION.md for detailed steps."
echo ""
