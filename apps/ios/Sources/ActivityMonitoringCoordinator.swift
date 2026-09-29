import Foundation
import DeviceActivity
import FamilyControls

final class ActivityMonitoringCoordinator {
    private let center = DeviceActivityCenter()

    func startProtection(for selection: FamilyActivitySelection, minutes: Int = 15) throws {
        let boundedMinutes = min(max(minutes, 1), 240)
        let event = DeviceActivityEvent(
            applications: selection.applicationTokens,
            categories: selection.categoryTokens,
            webDomains: selection.webDomainTokens,
            threshold: DateComponents(minute: boundedMinutes),
            includesPastActivity: false
        )

        let schedule = DeviceActivitySchedule(
            intervalStart: DateComponents(hour: 0, minute: 0),
            intervalEnd: DateComponents(hour: 23, minute: 59),
            repeats: true,
            warningTime: DateComponents(minute: 1)
        )

        try center.startMonitoring(
            .attentionFirewallDaily,
            during: schedule,
            events: [.attentionThreshold: event]
        )
    }

    func stopProtection() {
        center.stopMonitoring([.attentionFirewallDaily])
    }
}

extension DeviceActivityName {
    static let attentionFirewallDaily = Self("attention-firewall-daily")
}

extension DeviceActivityEvent.Name {
    static let attentionThreshold = Self("attention-firewall-threshold")
}
