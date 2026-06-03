import Foundation
import Combine
import CoreLocation

/// Wraps CLLocationManager for the watch's own GPS. Started only while the
/// distance screen is visible (battery), stopped on disappear.
final class LocationProvider: NSObject, ObservableObject, CLLocationManagerDelegate {
    @Published var current: CLLocation?
    @Published var authorizationStatus: CLAuthorizationStatus

    private let manager = CLLocationManager()

    override init() {
        authorizationStatus = manager.authorizationStatus
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = 2
    }

    func start() {
        manager.requestWhenInUseAuthorization()
        manager.startUpdatingLocation()
    }

    func stop() {
        manager.stopUpdatingLocation()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let last = locations.last else { return }
        DispatchQueue.main.async { self.current = last }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        DispatchQueue.main.async { self.authorizationStatus = manager.authorizationStatus }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // Keep last-known fix; the distance view shows "GPS…" when stale/inaccurate.
    }
}
