import Foundation
import Combine
import WatchConnectivity

/// WCSession client. Receives the phone's `applicationContext` (decoded into a
/// `WatchSnapshot`) and sends score writes back via `transferUserInfo`
/// (guaranteed delivery, wakes the phone in the background).
final class ConnectivityClient: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = ConnectivityClient()

    /// Latest snapshot pushed by the phone, or nil before the first push.
    @Published var snapshot: WatchSnapshot?
    /// True once a snapshot has been received in this session.
    @Published var hasReceivedContext = false

    /// Kept for the M0 spike screen; harmless once real views take over.
    @Published var lastContextSummary: String = "Waiting for phone…"

    private override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    // MARK: - Sending

    /// Send a score write to the phone. Uses `transferUserInfo` for guaranteed
    /// FIFO delivery that survives disconnects.
    func send(write: WatchScoreWrite) {
        guard let dict = write.asDictionary() else { return }
        WCSession.default.transferUserInfo(dict)
    }

    // MARK: - Receiving

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        applySnapshotContext(applicationContext)
    }

    /// The phone may also use `updateApplicationContext` while reachable; both
    /// land here. Decode into a WatchSnapshot; ignore unrelated dictionaries.
    private func applySnapshotContext(_ context: [String: Any]) {
        guard
            let data = try? JSONSerialization.data(withJSONObject: context),
            let decoded = try? JSONDecoder().decode(WatchSnapshot.self, from: data)
        else {
            DispatchQueue.main.async {
                self.lastContextSummary = (context["hello"] as? String) ?? "ctx received"
            }
            return
        }
        DispatchQueue.main.async {
            self.snapshot = decoded
            self.hasReceivedContext = true
            self.lastContextSummary = decoded.competitionName
        }
    }

    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        // Pull any context that arrived before activation completed.
        let context = session.receivedApplicationContext
        if !context.isEmpty { applySnapshotContext(context) }
    }
}
