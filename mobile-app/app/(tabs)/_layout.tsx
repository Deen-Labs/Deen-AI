import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, StyleSheet } from "react-native";
import { useEffect } from "react";
import { getCurrentLocation } from "../../lib/location";
import { getPrayerTimes } from "../../lib/prayerTimes";

export default function TabsLayout() {
  useEffect(() => {
    // Pre-fetch data in background to make tabs load instantly
    const prefetchData = async () => {
      try {
        const loc = await getCurrentLocation();
        if (loc) {
          // Pre-fetch and cache prayer times using the location
          await getPrayerTimes(loc.latitude, loc.longitude);
        }
      } catch (e) {
        console.warn("Background pre-fetch failed:", e);
      }
    };
    prefetchData();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
          tabBarActiveTintColor: "#e2a23b",
          tabBarInactiveTintColor: "#4b6465",
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
          }}
        />
        <Tabs.Screen
          name="focus"
          options={{
            title: "Focus",
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: "ImamAI",
          }}
        />
        <Tabs.Screen
          name="masjid"
          options={{
            title: "Masjid",
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
          }}
        />
        <Tabs.Screen
          name="prayer"
          options={{
            title: "Prayer Times",
          }}
        />
      </Tabs>
    </>
  );
}
