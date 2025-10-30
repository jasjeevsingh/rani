# RANI - Your AI Research Copilot

![RANI Logo](assets/og-image.png)

## Welcome to the RANI Website Repository

This directory contains the landing page for RANI, an AI-powered research copilot built for academic researchers, graduate students, and R&D professionals.

**Live Website:** [https://jasjeevsingh.github.io/rani/](https://jasjeevsingh.github.io/rani/)

## ✨ What's Included

### Core Files
- **index.html** - Main landing page with hero, features, comparison, use cases, and download sections
- **styles.css** - Complete design system with responsive layouts and animations
- **script.js** - Interactive functionality including OS detection and GitHub integration
- **sitemap.xml** - SEO sitemap for search engines
- **robots.txt** - Search engine crawler instructions

### Key Features

✅ **Fully Responsive** - Works beautifully on desktop, tablet, and mobile  
✅ **SEO Optimized** - Meta tags, Open Graph, Twitter Cards, and schema markup  
✅ **Performance** - Lightweight, fast-loading, optimized for GitHub Pages  
✅ **Accessible** - Semantic HTML5 and ARIA labels  
✅ **Interactive** - Smooth animations, mobile menu, OS detection  
✅ **GitHub Integration** - Live star count from GitHub API  

## 🎯 Content Highlights

### Hero Section
- Compelling headline: "Your AI Research Copilot"
- Clear value proposition
- OS-specific download buttons
- Live GitHub stats

### Features Section
- 6 key features with detailed descriptions:
  - 🧠 Context-Aware AI
  - 📚 Smart Document Library
  - 🔍 Paper Discovery
  - 🎧 Meeting Assistant
  - 💬 Multi-Provider AI
  - 🔒 Privacy First

### Comparison Table
- Side-by-side comparison with traditional tools
- Highlights RANI's unique advantages

### Use Cases
- Graduate Students
- Academic Researchers
- Industry R&D

### Download CTA
- Prominent download section
- OS detection for personalized experience
- Links to GitHub releases

## 📦 Next Steps: Adding Assets

To complete the website, you'll need to add images:

### Priority Assets

1. **Open Graph Image** (`assets/og-image.png`)
   - Dimensions: 1200 x 630 pixels
   - Include RANI logo + tagline
   - Used for social media previews
   - Tools: Canva, Figma, Photoshop

2. **Favicon** (`favicon.ico` and `assets/favicon-*.png`)
   - 16x16, 32x32, and 180x180 px versions
   - Use the RANI logo
   - Generator: [favicon.io](https://favicon.io/)

3. **Product Screenshots** (optional but recommended)
   - Main window interface
   - Research view
   - PDF annotation
   - Listen mode
   - Save in `assets/screenshots/`

### How to Add Assets

```bash
# Create assets directory
mkdir -p website/assets/screenshots

# Add your images
# Then update index.html to reference them
```

## 🚀 Deployment Instructions

### Option 1: GitHub Pages (Recommended)

1. **Enable GitHub Pages:**
   - Go to repository Settings
   - Navigate to "Pages"
   - Source: Select your branch (e.g., `main`)
   - Folder: Select `/website`
   - Save

2. **Wait for Deployment:**
   - GitHub will build and deploy automatically
   - Check status in Actions tab
   - Site will be live at: `https://jasjeevsingh.github.io/rani/`

3. **Custom Domain (Optional):**
   - Add custom domain in Settings → Pages
   - Create `CNAME` file in website directory with your domain
   - Configure DNS with your domain provider

### Option 2: Other Static Hosts

**Netlify:**
```bash
# Deploy from CLI
npm install -g netlify-cli
netlify deploy --dir=website --prod
```

**Vercel:**
```bash
# Deploy from CLI
npm install -g vercel
vercel --prod website/
```

**Cloudflare Pages:**
- Connect your GitHub repo
- Set build directory to `website`
- Deploy

## 🛠️ Local Development

Test the website locally before deploying:

**Python:**
```bash
cd website
python3 -m http.server 8000
# Visit http://localhost:8000
```

**Node.js:**
```bash
cd website
npx serve
```

**PHP:**
```bash
cd website
php -S localhost:8000
```

**VS Code Live Server:**
- Install "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

## 🎨 Customization Guide

### Update Colors

Edit CSS variables in `styles.css`:
```css
:root {
    --primary-blue: #3B82F6;
    --primary-purple: #8B5CF6;
    /* ... more colors ... */
}
```

### Update Content

Edit `index.html`:
- Hero section: Lines 47-94
- Features: Lines 97-204
- Comparison: Lines 207-257
- Use Cases: Lines 260-315
- Download: Lines 318-349
- Footer: Lines 352-412

### Update Functionality

Edit `script.js`:
- OS detection: Lines 16-37
- GitHub API: Lines 52-67
- Animations: Lines 92-105

## 📊 Performance Checklist

- [x] Minified CSS (manual minification recommended for production)
- [x] Optimized fonts (using Google Fonts with preconnect)
- [x] Lazy loading (Intersection Observer for animations)
- [x] Responsive images (add when images included)
- [ ] Image compression (compress before adding)
- [ ] Service Worker (optional for offline support)

## 🧪 Testing Checklist

Before going live, test:

- [ ] **Browsers:** Chrome, Firefox, Safari, Edge
- [ ] **Devices:** Desktop, tablet, mobile
- [ ] **Mobile Menu:** Opens/closes correctly
- [ ] **Download Buttons:** OS detection works
- [ ] **GitHub API:** Star count loads
- [ ] **Smooth Scrolling:** Anchor links work
- [ ] **Responsive Design:** All breakpoints
- [ ] **SEO:** Run Lighthouse audit (aim for 90+)
- [ ] **Accessibility:** WAVE tool, keyboard navigation
- [ ] **Load Time:** < 3 seconds on 3G

## 📈 Analytics Setup (Optional)

Add analytics to track visitors:

**Plausible (Privacy-friendly, GDPR compliant):**
```html
<script defer data-domain="jasjeevsingh.github.io" 
        src="https://plausible.io/js/script.js"></script>
```

**Google Analytics:**
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

Add before `</head>` in `index.html`.

## 🔧 Advanced Features (Future)

Consider adding:

- [ ] **Blog Section** - Tutorials, use cases, updates
- [ ] **Documentation Pages** - Getting started, API reference
- [ ] **Demo Video** - Embedded YouTube/Vimeo
- [ ] **Community Page** - Discord, GitHub Discussions
- [ ] **Testimonials** - User quotes and case studies
- [ ] **Changelog** - Release notes
- [ ] **Newsletter Signup** - Email list (Mailchimp, ConvertKit)
- [ ] **Dark Mode Toggle** - User preference
- [ ] **Search Functionality** - If content grows
- [ ] **Multi-language** - i18n support

## 📝 Content Writing Tips

For future blog posts or additional pages:

1. **Focus on Use Cases**
   - How PhD students use RANI
   - Literature review workflows
   - Meeting transcription tips

2. **Technical Deep Dives**
   - How the context engine works
   - Vector embeddings explained
   - Privacy and security

3. **Comparisons**
   - RANI vs. Notion AI
   - RANI vs. Zotero
   - RANI vs. Obsidian + plugins

4. **Tutorials**
   - Getting started in 5 minutes
   - Setting up Ollama for local AI
   - Advanced annotation techniques

## 🤝 Contributing

To improve the website:

1. Fork the repository
2. Create a feature branch
3. Make your changes in the `website` directory
4. Test locally
5. Submit a pull request

## 📄 License

This website is part of the RANI project and is licensed under GPL-3.0.

## 🎉 Launch Checklist

When ready to announce the website:

- [ ] All content proofread
- [ ] Assets added (images, favicon)
- [ ] Tested on multiple devices/browsers
- [ ] Lighthouse score 90+ (Performance, SEO, Accessibility)
- [ ] Analytics configured
- [ ] GitHub Pages deployed successfully
- [ ] Social media graphics prepared
- [ ] Product Hunt post drafted
- [ ] Hacker News post drafted
- [ ] Email announcement drafted
- [ ] README.md in root updated with website link

---

## 🚀 Quick Deploy Commands

```bash
# 1. Navigate to repo root
cd /Users/jasjeev/Documents/GitHub/rani

# 2. Ensure website files are in the website directory
ls website/

# 3. Commit changes
git add website/
git commit -m "Add RANI landing page website"

# 4. Push to GitHub
git push origin sidebar-ui

# 5. Enable GitHub Pages in repo settings
# Settings → Pages → Source: sidebar-ui branch → Folder: /website → Save

# 6. Wait 2-3 minutes, then visit:
# https://jasjeevsingh.github.io/rani/
```

---

**Questions or Issues?**  
Open an issue on GitHub or reach out to the RANI team.

Built with ❤️ for the research community 🎓
