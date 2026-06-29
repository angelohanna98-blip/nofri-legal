import Foundation
import NetworkExtension

/// Configures system-wide encrypted DNS (DNS-over-HTTPS) so that adult and
/// malicious domains are blocked in **every** app and browser on the device —
/// including Private/Incognito — because filtering happens below the browser.
///
/// Uses Cloudflare for Families (1.1.1.3). Swap `dohURL` for a NextDNS profile
/// URL to add per-family categories + logs an accountability partner can watch.
enum DNSProtection {

    static let manager = NEDNSSettingsManager.shared()
    static let dohURL = URL(string: "https://family.cloudflare-dns.com/dns-query")!
    static let serverAddresses = ["1.1.1.3", "1.0.0.3"]

    /// Turn protection on (prompts the user to allow the DNS configuration the
    /// first time). Always-on via an on-demand connect rule.
    static func enable(_ completion: @escaping (Error?) -> Void) {
        manager.loadFromPreferences { _ in
            let settings = NEDNSOverHTTPSSettings(servers: serverAddresses)
            settings.serverURL = dohURL
            manager.dnsSettings = settings
            manager.localizedDescription = "Nofri Protect"
            manager.onDemandRules = [NEOnDemandRuleConnect()] // always apply
            manager.saveToPreferences { error in
                DispatchQueue.main.async { completion(error) }
            }
        }
    }

    /// Remove the DNS configuration. Callers must enforce the commitment lock
    /// before calling this.
    static func disable(_ completion: @escaping (Error?) -> Void) {
        manager.loadFromPreferences { _ in
            manager.removeFromPreferences { error in
                DispatchQueue.main.async { completion(error) }
            }
        }
    }

    static func refreshStatus(_ completion: @escaping (Bool) -> Void) {
        manager.loadFromPreferences { _ in
            DispatchQueue.main.async { completion(manager.isEnabled) }
        }
    }
}
