document.addEventListener('DOMContentLoaded', () => {
    // Header scroll effect
    const header = document.querySelector('.landing-header');
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 50);
    });

    // Intersection Observer for scroll animations
    const animateOnScrollElements = document.querySelectorAll('.animate-on-scroll');

    const observerOptions = {
        root: null, // relative to the viewport
        rootMargin: '0px',
        threshold: 0.1 // 10% of the element must be visible
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                // Don't unobserve if the animation is part of a slider or dynamic content,
                // as it might need to re-animate if slides change.
                // For general sections, unobserve is fine: observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    animateOnScrollElements.forEach(el => {
        observer.observe(el);
    });

    // Optional: Dynamic content for hero section (for demonstration, replace with real data)
    const heroSmokedToday = document.getElementById('hero-smoked-today');
    const heroAvgInterval = document.getElementById('hero-avg-interval');
    const heroCigsSaved = document.getElementById('hero-cigs-saved');
    const heroMoneySaved = document.getElementById('hero-money-saved');
    const heroLongestStreak = document.getElementById('hero-longest-streak');

    // Function to animate counter values
    function animateCounter(element, start, end, duration, prefix = '', suffix = '') {
        let current = start;
        const range = end - start;
        const increment = end > start ? 1 : -1;
        const stepTime = Math.abs(Math.floor(duration / range));

        const timer = setInterval(() => {
            current += increment;
            element.textContent = `${prefix}${current}${suffix}`;
            if (current === end) {
                clearInterval(timer);
            }
        }, stepTime);
    }

    // Trigger animations when hero visuals become visible (or on page load for initial view)
    const heroVisuals = document.querySelector('.hero-visual');
    if (heroVisuals) {
        const heroObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Only animate if not already animated or if a reset is needed
                    if (!heroVisuals.dataset.animated) {
                        if (heroSmokedToday) animateCounter(heroSmokedToday, 0, 5, 800);
                        if (heroAvgInterval) heroAvgInterval.textContent = '2h 15m'; // Static for demo
                        if (heroCigsSaved) animateCounter(heroCigsSaved, 0, 150, 1000);
                        if (heroMoneySaved) animateCounter(heroMoneySaved, 0, 75, 1200, '$');
                        if (heroLongestStreak) animateCounter(heroLongestStreak, 0, 30, 1000, '', 'd');
                        heroVisuals.dataset.animated = 'true'; // Mark as animated
                    }
                    heroObserver.unobserve(entry.target); // Stop observing once animated
                }
            });
        }, { threshold: 0.5 }); // Trigger when 50% of the element is visible
        heroObserver.observe(heroVisuals);
    }


    // Smooth scrolling for navigation links
    document.querySelectorAll('.nav-links a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                const headerOffset = document.querySelector('.landing-header').offsetHeight; // Get height of fixed header
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        });
    });

    // Initialize Daily Trend Chart (Chart.js)
    const ctx = document.getElementById('landingDailyTrendChart');
    if (ctx) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Cigarettes',
                    data: [12, 10, 8, 9, 7, 5, 4], // Example data showing a downward trend
                    borderColor: '#00ffab', // Your primary color
                    backgroundColor: 'rgba(0, 255, 171, 0.1)',
                    fill: true,
                    tension: 0.4, // Smoothness of the line
                    pointRadius: 4,
                    pointBackgroundColor: '#00ffab',
                    pointHoverRadius: 7,
                    pointHoverBorderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: 'var(--text-muted)'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: 'var(--text-muted)',
                            maxTicksLimit: 5
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        padding: 10,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return `Cigs: ${context.raw}`;
                            }
                        }
                    }
                },
                animation: {
                    duration: 1500,
                    easing: 'easeOutQuart'
                }
            }
        });
    }

    // How It Works Slider Logic (Responsive Only)
    const howItWorksSliderView = document.querySelector('#how-it-works .steps-slider-view');
    let slideInterval; // Variable to hold the auto-slide interval

    // Only proceed if the slider view exists
    if (howItWorksSliderView) {
        const slidesWrapper = howItWorksSliderView.querySelector('.slides-wrapper');
        const slides = howItWorksSliderView.querySelectorAll('.step');
        const prevArrow = howItWorksSliderView.querySelector('.prev-arrow');
        const nextArrow = howItWorksSliderView.querySelector('.next-arrow');
        const dotsContainer = howItWorksSliderView.querySelector('.slider-pagination');
        
        let currentSlide = 0;
        const isMobileBreakpoint = () => window.innerWidth <= 992; // Match CSS media query

        const updateSlider = () => {
            if (!isMobileBreakpoint()) {
                clearInterval(slideInterval);
                slidesWrapper.style.transform = `translateX(0)`; 
                return;
            }

            if (slides.length > 0) {
                const slideWidth = slides[0].offsetWidth; 
                slidesWrapper.style.transform = `translateX(${-currentSlide * slideWidth}px)`;

                // Update dots
                dotsContainer.querySelectorAll('.dot').forEach((dot, index) => {
                    if (index === currentSlide) {
                        dot.classList.add('active');
                    } else {
                        dot.classList.remove('active');
                    }
                });
            }

            // Manage arrow visibility based on current slide
            if (prevArrow) prevArrow.disabled = (currentSlide === 0);
            if (nextArrow) nextArrow.disabled = (currentSlide === slides.length - 1);
        };

        const showNextSlide = () => {
            currentSlide = (currentSlide + 1) % slides.length; 
            updateSlider();
        };

        const showPrevSlide = () => {
            currentSlide = (currentSlide - 1 + slides.length) % slides.length;
            updateSlider();
        };

        // Auto-sliding functionality
        const startAutoSlide = () => {
            clearInterval(slideInterval);
            if (isMobileBreakpoint()) {
                slideInterval = setInterval(showNextSlide, 4000);
            }
        };

        const stopAutoSlide = () => {
            clearInterval(slideInterval);
        };

        if (prevArrow && nextArrow) {
            prevArrow.addEventListener('click', (e) => { stopAutoSlide(); showPrevSlide(); startAutoSlide(); });
            nextArrow.addEventListener('click', (e) => { stopAutoSlide(); showNextSlide(); startAutoSlide(); });

            prevArrow.addEventListener('mouseover', stopAutoSlide);
            nextArrow.addEventListener('mouseover', stopAutoSlide);
            prevArrow.addEventListener('mouseout', startAutoSlide);
            nextArrow.addEventListener('mouseout', startAutoSlide);
        }

        if (dotsContainer) {
            dotsContainer.querySelectorAll('.dot').forEach(dot => {
                dot.addEventListener('click', (e) => {
                    currentSlide = parseInt(e.target.dataset.slide);
                    updateSlider();
                    stopAutoSlide();
                    startAutoSlide();
                });
                dot.addEventListener('mouseover', stopAutoSlide);
                dot.addEventListener('mouseout', startAutoSlide);
            });
        }

        // Initial call and on resize
        window.addEventListener('resize', () => {
            updateSlider();
            if (isMobileBreakpoint()) {
                startAutoSlide(); 
            } else {
                stopAutoSlide();
            }
        });
        
        updateSlider(); 
        startAutoSlide();
    }
});
