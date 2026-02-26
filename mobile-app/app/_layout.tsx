// import "../global.css";
import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { Alert } from "react-native";
import * as Linking from "expo-linking";
import SplashScreen from "../components/SplashScreen";
import { initializeContentProtection } from "../lib/contentProtection";

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Initialize content protection when app starts
    initializeContentProtection().catch(error => {
      console.error('Failed to initialize content protection:', error);
    });

    // Listen for Accessibility Service blocked deep links
    const handleDeepLink = (event: Linking.EventType) => {
      const data = Linking.parse(event.url);
      if (data.hostname === 'blocked') {
        const blockedUrl = data.queryParams?.url || "Unknown Site";
        Alert.alert(
          '🛡️ Content Blocked by DEEN AI',
          `Access to ${blockedUrl} has been automatically blocked to protect your spiritual well-being.`,
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

  return (
    <SafeAreaProvider>
      <Slot />
    </SafeAreaProvider>
  );
}
