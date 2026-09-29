package com.attentionfirewall

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DevicePolicyGuardTest {
    @Test
    fun recoveryIsRequiredForDeviceProtection() {
        assertTrue(DevicePolicyGuard.canEnable(DevicePolicy(recoveryEnabled = true)))
        assertFalse(DevicePolicyGuard.canEnable(DevicePolicy(recoveryEnabled = false)))
    }

    @Test
    fun launcherPreparationStartsSafe() {
        val policy = DevicePolicy(launcherPrepared = true, deviceProtectionEnabled = false, recoveryEnabled = true)
        assertTrue(policy.launcherPrepared)
        assertFalse(policy.deviceProtectionEnabled)
        assertTrue(policy.recoveryEnabled)
    }
}
