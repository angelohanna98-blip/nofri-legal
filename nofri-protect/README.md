# Nofri Protect

The protective layer of Nofri — blocking and managing what can be accessed
online, the strong way we discussed (think Freedom / Covenant Eyes, but
Orthodox and built for families).

A browser extension alone can't be unbeatable (another browser, incognito, or
uninstall defeats it). Real strength comes from the **device and network**
layers. This folder is where we build toward that, strongest-first.

---

## ✅ Available now: `NofriProtect.mobileconfig` (iPhone / iPad)

A ready-to-install iOS configuration profile that routes **all DNS** on the
device through **Cloudflare for Families** (`1.1.1.3`) over encrypted DNS-over-
HTTPS. That blocks adult and malicious sites **system-wide — in every app and
browser, including Private/Incognito** — because it works below the browser.
It's marked non-removable so it can't be casually deleted.

**Install (2 minutes):**
1. Get the file onto the iPhone — AirDrop it, email it to yourself, or host it
   and open the link in **Safari** (must be Safari).
2. Tap **Allow** when it offers to download a profile.
3. **Settings → General → VPN & Device Management → Nofri Protect → Install**
   (enter the device passcode).

**Make it truly locked (so a child/teen can't undo it):**
- **Settings → Screen Time → Content & Privacy Restrictions** → turn on, then:
  - **Web Content → Limit Adult Websites** (removes Private Browsing too),
  - under **Allow Changes**, set **VPN & DNS = Don't Allow** and
    **Account/Profile changes = Don't Allow**.
- Set a **Screen Time passcode that an accountability partner holds** (not the
  user). Now the DNS filter can't be turned off and the profile can't be removed
  without that passcode. This is the closest you get to "can't bypass, can't
  delete" on a normal (non-supervised) iPhone.

**To remove (legitimately):** Settings → General → VPN & Device Management →
Nofri Protect → Remove (requires the passcode if locked above).

> Swap the resolver if you prefer: edit `ServerURL` to CleanBrowsing
> (`https://doh.cleanbrowsing.org/doh/family-filter/`) or a **NextDNS** profile
> URL (which adds logs an accountability partner can watch + custom blocklists).

---

## Roadmap — toward the full Nofri Protect app

**Phase 0 (now): no-code strong protection.**
DNS profile above + the **Nofri Focus** browser extension (desktop: explicit
blocklist, enforced SafeSearch, commitment lock) + Screen Time lock.

**Phase 1: Nofri Protect for iOS (native app).** 🛠️ *Scaffold started — see
[`ios/`](ios/).* A SwiftUI app that installs system‑wide encrypted family‑safe
DNS (`NEDNSSettingsManager`), with a **commitment lock** and an **accountability
partner**. Open it with `xcodegen && open NofriProtect.xcodeproj` (details in
`ios/README.md`).
- A **Network Extension content filter** (`NEFilterDataProvider`) + DNS proxy so
  filtering, categories, and the allow/block lists live in one Nofri app.
- A **commitment lock** and an **accountability partner** (invite + reports +
  tamper alerts) — you can't quietly disable it.
- Distributed **supervised / via MDM** for genuine uninstall-proofing.
- Requires: an **Apple Developer account** ($99/yr) and a new app repo (Xcode /
  Swift). This is a real build, not a static-site change.

**Phase 2: Android.**
A `VpnService` that filters DNS/traffic locally, set as **Device Owner** so it
can't be disabled.

**Phase 3: Nofri accountability backend.**
Partner invites, weekly reports, real-time "filter was turned off" alerts —
the relationship layer that makes any of this actually stick.

---

## Decisions needed to start Phase 1
1. **Which platform first?** (Your users are mostly iPhone → iOS first.)
2. **Apple Developer account** — do you have one, or should setup be step 1?
3. **Accountability model** — partner holds the passcode, gets reports, or both?
4. **New repo** — Nofri Protect needs its own app repo (this static-site repo
   can't hold a native app). Create `nofri-protect` as a separate repo?
