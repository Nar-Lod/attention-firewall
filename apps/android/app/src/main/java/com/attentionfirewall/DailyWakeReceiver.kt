package com.attentionfirewall

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class DailyWakeReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action == Intent.ACTION_USER_PRESENT) DailyTargetStore(SecureLocalStore(context)).setWakePending()
    }
}