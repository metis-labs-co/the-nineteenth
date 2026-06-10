package com.the.nineteenth.golf.wear.glance

import android.content.Context

/**
 * Tiny shared store the app writes and the Tile + complication read — the Wear
 * analog of the iOS App-Group `WatchSharedState`. SharedPreferences is readable
 * across the app's processes (tile/complication services run separately).
 */
object WearSharedState {
    private const val PREFS = "round_glance"
    private const val KEY_ACTIVE = "active"
    private const val KEY_HOLE = "hole"
    private const val KEY_HOLE_COUNT = "holeCount"
    private const val KEY_NAME = "name"

    data class RoundState(
        val active: Boolean,
        val hole: Int,
        val holeCount: Int,
        val name: String,
    )

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun write(context: Context, active: Boolean, hole: Int, holeCount: Int, name: String) {
        prefs(context).edit()
            .putBoolean(KEY_ACTIVE, active)
            .putInt(KEY_HOLE, hole)
            .putInt(KEY_HOLE_COUNT, holeCount)
            .putString(KEY_NAME, name)
            .apply()
    }

    fun read(context: Context): RoundState {
        val p = prefs(context)
        return RoundState(
            active = p.getBoolean(KEY_ACTIVE, false),
            hole = p.getInt(KEY_HOLE, 0),
            holeCount = p.getInt(KEY_HOLE_COUNT, 0),
            name = p.getString(KEY_NAME, "") ?: "",
        )
    }
}
