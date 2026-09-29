import DeviceActivity
import ManagedSettings

final class AttentionMonitorExtension: DeviceActivityMonitor {
    private let store = ManagedSettingsStore(named: .attentionFirewall)

    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        // The enforcement decision remains local.
        // Selected tokens are applied only by the device-side monitor.
    }

    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        store.shield.applications = nil
        store.shield.webDomains = nil
    }
}
