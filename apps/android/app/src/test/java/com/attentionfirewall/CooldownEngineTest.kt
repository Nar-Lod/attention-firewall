package com.attentionfirewall
import org.junit.Assert.assertEquals
import org.junit.Test
class CooldownEngineTest {
 @Test fun minimumIsThreeMinutes(){assertEquals(3L,CooldownEngine.sanitizeMinutes(3L))}
 @Test(expected=IllegalArgumentException::class) fun shorterThanThreeMinutesRejected(){CooldownEngine.sanitizeMinutes(2L)}
 @Test fun expiryUsesPersistedUnlockTime(){val s=CooldownState("social.app",1000L,181000L,"daily-target");assertEquals(CooldownPhase.LOCKED,CooldownEngine.phase(s,180999L));assertEquals(CooldownPhase.EXPIRED,CooldownEngine.phase(s,181000L))}
 @Test fun remainingNeverNegative(){val s=CooldownState("social.app",1000L,181000L,"daily-target");assertEquals("0:00",CooldownEngine.remainingLabel(s,200000L))}
}