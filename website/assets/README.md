# Assets Directory

This directory contains images and media files for the RANI website.

## Required Assets

### 1. Open Graph Image (`og-image.png`)
- **Size:** 1200 x 630 pixels
- **Format:** PNG or JPG
- **Purpose:** Social media preview when the website is shared
- **Content:** Should include:
  - RANI logo
  - Tagline: "Your AI Research Copilot"
  - Visual representation of key features
  - Gradient background (blue to purple)

**Tools to Create:**
- [Canva](https://www.canva.com/) - Free templates available
- [Figma](https://www.figma.com/) - Design from scratch
- Photoshop/GIMP - Advanced editing

**Quick Template:**
```
Background: Linear gradient (#3B82F6 to #8B5CF6)
Logo: RANI icon (centered top)
Title: "RANI" (large, bold, white)
Subtitle: "Your AI Research Copilot" (medium, white)
Features: Small icons representing key features
```

### 2. Favicon (`favicon.ico` and PNG variants)
- **Sizes needed:**
  - `favicon.ico` (16x16, 32x32, 48x48 multi-size)
  - `favicon-16x16.png`
  - `favicon-32x32.png`
  - `apple-touch-icon.png` (180x180)
  - `android-chrome-192x192.png`
  - `android-chrome-512x512.png`

**Generate from logo using:**
- [Favicon.io](https://favicon.io/)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

### 3. Product Screenshots (Optional but Recommended)

Create a `screenshots` subdirectory:

```
assets/screenshots/
├── main-window.png          # Full app interface
├── ask-sidebar.png          # Ask feature with context
├── research-view.png        # Paper search results
├── pdf-annotation.png       # Document annotation
├── listen-mode.png          # Meeting transcription
└── settings.png             # Settings panel
```

**Guidelines:**
- High resolution (at least 1920x1080 for desktop views)
- Clean, professional screenshots
- Include sample content (not real sensitive data)
- Use consistent window size
- Add subtle shadows for depth
- Optimize file size (use compression)

### 4. Logo Variations

```
assets/
├── logo.svg                 # Vector logo (scalable)
├── logo.png                # PNG logo (transparent background)
├── logo-white.svg          # White version for dark backgrounds
└── logo-icon.svg           # Icon only (no text)
```

### 5. Feature Icons (Optional)

If you want custom icons for features instead of emojis:

```
assets/icons/
├── brain.svg               # Context-aware AI
├── books.svg               # Document library
├── search.svg              # Paper discovery
├── headphones.svg          # Meeting assistant
├── chat.svg                # Multi-provider AI
└── lock.svg                # Privacy first
```

## Adding Assets to the Website

Once you have the assets:

1. **Add files to this directory**
2. **Update `index.html`** to reference them:

```html
<!-- Update Open Graph image -->
<meta property="og:image" content="https://jasjeevsingh.github.io/rani/assets/og-image.png">

<!-- Add favicon links in <head> -->
<link rel="icon" type="image/x-icon" href="assets/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="assets/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png">

<!-- Add logo in navigation -->
<img src="assets/logo.png" alt="RANI Logo" class="logo-img">

<!-- Add screenshots in features section -->
<img src="assets/screenshots/main-window.png" alt="RANI Main Interface">
```

## Image Optimization

Before adding images, optimize them:

**Tools:**
- [TinyPNG](https://tinypng.com/) - PNG/JPG compression
- [Squoosh](https://squoosh.app/) - Advanced image compression
- [ImageOptim](https://imageoptim.com/) - Mac app
- [SVGO](https://github.com/svg/svgo) - SVG optimization

**Tips:**
- Use WebP format for better compression (with fallbacks)
- Compress screenshots to < 500KB each
- Use SVG for logos and icons (scalable, small file size)
- Lazy load images below the fold

## Stock Images (If Needed)

If you need placeholder images:

**Free Stock Photo Sites:**
- [Unsplash](https://unsplash.com/) - High-quality, free
- [Pexels](https://www.pexels.com/) - Free stock photos
- [Pixabay](https://pixabay.com/) - Free images and vectors

**Icon Libraries:**
- [Heroicons](https://heroicons.com/) - Beautiful SVG icons
- [Lucide](https://lucide.dev/) - Open-source icons
- [Feather Icons](https://feathericons.com/) - Minimal icons

## Screenshot Tips

**Taking Good Screenshots:**

1. **Clean Up Your Desktop**
   - Close unnecessary apps
   - Hide personal information
   - Use demo/sample data

2. **Consistent Window Size**
   - Standard resolution (1920x1080 or 1440x900)
   - Same zoom level across all screenshots

3. **Add Context**
   - Show realistic use cases
   - Include some UI elements
   - Demonstrate key features

4. **Annotations (Optional)**
   - Add arrows pointing to features
   - Use callout boxes
   - Highlight important areas
   - Tools: Snagit, Skitch, Figma

5. **Shadows & Effects**
   - Add subtle drop shadow
   - Rounded corners
   - Slight perspective tilt (optional)
   - Tools: Figma, Photoshop, online generators

**macOS Screenshot Shortcuts:**
- `Cmd + Shift + 3` - Full screen
- `Cmd + Shift + 4` - Select area
- `Cmd + Shift + 5` - Screenshot options

## Demo Video (Future)

If you create a demo video:

```
assets/video/
└── demo.mp4                # Short demo video (30-60 seconds)
```

**Or host externally:**
- YouTube (embed with iframe)
- Vimeo (better for professional use)
- Loom (quick screen recordings)

## Current Status

- [ ] Open Graph image created
- [ ] Favicon generated (all sizes)
- [ ] Logo added (SVG and PNG)
- [ ] Product screenshots taken
- [ ] Feature icons (if using custom ones)
- [ ] Demo video recorded (optional)
- [ ] All images optimized and compressed

---

**Need Help?**
- Check the DEPLOYMENT.md file for more details
- Use online tools mentioned above
- Ask for design feedback in GitHub Discussions
