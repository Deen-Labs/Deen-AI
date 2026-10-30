import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import { useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { warmUpAppData } from "../../lib/backgroundWarmup";

export default function TabsLayout() {
  useEffect(() => {
    warmUpAppData();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#0b2527",
            borderTopColor: "rgba(255, 255, 255, 0.08)",
            borderTopWidth: 1,
            height: Platform.OS === "ios" ? 86 : 64,
            paddingBottom: Platform.OS === "ios" ? 26 : 10,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
          },
          tabBarActiveTintColor: "#e2a23b",
          tabBarInactiveTintColor: "#587274",
          tabBarHideOnKeyboard: true,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Feather name="shield" size={size || 22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="prayer"
          options={{
            title: "Prayer",
            tabBarIcon: ({ color, size }) => (
              <Feather name="clock" size={size || 22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="focus"
          options={{
            title: "Focus",
            tabBarIcon: ({ color, size }) => (
              <Feather name="target" size={size || 22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: "Imam AI",
            tabBarIcon: ({ color, size }) => (
              <Feather name="message-circle" size={size || 22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="masjid"
          options={{
            title: "Masjid",
            tabBarIcon: ({ color, size }) => (
              <Feather name="map-pin" size={size || 22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </>
  );
}
