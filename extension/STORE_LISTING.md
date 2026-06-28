# Nofri Focus — Chrome Web Store listing

Copy-paste fields for the Web Store Developer Console. Screenshots are in
`store/` (1280×800 PNGs) and the small promo tile is `store/promo-440x280.png`.

---

## Name
Nofri Focus

## Summary (short description — max 132 chars)
Gently block distracting sites and browse with intention. A calm "Pause" page, a timed grace pass, and an optional schedule.

## Category
Productivity

## Language
English

## Detailed description
Nofri Focus helps you browse with intention. When you slip toward a distracting
site — X/Twitter, Facebook, Instagram, TikTok, Reddit, or any site you add — it
gently redirects the tab to a calm "Pause" page with a short verse and three
clear choices: open your start page, go back, or take a short timed pass if you
genuinely need a few minutes.

It is a guardrail for the honest moment of distraction, not a punishment.

FEATURES
• Editable blocklist — block the sites that pull you in; defaults included.
• A gentle Pause page instead of a hard wall — with a timed grace pass so you
  are never trapped.
• Scheduling — let focus pause itself during "free" windows you choose (e.g.
  weekday evenings). Outside them, the blocklist stays on. Windows are
  per-weekday and can cross midnight.
• One-click toggle from the toolbar.
• Local and private — all settings stay in your browser. No account, no
  servers, no tracking, no ads.

Nofri Focus pairs with Nofri Start, a distraction-free start page, but works
perfectly well on its own.

## Single purpose (required)
Nofri Focus has one purpose: to help the user stay focused while browsing. It
does this by (a) redirecting navigations to user-defined blocked sites to a
local "Pause" reminder page (with an optional schedule and a temporary grace
pass), and (b) replacing the new-tab page with the user's chosen distraction-free
start page. Both behaviors serve the single purpose of reducing distraction.

NOTE: This extension overrides the browser's new-tab page (chrome_url_overrides
→ newtab), which must be disclosed. If you would rather submit a blocking-only
version, remove the "chrome_url_overrides" line from manifest.json and the
newtab.html/newtab.js files before packaging.

## Permission justifications
• webNavigation — to detect when the user navigates to a site so the extension
  can check it against the user's blocklist.
• tabs — to redirect the current tab to the local Pause page when a blocked
  site is opened.
• storage — to save the user's settings (blocklist, schedule, preferences)
  locally on the device.
• host permissions (<all_urls>) — required because the user may add any site to
  their blocklist; the extension must be able to evaluate navigations to any
  host. The extension only reads the destination URL to compare it against the
  blocklist; it does not read page content.

## Data usage / privacy
Nofri Focus does not collect, transmit, or sell any user data. All settings are
stored locally via chrome.storage.local. There are no analytics, no remote
servers, and no third-party requests. Nothing leaves the user's device.

## Screenshots (in store/)
1. screenshot-1-pause.png — the gentle "Pause" page shown for a blocked site.
2. screenshot-2-options.png — settings: blocklist, schedule, grace pass.
3. screenshot-3-promo.png — overview / value proposition card.
