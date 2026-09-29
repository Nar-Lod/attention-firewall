import Foundation
import FamilyControls

@MainActor
final class AuthorizationCoordinator: ObservableObject {
    private let center = AuthorizationCenter.shared

    @Published private(set) var status = AuthorizationStatus.notDetermined

    init() {
        status = center.authorizationStatus
    }

    var isApproved: Bool {
        status == .approved || status == .approvedWithDataAccess
    }

    var hasNonTokenizedDataAccess: Bool {
        status == .approvedWithDataAccess
    }

    func requestIndividualAuthorization() async -> Bool {
        do {
            try await center.requestAuthorization(for: .individual)
            status = center.authorizationStatus
            return isApproved
        } catch {
            status = center.authorizationStatus
            return false
        }
    }

    func revokeAuthorization() {
        center.revokeAuthorization { _ in
            Task { @MainActor in
                self.status = self.center.authorizationStatus
            }
        }
    }
}
