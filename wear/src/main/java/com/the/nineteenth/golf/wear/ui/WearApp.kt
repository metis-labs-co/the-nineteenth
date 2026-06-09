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

/// Spec 1 scaffold: proves the Wear module builds and runs. Replaced by the real
/// Distance/Score/Leaderboard screens once the Data Layer bridge lands (Spec 2+).
@Composable
fun WearApp() {
    MaterialTheme {
        Box(
            modifier = Modifier.fillMaxSize().padding(8.dp),
            contentAlignment = Alignment.Center,
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
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
