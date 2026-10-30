import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Linking, Platform, Alert, LayoutAnimation, UIManager, TextInput, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState, useMemo } from "react";
import { getCurrentLocation, getQuickLocation, Coordinates } from "../../lib/location";
import { getNearbyMasjids, Masjid, formatDistance, resolveSearchCenterAndQuery, getCachedMasjidsSync, calculateDistance } from "../../lib/masjid";
import { subscribeToWarmup } from "../../lib/backgroundWarmup";
import { Feather } from "@expo/vector-icons";
// UpdateMasjidTimingModal bypassed in favor of direct Google Form sync
import {
  applyTimingOverridesToMasjids,
  saveLocalTimingOverride,
  saveCustomAddedMasjid,
  submitTimingUpdateToBackend,
} from "../../lib/masjidTimingSync";

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}
// Configure your Google Form URL here (replace with your published Google Form link)
export const MASJID_UPDATE_FORM_URL: string = "https://docs.google.com/forms/d/e/1FAIpQLScEZdkbOjZG98Be0TuVvZDaDDq58SVmivTJ-3zBtrgO2OPEKQ/viewform";

export default function MasjidScreen() {
  const cached = getCachedMasjidsSync();
  const [masjids, setMasjids] = useState<Masjid[]>(cached || []);
  const [loading, setLoading] = useState(!cached || cached.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [selectedMasjidId, setSelectedMasjidId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const handleOpenAddMasjid = async () => {
    try {
      await Linking.openURL(MASJID_UPDATE_FORM_URL);
    } catch (err) {
      Alert.alert("Unable to Open Form", "Please check your internet connection.");
    }
  };

  const handleUpdateTimings = async (item?: Masjid) => {
    try {
      await Linking.openURL(MASJID_UPDATE_FORM_URL);
    } catch (err) {
      Alert.alert("Unable to Open Form", "Please check your internet connection.");
    }
  };

  // Listen to background warm-up service
  useEffect(() => {
    const unsubscribe = subscribeToWarmup(async () => {
      const fresh = getCachedMasjidsSync();
      if (fresh && fresh.length > 0) {
        const withOverrides = await applyTimingOverridesToMasjids(fresh, currentLocation);
        setMasjids(withOverrides);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [currentLocation]);

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

  const filteredMasjids = useMemo(() => {
    const query = getCleanedLocalQuery();
    return masjids
      .filter(masjid => {
        if (!query) return true;
        return (
          masjid.name.toLowerCase().includes(query) ||
          masjid.address.toLowerCase().includes(query) ||
          (masjid.vicinity && masjid.vicinity.toLowerCase().includes(query)) ||
          (masjid.school && masjid.school.toLowerCase().includes(query))
        );
      })
      .map(masjid => {
        if (currentLocation) {
          return {
            ...masjid,
            distance: calculateDistance(currentLocation.latitude, currentLocation.longitude, masjid.latitude, masjid.longitude),
          };
        }
        return masjid;
      })
      .sort((a, b) => a.distance - b.distance);
  }, [masjids, searchQuery, currentLocation]);

  const loadMasjids = async (queryToSearch: string = searchQuery) => {
    try {
      setError(null);
      // Fast location retrieval (<2ms)
      const location = (await getQuickLocation()) || { latitude: 17.385044, longitude: 78.486671 };
      setCurrentLocation(location);

      // Parse the query for location keywords (e.g., "in Tolichowki" or "near Charminar")
      const { searchCenter, cleanedQuery } = await resolveSearchCenterAndQuery(queryToSearch, location);

      // Optimized radius: 25km for global searches, 12km for localized keywords, 3500m (3.5km) for default nearby view
      const hasSearchCenter = searchCenter.latitude !== location.latitude || searchCenter.longitude !== location.longitude;
      const searchRadius = queryToSearch.trim().length > 0 ? (hasSearchCenter ? 12000 : 25000) : 3500;

      const nearbyMasjids = await getNearbyMasjids(location, searchRadius, cleanedQuery, searchCenter);
      const withOverrides = await applyTimingOverridesToMasjids(nearbyMasjids, location);
      setMasjids(withOverrides);
      setLoading(false);

      // In the background, request fresh high-accuracy GPS coordinates and update distance
      getCurrentLocation().then(async (freshLoc) => {
        if (freshLoc) {
          setCurrentLocation(freshLoc);
          if (Math.abs(freshLoc.latitude - location.latitude) > 0.01 || Math.abs(freshLoc.longitude - location.longitude) > 0.01) {
            const freshMasjids = await getNearbyMasjids(freshLoc, searchRadius, cleanedQuery, searchCenter);
            const freshWithOverrides = await applyTimingOverridesToMasjids(freshMasjids, freshLoc);
            setMasjids(freshWithOverrides);
          }
        }
      }).catch(() => {});
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
    if (masjid.id.startsWith('fallback-') || masjid.id.startsWith('simulated-')) {
      const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(masjid.name + ' Masjid Hyderabad')}`;
      try {
        await Linking.openURL(searchUrl);
      } catch (err) {
        Alert.alert("Error", "Unable to open maps application");
      }
      return;
    }

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
            {item.isMuazzinVerified ? (
              <View style={[styles.localUpdateBadge, styles.muazzinVerifiedBadge]}>
                <Feather name="shield" size={10} color="#f59e0b" style={{ marginRight: 3 }} />
                <Text style={[styles.localUpdateBadgeText, styles.muazzinVerifiedBadgeText]}>
                  Verified by Muazzin 🕌
                </Text>
              </View>
            ) : item.isCustomAdded ? (
              <View style={[styles.localUpdateBadge, styles.customAddedBadge]}>
                <Feather name="plus-circle" size={10} color="#e2a23b" />
                <Text style={[styles.localUpdateBadgeText, { color: '#e2a23b' }]}>Added by you</Text>
              </View>
            ) : item.isLocalUpdate ? (
              <View style={styles.localUpdateBadge}>
                <Feather name="check" size={10} color="#10b981" />
                <Text style={styles.localUpdateBadgeText}>Updated by you</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.distance}>{formatDistance(item.distance)}</Text>
        </View>

        {/* Toggle Timing Board Button */}
        <TouchableOpacity
          style={[styles.toggleButton, isExpanded && styles.toggleButtonActive]}
          onPress={() => toggleMasjidTimings(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.toggleButtonContent}>
            <Text style={styles.toggleButtonText}>
              {isExpanded ? "Hide Timings" : "View Timings"}
            </Text>
            <Feather
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={15}
              color={isExpanded ? "#e2a23b" : "#94a4a2"}
            />
          </View>
        </TouchableOpacity>

        {/* Mahmood Watch Co. Style Digital LED Board (Expands and collapses with layout animation) */}
        {isExpanded && (
          <View style={styles.boardWrapper}>
            <View style={styles.ledBoard}>
              {/* Calligraphy Header Banner */}
              <View style={styles.ledBanner}>
                <Text style={styles.ledCalligraphy}>لَا إِلٰهَ إِلَّا ٱللَّٰهُ مُحَمَّدٌ رَسُولُ ٱللَّٰهِ</Text>
                {item.isMuazzinVerified && (
                  <View style={styles.muazzinBoardBanner}>
                    <Feather name="shield" size={10} color="#f59e0b" style={{ marginRight: 4 }} />
                    <Text style={styles.muazzinBoardBannerText}>Official Timings • Verified by Muazzin</Text>
                  </View>
                )}
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
              onPress={() => handleUpdateTimings(item)}
              activeOpacity={0.8}
            >
              <View style={styles.updatePromptHeader}>
                <View style={styles.updatePromptTitleRow}>
                  <Feather name="edit-3" size={13} color="#e2a23b" style={{ marginRight: 6 }} />
                  <Text style={styles.updatePromptTitle}>Update Timings</Text>
                </View>
                <View style={styles.updatePromptBadge}>
                  <Text style={styles.updatePromptBadgeText}>Earn Sadaqah</Text>
                </View>
              </View>
              <Text style={styles.updatePromptText}>
                Help your community pray on time. Tap to submit verified prayer times.
              </Text>
            </TouchableOpacity>

            {/* Google Maps Direction Button */}
            <TouchableOpacity
              style={styles.googleMapsButton}
              onPress={() => openInMaps(item)}
              activeOpacity={0.8}
            >
              <Feather name="navigation" size={16} color="#0d1a1b" style={{ marginRight: 8 }} />
              <Text style={styles.googleMapsButtonText}>Get Directions</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.title}>Nearby Masjid</Text>
            <Text style={styles.subtitle}>
              Find and connect to local masajid
            </Text>
          </View>
          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={handleOpenAddMasjid}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={14} color="#0f172a" style={{ marginRight: 4 }} />
            <Text style={styles.headerAddBtnText}>Add Masjid</Text>
          </TouchableOpacity>
        </View>

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
              <Feather name="x" size={14} color="#94a4a2" />
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
          <Feather name="map-pin" size={32} color="#64748b" style={{ marginBottom: 10 }} />
          <Text style={styles.emptyText}>No masjids found nearby</Text>
          <Text style={styles.emptySubtext}>Can't find your local masjid? Add it to help the community.</Text>
          <TouchableOpacity style={styles.emptyAddBtn} onPress={handleOpenAddMasjid} activeOpacity={0.8}>
            <Feather name="plus" size={14} color="#0f172a" style={{ marginRight: 6 }} />
            <Text style={styles.emptyAddBtnText}>Add Missing Masjid</Text>
          </TouchableOpacity>
        </View>
      ) : filteredMasjids.length === 0 ? (
        <View style={styles.centerContent}>
          <Feather name="search" size={32} color="#64748b" style={{ marginBottom: 10 }} />
          <Text style={styles.emptyText}>No matching masjids found</Text>
          <Text style={styles.emptySubtext}>Can't find your local masjid? Add it now to help everyone.</Text>
          <TouchableOpacity style={styles.emptyAddBtn} onPress={handleOpenAddMasjid} activeOpacity={0.8}>
            <Feather name="plus" size={14} color="#0f172a" style={{ marginRight: 6 }} />
            <Text style={styles.emptyAddBtnText}>Add Missing Masjid</Text>
          </TouchableOpacity>
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

      {/* Rerouting to Google Form directly for seamless sync and zero location bias */}
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
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  toggleButtonActive: {
    backgroundColor: "rgba(226, 162, 59, 0.08)",
    borderColor: "rgba(226, 162, 59, 0.25)",
  },
  toggleButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
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
    borderColor: "rgba(226, 162, 59, 0.18)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  updatePromptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  updatePromptTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  updatePromptTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffdda8",
  },
  updatePromptBadge: {
    backgroundColor: "rgba(226, 162, 59, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  updatePromptBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#e2a23b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  updatePromptText: {
    fontSize: 12,
    color: "#94a4a2",
    lineHeight: 16,
  },
  localUpdateBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 4,
  },
  localUpdateBadgeText: {
    color: "#10b981",
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  headerAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e2a23b",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    shadowColor: "#e2a23b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  headerAddBtnText: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e2a23b",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 14,
    shadowColor: "#e2a23b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyAddBtnText: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "700",
  },
  customAddedBadge: {
    backgroundColor: "rgba(226, 162, 59, 0.14)",
    borderColor: "rgba(226, 162, 59, 0.35)",
  },
  muazzinVerifiedBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.16)",
    borderColor: "rgba(245, 158, 11, 0.45)",
  },
  muazzinVerifiedBadgeText: {
    color: "#fbbf24",
    fontWeight: "700",
  },
  muazzinBoardBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "center",
  },
  muazzinBoardBannerText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#f59e0b",
    letterSpacing: 0.3,
  },
});
