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
import com.the.nineteenth.golf.wear.data.WearDataRepository.SaveState

/**
 * Root navigation scaffold. Distance is home; Score is a route reachable in DEBUG
 * via [startDestination] (the production entry point — the menu — lands in Spec
 * 3c). Swipe-to-dismiss returns home.
 */
@Composable
fun WearApp(
    snapshot: WatchSnapshot?,
    location: Location?,
    heading: Float?,
    saveState: SaveState,
    onNavigate: (Int) -> Unit,
    onSendScore: (String) -> Unit,
    startDestination: String = ROUTE_DISTANCE,
) {
    MaterialTheme(colors = WearColors) {
        val navController = rememberSwipeDismissableNavController()
        SwipeDismissableNavHost(navController = navController, startDestination = startDestination) {
            composable(ROUTE_DISTANCE) {
                if (snapshot != null && snapshot.holes.isNotEmpty()) {
                    DistanceScreen(
                        snapshot, location, heading, onNavigate,
                        onOpenMenu = { navController.navigate(ROUTE_MENU) },
                    )
                } else {
                    Placeholder(title = "The Nineteenth", subtitle = "Wear · waiting for phone…")
                }
            }
            composable(ROUTE_MENU) {
                if (snapshot != null) {
                    MenuScreen(
                        snapshot,
                        onDistance = { navController.navigate(ROUTE_DISTANCE) },
                        onScore = { navController.navigate(ROUTE_SCORE) },
                        onLeaderboard = { navController.navigate(ROUTE_LEADERBOARD) },
                    )
                } else {
                    Placeholder(title = "The Nineteenth", subtitle = "Wear · waiting for phone…")
                }
            }
            composable(ROUTE_SCORE) {
                if (snapshot != null && snapshot.holes.isNotEmpty()) {
                    ScoreScreen(snapshot, saveState, onNavigate, onSendScore)
                } else {
                    Placeholder(title = "Score", subtitle = "Waiting for phone…")
                }
            }
            composable(ROUTE_LEADERBOARD) {
                if (snapshot != null) {
                    LeaderboardScreen(snapshot)
                } else {
                    Placeholder(title = "Leaderboard", subtitle = "Waiting for phone…")
                }
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

const val ROUTE_DISTANCE = "distance"
const val ROUTE_SCORE = "score"
const val ROUTE_MENU = "menu"
const val ROUTE_LEADERBOARD = "leaderboard"
