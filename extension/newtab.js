/*
 * newtab.js — Nofri Focus new-tab override
 * Opens the user's configured Nofri Start page so every new tab begins with
 * intention instead of a blank search box. Falls back to a gentle prompt if no
 * valid Start URL is set yet.
 */

(function () {
  "use strict";

  function isHttp(url) {
    try { var u = new URL(url); return u.protocol === "http:" || u.protocol === "https:"; }
    catch (e) { return false; }
  }

  function showFallback() {
    document.getElementById("msg").classList.add("hide");
    document.getElementById("fallback").classList.remove("hide");
    var opts = document.getElementById("opts");
    if (opts) opts.addEventListener("click", function (e) {
      e.preventDefault();
      if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
      else window.open(chrome.runtime.getURL("options.html"));
    });
  }

  nofriGetSettings().then(function (s) {
    if (isHttp(s.startUrl)) {
      // replace() so the new tab doesn't add a blank entry to history
      location.replace(s.startUrl);
    } else {
      showFallback();
    }
  }).catch(showFallback);
})();
