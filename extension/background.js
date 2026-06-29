/*
 * background.js — Nofri Focus service worker (MV3)
 * Watches top-level navigations and, when focus mode is on, redirects
 * navigations to blocked sites to the gentle focus.html reminder page.
 */

importScripts("shared.js");

// Seed defaults on first install (without clobbering existing settings).
chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.get(null).then(function (cur) {
    chrome.storage.local.set(Object.assign({}, NOFRI_DEFAULTS, cur || {}));
  });
});

chrome.webNavigation.onBeforeNavigate.addListener(function (details) {
  if (details.frameId !== 0) return; // top-level navigations only

  var u;
  try { u = new URL(details.url); } catch (e) { return; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return; // skip our own pages, about:, etc.

  nofriGetSettings().then(function (s) {
    // 1) Enforce SafeSearch (a redirect that adds the safe param, not a block).
    var ss = nofriSafeSearchRedirect(details.url, s);
    if (ss) { chrome.tabs.update(details.tabId, { url: ss }); return; }

    // 2) Explicit-content protection — hard block, no grace pass.
    if (nofriExplicitBlocked(u.hostname, s)) {
      chrome.tabs.update(details.tabId, {
        url: chrome.runtime.getURL("focus.html") +
          "?reason=protected&from=" + encodeURIComponent(u.hostname)
      });
      return;
    }

    // 3) The focus blocklist (respects grace pass + schedule).
    if (nofriShouldBlock(u.hostname, s, new Date())) {
      chrome.tabs.update(details.tabId, {
        url: chrome.runtime.getURL("focus.html") +
          "?from=" + encodeURIComponent(u.hostname) +
          "&to=" + encodeURIComponent(details.url)
      });
    }
  });
});
