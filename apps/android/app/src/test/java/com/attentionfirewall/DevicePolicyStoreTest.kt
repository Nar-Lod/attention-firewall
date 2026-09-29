package com.attentionfirewall

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DevicePolicyStoreTest {
    @Test
    fun deviceProtectionCannotBeEnabledWithoutRecovery() {
        val store = InMemorySecureLocalStore()
        val policies = DevicePolicyStore(store)
        policies.set(DevicePolicy(recoveryEnabled = false))
        org.junit.Assert.assertThrows(IllegalArgumentException::class.java) {
            policies.enableDeviceProtection()
        }
    }

    @Test
    fun launcherPreparationKeepsRecoveryEnabled() {
        val store = InMemorySecureLocalStore()
        val policies = DevicePolicyStore(store)
        val prepared = policies.prepareLauncher()
        assertTrue(prepared.launcherPrepared)
        assertTrue(prepared.recoveryEnabled)
        assertFalse(prepared.deviceProtectionEnabled)
    }

    private class InMemorySecureLocalStore : SecureLocalStore(
        android.test.mock.MockContext()
    )
}
