package com.attentionfirewall

import org.junit.Assert.assertEquals
import org.junit.Test

class LocalPolicyEngineTest {
    @Test
    fun scheduledRuleEscalatesProtectedPackage() {
        val rules = listOf(
            LocalPolicyRule("com.example.social", LocalIntervention.DELAY, startMinute = 120, endMinute = 180)
        )
        assertEquals(
            LocalIntervention.DELAY,
            LocalPolicyEngine.enforce(LocalIntervention.AWARENESS, "com.example.social", 150, rules)
        )
    }

    @Test
    fun overnightWindowIsHandledLocally() {
        val rules = listOf(
            LocalPolicyRule("com.example.video", LocalIntervention.LOCK, startMinute = 1320, endMinute = 120)
        )
        assertEquals(
            LocalIntervention.LOCK,
            LocalPolicyEngine.enforce(LocalIntervention.NONE, "com.example.video", 60, rules)
        )
    }

    @Test
    fun unrelatedPackageIsNeverEscalated() {
        val rules = listOf(
            LocalPolicyRule("com.example.social", LocalIntervention.LOCK)
        )
        assertEquals(
            LocalIntervention.NONE,
            LocalPolicyEngine.enforce(LocalIntervention.NONE, "com.example.work", 600, rules)
        )
    }
}
