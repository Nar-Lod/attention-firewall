import SwiftUI
import FamilyControls

@main
struct AttentionFirewallApp: App {
    @StateObject private var authorization = AuthorizationCoordinator()

    var body: some Scene {
        WindowGroup {
            VStack(alignment: .leading, spacing: 20) {
                Text("ATTENTION FIREWALL")
                    .font(.largeTitle.bold())

                Text("Protect your intention without sending your activity history to a server.")
                    .foregroundStyle(.secondary)

                FamilyControlSelectionView()
            }
            .padding()
        }
    }
}
