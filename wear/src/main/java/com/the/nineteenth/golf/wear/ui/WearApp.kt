package com.the.nineteenth.golf.wear.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import com.the.nineteenth.golf.wear.data.WatchSnapshot

/// Spec 2: render the received snapshot (competition + current hole) to prove the
/// data bridge. Falls back to the placeholder when no snapshot has arrived.
/// Replaced by the real Distance/Score/Leaderboard screens in Spec 3+.
@Composable
fun WearApp(snapshot: WatchSnapshot?) {
    MaterialTheme {
        Box(
            modifier = Modifier.fillMaxSize().padding(8.dp),
            contentAlignment = Alignment.Center,
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                if (snapshot != null) {
                    Text(
                        text = snapshot.competitionName,
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.colors.primary,
                        style = MaterialTheme.typography.title3,
                    )
                    Text(
                        text = "Hole ${snapshot.currentHole}",
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.colors.onSurface,
                        style = MaterialTheme.typography.title1,
                    )
                    snapshot.currentHoleObject?.let { hole ->
                        Text(
                            text = "Par ${hole.par}",
                            textAlign = TextAlign.Center,
                            color = MaterialTheme.colors.onSurfaceVariant,
                            style = MaterialTheme.typography.caption1,
                        )
                    }
                } else {
                    Text(
                        text = "The Nineteenth",
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.colors.primary,
                        style = MaterialTheme.typography.title3,
                    )
                    Text(
                        text = "Wear · waiting for phone…",
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.colors.onSurfaceVariant,
                        style = MaterialTheme.typography.caption2,
                    )
                }
            }
        }
    }
}
