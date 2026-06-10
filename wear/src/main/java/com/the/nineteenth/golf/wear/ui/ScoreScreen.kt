package com.the.nineteenth.golf.wear.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import com.the.nineteenth.golf.wear.data.StrokesValue
import com.the.nineteenth.golf.wear.data.WatchHazard
import com.the.nineteenth.golf.wear.data.WatchHole
import com.the.nineteenth.golf.wear.data.WatchPairPlayer
import com.the.nineteenth.golf.wear.data.WatchScoreStat
import com.the.nineteenth.golf.wear.data.WatchSnapshot
import com.the.nineteenth.golf.wear.data.WatchStatFlags
import com.the.nineteenth.golf.wear.data.WearDataRepository.SaveState
import com.the.nineteenth.golf.wear.data.ScoreWriteBuilder

/**
 * Score entry — Wear port of the iOS ScoreView. Horizontal paging = holes (synced
 * with the phone). Each page: optional player picker, gross stepper + Par/Pick up,
 * a Saved/Retry indicator, then stat sections gated by statFlags. Edits build a
 * WatchScoreWrite and send it via the repository.
 */
@Composable
fun ScoreScreen(
    snapshot: WatchSnapshot,
    saveState: SaveState,
    onNavigate: (Int) -> Unit,
    onSendScore: (String) -> Unit,
) {
    val holes = snapshot.holes
    if (holes.isEmpty() || snapshot.pairPlayers.isEmpty()) {
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            Text("No round to score", color = MaterialTheme.colors.onSurfaceVariant)
        }
        return
    }

    val initial = holes.indexOfFirst { it.hole == snapshot.currentHole }.coerceAtLeast(0)
    val pagerState = rememberPagerState(initialPage = initial) { holes.size }
    var selectedPlayer by remember { mutableStateOf(0) }

    LaunchedEffect(snapshot.currentHole) {
        val idx = holes.indexOfFirst { it.hole == snapshot.currentHole }
        if (idx >= 0 && idx != pagerState.currentPage) pagerState.animateScrollToPage(idx)
    }
    LaunchedEffect(pagerState) {
        snapshotFlow { pagerState.currentPage }.collect { page ->
            val hole = holes.getOrNull(page)?.hole ?: return@collect
            if (hole != snapshot.currentHole) onNavigate(hole)
        }
    }

    HorizontalPager(state = pagerState) { page ->
        holes.getOrNull(page)?.let { hole ->
            HoleScorePage(snapshot, hole, selectedPlayer, { selectedPlayer = it }, saveState, onSendScore)
        }
    }
}

@Composable
private fun HoleScorePage(
    snapshot: WatchSnapshot,
    hole: WatchHole,
    selectedPlayer: Int,
    onSelectPlayer: (Int) -> Unit,
    saveState: SaveState,
    onSendScore: (String) -> Unit,
) {
    val flags = snapshot.statFlags
    val player = snapshot.pairPlayers[selectedPlayer.coerceIn(0, snapshot.pairPlayers.size - 1)]

    // Per (player, hole) input state, pre-filled from the stored score.
    val stored = snapshot.score(player.playerId, hole.hole)
    var strokes by remember(player.playerId, hole.hole) { mutableStateOf(stored?.strokes) }
    var putts by remember(player.playerId, hole.hole) { mutableStateOf(stored?.putts ?: 0) }
    var bunker by remember(player.playerId, hole.hole) { mutableStateOf(stored?.bunkerShots ?: 0) }
    var fairway by remember(player.playerId, hole.hole) {
        mutableStateOf(loadSegment(stored?.fairwayHit, stored?.fairwayMissDirection, flags.fairwayDirection))
    }
    var gir by remember(player.playerId, hole.hole) {
        mutableStateOf(loadSegment(stored?.greenInRegulation, stored?.greenMissDirection, flags.greenDirection))
    }
    var hazards by remember(player.playerId, hole.hole) {
        mutableStateOf(stored?.hazards?.map { it.type }?.toSet() ?: emptySet())
    }

    fun send(value: StrokesValue) {
        onSendScore(
            ScoreWriteBuilder.build(
                roundId = snapshot.roundId,
                baseRev = snapshot.rev,
                hole = hole.hole,
                playerId = player.playerId,
                strokes = value,
                stat = buildStat(flags, putts, bunker, fairway, gir, hazards),
            ),
        )
    }
    fun commit() { strokes?.let { send(StrokesValue.Number(it)) } }

    ScalingLazyColumn(
        modifier = Modifier.fillMaxWidth(),
        state = rememberScalingLazyListState(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (snapshot.pairPlayers.size > 1) {
            item { PlayerPicker(snapshot.pairPlayers, selectedPlayer, onSelectPlayer) }
        }
        item {
            Text(
                "Hole ${hole.hole} · Par ${hole.par}",
                color = MaterialTheme.colors.onSurfaceVariant,
                style = MaterialTheme.typography.caption2,
            )
        }
        item {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StepButton("−") { strokes?.let { strokes = (it - 1).coerceAtLeast(1); commit() } }
                Text(strokes?.toString() ?: "—", fontSize = 40.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colors.onSurface)
                StepButton("+") { strokes = (strokes ?: 0) + 1; commit() }
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Chip("Pick up", false) { send(StrokesValue.Pickup) }
                Chip("Par", true) { strokes = hole.par; commit() }
            }
        }
        item { SavedIndicator(saveState) }

        if (flags.putts) item { Stepper("Putts", putts, { putts = (putts - 1).coerceAtLeast(0); commit() }, { putts += 1; commit() }) }
        if (flags.fairways && hole.par >= 4) {
            item {
                SegmentSection(
                    "Fairway",
                    if (flags.fairwayDirection) listOf("hit", "left", "right", "short", "long") else listOf("hit", "miss"),
                    fairway,
                ) { fairway = if (fairway == it) null else it; commit() }
            }
        }
        if (flags.gir) {
            item {
                SegmentSection(
                    "Green",
                    if (flags.greenDirection) listOf("hit", "left", "right", "short", "long") else listOf("hit", "miss"),
                    gir,
                ) { gir = if (gir == it) null else it; commit() }
            }
        }
        if (flags.bunker) item { Stepper("Bunker", bunker, { bunker = (bunker - 1).coerceAtLeast(0); commit() }, { bunker += 1; commit() }) }
        if (flags.penalties) {
            item {
                MultiSelectSection("Penalties", listOf("water", "ob", "lateral", "lost_ball"), hazards) {
                    hazards = if (hazards.contains(it)) hazards - it else hazards + it
                    commit()
                }
            }
        }
    }
}

// MARK: helpers

private fun loadSegment(hit: Boolean?, missDir: String?, directionMode: Boolean): String? {
    val raw = when {
        hit == true -> "hit"
        missDir != null -> missDir
        hit == false -> "miss"
        else -> null
    } ?: return null
    return if (!directionMode && raw != "hit" && raw != "miss") "miss" else raw
}

private fun buildStat(
    flags: WatchStatFlags,
    putts: Int,
    bunker: Int,
    fairway: String?,
    gir: String?,
    hazards: Set<String>,
): WatchScoreStat? {
    var stat = WatchScoreStat()
    if (flags.putts) stat = stat.copy(putts = putts)
    if (flags.bunker) stat = stat.copy(bunkerShots = bunker)
    if (flags.fairways && fairway != null) {
        stat = stat.copy(
            fairwayHit = fairway == "hit",
            fairwayMissDirection = if (flags.fairwayDirection && fairway != "hit") fairway else null,
        )
    }
    if (flags.gir && gir != null) {
        stat = stat.copy(
            greenInRegulation = gir == "hit",
            greenMissDirection = if (flags.greenDirection && gir != "hit") gir else null,
        )
    }
    if (flags.penalties) stat = stat.copy(hazards = hazards.sorted().map { WatchHazard(it) })
    val empty = stat.putts == null && stat.bunkerShots == null && stat.fairwayHit == null &&
        stat.greenInRegulation == null && (stat.hazards?.isEmpty() ?: true)
    return if (empty) null else stat
}

// MARK: controls

@Composable
private fun PlayerPicker(players: List<WatchPairPlayer>, selected: Int, onSelect: (Int) -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        players.forEachIndexed { i, p ->
            Chip(p.name, selected == i) { onSelect(i) }
        }
    }
}

@Composable
private fun StepButton(symbol: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(38.dp)
            .clip(CircleShape)
            .background(MaterialTheme.colors.primary)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(symbol, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colors.onPrimary)
    }
}

@Composable
private fun Stepper(title: String, value: Int, onMinus: () -> Unit, onPlus: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(title, style = MaterialTheme.typography.caption1, color = MaterialTheme.colors.onSurface)
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            StepButton("−", onMinus)
            Text("$value", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colors.onSurface)
            StepButton("+", onPlus)
        }
    }
}

@Composable
private fun Chip(text: String, selected: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(if (selected) MaterialTheme.colors.primary else MaterialTheme.colors.surface)
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 4.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text,
            style = MaterialTheme.typography.caption2,
            color = if (selected) MaterialTheme.colors.onPrimary else MaterialTheme.colors.onSurface,
        )
    }
}

@Composable
private fun SegmentSection(title: String, options: List<String>, selection: String?, onSelect: (String) -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(title, style = MaterialTheme.typography.caption1, color = MaterialTheme.colors.onSurface)
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            options.forEach { option ->
                Chip(segmentLabel(option), selection == option) { onSelect(option) }
            }
        }
    }
}

@Composable
private fun MultiSelectSection(title: String, options: List<String>, selection: Set<String>, onToggle: (String) -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(title, style = MaterialTheme.typography.caption1, color = MaterialTheme.colors.onSurface)
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            options.forEach { option ->
                Chip(hazardLabel(option), selection.contains(option)) { onToggle(option) }
            }
        }
    }
}

@Composable
private fun SavedIndicator(state: SaveState) {
    when (state) {
        SaveState.SAVED -> Text("✓ Saved", style = MaterialTheme.typography.caption2, color = MaterialTheme.colors.primary)
        SaveState.FAILED -> Text("⚠ Retry", style = MaterialTheme.typography.caption2, color = MaterialTheme.colors.error)
        SaveState.IDLE -> Text(" ", style = MaterialTheme.typography.caption2)
    }
}

private fun segmentLabel(option: String) = when (option) {
    "hit" -> "✓"; "left" -> "L"; "right" -> "R"; "short" -> "S"; "long" -> "Lo"; "miss" -> "✗"; else -> option
}

private fun hazardLabel(option: String) = when (option) {
    "water" -> "Wtr"; "ob" -> "OB"; "lateral" -> "Lat"; "lost_ball" -> "Lost"; else -> option
}
