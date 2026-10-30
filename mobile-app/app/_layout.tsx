// import "../global.css";
import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { Alert } from "react-native";
import * as Linking from "expo-linking";
import SplashScreen from "../components/SplashScreen";
import { initializeContentProtection } from "../lib/contentProtection";
import { warmUpAppData } from "../lib/backgroundWarmup";
import PINModal from "../components/PINModal";
import { verifyPIN, isLocked } from "../lib/lock";
import { NativeModules } from "react-native";

const { ContentProtection } = NativeModules;

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  const [showUninstallPin, setShowUninstallPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Kick off background data warm-up immediately on app launch!
    warmUpAppData();

    // 2. Initialize content protection when app starts
    initializeContentProtection().catch(error => {
      console.error('Failed to initialize content protection:', error);
    });

    // Listen for Accessibility Service blocked deep links
    const handleDeepLink = async (event: Linking.EventType) => {
      const data = Linking.parse(event.url);
      if (data.hostname === 'blocked') {
        const rawUrl = String(data.queryParams?.url || "Unknown Site");
        const safeUrl = rawUrl.replace(/[\r\n\t<>]/g, '').slice(0, 80);
        Alert.alert(
          '🛡️ Content Blocked by DEEN AI',
          `Access to ${safeUrl} has been automatically blocked to protect your spiritual well-being.`,
          [{ text: 'I Understand', style: 'default' }],
          { cancelable: false }
        );
      } else if (data.hostname === 'unlock-uninstall') {
        const locked = await isLocked();
        if (locked) {
          setShowUninstallPin(true);
        }
      } else if (data.hostname === 'focus-blocked') {
        Alert.alert(
          '🎯 Focus Mode Active',
          'This app is temporarily blocked while your Focus session is running. Stay mindful and focused!',
          [{ text: 'Back to Focus', style: 'default' }]
        );
      } else if (data.hostname === 'blocked-keyword') {
        Alert.alert(
          '🛡️ Blocked Word Detected',
          `Inappropriate typing or content was detected on screen. DEEN AI has blocked it.`,
          [{ text: 'I Understand', style: 'default' }],
          { cancelable: false }
        );
      }
    };

    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink({ url });
    });

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => {
      subscription.remove();
    };
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  const handlePinSubmit = async (pin: string) => {
    setPinError(null);
    const valid = await verifyPIN(pin);
    if (valid) {
      setShowUninstallPin(false);
      if (ContentProtection && ContentProtection.temporarilyUnlockUninstall) {
        // Unlock for 1 minute (60000 ms)
        ContentProtection.temporarilyUnlockUninstall(60000);
        Alert.alert("Unlocked", "Uninstall and protection changes paused for 1 minute. You can now modify settings or uninstall the app.");
      }
    } else {
      setPinError("Invalid PIN");
    }
  };

  return (
    <SafeAreaProvider>
      <Slot />
      <PINModal
        visible={showUninstallPin}
        mode="verify"
        title="🔒 Uninstall Blocked"
        subtitle="Enter your PIN to temporarily allow uninstallation"
        error={pinError}
        onClose={() => {
          setShowUninstallPin(false);
          setPinError(null);
        }}
        onSubmit={handlePinSubmit}
      />
    </SafeAreaProvider>
  );
}
