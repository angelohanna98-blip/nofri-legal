# Nofri Protect — how to actually make it unbeatable

You asked for protection "that no one can get past — no incognito, can't delete,"
stronger than Freedom. Here is the honest engineering reality and the plan to get
there.

## The hard truth about a browser extension

A Chrome/Edge extension **cannot** be truly unbeatable on its own. Anyone can:
- open a different browser (Safari, Firefox, a portable browser),
- use a private/incognito window (extensions are off there unless explicitly allowed),
- or remove the extension from `chrome://extensions`.

So "no incognito, can't delete" is **not** achievable with extension code alone.
That guarantee comes from a deeper layer — the operating system or the network.
The apps that are genuinely hard to bypass (Covenant Eyes, Canopy, Freedom's
locked mode, Bark) all combine several layers **plus an accountability partner**.

## The Nofri Protect stack (weak → strong)

**Layer 1 — Browser (this extension, built):**
- Explicit-content blocklist (seed list + your own additions + hostname tokens).
- Enforced **SafeSearch** on Google/Bing/DuckDuckGo.
- A **commitment lock**: once locked, the UI won't let you turn protection/focus
  off, remove blocked sites, or shorten the lock until it expires.
- *Bypassable by:* another browser, incognito, uninstalling. Good for honest
  moments; not a wall.

**Layer 2 — DNS filtering (strong, covers every browser & app on the device):**
Point the device's DNS at a filtering resolver. This blocks adult/malicious
domains network-wide — incognito included — because DNS happens below the browser.
- **Cloudflare for Families** (adult + malware): `1.1.1.3` / `1.0.0.3`
  (or DoH `https://family.cloudflare-dns.com/dns-query`).
- **CleanBrowsing Family**: `185.228.168.168` / `185.228.169.168`.
- **NextDNS** (free tier): create a profile, enable the *Porn*/*Adult* native
  categories + SafeSearch + YouTube Restricted, then set the device to that
  profile. NextDNS also gives you logs an accountability partner can watch.
- Set it on the **router** (covers the whole home) and/or per-device.
- *Bypassable by:* changing DNS, using a VPN/cellular — unless Layer 3 locks
  those settings.

**Layer 3 — Device lock (delivers "can't change, can't delete, no incognito"):**
Use the platform's parental-control system, with the passcode held by someone
else (see Layer 4):
- **iOS/iPadOS:** Settings → Screen Time → **Content & Privacy Restrictions** →
  *Web Content → Limit Adult Websites* (forces Safari/Chrome safe browsing and
  removes incognito), **disallow** installing/deleting apps and changing DNS/VPN,
  and set a **Screen Time passcode** you don't know. This is the closest thing to
  "can't delete / no incognito" on a normal iPhone.
- **macOS:** Screen Time → Content & Privacy, same idea.
- **Android:** Google **Family Link** (content filters, app-install lock) or a
  Digital Wellbeing + DNS lock.
- **Windows:** **Microsoft Family Safety** (web & search filtering, app limits).
- *Truly strong* when the restrictions passcode is not yours.

**Layer 4 — Accountability (the real deterrent):**
The lock is only as strong as your inability to undo it. Give the Screen Time /
NextDNS / router-admin passcode to a **trusted accountability partner** (spouse,
priest, friend) and have them receive the reports. This is how Covenant Eyes works
and why it's effective: not perfect technology, but a relationship you don't want
to break.

**Layer 5 — A native Nofri Protect app (the product path to beat Freedom):**
To own all of this in one Nofri app instead of stitching tools together:
- **iOS:** a Network Extension **content filter** (`NEFilterDataProvider`) + a DNS
  proxy, shipped in **Supervised/MDM** mode so it can't be removed and incognito
  is disabled by policy.
- **Android:** a `VpnService` that filters DNS/traffic locally, set as Device
  Owner so it can't be disabled.
- **Desktop:** a system service that locks DNS + a hosts/proxy filter.
- Plus a Nofri accountability backend (partner invites, weekly reports, tamper
  alerts). This is a real build — but it's the honest route to "unbeatable."

## What to do right now (strongest setup without writing the native app)

1. Install **Nofri Focus**, turn **Protection** on, and set a **Commitment lock**.
2. Set **Cloudflare 1.1.1.3** (or NextDNS with adult categories) on your router
   **and** your phone.
3. Turn on **Screen Time → Limit Adult Websites**, disallow app removal and
   DNS/VPN changes, and set a Screen Time passcode.
4. Give that passcode to an **accountability partner**. Done together, layers 2–4
   already block adult content in every browser, remove incognito, and stop
   casual uninstalling.

No software is 100% unbeatable. Layered filtering + a passcode you don't hold +
an accountability partner is how the best tools get as close as it gets — and
it's genuinely strong.
