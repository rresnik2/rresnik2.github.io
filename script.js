// SIMPLE PORTFOLIO JAVASCRIPT
// Since you know arrow functions, this should feel familiar!

// Wait for page to load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Portfolio loaded!');

    // === SMOOTH SCROLLING ===
    // When you click a nav link, smoothly scroll to that section

    const links = document.querySelectorAll('nav a');

    links.forEach(link => {
        if (link.getAttribute('href').startsWith('#')) {
            link.addEventListener('click', (e) => {
                // Prevent the default jump behavior
                e.preventDefault();

                // Get the section we want to go to
                // If href="#about", this gets "about"
                const targetId = link.getAttribute('href').substring(1);
                const targetSection = document.getElementById(targetId);

                // Scroll smoothly to that section
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            });

        }
        
        
    
       
    });

// === SIMPLE SCROLL EFFECT ===
// Make project cards fade in when you scroll to them

const projectCards = document.querySelectorAll('.project-card');

// Function to check if element is in view
const isInViewport = (element) => {
    const rect = element.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
};

// Function to handle scroll
const handleScroll = () => {
    projectCards.forEach(card => {
        if (isInViewport(card)) {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }
    });
};

// Set initial state for cards
projectCards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(50px)';
    card.style.transition = 'opacity 1.5s, transform 1.5s';
});

// Listen for scroll events
window.addEventListener('scroll', handleScroll);

// Check on page load too
handleScroll();

// === ACTIVE NAV HIGHLIGHT ===
// Highlight which section is currently being viewed

const sections = document.querySelectorAll('section');
const navLinks = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
    let current = '';

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;

        if (scrollY >= (sectionTop - 100)) {
            current = section.getAttribute('id');
        }
    });

});
});