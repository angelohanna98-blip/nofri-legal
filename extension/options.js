/*
 * options.js — Nofri Focus settings page
 */

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function flashSaved() {
    var s = $("saved");
    s.textContent = "Saved";
    setTimeout(function () { s.textContent = ""; }, 1200);
  }

  function renderBlocklist(list) {
    var box = $("blocklist");
    box.innerHTML = "";
    if (!list.length) {
      var li = document.createElement("li");
      li.className = "muted";
      li.textContent = "Nothing blocked yet.";
      box.appendChild(li);
      return;
    }
    list.forEach(function (domain, i) {
      var li = document.createElement("li");
      var span = document.createElement("span");
      span.textContent = domain;
      var btn = document.createElement("button");
      btn.className = "remove";
      btn.title = "Remove";
      btn.textContent = "×";
      btn.addEventListener("click", function () {
        list.splice(i, 1);
        chrome.storage.local.set({ blocklist: list }).then(function () {
          renderBlocklist(list); flashSaved();
        });
      });
      li.appendChild(span);
      li.appendChild(btn);
      box.appendChild(li);
    });
  }

  nofriGetSettings().then(function (s) {
    var blocklist = s.blocklist.slice();

    $("enabled").checked = !!s.enabled;
    $("graceMinutes").value = s.graceMinutes;
    $("startUrl").value = s.startUrl;
    renderBlocklist(blocklist);

    $("enabled").addEventListener("change", function () {
      chrome.storage.local.set({ enabled: $("enabled").checked }).then(flashSaved);
    });

    $("graceMinutes").addEventListener("change", function () {
      var n = parseInt($("graceMinutes").value, 10);
      if (!n || n < 1) n = 1;
      if (n > 120) n = 120;
      $("graceMinutes").value = n;
      chrome.storage.local.set({ graceMinutes: n }).then(flashSaved);
    });

    $("startUrl").addEventListener("change", function () {
      chrome.storage.local.set({ startUrl: $("startUrl").value.trim() }).then(flashSaved);
    });

    $("add-domain").addEventListener("submit", function (e) {
      e.preventDefault();
      var raw = e.target.domain.value.trim();
      if (!raw) return;
      // accept a pasted URL or a bare domain
      var domain = raw;
      try { if (/^https?:\/\//i.test(raw)) domain = new URL(raw).hostname; } catch (err) {}
      domain = nofriNormalizeHost(domain);
      if (domain && blocklist.indexOf(domain) === -1) {
        blocklist.push(domain);
        chrome.storage.local.set({ blocklist: blocklist }).then(function () {
          renderBlocklist(blocklist); flashSaved();
        });
      }
      e.target.reset();
    });

    $("reset").addEventListener("click", function () {
      blocklist = NOFRI_DEFAULTS.blocklist.slice();
      chrome.storage.local.set({
        enabled: NOFRI_DEFAULTS.enabled,
        blocklist: blocklist,
        graceMinutes: NOFRI_DEFAULTS.graceMinutes,
        startUrl: NOFRI_DEFAULTS.startUrl,
        grace: {}
      }).then(function () {
        $("enabled").checked = NOFRI_DEFAULTS.enabled;
        $("graceMinutes").value = NOFRI_DEFAULTS.graceMinutes;
        $("startUrl").value = NOFRI_DEFAULTS.startUrl;
        renderBlocklist(blocklist);
        flashSaved();
      });
    });
  });
})();
