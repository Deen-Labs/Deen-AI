package com.deenai

import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.util.Log

class ContentFilterVPNService : VpnService() {
    private val TAG = "DeenAI_VPN"

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "VPN Service Started")
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
        val prefs = getSharedPreferences("deen_ai_prefs", Context.MODE_PRIVATE)
        prefs.edit().putLong("last_vpn_stopped", System.currentTimeMillis()).apply()
        super.onDestroy()
    }
}
