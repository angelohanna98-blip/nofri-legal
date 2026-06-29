/*
 * focus.js — Nofri Focus reminder page
 * Shows which site was blocked, a calming verse, and three ways forward:
 * open Nofri Start, go back, or take a short timed pass.
 */

(function () {
  "use strict";

  var VERSES = [
    { text: "Be still, and know that I am God.", ref: "Psalm 46:10" },
    { text: "Take therefore no thought for the morrow: sufficient unto the day is the evil thereof.", ref: "Matthew 6:34" },
    { text: "But seek ye first the kingdom of God, and his righteousness.", ref: "Matthew 6:33" },
    { text: "Set your affection on things above, not on things on the earth.", ref: "Colossians 3:2" },
    { text: "Let all things be done decently and in order.", ref: "1 Corinthians 14:40" },
    { text: "Redeeming the time, because the days are evil.", ref: "Ephesians 5:16" },
    { text: "Whatsoever ye do, do it heartily, as to the Lord.", ref: "Colossians 3:23" },
    { text: "Thou wilt keep him in perfect peace, whose mind is stayed on thee.", ref: "Isaiah 26:3" }
  ];

  function param(name) {
    var m = new RegExp("[?&]" + name + "=([^&]*)").exec(location.search);
    return m ? decodeURIComponent(m[1]) : "";
  }

  function isHttp(url) {
    try { var u = new URL(url); return u.protocol === "http:" || u.protocol === "https:"; }
    catch (e) { return false; }
  }

  function pickVerse() {
    var day = Math.floor(Date.now() / 86400000);
    return VERSES[day % VERSES.length];
  }

  var from = param("from");
  var to = param("to");
  var protectedBlock = param("reason") === "protected";

  if (from) document.getElementById("from").textContent = from;
  var v = pickVerse();
  document.getElementById("verse-text").textContent = "“" + v.text + "”";
  document.getElementById("verse-ref").textContent = "— " + v.ref;

  // For a protection block, firm up the message and remove the grace pass.
  if (protectedBlock) {
    var h1 = document.querySelector("h1"); if (h1) h1.textContent = "Blocked.";
    var fromP = document.querySelector(".from");
    if (fromP) fromP.textContent = "Nofri Protect blocked this site. Turn to something good.";
    var graceBtn = document.getElementById("grace"); if (graceBtn) graceBtn.style.display = "none";
    var note = document.querySelector(".grace-note"); if (note) note.style.display = "none";
  }

  nofriGetSettings().then(function (s) {
    document.getElementById("mins").textContent = s.graceMinutes;

    document.getElementById("start").addEventListener("click", function () {
      location.href = isHttp(s.startUrl) ? s.startUrl : "about:blank";
    });

    document.getElementById("back").addEventListener("click", function () {
      if (history.length > 1) history.back();
      else location.href = isHttp(s.startUrl) ? s.startUrl : "about:blank";
    });

    document.getElementById("grace").addEventListener("click", function () {
      if (!isHttp(to)) return;
      var host;
      try { host = new URL(to).hostname; } catch (e) { return; }
      var key = nofriNormalizeHost(host);
      chrome.storage.local.get("grace").then(function (data) {
        var grace = data.grace || {};
        var now = Date.now();
        // prune expired passes, then grant this one
        Object.keys(grace).forEach(function (g) { if (grace[g] <= now) delete grace[g]; });
        grace[key] = now + s.graceMinutes * 60000;
        chrome.storage.local.set({ grace: grace }).then(function () {
          location.href = to;
        });
      });
    });
  });
})();
