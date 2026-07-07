# Deem Space — Al Malqa landing page

Bilingual (Arabic-RTL primary / English toggle) lead-gen landing page. Pure static — `index.html` + `styles.css` + `script.js` + `/assets`. No backend, no build step: open `index.html` locally or deploy the folder as-is. Conversion model is **form-only** (no WhatsApp, no click-to-call); the only tracking event is `lead_form_submit`.

## 1 · Placeholders to replace

| Placeholder | Where | What |
|---|---|---|
| `GTM-XXXXXXX` | `index.html` — **2 places**: `<script>` in `<head>` + `<noscript>` right after `<body>` | Your GTM container ID. The head snippet deliberately no-ops while the ID is the placeholder (delete the one guard line marked `remove-safe guard` if you prefer the raw standard snippet). |
| `{{SHEET_WEBAPP_URL}}` | `script.js` — `CONFIG` block, top of file | Google Apps Script Web App URL the form POSTs to (section 2). |
| `{{MAP_EMBED}}` | `index.html` — footer "Location" column | Google Maps embed `<iframe>` (Maps → Share → Embed a map). Replace the dashed placeholder box. |
| `{{PRIVACY_URL}}` | `index.html` — footer privacy line | Link to the privacy note. |
| `{{GOOGLE_REVIEWS_URL}}` | `index.html` — reviews section | Link to the live Google reviews. **Verify the live aggregate rating** — copy says "5.0★". |
| `{{LOGO_SVG}}` | `index.html` — header + footer (marked comments) | Official logo (optional; typographic wordmark ships as fallback, min-width 120px). |
| `{{AVAIL_DATE}}` + table rows | `assets/deem-space-availability-map.html` (marked `EDIT ROWS`) | Availability snapshot date + rows — keep current. |
| `https://deemspace.vercel.app` | `index.html` `<head>` (canonical, hreflang ×3, og:url, og:image) | Replace with the final domain after deploy. |

**Images (placeholders shipped — swap 1:1, keep filenames):** `assets/hero.jpg` (1000×1250 portrait), `assets/gallery-1…6.jpg` (1200×800), `assets/tour-poster.jpg` (1600×900), `assets/og-image.jpg` (1200×630 — regenerate as a darkened real photo + Latin wordmark; **never bake Arabic text into an image**). The tour video is **not** shipped: drop it at `assets/tour.mp4`, then in `index.html` delete the `video-slot` placeholder div and uncomment the ready `<video>` block just below it. Compress photos (~200 KB each) before shipping.

## 2 · Wire the form → Google Sheet

1. Create a Google Sheet with a `Leads` tab; header row: `timestamp | name | phone | email | company | details | form_location | page_url | utm_source | utm_medium | utm_campaign | utm_term | utm_content | lang`.
2. Extensions → Apps Script, paste (full annotated version: **go-live-guide.md, Appendix A**):

```js
function doPost(e) {
  var d = JSON.parse(e.postData.contents);
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Leads').appendRow([
    new Date(), d.name, d.phone, d.email, d.company, d.details,
    d.form_location, d.page_url, d.utm_source, d.utm_medium,
    d.utm_campaign, d.utm_term, d.utm_content, d.lang
  ]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Deploy → New deployment → **Web app** → Execute as **Me**, access **Anyone**. Copy the `/exec` URL into `CONFIG.SHEET_WEBAPP_URL` in `script.js`.
4. The page sends the JSON payload with `Content-Type: text/plain;charset=utf-8` — a "simple" request, so no CORS preflight against Apps Script. Phone arrives normalized to E.164 (`+9665XXXXXXXX`), email lowercased/trimmed.

> **Until the URL is set**, submits are **simulated**: the success UI shows and `lead_form_submit` fires (handy for GTM Preview), but **nothing is saved** — a console warning says so. Set `CONFIG.SIMULATE_WHEN_UNCONFIGURED = false` to show the error state instead.

## 3 · Deploy to Vercel

1. Push this folder to a GitHub repo (it is the repo root).
2. vercel.com → **Add New… → Project** → import the repo.
3. Framework preset **Other**, no build command, output directory = root → **Deploy**.
4. Project → Settings → **Domains** → set `companyname.vercel.app` (or a custom domain).
5. Update the site URL in `index.html` (canonical / hreflang / og:url / og:image) to the final domain and redeploy.

## 4 · Tracking

The page pushes exactly one event (after AJAX success, before the inline success UI):

```js
dataLayer.push({
  event: 'lead_form_submit',
  form_location: 'main',
  company: '<company or "">',
  lead: { phone_number: '+9665XXXXXXXX', email: '<email or "">', first_name: '<name>', country: 'SA' }
});
```

Raw values only — GTM's Google tag SHA-256-hashes for Enhanced Conversions and Snapchat's pixel hashes client-side for Advanced Matching; **never pre-hash in the page**. No pixel/conversion IDs are hardcoded anywhere — everything is configured in GTM. Full GTM / Google Ads / Snapchat setup: see your separate **`go-live-guide.md`**.

## 5 · QA checklist

- AR (RTL) default; toggle flips to EN (LTR) and back; choice persists via `?lang=en` (no localStorage by design).
- Phone: `0512345678`, `512345678`, `+966512345678`, `٠٥١٢٣٤٥٦٧٨` all normalize to `+966512345678`; `0412345678` blocks with the inline error.
- Submit → row appears in the Sheet → GTM Preview shows `lead_form_submit` → inline success reveals the map download. Error path keeps field values.
- No WhatsApp / no click-to-call anywhere; every CTA lands on the form. Footer phone is plain text.
- Lighthouse mobile: hero is the only eager image; everything below the fold lazy-loads.

## 6 · Assumptions

Per `build-spec.md`, brand tokens are derived from the amenities slide + office photos (no brand file was provided), the wordmark is a typographic placeholder pending `{{LOGO_SVG}}`, pricing is intentionally omitted, and the "5.0★" line must be verified against the live Google rating. Build-level assumptions: the real photos/video weren't attached, so brand-styled placeholder images ship at the exact paths for 1:1 swaps; `https://deemspace.vercel.app` stands in for the final domain; one derived tint (`--orange-300`) was added for small accent text on dark green (AA contrast); the Ahmad Alrashed quote's Arabic is a back-translation of the published review (original is Arabic — verify wording against the live review); the FAQ's Arabic phrasing was composed from the spec's objection/rebuttal pairs; the lead magnet ships as a print-ready HTML one-pager (per spec) rather than a pre-baked PDF, with `{{AVAIL_DATE}}` and table rows left to the Deem team; the payload also carries `lang` + `utm_term`/`utm_content` (superset of the spec's minimum — harmless extra Sheet columns).
