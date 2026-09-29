package com.attentionfirewall

import android.accessibilityservice.AccessibilityService
import android.graphics.Color
import android.graphics.PixelFormat
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.widget.Button
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
    private var recoveryTimer: CountDownTimer? = null
    private val usageSignals by lazy { UsageSignalAdapter(this) }

    private val protectedApps by lazy { ProtectedAppStore(this) }
    private val secureStore by lazy { SecureLocalStore(this) }
    private val policyStore by lazy { LocalPolicyStore(secureStore) }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return

        val packageName = event.packageName?.toString() ?: return
        if (packageName == this.packageName) return

        val now = System.currentTimeMillis()
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
                    elapsedSeconds = summary.activeSeconds.coerceIn(0L, 60L).toInt(),
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

        val assessment = LocalAttentionEngine.assess(
            AttentionFeatures(
                sessionSeconds = sessionSeconds,
                passiveSeconds = 0.0,
                interactionRate = 0.2,
                recentReopens = recentReopens,
                contextSwitches = contextSwitches,
                declaredIntentMatch = 1.0,
                outsideIntent = false,
                lateNightRisk = lateNightRisk
            )
        )

        val proposed = LocalAttentionEngine.intervention(assessment, hardLock)
        val minuteOfDay = hour * 60 + java.util.Calendar.getInstance().get(java.util.Calendar.MINUTE)
        val proposedLocal = LocalIntervention.valueOf(proposed.name)
        val intervention = LocalPolicyEngine.enforce(proposedLocal, packageName, minuteOfDay, policyStore.getRules())
        if (intervention != LocalIntervention.NONE) {
            showIntervention(intervention)
        }
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
        val button = (root as? ViewGroup)?.let { group -> (0 until group.childCount).map { group.getChildAt(it) }.filterIsInstance<Button>().firstOrNull() }
        button?.isEnabled = false
        button?.text = "Recovering… 2:00"
        recoveryTimer = object : CountDownTimer(120_000L, 1_000L) {
            override fun onTick(millisUntilFinished: Long) {
                val seconds = millisUntilFinished / 1000L
                button?.text = "Recovering… %d:%02d".format(seconds / 60, seconds % 60)
            }

            override fun onFinish() {
                recordRuntimeEvent(LocalRuntimeEvent.RecoveryCompleted("android", 120))
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
        recoveryTimer?.cancel()
        removeIntervention()
        super.onDestroy()
    }
}
