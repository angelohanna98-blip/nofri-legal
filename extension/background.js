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
    if (!nofriShouldBlock(u.hostname, s, new Date())) return;

    var target = chrome.runtime.getURL("focus.html") +
      "?from=" + encodeURIComponent(u.hostname) +
      "&to=" + encodeURIComponent(details.url);
    chrome.tabs.update(details.tabId, { url: target });
  });
});
