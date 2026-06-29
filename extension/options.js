/*
 * options.js — Nofri Focus settings page
 */

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  var IS_LOCKED = false; // commitment lock active → can't loosen settings

  function flashSaved() {
    var s = $("saved");
    s.textContent = "Saved";
    setTimeout(function () { s.textContent = ""; }, 1200);
  }

  // Render a removable domain list. When locked, the remove (×) buttons are
  // omitted so entries cannot be taken away. `save()` persists after a removal.
  function renderDomainList(boxId, list, emptyText, save) {
    var box = $(boxId);
    box.innerHTML = "";
    if (!list.length) {
      var li0 = document.createElement("li");
      li0.className = "muted";
      li0.textContent = emptyText;
      box.appendChild(li0);
      return;
    }
    list.forEach(function (domain, i) {
      var li = document.createElement("li");
      var span = document.createElement("span");
      span.textContent = domain;
      li.appendChild(span);
      if (!IS_LOCKED) {
        var btn = document.createElement("button");
        btn.className = "remove"; btn.title = "Remove"; btn.textContent = "×";
        btn.addEventListener("click", function () {
          list.splice(i, 1);
          save().then(function () { renderDomainList(boxId, list, emptyText, save); flashSaved(); });
        });
        li.appendChild(btn);
      }
      box.appendChild(li);
    });
  }

  var DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  var DAY_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function windowLabel(w) {
    var days = w.days || [];
    var dl;
    if (!days.length || days.length === 7) dl = "Every day";
    else if (days.slice().sort().join(",") === "1,2,3,4,5") dl = "Weekdays";
    else if (days.slice().sort().join(",") === "0,6") dl = "Weekends";
    else dl = days.slice().sort().map(function (d) { return DAY_FULL[d]; }).join(", ");
    return dl + "  ·  " + w.start + "–" + w.end;
  }

  function renderWindows(schedule) {
    var box = $("windows");
    box.innerHTML = "";
    var wins = schedule.allow || [];
    if (!wins.length) {
      var li = document.createElement("li");
      li.className = "muted";
      li.textContent = "No free windows yet — focus stays on.";
      box.appendChild(li);
      return;
    }
    wins.forEach(function (w, i) {
      var li = document.createElement("li");
      var span = document.createElement("span");
      span.textContent = windowLabel(w);
      var btn = document.createElement("button");
      btn.className = "remove"; btn.title = "Remove"; btn.textContent = "×";
      btn.addEventListener("click", function () {
        wins.splice(i, 1);
        chrome.storage.local.set({ schedule: schedule }).then(function () {
          renderWindows(schedule); flashSaved();
        });
      });
      li.appendChild(span); li.appendChild(btn);
      box.appendChild(li);
    });
  }

  function buildDayPicker() {
    var box = $("day-picker");
    box.innerHTML = "";
    // default selection: weekdays
    [1, 2, 3, 4, 5, 6, 0].forEach(function (d) {
      var chip = document.createElement("span");
      chip.className = "day-chip" + ([1, 2, 3, 4, 5].indexOf(d) !== -1 ? " on" : "");
      chip.dataset.day = d;
      chip.textContent = DAY_NAMES[d];
      chip.addEventListener("click", function () { chip.classList.toggle("on"); });
      box.appendChild(chip);
    });
  }

  function selectedDays() {
    return Array.prototype.map.call(document.querySelectorAll("#day-picker .day-chip.on"),
      function (c) { return parseInt(c.dataset.day, 10); });
  }

  nofriGetSettings().then(function (s) {
    var blocklist = s.blocklist.slice();
    var schedule = Object.assign({ mode: "always", allow: [] }, s.schedule || {});

    function reflectScheduleMode() {
      var on = schedule.mode === "scheduled";
      $("scheduled").checked = on;
      $("schedule-area").classList.toggle("disabled", !on);
    }

    reflectScheduleMode();
    renderWindows(schedule);
    buildDayPicker();

    $("scheduled").addEventListener("change", function () {
      schedule.mode = $("scheduled").checked ? "scheduled" : "always";
      chrome.storage.local.set({ schedule: schedule }).then(function () {
        reflectScheduleMode(); flashSaved();
      });
    });

    $("add-window").addEventListener("submit", function (e) {
      e.preventDefault();
      var start = e.target.start.value, end = e.target.end.value;
      if (!start || !end) return;
      var days = selectedDays();
      schedule.allow = schedule.allow || [];
      schedule.allow.push({ days: days, start: start, end: end });
      chrome.storage.local.set({ schedule: schedule }).then(function () {
        renderWindows(schedule); flashSaved();
      });
    });

    var protection = Object.assign({ enabled: false, safeSearch: true, blockExplicit: true, extra: [] }, s.protection || {});
    var lock = Object.assign({ until: 0 }, s.lock || {});

    function saveBlocklist() { return chrome.storage.local.set({ blocklist: blocklist }); }
    function drawBlocklist() { renderDomainList("blocklist", blocklist, "Nothing blocked yet.", saveBlocklist); }
    function saveProtection() { return chrome.storage.local.set({ protection: protection }); }
    function drawExtra() { renderDomainList("extra-list", protection.extra, "No extra sites added.", saveProtection); }

    $("enabled").checked = !!s.enabled;
    $("graceMinutes").value = s.graceMinutes;
    $("startUrl").value = s.startUrl;
    $("protect").checked = !!protection.enabled;
    $("safesearch").checked = !!protection.safeSearch;

    $("enabled").addEventListener("change", function () {
      if (IS_LOCKED && !$("enabled").checked) { $("enabled").checked = true; return; }
      chrome.storage.local.set({ enabled: $("enabled").checked }).then(flashSaved);
    });
    $("protect").addEventListener("change", function () {
      if (IS_LOCKED && !$("protect").checked) { $("protect").checked = true; return; }
      protection.enabled = $("protect").checked; saveProtection().then(flashSaved);
    });
    $("safesearch").addEventListener("change", function () {
      if (IS_LOCKED && !$("safesearch").checked) { $("safesearch").checked = true; return; }
      protection.safeSearch = $("safesearch").checked; saveProtection().then(flashSaved);
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

    function normalizeInput(raw) {
      var domain = raw;
      try { if (/^https?:\/\//i.test(raw)) domain = new URL(raw).hostname; } catch (err) {}
      return nofriNormalizeHost(domain);
    }

    $("add-domain").addEventListener("submit", function (e) {
      e.preventDefault();
      var domain = normalizeInput(e.target.domain.value.trim());
      if (domain && blocklist.indexOf(domain) === -1) {
        blocklist.push(domain);
        saveBlocklist().then(function () { drawBlocklist(); flashSaved(); });
      }
      e.target.reset();
    });

    $("add-extra").addEventListener("submit", function (e) {
      e.preventDefault();
      var domain = normalizeInput(e.target.domain.value.trim());
      if (domain && protection.extra.indexOf(domain) === -1) {
        protection.extra.push(domain);
        saveProtection().then(function () { drawExtra(); flashSaved(); });
      }
      e.target.reset();
    });

    // ---- commitment lock ----
    function applyLock() {
      IS_LOCKED = nofriIsLocked({ lock: lock }, Date.now());
      document.body.classList.toggle("is-locked", IS_LOCKED);
      ["protect", "safesearch", "enabled", "scheduled", "reset", "lock-dur", "lock-btn"].forEach(function (id) {
        var node = $(id); if (node) node.disabled = IS_LOCKED;
      });
      if (IS_LOCKED) {
        $("lock-status").textContent = "";
        $("lock-status").appendChild(document.createTextNode("Locked until "));
        var b = document.createElement("span"); b.className = "locked-note"; b.textContent = new Date(lock.until).toLocaleString();
        $("lock-status").appendChild(b);
        $("lock-btn").textContent = "Locked";
      } else {
        $("lock-status").textContent = "Not locked.";
        $("lock-btn").textContent = "Lock protection on";
      }
      drawBlocklist(); drawExtra();
    }

    $("lock-btn").addEventListener("click", function () {
      if (IS_LOCKED) return;
      var sel = $("lock-dur");
      var hrs = parseInt(sel.value, 10) || 1;
      var human = sel.options[sel.selectedIndex].text;
      if (!window.confirm("Lock Nofri protection on for " + human + "?\n\nYou will NOT be able to turn protection or focus off, remove blocked sites, or shorten the lock until it ends.")) return;
      lock = { until: Date.now() + hrs * 3600000 };
      protection.enabled = true; $("protect").checked = true;
      chrome.storage.local.set({ lock: lock, protection: protection, enabled: true }).then(function () {
        $("enabled").checked = true;
        applyLock(); flashSaved();
      });
    });

    applyLock(); // also draws the lists (with/without × per lock state)

    $("reset").addEventListener("click", function () {
      if (IS_LOCKED) return;
      blocklist = NOFRI_DEFAULTS.blocklist.slice();
      schedule = { mode: "always", allow: [] };
      protection = { enabled: false, safeSearch: true, blockExplicit: true, extra: [] };
      lock = { until: 0 };
      chrome.storage.local.set({
        enabled: NOFRI_DEFAULTS.enabled,
        blocklist: blocklist,
        graceMinutes: NOFRI_DEFAULTS.graceMinutes,
        startUrl: NOFRI_DEFAULTS.startUrl,
        schedule: schedule, protection: protection, lock: lock, grace: {}
      }).then(function () {
        $("enabled").checked = NOFRI_DEFAULTS.enabled;
        $("graceMinutes").value = NOFRI_DEFAULTS.graceMinutes;
        $("startUrl").value = NOFRI_DEFAULTS.startUrl;
        $("protect").checked = false; $("safesearch").checked = true;
        reflectScheduleMode();
        renderWindows(schedule);
        applyLock();
        flashSaved();
      });
    });
  });
})();
