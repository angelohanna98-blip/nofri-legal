/*
 * coptic.js — Nofri Start
 * Pure, dependency-free Coptic (Alexandrian) calendar helpers.
 *
 * The Coptic calendar is Julian-based: 12 months of 30 days plus a short
 * 13th month ("Nasie", the epagomenal days) of 5 days, or 6 in a leap year.
 * Years count from the "Year of the Martyrs" (Anno Martyrum, AM), whose
 * epoch — 1 Thout AM 1 — falls on 29 August 284 AD in the Julian calendar.
 *
 * Everything here is offline and deterministic. No network, no dependencies.
 */

(function (global) {
  "use strict";

  // Julian Day Number of 1 Thout, AM 1.
  // Verified: this puts 1 Thout 1742 (Nayrouz) on 11 Sep 2025, and
  // 28 Jun 2026 on 21 Paona 1742. (Note: the common "1825029" is off by one
  // for the year/month formula used below — 1825030 is correct here.)
  var COPTIC_EPOCH_JDN = 1825030;

  // Liturgical (Greek-derived) month names, index 0..12.
  var MONTHS = [
    "Thout", "Paopi", "Hathor", "Koiak", "Tobi", "Meshir", "Paremhat",
    "Parmouti", "Pashons", "Paoni", "Epip", "Mesori", "Nasie"
  ];

  // Civil (Arabic/Coptic) month names, index 0..12. These are the keys used
  // by the bundled synaxarium dataset (e.g. "5 Amshir"). If you swap in a
  // different synaxarium dataset, align this array to its key spelling.
  var MONTHS_CIVIL = [
    "Tout", "Baba", "Hator", "Kiahk", "Toba", "Amshir", "Baramhat",
    "Baramouda", "Bashans", "Paona", "Epep", "Mesra", "Nasie"
  ];

  // Gregorian (proleptic) date -> Julian Day Number.
  // Fliegel & Van Flandern, via the US Naval Observatory formula.
  function gregorianToJDN(year, month, day) {
    var a = Math.floor((14 - month) / 12);
    var y = year + 4800 - a;
    var m = month + 12 * a - 3;
    return day
      + Math.floor((153 * m + 2) / 5)
      + 365 * y
      + Math.floor(y / 4)
      - Math.floor(y / 100)
      + Math.floor(y / 400)
      - 32045;
  }

  // A JS Date (local time) -> Coptic date object.
  // Phase 1 uses the civil (midnight) local date. The Coptic liturgical day
  // actually begins at sunset the prior evening; sunset rollover is deferred.
  function toCoptic(date) {
    var jdn = gregorianToJDN(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate()
    );
    var c = jdn - COPTIC_EPOCH_JDN;
    var year = Math.floor((4 * c + 1463) / 1461);
    var c1 = c - Math.floor((1461 * (year - 1)) / 4);
    var monthIndex = Math.floor(c1 / 30); // 0..12
    var day = c1 - 30 * monthIndex + 1;

    return {
      year: year,
      month: monthIndex + 1, // 1..13
      day: day,
      monthName: MONTHS[monthIndex],
      monthNameCivil: MONTHS_CIVIL[monthIndex],
      // Lookup key for the synaxarium dataset, e.g. "21 Paona".
      key: day + " " + MONTHS_CIVIL[monthIndex],
      // Human-friendly liturgical label, e.g. "21 Paoni 1742".
      label: day + " " + MONTHS[monthIndex] + " " + year
    };
  }

  // Coptic leap year: the short month "Nasie" has 6 days when year % 4 === 3.
  function isCopticLeapYear(year) {
    return year % 4 === 3;
  }

  // 1-based day of the Gregorian year (1..366). Used to rotate the daily
  // verse and prayer so they advance exactly once per day.
  function dayOfYear(date) {
    var start = new Date(date.getFullYear(), 0, 0);
    var diff = date - start;
    return Math.floor(diff / 86400000);
  }

  // Fasting status for a day, computed only from rules we can assert with
  // confidence. We never claim "not fasting": the movable fasts (Great Lent,
  // the Apostles' Fast, the Fast of Nineveh) depend on Pascha and are NOT
  // computed here, so on those days this returns { fasting: null } and the UI
  // simply says nothing rather than something wrong.
  function fastInfo(coptic, date) {
    var m = coptic.month, d = coptic.day;
    // Nativity (Advent) Fast: 16 Hathor (m3) .. 28 Koiak (m4); 29 Koiak is the feast.
    if ((m === 3 && d >= 16) || (m === 4 && d <= 28)) {
      return { fasting: true, label: "The Nativity Fast", note: "The Advent fast before the Nativity" };
    }
    // Dormition (St Mary's) Fast: 1..15 Mesori (m12); 16 Mesori is the feast.
    if (m === 12 && d >= 1 && d <= 15) {
      return { fasting: true, label: "The Dormition Fast", note: "The fast of the Theotokos" };
    }
    // Great feasts that break even the weekly fast: the Nativity (29 Koiak)
    // and Theophany (11 Tobi). Make no fasting claim on these days.
    if ((m === 4 && d === 29) || (m === 5 && d === 11)) {
      return { fasting: null, label: "", note: "" };
    }
    // Weekly Wednesday / Friday fast (outside the fast-free seasons, which are
    // movable and not computed here).
    var dow = date.getDay();
    if (dow === 3) return { fasting: true, label: "Wednesday fast", note: "A weekly fast day" };
    if (dow === 5) return { fasting: true, label: "Friday fast", note: "A weekly fast day" };
    return { fasting: null, label: "", note: "" };
  }

  var Coptic = {
    EPOCH_JDN: COPTIC_EPOCH_JDN,
    MONTHS: MONTHS,
    MONTHS_CIVIL: MONTHS_CIVIL,
    gregorianToJDN: gregorianToJDN,
    toCoptic: toCoptic,
    isCopticLeapYear: isCopticLeapYear,
    dayOfYear: dayOfYear,
    fastInfo: fastInfo
  };

  // Expose for both browser (window.Coptic) and any module consumer.
  global.Coptic = Coptic;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Coptic;
  }
})(typeof window !== "undefined" ? window : this);
