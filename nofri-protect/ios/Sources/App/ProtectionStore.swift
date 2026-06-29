import SwiftUI

/// Single source of truth for the app's UI. Ties together the DNS protection,
/// the commitment lock, and the accountability reporting.
@MainActor
final class ProtectionStore: ObservableObject {
    @Published var isProtected = false
    @Published var isLocked = false
    @Published var lockUntil: Date?
    @Published var partnerEmail: String = Accountability.partnerEmail
    @Published var busy = false
    @Published var message: String?

    init() { refresh() }

    func refresh() {
        isLocked = LockManager.isLocked
        lockUntil = LockManager.lockUntil
        DNSProtection.refreshStatus { [weak self] on in self?.isProtected = on }
    }

    func enable() {
        busy = true; message = nil
        DNSProtection.enable { [weak self] error in
            guard let self = self else { return }
            self.busy = false
            if let error = error { self.message = error.localizedDescription }
            else { self.isProtected = true; Accountability.report(.enabled) }
        }
    }

    func disable() {
        guard !LockManager.isLocked else {
            Accountability.report(.bypassAttempt)
            message = "Locked — protection can’t be turned off until the lock ends."
            return
        }
        busy = true; message = nil
        DNSProtection.disable { [weak self] error in
            guard let self = self else { return }
            self.busy = false
            if let error = error { self.message = error.localizedDescription }
            else { self.isProtected = false; Accountability.report(.disabled) }
        }
    }

    func lock(hours: Int) {
        LockManager.lock(for: TimeInterval(hours) * 3600)
        isLocked = LockManager.isLocked
        lockUntil = LockManager.lockUntil
        Accountability.report(.locked, detail: "\(hours)h")
        if !isProtected { enable() }
    }

    func savePartner(_ email: String) {
        let trimmed = email.trimmingCharacters(in: .whitespaces)
        partnerEmail = trimmed
        Accountability.partnerEmail = trimmed
    }
}
