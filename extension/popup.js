/*
 * popup.js — Nofri Focus toolbar popup: quick toggle + link to settings.
 */

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function refresh(s) {
    $("enabled").checked = !!s.enabled;
    if (!s.enabled) {
      $("status").textContent = "Focus off";
    } else if (nofriInFreeWindow(s.schedule, new Date())) {
      $("status").textContent = "Free time · focus paused by schedule";
    } else {
      $("status").textContent = "Focus on · " + s.blocklist.length + " sites blocked";
    }
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
