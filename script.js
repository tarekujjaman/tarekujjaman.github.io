/**
 * Neural Network Portfolio - Interactive JavaScript
 * AI-First Futuristic Design
 */

// ================================================
// NEURAL NETWORK BACKGROUND ANIMATION
// ================================================
class NeuralNetwork {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.nodes = [];
        this.connections = [];
        this.mouse = { x: null, y: null, radius: 150 };
        this.animationId = null;

        this.resize();
        this.init();
        this.animate();

        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
        window.addEventListener('mouseout', () => {
            this.mouse.x = null;
            this.mouse.y = null;
        });
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.init();
    }

    init() {
        this.nodes = [];
        const numNodes = Math.min(80, Math.floor((this.canvas.width * this.canvas.height) / 15000));

        for (let i = 0; i < numNodes; i++) {
            this.nodes.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 2 + 1,
                color: this.getRandomColor()
            });
        }
    }

    getRandomColor() {
        const colors = [
            'rgba(0, 212, 255, 0.8)',   // Neural blue
            'rgba(168, 85, 247, 0.8)',   // Neural purple
            'rgba(236, 72, 153, 0.6)',   // Neural pink
            'rgba(34, 197, 94, 0.6)'     // Neural green
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update and draw nodes
        this.nodes.forEach((node, i) => {
            // Move nodes
            node.x += node.vx;
            node.y += node.vy;

            // Bounce off walls
            if (node.x < 0 || node.x > this.canvas.width) node.vx *= -1;
            if (node.y < 0 || node.y > this.canvas.height) node.vy *= -1;

            // Mouse interaction
            if (this.mouse.x && this.mouse.y) {
                const dx = this.mouse.x - node.x;
                const dy = this.mouse.y - node.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < this.mouse.radius) {
                    const force = (this.mouse.radius - dist) / this.mouse.radius;
                    node.x -= dx * force * 0.02;
                    node.y -= dy * force * 0.02;
                }
            }

            // Draw node
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = node.color;
            this.ctx.fill();

            // Draw connections
            for (let j = i + 1; j < this.nodes.length; j++) {
                const other = this.nodes[j];
                const dx = node.x - other.x;
                const dy = node.y - other.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 150) {
                    const opacity = (1 - dist / 150) * 0.3;
                    this.ctx.beginPath();
                    this.ctx.moveTo(node.x, node.y);
                    this.ctx.lineTo(other.x, other.y);
                    this.ctx.strokeStyle = `rgba(0, 212, 255, ${opacity})`;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.stroke();
                }
            }
        });

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}

// Initialize Neural Network
const neuralCanvas = document.getElementById('neural-canvas');
if (neuralCanvas) {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
        new NeuralNetwork(neuralCanvas);
    }
}

// ================================================
// DYNAMIC YEAR
// ================================================
document.getElementById('year').textContent = new Date().getFullYear();

// ================================================
// TYPED TEXT EFFECT
// ================================================
const phrases = [
    'Building AI-powered products',
    'Driving 200K+ subscriptions',
    'Leading cross-functional teams',
    'Turning data into decisions',
    'Shipping features users love'
];

let phraseIndex = 0;
let charIndex = 0;
let isDeleting = false;
let holdCount = 0;
const typedElement = document.getElementById('typed');

function typeEffect() {
    const currentPhrase = phrases[phraseIndex];

    if (isDeleting) {
        if (holdCount > 0) {
            holdCount--;
        } else {
            charIndex--;
            if (charIndex <= 0) {
                isDeleting = false;
                phraseIndex = (phraseIndex + 1) % phrases.length;
            }
        }
    } else {
        charIndex++;
        if (charIndex === currentPhrase.length) {
            isDeleting = true;
            holdCount = 20; // Hold at full text
        }
    }

    typedElement.textContent = currentPhrase.substring(0, charIndex);

    const speed = isDeleting && holdCount === 0 ? 40 : 70;
    setTimeout(typeEffect, speed);
}

typeEffect();

// ================================================
// SCROLL PROGRESS BAR
// ================================================
window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (scrollTop / docHeight) * 100;
    document.querySelector('.scroll-progress').style.width = `${Math.min(progress, 100)}%`;
});

// ================================================
// NAVBAR SCROLL EFFECT
// ================================================
const navbar = document.querySelector('.navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;

    if (currentScroll > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
});

// ================================================
// REVEAL ON SCROLL (Intersection Observer)
// ================================================
const revealObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
            }
        });
    },
    {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    }
);

document.querySelectorAll('.reveal').forEach((el) => {
    revealObserver.observe(el);
});

// ================================================
// ACTIVE NAVIGATION (Dot Nav + Main Nav)
// ================================================
const sections = ['home', 'about', 'experience', 'skills', 'projects', 'certs', 'contact'];
const navLinks = document.querySelectorAll('.nav-link');
const dotNavLinks = document.querySelectorAll('.dot-nav a');

function updateActiveNav() {
    const scrollPos = window.scrollY + 200;
    let current = 'home';

    sections.forEach((id) => {
        const section = document.getElementById(id);
        if (section && section.offsetTop <= scrollPos) {
            current = id;
        }
    });

    // Update main nav
    navLinks.forEach((link) => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });

    // Update dot nav
    dotNavLinks.forEach((link) => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
}

window.addEventListener('scroll', updateActiveNav);
updateActiveNav();

// ================================================
// SMOOTH SCROLLING
// ================================================
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);

        if (targetElement) {
            const navHeight = navbar.offsetHeight;
            const targetPosition = targetElement.offsetTop - navHeight - 20;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });

            // Close mobile nav if open
            const navCollapse = document.querySelector('.navbar-collapse');
            if (navCollapse && navCollapse.classList.contains('show')) {
                document.querySelector('.navbar-toggler').click();
            }
        }
    });
});

// ================================================
// CV DOWNLOAD BUTTON
// ================================================
const cvButton = document.querySelector('.cv-download');
if (cvButton) {
    cvButton.addEventListener('click', function () {
        const btn = this;
        const originalHTML = btn.innerHTML;

        btn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Downloaded!';
        btn.classList.add('btn-primary');
        btn.classList.remove('btn-ghost');

        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-ghost');
        }, 3000);
    });
}

// ================================================
// STAT COUNTER ANIMATION
// ================================================
const statObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const stat = entry.target;
                const target = parseInt(stat.dataset.count) || 0;
                const suffix = stat.textContent.replace(/[0-9]/g, '');

                if (target > 0 && !stat.classList.contains('counted')) {
                    stat.classList.add('counted');
                    animateCounter(stat, 0, target, suffix, 1500);
                }
            }
        });
    },
    { threshold: 0.5 }
);

document.querySelectorAll('.stat-value[data-count]').forEach((stat) => {
    statObserver.observe(stat);
});

function animateCounter(element, start, end, suffix, duration) {
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (end - start) * easeProgress);

        element.textContent = current + suffix;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// ================================================
// SKILL NODE HOVER EFFECTS
// ================================================
document.querySelectorAll('.skill-node').forEach((node) => {
    node.addEventListener('mouseenter', function () {
        this.style.transform = 'translateY(-4px) scale(1.05)';
    });

    node.addEventListener('mouseleave', function () {
        this.style.transform = '';
    });
});

// ================================================
// GLASS CARD 3D TILT EFFECT
// ================================================
const tiltCards = document.querySelectorAll('.glass-card, .stat-card, .project-card, .skill-category');

tiltCards.forEach((card) => {
    card.addEventListener('mousemove', function (e) {
        if (window.innerWidth < 992) return; // Disable on mobile

        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = (y - centerY) / 20;
        const rotateY = (centerX - x) / 20;

        this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener('mouseleave', function () {
        this.style.transform = '';
    });
});

// ================================================
// TIMELINE ANIMATION
// ================================================
const timelineObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateX(0)';
            }
        });
    },
    { threshold: 0.2 }
);

document.querySelectorAll('.timeline-item').forEach((item, index) => {
    item.style.opacity = '0';
    item.style.transform = 'translateX(-20px)';
    item.style.transition = `all 0.6s ease ${index * 0.15}s`;
    timelineObserver.observe(item);
});

// ================================================
// CERTIFICATION CAROUSEL SCROLL
// ================================================
const certsScroll = document.querySelector('.certs-scroll');
if (certsScroll) {
    let isDown = false;
    let startX;
    let scrollLeft;

    certsScroll.addEventListener('mousedown', (e) => {
        isDown = true;
        startX = e.pageX - certsScroll.offsetLeft;
        scrollLeft = certsScroll.scrollLeft;
    });

    certsScroll.addEventListener('mouseleave', () => {
        isDown = false;
    });

    certsScroll.addEventListener('mouseup', () => {
        isDown = false;
    });

    certsScroll.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - certsScroll.offsetLeft;
        const walk = (x - startX) * 2;
        certsScroll.scrollLeft = scrollLeft - walk;
    });
}

// ================================================
// TOUCH SUPPORT FOR MOBILE
// ================================================
if ('ontouchstart' in window) {
    document.querySelectorAll('.glass-card, .stat-card, .project-card, .skill-category, .contact-card').forEach((el) => {
        el.addEventListener('touchstart', function () {
            this.style.transform = 'translateY(-4px)';
        }, { passive: true });

        el.addEventListener('touchend', function () {
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        }, { passive: true });
    });
}

// ================================================
// KEYBOARD NAVIGATION
// ================================================
document.addEventListener('keydown', (e) => {
    // Press 'h' to go home
    if (e.key === 'h' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Press numbers 1-7 to navigate sections
    if (!e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 7) {
            const section = document.getElementById(sections[num - 1]);
            if (section) {
                const navHeight = navbar.offsetHeight;
                window.scrollTo({
                    top: section.offsetTop - navHeight - 20,
                    behavior: 'smooth'
                });
            }
        }
    }
});

// ================================================
// PAGE LOAD ANIMATION
// ================================================
window.addEventListener('load', () => {
    document.body.classList.add('loaded');

    // Animate hero elements
    const heroElements = document.querySelectorAll('.hero-content > *');
    heroElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = `all 0.6s ease ${index * 0.1}s`;

        setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, 100);
    });

    // Animate stats grid
    const statsGrid = document.querySelector('.stats-grid');
    if (statsGrid) {
        statsGrid.style.opacity = '0';
        statsGrid.style.transform = 'translateY(20px)';
        statsGrid.style.transition = 'all 0.6s ease 0.5s';

        setTimeout(() => {
            statsGrid.style.opacity = '1';
            statsGrid.style.transform = 'translateY(0)';
        }, 100);
    }
});

// ================================================
// PREFERS REDUCED MOTION
// ================================================
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (reducedMotion.matches) {
    // Disable animations for users who prefer reduced motion
    document.querySelectorAll('.reveal').forEach((el) => {
        el.classList.add('show');
        el.style.transition = 'none';
    });

    document.querySelectorAll('.timeline-item').forEach((item) => {
        item.style.opacity = '1';
        item.style.transform = 'none';
        item.style.transition = 'none';
    });
}
