package com.attentionfirewall

import android.content.Context
import android.content.Intent

data class ProductiveSuggestion(val destination: IntentionalApp)

object ProductiveRedirects {
    fun suggestions(context: Context, purpose: String, taskCue: String?): List<ProductiveSuggestion> {
        val selected=IntentionalAppStore(SecureLocalStore(context)).get()
        val ordered=when(purpose) {
            "work","study" -> selected.sortedBy { if(it.label.contains("task",true)||it.label.contains("todo",true)) 0 else 1 }
            "communication" -> selected.sortedBy { if(it.label.contains("calendar",true)) 0 else 1 }
            else -> selected
        }
        return ordered.map { app -> ProductiveSuggestion(if(!taskCue.isNullOrBlank()&&app.label.contains("task",true)) app.copy(cue="Continue: "+taskCue.take(150)) else app) }.take(5)
    }
    fun launch(context: Context, destination: IntentionalApp): Boolean {
        val launchIntent=context.packageManager.getLaunchIntentForPackage(destination.packageName) ?: return false
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        return runCatching{context.startActivity(launchIntent);true}.getOrDefault(false)
    }
}