/*
 * calendar.js — Nofri Calendar (web). A month view of the signed-in user's
 * events from the Nofri Calendar Supabase backend, with the Coptic date under
 * every day. Works as a plain Coptic calendar when signed out.
 */
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function el(tag, props, kids) {
    var n = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      if (k === "class") n.className = props[k];
      else if (k === "text") n.textContent = props[k];
      else n.setAttribute(k, props[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); }

  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function dateKey(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function sameDay(a, b) { return dateKey(a) === dateKey(b); }
  function addDays(d, n) { var x = new Date(d); x.setDate(d.getDate() + n); return x; }

  var today = new Date();
  var view = { y: today.getFullYear(), m: today.getMonth() };
  var selected = new Date(today);
  var eventsByDate = {};   // "YYYY-MM-DD" -> [events]
  var calendars = [];
  var signedIn = false;

  function gridStart() {
    var first = new Date(view.y, view.m, 1);
    return addDays(first, -first.getDay()); // back up to Sunday
  }

  function eventTime(ev) {
    if (ev.is_all_day) return "All day";
    return new Date(ev.start_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  function renderMonth() {
    $("cal-title").textContent = MONTHS[view.m] + " " + view.y;
    var grid = $("cal-grid");
    clear(grid);
    var start = gridStart();
    for (var i = 0; i < 42; i++) {
      var d = addDays(start, i);
      var inMonth = d.getMonth() === view.m;
      var cop = window.Coptic ? Coptic.toCoptic(d) : null;
      var cell = el("div", { class: "cell" + (inMonth ? "" : " out") + (sameDay(d, today) ? " today" : "") + (sameDay(d, selected) ? " sel" : "") });
      cell.appendChild(el("div", { class: "dnum", text: String(d.getDate()) }));
      if (cop) cell.appendChild(el("div", { class: "cop", text: cop.day + (d.getDate() === 1 || cop.day === 1 ? " " + cop.monthName : "") }));
      var evs = eventsByDate[dateKey(d)] || [];
      if (evs.length) {
        var wrap = el("div", { class: "evs" });
        evs.slice(0, 3).forEach(function (ev) { wrap.appendChild(el("div", { class: "ev", text: ev.title || "(untitled)" })); });
        if (evs.length > 3) wrap.appendChild(el("div", { class: "more", text: "+" + (evs.length - 3) + " more" }));
        wrap.appendChild(el("span", { class: "evdot" }));
        cell.appendChild(wrap);
      }
      (function (dd) { cell.addEventListener("click", function () { selected = dd; renderMonth(); renderDayPanel(); }); })(new Date(d));
      grid.appendChild(cell);
    }
  }

  function renderDayPanel() {
    var panel = $("day-panel");
    panel.hidden = false;
    var cop = window.Coptic ? Coptic.toCoptic(selected) : null;
    $("day-title").textContent = selected.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    var sub = cop ? (cop.day + " " + cop.monthName + " " + cop.year + " · Year of the Martyrs") : "";
    if (window.Coptic && Coptic.fastInfo) {
      var fi = Coptic.fastInfo(cop, selected);
      if (fi.fasting) sub += "  ·  ☩ " + fi.label;
    }
    $("day-sub").textContent = sub;

    var box = $("day-events");
    clear(box);
    var evs = eventsByDate[dateKey(selected)] || [];
    if (!signedIn) {
      box.appendChild(el("p", { class: "muted", text: "Sign in to see and add your events for this day." }));
    } else if (!evs.length) {
      box.appendChild(el("p", { class: "muted", text: "No events on this day." }));
    } else {
      evs.forEach(function (ev) {
        var meta = [];
        if (ev.calendars && ev.calendars.name) meta.push(ev.calendars.name);
        if (ev.location) meta.push(ev.location);
        box.appendChild(el("div", { class: "ev-row" }, [
          el("div", { class: "when", text: eventTime(ev) }),
          el("div", {}, [
            el("div", { text: ev.title || "(untitled)" }),
            meta.length ? el("div", { class: "meta", text: meta.join(" · ") }) : null
          ])
        ]));
      });
    }
    renderQuickAdd();
  }

  function renderQuickAdd() {
    var box = $("day-add");
    clear(box);
    if (!signedIn || !calendars.length) return;
    var form = el("form", { class: "qa" });
    var title = el("input", { name: "title", placeholder: "Add an event…", autocomplete: "off" });
    var hh = el("input", { name: "time", type: "time", value: "09:00", "aria-label": "Time" });
    var sel = el("select", { name: "cal", "aria-label": "Calendar" });
    calendars.forEach(function (c) { sel.appendChild(el("option", { value: c.id, text: c.name })); });
    var btn = el("button", { class: "btn", type: "submit", text: "Add" });
    form.appendChild(title); form.appendChild(hh); form.appendChild(sel); form.appendChild(btn);
    box.appendChild(form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!title.value.trim()) return;
      var t = (hh.value || "09:00").split(":");
      var start = new Date(selected); start.setHours(parseInt(t[0], 10) || 9, parseInt(t[1], 10) || 0, 0, 0);
      var end = new Date(start.getTime() + 3600000);
      btn.disabled = true; btn.textContent = "Adding…";
      NofriAccount.addEvent({ title: title.value.trim(), calendarId: sel.value, startAt: start.toISOString(), endAt: end.toISOString(), isAllDay: false })
        .then(function () { loadEvents(); }).catch(function () { btn.disabled = false; btn.textContent = "Add"; });
    });
  }

  function loadEvents() {
    if (!signedIn || !window.NofriAccount) { eventsByDate = {}; renderMonth(); renderDayPanel(); return; }
    var start = gridStart();
    var end = addDays(start, 42);
    Promise.all([
      NofriAccount.getEventsBetween(start.toISOString(), end.toISOString()),
      NofriAccount.getCalendars()
    ]).then(function (res) {
      eventsByDate = {};
      (res[0] || []).forEach(function (ev) {
        var k = dateKey(new Date(ev.start_at));
        (eventsByDate[k] = eventsByDate[k] || []).push(ev);
      });
      calendars = res[1] || [];
      renderMonth(); renderDayPanel();
    }).catch(function () { renderMonth(); renderDayPanel(); });
  }

  function go(delta) {
    var m = view.m + delta;
    view.y += Math.floor(m / 12); view.m = ((m % 12) + 12) % 12;
    loadEvents();
  }

  function renderAccount() {
    var mini = $("account-mini");
    function signedOut() {
      signedIn = false;
      clear(mini);
      var b = el("button", { class: "ghost-btn", text: "Sign in" });
      b.addEventListener("click", function () { $("signin-panel").scrollIntoView({ behavior: "smooth" }); var e = $("signin-email"); if (e) e.focus(); });
      mini.appendChild(b);
      $("signin-panel").hidden = false;
      loadEvents();
    }
    function signedInView(session) {
      signedIn = true;
      clear(mini);
      var who = (session.user && session.user.email) || "Account";
      mini.appendChild(el("span", { class: "muted", text: who, style: "margin-right:10px;font-size:.85rem" }));
      var out = el("button", { class: "ghost-btn", text: "Sign out" });
      out.addEventListener("click", function () { NofriAccount.signOut(); });
      mini.appendChild(out);
      $("signin-panel").hidden = true;
      loadEvents();
    }
    if (!window.NofriAccount) { signedOut(); return; }
    NofriAccount.init(function (session) { if (session) signedInView(session); else signedOut(); });
  }

  function init() {
    $("prev").addEventListener("click", function () { go(-1); });
    $("next").addEventListener("click", function () { go(1); });
    $("today-btn").addEventListener("click", function () { view = { y: today.getFullYear(), m: today.getMonth() }; selected = new Date(today); loadEvents(); });

    var box = $("signin-box");
    if (window.NofriAccount && NofriAccount.available()) {
      NofriAccount.mountSignIn(box, function (t) { $("signin-msg").textContent = t; });
    } else if (box) {
      box.textContent = "Account service isn’t reachable right now.";
    }

    renderMonth();
    renderDayPanel();
    renderAccount();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
