package com.attentionfirewall

enum class CooldownPhase { INACTIVE, LOCKED, EXPIRED }

data class CooldownState(
    val packageName: String,
    val lockedAtEpochMs: Long,
    val unlockAtEpochMs: Long,
    val reason: String
) { fun remainingMs(nowEpochMs: Long): Long = (unlockAtEpochMs - nowEpochMs).coerceAtLeast(0L) }

object CooldownEngine {
    const val MIN_MINUTES = 3L
    fun sanitizeMinutes(value: Long): Long {
        require(value >= MIN_MINUTES) { "cooldown must be at least 3 minutes" }
        require(value <= Long.MAX_VALUE / 60_000L) { "cooldown is too large" }
        return value
    }
    fun unlockAt(lockedAtEpochMs: Long, minutes: Long): Long {
        sanitizeMinutes(minutes); require(lockedAtEpochMs >= 0L)
        return Math.addExact(lockedAtEpochMs, Math.multiplyExact(minutes, 60_000L))
    }
    fun phase(state: CooldownState?, nowEpochMs: Long): CooldownPhase {
        if (state == null) return CooldownPhase.INACTIVE
        return if (nowEpochMs < state.unlockAtEpochMs) CooldownPhase.LOCKED else CooldownPhase.EXPIRED
    }
    fun remainingLabel(state: CooldownState?, nowEpochMs: Long): String {
        val remaining = state?.remainingMs(nowEpochMs) ?: return "0:00"
        val totalSeconds = (remaining + 999L) / 1000L
        return "%d:%02d".format(totalSeconds / 60L, totalSeconds % 60L)
    }
}