// Dynamic Year
document.getElementById('year').textContent = new Date().getFullYear();

// Typed Effect
const phrases = [
  'Building data-driven products',
  'Turning analysis into action',
  'Shipping features users love'
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
