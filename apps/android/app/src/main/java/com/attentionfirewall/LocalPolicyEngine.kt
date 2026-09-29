package com.attentionfirewall

enum class LocalIntervention { NONE, AWARENESS, DELIBERATION, PAUSE, DELAY, COMMITMENT, LOCK }

data class LocalPolicyRule(
    val packageName: String,
    val minimumIntervention: LocalIntervention,
    val enabled: Boolean = true,
    val startMinute: Int? = null,
    val endMinute: Int? = null
)

object LocalPolicyEngine {
    private val order = LocalIntervention.values().toList()

    fun applies(rule: LocalPolicyRule, packageName: String, minuteOfDay: Int): Boolean {
        if (!rule.enabled || rule.packageName != packageName) return false
        val start = rule.startMinute
        val end = rule.endMinute
        if (start != null && end != null) {
            val normalizedStart = start.coerceIn(0, 1439)
            val normalizedEnd = end.coerceIn(0, 1439)
            val inWindow = if (normalizedStart <= normalizedEnd) {
                minuteOfDay in normalizedStart..normalizedEnd
            } else {
                minuteOfDay >= normalizedStart || minuteOfDay <= normalizedEnd
            }
            if (!inWindow) return false
        }
        return true
    }

    fun enforce(
        proposed: LocalIntervention,
        packageName: String,
        minuteOfDay: Int,
        rules: List<LocalPolicyRule>
    ): LocalIntervention {
        var selected = proposed
        rules.forEach { rule ->
            if (!applies(rule, packageName, minuteOfDay)) return@forEach
            if (order.indexOf(rule.minimumIntervention) > order.indexOf(selected)) {
                selected = rule.minimumIntervention
            }
        }
        return selected
    }
}
