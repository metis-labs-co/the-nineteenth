package com.the.nineteenth.golf.wear.keepalive

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.wear.ongoing.OngoingActivity
import androidx.wear.ongoing.Status
import com.the.nineteenth.golf.wear.MainActivity
import com.the.nineteenth.golf.wear.R

/**
 * Keeps the app alive during a round — the Wear analog of the iOS
 * WorkoutController. A foreground service with an Ongoing Activity (a watch-face
 * chip / ongoing surface that returns to the app). Lifecycle is driven by
 * MainActivity off snapshot presence; updated extras refresh the hole text.
 */
class RoundKeepAliveService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val name = intent?.getStringExtra(EXTRA_NAME)?.ifBlank { "Round" } ?: "Round"
        val hole = intent?.getIntExtra(EXTRA_HOLE, 0) ?: 0
        val holeCount = intent?.getIntExtra(EXTRA_HOLE_COUNT, 0) ?: 0
        try {
            startForeground(NOTIF_ID, buildNotification(name, hole, holeCount))
        } catch (e: Exception) {
            // e.g. missing location permission for a location-typed FGS — degrade
            // gracefully rather than crash; the app still works without keep-alive.
            Log.w(TAG, "startForeground failed", e)
            stopSelf()
            return START_NOT_STICKY
        }
        return START_STICKY
    }

    private fun buildNotification(name: String, hole: Int, holeCount: Int): Notification {
        createChannel()
        val statusText = if (holeCount > 0) "Hole $hole of $holeCount" else "Round in progress"
        val tap = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE,
        )
        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_launcher)
            .setContentTitle(name)
            .setContentText(statusText)
            .setOngoing(true)
            .setContentIntent(tap)
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)

        OngoingActivity.Builder(applicationContext, NOTIF_ID, builder)
            .setStaticIcon(R.drawable.ic_launcher)
            .setTouchIntent(tap)
            .setStatus(Status.Builder().addTemplate(statusText).build())
            .build()
            .apply(applicationContext)

        return builder.build()
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val mgr = getSystemService(NotificationManager::class.java)
        if (mgr.getNotificationChannel(CHANNEL_ID) == null) {
            mgr.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Round", NotificationManager.IMPORTANCE_LOW),
            )
        }
    }

    companion object {
        private const val TAG = "RoundKeepAlive"
        private const val CHANNEL_ID = "round_keepalive"
        private const val NOTIF_ID = 1001
        private const val EXTRA_NAME = "name"
        private const val EXTRA_HOLE = "hole"
        private const val EXTRA_HOLE_COUNT = "holeCount"

        fun start(context: Context, name: String, hole: Int, holeCount: Int) {
            val intent = Intent(context, RoundKeepAliveService::class.java)
                .putExtra(EXTRA_NAME, name)
                .putExtra(EXTRA_HOLE, hole)
                .putExtra(EXTRA_HOLE_COUNT, holeCount)
            ContextCompat.startForegroundService(context, intent)
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, RoundKeepAliveService::class.java))
        }
    }
}
