package com.the.nineteenth.golf.wear

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.the.nineteenth.golf.wear.data.WearDataRepository
import com.the.nineteenth.golf.wear.distance.HeadingProvider
import com.the.nineteenth.golf.wear.distance.WearLocationProvider
import com.the.nineteenth.golf.wear.keepalive.RoundKeepAliveService
import com.the.nineteenth.golf.wear.ui.ROUTE_DISTANCE
import com.the.nineteenth.golf.wear.ui.WearApp

/// Entry point. Owns the Data Layer repository and the GPS/compass providers,
/// feeds their state into Compose, and routes hole-navigation back to the phone.
class MainActivity : ComponentActivity() {
    private lateinit var repo: WearDataRepository
    private lateinit var location: WearLocationProvider
    private lateinit var heading: HeadingProvider

    private val locationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) location.start()
        }

    // Result ignored: keep-alive still runs if denied, just without a visible chip.
    private val notificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        repo = WearDataRepository(this)
        location = WearLocationProvider(this)
        heading = HeadingProvider(this)
        setContent {
            val snapshot by repo.snapshot.collectAsStateWithLifecycle()
            val loc by location.location.collectAsStateWithLifecycle()
            val hdg by heading.heading.collectAsStateWithLifecycle()
            val save by repo.saveState.collectAsStateWithLifecycle()
            // Keep-alive mirrors the iOS WorkoutController: run a foreground
            // service while a round is live, stop it when the round clears.
            LaunchedEffect(snapshot?.roundId, snapshot?.currentHole) {
                val s = snapshot
                if (s != null && s.holes.isNotEmpty()) {
                    RoundKeepAliveService.start(this@MainActivity, s.competitionName, s.currentHole, s.holes.size)
                } else {
                    RoundKeepAliveService.stop(this@MainActivity)
                }
            }
            WearApp(
                snapshot = snapshot,
                location = loc,
                heading = hdg,
                saveState = save,
                onNavigate = repo::sendNavigate,
                onSendScore = repo::sendScoreWrite,
                startDestination = if (BuildConfig.DEBUG && WEAR_PREVIEW) WEAR_PREVIEW_START else ROUTE_DISTANCE,
            )
        }
    }

    override fun onStart() {
        super.onStart()
        repo.start()
        heading.start()
        if (hasLocationPermission()) {
            location.start()
        } else {
            locationPermission.launch(Manifest.permission.ACCESS_FINE_LOCATION)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
        if (BuildConfig.DEBUG && WEAR_PREVIEW) repo.injectForPreview(SAMPLE_SNAPSHOT_JSON)
    }

    override fun onStop() {
        super.onStop()
        repo.stop()
        location.stop()
        heading.stop()
    }

    private fun hasLocationPermission() =
        ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED
}

// Flip true to preview a sample snapshot on the emulator (no paired phone). Off
// by default so dev builds show real Data Layer state. WEAR_PREVIEW_START picks
// which screen to land on while previewing.
private const val WEAR_PREVIEW = false
private const val WEAR_PREVIEW_START = ROUTE_DISTANCE

private const val SAMPLE_SNAPSHOT_JSON = """
{"rev":1,"roundId":"demo","competitionName":"Saturday Medal","unit":"metres",
"isPremium":true,"statFlags":{"putts":true,"fairways":true,"gir":true,
"penalties":true,"bunker":true},"currentHole":7,
"holes":[
  {"hole":6,"par":3,"strokeIndex":11,"green":{"center":{"latitude":-37.81360,"longitude":144.9631}}},
  {"hole":7,"par":4,"strokeIndex":5,"green":{"center":{"latitude":-37.81270,"longitude":144.9631},
    "front":{"latitude":-37.81285,"longitude":144.9631},"back":{"latitude":-37.81255,"longitude":144.9631}}},
  {"hole":8,"par":5,"strokeIndex":1,"green":{"center":{"latitude":-37.81180,"longitude":144.9631}}}
],
"pairPlayers":[{"playerId":"me","name":"You"}],
"scores":{"me:7":{"strokes":4,"putts":2}},
"leaderboard":[
  {"rank":1,"name":"Alex","detail":"34","isCurrentUser":false},
  {"rank":2,"name":"You","detail":"31","isCurrentUser":true},
  {"rank":3,"name":"Sam","detail":"29","isCurrentUser":false}
],
"wind":{"speedKph":18.0,"fromDeg":225.0}}
"""
