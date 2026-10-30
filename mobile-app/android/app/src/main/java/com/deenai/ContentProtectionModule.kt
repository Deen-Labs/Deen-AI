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
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo

class ContentProtectionModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {
    
    private val context: ReactApplicationContext = reactContext
    
    override fun getName(): String = "ContentProtection"
    
    @ReactMethod
    fun startVPNService(promise: Promise) {
        try {
            val prefs = context.getSharedPreferences("deen_ai_prefs", Context.MODE_PRIVATE)
            prefs.edit().putBoolean("is_swp_enabled", true).apply()

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
        try {
            val prefs = context.getSharedPreferences("deen_ai_prefs", Context.MODE_PRIVATE)
            val isLocked = prefs.getBoolean("is_locked", false)
            val unlockExpiry = prefs.getLong("uninstall_unlock_expiry", 0)

            if (isLocked && System.currentTimeMillis() > unlockExpiry) {
                promise.reject("LOCKED", "Cannot stop protection while PIN lock is active")
                return
            }

            prefs.edit().putBoolean("is_swp_enabled", false).apply()

            val vpnIntent = Intent(context, ContentFilterVPNService::class.java)
            context.stopService(vpnIntent)

            val isAccessibilityEnabled = isAccessibilityServiceEnabled(context, ContentFilterAccessibilityService::class.java)
            if (isAccessibilityEnabled) {
                val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(intent)
                promise.resolve(false)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", "Failed to stop protection: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun isVPNRunning(promise: Promise) {
        try {
            val prefs = context.getSharedPreferences("deen_ai_prefs", Context.MODE_PRIVATE)
            val isSwpEnabled = prefs.getBoolean("is_swp_enabled", false)
            val isEnabled = isAccessibilityServiceEnabled(context, ContentFilterAccessibilityService::class.java)
            promise.resolve(isSwpEnabled && isEnabled)
        } catch (e: Exception) {
            promise.reject("CHECK_ERROR", "Failed to check status: ${e.message}", e)
        }
    }

    @ReactMethod
    fun isAccessibilityServiceActive(promise: Promise) {
        try {
            val isEnabled = isAccessibilityServiceEnabled(context, ContentFilterAccessibilityService::class.java)
            promise.resolve(isEnabled)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun openAccessibilitySettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SETTINGS_ERROR", "Failed to open accessibility settings: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val pm = context.packageManager
            val intent = Intent(Intent.ACTION_MAIN, null).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }
            val resolveInfos = pm.queryIntentActivities(intent, 0)
            val appList = Arguments.createArray()
            val seenPackages = mutableSetOf<String>()

            for (info in resolveInfos) {
                val pkg = info.activityInfo.packageName
                if (pkg == context.packageName || seenPackages.contains(pkg)) {
                    continue
                }
                seenPackages.add(pkg)
                val appMap = Arguments.createMap()
                val label = info.loadLabel(pm)?.toString() ?: pkg
                appMap.putString("packageName", pkg)
                appMap.putString("appName", label)
                appList.pushMap(appMap)
            }
            promise.resolve(appList)
        } catch (e: Exception) {
            promise.reject("APPS_ERROR", "Failed to list installed apps: ${e.message}", e)
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

    @ReactMethod
    fun syncFocusBlocking(isFocusActive: Boolean, blockedPackagesCsv: String, endTimestamp: Double, schedulesJson: String, promise: Promise) {
        try {
            val prefs = context.getSharedPreferences("deen_ai_prefs", Context.MODE_PRIVATE)
            prefs.edit()
                .putBoolean("is_focus_mode_active", isFocusActive)
                .putString("focus_blocked_packages", blockedPackagesCsv)
                .putLong("focus_end_timestamp", endTimestamp.toLong())
                .putString("focus_schedules_json", schedulesJson)
                .commit()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("WRITE_ERROR", "Failed to sync focus blocking: ${e.message}", e)
        }
    }

    @ReactMethod
    fun hasNotificationPolicyAccess(promise: Promise) {
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? android.app.NotificationManager
                promise.resolve(notificationManager?.isNotificationPolicyAccessGranted ?: true)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun requestNotificationPolicyAccess(promise: Promise) {
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            try {
                val intent = Intent(Settings.ACTION_SOUND_SETTINGS)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(intent)
                promise.resolve(true)
            } catch (err: Exception) {
                promise.reject("POLICY_SETTINGS_ERROR", "Failed to open settings: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun setRingerModeVibrate(promise: Promise) {
        try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? android.media.AudioManager
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? android.app.NotificationManager
            
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                if (notificationManager != null && notificationManager.isNotificationPolicyAccessGranted) {
                    audioManager?.ringerMode = android.media.AudioManager.RINGER_MODE_VIBRATE
                    promise.resolve(true)
                } else {
                    // Do NOT auto-launch settings unannounced during timer start
                    promise.resolve(false)
                }
            } else {
                audioManager?.ringerMode = android.media.AudioManager.RINGER_MODE_VIBRATE
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun setRingerModeNormal(promise: Promise) {
        try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? android.media.AudioManager
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? android.app.NotificationManager
            
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                if (notificationManager != null && notificationManager.isNotificationPolicyAccessGranted) {
                    audioManager?.ringerMode = android.media.AudioManager.RINGER_MODE_NORMAL
                    promise.resolve(true)
                } else {
                    promise.resolve(false)
                }
            } else {
                audioManager?.ringerMode = android.media.AudioManager.RINGER_MODE_NORMAL
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun goToHomeScreen(promise: Promise) {
        try {
            val intent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("HOME_ERROR", "Failed to navigate to home screen: ${e.message}", e)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN NativeEventEmitter compatibility
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN NativeEventEmitter compatibility
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
