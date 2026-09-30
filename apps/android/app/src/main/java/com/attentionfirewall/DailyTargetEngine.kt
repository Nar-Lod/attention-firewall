package com.attentionfirewall
enum class DailyTargetDecision { MORNING_SETUP, REQUIRE_TARGET, CELEBRATE_AND_GOAL, ALLOW }
object DailyTargetEngine {
    fun decide(morningPromptPending: Boolean, incompleteTargets: Int, allTargetsCompleted: Boolean, extraGoalPrompted: Boolean, driftDetected: Boolean): DailyTargetDecision {
        if (morningPromptPending) return DailyTargetDecision.MORNING_SETUP
        if (!driftDetected) return DailyTargetDecision.ALLOW
        if (incompleteTargets > 0) return DailyTargetDecision.REQUIRE_TARGET
        if (allTargetsCompleted && !extraGoalPrompted) return DailyTargetDecision.CELEBRATE_AND_GOAL
        return DailyTargetDecision.ALLOW
    }
}