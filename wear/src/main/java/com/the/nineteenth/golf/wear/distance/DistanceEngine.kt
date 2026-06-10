package com.the.nineteenth.golf.wear.distance

import com.the.nineteenth.golf.wear.data.LatLng
import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * Haversine distance + unit conversion + accuracy gating. Kotlin port of the iOS
 * DistanceEngine, kept in parity with the TS `calculateDistance` via the shared
 * fixtures in `fixtures/distance-vectors.json`.
 */
object DistanceEngine {
    private const val EARTH_RADIUS_METRES = 6_371_000.0
    private const val METRES_TO_YARDS = 1.09361
    private const val ACCURACY_GATE_METRES = 20.0

    fun metres(from: LatLng, to: LatLng): Double {
        val dLat = (to.latitude - from.latitude) * Math.PI / 180
        val dLon = (to.longitude - from.longitude) * Math.PI / 180
        val lat1 = from.latitude * Math.PI / 180
        val lat2 = to.latitude * Math.PI / 180
        val h = sin(dLat / 2) * sin(dLat / 2) +
            sin(dLon / 2) * sin(dLon / 2) * cos(lat1) * cos(lat2)
        return 2 * EARTH_RADIUS_METRES * asin(min(1.0, sqrt(h)))
    }

    /** Whole-number distance in the requested unit ("yards" or metres). */
    fun display(metresValue: Double, unit: String): Int {
        val value = if (unit == "yards") metresValue * METRES_TO_YARDS else metresValue
        return Math.round(value).toInt()
    }

    /** True when a location's horizontal accuracy is good enough to trust. */
    fun isAccurate(accuracyMetres: Float): Boolean =
        accuracyMetres in 0.0f..ACCURACY_GATE_METRES.toFloat()
}
