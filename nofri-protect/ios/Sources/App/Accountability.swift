import Foundation

/// Accountability layer: a trusted partner is notified of important events
/// (protection turned off, lock set, bypass attempts). The real deterrent isn't
/// the technology — it's that someone you trust knows.
///
/// `reportEndpoint` is the (future) Nofri backend that emails the partner and
/// stores a tamper log. Until that exists, events are logged locally.
enum Accountability {

    private static let emailKey = "nofri.protect.partnerEmail"
    private static let endpointKey = "nofri.protect.reportEndpoint"
    private static var defaults: UserDefaults {
        UserDefaults(suiteName: "group.app.nofri.protect") ?? .standard
    }

    static var partnerEmail: String {
        get { defaults.string(forKey: emailKey) ?? "" }
        set { defaults.set(newValue, forKey: emailKey) }
    }

    static var reportEndpoint: URL? {
        get { defaults.string(forKey: endpointKey).flatMap(URL.init(string:)) }
        set { defaults.set(newValue?.absoluteString, forKey: endpointKey) }
    }

    enum Event: String {
        case enabled, disabled, locked, bypassAttempt
    }

    static func report(_ event: Event, detail: String = "") {
        let partner = partnerEmail
        guard !partner.isEmpty else { return }
        guard let url = reportEndpoint else {
            // TODO(backend): POST to the Nofri accountability service.
            print("[Accountability] \(event.rawValue) \(detail) → partner \(partner) (no endpoint set)")
            return
        }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = [
            "partner": partner,
            "event": event.rawValue,
            "detail": detail,
            "ts": ISO8601DateFormatter().string(from: Date())
        ]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        URLSession.shared.dataTask(with: req).resume()
    }
}
