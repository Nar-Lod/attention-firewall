import SwiftUI
import FamilyControls

struct FamilyControlSelectionView: View {
    @State private var selection = FamilyActivitySelection()
    @State private var pickerPresented = false

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Protection targets")
                .font(.title2.bold())

            Text("Choose the apps or websites you want Attention Firewall to protect. Your selections remain represented locally by opaque system tokens.")
                .foregroundStyle(.secondary)

            Button("Choose apps & websites") {
                pickerPresented = true
            }
            .sheet(isPresented: $pickerPresented) {
                FamilyActivityPicker(selection: $selection)
            }

            Text("Selected apps: " + String(selection.applicationTokens.count))
            Text("Selected websites: " + String(selection.webDomainTokens.count))
        }
        .padding()
    }
}
