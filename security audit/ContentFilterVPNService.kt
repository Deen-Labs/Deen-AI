package com.deenai

import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.util.Log

class ContentFilterVPNService : VpnService() {
    private val TAG = "DeenAI_VPN"

    companion object {
        @Volatile
        var isRunning: Boolean = false
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        isRunning = true
        val prefs = getSharedPreferences("deen_ai_prefs", Context.MODE_PRIVATE)
        prefs.edit()
            .putBoolean("is_vpn_running", true)
            .putLong("last_vpn_started", System.currentTimeMillis())
            .apply()

        if (BuildConfig.DEBUG) {
            Log.d(TAG, "VPN Service Started")
        }
        return START_STICKY
    }

    private fun recordBlockEvent() {
        val prefs = getSharedPreferences("deen_ai_prefs", Context.MODE_PRIVATE)
        val count = prefs.getInt("total_block_count", 0)
        prefs.edit()
            .putLong("last_block_timestamp", System.currentTimeMillis())
            .putInt("total_block_count", count + 1)
            .apply()
    }

    override fun onDestroy() {
        isRunning = false
        val prefs = getSharedPreferences("deen_ai_prefs", Context.MODE_PRIVATE)
        prefs.edit()
            .putBoolean("is_vpn_running", false)
            .putLong("last_vpn_stopped", System.currentTimeMillis())
            .apply()
        super.onDestroy()
    }
}
