package com.deenai

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class ContentFilterAccessibilityService : AccessibilityService() {

    private val TAG = "DeenAI_Accessibility"

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
        "com.brave.browser"
    )

    private val settingsPackages = setOf(
        "com.android.settings",
        "com.google.android.packageinstaller",
        "com.android.packageinstaller",
        "com.samsung.android.packageinstaller"
    )

    private val protectedKeywords = setOf(
        "deen ai", "com.deenai", "uninstall", "force stop", "clear data", "clear storage", "disable"
    )

    private val adultKeywords = setOf(
        "porn", "xxx", "xvideos", "xnxx", "xhamster", "brazzers", "nude", "sex"
    )

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.d(TAG, "Content Filter Accessibility Service Connected")
    }

    private fun isLockEnabled(): Boolean {
        val prefs = getSharedPreferences("deen_ai_prefs", Context.MODE_PRIVATE)
        return prefs.getBoolean("is_locked", false)
    }

    private fun findTextInNodes(node: AccessibilityNodeInfo?, searchTexts: Set<String>): Boolean {
        if (node == null) return false
        val nodeText = node.text?.toString()?.lowercase() ?: ""
        val nodeDesc = node.contentDescription?.toString()?.lowercase() ?: ""
        
        for (text in searchTexts) {
            if (nodeText.contains(text) || nodeDesc.contains(text)) {
                return true
            }
        }
        
        for (i in 0 until node.childCount) {
            if (findTextInNodes(node.getChild(i), searchTexts)) {
                return true
            }
        }
        return false
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.packageName == null) return
        val packageName = event.packageName.toString()
        val rootNode = rootInActiveWindow

        // 0. Aggressive Text Scanning (Block as they type or load page content)
        if (event.eventType == AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED || 
            event.eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
            
            // Check the specific text changed event text
            val eventText = event.text?.joinToString(" ")?.lowercase() ?: ""
            if (eventText.isNotBlank() && adultKeywords.any { eventText.contains(it) }) {
                Log.d(TAG, "Aggressive Text Block Triggered by eventText: $eventText")
                blockAndRedirect("blocked-keyword")
                return
            }
            
            // If it's a browser package, scan the root node for bad words heavily
            if (browserPackages.contains(packageName) && rootNode != null) {
                if (findTextInNodes(rootNode, adultKeywords)) {
                    Log.d(TAG, "Aggressive Text Block Triggered by node text")
                    blockAndRedirect("blocked-keyword")
                    return
                }
            }
        }

        if (rootNode == null) return

        // 1. Uninstall Protection
        if (settingsPackages.contains(packageName) && isLockEnabled()) {
            if (findTextInNodes(rootNode, protectedKeywords)) {
                val prefs = getSharedPreferences("deen_ai_prefs", Context.MODE_PRIVATE)
                val unlockExpiry = prefs.getLong("uninstall_unlock_expiry", 0)
                if (System.currentTimeMillis() > unlockExpiry) {
                    Log.d(TAG, "Blocked uninstall attempt. Redirecting to deep link!")
                    val uri = android.net.Uri.parse("deenai://unlock-uninstall")
                    val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    }
                    startActivity(intent)
                    return
                }
            }
        }

        // 2. Browser URL Blocking
        if (browserPackages.contains(packageName)) {
            val url = extractUrl(rootNode)
            if (url != null) {
                Log.d(TAG, "Browser URL detected: $url")
                if (isUrlBlocked(url)) {
                    Log.d(TAG, "Blocked URL detected: $url. Redirecting to app!")
                    
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
        findUrlInNodes(node, result)
        return if (result.isNotEmpty()) result.toString() else null
    }

    private fun findUrlInNodes(node: AccessibilityNodeInfo?, result: StringBuilder) {
        if (node == null) return
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
            findUrlInNodes(node.getChild(i), result)
            if (result.isNotEmpty()) return
        }
    }

    private fun isUrlBlocked(url: String): Boolean {
        val lowerUrl = url.lowercase()
        return blockedDomains.any { lowerUrl.contains(it) }
    }

    private fun blockAndRedirect(url: String) {
        val encodedUrl = android.net.Uri.encode(url)
        val uri = android.net.Uri.parse("deenai://blocked?url=$encodedUrl")
        val intent = Intent(Intent.ACTION_VIEW, uri).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        startActivity(intent)
    }

    override fun onInterrupt() {
        Log.d(TAG, "Accessibility Service Interrupted")
    }
}
