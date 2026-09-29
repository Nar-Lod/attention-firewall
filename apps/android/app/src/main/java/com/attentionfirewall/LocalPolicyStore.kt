package com.attentionfirewall

import org.json.JSONArray
import org.json.JSONObject

class LocalPolicyStore(private val secureStore: SecureLocalStore) {
    private val key = "local_policy_rules"

    fun getRules(): List<LocalPolicyRule> {
        val raw = secureStore.get(key) ?: return emptyList()
        return runCatching {
            val array = JSONArray(raw)
            buildList {
                for (i in 0 until array.length()) {
                    val item = array.optJSONObject(i) ?: continue
                    val packageName = item.optString("packageName", "")
                    val intervention = runCatching {
                        LocalIntervention.valueOf(item.optString("minimumIntervention", "NONE"))
                    }.getOrNull() ?: continue
                    if (!isPackageName(packageName)) continue
                    val start = item.optInt("startMinute", -1).takeIf { it in 0..1439 }
                    val end = item.optInt("endMinute", -1).takeIf { it in 0..1439 }
                    add(LocalPolicyRule(
                        packageName = packageName,
                        minimumIntervention = intervention,
                        enabled = item.optBoolean("enabled", true),
                        startMinute = start,
                        endMinute = end
                    ))
                }
            }.take(100)
        }.getOrDefault(emptyList())
    }

    fun setRules(rules: List<LocalPolicyRule>) {
        val array = JSONArray()
        rules.take(100).forEach { rule ->
            if (!isPackageName(rule.packageName)) return@forEach
            array.put(JSONObject().apply {
                put("packageName", rule.packageName)
                put("minimumIntervention", rule.minimumIntervention.name)
                put("enabled", rule.enabled)
                rule.startMinute?.let { put("startMinute", it.coerceIn(0, 1439)) }
                rule.endMinute?.let { put("endMinute", it.coerceIn(0, 1439)) }
            })
        }
        secureStore.put(key, array.toString())
    }

    private fun isPackageName(value: String): Boolean =
        value.length in 3..255 &&
            value.matches(Regex("^[a-zA-Z0-9_]+(?:\\.[a-zA-Z0-9_]+)+$"))
}
