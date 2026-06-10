package com.the.nineteenth.golf.wear.data

import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Guards field-parity between the Kotlin model and the JSON produced by
 * `buildWatchSnapshot` (src/watch/snapshot.ts). If the TS shape changes, this
 * decode should be updated in lockstep.
 */
class WatchSnapshotTest {

    private val sample = """
        {"rev":3,"roundId":"r1","competitionName":"Saturday Medal","unit":"metres",
        "isPremium":true,
        "statFlags":{"putts":true,"fairways":true,"gir":false,"penalties":false,
          "bunker":true,"fairwayDirection":false,"greenDirection":false},
        "currentHole":7,
        "holes":[{"hole":7,"par":4,"strokeIndex":5,
          "green":{"center":{"latitude":1.0,"longitude":2.0}}}],
        "pairPlayers":[{"playerId":"me","name":"You"}],
        "scores":{"me:7":{"strokes":4,"putts":2}},
        "leaderboard":[{"rank":1,"name":"You","detail":"E","isCurrentUser":true}],
        "wind":{"speedKph":18.0,"fromDeg":225.0}}
    """.trimIndent()

    @Test
    fun decodesFullSnapshot() {
        val s = WatchJson.decodeFromString<WatchSnapshot>(sample)
        assertEquals(3, s.rev)
        assertEquals("Saturday Medal", s.competitionName)
        assertEquals("metres", s.unit)
        assertEquals(7, s.currentHole)
        assertEquals(4, s.currentHoleObject?.par)
        assertEquals(1.0, s.currentHoleObject?.green?.center?.latitude)
        assertEquals("You", s.pairPlayers.first().name)
        assertEquals(225.0, s.wind?.fromDeg)
        assertTrue(s.statFlags.bunker)
    }

    @Test
    fun toleratesMissingOptionalsAndUnknownKeys() {
        val minimal = """
            {"rev":1,"roundId":"r","competitionName":"C","unit":"yards",
            "isPremium":false,
            "statFlags":{"putts":false,"fairways":false,"gir":false,
              "penalties":false,"bunker":false},
            "currentHole":1,"futureField":"ignored"}
        """.trimIndent()
        val s = WatchJson.decodeFromString<WatchSnapshot>(minimal)
        assertEquals(1, s.currentHole)
        assertTrue(s.holes.isEmpty())
        assertNull(s.wind)
        assertNull(s.currentHoleObject)
    }

    @Test
    fun encodesNavigateMessage() {
        val json = WatchJson.encodeToString(WatchNavigate(hole = 12))
        assertTrue(json.contains("\"type\":\"navigate\""))
        assertTrue(json.contains("\"hole\":12"))
    }
}
