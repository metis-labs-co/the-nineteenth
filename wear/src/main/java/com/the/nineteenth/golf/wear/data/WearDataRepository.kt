package com.the.nineteenth.golf.wear.data

import android.content.ComponentName
import android.content.Context
import android.util.Log
import androidx.wear.tiles.TileService
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceUpdateRequester
import com.the.nineteenth.golf.wear.glance.RoundComplicationService
import com.the.nineteenth.golf.wear.glance.RoundTileService
import com.the.nineteenth.golf.wear.glance.WearSharedState
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString

/**
 * Owns the Data Layer connection on the watch side. Listens for the phone's
 * `/snapshot` DataItem (latest-state, analogous to iOS applicationContext),
 * decodes it, and exposes it as a StateFlow. Sends watch->phone messages
 * (`/score-write`, `/navigate`) and receives `/ack` via MessageClient.
 *
 * Wire paths and JSON shape mirror the iOS ConnectivityClient exactly.
 */
class WearDataRepository(context: Context) : DataClient.OnDataChangedListener,
    MessageClient.OnMessageReceivedListener {

    private val appContext = context.applicationContext
    private val dataClient = Wearable.getDataClient(appContext)
    private val messageClient = Wearable.getMessageClient(appContext)

    private val _snapshot = MutableStateFlow<WatchSnapshot?>(null)
    val snapshot: StateFlow<WatchSnapshot?> = _snapshot.asStateFlow()

    /** Transient outcome of the most recent score write, for the Saved/Retry UI. */
    enum class SaveState { IDLE, SAVED, FAILED }

    private val _saveState = MutableStateFlow(SaveState.IDLE)
    val saveState: StateFlow<SaveState> = _saveState.asStateFlow()

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    // Bumped per send so a stale auto-reset can't clear a newer state.
    private var saveGeneration = 0

    fun start() {
        dataClient.addListener(this)
        messageClient.addListener(this)
        // Pull any snapshot that arrived before we registered (cold start).
        dataClient.dataItems.addOnSuccessListener { buffer ->
            try {
                buffer.firstOrNull { it.uri.path == PATH_SNAPSHOT }?.let { item ->
                    decodeAndPublish(DataMapItem.fromDataItem(item).dataMap.getString(KEY_JSON))
                }
            } finally {
                buffer.release()
            }
        }
    }

    fun stop() {
        dataClient.removeListener(this)
        messageClient.removeListener(this)
    }

    override fun onDataChanged(events: DataEventBuffer) {
        try {
            for (event in events) {
                if (event.type != DataEvent.TYPE_CHANGED) continue
                val item = event.dataItem
                if (item.uri.path != PATH_SNAPSHOT) continue
                decodeAndPublish(DataMapItem.fromDataItem(item).dataMap.getString(KEY_JSON))
            }
        } finally {
            events.release()
        }
    }

    override fun onMessageReceived(event: com.google.android.gms.wearable.MessageEvent) {
        if (event.path != PATH_ACK) return
        val ack = try {
            WatchJson.decodeFromString<WatchAck>(String(event.data))
        } catch (e: Exception) {
            Log.w(TAG, "bad ack", e); return
        }
        // We optimistically show Saved on send; only surface genuine rejections.
        if (ack.status == "unauthorized" || ack.status == "error") {
            setSaveState(SaveState.FAILED)
        }
    }

    /** Watch -> phone: a score-write JSON payload (built by ScoreWriteBuilder). */
    fun sendScoreWrite(json: String) {
        sendToNodes(PATH_SCORE_WRITE, json)
        setSaveState(SaveState.SAVED)
    }

    private fun setSaveState(state: SaveState) {
        _saveState.value = state
        if (state == SaveState.IDLE) return
        saveGeneration += 1
        val gen = saveGeneration
        scope.launch {
            delay(1500)
            if (saveGeneration == gen) _saveState.value = SaveState.IDLE
        }
    }

    /** Watch -> phone: move the active hole. */
    fun sendNavigate(hole: Int) {
        sendToNodes(PATH_NAVIGATE, WatchJson.encodeToString(WatchNavigate(hole = hole)))
    }

    /** DEBUG only: render a snapshot without a paired phone. */
    fun injectForPreview(json: String) = decodeAndPublish(json)

    private fun sendToNodes(path: String, json: String) {
        val bytes = json.toByteArray()
        Wearable.getNodeClient(appContext).connectedNodes.addOnSuccessListener { nodes ->
            for (node in nodes) {
                messageClient.sendMessage(node.id, path, bytes)
            }
        }
    }

    private fun decodeAndPublish(json: String?) {
        if (json == null) return
        try {
            val snapshot = WatchJson.decodeFromString<WatchSnapshot>(json)
            _snapshot.value = snapshot
            publishGlance(snapshot)
        } catch (e: Exception) {
            Log.w(TAG, "failed to decode snapshot", e)
        }
    }

    /** Mirror the live round into shared state so the Tile + complication can show
     *  it, then nudge both to refresh (analog of iOS publishComplicationState). */
    private fun publishGlance(snapshot: WatchSnapshot) {
        WearSharedState.write(
            appContext,
            active = true,
            hole = snapshot.currentHole,
            holeCount = snapshot.holes.size,
            name = snapshot.competitionName,
        )
        try {
            TileService.getUpdater(appContext).requestUpdate(RoundTileService::class.java)
            ComplicationDataSourceUpdateRequester
                .create(appContext, ComponentName(appContext, RoundComplicationService::class.java))
                .requestUpdateAll()
        } catch (e: Exception) {
            Log.w(TAG, "glance update request failed", e)
        }
    }

    companion object {
        private const val TAG = "WearDataRepository"
        const val PATH_SNAPSHOT = "/snapshot"
        const val PATH_ACK = "/ack"
        const val PATH_SCORE_WRITE = "/score-write"
        const val PATH_NAVIGATE = "/navigate"
        const val KEY_JSON = "json"
    }
}
