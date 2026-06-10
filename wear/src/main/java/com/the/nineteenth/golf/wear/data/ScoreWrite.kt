package com.the.nineteenth.golf.wear.data

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.util.UUID

/**
 * Watch -> phone score payloads, mirroring `src/watch/types.ts`. The phone's
 * `applyWatchScoreWrite` validates and applies these, then acks via `/ack`.
 */

@Serializable
data class WatchHazard(val type: String) // "water" | "ob" | "lateral" | "lost_ball"

@Serializable
data class WatchScoreStat(
    val putts: Int? = null,
    val fairwayHit: Boolean? = null,
    val fairwayMissDirection: String? = null,
    val greenInRegulation: Boolean? = null,
    val greenMissDirection: String? = null,
    val bunkerShots: Int? = null,
    val hazards: List<WatchHazard>? = null,
)

/** A recorded hole score read back from the snapshot to pre-fill the screen. */
@Serializable
data class WatchHoleScore(
    val strokes: Int? = null,
    val putts: Int? = null,
    val fairwayHit: Boolean? = null,
    val fairwayMissDirection: String? = null,
    val greenInRegulation: Boolean? = null,
    val greenMissDirection: String? = null,
    val bunkerShots: Int? = null,
    val hazards: List<WatchHazard>? = null,
)

/** Phone -> watch acknowledgement of a score write. */
@Serializable
data class WatchAck(val clientWriteId: String, val status: String, val rev: Int)

/** Strokes is a `number | "pickup"` union on the wire. */
sealed interface StrokesValue {
    data class Number(val value: Int) : StrokesValue
    data object Pickup : StrokesValue
}

object ScoreWriteBuilder {
    /** Build the `WatchScoreWrite` JSON the phone expects. */
    fun build(
        roundId: String,
        baseRev: Int,
        hole: Int,
        playerId: String,
        strokes: StrokesValue,
        stat: WatchScoreStat?,
        clientWriteId: String = UUID.randomUUID().toString(),
        tsSeconds: Double = System.currentTimeMillis() / 1000.0,
    ): String {
        val obj = buildJsonObject {
            put("clientWriteId", clientWriteId)
            put("ts", tsSeconds)
            put("baseRev", baseRev)
            put("roundId", roundId)
            put("hole", hole)
            put("playerId", playerId)
            when (strokes) {
                is StrokesValue.Number -> put("strokes", strokes.value)
                StrokesValue.Pickup -> put("strokes", "pickup")
            }
            stat?.let { put("stat", WatchJson.encodeToJsonElement(WatchScoreStat.serializer(), it)) }
        }
        return obj.toString()
    }
}
