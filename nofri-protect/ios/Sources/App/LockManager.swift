import Foundation

/// Commitment lock. While locked, the app refuses to turn protection off, and
/// the lock can only be extended, never shortened. This makes relapse hard.
///
/// On its own this is not uninstall-proof — pair it with iOS Screen Time
/// (Content & Privacy Restrictions, with the passcode held by an accountability
/// partner) for true "can't disable / can't delete" enforcement. See README.
enum LockManager {

    private static let key = "nofri.protect.lockUntil"
    private static var defaults: UserDefaults {
        UserDefaults(suiteName: "group.app.nofri.protect") ?? .standard
    }

    static var lockUntil: Date? {
        get { defaults.object(forKey: key) as? Date }
        set { defaults.set(newValue, forKey: key) }
    }

    static var isLocked: Bool {
        guard let until = lockUntil else { return false }
        return until > Date()
    }

    /// Lock for `interval` seconds from now. Never shortens an existing lock.
    static func lock(for interval: TimeInterval) {
        let newEnd = Date().addingTimeInterval(interval)
        if let current = lockUntil, current > newEnd { return }
        lockUntil = newEnd
    }
}
