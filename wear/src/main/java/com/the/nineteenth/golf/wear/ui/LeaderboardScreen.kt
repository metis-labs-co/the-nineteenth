package com.the.nineteenth.golf.wear.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.items
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import com.the.nineteenth.golf.wear.data.WatchLeaderboardRow
import com.the.nineteenth.golf.wear.data.WatchSnapshot

/**
 * Read-only leaderboard glance — Wear port of iOS LeaderboardView. Rows arrive
 * already trimmed from the phone; the current user's row is highlighted.
 */
@Composable
fun LeaderboardScreen(snapshot: WatchSnapshot) {
    val rows = snapshot.leaderboard
    if (rows.isEmpty()) {
        Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
            Text("No standings yet", color = MaterialTheme.colors.onSurfaceVariant)
        }
        return
    }
    ScalingLazyColumn(
        modifier = Modifier.fillMaxWidth(),
        state = rememberScalingLazyListState(),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        items(rows) { row -> LeaderboardRow(row) }
    }
}

@Composable
private fun LeaderboardRow(row: WatchLeaderboardRow) {
    val color = if (row.isCurrentUser) MaterialTheme.colors.primary else MaterialTheme.colors.onSurface
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(
            "${row.rank}",
            style = MaterialTheme.typography.caption1,
            color = MaterialTheme.colors.onSurfaceVariant,
            modifier = Modifier.width(20.dp),
        )
        Text(
            row.name,
            style = MaterialTheme.typography.body2,
            color = color,
            fontWeight = if (row.isCurrentUser) FontWeight.Bold else FontWeight.Normal,
            modifier = Modifier.weight(1f),
            maxLines = 1,
        )
        Text(row.detail, style = MaterialTheme.typography.body2, color = color)
    }
}
