import Foundation
import Combine
import WatchConnectivity

/// Minimal WCSession client for the M0 spike: receives an applicationContext from
/// the phone and can send a ping back. Expanded in M4.4 to decode WatchSnapshot
/// and queue score writes.
final class ConnectivityClient: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = ConnectivityClient()

    @Published var lastContextSummary: String = "Waiting for phone…"

    private override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    func sendPing() {
        guard WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(["type": "ping"], replyHandler: nil)
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        DispatchQueue.main.async {
            self.lastContextSummary = (applicationContext["hello"] as? String) ?? "ctx received"
        }
    }

    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {}
}
