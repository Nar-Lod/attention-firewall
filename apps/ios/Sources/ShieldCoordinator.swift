import Foundation
import FamilyControls
import ManagedSettings

final class ShieldCoordinator {
    private let store = ManagedSettingsStore(named: .attentionFirewall)

    func shield(selection: FamilyActivitySelection) {
        store.shield.applications = selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
        store.shield.webDomains = selection.webDomainTokens.isEmpty ? nil : selection.webDomainTokens
    }

    func clear() {
        store.shield.applications = nil
        store.shield.webDomains = nil
    }
}

extension ManagedSettingsStore.Name {
    static let attentionFirewall = Self("attention-firewall")
}
