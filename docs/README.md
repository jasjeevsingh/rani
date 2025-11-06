# RANI Website

This is the landing page for RANI - Your AI Research Copilot.

## 🚀 Deployment

This website is designed to be deployed on GitHub Pages as a project site.

### Setting Up GitHub Pages

1. **Enable GitHub Pages:**
   - Go to your repository settings: `https://github.com/jasjeevsingh/rani/settings`
   - Navigate to "Pages" in the left sidebar
   - Under "Source", select the branch you want to deploy (e.g., `main` or `sidebar-ui`)
   - Under "Folder", select `/website`
   - Click "Save"

2. **Access Your Site:**
   - Your site will be available at: `https://jasjeevsingh.github.io/rani/`
   - It may take a few minutes for the site to go live initially

3. **Custom Domain (Optional):**
   - If you have a custom domain, add it in the "Custom domain" field
   - Create a `CNAME` file in the `website` directory with your domain

## 📁 File Structure

```
website/
├── index.html          # Main landing page
├── styles.css          # All CSS styles
├── script.js           # JavaScript functionality
├── README.md           # This file
└── assets/             # Images and media (to be added)
    ├── og-image.png    # Open Graph image for social sharing
    ├── screenshots/    # Product screenshots
    └── icons/          # Additional icons
```

## 🎨 Features

- **Responsive Design:** Mobile-first design that works on all devices
- **OS Detection:** Automatically detects user's OS and shows relevant download button
- **GitHub Integration:** Fetches live star count from GitHub API
- **SEO Optimized:** Meta tags, Open Graph, and Twitter Card support
- **Smooth Animations:** Intersection Observer for fade-in effects
- **Accessible:** Semantic HTML and ARIA labels

## 🛠️ Customization

### Update Content

Edit `index.html` to modify:
- Hero section text
- Features descriptions
- Use cases
- Download links
- Footer information

### Update Styles

Edit `styles.css` to customize:
- Colors (CSS variables in `:root`)
- Typography
- Spacing
- Animations

### Update Functionality

Edit `script.js` to modify:
- OS detection logic
- GitHub API integration
- Smooth scrolling behavior
- Mobile menu functionality

## 📸 Adding Images

To add images for your website:

1. Create an `assets` folder in the `website` directory
2. Add your images (screenshots, icons, etc.)
3. Update the `src` attributes in `index.html`

### Recommended Images

**Open Graph Image** (`assets/og-image.png`):
- Size: 1200x630px
- Shows preview when shared on social media
- Should include RANI logo and tagline

**Product Screenshots**:
- Main window with Ask sidebar
- Research view with paper results
- PDF annotation interface
- Listen mode transcription
- Settings panel

**Demo Video** (optional):
- 30-second hero video
- Can be hosted on YouTube/Vimeo and embedded

## 🔧 Local Development

To test the website locally:

1. **Using Python:**
   ```bash
   cd website
   python -m http.server 8000
   # Visit http://localhost:8000
   ```

2. **Using Node.js:**
   ```bash
   cd website
   npx serve
   # Visit the URL shown in terminal
   ```

3. **Using VS Code:**
   - Install the "Live Server" extension
   - Right-click on `index.html` → "Open with Live Server"

## 📊 Analytics (Optional)

To add analytics to track visitors:

1. **Plausible Analytics (Privacy-friendly):**
   ```html
   <script defer data-domain="jasjeevsingh.github.io" 
           src="https://plausible.io/js/script.js"></script>
   ```

2. **Google Analytics:**
   ```html
   <!-- Google tag (gtag.js) -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=YOUR-GA-ID"></script>
   ```

Add the script before the closing `</head>` tag in `index.html`.

## 🚀 Performance Tips

1. **Optimize Images:**
   - Use WebP format for better compression
   - Compress images with tools like TinyPNG
   - Use appropriate dimensions (don't serve 4K images for thumbnails)

2. **Enable Caching:**
   - GitHub Pages automatically caches static assets
   - Use cache-busting for updates: `styles.css?v=2`

3. **Minimize CSS/JS:**
   - For production, consider minifying files
   - Remove unused CSS
   - Combine multiple files if needed

## 🎯 SEO Checklist

- [x] Meta description
- [x] Open Graph tags
- [x] Twitter Card tags
- [x] Semantic HTML5
- [x] Alt text for images (add when images are included)
- [x] Sitemap.xml (create if multiple pages added)
- [x] Robots.txt (create if needed)
- [x] Mobile responsive
- [x] Fast loading time

## 📝 TODO

- [ ] Add product screenshots
- [ ] Create Open Graph image (1200x630px)
- [ ] Record demo video
- [ ] Add favicon
- [ ] Create sitemap.xml
- [ ] Test on multiple devices/browsers
- [ ] Run Lighthouse audit
- [ ] Add schema.org markup for rich snippets
- [ ] Create blog section (optional)
- [ ] Add changelog/release notes page

## 🤝 Contributing

To improve the website:

1. Make your changes in the `website` directory
2. Test locally
3. Commit and push to the repository
4. GitHub Pages will automatically update

## 📄 License

This website is part of the RANI project and follows the same GPL-3.0 license.

---

Built with ❤️ for the research community
