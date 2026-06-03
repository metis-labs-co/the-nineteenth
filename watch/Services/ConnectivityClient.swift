import Foundation
import Combine
import WatchConnectivity
import WidgetKit
import WatchKit

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

    /// Transient outcome of the most recent score write, for UI feedback.
    enum SaveState: Equatable { case idle, saved(Date), failed }
    @Published var saveState: SaveState = .idle

    /// Bumped on each send so a stale auto-reset can't clear a newer "saved".
    private var saveGeneration = 0

    private override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    // MARK: - Sending

    /// Send a score write to the phone. Uses `transferUserInfo` for guaranteed
    /// FIFO delivery that survives disconnects. Confirms optimistically — the
    /// write is queued for delivery even when the phone is unreachable.
    func send(write: WatchScoreWrite) {
        guard let dict = write.asDictionary() else { return }
        WCSession.default.transferUserInfo(dict)
        DispatchQueue.main.async {
            self.saveGeneration += 1
            let gen = self.saveGeneration
            self.saveState = .saved(Date())
            WKInterfaceDevice.current().play(.success)
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                if self.saveGeneration == gen { self.saveState = .idle }
            }
        }
    }

    /// Tell the phone to move the active hole. Real-time, so prefer `sendMessage`
    /// when reachable; fall back to `transferUserInfo` for guaranteed delivery.
    func navigate(toHole hole: Int) {
        let msg: [String: Any] = ["type": "navigate", "hole": hole]
        if WCSession.default.isReachable {
            WCSession.default.sendMessage(msg, replyHandler: nil) { _ in
                WCSession.default.transferUserInfo(msg)
            }
        } else {
            WCSession.default.transferUserInfo(msg)
        }
    }

    // MARK: - Receiving

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        applySnapshotContext(applicationContext)
    }

    /// The phone acks each write via `sendMessage` (always sent WITH a reply
    /// handler by react-native-watch-connectivity), so it lands here, not in
    /// the no-reply variant. Always invoke `replyHandler` to satisfy the phone's
    /// pending reply; surface genuine rejections (unauthorized / error) as a
    /// retry hint. duplicate/superseded are benign and ignored.
    func session(_ session: WCSession,
                 didReceiveMessage message: [String: Any],
                 replyHandler: @escaping ([String: Any]) -> Void) {
        replyHandler([:])
        guard let status = message["status"] as? String else { return }
        if status == "unauthorized" || status == "error" {
            DispatchQueue.main.async { self.saveState = .failed }
        }
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
            // A fresh authoritative snapshot supersedes any prior retry hint.
            if self.saveState == .failed { self.saveState = .idle }
            self.snapshot = decoded
            self.hasReceivedContext = true
            self.lastContextSummary = decoded.competitionName
            self.publishComplicationState(decoded)
        }
    }

    /// Mirror the live round into the App Group so the complication can show it,
    /// then ask WidgetKit to refresh.
    private func publishComplicationState(_ snapshot: WatchSnapshot) {
        WatchSharedState.write(.init(
            active: true,
            hole: snapshot.currentHole,
            holeCount: snapshot.holes.count,
            name: snapshot.competitionName
        ))
        WidgetCenter.shared.reloadAllTimelines()
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
