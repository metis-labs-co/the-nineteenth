package com.the.nineteenth.golf.wear.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * Kotlin mirror of the bridge types in `src/watch/types.ts`. The phone sends the
 * exact JSON produced by `buildWatchSnapshot`, so these data classes must stay in
 * field-parity with the TS shape. `ignoreUnknownKeys` keeps decoding resilient to
 * additive changes; defaults cover optional fields.
 */

@Serializable
data class LatLng(val latitude: Double, val longitude: Double)

@Serializable
data class Green(
    val center: LatLng? = null,
    val front: LatLng? = null,
    val back: LatLng? = null,
)

@Serializable
data class WatchHole(
    val hole: Int,
    val par: Int,
    val strokeIndex: Int,
    val green: Green = Green(),
)

@Serializable
data class WatchPairPlayer(val playerId: String, val name: String)

@Serializable
data class WatchStatFlags(
    val putts: Boolean,
    val fairways: Boolean,
    val gir: Boolean,
    val penalties: Boolean,
    val bunker: Boolean,
    val fairwayDirection: Boolean = false,
    val greenDirection: Boolean = false,
)

@Serializable
data class WatchLeaderboardRow(
    val rank: Int,
    val name: String,
    val detail: String,
    val isCurrentUser: Boolean,
)

@Serializable
data class WatchWind(val speedKph: Double, val fromDeg: Double)

@Serializable
data class WatchSnapshot(
    val rev: Int,
    val roundId: String,
    val competitionName: String,
    val unit: String,
    val isPremium: Boolean,
    val statFlags: WatchStatFlags,
    val pairPlayers: List<WatchPairPlayer> = emptyList(),
    val holes: List<WatchHole> = emptyList(),
    val currentHole: Int,
    /** Keyed "{playerId}:{hole}"; absent means no score entered yet. */
    val scores: Map<String, WatchHoleScore> = emptyMap(),
    val leaderboard: List<WatchLeaderboardRow> = emptyList(),
    val wind: WatchWind? = null,
) {
    /** The hole object for the current hole, if present. */
    val currentHoleObject: WatchHole?
        get() = holes.firstOrNull { it.hole == currentHole }

    /** Stored score for a player on a hole, if any. */
    fun score(playerId: String, hole: Int): WatchHoleScore? = scores["$playerId:$hole"]
}

/** Watch -> phone: move the active hole. Mirrors `WatchNavigate` in types.ts. */
@Serializable
data class WatchNavigate(
    @SerialName("type") val type: String = "navigate",
    val hole: Int,
)

/** Shared JSON config: tolerant of additive fields on decode; on encode keeps
 *  defaults (so the WatchNavigate `type` discriminator the phone matches on is
 *  always present) and omits nulls. */
val WatchJson: Json = Json {
    ignoreUnknownKeys = true
    encodeDefaults = true
    explicitNulls = false
}
