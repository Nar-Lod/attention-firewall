package com.attentionfirewall

import org.json.JSONObject

class CooldownStore(private val secureStore: SecureLocalStore) {
    private companion object { const val STATE_KEY = "cooldown_state_v1"; const val DURATION_KEY = "cooldown_duration_minutes" }
    fun isConfigured(): Boolean = getDurationMinutes() != null
    fun getDurationMinutes(): Long? = secureStore.get(DURATION_KEY)?.toLongOrNull()?.let { runCatching { CooldownEngine.sanitizeMinutes(it) }.getOrNull() }
    fun setDurationMinutes(minutes: Long) { secureStore.put(DURATION_KEY, CooldownEngine.sanitizeMinutes(minutes).toString()) }
    fun get(packageName: String? = null): CooldownState? {
        val raw = secureStore.get(STATE_KEY) ?: return null
        if (raw.isBlank()) return null
        return runCatching {
            val json = JSONObject(raw)
            val state = CooldownState(json.getString("packageName"), json.getLong("lockedAt"), json.getLong("unlockAt"), json.optString("reason", "daily-target"))
            if (packageName != null && state.packageName != packageName) null else state
        }.getOrNull()
    }
    fun start(packageName: String, nowEpochMs: Long, reason: String = "daily-target"): CooldownState {
        require(packageName.isNotBlank() && packageName.length <= 253)
        val minutes = getDurationMinutes() ?: error("cooldown duration is not configured")
        val state = CooldownState(packageName, nowEpochMs, CooldownEngine.unlockAt(nowEpochMs, minutes), reason)
        secureStore.put(STATE_KEY, JSONObject().put("packageName", state.packageName).put("lockedAt", state.lockedAtEpochMs).put("unlockAt", state.unlockAtEpochMs).put("reason", state.reason.take(64)).toString())
        return state
    }
    fun clear() { secureStore.put(STATE_KEY, "") }
    fun active(nowEpochMs: Long = System.currentTimeMillis()): CooldownState? {
        val state = get() ?: return null
        return if (CooldownEngine.phase(state, nowEpochMs) == CooldownPhase.LOCKED) state else { clear(); null }
    }
}