import React from "react";
import { Link, Stack } from "expo-router";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../lib/theme";
import { Feather } from "@expo/vector-icons";

export default function NotFoundScreen() {
  const { colors } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: "Page Not Found", headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="alert-triangle" size={48} color={colors.accentGold} />
          <Text style={[styles.title, { color: colors.text }]}>
            Page Not Found
          </Text>
          <Text
            style={[styles.subtitle, { color: colors.textSecondary }]}
          >
            The screen you requested does not exist or has moved.
          </Text>
          <Link href="/(tabs)" asChild>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.accentGold }]}
            >
              <Text style={styles.buttonText}>Return Home</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    maxWidth: 400,
    width: "100%",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: {
    color: "#0f1718",
    fontWeight: "700",
    fontSize: 15,
  },
});
