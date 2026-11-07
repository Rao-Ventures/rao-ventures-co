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

// Native fragment navigation preserves URL history and keyboard focus.
// CSS supplies clearance below the fixed navigation.
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

// Optional website analytics only runs after an explicit, unexpired choice.
// App legal and support pages deliberately do not opt into this feature.
if (document.body.hasAttribute('data-website-analytics')) {
  const consentKey = 'rao-ventures-cookie-consent-v1';
  const consentLifetime = 180 * 24 * 60 * 60 * 1000;
  const banner = document.querySelector('.cookie-banner');
  const settings = document.querySelector('[data-cookie-settings]');
  let analyticsLoading = false;
  let returnFocus = false;
  const pendingEvents = [];

  const readConsent = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(consentKey));
      if (saved && ['accepted', 'rejected'].includes(saved.choice) &&
          Number.isFinite(saved.savedAt) && saved.savedAt <= Date.now() &&
          Date.now() - saved.savedAt < consentLifetime) return saved.choice;
    } catch (_) {
      // Storage may be unavailable; keep tracking off until a choice is made.
    }
    return null;
  };

  let consent = readConsent();
  const hasConsent = () => consent === 'accepted';
  const sendEvent = (name, properties) => {
    if (!hasConsent()) return;
    try {
      if (typeof window.vexo?.customEvent === 'function') {
        window.vexo.customEvent(name, properties);
      } else if (pendingEvents.length < 20) {
        // Retain consented clicks while the SDK downloads; never queue before consent.
        pendingEvents.push({ name, properties });
      }
    } catch (_) {
      // A blocked or failing analytics provider must never interfere with navigation.
    }
  };

  const loadAnalytics = () => {
    if (!hasConsent() || analyticsLoading) return;
    analyticsLoading = true;
    const script = document.createElement('script');
    script.src = 'https://www.vexo.co/analytics.js';
    script.async = true;
    script.onload = () => {
      const queued = pendingEvents.splice(0);
      if (hasConsent()) queued.forEach(event => sendEvent(event.name, event.properties));
    };
    script.onerror = () => {
      pendingEvents.length = 0;
      analyticsLoading = false;
    };
    document.head.append(script);
  };

  banner.hidden = consent !== null;
  settings.hidden = false;
  settings.addEventListener('click', () => {
    banner.hidden = false;
    returnFocus = true;
    banner.querySelector('button').focus({ preventScroll: true });
  });

  banner.querySelectorAll('[data-cookie-choice]').forEach(button => {
    button.addEventListener('click', () => {
      const wasAccepted = hasConsent();
      consent = button.dataset.cookieChoice;
      if (!hasConsent()) pendingEvents.length = 0;
      try {
        localStorage.setItem(consentKey, JSON.stringify({ choice: consent, savedAt: Date.now() }));
      } catch (_) {
        // The choice still applies to this page when persistence is blocked.
      }
      banner.hidden = true;
      // Move focus out of the now-hidden controls without scrolling the page.
      if (returnFocus) settings.focus({ preventScroll: true });
      else {
        document.querySelector('main')?.setAttribute('tabindex', '-1');
        document.querySelector('main')?.focus({ preventScroll: true });
      }
      if (wasAccepted && !hasConsent()) {
        // Reload to stop the already-running third-party SDK, including its listeners.
        window.location.reload();
      } else loadAnalytics();
    });
  });

  // Apply choices changed in another tab, stopping an active SDK on withdrawal.
  window.addEventListener('storage', event => {
    if (event.key !== consentKey && event.key !== null) return;
    const wasAccepted = hasConsent();
    consent = readConsent();
    if (wasAccepted && !hasConsent()) window.location.reload();
    else {
      banner.hidden = consent !== null;
      loadAnalytics();
    }
  });

  loadAnalytics();

  // Vexo's SDK supplies anonymous visitor/session identity and unique-user counts.
  // Stable CTA IDs distinguish buttons with the same label or destination.
  document.querySelectorAll('[data-cta], a[href^="http"]').forEach(link => {
    link.addEventListener('click', () => {
      if (!hasConsent()) return;
      try {
        const url = new URL(link.href);
        const properties = {
          page_path: window.location.pathname,
          destination: url.hostname,
          // Exclude query strings, which may contain personal or campaign data.
          target_url: `${url.origin === 'null' ? url.protocol : url.origin}${url.pathname}${url.hash}`,
          text: (link.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100)
        };
        if (link.dataset.cta) {
          sendEvent('cta_click', {
            ...properties,
            cta_id: link.dataset.cta,
            section: link.closest('section[id], nav, footer')?.id ||
              link.closest('nav, footer')?.tagName.toLowerCase() || 'page'
          });
        }
        if (['http:', 'https:'].includes(url.protocol) && url.hostname !== window.location.hostname) {
          sendEvent('outbound_click', properties);
        }
      } catch (_) {
        // Analytics must never interfere with navigation.
      }
    });
  });
}
