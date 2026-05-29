import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image, ImageSourcePropType } from "react-native";

function TabBarIcon({ source, color }: { source: ImageSourcePropType; color: string }) {
  return (
    <Image
      source={source}
      style={{ width: 24, height: 24 }}
      tintColor={color}
      resizeMode="contain"
    />
  );
}

export default function TabsLayout() {
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
          },
          tabBarActiveTintColor: "#e2a23b",
          tabBarInactiveTintColor: "#4b6465",
          tabBarHideOnKeyboard: true,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: "Prayer Times",
            tabBarIcon: ({ color }) => (
              <TabBarIcon source={require("../../assets/tab-prayer.png")} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="masjid"
          options={{
            title: "Masjid",
            tabBarIcon: ({ color }) => (
              <TabBarIcon source={require("../../assets/tab-masjid.png")} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="focus"
          options={{
            title: "Focus",
            tabBarIcon: ({ color }) => (
              <TabBarIcon source={require("../../assets/tab-focus.png")} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: "ImamAI",
            tabBarIcon: ({ color }) => (
              <TabBarIcon source={require("../../assets/tab-chat.png")} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color }) => (
              <TabBarIcon source={require("../../assets/tab-settings.png")} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
