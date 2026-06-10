package com.the.nineteenth.golf.wear.glance

import androidx.concurrent.futures.ResolvableFuture
import androidx.wear.protolayout.ActionBuilders
import androidx.wear.protolayout.LayoutElementBuilders
import androidx.wear.protolayout.ModifiersBuilders
import androidx.wear.protolayout.ResourceBuilders
import androidx.wear.protolayout.TimelineBuilders
import androidx.wear.protolayout.material.Text
import androidx.wear.protolayout.material.Typography
import androidx.wear.protolayout.material.layouts.PrimaryLayout
import androidx.wear.tiles.RequestBuilders
import androidx.wear.tiles.TileBuilders
import androidx.wear.tiles.TileService
import com.google.common.util.concurrent.ListenableFuture
import com.the.nineteenth.golf.wear.MainActivity

/**
 * Glanceable round Tile — the Wear analog of the iOS complication. Shows the
 * live round (competition + "Hole X of N") read from WearSharedState; tapping
 * opens the app. Refreshed by WearDataRepository on each snapshot.
 */
class RoundTileService : TileService() {

    override fun onTileRequest(
        requestParams: RequestBuilders.TileRequest,
    ): ListenableFuture<TileBuilders.Tile> {
        val state = WearSharedState.read(this)
        val tile = TileBuilders.Tile.Builder()
            .setResourcesVersion(RES_VERSION)
            .setTileTimeline(
                TimelineBuilders.Timeline.fromLayoutElement(layout(state)),
            )
            .build()
        return immediate(tile)
    }

    override fun onTileResourcesRequest(
        requestParams: RequestBuilders.ResourcesRequest,
    ): ListenableFuture<ResourceBuilders.Resources> =
        immediate(ResourceBuilders.Resources.Builder().setVersion(RES_VERSION).build())

    private fun layout(state: WearSharedState.RoundState): LayoutElementBuilders.LayoutElement {
        val title: String
        val subtitle: String
        if (state.active) {
            title = state.name.ifBlank { "Round in progress" }
            subtitle = "Hole ${state.hole} of ${state.holeCount}"
        } else {
            title = "No round"
            subtitle = "Start on your phone"
        }

        val content = LayoutElementBuilders.Column.Builder()
            .setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)
            .addContent(
                Text.Builder(this, title)
                    .setTypography(Typography.TYPOGRAPHY_TITLE3)
                    .build(),
            )
            .addContent(
                Text.Builder(this, subtitle)
                    .setTypography(Typography.TYPOGRAPHY_CAPTION1)
                    .build(),
            )
            .setModifiers(
                ModifiersBuilders.Modifiers.Builder()
                    .setClickable(openAppClickable())
                    .build(),
            )
            .build()

        return PrimaryLayout.Builder(deviceParametersFrom())
            .setContent(content)
            .build()
    }

    private fun openAppClickable() = ModifiersBuilders.Clickable.Builder()
        .setId("open")
        .setOnClick(
            ActionBuilders.LaunchAction.Builder()
                .setAndroidActivity(
                    ActionBuilders.AndroidActivity.Builder()
                        .setClassName(MainActivity::class.java.name)
                        .setPackageName(packageName)
                        .build(),
                )
                .build(),
        )
        .build()

    private fun deviceParametersFrom() =
        androidx.wear.protolayout.DeviceParametersBuilders.DeviceParameters.Builder().build()

    private fun <T> immediate(value: T): ListenableFuture<T> =
        ResolvableFuture.create<T>().apply { set(value) }

    companion object {
        private const val RES_VERSION = "1"
    }
}
