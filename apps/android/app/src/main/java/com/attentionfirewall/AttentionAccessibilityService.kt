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
import android.widget.TextView

class AttentionAccessibilityService : AccessibilityService() {
    private var overlay: View? = null
    private var currentPackage: String? = null
    private var protectedSessionStartedAt: Long = 0L
    private var recentReopens = 0
    private var contextSwitches = 0
    private var lastProtectedPackage: String? = null

    private val protectedApps by lazy { ProtectedAppStore(this) }
    private val secureStore by lazy { SecureLocalStore(this) }

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

        val intervention = LocalAttentionEngine.intervention(assessment, hardLock)
        if (intervention != Intervention.NONE) {
            showIntervention(intervention)
        }
    }

    private fun showIntervention(intervention: Intervention) {
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
                Intervention.LOCK -> "This app is locked by your local protection rule."
                Intervention.DELAY -> "Take a deliberate pause before continuing."
                Intervention.COMMITMENT -> "You set a stronger protection rule for this moment."
                else -> "Your current session may be drifting from your intention."
            }
            textSize = 15f
            setTextColor(Color.LTGRAY)
            setPadding(0, 18, 0, 18)
        }

        val leave = Button(this).apply {
            text = "Leave app"
            setOnClickListener { performGlobalAction(GLOBAL_ACTION_HOME) }
        }

        root.addView(title)
        root.addView(body)
        root.addView(leave)

        if (intervention != Intervention.LOCK) {
            root.addView(Button(this).apply {
                text = "Continue intentionally"
                setOnClickListener { removeIntervention() }
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

    private fun removeIntervention() {
        val current = overlay ?: return
        val manager = getSystemService(WINDOW_SERVICE) as WindowManager
        runCatching { manager.removeView(current) }
        overlay = null
    }

    override fun onDestroy() {
        removeIntervention()
        super.onDestroy()
    }
}
