package com.the.nineteenth.golf.wear.distance

import com.the.nineteenth.golf.wear.data.LatLng
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Mirrors `fixtures/distance-vectors.json` (the same vectors iOS/TS assert
 * against) so the three platforms compute distance identically.
 */
class DistanceEngineTest {
    private data class Vec(val name: String, val from: LatLng, val to: LatLng, val metres: Double)

    private val vectors = listOf(
        Vec("same point", LatLng(-37.8136, 144.9631), LatLng(-37.8136, 144.9631), 0.0),
        Vec("~100m north", LatLng(-37.8136, 144.9631), LatLng(-37.81270, 144.9631), 100.0),
        Vec("~150m", LatLng(-37.8136, 144.9631), LatLng(-37.81495, 144.9631), 150.0),
    )

    @Test
    fun matchesSharedDistanceFixtures() {
        for (v in vectors) {
            val m = DistanceEngine.metres(v.from, v.to)
            assertEquals(v.name, v.metres, m, 1.0)
        }
    }

    @Test
    fun convertsAndRoundsForUnit() {
        // 150 m ≈ 164 yards.
        assertEquals(150, DistanceEngine.display(150.0, "metres"))
        assertEquals(164, DistanceEngine.display(150.0, "yards"))
    }

    @Test
    fun gatesOnAccuracy() {
        assertTrue(DistanceEngine.isAccurate(5.0f))
        assertTrue(DistanceEngine.isAccurate(20.0f))
        assertFalse(DistanceEngine.isAccurate(25.0f))
        assertFalse(DistanceEngine.isAccurate(-1.0f)) // invalid
    }
}
