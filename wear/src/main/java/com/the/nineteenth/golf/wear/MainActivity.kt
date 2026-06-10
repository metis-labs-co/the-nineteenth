package com.the.nineteenth.golf.wear

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.the.nineteenth.golf.wear.data.WearDataRepository
import com.the.nineteenth.golf.wear.ui.WearApp

/// Entry point for the Wear OS companion. Owns the Data Layer repository and
/// feeds the latest snapshot into Compose. Real screens (Distance/Score/…) are
/// Spec 3; Spec 2 renders the received competition + hole to prove the bridge.
class MainActivity : ComponentActivity() {
    private lateinit var repo: WearDataRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        repo = WearDataRepository(this)
        setContent {
            val snapshot by repo.snapshot.collectAsStateWithLifecycle()
            WearApp(snapshot)
        }
    }

    override fun onStart() {
        super.onStart()
        repo.start()
        // DEBUG: render a sample snapshot when there's no paired phone, so the
        // decode + UI can be verified on the emulator. Flip WEAR_PREVIEW off (or
        // remove) before shipping — same throwaway pattern as the iOS wind demo.
        if (BuildConfig.DEBUG && WEAR_PREVIEW) {
            repo.injectForPreview(SAMPLE_SNAPSHOT_JSON)
        }
    }

    override fun onStop() {
        super.onStop()
        repo.stop()
    }
}

// Flip true to preview a sample snapshot on the emulator (no paired phone). Off
// by default so dev builds show real Data Layer state.
private const val WEAR_PREVIEW = false

private const val SAMPLE_SNAPSHOT_JSON = """
{"rev":1,"roundId":"demo","competitionName":"Saturday Medal","unit":"metres",
"isPremium":true,"statFlags":{"putts":true,"fairways":true,"gir":true,
"penalties":false,"bunker":false},"currentHole":7,
"holes":[{"hole":7,"par":4,"strokeIndex":5,"green":{}}],
"pairPlayers":[],"leaderboard":[],"wind":{"speedKph":18.0,"fromDeg":225.0}}
"""
