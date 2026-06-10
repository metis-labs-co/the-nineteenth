package com.the.nineteenth.golf.wear.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import com.the.nineteenth.golf.wear.data.WatchSnapshot

/**
 * Round menu — Wear port of iOS NowPlayingView: a status header plus rows to the
 * three feature screens. Reached from the Distance screen's menu affordance.
 */
@Composable
fun MenuScreen(
    snapshot: WatchSnapshot,
    onDistance: () -> Unit,
    onScore: () -> Unit,
    onLeaderboard: () -> Unit,
) {
    ScalingLazyColumn(
        modifier = Modifier.fillMaxWidth(),
        state = rememberScalingLazyListState(),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item { RoundHeader(snapshot) }
        item { MenuRow("⛳", MaterialTheme.colors.primary, "Distance", onDistance) }
        item { MenuRow("✎", Color(0xFF4CAF50), "Enter score", onScore) }
        item { MenuRow("🏆", Color(0xFFFFB300), "Leaderboard", onLeaderboard) }
    }
}

@Composable
private fun RoundHeader(snapshot: WatchSnapshot) {
    val holeCount = snapshot.holes.size.coerceAtLeast(1)
    Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
        Text(
            snapshot.competitionName,
            style = MaterialTheme.typography.title3,
            color = MaterialTheme.colors.onSurface,
            fontWeight = FontWeight.SemiBold,
        )
        Text(
            "Hole ${snapshot.currentHole} of ${snapshot.holes.size}",
            style = MaterialTheme.typography.caption2,
            color = MaterialTheme.colors.onSurfaceVariant,
        )
        ProgressBar(snapshot.currentHole.toFloat() / holeCount.toFloat())
    }
}

@Composable
private fun ProgressBar(fraction: Float) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(4.dp)
            .clip(RoundedCornerShape(2.dp))
            .background(MaterialTheme.colors.surface),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth(fraction.coerceIn(0f, 1f))
                .height(4.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(MaterialTheme.colors.primary),
        )
    }
}

@Composable
private fun MenuRow(glyph: String, tint: Color, title: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(MaterialTheme.colors.surface)
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(
            modifier = Modifier
                .size(30.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(tint.copy(alpha = 0.20f)),
            contentAlignment = Alignment.Center,
        ) {
            Text(glyph, color = tint)
        }
        Text(title, style = MaterialTheme.typography.body1, color = MaterialTheme.colors.onSurface)
    }
}
