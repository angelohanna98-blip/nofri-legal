import SwiftUI

private let gold = Color(red: 0xB0/255, green: 0x7A/255, blue: 0x2A/255)
private let cream = Color(red: 0xFA/255, green: 0xF9/255, blue: 0xF6/255)

struct RootView: View {
    @EnvironmentObject var store: ProtectionStore
    @State private var lockHours = 24
    @State private var partner = Accountability.partnerEmail

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 18) {
                    header
                    statusCard
                    lockCard
                    accountabilityCard
                    footnote
                }
                .padding()
            }
            .background(cream.ignoresSafeArea())
            .navigationTitle("Nofri Protect")
        }
        .onAppear { store.refresh() }
    }

    private var header: some View {
        VStack(spacing: 6) {
            Text("☦").font(.system(size: 40)).foregroundColor(gold)
            Text(store.isProtected ? "Protected" : "Not protected")
                .font(.title2).bold()
                .foregroundColor(store.isProtected ? gold : .secondary)
            Text("Adult & malicious sites are blocked in every browser, including Private — when protection is on.")
                .font(.footnote).foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.top, 8)
    }

    private var statusCard: some View {
        Card {
            Toggle(isOn: Binding(
                get: { store.isProtected },
                set: { on in on ? store.enable() : store.disable() }
            )) {
                VStack(alignment: .leading) {
                    Text("Family-safe filtering").bold()
                    Text("Encrypted DNS (Cloudflare for Families)")
                        .font(.caption).foregroundColor(.secondary)
                }
            }
            .tint(gold)
            .disabled(store.busy)

            if store.isLocked, let until = store.lockUntil {
                Label("Locked until \(until.formatted(date: .abbreviated, time: .shortened))",
                      systemImage: "lock.fill")
                    .font(.caption).foregroundColor(gold)
            }
            if let message = store.message {
                Text(message).font(.caption).foregroundColor(.red)
            }
        }
    }

    private var lockCard: some View {
        Card {
            Text("Commitment lock").bold()
            Text("Once locked you can’t turn protection off or shorten the lock until it ends. For true ‘can’t‑disable / can’t‑delete’, also turn on Screen Time restrictions with a passcode your partner holds.")
                .font(.caption).foregroundColor(.secondary)
            Picker("Duration", selection: $lockHours) {
                Text("1 hour").tag(1); Text("12 hours").tag(12)
                Text("1 day").tag(24); Text("3 days").tag(72); Text("1 week").tag(168)
            }
            .pickerStyle(.menu).tint(gold)
            Button {
                store.lock(hours: lockHours)
            } label: {
                Text(store.isLocked ? "Locked" : "Lock protection on")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent).tint(gold)
            .disabled(store.isLocked)
        }
    }

    private var accountabilityCard: some View {
        Card {
            Text("Accountability partner").bold()
            Text("Someone you trust is notified when protection is turned off or a lock is set. The passcode they hold (in Screen Time) is what makes this stick.")
                .font(.caption).foregroundColor(.secondary)
            TextField("partner@email.com", text: $partner)
                .textInputAutocapitalization(.never)
                .keyboardType(.emailAddress)
                .textFieldStyle(.roundedBorder)
            Button("Save partner") { store.savePartner(partner) }
                .buttonStyle(.bordered).tint(gold)
        }
    }

    private var footnote: some View {
        Text("Phase 0 of Nofri Protect. Next: a content-filter Network Extension for per‑category control, and a backend so the partner gets real reports and tamper alerts.")
            .font(.caption2).foregroundColor(.secondary)
            .multilineTextAlignment(.center)
            .padding(.top, 4)
    }
}

/// Simple rounded card container.
private struct Card<Content: View>: View {
    @ViewBuilder var content: () -> Content
    var body: some View {
        VStack(alignment: .leading, spacing: 10, content: content)
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.black.opacity(0.06)))
            .shadow(color: .black.opacity(0.06), radius: 8, y: 3)
    }
}
