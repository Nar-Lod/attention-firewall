import Foundation
import FamilyControls

@MainActor
final class AuthorizationCoordinator: ObservableObject {
    private let center = AuthorizationCenter.shared

    @Published private(set) var status = AuthorizationStatus.notDetermined

    init() {
        status = center.authorizationStatus
    }

    func requestIndividualAuthorization() async -> Bool {
        do {
            try await center.requestAuthorization(for: .individual)
            status = center.authorizationStatus
            return status == .approved || status == .approvedWithDataAccess
        } catch {
            status = center.authorizationStatus
            return false
        }
    }

    func revokeAuthorization() async {
        await withCheckedContinuation { continuation in
            center.revokeAuthorization { _ in continuation.resume() }
        }
        status = center.authorizationStatus
    }
}
