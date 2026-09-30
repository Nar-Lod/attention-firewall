package com.attentionfirewall

import android.content.Context
import android.content.Intent
import android.content.pm.ResolveInfo
import org.json.JSONArray
import org.json.JSONObject

data class IntentionalApp(val packageName: String, val label: String, val cue: String)

class IntentionalAppStore(private val secureStore: SecureLocalStore) {
    private companion object { const val KEY = "intentional_apps_v1"; const val MAX_APPS = 30; const val MAX_CUE = 180 }
    fun get(): List<IntentionalApp> = runCatching {
        val array = JSONArray(secureStore.get(KEY) ?: "[]")
        buildList {
            for (i in 0 until array.length()) {
                val o = array.optJSONObject(i) ?: continue
                val pkg = o.optString("packageName"); val label = o.optString("label"); val cue = o.optString("cue")
                if (pkg.isNotBlank() && pkg.length <= 253 && label.isNotBlank() && cue.isNotBlank()) add(IntentionalApp(pkg, label.take(120), cue.take(MAX_CUE)))
            }
        }
    }.getOrDefault(emptyList())
    fun set(apps: List<IntentionalApp>) {
        val clean = apps.filter { it.packageName.isNotBlank() && it.label.isNotBlank() && it.cue.isNotBlank() }.distinctBy { it.packageName }.take(MAX_APPS).map { it.copy(label = it.label.take(120), cue = it.cue.take(MAX_CUE)) }
        val array = JSONArray(); clean.forEach { a -> array.put(JSONObject().put("packageName", a.packageName).put("label", a.label).put("cue", a.cue)) }
        secureStore.put(KEY, array.toString())
    }
    fun discover(context: Context): List<IntentionalApp> {
        val launcher = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        return context.packageManager.queryIntentActivities(launcher, 0).map { it.activityInfo }
            .map { info -> IntentionalApp(info.packageName, info.loadLabel(context.packageManager).toString().ifBlank { info.packageName }, "") }
            .filterNot { it.packageName == context.packageName }.distinctBy { it.packageName }.sortedBy { it.label.lowercase() }.take(150)
    }
}