package com.the.nineteenth.golf.wear.ui

import android.location.Location
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
import androidx.wear.compose.navigation.SwipeDismissableNavHost
import androidx.wear.compose.navigation.composable
import androidx.wear.compose.navigation.rememberSwipeDismissableNavController
import com.the.nineteenth.golf.wear.data.WatchSnapshot

/**
 * Root navigation scaffold. Distance is home; a stub `menu` route reserves the
 * slot for Score/Leaderboard/menu (Spec 3b–3c). Swipe-to-dismiss returns home.
 */
@Composable
fun WearApp(
    snapshot: WatchSnapshot?,
    location: Location?,
    heading: Float?,
    onNavigate: (Int) -> Unit,
) {
    MaterialTheme {
        val navController = rememberSwipeDismissableNavController()
        SwipeDismissableNavHost(navController = navController, startDestination = ROUTE_DISTANCE) {
            composable(ROUTE_DISTANCE) {
                if (snapshot != null && snapshot.holes.isNotEmpty()) {
                    DistanceScreen(snapshot, location, heading, onNavigate)
                } else {
                    Placeholder(title = "The Nineteenth", subtitle = "Wear · waiting for phone…")
                }
            }
            composable(ROUTE_MENU) {
                // Stub — filled in Spec 3c (Score / Leaderboard / round menu).
                Placeholder(title = "Menu", subtitle = "Coming soon")
            }
        }
    }
}

@Composable
private fun Placeholder(title: String, subtitle: String) {
    Box(modifier = Modifier.fillMaxSize().padding(8.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = title,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colors.primary,
                style = MaterialTheme.typography.title3,
            )
            Text(
                text = subtitle,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colors.onSurfaceVariant,
                style = MaterialTheme.typography.caption2,
            )
        }
    }
}

private const val ROUTE_DISTANCE = "distance"
private const val ROUTE_MENU = "menu"
