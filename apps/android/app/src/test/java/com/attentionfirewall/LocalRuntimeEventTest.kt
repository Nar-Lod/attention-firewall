package com.attentionfirewall

import org.junit.Assert.assertTrue
import org.junit.Assert.assertThrows
import org.junit.Test

class LocalRuntimeEventTest {
    @Test
    fun validatesBoundedSample() {
        assertTrue(
            LocalRuntimeEventValidator.validate(
                LocalRuntimeEvent.Sample(
                    platform = "android",
                    domain = "com.example.social",
                    elapsedSeconds = 15.0,
                    interactions = 2,
                    scrolls = 20
                )
            )
        )
    }

    @Test
    fun rejectsUnboundedSample() {
        assertThrows(IllegalArgumentException::class.java) {
            LocalRuntimeEventValidator.validate(
                LocalRuntimeEvent.Sample(
                    platform = "android",
                    domain = "com.example.social",
                    elapsedSeconds = 301.0,
                    interactions = 0,
                    scrolls = 0
                )
            )
        }
    }

    @Test
    fun validatesInterventionAndRecovery() {
        assertTrue(
            LocalRuntimeEventValidator.validate(
                LocalRuntimeEvent.InterventionResponse(
                    platform = "android",
                    intervention = "pause",
                    outcome = LocalRuntimeEvent.Outcome.EXITED
                )
            )
        )
        assertTrue(
            LocalRuntimeEventValidator.validate(
                LocalRuntimeEvent.RecoveryCompleted(
                    platform = "android",
                    durationSeconds = 120.0
                )
            )
        )
    }
}
