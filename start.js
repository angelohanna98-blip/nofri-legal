/*
 * start.js — Nofri Start
 * Controller for the distraction-free start page. Renders four blocks
 * (Orthodox daily content, quick links, sports, news), persists user config
 * to localStorage (local-first, no account), and caches network data with a
 * TTL so the page stays calm and respects upstream rate limits.
 *
 * Depends on coptic.js (window.Coptic).
 *
 * ── Phase-2 extension seam ────────────────────────────────────────────────
 * A future browser extension that BLOCKS distracting sites reads the user's
 * allowlist from `nofri.start.config.v1` -> config.focus.trusted (an array of
 * URLs). Phase 1 only renders these as quick links; the blocking itself is
 * never implemented in the page. Keep that JSON shape stable.
 */

(function () {
  "use strict";

  var CONFIG_KEY = "nofri.start.config.v1";

  var DEFAULT_CONFIG = {
    teams: [],
    news: [
      { name: "Orthodox Christian Network", feedUrl: "https://myocn.net/feed/", max: 3 },
      { name: "BBC News", feedUrl: "https://feeds.bbci.co.uk/news/rss.xml", max: 3 }
    ],
    links: [
      { label: "Holy Bible", url: "https://www.biblegateway.com" },
      { label: "Coptic Readings", url: "https://www.copticchurch.net/readings" },
      { label: "Agpeya — Hours", url: "https://agpeya.org" }
    ],
    // Phase-2 extension allowlist (see seam note above).
    focus: {
      trusted: [
        "https://www.biblegateway.com",
        "https://www.copticchurch.net",
        "https://agpeya.org"
      ]
    },
    prefs: { newsService: "rss2json", cacheTtlMin: 60 }
  };

  // ── tiny DOM helpers ──────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  function el(tag, props, children) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        if (k === "class") node.className = props[k];
        else if (k === "text") node.textContent = props[k];
        else if (k === "html") node.innerHTML = props[k];
        else node.setAttribute(k, props[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c) node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }

  // ── config persistence ────────────────────────────────────────────────────
  function loadConfig() {
    try {
      var raw = localStorage.getItem(CONFIG_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      var parsed = JSON.parse(raw);
      // shallow-merge defaults so new fields appear for existing users
      return Object.assign({}, DEFAULT_CONFIG, parsed, {
        prefs: Object.assign({}, DEFAULT_CONFIG.prefs, parsed.prefs),
        focus: Object.assign({}, DEFAULT_CONFIG.focus, parsed.focus)
      });
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }
  }

  function saveConfig(cfg) {
    try { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); } catch (e) {}
  }

  // ── cache (TTL in minutes) ────────────────────────────────────────────────
  function getCache(key, ttlMin) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj.fetchedAt) return null;
      if (Date.now() - obj.fetchedAt > ttlMin * 60000) return null;
      return obj.data;
    } catch (e) { return null; }
  }

  function setCache(key, data) {
    try { localStorage.setItem(key, JSON.stringify({ fetchedAt: Date.now(), data: data })); } catch (e) {}
  }

  function hash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
    return Math.abs(h).toString(36);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Orthodox block (renders synchronously; works fully offline)
  // ════════════════════════════════════════════════════════════════════════
  var GREG_OPTS = { weekday: "long", year: "numeric", month: "long", day: "numeric" };

  function renderHeader(now, coptic) {
    $("date-greg").textContent = now.toLocaleDateString(undefined, GREG_OPTS);
    $("date-coptic").textContent =
      coptic.day + " " + coptic.monthName + " " + coptic.year +
      " · Year of the Martyrs";
  }

  function renderDailyText(now) {
    var doy = Coptic.dayOfYear(now);
    fetch("data/verses.json").then(function (r) { return r.json(); }).then(function (d) {
      var v = d.verses[doy % d.verses.length];
      clear($("verse"));
      $("verse").appendChild(el("p", { class: "verse-text", text: "“" + v.text + "”" }));
      $("verse").appendChild(el("p", { class: "verse-ref", text: "— " + v.ref }));
    }).catch(function () { $("verse").textContent = ""; });

    fetch("data/prayers.json").then(function (r) { return r.json(); }).then(function (d) {
      var p = d.prayers[doy % d.prayers.length];
      clear($("prayer"));
      $("prayer").appendChild(el("h3", { class: "prayer-title", text: p.title }));
      $("prayer").appendChild(el("p", { text: p.text }));
    }).catch(function () { $("prayer").textContent = ""; });
  }

  function renderSaint(coptic) {
    var box = $("saint");
    // Lazy-load the synaxarium after first paint; never block the date.
    fetch("data/synaxarium.json").then(function (r) { return r.json(); }).then(function (d) {
      var entry = d.entries && d.entries[coptic.key];
      clear(box);
      if (entry && entry.feasts && entry.feasts.length) {
        var list = el("ul", { class: "feast-list" });
        entry.feasts.forEach(function (f) { list.appendChild(el("li", { text: f })); });
        box.appendChild(list);
        if (entry.description) {
          var more = el("details", { class: "synaxarium" }, [
            el("summary", { text: "Read the commemoration" }),
            el("div", { class: "synaxarium-body", html: entry.description })
          ]);
          box.appendChild(more);
        }
      } else {
        renderSaintFallback(box, coptic);
      }
    }).catch(function () { renderSaintFallback(box, coptic); });
  }

  function renderSaintFallback(box, coptic) {
    clear(box);
    box.appendChild(el("p", { class: "muted", text: "Commemorations for " + coptic.label + "." }));
    box.appendChild(el("p", {}, [
      el("a", {
        href: "https://st-takla.org/Saints/Coptic-Orthodox-Saints-Biography/Coptic-Synaxarium-Or-Synaxarion.html",
        target: "_blank", rel: "noopener", text: "Read today’s Synaxarium →"
      })
    ]));
  }

  // ════════════════════════════════════════════════════════════════════════
  // Quick links / focus block
  // ════════════════════════════════════════════════════════════════════════
  function renderLinks(cfg) {
    var box = $("links");
    clear(box);
    if (!cfg.links.length) {
      box.appendChild(el("p", { class: "muted", text: "Add the few sites you trust in Settings." }));
      return;
    }
    cfg.links.forEach(function (l) {
      box.appendChild(el("a", { class: "pill", href: l.url, target: "_blank", rel: "noopener", text: l.label }));
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // Sports block — ESPN primary, TheSportsDB v1 fallback. Fetch once + cache.
  // ════════════════════════════════════════════════════════════════════════
  function renderSports(cfg) {
    var box = $("sports");
    clear(box);
    if (!cfg.teams.length) {
      box.appendChild(el("p", { class: "muted", text: "Add the teams you follow in Settings to see last results and next fixtures — calmly, with no live feed." }));
      return;
    }
    cfg.teams.forEach(function (team) {
      var card = el("div", { class: "card sport-card" }, [
        el("h3", { text: team.name }),
        el("p", { class: "muted skel", text: "Loading…" })
      ]);
      box.appendChild(card);
      loadTeam(team, cfg.prefs.cacheTtlMin).then(function (info) {
        renderSportCard(card, team, info);
      }).catch(function () {
        renderSportError(card, team);
      });
    });
  }

  function renderSportCard(card, team, info) {
    clear(card);
    card.appendChild(el("h3", { text: team.name }));
    if (info.last) {
      card.appendChild(el("p", { class: "sport-line" }, [
        el("span", { class: "sport-label", text: "Last" }), " " + info.last
      ]));
    }
    if (info.next) {
      card.appendChild(el("p", { class: "sport-line" }, [
        el("span", { class: "sport-label", text: "Next" }), " " + info.next
      ]));
    }
    if (!info.last && !info.next) {
      card.appendChild(el("p", { class: "muted", text: "No recent or upcoming games found." }));
    }
  }

  function renderSportError(card, team) {
    clear(card);
    card.appendChild(el("h3", { text: team.name }));
    var retry = el("a", { href: "#", class: "muted", text: "Couldn’t load — tap to retry" });
    retry.addEventListener("click", function (e) {
      e.preventDefault();
      clear(card);
      card.appendChild(el("h3", { text: team.name }));
      card.appendChild(el("p", { class: "muted", text: "Loading…" }));
      // bust cache for this team
      try { localStorage.removeItem("nofri.start.cache.sports." + (team.teamId || team.name)); } catch (e2) {}
      loadTeam(team, 0).then(function (info) { renderSportCard(card, team, info); })
        .catch(function () { renderSportError(card, team); });
    });
    card.appendChild(retry);
  }

  function loadTeam(team, ttlMin) {
    var cacheKey = "nofri.start.cache.sports." + (team.teamId || team.name);
    var cached = ttlMin > 0 ? getCache(cacheKey, ttlMin) : null;
    if (cached) return Promise.resolve(cached);
    var p = team.provider === "thesportsdb" ? fetchSportsDB(team) : fetchEspn(team);
    return p.then(function (info) { setCache(cacheKey, info); return info; })
      .catch(function () {
        // Adapter fallback: if ESPN failed, try TheSportsDB by name.
        if (team.provider !== "thesportsdb") {
          return fetchSportsDB(team).then(function (info) { setCache(cacheKey, info); return info; });
        }
        throw new Error("sports unavailable");
      });
  }

  function fetchEspn(team) {
    // https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/teams/{id}/schedule
    var url = "https://site.api.espn.com/apis/site/v2/sports/" +
      encodeURIComponent(team.sport) + "/" + encodeURIComponent(team.league) +
      "/teams/" + encodeURIComponent(team.teamId) + "/schedule";
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("espn " + r.status);
      return r.json();
    }).then(function (data) {
      var events = (data && data.events) || [];
      var last = null, next = null;
      events.forEach(function (ev) {
        var comp = ev.competitions && ev.competitions[0];
        if (!comp) return;
        var done = comp.status && comp.status.type && comp.status.type.completed;
        var line = espnLine(comp, ev, done);
        if (done) last = line; // events are chronological; keep the latest completed
        else if (!next) next = line;
      });
      return { last: last, next: next };
    });
  }

  function espnLine(comp, ev, done) {
    var cs = comp.competitors || [];
    var home = cs.filter(function (c) { return c.homeAway === "home"; })[0] || cs[0];
    var away = cs.filter(function (c) { return c.homeAway === "away"; })[0] || cs[1];
    function nm(c) { return c && c.team ? (c.team.abbreviation || c.team.displayName || c.team.name) : "?"; }
    var when = ev.date ? new Date(ev.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
    if (done && home && away && home.score != null && away.score != null) {
      return nm(away) + " " + away.score + " @ " + nm(home) + " " + home.score + " (" + when + ")";
    }
    return nm(away) + " @ " + nm(home) + " · " + when;
  }

  function fetchSportsDB(team) {
    // Resolve a TheSportsDB team id (free shared key "3"), then last/next events.
    var base = "https://www.thesportsdb.com/api/v1/json/3/";
    var idP = team.sportsdbId
      ? Promise.resolve(team.sportsdbId)
      : fetch(base + "searchteams.php?t=" + encodeURIComponent(team.name))
          .then(function (r) { return r.json(); })
          .then(function (d) {
            var t = d && d.teams && d.teams[0];
            if (!t) throw new Error("team not found");
            return t.idTeam;
          });
    return idP.then(function (id) {
      return Promise.all([
        fetch(base + "eventslast.php?id=" + id).then(function (r) { return r.json(); }).catch(function () { return null; }),
        fetch(base + "eventsnext.php?id=" + id).then(function (r) { return r.json(); }).catch(function () { return null; })
      ]).then(function (res) {
        var lastE = res[0] && res[0].results && res[0].results[0];
        var nextE = res[1] && res[1].events && res[1].events[0];
        return {
          last: lastE ? sdbLine(lastE, true) : null,
          next: nextE ? sdbLine(nextE, false) : null
        };
      });
    });
  }

  function sdbLine(ev, done) {
    var when = ev.dateEvent ? new Date(ev.dateEvent).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
    if (done && ev.intHomeScore != null && ev.intAwayScore != null) {
      return ev.strHomeTeam + " " + ev.intHomeScore + " – " + ev.intAwayScore + " " + ev.strAwayTeam + " (" + when + ")";
    }
    return ev.strEvent + " · " + when;
  }

  // ════════════════════════════════════════════════════════════════════════
  // News block — rss2json primary, allorigins fallback. Cache + TTL.
  // ════════════════════════════════════════════════════════════════════════
  function renderNews(cfg) {
    var box = $("news");
    clear(box);
    if (!cfg.news.length) {
      box.appendChild(el("p", { class: "muted", text: "Add a few trusted RSS feeds in Settings. No Twitter, no infinite scroll — just headlines." }));
      return;
    }
    cfg.news.forEach(function (src) {
      var card = el("div", { class: "card news-card" }, [
        el("h3", { text: src.name }),
        el("p", { class: "muted skel", text: "Loading…" })
      ]);
      box.appendChild(card);
      loadFeed(src, cfg).then(function (items) {
        renderNewsCard(card, src, items);
      }).catch(function () {
        renderNewsError(card, src, cfg);
      });
    });
  }

  function renderNewsCard(card, src, items) {
    clear(card);
    card.appendChild(el("h3", { text: src.name }));
    if (!items.length) {
      card.appendChild(el("p", { class: "muted", text: "No headlines right now." }));
      return;
    }
    var ul = el("ul", { class: "news-list" });
    items.slice(0, src.max || 3).forEach(function (it) {
      ul.appendChild(el("li", {}, [
        el("a", { href: it.link, target: "_blank", rel: "noopener", text: it.title })
      ]));
    });
    card.appendChild(ul);
  }

  function renderNewsError(card, src, cfg) {
    clear(card);
    card.appendChild(el("h3", { text: src.name }));
    var retry = el("a", { href: "#", class: "muted", text: "Couldn’t load — tap to retry" });
    retry.addEventListener("click", function (e) {
      e.preventDefault();
      try { localStorage.removeItem("nofri.start.cache.news." + hash(src.feedUrl)); } catch (e2) {}
      clear(card);
      card.appendChild(el("h3", { text: src.name }));
      card.appendChild(el("p", { class: "muted", text: "Loading…" }));
      loadFeed(src, Object.assign({}, cfg, { prefs: Object.assign({}, cfg.prefs, { cacheTtlMin: 0 }) }))
        .then(function (items) { renderNewsCard(card, src, items); })
        .catch(function () { renderNewsError(card, src, cfg); });
    });
    card.appendChild(retry);
  }

  function loadFeed(src, cfg) {
    var cacheKey = "nofri.start.cache.news." + hash(src.feedUrl);
    var cached = cfg.prefs.cacheTtlMin > 0 ? getCache(cacheKey, cfg.prefs.cacheTtlMin) : null;
    if (cached) return Promise.resolve(cached);
    return fetchRss2Json(src.feedUrl)
      .catch(function () { return fetchAllOrigins(src.feedUrl); })
      .then(function (items) { setCache(cacheKey, items); return items; });
  }

  function fetchRss2Json(feedUrl) {
    var url = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(feedUrl);
    return fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || d.status !== "ok" || !d.items) throw new Error("rss2json failed");
      return d.items.map(function (it) { return { title: it.title, link: it.link }; });
    });
  }

  function fetchAllOrigins(feedUrl) {
    var url = "https://api.allorigins.win/raw?url=" + encodeURIComponent(feedUrl);
    return fetch(url).then(function (r) { return r.text(); }).then(function (xml) {
      var doc = new DOMParser().parseFromString(xml, "text/xml");
      var nodes = doc.querySelectorAll("item, entry");
      var items = [];
      nodes.forEach(function (n) {
        var t = n.querySelector("title");
        var l = n.querySelector("link");
        var link = l ? (l.getAttribute("href") || l.textContent) : "";
        items.push({ title: t ? t.textContent : "(untitled)", link: link });
      });
      if (!items.length) throw new Error("no items");
      return items;
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // Settings panel
  // ════════════════════════════════════════════════════════════════════════
  function openSettings(cfg) {
    var dlg = $("settings");
    buildSettings(cfg);
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
  }

  function buildSettings(cfg) {
    fillList("set-teams", cfg.teams, function (t) {
      return t.teamId
        ? t.name + "  ·  " + t.sport + "/" + t.league + " #" + t.teamId
        : t.name + "  ·  by name";
    }, function (i) { cfg.teams.splice(i, 1); saveConfig(cfg); buildSettings(cfg); renderSports(cfg); });

    fillList("set-news", cfg.news, function (n) { return n.name + "  ·  " + n.feedUrl; },
      function (i) { cfg.news.splice(i, 1); saveConfig(cfg); buildSettings(cfg); renderNews(cfg); });

    fillList("set-links", cfg.links, function (l) { return l.label + "  ·  " + l.url; },
      function (i) {
        var removed = cfg.links.splice(i, 1)[0];
        if (removed) cfg.focus.trusted = cfg.focus.trusted.filter(function (u) { return u !== removed.url; });
        saveConfig(cfg); buildSettings(cfg); renderLinks(cfg);
      });
  }

  function fillList(id, arr, labelFn, removeFn) {
    var box = $(id);
    clear(box);
    arr.forEach(function (item, i) {
      var btn = el("button", { class: "remove", title: "Remove", text: "×" });
      btn.addEventListener("click", function () { removeFn(i); });
      box.appendChild(el("li", {}, [el("span", { text: labelFn(item) }), btn]));
    });
    if (!arr.length) box.appendChild(el("li", { class: "muted", text: "None yet." }));
  }

  function wireSettings(cfg) {
    $("open-settings").addEventListener("click", function (e) { e.preventDefault(); openSettings(cfg); });
    $("close-settings").addEventListener("click", function () { closeDlg(); });

    // Simple path: add a team by name (resolved via TheSportsDB at load time).
    $("add-team").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target;
      var name = f.name.value.trim();
      if (!name) return;
      cfg.teams.push({ name: name, provider: "thesportsdb" });
      saveConfig(cfg); f.reset();
      buildSettings(cfg); renderSports(cfg);
    });

    // Advanced path: precise ESPN sport/league/teamId.
    $("add-team-espn").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target;
      var team = {
        name: f.name.value.trim(),
        sport: f.sport.value.trim(),
        league: f.league.value.trim(),
        teamId: f.teamId.value.trim()
      };
      if (!team.name || !team.sport || !team.league || !team.teamId) return;
      cfg.teams.push(team); saveConfig(cfg); f.reset();
      buildSettings(cfg); renderSports(cfg);
    });

    $("add-news").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target;
      var src = { name: f.name.value.trim(), feedUrl: f.feedUrl.value.trim(), max: 3 };
      if (!src.name || !src.feedUrl) return;
      cfg.news.push(src); saveConfig(cfg); f.reset();
      buildSettings(cfg); renderNews(cfg);
    });

    $("add-link").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target;
      var link = { label: f.label.value.trim(), url: f.url.value.trim() };
      if (!link.label || !link.url) return;
      cfg.links.push(link);
      if (cfg.focus.trusted.indexOf(link.url) === -1) cfg.focus.trusted.push(link.url);
      saveConfig(cfg); f.reset();
      buildSettings(cfg); renderLinks(cfg);
    });

    $("export-config").addEventListener("click", function (e) {
      e.preventDefault();
      var blob = new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" });
      var a = el("a", { href: URL.createObjectURL(blob), download: "nofri-start-config.json" });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    });

    $("import-config").addEventListener("change", function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var imported = JSON.parse(reader.result);
          var merged = Object.assign(cfg, imported);
          saveConfig(merged);
          location.reload();
        } catch (err) { alert("That file wasn’t a valid Nofri Start config."); }
      };
      reader.readAsText(file);
    });
  }

  function closeDlg() {
    var dlg = $("settings");
    if (typeof dlg.close === "function") dlg.close();
    else dlg.removeAttribute("open");
  }

  // ════════════════════════════════════════════════════════════════════════
  // Boot
  // ════════════════════════════════════════════════════════════════════════
  function init() {
    if (!window.Coptic) { console.error("coptic.js not loaded"); return; }
    var now = new Date();
    var coptic = Coptic.toCoptic(now);
    var cfg = loadConfig();

    // Synchronous, offline-first.
    renderHeader(now, coptic);
    renderLinks(cfg);

    // Bundled-data blocks (fast local fetches).
    renderDailyText(now);
    renderSaint(coptic);

    // Network blocks — additive, fail quietly.
    renderSports(cfg);
    renderNews(cfg);

    wireSettings(cfg);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
