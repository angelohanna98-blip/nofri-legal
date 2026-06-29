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

  // Send a passwordless magic link to `email`, returning to this page.
  function signIn(email) {
    var c = getClient();
    if (!c) return Promise.reject(new Error("account unavailable"));
    var redirect = location.href.split("#")[0];
    return c.auth.signInWithOtp({ email: email, options: { emailRedirectTo: redirect } });
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
    signIn: signIn,
    signOut: signOut,
    currentUser: currentUser,
    getCalendars: getCalendars,
    getUpcomingEvents: getUpcomingEvents,
    addEvent: addEvent
  };
})(typeof window !== "undefined" ? window : this);
