import { ThemeProvider } from "../lib/theme";
import { LanguageProvider } from "../lib/i18n";
import { Stack, useRouter } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { Alert } from "react-native";
import * as Linking from "expo-linking";
import SplashScreen from "../components/SplashScreen";
import { initializeContentProtection } from "../lib/contentProtection";
import { warmUpAppData } from "../lib/backgroundWarmup";
import { checkForceUpdate } from "../lib/community";
import MindfulBarrierModal from "../components/MindfulBarrierModal";
import FirstTimeWalkthroughModal from "../components/FirstTimeWalkthroughModal";
import { isWalkthroughCompleted } from "../lib/onboarding";
import { NativeModules } from "react-native";

const { ContentProtection } = NativeModules;

export default function RootLayout() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [mindfulBarrierVisible, setMindfulBarrierVisible] = useState(false);
  const [mindfulBarrierUrl, setMindfulBarrierUrl] = useState('');

  useEffect(() => {
    // 1. Kick off background data warm-up immediately on app launch!
    warmUpAppData();

    // Check if first-time onboarding / walkthrough is needed
    isWalkthroughCompleted().then((completed) => {
      if (!completed) {
        setShowWalkthrough(true);
      }
    });

    // 2. Initialize content protection when app starts
    initializeContentProtection().catch(error => {
      console.error('Failed to initialize content protection:', error);
    });

    // 3. Non-blocking Force Update check on launch
    checkForceUpdate().then((info) => {
      if (info.updateRequired) {
        Alert.alert(
          "Update Required",
          `A new version (${info.versionToUpdate}) of DeenHub is available.\n\nWhat's new:\n${info.whatsNew}`,
          [
            { text: "Later", style: "cancel" },
            {
              text: "Update Now",
              onPress: () => {
                Linking.openURL(info.url).catch(() => {});
              },
            },
          ]
        );
      }
    }).catch(() => {});

    // Listen for Accessibility Service blocked deep links
    const handleDeepLink = async (event: Linking.EventType) => {
      const data = Linking.parse(event.url);
      if (data.hostname === 'blocked') {
        const type = String(data.queryParams?.type || 'site');
        const url = String(data.queryParams?.url || '');
        const pkg = String(data.queryParams?.pkg || '');
        try {
          router.push({
            pathname: '/blocked',
            params: { type, url, pkg },
          });
        } catch (e) {
          console.warn('Navigation to blocked screen failed:', e);
        }
      } else if (data.hostname === 'focus-blocked') {
        const pkg = String(data.queryParams?.pkg || '');
        try {
          router.push({
            pathname: '/blocked',
            params: { type: 'app', pkg },
          });
        } catch (e) {
          console.warn('Navigation to blocked screen failed:', e);
        }
      } else if (data.hostname === 'blocked-keyword') {
        try {
          router.push({
            pathname: '/blocked',
            params: { type: 'site', url: 'Prohibited keyword' },
          });
        } catch (e) {
          console.warn('Navigation to blocked screen failed:', e);
        }
      } else if (data.hostname === 'mindful-barrier') {
        const url = String(data.queryParams?.url || '');
        setMindfulBarrierUrl(url);
        setMindfulBarrierVisible(true);
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



  return (
    <ThemeProvider>
      <LanguageProvider>
        <SafeAreaProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "slide_from_right",
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="hub" options={{ headerShown: false }} />
            <Stack.Screen name="blocked" options={{ headerShown: false }} />
            <Stack.Screen name="focus-blocked" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" options={{ headerShown: false }} />
          </Stack>
          {showSplash ? (
            <SplashScreen onFinish={() => setShowSplash(false)} />
          ) : (
            <>
              <FirstTimeWalkthroughModal
                visible={!showSplash && showWalkthrough}
                onClose={() => setShowWalkthrough(false)}
              />
              <MindfulBarrierModal
                visible={mindfulBarrierVisible}
                blockedUrl={mindfulBarrierUrl}
                onClose={() => setMindfulBarrierVisible(false)}
              />
            </>
          )}
        </SafeAreaProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
