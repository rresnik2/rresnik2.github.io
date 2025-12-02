// Wait for page to load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Portfolio loaded!');

    // === SMOOTH SCROLLING ===
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

window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (scrollY >= (sectionTop - 100)) {
            current = section.getAttribute('id');
        }
    });
});
});