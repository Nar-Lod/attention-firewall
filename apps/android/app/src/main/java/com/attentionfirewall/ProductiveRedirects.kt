package com.attentionfirewall

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager

enum class ProductiveDestination(val label: String, val packages: List<String>) {
    NOTES("Notes", listOf("com.google.android.keep")),
    TASKS("To-Do List", listOf("com.google.android.apps.tasks")),
    CALENDAR("Calendar", listOf("com.google.android.calendar"))
}

data class ProductiveSuggestion(
    val destination: ProductiveDestination,
    val cue: String
)

object ProductiveRedirects {
    fun available(context: Context): List<ProductiveDestination> =
        ProductiveDestination.values().filter { destination ->
            destination.packages.any { packageName ->
                runCatching { context.packageManager.getApplicationInfo(packageName, 0) }.isSuccess
            }
        }

    fun suggestions(context: Context, purpose: String, taskCue: String?): List<ProductiveSuggestion> {
        val available = available(context)
        val ordered = when (purpose) {
            "work", "study" -> listOf(ProductiveDestination.TASKS, ProductiveDestination.NOTES, ProductiveDestination.CALENDAR)
            "communication" -> listOf(ProductiveDestination.CALENDAR, ProductiveDestination.TASKS, ProductiveDestination.NOTES)
            else -> listOf(ProductiveDestination.TASKS, ProductiveDestination.NOTES, ProductiveDestination.CALENDAR)
        }
        return ordered.filter { it in available }.map { destination ->
            val cue = if (destination == ProductiveDestination.TASKS && !taskCue.isNullOrBlank()) {
                "Continue: $taskCue"
            } else {
                when (destination) {
                    ProductiveDestination.NOTES -> "Capture what you actually meant to do."
                    ProductiveDestination.TASKS -> "Choose one next action."
                    ProductiveDestination.CALENDAR -> "Return to what you planned."
                }
            }
        }
    }

    fun launch(context: Context, destination: ProductiveDestination): Boolean {
        val packageName = destination.packages.firstOrNull { packageName ->
            runCatching { context.packageManager.getApplicationInfo(packageName, 0) }.isSuccess
        } ?: return false
        val launchIntent = context.packageManager.getLaunchIntentForPackage(packageName) ?: return false
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return runCatching {
            context.startActivity(launchIntent)
            true
        }.getOrDefault(false)
    }
}
