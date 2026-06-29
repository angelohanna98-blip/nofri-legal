/*
 * popup.js — Nofri Focus toolbar popup: quick toggle + link to settings.
 */

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function refresh(s) {
    var locked = nofriIsLocked(s, Date.now());
    $("enabled").checked = !!s.enabled;
    $("enabled").disabled = locked;
    var protect = s.protection && s.protection.enabled ? " · 🛡 protected" : "";
    if (locked) {
      $("status").textContent = "🔒 Locked until " + new Date(s.lock.until).toLocaleString() + protect;
    } else if (!s.enabled) {
      $("status").textContent = "Focus off" + protect;
    } else if (nofriInFreeWindow(s.schedule, new Date())) {
      $("status").textContent = "Free time · focus paused by schedule" + protect;
    } else {
      $("status").textContent = "Focus on · " + s.blocklist.length + " sites blocked" + protect;
    }
  }

  nofriGetSettings().then(function (s) {
    refresh(s);
    $("enabled").addEventListener("change", function () {
      nofriGetSettings().then(function (cur) {
        if (nofriIsLocked(cur, Date.now())) { $("enabled").checked = true; return; } // can't disable while locked
        chrome.storage.local.set({ enabled: $("enabled").checked }).then(function () {
          nofriGetSettings().then(refresh);
        });
      });
    });
  });

  $("open-options").addEventListener("click", function () {
    if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
    else window.open(chrome.runtime.getURL("options.html"));
  });
})();
