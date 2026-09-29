package com.attentionfirewall

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Process

data class LocalUsageSummary(
    val windowMinutes: Int,
    val foregroundTransitions: Int,
    val activeSeconds: Long
) {
    fun toJson(): String =
        """{"windowMinutes":$windowMinutes,"foregroundTransitions":$foregroundTransitions,"activeSeconds":$activeSeconds}"""
}

class UsageSignalAdapter(private val context: Context) {
    fun hasUsageAccess(): Boolean {
        val appOps = context.getSystemService(AppOpsManager::class.java)
        val mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            context.packageName
        )
        return mode == AppOpsManager.MODE_ALLOWED
    }

    fun sampleLastMinutes(minutes: Int): LocalUsageSummary {
        require(minutes in 1..120)
        val manager = context.getSystemService(UsageStatsManager::class.java)
        val end = System.currentTimeMillis()
        val start = end - minutes * 60_000L
        val events = manager.queryEvents(start, end)

        var transitions = 0
        var activeSeconds = 0L
        var currentStart = 0L
        val event = UsageEvents.Event()

        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            when (event.eventType) {
                UsageEvents.Event.ACTIVITY_RESUMED -> {
                    transitions++
                    currentStart = event.timeStamp
                }
                UsageEvents.Event.ACTIVITY_PAUSED -> {
                    if (currentStart > 0L && event.timeStamp >= currentStart) {
                        activeSeconds = (activeSeconds + (event.timeStamp - currentStart) / 1000L)
                            .coerceAtMost(minutes * 60L)
                        currentStart = 0L
                    }
                }
            }
        }

        return LocalUsageSummary(minutes, transitions, activeSeconds)
    }
}
