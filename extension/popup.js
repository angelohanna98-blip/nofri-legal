/*
 * popup.js — Nofri Focus toolbar popup: quick toggle + link to settings.
 */

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function refresh(s) {
    $("enabled").checked = !!s.enabled;
    $("status").textContent = s.enabled
      ? "Focus on · " + s.blocklist.length + " sites blocked"
      : "Focus off";
  }

  nofriGetSettings().then(function (s) {
    refresh(s);
    $("enabled").addEventListener("change", function () {
      var enabled = $("enabled").checked;
      chrome.storage.local.set({ enabled: enabled }).then(function () {
        nofriGetSettings().then(refresh);
      });
    });
  });

  $("open-options").addEventListener("click", function () {
    if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
    else window.open(chrome.runtime.getURL("options.html"));
  });
})();
