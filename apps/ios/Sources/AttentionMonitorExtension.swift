import DeviceActivity
import ManagedSettings
import FamilyControls

final class AttentionMonitorExtension: DeviceActivityMonitor {
    private let store = ManagedSettingsStore(named: .attentionFirewall)
    private let selectionStore = LocalFamilyActivityStore()

    override func eventDidReachThreshold(
        _ event: DeviceActivityEvent.Name,
        activity: DeviceActivityName
    ) {
        super.eventDidReachThreshold(event, activity: activity)

        guard event == .attentionThreshold else { return }
        guard let selection = try? selectionStore.load() else { return }

        if !selection.applicationTokens.isEmpty {
            store.shield.applications = selection.applicationTokens
        }
        if !selection.webDomainTokens.isEmpty {
            store.shield.webDomains = selection.webDomainTokens
        }
    }

    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        store.clearAllSettings()
    }
}
