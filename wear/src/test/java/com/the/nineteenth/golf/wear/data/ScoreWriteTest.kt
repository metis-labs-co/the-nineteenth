package com.the.nineteenth.golf.wear.data

import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Pins the watch-side score-write/ack wire format to src/watch/types.ts. */
class ScoreWriteTest {
    private fun parse(json: String): JsonObject = Json.parseToJsonElement(json).jsonObject

    @Test
    fun buildsNumericStrokesWithRequiredFields() {
        val json = ScoreWriteBuilder.build(
            roundId = "r1", baseRev = 5, hole = 7, playerId = "me",
            strokes = StrokesValue.Number(4), stat = null,
            clientWriteId = "w1", tsSeconds = 1.5,
        )
        val o = parse(json)
        assertEquals("w1", o["clientWriteId"]!!.jsonPrimitive.content)
        assertEquals(5, o["baseRev"]!!.jsonPrimitive.int)
        assertEquals(7, o["hole"]!!.jsonPrimitive.int)
        assertEquals("me", o["playerId"]!!.jsonPrimitive.content)
        assertEquals(4, o["strokes"]!!.jsonPrimitive.int)
        assertFalse(o.containsKey("stat"))
    }

    @Test
    fun encodesPickupAsString() {
        val json = ScoreWriteBuilder.build(
            roundId = "r1", baseRev = 1, hole = 1, playerId = "me",
            strokes = StrokesValue.Pickup, stat = null,
        )
        val strokes = parse(json)["strokes"]!!.jsonPrimitive
        assertTrue(strokes.isString)
        assertEquals("pickup", strokes.content)
    }

    @Test
    fun includesOnlySetStatFields() {
        val json = ScoreWriteBuilder.build(
            roundId = "r1", baseRev = 1, hole = 4, playerId = "me",
            strokes = StrokesValue.Number(5),
            stat = WatchScoreStat(putts = 2, fairwayHit = false, fairwayMissDirection = "left"),
        )
        val stat = parse(json)["stat"]!!.jsonObject
        assertEquals(2, stat["putts"]!!.jsonPrimitive.int)
        assertEquals(false, stat["fairwayHit"]!!.jsonPrimitive.content.toBoolean())
        assertEquals("left", stat["fairwayMissDirection"]!!.jsonPrimitive.content)
        // Unset fields are omitted (explicitNulls = false).
        assertFalse(stat.containsKey("greenInRegulation"))
        assertFalse(stat.containsKey("bunkerShots"))
    }

    @Test
    fun decodesAck() {
        val ack = WatchJson.decodeFromString<WatchAck>(
            """{"clientWriteId":"w1","status":"applied","rev":9}""",
        )
        assertEquals("w1", ack.clientWriteId)
        assertEquals("applied", ack.status)
        assertEquals(9, ack.rev)
    }
}
