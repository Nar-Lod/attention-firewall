package com.attentionfirewall

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.TextView

class MainActivity : Activity() {
    private lateinit var status: TextView
    private val usage by lazy { UsageSignalAdapter(this) }
    private val secureStore by lazy { SecureLocalStore(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        status = findViewById(R.id.status)

        findViewById<Button>(R.id.grantUsage).setOnClickListener {
            startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
        }

        findViewById<Button>(R.id.sample).setOnClickListener {
            runLocalSample()
        }

        status.text = if (usage.hasUsageAccess()) {
            "Usage access is enabled. Detailed usage stays on this device."
        } else {
            "Usage access is not enabled."
        }
    }

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
