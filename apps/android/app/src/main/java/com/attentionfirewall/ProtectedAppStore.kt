package com.attentionfirewall

import android.content.Context
import org.json.JSONArray

class ProtectedAppStore(context: Context) {
    private val store = SecureLocalStore(context)
    private val key = "protected_packages"

    fun getPackages(): Set<String> {
        val raw = store.get(key) ?: return emptySet()
        return runCatching {
            val array = JSONArray(raw)
            buildSet {
                for (i in 0 until array.length()) {
                    val value = array.optString(i, "")
                    if (value.length in 1..255) add(value)
                }
            }
        }.getOrDefault(emptySet())
    }

    fun setPackages(packages: Set<String>) {
        val array = JSONArray()
        packages.take(100).sorted().forEach(array::put)
        store.put(key, array.toString())
    }
}
