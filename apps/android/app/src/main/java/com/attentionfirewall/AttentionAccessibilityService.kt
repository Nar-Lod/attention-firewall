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
    private val protectedApps by lazy { ProtectedAppStore(this) }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        val packageName = event?.packageName?.toString() ?: return
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        if (packageName == this.packageName) return

        if (protectedApps.getPackages().contains(packageName)) {
            val hardLock = SecureLocalStore(this).get("hard_lock") == "1"
            showIntervention(hardLock)
        } else {
            removeIntervention()
        }
    }

    override fun onInterrupt() {
        removeIntervention()
    }

    private fun showIntervention(hardLock: Boolean) {
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
            text = "This app is protected on your device. Take a deliberate pause before continuing."
            textSize = 15f
            setTextColor(Color.LTGRAY)
            setPadding(0, 18, 0, 18)
        }

        val leave = Button(this).apply {
            text = "Leave app"
            setOnClickListener { performGlobalAction(GLOBAL_ACTION_HOME) }
        }

        val continueButton = Button(this).apply {
            text = "Continue intentionally"
            setOnClickListener { removeIntervention() }
        }

        root.addView(title)
        root.addView(body)
        root.addView(leave)
        if (!hardLock) root.addView(continueButton)

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
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
