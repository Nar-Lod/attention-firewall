package com.attentionfirewall

import android.app.Activity
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.CheckBox
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AlertDialog

class MainActivity : Activity() {
    private lateinit var status: TextView
    private lateinit var appList: LinearLayout
    private val usage by lazy { UsageSignalAdapter(this) }
    private val secureStore by lazy { SecureLocalStore(this) }
    private val protectedStore by lazy { ProtectedAppStore(this) }
    private val checks = linkedMapOf<String, CheckBox>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        status = findViewById(R.id.status)
        appList = findViewById(R.id.appList)

        findViewById<Button>(R.id.grantUsage).setOnClickListener {
            startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
        }

        findViewById<Button>(R.id.hardProtection).setOnClickListener {
            showHardProtectionDisclosure()
        }

        findViewById<Button>(R.id.saveProtected).setOnClickListener {
            val selected = checks.filterValues { it.isChecked }.keys.toSet()
            protectedStore.setPackages(selected)
            status.text = currentStatus()
        }

        val hardLock = findViewById<CheckBox>(R.id.hardLock)
        hardLock.isChecked = secureStore.get("hard_lock") == "1"
        hardLock.setOnCheckedChangeListener { _, checked ->
            secureStore.put("hard_lock", if (checked) "1" else "0")
        }

        findViewById<Button>(R.id.sample).setOnClickListener {
            runLocalSample()
        }

        populateApps()
        status.text = currentStatus()
    }

    private fun showHardProtectionDisclosure() {
        AlertDialog.Builder(this)
            .setTitle("Enable Hard Protection")
            .setMessage(
                "Hard Protection uses Android AccessibilityService only to detect which app is currently in the foreground and place a local protection overlay. " +
                    "Attention Firewall does not read screen contents, messages, passwords, or page text. The service is optional, stays on-device, and can be disabled in Android Settings."
            )
            .setNegativeButton("Cancel", null)
            .setPositiveButton("I understand & enable") { _, _ ->
                startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
            }
            .show()
    }

    override fun onResume() {
        super.onResume()
        status.text = currentStatus()
    }

    private fun currentStatus(): String {
        val usageStatus = if (usage.hasUsageAccess()) "Usage access: ON" else "Usage access: OFF"
        val accessibility = "Hard Protection is user-enabled in Android Settings."
        val protected = protectedStore.getPackages().size
        return usageStatus + "\nProtected app targets: " + protected + "\n" + accessibility
    }

    private fun populateApps() {
        appList.removeAllViews()
        checks.clear()

        val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        val apps = packageManager.queryIntentActivities(launcherIntent, 0)
            .map { it.activityInfo.applicationInfo }
            .distinctBy(ApplicationInfo::packageName)
            .filterNot { it.packageName == packageName }
            .sortedBy { label(it).lowercase() }

        val selected = protectedStore.getPackages()

        for (app in apps.take(100)) {
            val checkBox = CheckBox(this).apply {
                text = label(app) + " · " + app.packageName
                isChecked = app.packageName in selected
                setTextColor(android.graphics.Color.WHITE)
            }
            checks[app.packageName] = checkBox
            appList.addView(checkBox)
        }
    }

    private fun label(info: ApplicationInfo): String =
        packageManager.getApplicationLabel(info).toString().ifBlank { info.packageName }

    private fun runLocalSample() {
        if (!usage.hasUsageAccess()) {
            status.text = "Enable usage access first."
            return
        }
        val summary = usage.sampleLastMinutes(30)
        secureStore.put("last_local_summary", summary.toJson())
        status.text = "Local sample: " + summary.foregroundTransitions +
            " transitions, " + summary.activeSeconds + "s active time. Nothing uploaded."
    }
}
