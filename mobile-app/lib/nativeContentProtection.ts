/**
 * Native Content Protection Module
 * Interface to the native VPN service for system-wide content blocking
 */

import { NativeModules, NativeEventEmitter, Platform, Alert } from 'react-native';

interface ContentProtectionNative {
  startVPNService(): Promise<boolean>;
  stopVPNService(): Promise<boolean>;
  isVPNRunning(): Promise<boolean>;
  hasVPNPermission(): Promise<boolean>;
}

const LINKING_ERROR =
  `The package '@deenai/content-protection' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are running on a physical device (VPN services require a real device)\n' +
  '- For Expo: You have run "expo prebuild" and built the native project\n';

// Get native module
const ContentProtectionNative: ContentProtectionNative = NativeModules.ContentProtection
  ? NativeModules.ContentProtection
  : {
      startVPNService: () => Promise.reject(new Error(LINKING_ERROR)),
      stopVPNService: () => Promise.reject(new Error(LINKING_ERROR)),
      isVPNRunning: () => Promise.reject(new Error(LINKING_ERROR)),
      hasVPNPermission: () => Promise.reject(new Error(LINKING_ERROR)),
    };

/**
 * System-wide content protection using native VPN service
 */
class NativeContentProtection {
  private eventEmitter: NativeEventEmitter | null = null;

  constructor() {
    if (NativeModules.ContentProtection && Platform.OS === 'android') {
      this.eventEmitter = new NativeEventEmitter(NativeModules.ContentProtection);
    }
  }

  /**
   * Check if the native module is available
   */
  isAvailable(): boolean {
    return !!NativeModules.ContentProtection && Platform.OS === 'android';
  }

  /**
   * Start system-wide content protection
   * This will request VPN permission and start the VPN service
   */
  async start(): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('Native content protection is only available on Android');
      return false;
    }

    try {
      // Check if already running
      const isRunning = await ContentProtectionNative.isVPNRunning();
      if (isRunning) {
        console.log('VPN service already running');
        return true;
      }

      // Check permission
      const hasPermission = await ContentProtectionNative.hasVPNPermission();
      
      if (!hasPermission) {
        // Show explanation before requesting permission
        await this.showPermissionDialog();
      }

      // Start VPN service (will request permission if needed)
      const started = await ContentProtectionNative.startVPNService();
      
      if (started) {
        console.log('✅ System-wide content protection activated');
        this.showSuccessNotification();
      }
      
      return started;
    } catch (error: any) {
      console.error('Failed to start content protection:', error);
      
      if (error.code === 'PERMISSION_DENIED') {
        Alert.alert(
          'Permission Required',
          'DEEN AI needs VPN permission to block inappropriate content system-wide. This permission is only used for content filtering and does not track or monitor your activity.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error',
          'Failed to start content protection. Please try again.',
          [{ text: 'OK' }]
        );
      }
      
      return false;
    }
  }

  /**
   * Stop system-wide content protection
   */
  async stop(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const stopped = await ContentProtectionNative.stopVPNService();
      
      if (stopped) {
        console.log('Content protection deactivated');
      }
      
      return stopped;
    } catch (error) {
      console.error('Failed to stop content protection:', error);
      return false;
    }
  }

  /**
   * Check if system-wide protection is currently active
   */
  async isActive(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      return await ContentProtectionNative.isVPNRunning();
    } catch (error) {
      console.error('Failed to check VPN status:', error);
      return false;
    }
  }

  /**
   * Check if VPN permission has been granted
   */
  async hasPermission(): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      return await ContentProtectionNative.hasVPNPermission();
    } catch (error) {
      console.error('Failed to check permission:', error);
      return false;
    }
  }

  /**
   * Show permission explanation dialog
   */
  private showPermissionDialog(): Promise<void> {
    return new Promise((resolve) => {
      Alert.alert(
        '🛡️ Enable System-Wide Protection',
        'DEEN AI will create a VPN connection to filter inappropriate content across ALL apps on your device.\n\n' +
        '✓ Blocks NSFW sites in any browser\n' +
        '✓ Works in all apps system-wide\n' +
        '✓ No tracking or data collection\n' +
        '✓ All filtering happens on your device\n\n' +
        'This requires VPN permission. Tap "Continue" to grant access.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(),
          },
          {
            text: 'Continue',
            onPress: () => resolve(),
          },
        ]
      );
    });
  }

  /**
   * Show success notification
   */
  private showSuccessNotification(): void {
    Alert.alert(
      '✅ Protection Active',
      'DEEN AI is now protecting your entire device from inappropriate content. You can browse safely in any app!',
      [{ text: 'Great!' }]
    );
  }

  /**
   * Get status information
   */
  async getStatus(): Promise<{
    available: boolean;
    active: boolean;
    hasPermission: boolean;
  }> {
    if (!this.isAvailable()) {
      return {
        available: false,
        active: false,
        hasPermission: false,
      };
    }

    try {
      const [active, hasPermission] = await Promise.all([
        this.isActive(),
        this.hasPermission(),
      ]);

      return {
        available: true,
        active,
        hasPermission,
      };
    } catch (error) {
      console.error('Failed to get status:', error);
      return {
        available: true,
        active: false,
        hasPermission: false,
      };
    }
  }
}

// Export singleton instance
export const nativeContentProtection = new NativeContentProtection();

// Export hook for React components
export function useNativeContentProtection() {
  const [isActive, setIsActive] = React.useState(false);
  const [hasPermission, setHasPermission] = React.useState(false);
  const [isAvailable] = React.useState(nativeContentProtection.isAvailable());

  React.useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    const status = await nativeContentProtection.getStatus();
    setIsActive(status.active);
    setHasPermission(status.hasPermission);
  };

  const start = async () => {
    const started = await nativeContentProtection.start();
    if (started) {
      await loadStatus();
    }
    return started;
  };

  const stop = async () => {
    const stopped = await nativeContentProtection.stop();
    if (stopped) {
      await loadStatus();
    }
    return stopped;
  };

  const refresh = () => loadStatus();

  return {
    isAvailable,
    isActive,
    hasPermission,
    start,
    stop,
    refresh,
  };
}

// For non-React usage
import React from 'react';

export default nativeContentProtection;
