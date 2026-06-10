package com.the.nineteenth.golf.wear

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.getValue
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.the.nineteenth.golf.wear.data.WearDataRepository
import com.the.nineteenth.golf.wear.distance.HeadingProvider
import com.the.nineteenth.golf.wear.distance.WearLocationProvider
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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        repo = WearDataRepository(this)
        location = WearLocationProvider(this)
        heading = HeadingProvider(this)
        setContent {
            val snapshot by repo.snapshot.collectAsStateWithLifecycle()
            val loc by location.location.collectAsStateWithLifecycle()
            val hdg by heading.heading.collectAsStateWithLifecycle()
            WearApp(
                snapshot = snapshot,
                location = loc,
                heading = hdg,
                onNavigate = repo::sendNavigate,
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
// by default so dev builds show real Data Layer state.
private const val WEAR_PREVIEW = false

private const val SAMPLE_SNAPSHOT_JSON = """
{"rev":1,"roundId":"demo","competitionName":"Saturday Medal","unit":"metres",
"isPremium":true,"statFlags":{"putts":true,"fairways":true,"gir":true,
"penalties":false,"bunker":false},"currentHole":7,
"holes":[
  {"hole":6,"par":3,"strokeIndex":11,"green":{"center":{"latitude":-37.81360,"longitude":144.9631}}},
  {"hole":7,"par":4,"strokeIndex":5,"green":{"center":{"latitude":-37.81270,"longitude":144.9631},
    "front":{"latitude":-37.81285,"longitude":144.9631},"back":{"latitude":-37.81255,"longitude":144.9631}}},
  {"hole":8,"par":5,"strokeIndex":1,"green":{"center":{"latitude":-37.81180,"longitude":144.9631}}}
],
"pairPlayers":[],"leaderboard":[],"wind":{"speedKph":18.0,"fromDeg":225.0}}
"""
