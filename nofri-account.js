/*
 * nofri-account.js — Nofri Start ↔ Nofri Calendar (Supabase) integration.
 *
 * Sign in with a passwordless email magic link, then read the signed-in user's
 * own calendars/events (protected by Row-Level Security) and add new events.
 * Depends on the Supabase UMD client (window.supabase) and window.NOFRI_CONFIG.
 *
 * All methods degrade quietly: if the library/config/network is unavailable,
 * the page still works as a signed-out start page.
 */
(function (global) {
  "use strict";

  var client = null;

  function cfg() { return global.NOFRI_CONFIG || {}; }

  function getClient() {
    if (client) return client;
    if (!global.supabase || !cfg().supabaseUrl || !cfg().supabaseAnonKey) return null;
    client = global.supabase.createClient(cfg().supabaseUrl, cfg().supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return client;
  }

  // uuid for new event ids (events.id has no DB default).
  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Watch auth state; onChange(session|null) fires now and on every change.
  function init(onChange) {
    var c = getClient();
    if (!c) { onChange(null); return; }
    c.auth.getSession().then(function (res) {
      onChange(res && res.data ? res.data.session : null);
    });
    c.auth.onAuthStateChange(function (_event, session) { onChange(session || null); });
  }

  function redirectUrl() { return location.href.split("#")[0]; }

  // Email + password — the same credentials as the Nofri app/web app.
  function signInPassword(email, password) {
    var c = getClient();
    if (!c) return Promise.reject(new Error("account unavailable"));
    return c.auth.signInWithPassword({ email: email, password: password });
  }

  // Sign in with Apple (OAuth) — matches the app's primary method. Requires the
  // Apple provider to be enabled for the web in Supabase Auth.
  function signInApple() {
    var c = getClient();
    if (!c) return Promise.reject(new Error("account unavailable"));
    return c.auth.signInWithOAuth({ provider: "apple", options: { redirectTo: redirectUrl() } });
  }

  // Passwordless magic link (fallback, e.g. for accounts with no password).
  function signInMagic(email) {
    var c = getClient();
    if (!c) return Promise.reject(new Error("account unavailable"));
    return c.auth.signInWithOtp({ email: email, options: { emailRedirectTo: redirectUrl() } });
  }

  function humanError(err) {
    var m = (err && (err.message || err.error_description || err.msg)) || "";
    if (/invalid login credentials/i.test(m)) return "That email and password didn’t match. Try again, or use “Sign in with Apple”.";
    if (/email not confirmed/i.test(m)) return "Please confirm your email first.";
    if (/provider is not enabled|apple/i.test(m)) return "Apple sign-in isn’t enabled for the web yet — use your email and password.";
    return m || "Couldn’t sign in. Please try again.";
  }

  // Build a complete sign-in UI into `container`. onMsg(text) shows status.
  // Offers Sign in with Apple + email/password (+ a magic-link fallback) — the
  // same options as the Nofri app.
  function mountSignIn(container, onMsg) {
    function msg(t) { if (onMsg) onMsg(t || ""); }
    container.textContent = "";

    var apple = document.createElement("button");
    apple.type = "button";
    apple.innerHTML = "  Sign in with Apple";
    apple.style.cssText = "width:100%;padding:11px 14px;border:none;border-radius:10px;background:#111;color:#fff;font:inherit;font-size:1rem;cursor:pointer;";
    apple.addEventListener("click", function () { msg("Opening Apple…"); signInApple().then(function (r) { if (r && r.error) throw r.error; }).catch(function (e) { msg(humanError(e)); }); });
    container.appendChild(apple);

    var orRow = document.createElement("div");
    orRow.textContent = "or sign in with your email";
    orRow.style.cssText = "text-align:center;color:#857B63;margin:12px 0 10px;font-size:.85rem;";
    container.appendChild(orRow);

    function field(type, ph, name) {
      var i = document.createElement("input");
      i.type = type; i.placeholder = ph; i.autocomplete = name; i.setAttribute("aria-label", ph);
      i.style.cssText = "width:100%;padding:10px 14px;border:1px solid rgba(120,100,70,.25);border-radius:10px;font:inherit;background:#fff;margin-bottom:8px;";
      return i;
    }
    var form = document.createElement("form");
    var email = field("email", "you@email.com", "username");
    var pass = field("password", "Password", "current-password");
    var submit = document.createElement("button");
    submit.type = "submit"; submit.textContent = "Sign in"; submit.className = "btn";
    submit.style.cssText = "width:100%;padding:11px;border:1px solid #B07A2A;background:#B07A2A;color:#fff;border-radius:10px;font:inherit;font-size:1rem;cursor:pointer;";
    form.appendChild(email); form.appendChild(pass); form.appendChild(submit);
    container.appendChild(form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!email.value.trim() || !pass.value) { msg("Enter your email and password."); return; }
      msg("Signing in…");
      signInPassword(email.value.trim(), pass.value).then(function (r) { if (r && r.error) throw r.error; })
        .catch(function (err) { msg(humanError(err)); });
    });

    var magic = document.createElement("a");
    magic.href = "#"; magic.textContent = "Email me a sign-in link instead";
    magic.style.cssText = "display:inline-block;margin-top:12px;color:#8f5f1e;font-size:.85rem;";
    magic.addEventListener("click", function (e) {
      e.preventDefault();
      if (!email.value.trim()) { msg("Enter your email above first."); return; }
      msg("Sending…");
      signInMagic(email.value.trim()).then(function (r) { if (r && r.error) throw r.error; msg("Check your email for a sign-in link."); })
        .catch(function (err) { msg(humanError(err)); });
    });
    container.appendChild(magic);

    return { focus: function () { email.focus(); } };
  }

  function signOut() {
    var c = getClient();
    if (!c) return Promise.resolve();
    return c.auth.signOut();
  }

  function currentUser() {
    var c = getClient();
    if (!c) return Promise.resolve(null);
    return c.auth.getUser().then(function (r) { return r && r.data ? r.data.user : null; });
  }

  // Calendars the user owns or belongs to (RLS-scoped).
  function getCalendars() {
    var c = getClient();
    if (!c) return Promise.resolve([]);
    return c.from("calendars").select("id,name,color,owner_id").then(function (r) {
      return (r && r.data) || [];
    });
  }

  // Upcoming (and still-current) events across the user's calendars.
  function getUpcomingEvents(limit) {
    var c = getClient();
    if (!c) return Promise.resolve([]);
    var nowIso = new Date().toISOString();
    return c.from("events")
      .select("id,title,location,start_at,end_at,is_all_day,color,calendar_id,calendars(name,color)")
      .is("deleted_at", null)
      .gte("end_at", nowIso)
      .order("start_at", { ascending: true })
      .limit(limit || 12)
      .then(function (r) { return (r && r.data) || []; });
  }

  // Events overlapping the [startIso, endIso) window (for the calendar month view).
  function getEventsBetween(startIso, endIso) {
    var c = getClient();
    if (!c) return Promise.resolve([]);
    return c.from("events")
      .select("id,title,location,start_at,end_at,is_all_day,color,calendar_id,calendars(name,color)")
      .is("deleted_at", null)
      .lt("start_at", endIso)
      .gte("end_at", startIso)
      .order("start_at", { ascending: true })
      .then(function (r) { return (r && r.data) || []; });
  }

  // Insert a new event. opts: { title, startAt, endAt, isAllDay, calendarId }.
  function addEvent(opts) {
    var c = getClient();
    if (!c) return Promise.reject(new Error("account unavailable"));
    return currentUser().then(function (user) {
      var row = {
        id: uuid(),
        calendar_id: opts.calendarId,
        creator_id: user ? user.id : null,
        title: opts.title,
        start_at: opts.startAt,
        end_at: opts.endAt,
        is_all_day: !!opts.isAllDay
      };
      return c.from("events").insert(row).select("id,title,start_at,end_at,is_all_day,calendar_id,calendars(name,color)").then(function (r) {
        if (r.error) throw r.error;
        return r.data && r.data[0];
      });
    });
  }

  global.NofriAccount = {
    available: function () { return !!getClient(); },
    init: init,
    mountSignIn: mountSignIn,
    signInPassword: signInPassword,
    signInApple: signInApple,
    signInMagic: signInMagic,
    signOut: signOut,
    currentUser: currentUser,
    getCalendars: getCalendars,
    getUpcomingEvents: getUpcomingEvents,
    getEventsBetween: getEventsBetween,
    addEvent: addEvent
  };
})(typeof window !== "undefined" ? window : this);
