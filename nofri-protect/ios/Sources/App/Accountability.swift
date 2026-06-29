import Foundation

/// Accountability layer: a trusted partner is notified of important events
/// (protection turned off, lock set, bypass attempts). The real deterrent isn't
/// the technology — it's that someone you trust knows.
///
/// Events are sent to the Nofri Protect accountability function (Supabase Edge
/// Function `protect-report`), which stores them and — once a Resend API key is
/// configured on the backend — emails the partner.
enum Accountability {

    // Live Nofri backend (nofri-calendar Supabase project).
    static let defaultEndpoint = URL(string: "https://yozxgbgohlwnbioosvsg.supabase.co/functions/v1/protect-report")!
    static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvenhnYmdvaGx3bmJpb29zdnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNTc5MDQsImV4cCI6MjA5NjYzMzkwNH0.BNiKYa_tnQrZgcetP21Zd0rVwHuDq_hS3yCb6EXKUzo"

    private static let emailKey = "nofri.protect.partnerEmail"
    private static let endpointKey = "nofri.protect.reportEndpoint"
    private static let ingestKeyKey = "nofri.protect.ingestKey"
    private static let deviceKey = "nofri.protect.deviceId"
    private static var defaults: UserDefaults {
        UserDefaults(suiteName: "group.app.nofri.protect") ?? .standard
    }

    static var partnerEmail: String {
        get { defaults.string(forKey: emailKey) ?? "" }
        set { defaults.set(newValue, forKey: emailKey) }
    }

    /// Override the endpoint (defaults to the live Nofri function).
    static var reportEndpoint: URL {
        get { defaults.string(forKey: endpointKey).flatMap(URL.init(string:)) ?? defaultEndpoint }
        set { defaults.set(newValue.absoluteString, forKey: endpointKey) }
    }

    /// Optional shared key matching the backend's NOFRI_INGEST_KEY secret.
    static var ingestKey: String {
        get { defaults.string(forKey: ingestKeyKey) ?? "" }
        set { defaults.set(newValue, forKey: ingestKeyKey) }
    }

    /// Stable per-install identifier so the partner can tell which device.
    static var deviceId: String {
        if let id = defaults.string(forKey: deviceKey) { return id }
        let id = UUID().uuidString
        defaults.set(id, forKey: deviceKey)
        return id
    }

    enum Event: String {
        case enabled, disabled, locked, bypassAttempt
    }

    static func report(_ event: Event, detail: String = "") {
        let partner = partnerEmail
        guard !partner.isEmpty else { return }

        var req = URLRequest(url: reportEndpoint)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
        if !ingestKey.isEmpty { req.setValue(ingestKey, forHTTPHeaderField: "x-nofri-key") }
        let body: [String: Any] = [
            "partner": partner,
            "event": event.rawValue,
            "detail": detail,
            "deviceId": deviceId
        ]
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        URLSession.shared.dataTask(with: req).resume()
    }
}
