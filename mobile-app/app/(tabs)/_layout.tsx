import { useTheme } from "../../lib/theme";
import { useLanguage } from "../../lib/i18n";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import { useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { warmUpAppData } from "../../lib/backgroundWarmup";

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    warmUpAppData();
  }, []);

  const extraSwipeBuffer = Platform.OS === "android" ? 14 : 10;
  const bottomPadding = Math.max(insets.bottom, Platform.OS === "ios" ? 20 : 14) + extraSwipeBuffer;
  const tabBarHeight = 58 + bottomPadding;

  return (
    <>
      <StatusBar style={colors.statusBar} />
      <Tabs
        backBehavior="history"
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.borderSubtle,
            borderTopWidth: 1,
            height: tabBarHeight,
            paddingBottom: bottomPadding,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
          },
          tabBarActiveTintColor: colors.accentGold,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarHideOnKeyboard: true,
        }}>
        {/* 1. Home Tab */}
        <Tabs.Screen
          name="index"
          options={{
            title: t('tabs.home', 'Home'),
            tabBarIcon: ({ color, size }) => (
              <Feather name="home" size={size || 22} color={color as string} />
            ),
          }}
        />

        {/* 2. Masjid Tab */}
        <Tabs.Screen
          name="masjid"
          options={{
            title: t('tabs.masjid', 'Masjid'),
            tabBarIcon: ({ color, size }) => (
              <Feather name="map-pin" size={size || 22} color={color as string} />
            ),
          }}
        />

        {/* 3. Focus Tab */}
        <Tabs.Screen
          name="focus"
          options={{
            title: t('tabs.focus', 'Focus'),
            tabBarIcon: ({ color, size }) => (
              <Feather name="target" size={size || 22} color={color as string} />
            ),
          }}
        />

        {/* 4. Friday Topics Tab (Jumu'ah) */}
        <Tabs.Screen
          name="friday-topics"
          options={{
            title: t('tabs.jumuah', "Jumu'ah"),
            tabBarIcon: ({ color, size }) => (
              <Feather name="mic" size={size || 22} color={color as string} />
            ),
          }}
        />

        {/* 5. More Tab (Deen Hub & Settings) */}
        <Tabs.Screen
          name="more"
          options={{
            title: t('tabs.more', 'More'),
            tabBarIcon: ({ color, size }) => (
              <Feather name="grid" size={size || 22} color={color as string} />
            ),
          }}
        />

        {/* Hidden internal routes to preserve deep links and navigation compatibility */}
        <Tabs.Screen
          name="chat"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="prayer"
          options={{
            href: null,
          }}
        />

      </Tabs>
    </>
  );
}
