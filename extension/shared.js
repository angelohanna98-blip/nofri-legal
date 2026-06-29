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
  startUrl: "https://angelohanna98-blip.github.io/nofri-legal/start.html",
  // Scheduling. mode "always" = block whenever focus is on. mode "scheduled"
  // = focus is on EXCEPT during the "allow" free windows below, when the
  // blocklist is suspended. Each window: { days:[0..6 (Sun..Sat)], start, end }
  // with start/end as "HH:MM" (24h). A window with start > end crosses midnight.
  schedule: { mode: "always", allow: [] },
  // Protection — the always-on, harder shield for explicit/harmful content.
  // Unlike the focus blocklist, this ignores the grace pass and the schedule.
  protection: { enabled: false, safeSearch: true, blockExplicit: true, extra: [] },
  // Commitment lock. While Date.now() < lock.until, the UI will not let you
  // turn protection or focus OFF, remove blocked sites, or shorten the lock.
  // (A lock makes relapse hard; it is not uninstall-proof — see PROTECT.md.)
  lock: { until: 0 }
};

// Seed list of well-known explicit domains. This is a STARTER set for the
// browser layer; comprehensive coverage comes from the DNS layer documented in
// PROTECT.md (e.g. Cloudflare for Families 1.1.1.3 / CleanBrowsing).
var NOFRI_EXPLICIT_SITES = [
  "pornhub.com", "xvideos.com", "xnxx.com", "xhamster.com", "redtube.com",
  "youporn.com", "spankbang.com", "onlyfans.com", "chaturbate.com", "brazzers.com",
  "stripchat.com", "rule34.xxx", "e621.net"
];
// High-precision tokens matched against the HOSTNAME only (kept tight to avoid
// false positives like "essex" or "scunthorpe").
var NOFRI_EXPLICIT_TOKENS = ["porn", "xxx", "xvideos", "xnxx", "xhamster", "hentai", "camgirl", "camsex", "nsfw"];

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

function nofriTimeToMin(t) {
  var p = String(t || "").split(":");
  return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
}

// Is `date` inside one of the schedule's "allow" (free) windows?
// When true, the blocklist is suspended. Supports windows crossing midnight.
function nofriInFreeWindow(schedule, date) {
  if (!schedule || schedule.mode !== "scheduled") return false;
  var windows = schedule.allow || [];
  var day = date.getDay();
  var prevDay = (day + 6) % 7;
  var mins = date.getHours() * 60 + date.getMinutes();

  function dayOk(w, d) { return !w.days || !w.days.length || w.days.indexOf(d) !== -1; }

  return windows.some(function (w) {
    var s = nofriTimeToMin(w.start), e = nofriTimeToMin(w.end);
    if (s === e) return false; // empty window
    if (s < e) {
      return dayOk(w, day) && mins >= s && mins < e;
    }
    // crosses midnight: [s..24:00) on the start day, [00:00..e) on the next day
    return (dayOk(w, day) && mins >= s) || (dayOk(w, prevDay) && mins < e);
  });
}

// Should `host` be blocked right now, given settings and current time?
function nofriShouldBlock(host, settings, now) {
  if (!settings.enabled) return false;
  if (!nofriHostMatches(host, settings.blocklist)) return false;
  if (nofriInFreeWindow(settings.schedule, now)) return false;
  if (nofriHasGrace(host, settings.grace, now.getTime())) return false;
  return true;
}

// Is the commitment lock currently active?
function nofriIsLocked(settings, nowMs) {
  return !!(settings && settings.lock && settings.lock.until > nowMs);
}

// Explicit-content block — always on when protection is enabled, and NOT
// bypassable by the grace pass or schedule. Matches the seed list, the user's
// extra domains, and high-precision tokens in the hostname.
function nofriExplicitBlocked(host, settings) {
  var p = settings && settings.protection;
  if (!p || !p.enabled || !p.blockExplicit) return false;
  var h = nofriNormalizeHost(host);
  var list = (typeof NOFRI_EXPLICIT_SITES !== "undefined" ? NOFRI_EXPLICIT_SITES : []).concat(p.extra || []);
  if (list.some(function (d) { d = nofriNormalizeHost(d); return d && (h === d || h.endsWith("." + d)); })) return true;
  var tokens = (typeof NOFRI_EXPLICIT_TOKENS !== "undefined" ? NOFRI_EXPLICIT_TOKENS : []);
  return tokens.some(function (t) { return h.indexOf(t) !== -1; });
}

// Enforce SafeSearch on the major engines by adding the safe parameter when
// protection is on. Returns a redirect URL string, or null if no change needed.
function nofriSafeSearchRedirect(rawUrl, settings) {
  var p = settings && settings.protection;
  if (!p || !p.enabled || !p.safeSearch) return null;
  var u;
  try { u = new URL(rawUrl); } catch (e) { return null; }
  var host = nofriNormalizeHost(u.hostname);
  function ensure(param, value) {
    if (u.searchParams.get(param) === value) return null;
    u.searchParams.set(param, value);
    return u.toString();
  }
  if (/(^|\.)google\./.test(host) && u.pathname.indexOf("/search") === 0) return ensure("safe", "active");
  if (host.indexOf("bing.com") !== -1 && u.pathname.indexOf("/search") === 0) return ensure("adlt", "strict");
  if (host.indexOf("duckduckgo.com") !== -1) return ensure("kp", "1");
  return null;
}
