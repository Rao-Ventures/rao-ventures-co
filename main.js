/* ═══════════════════════════════════════════════════════════════
   Rao Ventures — Main JavaScript
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ── Navbar scroll effect ──────────────────────────────────────────
const navbar = document.getElementById('navbar');
if (navbar) {
  const onScroll = () => {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // Run once on load
}

// ── Mobile navigation toggle ──────────────────────────────────────
const navToggle = document.getElementById('nav-toggle');
const navMobileMenu = document.getElementById('nav-mobile-menu');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (navToggle && navMobileMenu) {
  const mobileViewport = window.matchMedia('(max-width: 768px)');
  navToggle.setAttribute('aria-controls', navMobileMenu.id);

  const setMenuOpen = (isOpen) => {
    navMobileMenu.classList.toggle('open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navMobileMenu.setAttribute('aria-hidden', String(!isOpen));

    const spans = navToggle.querySelectorAll('span');
    spans[0].style.transform = isOpen ? 'rotate(45deg) translate(5px, 5px)' : '';
    spans[1].style.opacity = isOpen ? '0' : '';
    spans[2].style.transform = isOpen ? 'rotate(-45deg) translate(5px, -5px)' : '';
  };

  navToggle.addEventListener('click', () => {
    setMenuOpen(navToggle.getAttribute('aria-expanded') !== 'true');
  });

  navbar.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
      setMenuOpen(false);
      navToggle.focus();
    }
  });

  // Close the disclosure after tabbing out of the navigation.
  navbar.addEventListener('focusout', (event) => {
    if (!navbar.contains(event.relatedTarget)) setMenuOpen(false);
  });

  navMobileMenu.querySelectorAll('.nav-mobile-link').forEach(link => {
    link.addEventListener('click', () => {
      setMenuOpen(false);
      navToggle.focus({ preventScroll: true });
    });
  });

  mobileViewport.addEventListener('change', () => {
    const focusWasInMenu = navMobileMenu.contains(document.activeElement);
    const focusWasOnToggle = document.activeElement === navToggle;
    setMenuOpen(false);
    if (mobileViewport.matches && focusWasInMenu) navToggle.focus();
    if (!mobileViewport.matches && (focusWasInMenu || focusWasOnToggle)) {
      navbar.querySelector('.nav-brand').focus();
    }
  });
}

// Content is visible by default if scripting or observers are unavailable.
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove('reveal-pending');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal').forEach(el => {
    el.classList.add('reveal-pending');
    revealObserver.observe(el);
    el.addEventListener('focusin', () => el.classList.remove('reveal-pending'));
  });
}

// Native fragment navigation preserves URL history and keyboard focus.
// CSS supplies smooth scrolling and clearance below the fixed navigation.
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', () => {
    const target = document.getElementById(anchor.hash.slice(1));
    if (target) {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  });
});

// Decorative parallax is disabled on the home page and for reduced motion.
const heroOrbs = document.querySelectorAll('.hero-orb');
if (heroOrbs.length > 0 && !document.body.classList.contains('home-page')) {
  window.addEventListener('mousemove', (event) => {
    if (reducedMotion.matches) return;
    const x = (event.clientX / window.innerWidth - 0.5) * 2;
    const y = (event.clientY / window.innerHeight - 0.5) * 2;
    heroOrbs.forEach((orb, i) => {
      const factor = (i + 1) * 8;
      orb.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
    });
  }, { passive: true });
}

// ── Vexo Analytics: Outbound & Product Link Click Tracking ─────────
document.querySelectorAll('a[href^="http"]').forEach(link => {
  link.addEventListener('click', () => {
    try {
      const url = new URL(link.href);
      if (url.hostname !== window.location.hostname && window.vexo && typeof window.vexo.customEvent === 'function') {
        window.vexo.customEvent('outbound_click', {
          destination: url.hostname,
          target_url: link.href,
          text: (link.textContent || '').trim().slice(0, 50)
        });
      }
    } catch (_) {
      // Fail silently if analytics script is blocked or URL parsing fails
    }
  });
});

