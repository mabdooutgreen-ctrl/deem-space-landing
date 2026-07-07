/* ============================================================
   Deem Space — Al Malqa landing page
   ------------------------------------------------------------
   ▼▼ CONFIG — the ONLY values you need to touch in this file ▼▼
   ============================================================ */
var CONFIG = {
  // Google Apps Script Web App URL (or Sheets connector endpoint).
  // The form POSTs its JSON payload here → appends a row to the Sheet.
  // See README.md → "Wire the form to Google Sheets".
  SHEET_WEBAPP_URL: '{{SHEET_WEBAPP_URL}}',

  // While the URL above is still a placeholder, submits are SIMULATED
  // (success UI + dataLayer fire, nothing is saved) so you can test the
  // page and GTM preview before wiring the Sheet. Set to false to make
  // an unconfigured endpoint show the error state instead.
  SIMULATE_WHEN_UNCONFIGURED: true
};
/* ============================================================ */

(function () {
  'use strict';

  var doc = document;
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- i18n ---------- */

  var META = {
    ar: {
      title: 'ديم سبيس — مكاتب جاهزة في الملقا، شمال الرياض | احجز جولة',
      desc: 'مكتب متكامل جاهز للعمل في الملقا شمال الرياض — مفروش بالكامل، مرخّص، وبعقود مرنة. يتّسع حتى ٧٤ موظفًا. احجز جولتك اليوم.',
      toggleLabel: 'English'
    },
    en: {
      title: 'Deem Space — Serviced offices in Al Malqa, North Riyadh | Book a viewing',
      desc: 'A move-in-ready premium office in Al Malqa, North Riyadh — fully furnished, licensed and flexible. Up to 74 workstations. Book your viewing today.',
      toggleLabel: 'العربية'
    }
  };

  var MSG = {
    ar: {
      requiredName: 'يرجى إدخال الاسم الكامل.',
      invalidPhone: 'رقم الجوال غير صحيح — يجب أن يبدأ بـ 5 ويتكوّن من ٩ أرقام.',
      invalidEmail: 'يرجى إدخال بريد إلكتروني صحيح.',
      sending: 'جارٍ الإرسال…'
    },
    en: {
      requiredName: 'Please enter your full name.',
      invalidPhone: 'Invalid mobile — must start with 5 and be 9 digits.',
      invalidEmail: 'Please enter a valid email address.',
      sending: 'Sending…'
    }
  };

  var lang = 'ar'; // in-memory only (+ URL param). No localStorage by design.

  // Capture the Arabic (authored) strings once, so we can flip back.
  doc.querySelectorAll('[data-en]').forEach(function (el) { el.dataset.ar = el.textContent; });
  doc.querySelectorAll('[data-en-placeholder]').forEach(function (el) { el.dataset.arPlaceholder = el.getAttribute('placeholder') || ''; });
  doc.querySelectorAll('[data-en-alt]').forEach(function (el) { el.dataset.arAlt = el.getAttribute('alt') || ''; });

  var toggleBtn = doc.getElementById('langToggle');

  function setLang(next) {
    lang = next === 'en' ? 'en' : 'ar';
    var html = doc.documentElement;
    html.lang = lang;
    html.dir = lang === 'ar' ? 'rtl' : 'ltr';

    doc.querySelectorAll('[data-en]').forEach(function (el) {
      el.textContent = lang === 'en' ? el.dataset.en : el.dataset.ar;
    });
    doc.querySelectorAll('[data-en-placeholder]').forEach(function (el) {
      el.setAttribute('placeholder', lang === 'en' ? el.dataset.enPlaceholder : el.dataset.arPlaceholder);
    });
    doc.querySelectorAll('[data-en-alt]').forEach(function (el) {
      el.setAttribute('alt', lang === 'en' ? el.dataset.enAlt : el.dataset.arAlt);
    });

    doc.title = META[lang].title;
    var metaDesc = doc.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', META[lang].desc);
    if (toggleBtn) toggleBtn.textContent = META[lang].toggleLabel;

    // Remember the choice in the URL only (shareable, no storage).
    try {
      var u = new URL(window.location.href);
      if (lang === 'en') u.searchParams.set('lang', 'en');
      else u.searchParams.delete('lang');
      history.replaceState(null, '', u);
    } catch (e) { /* no-op */ }
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      setLang(lang === 'ar' ? 'en' : 'ar');
    });
  }

  // Initial language from URL (?lang=en), default Arabic.
  var params = new URLSearchParams(window.location.search);
  if (params.get('lang') === 'en') setLang('en');
  else if (toggleBtn) toggleBtn.textContent = META.ar.toggleLabel;

  /* ---------- UTM capture → hidden inputs ---------- */

  var form = doc.getElementById('lead-form');
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) {
    if (form && form.elements[k]) form.elements[k].value = params.get(k) || '';
  });
  if (form && form.elements.page_url) form.elements.page_url.value = window.location.href;

  /* ---------- CTA → focus the form ---------- */
  // Anchors already scroll natively (CSS smooth + scroll-margin);
  // we add focus on the first field for a one-tap start.
  var nameInput = doc.getElementById('f-name');
  doc.querySelectorAll('a[href="#lead-form"]').forEach(function (a) {
    a.addEventListener('click', function () {
      window.setTimeout(function () {
        if (nameInput) nameInput.focus({ preventScroll: true });
      }, prefersReduced ? 0 : 550);
    });
  });

  /* ---------- sticky mobile CTA visibility ---------- */

  var stickyBar = doc.getElementById('stickyCta');
  var formSection = doc.getElementById('book');
  if (stickyBar && formSection && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      stickyBar.classList.toggle('visible', !entries[0].isIntersecting);
    }, { threshold: 0.12 }).observe(formSection);
    stickyBar.classList.add('visible');
  }

  /* ---------- phone normalization (KSA) ---------- */

  function toAsciiDigits(s) {
    // Accept Arabic-Indic (٠-٩) and Extended (۰-۹) digits.
    return (s || '').replace(/[\u0660-\u0669\u06F0-\u06F9]/g, function (d) {
      var c = d.charCodeAt(0);
      return String((c >= 0x06F0 ? c - 0x06F0 : c - 0x0660) % 10);
    });
  }

  function normalizeKsaPhone(raw) {
    var d = toAsciiDigits(raw).replace(/\D/g, '');   // digits only
    if (d.indexOf('966') === 0) d = d.slice(3);      // strip country code if typed
    if (d.indexOf('0') === 0) d = d.slice(1);        // 05... -> 5...
    return /^5\d{8}$/.test(d) ? ('+966' + d) : null; // null => invalid
  }

  /* ---------- form ---------- */

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setFieldError(fieldWrap, message) {
    if (!fieldWrap) return;
    var err = fieldWrap.querySelector('.err');
    if (message) {
      fieldWrap.classList.add('invalid');
      if (err) err.textContent = message;
    } else {
      fieldWrap.classList.remove('invalid');
    }
  }

  function endpointConfigured() {
    var u = CONFIG.SHEET_WEBAPP_URL || '';
    return u && u.indexOf('{{') === -1;
  }

  if (form) {
    var submitBtn = doc.getElementById('submitBtn');
    var submitLabel = submitBtn.querySelector('.btn-label');
    var successBox = doc.getElementById('formSuccess');
    var errorBox = doc.getElementById('formError');
    var fieldsWrap = doc.getElementById('formFields');
    var defaultLabel = { ar: submitLabel.dataset.ar || submitLabel.textContent, en: submitLabel.dataset.en };

    function setLoading(on) {
      submitBtn.classList.toggle('is-loading', on);
      submitBtn.disabled = on;
      submitLabel.textContent = on ? MSG[lang].sending : (lang === 'en' ? defaultLabel.en : defaultLabel.ar);
    }

    function showSuccess() {
      fieldsWrap.hidden = true;
      errorBox.hidden = true;
      successBox.hidden = false;
      successBox.focus();
    }

    function showError() {
      errorBox.hidden = false; // field values are kept; user can retry
    }

    function pushLeadEvent(p) {
      window.dataLayer = window.dataLayer || [];
      // The ONLY tracking event. GTM (Google tag / Snap pixel) does all
      // hashing — push the RAW normalized phone + raw lowercased email.
      window.dataLayer.push({
        event: 'lead_form_submit',
        form_location: p.form_location,        // 'hero' | 'main' | 'footer'
        company: p.company || '',
        lead: {
          phone_number: p.phone,               // '+9665XXXXXXXX' — primary match key
          email: p.email || '',
          first_name: p.name,
          country: 'SA'
        }
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      errorBox.hidden = true;

      // Honeypot: silently drop, pretend success, do NOT push dataLayer.
      if ((form.elements.website.value || '').trim() !== '') {
        showSuccess();
        return;
      }

      var name = (form.elements.name.value || '').trim();
      var phoneNorm = normalizeKsaPhone(form.elements.phone.value);
      var emailRaw = (form.elements.email.value || '').trim().toLowerCase();
      var company = (form.elements.company.value || '').trim();
      var details = (form.elements.details.value || '').trim();

      var firstInvalid = null;
      if (!name) {
        setFieldError(doc.getElementById('field-name'), MSG[lang].requiredName);
        firstInvalid = firstInvalid || form.elements.name;
      } else setFieldError(doc.getElementById('field-name'), null);

      if (!phoneNorm) {
        setFieldError(doc.getElementById('field-phone'), MSG[lang].invalidPhone);
        firstInvalid = firstInvalid || form.elements.phone;
      } else setFieldError(doc.getElementById('field-phone'), null);

      if (emailRaw && !EMAIL_RE.test(emailRaw)) {
        setFieldError(doc.getElementById('field-email'), MSG[lang].invalidEmail);
        firstInvalid = firstInvalid || form.elements.email;
      } else setFieldError(doc.getElementById('field-email'), null);

      if (firstInvalid) { firstInvalid.focus(); return; }

      var payload = {
        name: name,
        phone: phoneNorm,                       // E.164, e.g. +966512345678
        email: emailRaw,                        // lowercased + trimmed, or ''
        company: company,
        details: details,
        form_location: form.elements.form_location.value, // 'main'
        page_url: form.elements.page_url.value,
        utm_source: form.elements.utm_source.value,
        utm_medium: form.elements.utm_medium.value,
        utm_campaign: form.elements.utm_campaign.value,
        utm_term: form.elements.utm_term.value,
        utm_content: form.elements.utm_content.value,
        lang: lang
      };

      setLoading(true);

      function succeed() {
        pushLeadEvent(payload);  // fire BEFORE showing the inline success
        setLoading(false);
        showSuccess();
      }
      function fail() {
        setLoading(false);
        showError();
      }

      if (!endpointConfigured()) {
        if (CONFIG.SIMULATE_WHEN_UNCONFIGURED) {
          console.warn('[Deem Space] SHEET_WEBAPP_URL is not set — simulating success. NO DATA WAS SAVED. See README.md.');
          window.setTimeout(succeed, 700);
        } else fail();
        return;
      }

      // Simple request (text/plain) → no CORS preflight against Apps Script.
      fetch(CONFIG.SHEET_WEBAPP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      }).then(function (res) {
        // Opaque responses (no-cors setups) can't be read — treat resolved as success.
        if (res.ok || res.type === 'opaque') succeed();
        else fail();
      }).catch(fail);
    });
  }

  /* ---------- footer year ---------- */
  var yy = doc.getElementById('yy');
  if (yy) yy.textContent = String(new Date().getFullYear());
})();
