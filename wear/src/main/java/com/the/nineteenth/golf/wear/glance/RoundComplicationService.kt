package com.the.nineteenth.golf.wear.glance

import android.app.PendingIntent
import android.content.Intent
import androidx.wear.watchface.complications.data.ComplicationData
import androidx.wear.watchface.complications.data.ComplicationType
import androidx.wear.watchface.complications.data.LongTextComplicationData
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.data.RangedValueComplicationData
import androidx.wear.watchface.complications.data.ShortTextComplicationData
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import androidx.wear.watchface.complications.datasource.SuspendingComplicationDataSourceService
import com.the.nineteenth.golf.wear.MainActivity

/**
 * Watch-face complication — direct port of the iOS complication. Reads the live
 * round from WearSharedState (refreshed by WearDataRepository). Supports
 * SHORT_TEXT / LONG_TEXT / RANGED_VALUE; tapping opens the app.
 */
class RoundComplicationService : SuspendingComplicationDataSourceService() {

    override fun getPreviewData(type: ComplicationType): ComplicationData? =
        build(type, WearSharedState.RoundState(active = true, hole = 7, holeCount = 18, name = "Saturday Medal"))

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? =
        build(request.complicationType, WearSharedState.read(this))

    private fun tapIntent(): PendingIntent =
        PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE,
        )

    private fun build(type: ComplicationType, s: WearSharedState.RoundState): ComplicationData? {
        val shortText = if (s.active) "H${s.hole}" else "—"
        val longText =
            if (s.active) "${s.name.ifBlank { "Round" }} · Hole ${s.hole} of ${s.holeCount}" else "No round"
        val desc = PlainComplicationText.Builder("Round status").build()
        val max = maxOf(s.holeCount, 1).toFloat()

        return when (type) {
            ComplicationType.SHORT_TEXT ->
                ShortTextComplicationData.Builder(PlainComplicationText.Builder(shortText).build(), desc)
                    .setTapAction(tapIntent())
                    .build()

            ComplicationType.LONG_TEXT ->
                LongTextComplicationData.Builder(PlainComplicationText.Builder(longText).build(), desc)
                    .setTapAction(tapIntent())
                    .build()

            ComplicationType.RANGED_VALUE ->
                RangedValueComplicationData.Builder(
                    value = if (s.active) s.hole.toFloat().coerceIn(0f, max) else 0f,
                    min = 0f,
                    max = max,
                    contentDescription = desc,
                )
                    .setText(PlainComplicationText.Builder(shortText).build())
                    .setTapAction(tapIntent())
                    .build()

            else -> null
        }
    }
}
