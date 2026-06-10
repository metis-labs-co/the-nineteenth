package com.the.nineteenth.golf.wear.distance

import org.junit.Assert.assertEquals
import org.junit.Test

/** Ported from src/watch/__tests__/windArrow.test.ts to keep the math in parity. */
class WindArrowTest {
    @Test
    fun normalize360WrapsIntoRange() {
        assertEquals(0.0, WindArrow.normalize360(0.0), 0.0)
        assertEquals(123.0, WindArrow.normalize360(123.0), 0.0)
        assertEquals(0.0, WindArrow.normalize360(360.0), 0.0)
        assertEquals(90.0, WindArrow.normalize360(450.0), 0.0)
        assertEquals(270.0, WindArrow.normalize360(-90.0), 0.0)
    }

    @Test
    fun headwindPointsDownWhenFacingSource() {
        // Wind from north (0) blows to south (180); facing north → arrow down.
        assertEquals(180.0, WindArrow.windArrowDegrees(0.0, 0.0), 0.0)
    }

    @Test
    fun tailwindPointsUp() {
        assertEquals(0.0, WindArrow.windArrowDegrees(180.0, 0.0), 0.0)
    }

    @Test
    fun isHeadUpRelativeToFacing() {
        assertEquals(90.0, WindArrow.windArrowDegrees(0.0, 90.0), 0.0)
        assertEquals(270.0, WindArrow.windArrowDegrees(0.0, 270.0), 0.0)
    }

    @Test
    fun normalizesResult() {
        assertEquals(170.0, WindArrow.windArrowDegrees(350.0, 0.0), 0.0)
        assertEquals(250.0, WindArrow.windArrowDegrees(10.0, 300.0), 0.0)
    }

    @Test
    fun speedTextFollowsUnit() {
        assertEquals("18", WindArrow.windSpeedText(18.0, "metres"))
        assertEquals("11", WindArrow.windSpeedText(18.0, "yards")) // 18 km/h ≈ 11 mph
    }
}
