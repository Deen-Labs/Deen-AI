package com.deenai

import android.content.Intent
import android.content.ComponentName
import android.content.SharedPreferences
import android.provider.Settings
import android.text.TextUtils
import android.content.Context
import com.facebook.react.bridge.*
import android.app.Activity
import android.accessibilityservice.AccessibilityService

class ContentProtectionModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {
    
    private val context: ReactApplicationContext = reactContext
    
    override fun getName(): String = "ContentProtection"
    
    @ReactMethod
    fun startVPNService(promise: Promise) {
        try {
            if (isAccessibilityServiceEnabled(context, ContentFilterAccessibilityService::class.java)) {
                promise.resolve(true)
                return
            }
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(intent)
            promise.resolve(false)
        } catch (e: Exception) {
            promise.reject("START_ERROR", "Failed to start Accessibility service: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun stopVPNService(promise: Promise) {
        promise.resolve(true)
    }
    
    @ReactMethod
    fun isVPNRunning(promise: Promise) {
        try {
            val isEnabled = isAccessibilityServiceEnabled(context, ContentFilterAccessibilityService::class.java)
            promise.resolve(isEnabled)
        } catch (e: Exception) {
            promise.reject("CHECK_ERROR", "Failed to check status: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun hasVPNPermission(promise: Promise) {
        try {
            val isEnabled = isAccessibilityServiceEnabled(context, ContentFilterAccessibilityService::class.java)
            promise.resolve(isEnabled)
        } catch (e: Exception) {
            promise.reject("CHECK_ERROR", "Failed to check permission: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun getLastBlockTimestamp(promise: Promise) {
        try {
            val prefs = context.getSharedPreferences("deen_ai_prefs", Context.MODE_PRIVATE)
            val timestamp = prefs.getLong("last_block_timestamp", 0)
            promise.resolve(timestamp.toDouble())
        } catch (e: Exception) {
            promise.reject("READ_ERROR", "Failed to read block timestamp: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getTotalBlockCount(promise: Promise) {
        try {
            val prefs = context.getSharedPreferences("deen_ai_prefs", Context.MODE_PRIVATE)
            val count = prefs.getInt("total_block_count", 0)
            promise.resolve(count)
        } catch (e: Exception) {
            promise.reject("READ_ERROR", "Failed to read block count: ${e.message}", e)
        }
    }

    @ReactMethod
    fun setLockEnabled(enabled: Boolean, promise: Promise) {
        try {
            val prefs = context.getSharedPreferences("deen_ai_prefs", Context.MODE_PRIVATE)
            prefs.edit().putBoolean("is_locked", enabled).apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("WRITE_ERROR", "Failed to set lock state: ${e.message}", e)
        }
    }

    @ReactMethod
    fun temporarilyUnlockUninstall(durationMs: Int, promise: Promise) {
        try {
            val prefs = context.getSharedPreferences("deen_ai_prefs", Context.MODE_PRIVATE)
            val expiry = System.currentTimeMillis() + durationMs
            prefs.edit().putLong("uninstall_unlock_expiry", expiry).apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("WRITE_ERROR", "Failed to set temporary unlock: ${e.message}", e)
        }
    }

    private fun isAccessibilityServiceEnabled(context: Context, accessibilityService: Class<out AccessibilityService>): Boolean {
        val expectedComponentName = ComponentName(context, accessibilityService)
        val enabledServicesSetting = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        )
        if (enabledServicesSetting == null) return false
        val colonSplitter = TextUtils.SimpleStringSplitter(':')
        colonSplitter.setString(enabledServicesSetting)
        while (colonSplitter.hasNext()) {
            val componentNameString = colonSplitter.next()
            val enabledService = ComponentName.unflattenFromString(componentNameString)
            if (enabledService != null && enabledService == expectedComponentName) {
                return true
            }
        }
        return false
    }
}
