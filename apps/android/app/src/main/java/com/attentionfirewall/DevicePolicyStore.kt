package com.attentionfirewall

enum class ProtectionMode { STANDARD, FOCUS, DEEP_FOCUS, RECOVERY }

data class DevicePolicy(
    val version: Int = 1,
    val launcherPrepared: Boolean = false,
    val deviceProtectionEnabled: Boolean = false,
    val recoveryEnabled: Boolean = true,
    val protectedPackages: Set<String> = emptySet(),
    val protectionMode: ProtectionMode = ProtectionMode.STANDARD
)

object DevicePolicyGuard {
    fun canEnable(policy: DevicePolicy): Boolean = policy.recoveryEnabled
}

class DevicePolicyStore(private val secureStore: SecureLocalStore) {
    private val key = "device_policy"

    fun get(): DevicePolicy {
        val raw = secureStore.get(key) ?: return DevicePolicy()
        return runCatching {
            val objectValue = org.json.JSONObject(raw)
            val packages = objectValue.optJSONArray("protectedPackages")
            val selected = buildSet {
                if (packages != null) {
                    for (i in 0 until packages.length()) {
                        val value = packages.optString(i, "")
                        if (value.length in 1..255) add(value)
                    }
                }
            }
            DevicePolicy(
                version = if (objectValue.optInt("version", 1) == 1) 1 else 1,
                launcherPrepared = objectValue.optBoolean("launcherPrepared", false),
                deviceProtectionEnabled = objectValue.optBoolean("deviceProtectionEnabled", false),
                recoveryEnabled = objectValue.optBoolean("recoveryEnabled", true),
                protectedPackages = selected.take(100).toSet(),
                protectionMode = runCatching { ProtectionMode.valueOf(objectValue.optString("protectionMode", ProtectionMode.STANDARD.name)) }.getOrDefault(ProtectionMode.STANDARD)
            )
        }.getOrDefault(DevicePolicy())
    }

    fun set(policy: DevicePolicy) {
        require(policy.protectedPackages.size <= 100)
        val packages = org.json.JSONArray()
        policy.protectedPackages.take(100).sorted().forEach(packages::put)
        val objectValue = org.json.JSONObject()
            .put("version", 1)
            .put("launcherPrepared", policy.launcherPrepared)
            .put("deviceProtectionEnabled", policy.deviceProtectionEnabled)
            .put("recoveryEnabled", policy.recoveryEnabled)
            .put("protectedPackages", packages)
            .put("protectionMode", policy.protectionMode.name)
        secureStore.put(key, objectValue.toString())
    }

    fun prepareLauncher(): DevicePolicy {
        val next = get().copy(launcherPrepared = true, recoveryEnabled = true)
        set(next)
        return next
    }

    fun enableDeviceProtection(): DevicePolicy {
        val current = get()
        require(DevicePolicyGuard.canEnable(current)) { "recovery must remain enabled" }
        val next = current.copy(deviceProtectionEnabled = true)
        set(next)
        return next
    }

    fun disableDeviceProtection(): DevicePolicy {
        val next = get().copy(deviceProtectionEnabled = false)
        set(next)
        return next
    }
}
