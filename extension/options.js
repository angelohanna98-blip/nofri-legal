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
      schedule = { mode: "always", allow: [] };
      chrome.storage.local.set({
        enabled: NOFRI_DEFAULTS.enabled,
        blocklist: blocklist,
        graceMinutes: NOFRI_DEFAULTS.graceMinutes,
        startUrl: NOFRI_DEFAULTS.startUrl,
        schedule: schedule,
        grace: {}
      }).then(function () {
        $("enabled").checked = NOFRI_DEFAULTS.enabled;
        $("graceMinutes").value = NOFRI_DEFAULTS.graceMinutes;
        $("startUrl").value = NOFRI_DEFAULTS.startUrl;
        renderBlocklist(blocklist);
        reflectScheduleMode();
        renderWindows(schedule);
        flashSaved();
      });
    });
  });
})();
