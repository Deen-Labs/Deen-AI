import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";

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
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: "Prayer Times",
            tabBarIcon: ({ color }) => <TabBarIcon name="clock" color={color} />,
          }}
        />
        <Tabs.Screen
          name="masjid"
          options={{
            title: "Masjid",
            tabBarIcon: ({ color }) => <TabBarIcon name="map-marker" color={color} />,
          }}
        />
        <Tabs.Screen
          name="focus"
          options={{
            title: "Focus",
            tabBarIcon: ({ color }) => <TabBarIcon name="block-helper" color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
          }}
        />
      </Tabs>
    </>
  );
}

function TabBarIcon({ name, color }: { name: string; color: string }) {
  // Placeholder for icons - we'll add proper icons later
  return null;
}
