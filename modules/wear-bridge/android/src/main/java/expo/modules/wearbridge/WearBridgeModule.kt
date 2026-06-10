package expo.modules.wearbridge

import android.os.Bundle
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Android Wear OS Data Layer bridge. Counterpart to the watch-side
 * WearDataRepository; wire paths and JSON match the iOS ConnectivityClient.
 *
 *   updateData(json)  -> DataClient "/snapshot" (latest-state, phone->watch)
 *   sendMessage(json) -> MessageClient "/ack"   (phone->watch)
 *   onMessage event   <- MessageClient "/score-write","/navigate" (watch->phone)
 */
class WearBridgeModule : Module() {
  private val context get() = appContext.reactContext ?: throw IllegalStateException("No app context")

  private val messageListener = MessageClient.OnMessageReceivedListener { event: MessageEvent ->
    if (event.path == PATH_SCORE_WRITE || event.path == PATH_NAVIGATE) {
      sendEvent("onMessage", Bundle().apply { putString("json", String(event.data)) })
    }
  }

  override fun definition() = ModuleDefinition {
    Name("WearBridge")

    Events("onMessage")

    Function("isSupported") {
      GoogleApiAvailability.getInstance()
        .isGooglePlayServicesAvailable(context) == ConnectionResult.SUCCESS
    }

    AsyncFunction("updateData") { json: String ->
      val request = PutDataMapRequest.create(PATH_SNAPSHOT).apply {
        dataMap.putString(KEY_JSON, json)
        // Force a data-changed event even when the JSON is unchanged.
        dataMap.putLong(KEY_TS, System.currentTimeMillis())
      }.asPutDataRequest().setUrgent()
      Wearable.getDataClient(context).putDataItem(request)
    }

    AsyncFunction("sendMessage") { json: String ->
      val bytes = json.toByteArray()
      val nodeClient = Wearable.getNodeClient(context)
      val messageClient = Wearable.getMessageClient(context)
      nodeClient.connectedNodes.addOnSuccessListener { nodes ->
        nodes.forEach { node -> messageClient.sendMessage(node.id, PATH_ACK, bytes) }
      }
    }

    OnStartObserving {
      Wearable.getMessageClient(context).addListener(messageListener)
    }

    OnStopObserving {
      Wearable.getMessageClient(context).removeListener(messageListener)
    }
  }

  companion object {
    private const val PATH_SNAPSHOT = "/snapshot"
    private const val PATH_ACK = "/ack"
    private const val PATH_SCORE_WRITE = "/score-write"
    private const val PATH_NAVIGATE = "/navigate"
    private const val KEY_JSON = "json"
    private const val KEY_TS = "ts"
  }
}
