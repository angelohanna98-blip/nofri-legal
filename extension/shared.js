/*
 * shared.js — Nofri Focus
 * Defaults and small helpers shared by the service worker (via importScripts)
 * and the extension pages (via <script src>).
 *
 * Settings live in chrome.storage.local:
 *   enabled       boolean   master focus toggle
 *   blocklist     string[]  bare domains to block (matched with subdomains)
 *   graceMinutes  number    how long a "let me through" pass lasts
 *   grace         object    { "<domain>": <expiryEpochMs> } temporary passes
 *
 * Phase-1 seam note: Nofri Start stores the user's trusted links at
 * nofri.start.config.v1.focus.trusted. That list is an *allowlist* of places
 * to go; this extension works from a *blocklist* of places to avoid — the two
 * are complementary. A future version can import the start page's config to
 * suggest a blocklist (everything not trusted), but they stay independent now.
 */

var NOFRI_DEFAULTS = {
  enabled: true,
  blocklist: ["twitter.com", "x.com", "facebook.com", "instagram.com", "tiktok.com", "reddit.com"],
  graceMinutes: 5,
  // Where the "Open Nofri Start" button goes. Point this at your hosted
  // Nofri Start page (your GitHub Pages URL) in Options.
  startUrl: "https://angelohanna98-blip.github.io/nofri-legal/start.html"
};

function nofriNormalizeHost(host) {
  return String(host || "").toLowerCase().replace(/^www\./, "");
}

// Does `host` fall under any blocked domain (exact or a subdomain)?
function nofriHostMatches(host, blocklist) {
  var h = nofriNormalizeHost(host);
  return (blocklist || []).some(function (d) {
    d = nofriNormalizeHost(d);
    return d && (h === d || h.endsWith("." + d));
  });
}

function nofriGetSettings() {
  return chrome.storage.local.get(null).then(function (s) {
    return Object.assign({}, NOFRI_DEFAULTS, s || {});
  });
}

// Is there an unexpired grace pass covering `host`?
function nofriHasGrace(host, grace, now) {
  var h = nofriNormalizeHost(host);
  grace = grace || {};
  return Object.keys(grace).some(function (g) {
    var gd = nofriNormalizeHost(g);
    return (h === gd || h.endsWith("." + gd)) && grace[g] > now;
  });
}
