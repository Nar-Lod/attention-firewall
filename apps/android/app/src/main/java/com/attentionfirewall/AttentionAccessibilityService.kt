package com.attentionfirewall

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.view.ViewGroup
import android.widget.TextView
import android.os.CountDownTimer
import org.json.JSONArray
import org.json.JSONObject

class AttentionAccessibilityService : AccessibilityService() {
    private var overlay: View? = null
    private var currentPackage: String? = null
    private var protectedSessionStartedAt: Long = 0L
    private var recentReopens = 0
    private var contextSwitches = 0
    private var lastProtectedPackage: String? = null
    private var lastUsageSampleAt: Long = 0L
    private var scrollWindowStartedAt: Long = 0L
    private var scrollEventsInWindow = 0
    private var redirectTimer: CountDownTimer? = null
    private var recoveryTimer: CountDownTimer? = null
    private val usageSignals by lazy { UsageSignalAdapter(this) }

    private val protectedApps by lazy { ProtectedAppStore(this) }
    private val secureStore by lazy { SecureLocalStore(this) }
    private val policyStore by lazy { LocalPolicyStore(secureStore) }
    private val cooldownStore by lazy { CooldownStore(secureStore) }
    private val dailyTargets by lazy { DailyTargetStore(secureStore) }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        val packageName = event?.packageName?.toString() ?: return
        if (packageName == this.packageName) return
        if (event.eventType == AccessibilityEvent.TYPE_VIEW_SCROLLED) {
            if (protectedApps.getPackages().contains(packageName)) recordScroll(packageName, System.currentTimeMillis())
            return
        }
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        if (packageName == this.packageName) return

        val now = System.currentTimeMillis()
        val cooldown = cooldownStore.active(now)
        if (cooldown != null && packageName == cooldown.packageName) {
            showCooldownLock(cooldown, now)
            return
        }
        val protected = protectedApps.getPackages().contains(packageName)

        if (protected) {
            if (currentPackage == packageName) {
                maybeIntervene(packageName, now)
                return
            }

            if (lastProtectedPackage == packageName && now - protectedSessionStartedAt <= 15 * 60_000L) {
                recentReopens = (recentReopens + 1).coerceAtMost(20)
            }

            if (currentPackage != null && currentPackage != packageName) {
                contextSwitches = (contextSwitches + 1).coerceAtMost(100)
            }

            currentPackage = packageName
            lastProtectedPackage = packageName
            protectedSessionStartedAt = now
            recordRuntimeEvent(LocalRuntimeEvent.SessionStart("android", packageName))
            recordLocalUsageSample(packageName, now)
            maybeIntervene(packageName, now)
        } else {
            if (currentPackage != packageName && currentPackage != null) {
                contextSwitches = (contextSwitches + 1).coerceAtMost(100)
            }
            currentPackage = packageName
            if (overlay != null) removeIntervention()
        }
    }

    override fun onInterrupt() {
        removeIntervention()
    }

    private fun recordLocalUsageSample(packageName: String, now: Long) {
        if (!usageSignals.hasUsageAccess() || now - lastUsageSampleAt < 60_000L) return
        lastUsageSampleAt = now
        runCatching {
            val summary = usageSignals.sampleLastMinutes(1)
            recordRuntimeEvent(
                LocalRuntimeEvent.Sample(
                    platform = "android",
                    domain = packageName,
                    elapsedSeconds = summary.activeSeconds.toDouble().coerceIn(0.0, 60.0),
                    interactions = summary.foregroundTransitions.coerceIn(0, 60),
                    scrolls = 0
                )
            )
        }
    }

    private fun maybeIntervene(packageName: String, now: Long) {
        val sessionSeconds = ((now - protectedSessionStartedAt).coerceAtLeast(0L)) / 1000.0
        val hour = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)
        val lateNightRisk = if (hour >= 22 || hour < 6) 1.0 else 0.0
        val hardLock = secureStore.get("hard_lock") == "1"
        val passiveSeconds = if (scrollEventsInWindow >= 12) minOf(sessionSeconds, 180.0) else 0.0
        val interactionRate = if (scrollEventsInWindow >= 12) 0.02 else 0.2

        val assessment = LocalAttentionEngine.assess(
            AttentionFeatures(
                sessionSeconds = sessionSeconds,
                passiveSeconds = passiveSeconds,
                interactionRate = interactionRate,
                recentReopens = recentReopens,
                contextSwitches = contextSwitches,
                declaredIntentMatch = 1.0,
                outsideIntent = false,
                lateNightRisk = lateNightRisk
            )
        )

        val proposed = LocalAttentionEngine.intervention(assessment, hardLock)
        val driftDetected = assessment.state == AttentionState.DRIFTING || assessment.state == AttentionState.COMPULSIVE_RISK || scrollEventsInWindow >= 12
        when (DailyTargetEngine.decide(dailyTargets.morningPromptPending(), dailyTargets.incomplete().size, dailyTargets.allCompleted(), dailyTargets.extraGoalPrompted(), driftDetected)) {
            DailyTargetDecision.MORNING_SETUP -> { showMorningSetup(); return }
            DailyTargetDecision.REQUIRE_TARGET -> { showDailyTargetGate(packageName); return }
            DailyTargetDecision.CELEBRATE_AND_GOAL -> { dailyTargets.markExtraGoalPrompted(); showPostCompletionGoalPrompt(); return }
            DailyTargetDecision.ALLOW -> Unit
        }
        val minuteOfDay = hour * 60 + java.util.Calendar.getInstance().get(java.util.Calendar.MINUTE)
        val proposedLocal = LocalIntervention.valueOf(proposed.name)
        val intervention = LocalPolicyEngine.enforce(proposedLocal, packageName, minuteOfDay, policyStore.getRules())
        if (intervention != LocalIntervention.NONE) showIntervention(intervention)
    }

    private fun recordScroll(packageName: String, now: Long) {
        if (scrollWindowStartedAt == 0L || now - scrollWindowStartedAt > 60_000L) {
            scrollWindowStartedAt = now
            scrollEventsInWindow = 0
        }
        scrollEventsInWindow = (scrollEventsInWindow + 1).coerceAtMost(100)
        currentPackage = packageName
        maybeIntervene(packageName, now)
    }

    private fun showCooldownLock(state: CooldownState, now: Long) {
        if (overlay != null) return
        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(48,44,48,44); setBackgroundColor(Color.rgb(16,16,16)) }
        root.addView(TextView(this).apply { text = "Attention Firewall"; textSize = 24f; setTextColor(Color.WHITE) })
        root.addView(TextView(this).apply {
            text = "This app is paused. Your cooldown started when the lock was applied.\n\nResume in " + CooldownEngine.remainingLabel(state, now) + "."
            textSize = 16f; setTextColor(Color.LTGRAY); setPadding(0,18,0,18)
        })
        ProductiveRedirects.suggestions(this, "other", secureStore.get("next_task_cue")).forEach { suggestion ->
            root.addView(Button(this).apply { text = suggestion.destination.label + " · " + suggestion.destination.cue; setOnClickListener { ProductiveRedirects.launch(this@AttentionAccessibilityService, suggestion.destination) } })
        }
        val manager=getSystemService(WINDOW_SERVICE) as WindowManager
        manager.addView(root, WindowManager.LayoutParams(WindowManager.LayoutParams.MATCH_PARENT,WindowManager.LayoutParams.WRAP_CONTENT,WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,PixelFormat.TRANSLUCENT).apply { gravity=Gravity.CENTER })
        overlay=root
        root.postDelayed({ if (cooldownStore.active() == null) removeIntervention() }, 1000L)
    }

    private fun showMorningSetup() {
        if (overlay != null) return
        val root=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setPadding(48,44,48,44);setBackgroundColor(Color.rgb(16,16,16))}
        root.addView(TextView(this).apply{text="Start the day intentionally";textSize=23f;setTextColor(Color.WHITE)})
        root.addView(TextView(this).apply{text="Set at least one target. It stays encrypted on this device and becomes your recovery path if attention drifts.";textSize=14f;setTextColor(Color.LTGRAY);setPadding(0,16,0,12)})
        val inputs=(1..5).map{EditText(this).apply{hint="Target $it";setTextColor(Color.WHITE);setTextColorHint(Color.GRAY)}}; inputs.forEach{root.addView(it)}
        root.addView(Button(this).apply{text="Set today's targets";setOnClickListener{runCatching{dailyTargets.setToday(inputs.map{it.text.toString()})}.onSuccess{removeIntervention()}}})
        attachOverlay(root)
    }

    private fun showDailyTargetGate(sourcePackage:String) {
        if (overlay != null) return
        val root=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setPadding(48,44,48,44);setBackgroundColor(Color.rgb(16,16,16))}
        root.addView(TextView(this).apply{text="Pause. Return to today's targets.";textSize=23f;setTextColor(Color.WHITE)})
        root.addView(TextView(this).apply{text="Before returning to the distracting app, handle one unfinished target. Completing it starts your chosen cooldown.";textSize=14f;setTextColor(Color.LTGRAY);setPadding(0,16,0,12)})
        dailyTargets.incomplete().forEach{target->root.addView(Button(this).apply{text="Handle: "+target.title;setOnClickListener{
            startActivity(Intent(this@AttentionAccessibilityService, MainActivity::class.java).apply{addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP);putExtra(MainActivity.EXTRA_DAILY_TASKS,true);putExtra(MainActivity.EXTRA_DAILY_TARGET_ID,target.id);putExtra(MainActivity.EXTRA_DAILY_SOURCE_PACKAGE,sourcePackage)});removeIntervention()
        }})}
        attachOverlay(root)
    }

    private fun showPostCompletionGoalPrompt() {
        if (overlay != null) return
        val root=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setPadding(48,44,48,44);setBackgroundColor(Color.rgb(16,16,16))}
        root.addView(TextView(this).apply{text="You finished today's targets early.";textSize=23f;setTextColor(Color.WHITE)})
        root.addView(TextView(this).apply{text="Nice work. Add another goal if you want the day to keep having a clear direction.";textSize=14f;setTextColor(Color.LTGRAY);setPadding(0,16,0,12)})
        val input=EditText(this).apply{hint="Optional additional goal";setTextColor(Color.WHITE)}
        root.addView(input)
        root.addView(Button(this).apply{text="Add goal";setOnClickListener{if(dailyTargets.appendGoal(input.text.toString()))removeIntervention()}})
        root.addView(Button(this).apply{text="Continue intentionally";setOnClickListener{removeIntervention()}})
        attachOverlay(root)
    }

    private fun attachOverlay(root: View) {
        val manager=getSystemService(WINDOW_SERVICE) as WindowManager
        manager.addView(root,WindowManager.LayoutParams(WindowManager.LayoutParams.MATCH_PARENT,WindowManager.LayoutParams.WRAP_CONTENT,WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,PixelFormat.TRANSLUCENT).apply{gravity=Gravity.CENTER})
        overlay=root
    }

    private fun showIntervention(intervention: LocalIntervention) {
        if (overlay != null) return

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 44, 48, 44)
            setBackgroundColor(Color.rgb(16, 16, 16))
        }

        val title = TextView(this).apply {
            text = "Attention Firewall"
            textSize = 24f
            setTextColor(Color.WHITE)
        }

        val body = TextView(this).apply {
            text = when (intervention) {
                LocalIntervention.LOCK -> "This app is locked by your local protection rule."
                LocalIntervention.DELAY -> "Take a deliberate pause before continuing."
                LocalIntervention.COMMITMENT -> "You set a stronger protection rule for this moment."
                else -> "Your current session may be drifting from your intention."
            }
            textSize = 15f
            setTextColor(Color.LTGRAY)
            setPadding(0, 18, 0, 18)
        }

        val leave = Button(this).apply {
            text = "Leave app"
            setOnClickListener {
                recordRuntimeEvent(LocalRuntimeEvent.InterventionResponse("android", intervention.name.lowercase(), LocalRuntimeEvent.Outcome.EXITED))
                performGlobalAction(GLOBAL_ACTION_HOME)
            }
        }

        root.addView(title)
        root.addView(body)
        root.addView(leave)

        val mode = DevicePolicyStore(secureStore).getProtectionMode()
        val suggestions = ProductiveRedirects.suggestions(this, "other", secureStore.get("next_task_cue"))
        if (intervention != LocalIntervention.LOCK && suggestions.isNotEmpty()) {
            root.addView(TextView(this).apply {
                text = if (scrollEventsInWindow >= 12) "Opening a productive app can break this loop." else "Try a productive app instead."
                textSize = 14f
                setTextColor(Color.rgb(215, 187, 98))
                setPadding(0, 20, 0, 8)
            })
            suggestions.forEach { suggestion ->
                root.addView(Button(this).apply {
                    text = suggestion.destination.label + " · " + suggestion.cue
                    setOnClickListener {
                        recordRuntimeEvent(LocalRuntimeEvent.InterventionResponse("android", intervention.name.lowercase(), LocalRuntimeEvent.Outcome.REDIRECTED))
                        if (ProductiveRedirects.launch(this@AttentionAccessibilityService, suggestion.destination)) removeIntervention()
                    }
                })
            }
            if (mode == ProtectionMode.DEEP_FOCUS && scrollEventsInWindow >= 20) {
                redirectTimer?.cancel()
                val cancel = Button(this)
                cancel.text = "Opening a productive app in 5s"
                cancel.setOnClickListener { redirectTimer?.cancel(); removeIntervention() }
                root.addView(cancel)
                redirectTimer = object : CountDownTimer(5_000L, 1_000L) {
                    override fun onTick(millisUntilFinished: Long) {
                        cancel.text = "Opening a productive app in " + ((millisUntilFinished / 1000L).coerceAtLeast(1)) + "s"
                    }
                    override fun onFinish() {
                        val first = suggestions.firstOrNull()
                        if (first != null && ProductiveRedirects.launch(this@AttentionAccessibilityService, first.destination)) {
                            recordRuntimeEvent(LocalRuntimeEvent.InterventionResponse("android", intervention.name.lowercase(), LocalRuntimeEvent.Outcome.REDIRECTED))
                            removeIntervention()
                        }
                    }
                }.start()
            }
        }

        if (intervention != LocalIntervention.LOCK) {
            root.addView(Button(this).apply {
                text = "Start 2-minute recovery"
                setOnClickListener { startRecovery(root) }
            })
            root.addView(Button(this).apply {
                text = "Continue intentionally"
                setOnClickListener {
                    recordRuntimeEvent(LocalRuntimeEvent.InterventionResponse("android", intervention.name.lowercase(), LocalRuntimeEvent.Outcome.CONTINUED))
                    removeIntervention()
                }
            })
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.CENTER
        }

        val manager = getSystemService(WINDOW_SERVICE) as WindowManager
        manager.addView(root, params)
        overlay = root
    }

    private fun startRecovery(root: View) {
        recoveryTimer?.cancel()
        val button = (root as? ViewGroup)?.let { group ->
            (0 until group.childCount)
                .map { group.getChildAt(it) }
                .filterIsInstance<Button>()
                .firstOrNull { it.text.toString().startsWith("Start 2-minute recovery") }
        }
        button?.isEnabled = false
        button?.text = "Recovering… 2:00"
        recoveryTimer = object : CountDownTimer(120_000L, 1_000L) {
            override fun onTick(millisUntilFinished: Long) {
                val seconds = millisUntilFinished / 1000L
                button?.text = "Recovering… %d:%02d".format(seconds / 60, seconds % 60)
            }

            override fun onFinish() {
                recordRuntimeEvent(LocalRuntimeEvent.RecoveryCompleted("android", 120.0))
                removeIntervention()
            }
        }.start()
    }

    private fun recordRuntimeEvent(event: LocalRuntimeEvent) {
        runCatching {
            LocalRuntimeEventValidator.validate(event)
            val current = secureStore.get("runtime_events")?.let(::JSONArray) ?: JSONArray()
            val entry = JSONObject().apply {
                put("protocolVersion", event.protocolVersion)
                put("platform", event.platform)
                put("recordedAt", System.currentTimeMillis())
                when (event) {
                    is LocalRuntimeEvent.SessionStart -> {
                        put("eventKind", "session-start")
                        put("domain", event.domain)
                    }
                    is LocalRuntimeEvent.Sample -> {
                        put("eventKind", "sample")
                        event.domain?.let { put("domain", it) }
                        put("elapsedSeconds", event.elapsedSeconds)
                        put("interactions", event.interactions)
                        put("scrolls", event.scrolls)
                    }
                    is LocalRuntimeEvent.InterventionResponse -> {
                        put("eventKind", "intervention-response")
                        put("intervention", event.intervention)
                        put("outcome", event.outcome.name.lowercase())
                    }
                    is LocalRuntimeEvent.RecoveryCompleted -> {
                        put("eventKind", "recovery-completed")
                        put("durationSeconds", event.durationSeconds)
                    }
                }
            }
            current.put(entry)
            while (current.length() > 100) current.remove(0)
            secureStore.put("runtime_events", current.toString())
        }
    }

    private fun removeIntervention() {
        val current = overlay ?: return
        val manager = getSystemService(WINDOW_SERVICE) as WindowManager
        runCatching { manager.removeView(current) }
        overlay = null
    }

    override fun onDestroy() {
        redirectTimer?.cancel()
        recoveryTimer?.cancel()
        removeIntervention()
        super.onDestroy()
    }
}
