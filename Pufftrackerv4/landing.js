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

    if (heroSmokedToday) {
        let count = 0;
        const targetCount = 5;
        const interval = setInterval(() => {
            heroSmokedToday.textContent = count;
            if (count < targetCount) {
                count++;
            } else {
                clearInterval(interval);
            }
        }, 150);
    }

    if (heroCigsSaved) {
        let count = 0;
        const targetCount = 150;
        const interval = setInterval(() => {
            heroCigsSaved.textContent = count;
            if (count < targetCount) {
                count += 5;
            } else {
                heroCigsSaved.textContent = targetCount;
                clearInterval(interval);
            }
        }, 50);
    }

    if (heroMoneySaved) {
        let count = 0;
        const targetCount = 75;
        const interval = setInterval(() => {
            heroMoneySaved.textContent = `$${count}`;
            if (count < targetCount) {
                count += 3;
            } else {
                heroMoneySaved.textContent = `$${targetCount}`;
                clearInterval(interval);
            }
        }, 50);
    }

    if (heroLongestStreak) {
        let count = 0;
        const targetCount = 30;
        const interval = setInterval(() => {
            heroLongestStreak.textContent = `${count}d`;
            if (count < targetCount) {
                count++;
            } else {
                heroLongestStreak.textContent = `${targetCount}d`;
                clearInterval(interval);
            }
        }, 100);
    }

    // Smooth scrolling for navigation links
    document.querySelectorAll('.nav-links a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
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
                            color: '#a0a0a0'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#a0a0a0',
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
                // If not mobile, clear interval and reset transform for desktop view
                clearInterval(slideInterval);
                slidesWrapper.style.transform = `translateX(0)`; 
                return;
            }

            // Only update slider transform if it's the mobile breakpoint
            if (slides.length > 0) {
                const slideWidth = slides[0].offsetWidth; // Get width of one slide
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
            currentSlide = (currentSlide + 1) % slides.length; // Loop back to first slide
            updateSlider();
        };

        const showPrevSlide = () => {
            currentSlide = (currentSlide - 1 + slides.length) % slides.length; // Loop back to last slide
            updateSlider();
        };

        // Auto-sliding functionality
        const startAutoSlide = () => {
            clearInterval(slideInterval); // Clear any existing interval
            if (isMobileBreakpoint()) { // Only auto-slide on mobile
                slideInterval = setInterval(showNextSlide, 4000); // Change slide every 4 seconds
            }
        };

        const stopAutoSlide = () => {
            clearInterval(slideInterval);
        };

        if (prevArrow && nextArrow) {
            prevArrow.addEventListener('click', showPrevSlide);
            nextArrow.addEventListener('click', showNextSlide);

            // Stop auto-slide on manual interaction
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
                    stopAutoSlide(); // Stop auto-slide on manual interaction
                    startAutoSlide(); // Restart after a brief pause
                });
                dot.addEventListener('mouseover', stopAutoSlide);
                dot.addEventListener('mouseout', startAutoSlide);
            });
        }

        // Initial update and on resize
        window.addEventListener('resize', () => {
            updateSlider();
            if (isMobileBreakpoint()) {
                startAutoSlide(); // Start/restart auto-slide if entering mobile view
            } else {
                stopAutoSlide(); // Stop auto-slide if entering desktop view
            }
        });
        
        // Initial call to set up the slider and start auto-slide if applicable
        updateSlider(); 
        startAutoSlide();
    }
});