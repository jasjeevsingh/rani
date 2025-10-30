// Mobile Menu Toggle
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');

mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('active');
    mobileMenuBtn.classList.toggle('active');
});

// Close mobile menu when clicking on a link
const mobileMenuLinks = document.querySelectorAll('.mobile-menu-link');
mobileMenuLinks.forEach(link => {
    link.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        mobileMenuBtn.classList.remove('active');
    });
});

// OS Detection for Download Buttons
function detectOS() {
    const userAgent = window.navigator.userAgent;
    const platform = window.navigator.platform;
    const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
    const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];
    const iosPlatforms = ['iPhone', 'iPad', 'iPod'];
    
    let os = 'Unknown';
    
    if (macosPlatforms.indexOf(platform) !== -1) {
        os = 'Mac';
    } else if (iosPlatforms.indexOf(platform) !== -1) {
        os = 'iOS';
    } else if (windowsPlatforms.indexOf(platform) !== -1) {
        os = 'Windows';
    } else if (/Android/.test(userAgent)) {
        os = 'Android';
    } else if (/Linux/.test(platform)) {
        os = 'Linux';
    }
    
    return os;
}

// Update Download Button Text Based on OS
function updateDownloadButtons() {
    const os = detectOS();
    const downloadTexts = document.querySelectorAll('#downloadText, #downloadBtnText');
    
    downloadTexts.forEach(element => {
        if (os === 'Windows') {
            element.textContent = 'Download for Windows';
        } else if (os === 'Linux') {
            element.textContent = 'Download for Linux';
        } else if (os === 'Mac') {
            element.textContent = 'Download for Mac';
        } else {
            element.textContent = 'Download RANI';
        }
    });
}

// Fetch GitHub Stars
async function fetchGitHubStars() {
    try {
        const response = await fetch('https://api.github.com/repos/jasjeevsingh/rani');
        const data = await response.json();
        const stars = data.stargazers_count || 0;
        const forks = data.forks_count || 0;
        
        const starsElement = document.getElementById('githubStars');
        if (starsElement) {
            starsElement.textContent = stars > 0 ? stars.toLocaleString() : 'Star Us';
        }
        
        // Optional: Update other stats if needed
        console.log('GitHub Stats:', { stars, forks });
    } catch (error) {
        console.error('Error fetching GitHub stats:', error);
        const starsElement = document.getElementById('githubStars');
        if (starsElement) {
            starsElement.textContent = 'Star Us';
        }
    }
}

// Smooth Scroll for Anchor Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        
        // Don't prevent default for empty hash
        if (href === '#') return;
        
        e.preventDefault();
        const target = document.querySelector(href);
        
        if (target) {
            const navbarHeight = document.querySelector('.navbar').offsetHeight;
            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight - 20;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Intersection Observer for Fade-in Animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe feature cards, use case cards, etc.
const animatedElements = document.querySelectorAll(
    '.feature-card, .use-case-card, .comparison-table'
);

animatedElements.forEach(el => {
    observer.observe(el);
});

// Navbar Background on Scroll
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 50) {
        navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.boxShadow = 'none';
    }
    
    lastScroll = currentScroll;
});

// Initialize on Page Load
document.addEventListener('DOMContentLoaded', () => {
    updateDownloadButtons();
    fetchGitHubStars();
    
    // Add fade-in to hero content
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        heroContent.classList.add('fade-in');
    }
});

// Handle window resize
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        // Close mobile menu on resize to desktop
        if (window.innerWidth >= 768) {
            mobileMenu.classList.remove('active');
            mobileMenuBtn.classList.remove('active');
        }
    }, 250);
});

// Easter egg: Console message
console.log('%c🚀 RANI - Your AI Research Copilot', 'color: #2563EB; font-size: 20px; font-weight: bold;');
console.log('%cBuilt for the research community', 'color: #7C3AED; font-size: 14px;');
console.log('%cContribute on GitHub: https://github.com/jasjeevsingh/rani', 'color: #059669; font-size: 12px;');
