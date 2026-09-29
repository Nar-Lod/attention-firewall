import Foundation
import FamilyControls

final class LocalFamilyActivityStore {
    private let defaults: UserDefaults

    init(suiteName: String = "group.com.attentionfirewall.shared") {
        guard let defaults = UserDefaults(suiteName: suiteName) else {
            preconditionFailure("App Group container is unavailable")
        }
        self.defaults = defaults
    }

    private let selectionKey = "family_activity_selection_v1"

    func save(_ selection: FamilyActivitySelection) throws {
        let data = try JSONEncoder().encode(selection)
        defaults.set(data, forKey: selectionKey)
    }

    func load() throws -> FamilyActivitySelection? {
        guard let data = defaults.data(forKey: selectionKey) else { return nil }
        return try JSONDecoder().decode(FamilyActivitySelection.self, from: data)
    }

    func clear() {
        defaults.removeObject(forKey: selectionKey)
    }
}
