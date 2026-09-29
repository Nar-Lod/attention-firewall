package com.attentionfirewall

sealed interface LocalRuntimeEvent {
    val protocolVersion: Int
    val platform: String

    data class SessionStart(
        override val platform: String,
        val domain: String
    ) : LocalRuntimeEvent {
        override val protocolVersion: Int = 1
    }

    data class Sample(
        override val platform: String,
        val domain: String?,
        val elapsedSeconds: Double,
        val interactions: Int,
        val scrolls: Int,
        val scrollBursts: Int? = null,
        val scrollDirectionChanges: Int? = null,
        val scrollDistancePerMinute: Double? = null,
        val contextSwitches: Int? = null,
        val lateNightRisk: Double? = null
    ) : LocalRuntimeEvent {
        override val protocolVersion: Int = 1
    }

    data class InterventionResponse(
        override val platform: String,
        val intervention: String,
        val outcome: Outcome
    ) : LocalRuntimeEvent {
        override val protocolVersion: Int = 1
    }

    data class RecoveryCompleted(
        override val platform: String,
        val durationSeconds: Double
    ) : LocalRuntimeEvent {
        override val protocolVersion: Int = 1
    }

    enum class Outcome { CONTINUED, EXITED }
}

object LocalRuntimeEventValidator {
    private val platforms = setOf("android", "ios", "web", "desktop")
    private val interventions = setOf(
        "none", "awareness", "deliberation", "pause", "delay", "commitment", "lock"
    )

    fun validate(event: LocalRuntimeEvent): Boolean {
        require(event.protocolVersion == 1) { "unsupported protocol version" }
        require(platforms.contains(event.platform)) { "invalid platform" }

        when (event) {
            is LocalRuntimeEvent.SessionStart ->
                require(event.domain.isNotBlank() && event.domain.length <= 253) { "invalid domain" }

            is LocalRuntimeEvent.Sample -> {
                event.domain?.let { require(it.length <= 253) { "invalid domain" } }
                require(event.elapsedSeconds.isFinite() && event.elapsedSeconds in 0.0..300.0) { "invalid elapsedSeconds" }
                require(event.interactions in 0..500) { "invalid interactions" }
                require(event.scrolls in 0..500) { "invalid scrolls" }
                event.scrollBursts?.let { require(it in 0..50) { "invalid scrollBursts" } }
                event.scrollDirectionChanges?.let { require(it in 0..50) { "invalid scrollDirectionChanges" } }
                event.scrollDistancePerMinute?.let {
                    require(it.isFinite() && it in 0.0..50000.0) { "invalid scrollDistancePerMinute" }
                }
                event.contextSwitches?.let { require(it in 0..50) { "invalid contextSwitches" } }
                event.lateNightRisk?.let {
                    require(it.isFinite() && it in 0.0..1.0) { "invalid lateNightRisk" }
                }
            }

            is LocalRuntimeEvent.InterventionResponse -> {
                require(interventions.contains(event.intervention)) { "invalid intervention" }
            }

            is LocalRuntimeEvent.RecoveryCompleted ->
                require(event.durationSeconds.isFinite() && event.durationSeconds in 120.0..600.0) {
                    "invalid durationSeconds"
                }
        }

        return true
    }
}
