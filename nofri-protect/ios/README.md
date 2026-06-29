# Nofri Protect — iOS app (scaffold)

The native iOS app for Nofri Protect. **Phase 0** here installs system‑wide
family‑safe **encrypted DNS** (blocks adult/malicious sites in every app and
browser, Private included), with a **commitment lock** and an **accountability
partner**. It's a real, openable Xcode project — the foundation to build on.

> This scaffold lives inside the `nofri-legal` repo for now only because the
> agent couldn't create a separate repo. Move `nofri-protect/ios/` into its own
> `nofri-protect` repository when convenient.

## Open it in Xcode
The Xcode project is generated from `project.yml` (kept in text so it's
reviewable and reproducible):

```bash
brew install xcodegen
cd nofri-protect/ios
xcodegen           # generates NofriProtect.xcodeproj
open NofriProtect.xcodeproj
```

Then in Xcode:
1. Select the **NofriProtect** target → **Signing & Capabilities** → choose your
   **Team** (set `DEVELOPMENT_TEAM` in `project.yml`, or pick it in the UI).
2. Confirm capabilities are present (they come from the entitlements file):
   - **Network Extensions** → *DNS Settings* (you may need to enable this for the
     App ID in the Apple Developer portal).
   - **App Groups** → `group.app.nofri.protect`.
3. Run on a **real device** (DNS configuration isn't available in the Simulator).
   On first enable, iOS asks the user to **allow** the DNS configuration.

## What's here
| File | Role |
|---|---|
| `project.yml` | XcodeGen project definition (target, bundle id, entitlements). |
| `Sources/App/NofriProtectApp.swift` | App entry point. |
| `Sources/App/RootView.swift` | SwiftUI UI: status, lock, accountability. |
| `Sources/App/ProtectionStore.swift` | App state tying the pieces together. |
| `Sources/App/DNSProtection.swift` | Installs system DoH via `NEDNSSettingsManager`. |
| `Sources/App/LockManager.swift` | Commitment lock (extend‑only). |
| `Sources/App/Accountability.swift` | Partner email + report hook. |
| `Resources/blocklist.json` | Seed explicit list for the future filter extension. |

## Making it truly unbeatable
The app's lock stops *casual* disabling. For genuine "can't disable / can't
delete / no incognito", combine it with:
- **Screen Time → Content & Privacy Restrictions** (Limit Adult Websites; don't
  allow VPN/DNS or app‑removal changes) with a **passcode the partner holds**.
- Optionally a **NextDNS** profile URL in `DNSProtection.dohURL` for per‑family
  categories + logs the partner can watch.

## Roadmap
- **Phase 1:** `NEFilterDataProvider` content‑filter extension for per‑category
  blocking and richer reporting; supervised/MDM distribution for uninstall‑proofing.
- **Phase 2:** Android (`VpnService`, Device Owner).
- **Phase 3:** Nofri accountability backend — partner invites, weekly reports,
  real‑time tamper alerts (wire `Accountability.reportEndpoint`).
