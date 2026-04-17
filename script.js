/**
 * Shree Metal — site behaviors
 * Edit CONFIG for WhatsApp number and business strings.
 *
 * Perf baseline: scroll handlers are coalesced with requestAnimationFrame; reveals
 * skip the observer for in-viewport nodes so LCP is not hidden behind opacity:0.
 */
(function () {
  "use strict";

  const CONFIG = {
    /** WhatsApp only: digits with country code, no + (also update wa.me in index.html if you disable JS) */
    WHATSAPP_E164: "919876543210",
    /** Default prefill for data-wa-link buttons (overridden per-element by data-wa-text) */
    WHATSAPP_DEFAULT_TEXT:
      "Hello Shree Metal — I need a bulk / industrial material quote (Surat). Please call me back.",
    THEME_STORAGE_KEY: "shreemetal_theme",
    SCROLL_OFFSET_EXTRA: 12,
    FAKE_SUBMIT_MS: 900,
  };

  const html = document.documentElement;
  const body = document.body;

  function syncSiteHeaderStickyHeight() {
    const header = document.querySelector("[data-header]");
    if (!header) return;
    const h = Math.ceil(header.getBoundingClientRect().height);
    if (h > 0) {
      html.style.setProperty("--site-header-sticky-h", h + "px");
    }
  }

  function scheduleSyncSiteHeaderStickyHeight() {
    requestAnimationFrame(syncSiteHeaderStickyHeight);
  }

  /* ---------- Utilities ---------- */
  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }
  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function getHeaderOffset() {
    const header = qs("[data-header]");
    const topBar = qs(".top-bar");
    const h = header ? header.offsetHeight : 72;
    const t = topBar ? topBar.offsetHeight : 0;
    return t + h + CONFIG.SCROLL_OFFSET_EXTRA;
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* ---------- Year ---------- */
  qsa("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- WhatsApp links (FAB + any [data-wa-link]) ---------- */
  function buildWhatsAppUrl(text) {
    const t = (text || CONFIG.WHATSAPP_DEFAULT_TEXT).trim();
    const q = t ? "?text=" + encodeURIComponent(t) : "";
    return "https://wa.me/" + CONFIG.WHATSAPP_E164 + q;
  }

  function initWhatsAppLinks() {
    const fab = qs("[data-whatsapp-link]");
    if (fab) {
      fab.setAttribute("href", buildWhatsAppUrl(CONFIG.WHATSAPP_DEFAULT_TEXT));
    }
    qsa("[data-wa-link]").forEach(function (el) {
      const custom = el.getAttribute("data-wa-text");
      el.setAttribute("href", buildWhatsAppUrl(custom != null ? custom : CONFIG.WHATSAPP_DEFAULT_TEXT));
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    });
  }

  initWhatsAppLinks();

  /* ---------- Theme ---------- */
  const themeToggle = qs("[data-theme-toggle]");

  function getStoredTheme() {
    try {
      return localStorage.getItem(CONFIG.THEME_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function applyTheme(theme) {
    if (theme === "dark") {
      html.setAttribute("data-theme", "dark");
    } else {
      html.removeAttribute("data-theme");
    }
    if (themeToggle) {
      themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    }
    scheduleSyncSiteHeaderStickyHeight();
  }

  function resolveInitialTheme() {
    const stored = getStoredTheme();
    if (stored === "dark" || stored === "light") {
      return stored;
    }
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }

  applyTheme(resolveInitialTheme());

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem(CONFIG.THEME_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
    });
  }

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function (e) {
    if (getStoredTheme()) return;
    applyTheme(e.matches ? "dark" : "light");
  });

  /* ---------- Sticky header shadow ---------- */
  const siteHeader = qs("[data-header]");
  function onScrollHeader() {
    if (!siteHeader) return;
    if (window.scrollY > 8) {
      siteHeader.classList.add("is-scrolled");
    } else {
      siteHeader.classList.remove("is-scrolled");
    }
  }
  onScrollHeader();

  scheduleSyncSiteHeaderStickyHeight();
  window.addEventListener("resize", scheduleSyncSiteHeaderStickyHeight);
  window.addEventListener("orientationchange", scheduleSyncSiteHeaderStickyHeight);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleSyncSiteHeaderStickyHeight);
  }
  if (siteHeader && typeof ResizeObserver !== "undefined") {
    new ResizeObserver(scheduleSyncSiteHeaderStickyHeight).observe(siteHeader);
  }

  /* ---------- Mobile nav ---------- */
  const navToggle = qs("[data-nav-toggle]");
  const siteNav = qs("#site-nav");

  function setNavOpen(open) {
    if (!navToggle || !siteNav) return;
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    siteNav.classList.toggle("is-open", open);
    body.style.overflow = open ? "hidden" : "";
  }

  if (navToggle && siteNav) {
    navToggle.addEventListener("click", function () {
      const open = navToggle.getAttribute("aria-expanded") !== "true";
      setNavOpen(open);
    });

    siteNav.addEventListener("click", function (e) {
      const a = e.target.closest("a");
      if (a && window.innerWidth < 1024) {
        setNavOpen(false);
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && siteNav.classList.contains("is-open")) {
        setNavOpen(false);
        navToggle.focus();
      }
    });
  }

  window.addEventListener("resize", function () {
    if (window.innerWidth >= 1024) {
      setNavOpen(false);
    }
  });

  /* ---------- Smooth scroll (offset for sticky header) ---------- */
  function scrollToHash(hash, behavior) {
    if (!hash || hash === "#") return;
    const id = hash.replace(/^#/, "");
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - getHeaderOffset();
    window.scrollTo({
      top: Math.max(top, 0),
      behavior: behavior || (prefersReducedMotion() ? "auto" : "smooth"),
    });
  }

  document.addEventListener("click", function (e) {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const href = a.getAttribute("href");
    if (href.length > 1 && document.getElementById(href.slice(1))) {
      e.preventDefault();
      scrollToHash(href);
      if (history.pushState) {
        history.pushState(null, "", href);
      } else {
        location.hash = href;
      }
    }
  });

  if (location.hash) {
    window.requestAnimationFrame(function () {
      scrollToHash(location.hash, "auto");
    });
  }

  /* ---------- Back to top ---------- */
  const backTop = qs("[data-back-top]");
  function toggleBackTop() {
    if (!backTop) return;
    if (window.scrollY > 480) {
      backTop.hidden = false;
    } else {
      backTop.hidden = true;
    }
  }
  toggleBackTop();

  /* Shared rAF guard so scroll handlers fire at most once per frame */
  let scrollTicking = false;
  window.addEventListener("scroll", function () {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(function () {
      onScrollHeader();
      toggleBackTop();
      scrollTicking = false;
    });
  }, { passive: true });

  if (backTop) {
    backTop.addEventListener("click", function () {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    });
  }

  /* ---------- Reveal on scroll ---------- */
  const revealEls = qsa("[data-reveal]");
  revealEls.forEach(function (el) {
    const d = el.getAttribute("data-reveal-delay");
    if (d != null && d !== "") {
      const ms = parseInt(d, 10);
      if (!isNaN(ms) && ms >= 0) {
        el.style.setProperty("--reveal-delay", ms / 1000 + "s");
      }
    }
  });

  // Immediately reveal elements visible in the initial viewport so LCP candidate
  // is never hidden behind opacity:0 while the async observer warms up.
  const viewportH = window.innerHeight || document.documentElement.clientHeight;
  revealEls.forEach(function (el) {
    if (el.getBoundingClientRect().top < viewportH) {
      el.classList.add("is-visible");
    }
  });

  if (revealEls.length && !prefersReducedMotion()) {
    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    revealEls.forEach(function (el) {
      // Skip elements already made visible above
      if (!el.classList.contains("is-visible")) {
        io.observe(el);
      }
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* ---------- Animated counters ---------- */
  function formatCounter(value, decimals) {
    if (decimals > 0) {
      return value.toFixed(decimals);
    }
    return Math.round(value).toString();
  }

  function animateCounter(el, duration) {
    const target = parseFloat(el.getAttribute("data-target") || "0");
    const suffix = el.getAttribute("data-suffix") || "";
    const decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
    const start = performance.now();

    function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = target * eased;
      el.textContent = formatCounter(current, decimals) + suffix;
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = formatCounter(target, decimals) + suffix;
      }
    }
    requestAnimationFrame(frame);
  }

  const statsSection = qs("#stats");
  if (statsSection) {
    const counters = qsa("[data-counter]", statsSection);
    let played = false;
    const counterIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting || played) return;
          played = true;
          const dur = prefersReducedMotion() ? 0 : 1400;
          counters.forEach(function (c) {
            if (dur === 0) {
              const target = parseFloat(c.getAttribute("data-target") || "0");
              const suffix = c.getAttribute("data-suffix") || "";
              const decimals = parseInt(c.getAttribute("data-decimals") || "0", 10);
              c.textContent = formatCounter(target, decimals) + suffix;
            } else {
              animateCounter(c, dur);
            }
          });
          counterIo.disconnect();
        });
      },
      { threshold: 0.25 }
    );
    counterIo.observe(statsSection);
  }

  /* ---------- Accordion (one open) ---------- */
  const accordion = qs("[data-accordion]");
  if (accordion) {
    const triggers = qsa("[data-accordion-trigger]", accordion);
    function closeAll() {
      triggers.forEach(function (btn) {
        btn.setAttribute("aria-expanded", "false");
        const panelId = btn.getAttribute("aria-controls");
        const panel = panelId ? document.getElementById(panelId) : null;
        if (panel) {
          panel.hidden = true;
        }
      });
    }
    triggers.forEach(function (btn) {
      btn.addEventListener("click", function () {
        const expanded = btn.getAttribute("aria-expanded") === "true";
        const panelId = btn.getAttribute("aria-controls");
        const panel = panelId ? document.getElementById(panelId) : null;
        if (expanded) {
          btn.setAttribute("aria-expanded", "false");
          if (panel) panel.hidden = true;
        } else {
          closeAll();
          btn.setAttribute("aria-expanded", "true");
          if (panel) panel.hidden = false;
        }
      });
    });
  }

  /* ---------- Focus trap ---------- */
  function getFocusable(root) {
    const sel =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return qsa(sel, root).filter(function (el) {
      if (el.hasAttribute("hidden")) return false;
      const style = window.getComputedStyle(el);
      return style.visibility !== "hidden" && style.display !== "none";
    });
  }

  /* ---------- Lead modal ---------- */
  const leadModal = qs("[data-lead-modal]");
  const leadForm = qs("[data-lead-form]");
  let lastFocus = null;
  let modalKeydownHandler = null;

  function openLeadModal() {
    if (!leadModal) return;
    lastFocus = document.activeElement;
    leadModal.hidden = false;
    leadModal.setAttribute("aria-hidden", "false");
    body.style.overflow = "hidden";

    const dialog = qs(".modal__dialog", leadModal);
    if (dialog) {
      dialog.scrollTop = 0;
    }
    const focusables = dialog ? getFocusable(dialog) : [];
    const first = focusables[0] || dialog;
    if (first) first.focus();

    function onKeydown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeLeadModal();
        return;
      }
      if (e.key === "Tab" && dialog) {
        const list = getFocusable(dialog);
        if (!list.length) return;
        const idx = list.indexOf(document.activeElement);
        if (e.shiftKey) {
          if (idx <= 0) {
            e.preventDefault();
            list[list.length - 1].focus();
          }
        } else {
          if (idx === -1 || idx >= list.length - 1) {
            e.preventDefault();
            list[0].focus();
          }
        }
      }
    }

    modalKeydownHandler = onKeydown;
    document.addEventListener("keydown", onKeydown);
  }

  function closeLeadModal() {
    if (!leadModal) return;
    leadModal.hidden = true;
    leadModal.setAttribute("aria-hidden", "true");
    body.style.overflow = "";
    if (modalKeydownHandler) {
      document.removeEventListener("keydown", modalKeydownHandler);
      modalKeydownHandler = null;
    }
    if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus();
    }
  }

  qsa("[data-lead-close]").forEach(function (btn) {
    btn.addEventListener("click", closeLeadModal);
  });

  document.addEventListener("click", function (e) {
    const t = e.target.closest("[data-open-quote-modal]");
    if (!t || !leadModal) return;
    e.preventDefault();
    openLeadModal();
  });

  /* ---------- Form validation helpers ---------- */
  function validatePhone(phone) {
    const digits = phone.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
  }

  function setFieldError(input, message) {
    const id = input.id;
    const err = qs('[data-error-for="' + id + '"]');
    if (err) err.textContent = message || "";
    input.setAttribute("aria-invalid", message ? "true" : "false");
  }

  function setButtonLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.setAttribute("data-loading", loading ? "true" : "false");
  }

  if (leadForm) {
    const leadName = qs("#lead-name", leadForm);
    const leadPhone = qs("#lead-phone", leadForm);
    const leadReq = qs("#lead-requirement", leadForm);
    const leadSubmit = qs("[data-lead-submit]", leadForm);
    const leadStatus = qs("[data-lead-status]", leadForm);

    leadForm.addEventListener("submit", function (e) {
      e.preventDefault();
      [leadName, leadPhone, leadReq].forEach(function (inp) {
        if (inp) setFieldError(inp, "");
      });
      if (leadStatus) leadStatus.textContent = "";

      let ok = true;
      if (leadName && !leadName.value.trim()) {
        setFieldError(leadName, "Enter your name.");
        ok = false;
      }
      if (leadPhone) {
        if (!leadPhone.value.trim()) {
          setFieldError(leadPhone, "Enter your phone number.");
          ok = false;
        } else if (!validatePhone(leadPhone.value)) {
          setFieldError(leadPhone, "Enter a valid mobile (10 digits).");
          ok = false;
        }
      }
      if (leadReq && !leadReq.value.trim()) {
        setFieldError(leadReq, "Tell us what you need (grade, qty, delivery).");
        ok = false;
      }

      if (!ok) {
        const firstInvalid = qs('[aria-invalid="true"]', leadForm);
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      setButtonLoading(leadSubmit, true);
      window.setTimeout(function () {
        setButtonLoading(leadSubmit, false);
        if (leadStatus) {
          leadStatus.textContent =
            "Received. Our Surat desk will call you back—connect this form to your CRM or WhatsApp API in production.";
        }
        leadForm.reset();
        closeLeadModal();
      }, CONFIG.FAKE_SUBMIT_MS);
    });
  }

  /* ---------- Contact form ---------- */
  const contactForm = qs("[data-contact-form]");
  if (contactForm) {
    const nameInput = qs("#contact-name", contactForm);
    const phone = qs("#contact-phone", contactForm);
    const message = qs("#contact-requirement", contactForm);
    const submitBtn = qs("[data-submit-btn]", contactForm);
    const status = qs("[data-form-status]", contactForm);

    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      [nameInput, phone, message].forEach(function (inp) {
        if (inp) setFieldError(inp, "");
      });
      if (status) status.textContent = "";

      let ok = true;
      if (nameInput && !nameInput.value.trim()) {
        setFieldError(nameInput, "Name is required.");
        ok = false;
      }
      if (phone) {
        if (!phone.value.trim()) {
          setFieldError(phone, "Phone is required.");
          ok = false;
        } else if (!validatePhone(phone.value)) {
          setFieldError(phone, "Enter a valid mobile (10 digits).");
          ok = false;
        }
      }
      if (message && !message.value.trim()) {
        setFieldError(message, "What do you need? (material, qty, site).");
        ok = false;
      }

      if (!ok) {
        const firstInvalid = qs('[aria-invalid="true"]', contactForm);
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      setButtonLoading(submitBtn, true);
      window.setTimeout(function () {
        setButtonLoading(submitBtn, false);
        if (status) {
          status.textContent =
            "Request received. Hook this form to your WhatsApp Business API, sheet, or dialer—we’ll call back within minutes in production.";
        }
        contactForm.reset();
      }, CONFIG.FAKE_SUBMIT_MS);
    });
  }
})();
