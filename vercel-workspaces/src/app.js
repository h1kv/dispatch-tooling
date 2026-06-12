const header = document.getElementById('site-header');
const scrollButtons = document.querySelectorAll('[data-scroll-target]');
const revealItems = document.querySelectorAll('.reveal-on-scroll');
const navLinks = document.querySelectorAll('.nav-link');
const sections = Array.from(navLinks)
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);
const supporterButtons = document.querySelectorAll('.supporter');
const supporterStatus = document.getElementById('supporter-status');
const demoCards = document.querySelectorAll('.demo-card');

function updateHeaderShadow() {
  if (!header) return;
  header.classList.toggle('is-scrolled', window.scrollY > 8);
}

function scrollToSection(sectionId) {
  const target = document.getElementById(sectionId);
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setupRevealAnimations() {
  if (!revealItems.length) return;

  if (!('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14, rootMargin: '0px 0px -40px 0px' }
  );

  revealItems.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index * 45, 220)}ms`;
    observer.observe(item);
  });
}

function setupActiveNavigation() {
  if (!sections.length || !('IntersectionObserver' in window)) return;

  const navObserver = new IntersectionObserver(
    (entries) => {
      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (!visibleEntries.length) return;

      const activeId = visibleEntries[0].target.id;
      navLinks.forEach((link) => {
        link.classList.toggle('is-active', link.getAttribute('href') === `#${activeId}`);
      });
    },
    { threshold: [0.28, 0.45, 0.65], rootMargin: '-86px 0px -45% 0px' }
  );

  sections.forEach((section) => navObserver.observe(section));
}

function setupSmoothScrollControls() {
  scrollButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const sectionId = button.getAttribute('data-scroll-target');
      if (sectionId) scrollToSection(sectionId);
    });
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      const target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function setupSupporterInteractions() {
  supporterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const name = button.dataset.supporter || button.textContent.trim();
      supporterButtons.forEach((item) => item.classList.remove('is-active'));
      button.classList.add('is-active');
      if (supporterStatus) {
        supporterStatus.textContent = `${name} is highlighted as a notable supporter or mentor featured by Patch.`;
      }
    });
  });
}

function setupCardTapFeedback() {
  demoCards.forEach((card) => {
    card.addEventListener('pointerdown', () => {
      card.classList.add('is-tapped');
    });

    ['pointerup', 'pointerleave', 'blur'].forEach((eventName) => {
      card.addEventListener(eventName, () => {
        window.setTimeout(() => card.classList.remove('is-tapped'), 120);
      });
    });
  });
}

function initialize() {
  updateHeaderShadow();
  setupRevealAnimations();
  setupActiveNavigation();
  setupSmoothScrollControls();
  setupSupporterInteractions();
  setupCardTapFeedback();
  window.addEventListener('scroll', updateHeaderShadow, { passive: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}


