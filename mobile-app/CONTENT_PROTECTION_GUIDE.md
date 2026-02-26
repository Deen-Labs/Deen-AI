# DEEN AI - Content Protection & App Blocking Implementation Guide

## Overview

This guide explains the content protection and app blocking features implemented in the DEEN AI mobile app, including what's currently functional and what requires native implementation for full functionality.

## Features Implemented

### ✅ Currently Functional

1. **Focus Mode with Visual Timer**
   - Circle animation that starts full and gradually empties as time runs out
   - Multiple duration options (15, 25, 45, 60 minutes)
   - Session tracking and statistics
   - Automatic focus mode state management

2. **NSFW Content Detection Framework**
   - URL-based keyword detection
   - Domain blacklist checking
   - Alert system for blocked content
   - Configuration management via AsyncStorage
   - Comprehensive list of known NSFW domains

3. **App Blocking Configuration**
   - UI for selecting apps to block during Focus Mode
   - Toggle switches for enabling/disabling app blocking
   - Persistent storage of blocked app preferences
   - Pre-configured list of common distracting apps

4. **Settings & Configuration**
   - Enable/disable NSFW blocking
   - Enable/disable app blocking
   - Individual app selection for blocking
   - Settings persist across app restarts

### ⚠️ Requires Native Implementation

The following features require platform-specific native modules to be fully functional:

1. **Deep Packet Inspection for NSFW Blocking**
   - Intercept and analyze network traffic
   - Block requests to NSFW sites at the network level
   - Real-time content filtering

2. **System-Wide App Blocking**
   - Prevent other apps from launching during Focus Mode
   - Intercept app launch intents
   - Force-close blocked apps

## Native Implementation Requirements

### Android Requirements

#### 1. VPN Service for Content Filtering

```kotlin
// File: android/app/src/main/java/com/deenai/ContentFilterVPNService.kt

import android.net.VpnService
import android.content.Intent
import android.os.ParcelFileDescriptor
import java.io.FileInputStream
import java.io.FileOutputStream
import java.nio.ByteBuffer

class ContentFilterVPNService : VpnService() {
    private var vpnInterface: ParcelFileDescriptor? = null
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val builder = Builder()
        builder.setSession("DEEN AI Content Filter")
        builder.addAddress("10.0.0.2", 32)
        builder.addRoute("0.0.0.0", 0)
        builder.addDnsServer("8.8.8.8")
        
        vpnInterface = builder.establish()
        
        // Start packet filtering thread
        Thread { filterPackets() }.start()
        
        return START_STICKY
    }
    
    private fun filterPackets() {
        val inputStream = FileInputStream(vpnInterface!!.fileDescriptor)
        val outputStream = FileOutputStream(vpnInterface!!.fileDescriptor)
        val buffer = ByteBuffer.allocate(32767)
        
        while (true) {
            val length = inputStream.read(buffer.array())
            if (length > 0) {
                buffer.limit(length)
                
                // Parse packet and check for NSFW content
                val shouldBlock = checkPacketForNSFW(buffer)
                
                if (!shouldBlock) {
                    outputStream.write(buffer.array(), 0, length)
                }
                
                buffer.clear()
            }
        }
    }
    
    private fun checkPacketForNSFW(packet: ByteBuffer): Boolean {
        // Implement DNS query inspection and HTTP/HTTPS filtering
        // Check against NSFW domains list
        return false
    }
}
```

#### 2. Accessibility Service for App Blocking

```kotlin
// File: android/app/src/main/java/com/deenai/AppBlockingService.kt

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent
import android.content.Intent

class AppBlockingService : AccessibilityService() {
    
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            val packageName = event.packageName?.toString() ?: return
            
            if (shouldBlockApp(packageName)) {
                // Return to home screen
                performGlobalAction(GLOBAL_ACTION_HOME)
                
                // Show blocking alert
                showBlockingAlert(packageName)
            }
        }
    }
    
    private fun shouldBlockApp(packageName: String): Boolean {
        // Check against blocked apps list
        // Check if focus mode is active
        return false
    }
    
    override fun onInterrupt() {}
}
```

#### 3. React Native Module Bridge

```kotlin
// File: android/app/src/main/java/com/deenai/ContentProtectionModule.kt

import com.facebook.react.bridge.*
import android.content.Intent
import android.net.VpnService

class ContentProtectionModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {
    
    override fun getName(): String = "ContentProtection"
    
    @ReactMethod
    fun startVPNService(promise: Promise) {
        val intent = VpnService.prepare(reactApplicationContext)
        if (intent != null) {
            // Request VPN permission
            currentActivity?.startActivityForResult(intent, VPN_REQUEST_CODE)
            promise.reject("PERMISSION_REQUIRED", "VPN permission required")
        } else {
            // Start VPN service
            val serviceIntent = Intent(reactApplicationContext, ContentFilterVPNService::class.java)
            reactApplicationContext.startService(serviceIntent)
            promise.resolve(true)
        }
    }
    
    @ReactMethod
    fun stopVPNService(promise: Promise) {
        val serviceIntent = Intent(reactApplicationContext, ContentFilterVPNService::class.java)
        reactApplicationContext.stopService(serviceIntent)
        promise.resolve(true)
    }
    
    companion object {
        const val VPN_REQUEST_CODE = 1001
    }
}
```

### iOS Requirements

#### 1. Network Extension for Content Filtering

```swift
// File: ios/DeenAIContentFilter/PacketTunnelProvider.swift

import NetworkExtension

class PacketTunnelProvider: NEPacketTunnelProvider {
    
    override func startTunnel(options: [String : NSObject]?, 
                            completionHandler: @escaping (Error?) -> Void) {
        
        // Configure tunnel settings
        let settings = NEPacketTunnelNetworkSettings(tunnelRemoteAddress: "10.0.0.1")
        settings.ipv4Settings = NEIPv4Settings(addresses: ["10.0.0.2"], 
                                               subnetMasks: ["255.255.255.0"])
        settings.dnsSettings = NEDNSSettings(servers: ["8.8.8.8", "8.8.4.4"])
        
        setTunnelNetworkSettings(settings) { error in
            if error == nil {
                self.startFiltering()
            }
            completionHandler(error)
        }
    }
    
    private func startFiltering() {
        // Read packets and filter NSFW content
        packetFlow.readPackets { packets, protocols in
            for (index, packet) in packets.enumerated() {
                if !self.isNSFWPacket(packet) {
                    self.packetFlow.writePackets([packet], 
                                                 withProtocols: [protocols[index]])
                }
            }
            
            // Continue reading
            self.startFiltering()
        }
    }
    
    private func isNSFWPacket(_ packet: Data) -> Bool {
        // Implement packet inspection logic
        return false
    }
}
```

#### 2. React Native Bridge Module

```swift
// File: ios/DeenAI/ContentProtectionModule.swift

import Foundation
import NetworkExtension

@objc(ContentProtectionModule)
class ContentProtectionModule: NSObject {
    
    @objc
    func startNetworkExtension(_ resolve: @escaping RCTPromiseResolveBlock,
                              rejecter reject: @escaping RCTPromiseRejectBlock) {
        
        let manager = NETunnelProviderManager.loadAllFromPreferences { managers, error in
            if let error = error {
                reject("LOAD_ERROR", error.localizedDescription, error)
                return
            }
            
            // Start the VPN tunnel
            guard let manager = managers?.first else {
                reject("NO_MANAGER", "No tunnel manager found", nil)
                return
            }
            
            do {
                try manager.connection.startVPNTunnel()
                resolve(true)
            } catch {
                reject("START_ERROR", error.localizedDescription, error)
            }
        }
    }
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
}
```

## Permissions Required

### Android (AndroidManifest.xml)

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.BIND_VPN_SERVICE" />
<uses-permission android:name="android.permission.BIND_ACCESSIBILITY_SERVICE" />
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
<uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" />

<service
    android:name=".ContentFilterVPNService"
    android:permission="android.permission.BIND_VPN_SERVICE">
    <intent-filter>
        <action android:name="android.net.VpnService" />
    </intent-filter>
</service>

<service
    android:name=".AppBlockingService"
    android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE">
    <intent-filter>
        <action android:name="android.accessibilityservice.AccessibilityService" />
    </intent-filter>
</service>
```

### iOS (Info.plist & Entitlements)

```xml
<!-- Info.plist -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>

<!-- DeenAI.entitlements -->
<key>com.apple.developer.networking.networkextension</key>
<array>
    <string>packet-tunnel-provider</string>
    <string>app-proxy-provider</string>
</array>
```

## Testing the Current Implementation

### 1. Focus Mode Timer

```bash
# Run the app
cd mobile-app
npm start
# Press 'a' for Android or 'i' for iOS
```

Navigate to Focus tab → Select duration → Start Focus
- Verify the circle animation starts full and degrades over time
- Check that it properly tracks time remaining

### 2. Content Protection Settings

Navigate to Focus tab → Scroll to "Content Protection" section
- Toggle NSFW blocking on/off
- Toggle App blocking on/off
- Configure which apps to block

### 3. Testing URL Blocking (JavaScript level)

```javascript
// In any component
import { safeOpenURL } from '../lib/contentProtection';

// Try opening a blocked URL
safeOpenURL('https://pornhub.com'); // Should show alert and block

// Try opening a safe URL
safeOpenURL('https://google.com'); // Should open normally
```

## Future Enhancements

1. **Machine Learning Content Detection**
   - Image analysis for inappropriate content
   - NLP for text content filtering
   - Cloud-based content classification API

2. **Parental Controls**
   - Admin PIN protection
   - Remote monitoring dashboard
   - Usage reports and analytics

3. **Community Reporting**
   - Allow users to report missed NSFW sites
   - Crowdsourced blocklist updates
   - Community-verified safe browsing

4. **Smart Scheduling**
   - Auto-enable protection during prayer times
   - Customizable schedules
   - Location-based activation

## Support & Resources

- **Documentation**: See inline code comments
- **React Native VPN**: https://github.com/cuvent/react-native-vpn
- **React Native Accessibility**: https://reactnative.dev/docs/accessibility
- **Expo Config Plugins**: For ejecting and adding native modules

## Important Notes

⚠️ **Privacy & Security**
- All content filtering happens locally on device
- No data is sent to external servers
- User privacy is paramount
- Open source implementation for transparency

🕌 **Islamic Principles**
- Designed with Islamic values in mind
- Promotes digital well-being and mindfulness
- Helps maintain halal digital environment
- Supports spiritual growth and focus

## License

This implementation is part of the DEEN AI project and follows the same license as the main repository.
