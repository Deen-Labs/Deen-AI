import { View, Text, StyleSheet, Image, Platform } from "react-native";
import { useEffect } from "react";

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          {Platform.OS === 'web' ? (
            <img 
              src={require("../assets/logo.png")} 
              alt="Deen AI Logo"
              style={{ width: 240, height: 240, objectFit: 'contain' }}
            />
          ) : (
            <Image
              source={require("../assets/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          )}
        </View>
        <Text style={styles.loadingText}>initializing deen a.i.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0a0f12",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  content: {
    alignItems: "center",
    gap: 18,
  },
  logoContainer: {
    width: 240,
    height: 240,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 240,
    height: 240,
  },
  loadingText: {
    color: "#d6e2e0",
    letterSpacing: 3,
    fontWeight: "600",
    fontSize: 14,
  },
});
