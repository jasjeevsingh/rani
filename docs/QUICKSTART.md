# Quick Start Guide - RANI Website

**Your website is ready! 🎉**

## What's Been Built

✅ **Complete Landing Page** (`index.html`)
- Hero section with compelling copy
- 6 feature cards with detailed descriptions
- Comparison table (RANI vs. Traditional Tools)
- 3 use case sections (Students, Researchers, Industry)
- Download section with OS detection
- Professional footer

✅ **Design System** (`styles.css`)
- Modern, clean aesthetic
- Blue/purple gradient theme
- Fully responsive (mobile, tablet, desktop)
- Smooth animations and transitions
- Optimized typography

✅ **Interactive Features** (`script.js`)
- Mobile menu toggle
- OS detection for download buttons
- Live GitHub star count
- Smooth scrolling to sections
- Fade-in animations

✅ **SEO & Performance**
- Meta tags and Open Graph
- Sitemap.xml and robots.txt
- Fast loading, optimized code
- Accessibility features

---

## 🚀 Deploy in 5 Minutes

### Step 1: Review the Website Locally

```bash
cd website
python3 -m http.server 8000
# Open http://localhost:8000 in your browser
```

### Step 2: Add Images (Optional but Recommended)

**Priority: Create an Open Graph image**
- Use [Canva](https://canva.com) (free templates)
- Size: 1200 x 630 pixels
- Include RANI logo + tagline
- Save as `website/assets/og-image.png`

**Generate a Favicon**
- Use [Favicon.io](https://favicon.io/)
- Upload your logo
- Download all sizes
- Place in `website/assets/`

See `website/assets/README.md` for detailed instructions.

### Step 3: Commit & Push

```bash
# From repo root
cd /Users/jasjeev/Documents/GitHub/rani

# Add all website files
git add website/

# Commit with descriptive message
git commit -m "Add RANI landing page website

Complete landing page with:
- Hero, features, comparison, use cases, download sections
- Responsive design for all devices
- SEO optimization and performance
- OS detection and GitHub API integration"

# Push to your branch
git push origin sidebar-ui
```

### Step 4: Enable GitHub Pages

1. Go to: https://github.com/jasjeevsingh/rani/settings/pages
2. Under "Source":
   - **Branch:** `sidebar-ui` (or your main branch)
   - **Folder:** `/website`
3. Click **Save**
4. Wait 2-3 minutes

### Step 5: Visit Your Live Site!

Your website will be live at:
**https://jasjeevsingh.github.io/rani/**

---

## 📁 File Structure

```
website/
├── index.html              # Main landing page
├── styles.css              # All CSS styles
├── script.js               # JavaScript functionality
├── sitemap.xml             # SEO sitemap
├── robots.txt              # Search engine instructions
├── .nojekyll               # GitHub Pages config
├── README.md               # Website documentation
├── DEPLOYMENT.md           # Detailed deployment guide
├── LAUNCH_CHECKLIST.md     # Pre-launch checklist
└── assets/                 # Images and media
    └── README.md           # Asset guidelines
```

---

## ✏️ Customization Guide

### Update Text Content

**Edit `index.html`:**

**Hero Section** (lines 47-94):
```html
<h1 class="hero-title">Your AI Research Copilot</h1>
<p class="hero-subtitle">
    RANI transforms your desktop into...
</p>
```

**Features** (lines 97-204):
Each feature card has:
- Icon (emoji or can replace with image)
- Title
- Description
- Feature list

**Download Links:**
Update GitHub release URLs:
```html
<a href="https://github.com/jasjeevsingh/rani/releases/latest">
```

### Update Colors

**Edit `styles.css` (lines 10-20):**
```css
:root {
    --primary-blue: #3B82F6;      /* Change to your brand color */
    --primary-purple: #8B5CF6;    /* Accent color */
    /* ... more colors ... */
}
```

### Add Analytics

**Add before `</head>` in `index.html`:**

**Plausible (recommended):**
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

---

## 🎯 Next Steps

### Immediate (Before Launch)
1. [ ] Create Open Graph image (`assets/og-image.png`)
2. [ ] Generate favicon (all sizes)
3. [ ] Take product screenshots (optional)
4. [ ] Test on mobile device
5. [ ] Run Lighthouse audit (aim for 90+)

### Short-term (First Week)
1. [ ] Announce on Product Hunt
2. [ ] Post on Hacker News
3. [ ] Share on social media
4. [ ] Update main README with website link
5. [ ] Write "Getting Started" blog post

### Long-term (First Month)
1. [ ] Add demo video
2. [ ] Create documentation pages
3. [ ] Set up blog section (optional)
4. [ ] Collect and add user testimonials
5. [ ] Build email list for updates

---

## 🧪 Testing Checklist

Before going live:

- [ ] Test on Chrome, Firefox, Safari, Edge
- [ ] Test on mobile (iPhone, Android)
- [ ] Click all links - verify they work
- [ ] Test download button - shows correct OS
- [ ] Check GitHub star count loads
- [ ] Verify mobile menu opens/closes
- [ ] Scroll through all sections smoothly
- [ ] Check for typos
- [ ] Run Lighthouse audit
- [ ] Test page load speed (< 3 seconds)

---

## 🐛 Troubleshooting

**Website doesn't load:**
- Wait 5 minutes after enabling GitHub Pages
- Check Settings → Pages for error messages
- Verify branch and folder are correct

**Images don't show:**
- Check file paths (case-sensitive)
- Ensure images are in `assets/` folder
- Commit and push images to Git

**GitHub stars don't load:**
- Check browser console (F12) for errors
- API rate limit: 60 requests/hour
- Verify repo name is correct in `script.js`

**Mobile menu not working:**
- Clear browser cache
- Check JavaScript console for errors
- Test on actual device (not just browser resize)

---

## 📚 Documentation

**Detailed Guides:**
- `DEPLOYMENT.md` - Comprehensive deployment instructions
- `LAUNCH_CHECKLIST.md` - Complete pre-launch checklist
- `assets/README.md` - Image creation guidelines

**External Resources:**
- [GitHub Pages Docs](https://docs.github.com/en/pages)
- [MDN Web Docs](https://developer.mozilla.org/)
- [Web.dev](https://web.dev/) - Performance guides

---

## 💡 Pro Tips

1. **Deploy Early:** Get the site live ASAP, then iterate
2. **Mobile First:** 60%+ of traffic will be mobile
3. **Fast Loading:** Every 100ms delay = 1% conversion loss
4. **Clear CTA:** Make download button impossible to miss
5. **Social Proof:** Add GitHub stars, user counts, testimonials
6. **Regular Updates:** Keep content fresh with blog posts

---

## 🎉 You're All Set!

Your RANI website is production-ready. Here's what to do now:

1. **Test locally** - Make sure everything looks good
2. **Add images** - At minimum, create an Open Graph image
3. **Deploy** - Follow Step 3 above to push to GitHub
4. **Enable GitHub Pages** - Follow Step 4 above
5. **Share** - Announce your beautiful new website!

---

## 📞 Need Help?

- Check the detailed documentation files
- Open an issue on GitHub
- Review the code comments
- Test locally before deploying

**Remember:** The website is already functional and looks professional. You can launch it right now and add images later if needed.

---

**Built with ❤️ for the research community**

*Good luck with your launch! 🚀*
