import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Linking, Platform, Alert, LayoutAnimation, UIManager, TextInput, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { getCurrentLocation, Coordinates } from "../../lib/location";
import { getNearbyMasjids, Masjid, formatDistance, resolveSearchCenterAndQuery } from "../../lib/masjid";

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export default function MasjidScreen() {
  const [masjids, setMasjids] = useState<Masjid[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [selectedMasjidId, setSelectedMasjidId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleGlobalSearch = async () => {
    Keyboard.dismiss();
    setLoading(true);
    await loadMasjids();
  };

  const getCleanedLocalQuery = () => {
    let query = searchQuery.toLowerCase().trim();
    if (!query) return "";

    const prepositions = ["in", "near", "at", "around"];
    const neighborhoods = [
      "banjara hills", "jubilee hills", "mehdipatnam", "mallepally", "tolichowki",
      "charminar", "gachibowli", "secunderabad", "nampally", "amberpet",
      "himayatnagar", "begumpet", "kukatpally", "malakpet", "hitech city",
      "madhapur", "old city", "khairatabad", "somajiguda", "ameerpet",
      "yousufguda", "tarnaka"
    ];

    for (const nKey of neighborhoods) {
      if (query.includes(nKey)) {
        for (const prep of prepositions) {
          query = query.replace(new RegExp(`\\b${prep}\\s+${nKey}\\b`, 'g'), '');
        }
        query = query.replace(new RegExp(`\\b${nKey}\\b`, 'g'), '').trim();
      }
    }

    for (const prep of prepositions) {
      const match = query.match(new RegExp(`\\b${prep}\\s+([a-z0-9\\s]{3,20})$`));
      if (match && match[1]) {
        query = query.replace(new RegExp(`\\b${prep}\\s+${match[1]}\\b`, 'g'), '').trim();
      }
    }

    return query.replace(/\s+/g, ' ').trim();
  };

  const filteredMasjids = masjids.filter(masjid => {
    const query = getCleanedLocalQuery();
    if (!query) return true;
    return (
      masjid.name.toLowerCase().includes(query) ||
      masjid.address.toLowerCase().includes(query) ||
      (masjid.vicinity && masjid.vicinity.toLowerCase().includes(query)) ||
      (masjid.school && masjid.school.toLowerCase().includes(query))
    );
  });

  const loadMasjids = async (queryToSearch: string = searchQuery) => {
    try {
      setError(null);
      const location = await getCurrentLocation();

      if (!location) {
        setError("Unable to get your location. Please enable location services.");
        setLoading(false);
        return;
      }
      setCurrentLocation(location);

      // Parse the query for location keywords (e.g., "in Tolichowki" or "near Charminar")
      const { searchCenter, cleanedQuery } = await resolveSearchCenterAndQuery(queryToSearch, location);

      // Set optimized radius: 35km for global searches; 12km if locked to a localized search center; 15km for default views.
      const hasSearchCenter = searchCenter.latitude !== location.latitude || searchCenter.longitude !== location.longitude;
      const searchRadius = queryToSearch.trim().length > 0 ? (hasSearchCenter ? 12000 : 35000) : 15000;

      const nearbyMasjids = await getNearbyMasjids(location, searchRadius, cleanedQuery, searchCenter);
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

  const toggleMasjidTimings = (masjidId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedMasjidId(prevId => prevId === masjidId ? null : masjidId);
  };

  const openInMaps = async (masjid: Masjid) => {
    if (!currentLocation) {
      Alert.alert("Error", "Current location not available");
      return;
    }

    const { latitude: originLat, longitude: originLng } = currentLocation;
    const { latitude: destLat, longitude: destLng } = masjid;

    let url = '';

    if (Platform.OS === 'ios') {
      url = `maps://app?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}`;
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        url = `comgooglemaps://?saddr=${originLat},${originLng}&daddr=${destLat},${destLng}&directionsmode=driving`;
        const canOpenGoogle = await Linking.canOpenURL(url);
        if (!canOpenGoogle) {
          url = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;
        }
      }
    } else {
      url = `google.navigation:q=${destLat},${destLng}&mode=d`;
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
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

  const renderMasjidItem = ({ item }: { item: Masjid }) => {
    const isExpanded = selectedMasjidId === item.id;
    return (
      <View style={styles.masjidCard}>
        {/* Card Header: Name, Address, and Distance */}
        <View style={styles.masjidHeader}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.masjidName}>{item.name}</Text>
            <Text style={styles.address} numberOfLines={2}>{item.address}</Text>
            {item.school && (
              <Text style={[
                styles.schoolTag,
                item.school === 'Ahle Hadees' ? styles.schoolAhleHadees : styles.schoolHanafi
              ]}>
                {item.school}
              </Text>
            )}
          </View>
          <Text style={styles.distance}>{formatDistance(item.distance)}</Text>
        </View>

        {/* Tap for Timings and Location Toggle Bar */}
        <TouchableOpacity
          style={[styles.toggleButton, isExpanded && styles.toggleButtonActive]}
          onPress={() => toggleMasjidTimings(item.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.toggleButtonText}>
            {isExpanded ? "▲ Tap to close timing board" : "▼ Tap for timings and location"}
          </Text>
        </TouchableOpacity>

        {/* Mahmood Watch Co. Style Digital LED Board (Expands and collapses with layout animation) */}
        {isExpanded && (
          <View style={styles.boardWrapper}>
            <View style={styles.ledBoard}>
              {/* Calligraphy Header Banner */}
              <View style={styles.ledBanner}>
                <Text style={styles.ledCalligraphy}>لَا إِلٰهَ إِلَّا ٱللَّٰهُ مُحَمَّدٌ رَسُولُ ٱللَّٰهِ</Text>
              </View>

              {/* Column Header Titles */}
              <View style={styles.ledRowHeader}>
                <Text style={[styles.ledHeaderCell, { flex: 1.4, textAlign: 'left' }]}>PRAYER</Text>
                <Text style={[styles.ledHeaderCell, { color: '#00ff66', textShadowColor: 'rgba(0, 255, 102, 0.5)' }]}>ATHAN</Text>
                <Text style={[styles.ledHeaderCell, { color: '#ff2a2a', textShadowColor: 'rgba(255, 42, 42, 0.5)' }]}>JAMA'AT</Text>
              </View>

              {/* Fajr */}
              <View style={styles.ledRow}>
                <View style={styles.ledLabelCol}>
                  <Text style={styles.ledArabicLabel}>فجر</Text>
                  <Text style={styles.ledEnglishLabel}>FAJR</Text>
                </View>
                <Text style={styles.ledAthanTime}>{item.athanTimes?.Fajr || "--:--"}</Text>
                <Text style={styles.ledJamaatTime}>{item.iqamahTimes?.Fajr || "--:--"}</Text>
              </View>

              {/* Sunrise */}
              <View style={styles.ledRow}>
                <View style={styles.ledLabelCol}>
                  <Text style={styles.ledArabicLabel}>طلوع</Text>
                  <Text style={styles.ledEnglishLabel}>SUNRISE</Text>
                </View>
                <Text style={styles.ledAthanTime}>{item.sunrise || "--:--"}</Text>
                <Text style={styles.ledDisabledTime}>--:--</Text>
              </View>

              {/* Dhuhr */}
              <View style={styles.ledRow}>
                <View style={styles.ledLabelCol}>
                  <Text style={styles.ledArabicLabel}>ظهر</Text>
                  <Text style={styles.ledEnglishLabel}>DHUHR</Text>
                </View>
                <Text style={styles.ledAthanTime}>{item.athanTimes?.Dhuhr || "--:--"}</Text>
                <Text style={styles.ledJamaatTime}>{item.iqamahTimes?.Dhuhr || "--:--"}</Text>
              </View>

              {/* Asr */}
              <View style={styles.ledRow}>
                <View style={styles.ledLabelCol}>
                  <Text style={styles.ledArabicLabel}>عصر</Text>
                  <Text style={styles.ledEnglishLabel}>ASR</Text>
                </View>
                <Text style={styles.ledAthanTime}>{item.athanTimes?.Asr || "--:--"}</Text>
                <Text style={styles.ledJamaatTime}>{item.iqamahTimes?.Asr || "--:--"}</Text>
              </View>

              {/* Maghrib */}
              <View style={styles.ledRow}>
                <View style={styles.ledLabelCol}>
                  <Text style={styles.ledArabicLabel}>مغرب</Text>
                  <Text style={styles.ledEnglishLabel}>MAGHRIB</Text>
                </View>
                <Text style={styles.ledAthanTime}>{item.athanTimes?.Maghrib || "--:--"}</Text>
                <Text style={styles.ledJamaatTime}>{item.iqamahTimes?.Maghrib || "--:--"}</Text>
              </View>

              {/* Isha */}
              <View style={styles.ledRow}>
                <View style={styles.ledLabelCol}>
                  <Text style={styles.ledArabicLabel}>عشاء</Text>
                  <Text style={styles.ledEnglishLabel}>ISHA</Text>
                </View>
                <Text style={styles.ledAthanTime}>{item.athanTimes?.Isha || "--:--"}</Text>
                <Text style={styles.ledJamaatTime}>{item.iqamahTimes?.Isha || "--:--"}</Text>
              </View>

              <View style={styles.ledBoardDivider} />

              {/* Jummah */}
              <View style={styles.ledRow}>
                <View style={styles.ledLabelCol}>
                  <Text style={styles.ledArabicLabel}>جمعة</Text>
                  <Text style={styles.ledEnglishLabel}>JUMMAH</Text>
                </View>
                <Text style={styles.ledDisabledTime}>--:--</Text>
                <Text style={styles.ledJamaatTime}>{item.jummah || "1:30"}</Text>
              </View>

              {/* Sahar */}
              <View style={styles.ledRow}>
                <View style={styles.ledLabelCol}>
                  <Text style={styles.ledArabicLabel}>سحر</Text>
                  <Text style={styles.ledEnglishLabel}>SAHAR</Text>
                </View>
                <Text style={styles.ledAthanTime}>{item.suhoor || "--:--"}</Text>
                <Text style={styles.ledDisabledTime}>--:--</Text>
              </View>

              {/* Iftar */}
              <View style={styles.ledRow}>
                <View style={styles.ledLabelCol}>
                  <Text style={styles.ledArabicLabel}>افطار</Text>
                  <Text style={styles.ledEnglishLabel}>IFTAR</Text>
                </View>
                <Text style={styles.ledDisabledTime}>--:--</Text>
                <Text style={styles.ledJamaatTime}>{item.iftar || "--:--"}</Text>
              </View>
            </View>

            {/* Sadaqah Jariyah Update Timings Prompt */}
            <TouchableOpacity
              style={styles.updatePromptContainer}
              onPress={() => {
                const formUrl = `https://docs.google.com/forms/d/e/1FAIpQLSfD_YOUR_FORM_ID_HERE/viewform?usp=pp_url&entry.1000001=${encodeURIComponent(item.id)}&entry.1000002=${encodeURIComponent(item.name)}&entry.1000003=${encodeURIComponent(item.address)}`;
                Linking.openURL(formUrl).catch((err) => {
                  Alert.alert("Error", "Could not open the update form");
                  console.error(err);
                });
              }}
              activeOpacity={0.8}
            >
              <View style={styles.updatePromptHeader}>
                <Text style={styles.updatePromptTitle}>Timings incorrect or unverified?</Text>
                <Text style={styles.updatePromptBadge}>Earn Sadaqah Jariyah ✨</Text>
              </View>
              <Text style={styles.updatePromptText}>
                Help your local community pray on time! Tap here to submit the correct timing sheet for this masjid and earn continuous reward.
              </Text>
            </TouchableOpacity>

            {/* Google Maps Direction Router Button */}
            <TouchableOpacity
              style={styles.googleMapsButton}
              onPress={() => openInMaps(item)}
              activeOpacity={0.8}
            >
              <Text style={styles.googleMapsButtonText}>Route to Google Maps from your current location</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Masjid</Text>
        <Text style={styles.subtitle}>
          Find and connect to local masajid
        </Text>

        {/* Sleek Search Bar */}
        <View style={styles.searchBarContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search masajids here"
            placeholderTextColor="#5c7375"
            value={searchQuery}
            onChangeText={(text) => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setSearchQuery(text);
            }}
            onSubmitEditing={handleGlobalSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={async () => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setSearchQuery("");
                setLoading(true);
                await loadMasjids("");
              }}
              style={styles.clearSearchButton}
              activeOpacity={0.7}
            >
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.searchActionButton}
            onPress={handleGlobalSearch}
            activeOpacity={0.7}
          >
            <Text style={styles.searchActionButtonText}>Search</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#e2a23b" />
          <Text style={styles.loadingText}>Finding nearby masjids...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadMasjids()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : masjids.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>No masjids found nearby</Text>
          <Text style={styles.emptySubtext}>Try expanding your search radius</Text>
        </View>
      ) : filteredMasjids.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>No matching masjids found</Text>
          <Text style={styles.emptySubtext}></Text>
        </View>
      ) : (
        <FlatList
          data={filteredMasjids}
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
  searchBarContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    height: 48,
  },
  searchInput: {
    flex: 1,
    color: "#f3f7f6",
    fontSize: 14,
    height: "100%",
    paddingVertical: 4,
  },
  clearSearchButton: {
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  clearSearchText: {
    color: "#94a4a2",
    fontSize: 14,
    fontWeight: "bold",
  },
  searchActionButton: {
    backgroundColor: "#e2a23b",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  searchActionButtonText: {
    color: "#0d1a1b",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
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
    marginBottom: 4,
  },
  schoolTag: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    alignSelf: "flex-start",
  },
  schoolHanafi: {
    color: "#ffdda8",
  },
  schoolAhleHadees: {
    color: "#8ce2ff",
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
    marginBottom: 4,
  },
  toggleButton: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    marginTop: 12,
  },
  toggleButtonActive: {
    backgroundColor: "rgba(226, 162, 59, 0.08)",
    borderColor: "rgba(226, 162, 59, 0.2)",
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#f3f7f6",
  },
  boardWrapper: {
    marginTop: 16,
    overflow: "hidden",
  },
  ledBoard: {
    backgroundColor: "#080808",
    borderColor: "#4a3321",
    borderWidth: 4,
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  ledBanner: {
    alignItems: "center",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderColor: "#1a1a1a",
    paddingBottom: 8,
  },
  ledCalligraphy: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#e2a23b",
    textShadowColor: "rgba(226, 162, 59, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
    textAlign: "center",
  },
  ledRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderColor: "#1f1f1f",
  },
  ledHeaderCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
    color: "#94a4a2",
    textAlign: "center",
  },
  ledRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderColor: "#0f0f0f",
  },
  ledLabelCol: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
  },
  ledArabicLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#e2a23b",
    width: 45,
    textAlign: "left",
    textShadowColor: "rgba(226, 162, 59, 0.4)",
    textShadowRadius: 4,
  },
  ledEnglishLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#e2a23b",
    textShadowColor: "rgba(226, 162, 59, 0.4)",
    textShadowRadius: 4,
  },
  ledAthanTime: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#00ff66",
    textAlign: "center",
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textShadowColor: "rgba(0, 255, 102, 0.6)",
    textShadowRadius: 6,
  },
  ledJamaatTime: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#ff2a2a",
    textAlign: "center",
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textShadowColor: "rgba(255, 42, 42, 0.6)",
    textShadowRadius: 6,
  },
  ledDisabledTime: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#242829",
    textAlign: "center",
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  ledBoardDivider: {
    height: 1.5,
    backgroundColor: "#1a1a1a",
    marginVertical: 8,
  },
  googleMapsButton: {
    backgroundColor: "#e2a23b",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  googleMapsButtonText: {
    color: "#0d1a1b",
    fontSize: 14,
    fontWeight: "700",
  },
  updatePromptContainer: {
    backgroundColor: "rgba(226, 162, 59, 0.04)",
    borderColor: "rgba(226, 162, 59, 0.15)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  updatePromptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  updatePromptTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffdda8",
  },
  updatePromptBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: "#e2a23b",
    backgroundColor: "rgba(226, 162, 59, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  updatePromptText: {
    fontSize: 12,
    color: "#94a4a2",
    lineHeight: 16,
  },
});
