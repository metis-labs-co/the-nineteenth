package com.the.nineteenth.golf.wear.distance

/**
 * Wind arrow geometry — Kotlin port of `src/watch/windArrow.ts` (kept in sync;
 * unit-tested both sides). The arrow points the way the wind blows TO, head-up.
 */
object WindArrow {
    /** Normalize any degree value into [0, 360). */
    fun normalize360(deg: Double): Double = ((deg % 360) + 360) % 360

    /**
     * On-screen rotation (degrees clockwise from "up") for the wind arrow.
     * `+180` converts "wind from" → "wind blows to"; `- heading` makes it
     * head-up (screen up = the way the user faces). Pass heading 0 for north-up.
     */
    fun windArrowDegrees(fromDeg: Double, heading: Double): Double =
        normalize360(fromDeg + 180 - heading)

    /** km/h for metres, mph for yards (follows the user's distance unit). */
    fun windSpeedText(kph: Double, unit: String): String {
        val value = if (unit == "yards") kph * 0.621371 else kph
        return Math.round(value).toInt().toString()
    }
}
