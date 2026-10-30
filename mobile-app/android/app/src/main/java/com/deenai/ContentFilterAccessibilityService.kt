package com.deenai

import android.accessibilityservice.AccessibilityService
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class ContentFilterAccessibilityService : AccessibilityService() {

    private val TAG = "DeenAI_Accessibility"

    private fun showBlockNotification(title: String, message: String) {
        try {
            val channelId = "deen_ai_protection_alerts"
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    channelId,
                    "DeenHub Content Protection",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Alerts when apps or websites are blocked"
                }
                notificationManager.createNotificationChannel(channel)
            }

            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            val pendingIntent = if (launchIntent != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PendingIntent.getActivity(
                        this,
                        0,
                        launchIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                } else {
                    PendingIntent.getActivity(
                        this,
                        0,
                        launchIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT
                    )
                }
            } else null

            val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Notification.Builder(this, channelId)
            } else {
                @Suppress("DEPRECATION")
                Notification.Builder(this)
            }

            builder.setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle(title)
                .setContentText(message)
                .setAutoCancel(true)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
                builder.setStyle(Notification.BigTextStyle().bigText(message))
            }
            if (pendingIntent != null) {
                builder.setContentIntent(pendingIntent)
            }

            notificationManager.notify(1001, builder.build())
        } catch (e: Exception) {
            Log.e(TAG, "Error posting notification: ${e.message}")
        }
    }

    // NSFW domains to block
    private val blockedDomains = setOf(
        "pornhub.com", "pornhub.org", "pornhub.net",
        "xvideos.com", "xvideos.red",
        "xnxx.com", "xhamster.com"
    )

    private val browserPackages = setOf(
        "com.android.chrome",
        "org.mozilla.firefox",
        "com.sec.android.app.sbrowser",
        "com.opera.browser",
        "com.microsoft.emmx",
        "com.brave.browser",
        "com.mi.globalbrowser",
        "com.opera.mini.native",
        "com.vivo.browser",
        "com.heytap.browser",
        "com.duckduckgo.mobile.android",
        "com.vivaldi.browser"
    )

    private val adultKeywordRegex = Regex(
        "\\b(porn|pornhub|xxx|xvideos|xnxx|xhamster|brazzers|nude|nudes|sex|onlyfans|redtube|youporn)\\b",
        RegexOption.IGNORE_CASE
    )

    private var lastBrowserContentScanTime: Long = 0L

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.d(TAG, "Content Filter Accessibility Service Connected")
    }

    private fun findRegexInNodes(
        node: AccessibilityNodeInfo?,
        regex: Regex,
        currentDepth: Int = 0,
        maxDepth: Int = 12
    ): Boolean {
        if (node == null || currentDepth > maxDepth) return false
        val nodeText = node.text?.toString()
        if (!nodeText.isNullOrBlank() && regex.containsMatchIn(nodeText)) {
            return true
        }
        val nodeDesc = node.contentDescription?.toString()
        if (!nodeDesc.isNullOrBlank() && regex.containsMatchIn(nodeDesc)) {
            return true
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            if (findRegexInNodes(child, regex, currentDepth + 1, maxDepth)) {
                return true
            }
        }
        return false
    }

    private fun isSWPEnabled(): Boolean {
        val prefs = getSharedPreferences("deen_ai_prefs", Context.MODE_PRIVATE)
        return prefs.getBoolean("is_swp_enabled", false)
    }

    private fun isHomeLauncher(packageName: String): Boolean {
        return try {
            val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
            val resolveInfo = packageManager.resolveActivity(intent, 0)
            resolveInfo?.activityInfo?.packageName == packageName
        } catch (e: Exception) {
            false
        }
    }

    private fun checkScheduledFocus(schedulesJson: String): Pair<Boolean, String> {
        return try {
            val array = org.json.JSONArray(schedulesJson)
            val cal = java.util.Calendar.getInstance()
            val currentDay = (cal.get(java.util.Calendar.DAY_OF_WEEK) - 1 + 7) % 7
            val currentMinutes = cal.get(java.util.Calendar.HOUR_OF_DAY) * 60 + cal.get(java.util.Calendar.MINUTE)

            for (i in 0 until array.length()) {
                val item = array.optJSONObject(i) ?: continue
                val enabled = item.optBoolean("enabled", true)
                if (!enabled) continue

                val daysArray = item.optJSONArray("days")
                var dayMatches = false
                if (daysArray != null) {
                    for (d in 0 until daysArray.length()) {
                        if (daysArray.getInt(d) == currentDay) {
                            dayMatches = true
                            break
                        }
                    }
                }
                if (!dayMatches) continue

                val startHour = item.optInt("startHour", 0)
                val startMinute = item.optInt("startMinute", 0)
                val endHour = item.optInt("endHour", 0)
                val endMinute = item.optInt("endMinute", 0)

                val startTotal = startHour * 60 + startMinute
                val endTotal = endHour * 60 + endMinute

                val isTimeInRange = if (startTotal <= endTotal) {
                    currentMinutes in startTotal..endTotal
                } else {
                    currentMinutes >= startTotal || currentMinutes <= endTotal
                }

                if (isTimeInRange) {
                    val appsArray = item.optJSONArray("blockedApps")
                    val blockedAppsCsv = if (appsArray != null) {
                        val list = mutableListOf<String>()
                        for (a in 0 until appsArray.length()) {
                            list.add(appsArray.getString(a))
                        }
                        list.joinToString(",")
                    } else ""
                    return Pair(true, blockedAppsCsv)
                }
            }
            Pair(false, "")
        } catch (e: Exception) {
            Log.e(TAG, "Error checking focus schedules: ${e.message}")
            Pair(false, "")
        }
    }

    private fun isAppBlockedInFocusMode(packageName: String): Boolean {
        if (packageName == this.packageName) return false
        if (isHomeLauncher(packageName)) return false

        return try {
            val prefs = getSharedPreferences("deen_ai_prefs", Context.MODE_PRIVATE)

            var activeBlocking = false
            var blockedCsv = ""

            val focusActive = prefs.getBoolean("focus_mode_active", false)
            val focusExpiry = prefs.getLong("focus_mode_expiry", 0L)
            val now = System.currentTimeMillis()

            if (focusActive && (focusExpiry == 0L || now < focusExpiry)) {
                activeBlocking = true
                blockedCsv = prefs.getString("blocked_apps", "") ?: ""
            } else {
                val schedulesJson = prefs.getString("focus_schedules", "") ?: ""
                if (schedulesJson.isNotBlank()) {
                    val (scheduledActive, scheduledApps) = checkScheduledFocus(schedulesJson)
                    if (scheduledActive) {
                        activeBlocking = true
                        blockedCsv = scheduledApps
                    }
                }
            }

            if (!activeBlocking || blockedCsv.isBlank()) return false
            val blockedList = blockedCsv.split(",").map { it.trim() }.filter { it.isNotEmpty() }
            blockedList.contains(packageName)
        } catch (e: Exception) {
            false
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.packageName == null) return
        val packageName = event.packageName.toString()

        // Enforce Focus Mode App Blocking at the top
        if (isAppBlockedInFocusMode(packageName)) {
            Log.d(TAG, "Focus Mode active: blocking app $packageName")
            performGlobalAction(GLOBAL_ACTION_HOME)
            showBlockNotification("App blocked by DeenHub", "Opening distracting apps is restricted during active Focus Mode.")
            val uri = android.net.Uri.parse("deenai://blocked?type=app&pkg=" + android.net.Uri.encode(packageName))
            val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            startActivity(intent)
            return
        }

        val isBrowser = isSWPEnabled() && browserPackages.contains(packageName)

        // Bypass heavy IPC entirely if the package is not an active browser
        if (!isBrowser) {
            return
        }

        // Fast check: eventText without calling rootInActiveWindow
        if (isBrowser && (event.eventType == AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED || 
            event.eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED)) {
            val eventText = event.text?.joinToString(" ") ?: ""
            if (eventText.isNotBlank() && adultKeywordRegex.containsMatchIn(eventText)) {
                if (BuildConfig.DEBUG) {
                    Log.d(TAG, "Aggressive Text Block Triggered by eventText: $eventText")
                }
                try {
                    val args = android.os.Bundle()
                    args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, "")
                    event.source?.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
                } catch (e: Exception) {}

                blockAndRedirect("blocked-keyword")
                return
            }
        }

        // Only query rootInActiveWindow when actually needed for browser inspection
        val rootNode = rootInActiveWindow ?: return

        // Aggressive Browser Content Scanning with 350ms debouncing
        if (isBrowser && (event.eventType == AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED || 
            event.eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED)) {
            val now = System.currentTimeMillis()
            if (event.eventType == AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED || (now - lastBrowserContentScanTime >= 350L)) {
                if (event.eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
                    lastBrowserContentScanTime = now
                }
                if (findRegexInNodes(rootNode, adultKeywordRegex)) {
                    if (BuildConfig.DEBUG) {
                        Log.d(TAG, "Aggressive Text Block Triggered by node text")
                    }
                    blockAndRedirect("blocked-keyword")
                    return
                }
            }
        }

        // Browser URL Blocking
        if (browserPackages.contains(packageName)) {
            val url = extractUrl(rootNode)
            if (url != null) {
                if (BuildConfig.DEBUG) {
                    Log.d(TAG, "Browser URL detected: $url")
                }
                if (isUrlBlocked(url)) {
                    if (BuildConfig.DEBUG) {
                        Log.d(TAG, "Blocked URL detected: $url. Redirecting to app!")
                    }
                    
                    // Record block event
                    val prefs = getSharedPreferences("deen_ai_prefs", Context.MODE_PRIVATE)
                    val count = prefs.getInt("total_block_count", 0)
                    prefs.edit()
                         .putLong("last_block_timestamp", System.currentTimeMillis())
                         .putInt("total_block_count", count + 1)
                         .apply()

                    blockAndRedirect(url)
                }
            }
        }
    }

    private fun extractUrl(node: AccessibilityNodeInfo): String? {
        val result = StringBuilder()
        findUrlInNodes(node, result, 0, 12)
        return if (result.isNotEmpty()) result.toString() else null
    }

    private fun findUrlInNodes(
        node: AccessibilityNodeInfo?,
        result: StringBuilder,
        currentDepth: Int = 0,
        maxDepth: Int = 12
    ) {
        if (node == null || currentDepth > maxDepth) return
        if (node.className == "android.widget.EditText" || node.viewIdResourceName?.contains("url_bar", ignoreCase = true) == true) {
            if (node.text != null && node.text.toString().isNotBlank()) {
                val text = node.text.toString()
                if (text.contains(".") && !text.contains(" ")) {
                     result.append(text)
                     return
                }
            }
        }
        for (i in 0 until node.childCount) {
            findUrlInNodes(node.getChild(i), result, currentDepth + 1, maxDepth)
            if (result.isNotEmpty()) return
        }
    }

    private fun isUrlBlocked(url: String): Boolean {
        val lowerUrl = url.lowercase()
        return blockedDomains.any { lowerUrl.contains(it) }
    }

    private fun blockAndRedirect(url: String) {
        performGlobalAction(GLOBAL_ACTION_BACK)
        showBlockNotification("Site blocked by DeenHub", "Access to prohibited content was blocked by DeenHub.")
        val encodedUrl = android.net.Uri.encode(url)
        val uri = android.net.Uri.parse("deenai://mindful-barrier?url=$encodedUrl")
        val intent = Intent(Intent.ACTION_VIEW, uri).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        startActivity(intent)
    }

    override fun onInterrupt() {
        Log.d(TAG, "Accessibility Service Interrupted")
    }
}
