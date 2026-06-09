import Foundation
import Combine
import CoreLocation

/// Wraps CLLocationManager for the watch's own GPS. Started only while the
/// distance screen is visible (battery), stopped on disappear.
final class LocationProvider: NSObject, ObservableObject, CLLocationManagerDelegate {
    @Published var current: CLLocation?
    @Published var heading: CLHeading?
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
        // Heading drives the head-up wind arrow; rides on the same location auth.
        // No-op on hardware without a magnetometer (heading stays nil → north-up).
        if CLLocationManager.headingAvailable() {
            manager.startUpdatingHeading()
        }
    }

    func stop() {
        manager.stopUpdatingLocation()
        manager.stopUpdatingHeading()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let last = locations.last else { return }
        DispatchQueue.main.async { self.current = last }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
        DispatchQueue.main.async { self.heading = newHeading }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        DispatchQueue.main.async { self.authorizationStatus = manager.authorizationStatus }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // Keep last-known fix; the distance view shows "GPS…" when stale/inaccurate.
    }
}
