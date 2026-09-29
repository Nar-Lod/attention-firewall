package com.attentionfirewall

enum class AttentionState { FOCUSED, INTENTIONAL, NEUTRAL, DRIFTING, COMPULSIVE_RISK }

enum class Intervention { NONE, AWARENESS, DELIBERATION, PAUSE, DELAY, COMMITMENT, LOCK }

data class AttentionFeatures(
    val sessionSeconds: Double,
    val passiveSeconds: Double,
    val interactionRate: Double,
    val recentReopens: Int,
    val contextSwitches: Int,
    val declaredIntentMatch: Double,
    val outsideIntent: Boolean,
    val lateNightRisk: Double
)

data class AttentionAssessment(
    val score: Double,
    val state: AttentionState
)

object LocalAttentionEngine {
    fun assess(features: AttentionFeatures): AttentionAssessment {
        fun clamp(value: Double) = value.coerceIn(0.0, 1.0)
        var score = 0.0

        val sessionMinutes = features.sessionSeconds / 60.0
        if (sessionMinutes >= 10.0) {
            score += clamp((sessionMinutes - 10.0) / 30.0) * 0.18
        }
        if (features.passiveSeconds >= 300.0) {
            score += clamp((features.passiveSeconds - 300.0) / 1200.0) * 0.22
        }
        if (features.interactionRate < 0.08) {
            score += clamp((0.08 - features.interactionRate) / 0.08) * 0.16
        }
        if (features.recentReopens >= 2) {
            score += clamp(features.recentReopens / 6.0) * 0.12
        }
        if (features.contextSwitches >= 3) {
            score += clamp(features.contextSwitches / 8.0) * 0.10
        }
        if (features.outsideIntent) {
            score += (1.0 - clamp(features.declaredIntentMatch)) * 0.14
        }
        score += clamp(features.lateNightRisk) * 0.08

        score = clamp(score)
        val state = when {
            score < 0.15 -> AttentionState.FOCUSED
            score < 0.30 -> AttentionState.INTENTIONAL
            score < 0.45 -> AttentionState.NEUTRAL
            score < 0.65 -> AttentionState.DRIFTING
            else -> AttentionState.COMPULSIVE_RISK
        }
        return AttentionAssessment(score, state)
    }

    fun intervention(assessment: AttentionAssessment, hardLock: Boolean): Intervention {
        if (hardLock && assessment.state != AttentionState.FOCUSED) {
            return Intervention.LOCK
        }
        return when {
            assessment.state == AttentionState.FOCUSED ||
                assessment.state == AttentionState.INTENTIONAL -> Intervention.NONE
            assessment.state == AttentionState.NEUTRAL -> Intervention.AWARENESS
            assessment.state == AttentionState.DRIFTING -> Intervention.DELIBERATION
            assessment.score >= 0.93 -> Intervention.COMMITMENT
            assessment.score >= 0.82 -> Intervention.DELAY
            else -> Intervention.PAUSE
        }
    }
}
