/**
 * React Hook for Content Protection
 * Use this hook in components that need to check or block content
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  initializeContentProtection, 
  getContentProtectionStatus,
  checkAndBlockURL,
  safeOpenURL,
  showContentBlockedNotification,
  detectNSFWContent,
  requestContentProtectionPermissions,
} from './contentProtection';
import { getBlockingSettings, BlockingSettings } from './focus';

export function useContentProtection() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [hasNativeSupport, setHasNativeSupport] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [settings, setSettings] = useState<BlockingSettings | null>(null);

  useEffect(() => {
    loadProtectionStatus();
  }, []);

  const loadProtectionStatus = async () => {
    const status = await getContentProtectionStatus();
    const blockingSettings = await getBlockingSettings();
    
    setIsEnabled(status.enabled);
    setHasNativeSupport(status.nativeSupport);
    setHasPermissions(status.permissionsGranted);
    setSettings(blockingSettings);
  };

  const initialize = useCallback(async () => {
    await initializeContentProtection();
    await loadProtectionStatus();
  }, []);

  const checkURL = useCallback(async (url: string): Promise<boolean> => {
    return await checkAndBlockURL(url);
  }, []);

  const openURL = useCallback(async (url: string): Promise<boolean> => {
    return await safeOpenURL(url);
  }, []);

  const showBlockedNotification = useCallback((type: 'nsfw' | 'app' = 'nsfw') => {
    showContentBlockedNotification(type);
  }, []);

  const isNSFW = useCallback((url: string): boolean => {
    return detectNSFWContent(url);
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const granted = await requestContentProtectionPermissions();
    await loadProtectionStatus();
    return granted;
  }, []);

  const refresh = useCallback(async () => {
    await loadProtectionStatus();
  }, []);

  return {
    isEnabled,
    hasNativeSupport,
    hasPermissions,
    settings,
    initialize,
    checkURL,
    openURL,
    showBlockedNotification,
    isNSFW,
    requestPermissions,
    refresh,
  };
}
