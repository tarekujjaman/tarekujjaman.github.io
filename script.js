// Dynamic Year
document.getElementById('year').textContent = new Date().getFullYear();

// Typed Effect
const phrases = [
  'Building data-driven products',
  'Turning analysis into action',
  'Shipping features users love',
  'Transforming data into insights'
];
let p = 0, i = 0, fwd = true, hold = 0;
const el = document.getElementById('typed');
function tick() {
  const word = phrases[p];
  if (fwd) {
    i++;
    if (i === word.length + 8) { fwd = false; hold = 6; }
  } else {
    if (hold > 0) { hold--; }
    else { i--; if (i <= 0) { fwd = true; p = (p + 1) % phrases.length; } }
  }
  el.textContent = word.slice(0, Math.max(0, Math.min(i, word.length)));
  requestAnimationFrame(() => setTimeout(tick, 80));
}
tick();

// Scroll progress indicator
window.addEventListener('scroll', () => {
  const winHeight = window.innerHeight;
  const docHeight = document.documentElement.scrollHeight;
  const scrolled = window.scrollY;
  const progress = (scrolled / (docHeight - winHeight)) * 100;
  document.querySelector('.scroll-progress').style.width = `${progress}%`;
});

// Reveal on Scroll
function inView($el) {
  const rect = $el[0].getBoundingClientRect();
  return rect.top < window.innerHeight - 80;
}
function reveal() {
  $('.reveal').each(function () {
    const $t = $(this);
    if (!$t.hasClass('show') && inView($t)) $t.addClass('show');
  });
}
$(document).on('scroll', reveal);
$(reveal);

// Update Active Nav Link
const sections = ['home', 'about', 'experience', 'skills', 'projects', 'certs', 'contact'];
function updateActive() {
  let current = 'home';
  sections.forEach(id => {
    const y = document.getElementById(id).getBoundingClientRect().top;
    if (y <= 120) current = id;
  });
  $('.nav-link').removeClass('active');
  $(`.nav-link[href="#${current}"]`).addClass('active');
}
document.addEventListener('scroll', updateActive);
updateActive();

// Animate counter values
function animateCounter() {
  const counters = document.querySelectorAll('.counter');
  const speed = 200;
  
  counters.forEach(counter => {
    const target = +counter.getAttribute('data-target');
    const count = +counter.innerText;
    const increment = Math.ceil(target / speed);
    
    if (count < target && inView($(counter))) {
      counter.innerText = Math.min(count + increment, target);
      setTimeout(() => animateCounter(), 1);
    }
  });
}

// Initialize counter animation when in view
$(document).on('scroll', animateCounter);
$(animateCounter);

// CV download simulation (since we don't have the actual file)
document.querySelector('.cv-download').addEventListener('click', function(e) {
  e.preventDefault();
  
  this.innerHTML = '<i class="bi bi-check-circle"></i> CV Downloaded';
  this.classList.add('btn-success');
  this.classList.remove('btn-outline-light');
  
  setTimeout(() => {
    this.innerHTML = '<i class="bi bi-file-earmark-arrow-down"></i> Download CV';
    this.classList.remove('btn-success');
    this.classList.add('btn-outline-light');
  }, 3000);
});

// Smooth scrolling for navbar links
document.querySelectorAll('a.nav-link').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const targetId = this.getAttribute('href');
    const targetSection = document.querySelector(targetId);
    window.scrollTo({
      top: targetSection.offsetTop - 80,
      behavior: 'smooth'
    });
    
    // Close mobile navbar if open
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');
    if (navbarCollapse.classList.contains('show')) {
      navbarToggler.click();
    }
  });
});

// Add subtle animation to skills on hover
document.querySelectorAll('.skill').forEach(skill => {
  skill.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-5px)';
    this.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
  });
  
  skill.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0)';
    this.style.boxShadow = 'none';
  });
});

// Parallax effect for hero section
window.addEventListener('scroll', () => {
  const scrolled = window.pageYOffset;
  const hero = document.querySelector('.hero');
  const rate = scrolled * -0.5;
  hero.style.backgroundPosition = `center ${rate}px`;
});

// Initialize animations after page load
window.addEventListener('load', () => {
  // Add loaded class to body for transition effects
  document.body.classList.add('loaded');
  
  // Animate hero content
  const heroContent = document.querySelector('.hero .row');
  heroContent.style.opacity = 1;
  heroContent.style.transform = 'translateY(0)';
});