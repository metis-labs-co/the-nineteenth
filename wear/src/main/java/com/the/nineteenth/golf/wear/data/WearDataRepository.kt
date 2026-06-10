package com.the.nineteenth.golf.wear.data

import android.content.Context
import android.util.Log
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
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
        // Phone -> watch acks land here (Spec 3 uses them for save feedback).
        if (event.path == PATH_ACK) {
            Log.d(TAG, "ack: ${String(event.data)}")
        }
    }

    /** Watch -> phone: move the active hole. */
    fun sendNavigate(hole: Int) {
        sendToNodes(PATH_NAVIGATE, WatchJson.encodeToString(WatchNavigate(hole = hole)))
    }

    /** Watch -> phone: a raw score-write JSON payload (built in Spec 3). */
    fun sendScoreWrite(json: String) = sendToNodes(PATH_SCORE_WRITE, json)

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
            _snapshot.value = WatchJson.decodeFromString<WatchSnapshot>(json)
        } catch (e: Exception) {
            Log.w(TAG, "failed to decode snapshot", e)
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
