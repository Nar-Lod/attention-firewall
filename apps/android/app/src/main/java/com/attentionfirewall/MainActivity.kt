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
import android.widget.RadioGroup
import android.widget.EditText
import android.widget.TextView
import android.app.AlertDialog

class MainActivity : Activity() {
    private lateinit var status: TextView
    private lateinit var appList: LinearLayout
    private val usage by lazy { UsageSignalAdapter(this) }
    private val secureStore by lazy { SecureLocalStore(this) }
    private val protectedStore by lazy { ProtectedAppStore(this) }
    private val devicePolicy by lazy { DevicePolicyStore(secureStore) }
    private val cooldownStore by lazy { CooldownStore(secureStore) }
    private val dailyTargets by lazy { DailyTargetStore(secureStore) }
    private val checks = linkedMapOf<String, CheckBox>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        status = findViewById(R.id.status)
        appList = findViewById(R.id.appList)

        findViewById<Button>(R.id.grantUsage).setOnClickListener {
            startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
        }

        findViewById<Button>(R.id.prepareLauncher).setOnClickListener {
            devicePolicy.prepareLauncher()
            status.text = "Launcher mode prepared locally. Android Home role has not been requested."
        }

        val modeGroup = findViewById<RadioGroup>(R.id.protectionMode)
        val nextTaskCue = findViewById<EditText>(R.id.nextTaskCue)
        when (devicePolicy.getProtectionMode()) {
            ProtectionMode.STANDARD -> findViewById<android.widget.RadioButton>(R.id.modeStandard).isChecked = true
            ProtectionMode.FOCUS -> findViewById<android.widget.RadioButton>(R.id.modeFocus).isChecked = true
            ProtectionMode.DEEP_FOCUS -> findViewById<android.widget.RadioButton>(R.id.modeDeepFocus).isChecked = true
            ProtectionMode.RECOVERY -> findViewById<android.widget.RadioButton>(R.id.modeRecovery).isChecked = true
        }
        nextTaskCue.setText(secureStore.get("next_task_cue") ?: "")
        findViewById<Button>(R.id.saveRedirection).setOnClickListener {
            val mode = when (modeGroup.checkedRadioButtonId) {
                R.id.modeFocus -> ProtectionMode.FOCUS
                R.id.modeDeepFocus -> ProtectionMode.DEEP_FOCUS
                R.id.modeRecovery -> ProtectionMode.RECOVERY
                else -> ProtectionMode.STANDARD
            }
            devicePolicy.setProtectionMode(mode)
            secureStore.put("next_task_cue", nextTaskCue.text.toString().trim().take(200))
            status.text = "Redirection preferences saved locally."
        }

        findViewById<Button>(R.id.hardProtection).setOnClickListener {
            showHardProtectionDisclosure()
        }

        findViewById<Button>(R.id.saveProtected).setOnClickListener {
            val selected = checks.filterValues { it.isChecked }.keys.toSet()
            protectedStore.setPackages(selected)
            status.text = currentStatus()
        if (!cooldownStore.isConfigured()) showFirstRunCooldownDialog()
        if (intent.getBooleanExtra(EXTRA_DAILY_TASKS, false)) handleDailyTaskIntent()
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

    private fun showFirstRunCooldownDialog() {
        val input=EditText(this).apply{hint="Minutes (3 or more)";inputType=android.text.InputType.TYPE_CLASS_NUMBER}
        val dialog=AlertDialog.Builder(this).setTitle("Set your distraction cooldown").setMessage("Choose how long a distracted app stays unavailable after you complete the required recovery task. Minimum: 3 minutes; longer is allowed.").setView(input).setCancelable(false).setPositiveButton("Save",null).create()
        dialog.setOnShowListener{dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener{val minutes=input.text.toString().trim().toLongOrNull();if(minutes==null||minutes<CooldownEngine.MIN_MINUTES){input.error="Enter at least 3 minutes"}else{runCatching{cooldownStore.setDurationMinutes(minutes)}.onSuccess{dialog.dismiss()}}}}
        dialog.show()
    }

    private fun handleDailyTaskIntent(){
        val id=intent.getStringExtra(EXTRA_DAILY_TARGET_ID) ?: return
        val source=intent.getStringExtra(EXTRA_DAILY_SOURCE_PACKAGE)
        val target=dailyTargets.get().firstOrNull{it.id==id} ?: return
        AlertDialog.Builder(this).setTitle("Handle target").setMessage(target.title+"\n\nWhen you confirm completion, the distracting app will enter its cooldown immediately.").setNegativeButton("Not yet",null).setPositiveButton("I handled it"){_,_->if(dailyTargets.markCompleted(id)){if(!source.isNullOrBlank()&&cooldownStore.isConfigured())cooldownStore.start(source,System.currentTimeMillis(),"daily-target");intent.replaceExtras(Bundle());finish()}}.setOnDismissListener{if(!isFinishing&&intent.getBooleanExtra(EXTRA_DAILY_TASKS,false)){intent.replaceExtras(Bundle())}}.show()
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

    companion object {
        const val EXTRA_DAILY_TASKS = "daily_tasks"
        const val EXTRA_DAILY_TARGET_ID = "daily_target_id"
        const val EXTRA_DAILY_SOURCE_PACKAGE = "daily_source_package"
    }
}
