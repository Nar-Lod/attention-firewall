package com.attentionfirewall

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class LocalAttentionEngineTest {
    @Test
    fun shortIntentionalSessionStaysFocused() {
        val result = LocalAttentionEngine.assess(
            AttentionFeatures(120.0, 30.0, 0.5, 0, 0, 1.0, false, 0.0)
        )
        assertEquals(AttentionState.FOCUSED, result.state)
    }

    @Test
    fun sustainedPassiveSessionBecomesHighRisk() {
        val result = LocalAttentionEngine.assess(
            AttentionFeatures(1800.0, 1500.0, 0.01, 4, 5, 0.1, true, 1.0)
        )
        assertTrue(result.score > 0.65)
        assertEquals(AttentionState.COMPULSIVE_RISK, result.state)
    }

    @Test
    fun hardLockEscalatesAnyNonFocusedState() {
        val assessment = AttentionAssessment(0.5, AttentionState.DRIFTING)
        assertEquals(Intervention.LOCK, LocalAttentionEngine.intervention(assessment, true))
    }
}
