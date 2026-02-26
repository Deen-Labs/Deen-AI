import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Linking, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { getCurrentLocation, Coordinates } from "../../lib/location";
import { getNearbyMasjids, Masjid, formatDistance } from "../../lib/masjid";

export default function MasjidScreen() {
  const [masjids, setMasjids] = useState<Masjid[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);

  const loadMasjids = async () => {
    try {
      setError(null);
      const location = await getCurrentLocation();
      
      if (!location) {
        setError("Unable to get your location. Please enable location services.");
        setLoading(false);
        return;
      }
setCurrentLocation(location);
      
      const nearbyMasjids = await getNearbyMasjids(location, 10000); // 10km radius
      setMasjids(nearbyMasjids);
    } catch (err) {
      setError("Failed to load nearby masjids. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMasjids();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadMasjids();
  };

  const openInMaps = async (masjid: Masjid) => {
    if (!currentLocation) {
      Alert.alert("Error", "Current location not available");
      return;
    }

    const { latitude: originLat, longitude: originLng } = currentLocation;
    const { latitude: destLat, longitude: destLng } = masjid;

    // Construct the appropriate URL based on platform
    let url = '';
    
    if (Platform.OS === 'ios') {
      // iOS: Use Apple Maps or Google Maps if installed
      url = `maps://app?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}`;
      
      // Check if Apple Maps can open the URL
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        // Fallback to Google Maps URL scheme
        url = `comgooglemaps://?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}&directionsmode=driving`;
        const canOpenGoogle = await Linking.canOpenURL(url);
        if (!canOpenGoogle) {
          // Final fallback to browser
          url = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;
        }
      }
    } else {
      // Android: Use Google Maps
      url = `google.navigation:q=${destLat},${destLng}&mode=d`;
      
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        // Fallback to browser
        url = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;
      }
    }

    try {
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert("Error", "Unable to open maps application");
      console.error("Error opening maps:", err);
    }
  };

  const renderMasjidItem = ({ item }: { item: Masjid }) => (
    <TouchableOpacity style={styles.masjidCard} onPress={() => openInMaps(item)}>
      <View style={styles.masjidHeader}>
        <Text style={styles.masjidName}>{item.name}</Text>
        <Text style={styles.distance}>{formatDistance(item.distance)}</Text>
      </View>
      <Text style={styles.address} numberOfLines={2}>{item.address}</Text>
      {item.vicinity && (
        <Text style={styles.vicinity}>{item.vicinity}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Masjid</Text>
        <Text style={styles.subtitle}>
          Find and connect to local masajid
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#e2a23b" />
          <Text style={styles.loadingText}>Finding nearby masjids...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadMasjids}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : masjids.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>No masjids found nearby</Text>
          <Text style={styles.emptySubtext}>Try expanding your search radius</Text>
        </View>
      ) : (
        <FlatList
          data={masjids}
          renderItem={renderMasjidItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#e2a23b"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f1718",
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#f3f7f6",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#94a4a2",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#94a4a2",
  },
  errorText: {
    fontSize: 16,
    color: "#ff6b6b",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#e2a23b",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#0d1a1b",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#94a4a2",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#4b6465",
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
  },
  masjidCard: {
    backgroundColor: "#0c3033",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  masjidHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  masjidName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#f3f7f6",
    flex: 1,
    marginRight: 12,
  },
  distance: {
    fontSize: 14,
    fontWeight: "600",
    color: "#e2a23b",
    backgroundColor: "rgba(226, 162, 59, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  address: {
    fontSize: 14,
    color: "#94a4a2",
    marginBottom: 4,
  },
  vicinity: {
    fontSize: 12,
    color: "#4b6465",
  },
});
