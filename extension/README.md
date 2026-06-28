# Nofri Focus

A small browser extension (Chrome / Edge / Brave, Manifest V3) that gently
blocks distracting sites so you can browse with intention. It's the phase‑2
companion to **[Nofri Start](../start.html)**: the start page sets the tone for
the day, and this extension keeps the Twitter rabbit‑hole closed.

When you navigate to a blocked site, Nofri Focus redirects the tab to a calm
**Pause** page — a verse, and three choices: open Nofri Start, go back, or take
a short timed pass if you genuinely need a few minutes.

## What it does

- **Blocklist, not a cage.** You browse normally; only the sites you list are
  intercepted. Defaults: `twitter.com`, `x.com`, `facebook.com`,
  `instagram.com`, `tiktok.com`, `reddit.com`. Edit the list any time.
- **Gentle, not punitive.** The Pause page offers a way forward, including a
  timed grace pass (default 5 minutes) so focus mode never traps you.
- **One‑click toggle.** The toolbar popup turns focus on/off instantly.
- **Scheduling (free windows).** Optionally let focus pause itself during
  windows you choose (e.g. weekday evenings 6–9pm). Outside those windows the
  blocklist stays on. Windows are per‑weekday and may cross midnight.
- **Local & private.** All settings live in `chrome.storage.local` on your
  device. No account, no servers, no tracking — same ethos as Nofri Start.

## Install (unpacked, for now)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this `extension/` folder.
4. Open the extension's **Options** and set **"Open Nofri Start" goes to** to
   your hosted Nofri Start URL (your GitHub Pages address), then add or remove
   blocked sites to taste.

> Icons (16/32/48/128) are included. Publishing to the Chrome Web Store later
> just needs a store listing and a zip of this folder; the code is ready as‑is.

## How it works

| File | Role |
|---|---|
| `manifest.json` | MV3 manifest; permissions `webNavigation`, `tabs`, `storage`. |
| `background.js` | Service worker. On each top‑level navigation, if focus is on and the host is blocked (and not under an active grace pass), redirects the tab to `focus.html`. |
| `shared.js` | Defaults + helpers (`nofriHostMatches`, `nofriGetSettings`, grace check), shared by the worker and the pages. |
| `focus.html` / `focus.js` | The Pause page: verse, "Open Nofri Start", "Go back", and the timed grace pass. |
| `options.html` / `options.js` | Manage the blocklist, focus toggle, pass length, and Start URL. |
| `popup.html` / `popup.js` | Toolbar quick toggle + link to Options. |
| `icons/` | Toolbar/store icons (16/32/48/128) — the Nofri ☦ on gold. |

Blocking uses `webNavigation.onBeforeNavigate` + `tabs.update` rather than
`declarativeNetRequest` so the Pause page can show *which* site was blocked and
offer a per‑site timed pass.

## Relationship to Nofri Start's config

Nofri Start stores your trusted links at
`nofri.start.config.v1.focus.trusted` — an **allowlist** of places you *want*
to go. Nofri Focus works from a **blocklist** of places to *avoid*. They're
complementary and independent today; a later version could read the Start
page's trusted list to suggest a blocklist. Keeping them separate means each
works on its own.

## Notes & limits

- Desktop Chromium browsers only. Firefox needs minor manifest tweaks
  (`background.scripts` + `browser_specific_settings`); mobile browsers don't
  support this kind of extension.
- A determined user can disable any extension — this is a *guardrail* for the
  honest moment of distraction, not a hard lock.
