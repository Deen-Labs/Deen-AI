/**
 * Content Protection Module
 * Provides NSFW detection and blocking capabilities for DEEN AI
 * 
 * IMPORTANT: This module provides the framework for content protection.
 * For full functionality, native implementations are required:
 * 
 * Android: VPN Service API or Accessibility Service
 * iOS: Network Extension (requires special entitlements)
 * 
 * Current implementation provides:
 * - URL-based detection
 * - Alert system
 * - Configuration management
 */

import { Alert, Linking } from 'react-native';
import { checkNSFWContent, showNSFWBlockedAlert, getBlockingSettings } from './focus';

/**
 * Check if a URL should be blocked
 */
export async function checkAndBlockURL(url: string): Promise<boolean> {
  const settings = await getBlockingSettings();

  if (!settings.enableNSFWBlocking) {
    return false;
  }

  const isNSFW = checkNSFWContent(url);

  if (isNSFW) {
    showNSFWBlockedAlert();
    return true; // URL is blocked
  }

  return false; // URL is allowed
}

/**
 * Monitor and intercept URL opening attempts
 * This should be called before opening any external URLs
 */
export async function safeOpenURL(url: string): Promise<boolean> {
  const shouldBlock = await checkAndBlockURL(url);

  if (shouldBlock) {
    return false;
  }

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error opening URL:', error);
    return false;
  }
}

/**
 * Show content blocked notification
 */
export function showContentBlockedNotification(contentType: 'nsfw' | 'app' = 'nsfw'): void {
  if (contentType === 'nsfw') {
    Alert.alert(
      '🛡️ Content Blocked by DEEN AI',
      'This content has been automatically blocked to protect your spiritual well-being and maintain a halal digital environment.',
      [
        {
          text: 'I Understand',
          style: 'default',
          onPress: () => {
            // Log the event for tracking
            console.log('NSFW content blocked:', new Date().toISOString());
          },
        },
      ],
      {
        cancelable: false,
      }
    );
  } else {
    Alert.alert(
      '⏰ App Blocked - Focus Mode',
      'This app is currently blocked because Focus Mode is active. Stay focused on what truly matters.',
      [
        {
          text: 'Okay',
          style: 'default',
        },
      ],
      { cancelable: false }
    );
  }
}

/**
 * Enhanced NSFW detection with domain checking
 */
export function isNSFWDomain(url: string): boolean {
  const nsfwDomains = [
    // Major tube sites
    'pornhub.com', 'pornhub.org', 'pornhub.net',
    'xvideos.com', 'xvideos.red',
    'xnxx.com',
    'xhamster.com', 'xhamster.desi', 'xhamster2.com',
    'youporn.com', 'redtube.com', 'tube8.com',
    'spankbang.com', 'spankbang.party',
    'eporner.com', 'upornia.com', 'hqporner.com',
    'txxx.com', 'beeg.com', 'tnaflix.com', 'drtuber.com',
    'keezmovies.com', 'extremetube.com', 'thumbzilla.com',
    'gotporn.com', 'nuvid.com', 'faphouse.com', 'motherless.com',
    'porntrex.com', 'pornone.com', 'anysex.com',
    'proporn.com', 'pornjam.com', 'pornhd.com',
    'porn.com', 'sex.com', 'vporn.com', 'bravotube.net',
    // Cam/live sites
    'chaturbate.com', 'livejasmin.com', 'myfreecams.com',
    'cam4.com', 'bongacams.com', 'stripchat.com',
    'jasmin.com', 'streamate.com', 'flirt4free.com', 'imlive.com',
    // Creator/subscription sites
    'onlyfans.com', 'fansly.com', 'manyvids.com',
    'fancentro.com', 'loyalfans.com', '4based.com',
    // Image boards
    '4chan.org', '8kun.top', 'rule34.xxx',
    'gelbooru.com', 'danbooru.donmai.us', 'e621.net', 'hentai-foundry.com',
    // Major studios
    'brazzers.com', 'bangbros.com', 'naughtyamerica.com',
    'reality-kings.com', 'mofos.com', 'babes.com',
    'digitalplayground.com', 'wicked.com', 'vivid.com',
    'hustler.com', 'penthouse.com', 'sexart.com',
    'metart.com', 'hegre-art.com', 'femjoy.com',
    // Hentai
    'nhentai.net', 'hentaihaven.com', 'hanime.tv', 'hentaigasm.com',
  ];

  try {
    const urlObj = new URL(url.toLowerCase());
    const hostname = urlObj.hostname.replace('www.', '');

    return nsfwDomains.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch (error) {
    // If URL parsing fails, fall back to simple string matching
    const lowerUrl = url.toLowerCase();
    return nsfwDomains.some(domain => lowerUrl.includes(domain));
  }
}

/**
 * Comprehensive content check combining both methods
 */
export function detectNSFWContent(url: string): boolean {
  return checkNSFWContent(url) || isNSFWDomain(url);
}

/**
 * Initialize content protection
 * Call this when the app starts
 */
export async function initializeContentProtection(): Promise<void> {
  const settings = await getBlockingSettings();

  if (settings.enableNSFWBlocking) {
    console.log('✅ Content Protection Active - DEEN AI is protecting your digital space');

    // Here you would initialize native modules for deep packet inspection
    // This requires platform-specific implementations:
    // 
    // Android: Start VPN service or Accessibility service
    // iOS: Enable Network Extension
    //
    // Example pseudo-code:
    // if (Platform.OS === 'android') {
    //   await NativeModules.ContentFilter.startVPNService();
    // } else if (Platform.OS === 'ios') {
    //   await NativeModules.ContentFilter.enableNetworkExtension();
    // }
  }
}

/**
 * Get content protection status
 */
export async function getContentProtectionStatus(): Promise<{
  enabled: boolean;
  nativeSupport: boolean;
  permissionsGranted: boolean;
}> {
  const settings = await getBlockingSettings();

  return {
    enabled: settings.enableNSFWBlocking,
    nativeSupport: false, // Set to true when native modules are implemented
    permissionsGranted: false, // Check actual permissions when native modules are ready
  };
}

/**
 * Request necessary permissions for content blocking
 * This is a placeholder for the actual native permission requests
 */
export async function requestContentProtectionPermissions(): Promise<boolean> {
  Alert.alert(
    '🛡️ Content Protection Setup',
    'To enable full content protection without slowing down your internet speed, DEEN AI needs permission to monitor browser URLs.\n\nThis is used solely to block inappropriate content and protect your spiritual well-being.\n\nPermissions required:\n• Accessibility Services (Android)\n• Network Extension (iOS)',
    [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => { },
      },
      {
        text: 'Grant Permissions',
        style: 'default',
        onPress: async () => {
          // Here you would request native permissions
          // Platform.OS === 'android' ? requestVPNPermission() : requestNetworkExtension()
          console.log('Permission request initiated');
        },
      },
    ]
  );

  return false; // Return actual permission status when native modules are implemented
}
