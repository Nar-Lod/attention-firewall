import SwiftUI
import FamilyControls

struct FamilyControlSelectionView: View {
    @State private var selection = FamilyActivitySelection()
    @State private var pickerPresented = false
    @State private var authorized = false

    private let authorization = AuthorizationCoordinator()
    private let selectionStore = LocalFamilyActivityStore()
    private let monitor = ActivityMonitoringCoordinator()

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Protection targets")
                .font(.title2.bold())

            Text("Attention Firewall stores only opaque system tokens for the apps and websites you select. It does not upload your activity history.")
                .foregroundStyle(.secondary)

            Button(authorized ? "Family Controls authorized" : "Authorize Screen Time access") {
                Task {
                    authorized = await authorization.requestIndividualAuthorization()
                }
            }
            .disabled(authorized)

            Button("Choose apps & websites") {
                pickerPresented = true
            }
            .disabled(!authorized)
            .sheet(isPresented: $pickerPresented) {
                FamilyActivityPicker(selection: $selection)
            }

            Text("Selected apps: " + String(selection.applicationTokens.count))
            Text("Selected websites: " + String(selection.webDomainTokens.count))

            Button("Save & start 15-minute protection") {
                Task {
                    do {
                        try selectionStore.save(selection)
                        try monitor.startProtection(for: selection, minutes: 15)
                    } catch {
                        // Keep failures local; no telemetry is required.
                    }
                }
            }
            .disabled(!authorized || (selection.applicationTokens.isEmpty && selection.webDomainTokens.isEmpty))

            Button("Stop protection") {
                monitor.stopProtection()
            }
        }
        .padding()
        .task {
            authorized = authorization.status == .approved || authorization.status == .approvedWithDataAccess
            if let existing = try? selectionStore.load() {
                selection = existing
            }
        }
    }
}
