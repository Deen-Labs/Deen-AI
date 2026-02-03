import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MasjidScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.content}>
        <Text style={styles.title}>Nearby Masjid</Text>
        <Text style={styles.subtitle}>
          Find and connect to local masajid for live updates
        </Text>
        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonText}>Coming Soon</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f1718",
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#f3f7f6",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#94a4a2",
    marginBottom: 20,
  },
  comingSoon: {
    backgroundColor: "#0c3033",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
  },
  comingSoonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffdda8",
  },
});
