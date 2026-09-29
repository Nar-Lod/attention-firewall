import Foundation
import DeviceActivity

final class ActivityScheduleCoordinator {
    private let center = DeviceActivityCenter()

    func startNightlyMonitoring() throws {
        let schedule = DeviceActivitySchedule(
            intervalStart: DateComponents(hour: 22, minute: 0),
            intervalEnd: DateComponents(hour: 6, minute: 0),
            repeats: true,
            warningTime: DateComponents(minute: 1)
        )
        try center.startMonitoring(.attentionFirewallNight, during: schedule)
    }

    func stopMonitoring() {
        center.stopMonitoring([.attentionFirewallNight])
    }
}

extension DeviceActivityName {
    static let attentionFirewallNight = Self("attention-firewall-night")
}
