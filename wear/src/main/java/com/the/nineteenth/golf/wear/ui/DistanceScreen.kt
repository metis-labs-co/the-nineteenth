package com.the.nineteenth.golf.wear.ui

import android.location.Location
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import com.the.nineteenth.golf.wear.data.LatLng
import com.the.nineteenth.golf.wear.data.WatchHole
import com.the.nineteenth.golf.wear.data.WatchSnapshot
import com.the.nineteenth.golf.wear.data.WatchWind
import com.the.nineteenth.golf.wear.distance.DistanceEngine
import com.the.nineteenth.golf.wear.distance.WindArrow

/**
 * Distance-to-green, paged by hole and two-way synced with the phone — the Wear
 * port of iOS DistanceView. Swiping changes the active hole everywhere;
 * phone-initiated changes are followed back (echo-guarded).
 */
@Composable
fun DistanceScreen(
    snapshot: WatchSnapshot,
    location: Location?,
    heading: Float?,
    onNavigate: (Int) -> Unit,
) {
    val holes = snapshot.holes
    val initial = holes.indexOfFirst { it.hole == snapshot.currentHole }.coerceAtLeast(0)
    val pagerState = rememberPagerState(initialPage = initial) { holes.size }

    // Inbound: follow phone-initiated navigation.
    LaunchedEffect(snapshot.currentHole) {
        val idx = holes.indexOfFirst { it.hole == snapshot.currentHole }
        if (idx >= 0 && idx != pagerState.currentPage) pagerState.animateScrollToPage(idx)
    }
    // Outbound: drive the phone when the user pages (skip the echo).
    LaunchedEffect(pagerState) {
        snapshotFlow { pagerState.currentPage }.collect { page ->
            val hole = holes.getOrNull(page)?.hole ?: return@collect
            if (hole != snapshot.currentHole) onNavigate(hole)
        }
    }

    HorizontalPager(state = pagerState, modifier = Modifier.fillMaxSize()) { page ->
        holes.getOrNull(page)?.let { hole ->
            HoleDistancePage(hole, location, heading, snapshot.unit, snapshot.wind)
        }
    }
}

@Composable
private fun HoleDistancePage(
    hole: WatchHole,
    location: Location?,
    heading: Float?,
    unit: String,
    wind: WatchWind?,
) {
    Box(modifier = Modifier.fillMaxSize().padding(horizontal = 12.dp)) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                text = "Hole ${hole.hole} · Par ${hole.par}",
                color = MaterialTheme.colors.onSurfaceVariant,
                style = MaterialTheme.typography.caption2,
            )
            Text(
                text = distanceText(hole.green.center, location, unit),
                color = MaterialTheme.colors.onSurface,
                fontWeight = FontWeight.Bold,
                fontSize = 44.sp,
            )
            Text(
                text = "to centre",
                color = MaterialTheme.colors.onSurfaceVariant,
                style = MaterialTheme.typography.caption2,
            )
            Spacer(Modifier.padding(top = 6.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(
                    text = "F ${distanceText(hole.green.front, location, unit)}",
                    style = MaterialTheme.typography.caption1,
                )
                Text(
                    text = "B ${distanceText(hole.green.back, location, unit)}",
                    style = MaterialTheme.typography.caption1,
                )
            }
        }

        if (wind != null) {
            WindIndicator(
                wind = wind,
                unit = unit,
                headingDegrees = heading?.toDouble(),
                modifier = Modifier.align(Alignment.TopCenter),
            )
        }
    }
}

@Composable
private fun WindIndicator(
    wind: WatchWind,
    unit: String,
    headingDegrees: Double?,
    modifier: Modifier = Modifier,
) {
    val angle = WindArrow.windArrowDegrees(wind.fromDeg, headingDegrees ?: 0.0)
    Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically) {
        Text(
            text = "↑",
            color = MaterialTheme.colors.onSurfaceVariant,
            style = MaterialTheme.typography.caption1,
            modifier = Modifier.rotate(angle.toFloat()),
        )
        Text(
            text = WindArrow.windSpeedText(wind.speedKph, unit),
            color = MaterialTheme.colors.onSurfaceVariant,
            style = MaterialTheme.typography.caption2,
        )
        if (headingDegrees == null) {
            Text(
                text = "N",
                color = MaterialTheme.colors.onSurfaceVariant,
                fontSize = 8.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

private fun distanceText(point: LatLng?, location: Location?, unit: String): String {
    if (point == null || location == null || !DistanceEngine.isAccurate(location.accuracy)) return "—"
    val here = LatLng(location.latitude, location.longitude)
    return DistanceEngine.display(DistanceEngine.metres(here, point), unit).toString()
}
