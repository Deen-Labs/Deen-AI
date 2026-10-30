export function toTitleCase(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
import { useTheme } from "../../lib/theme";
import { useLanguage } from "../../lib/i18n";
import { useResponsiveLayout } from "../../lib/responsive";
import MasjidLedBoard from "../../components/MasjidLedBoard";
import { getNextPrayer, formatTime } from "../../lib/prayerTimes";
import { useRouter, useLocalSearchParams } from "expo-router";
import { fetchSalahTimeJuma, SalahTimeJuma, fetchSalahTimeTopics, SalahTimeTopic, getMasjidJumaTopics, MasjidJumaHistory } from "../../lib/salahTimeBackend";
import { syncMuazzinKhutbahReminders, checkAndScheduleUpdaterReminders } from "../../lib/muazzinNotifications";
import { View, Text, StyleSheet, FlatList, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl, Linking, Platform, Alert, LayoutAnimation, UIManager, TextInput, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState, useMemo } from "react";
import { getCurrentLocation, getQuickLocation, subscribeToLocationUpdates, forceRefreshLocation, Coordinates } from "../../lib/location";
import { getNearbyMasjids, Masjid, formatDistance, resolveSearchCenterAndQuery, getCachedMasjidsSync, calculateDistance } from "../../lib/masjid";
import { subscribeToWarmup } from "../../lib/backgroundWarmup";
import { Feather } from "@expo/vector-icons";
import UpdateMasjidTimingModal, { TimingFormData } from "../../components/UpdateMasjidTimingModal";
import MuazzinLoginModal from "../../components/MuazzinLoginModal";
import MasjidFeedbackModal from "../../components/MasjidFeedbackModal";
import FirstTimeWalkthroughModal from "../../components/FirstTimeWalkthroughModal";
import { logoutImam, clearAllCustomAddedMasjids, deleteCustomAddedMasjid, getDefaultMasjidId, setDefaultMasjidId } from "../../lib/masjidTimingSync";
import { getCurrentUser, UserProfile, canManageMasjid, getDisplayRoleLabel } from "../../lib/auth";
import { formatLastUpdated, isTimingStale, getMasjidJazakCount, getBaselineJazakCount, sendJazakAllahToUpdater, requestTimingUpdate } from "../../lib/community";
import {
  applyTimingOverridesToMasjids,
  saveLocalTimingOverride,
  saveCustomAddedMasjid,
  submitTimingUpdateToBackend,
  getPinnedMasjidId,
  setPinnedMasjidId,
  resolveActiveMasjid,
  pushMasjidTimingToFirestore,
  getImamSession,
  verifyAndLoginImam,
  ImamSession,
} from "../../lib/masjidTimingSync";

// Enable LayoutAnimation on Android in Old Architecture (no-op in Fabric New Architecture)
const isFabric = Boolean(
  (global as any).nativeFabricUIManager ||
  (global as any).__turboModuleProxy
);
if (Platform.OS === 'android' && !isFabric) {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}
// Configure your Google Form URL here (replace with your published Google Form link)
export const MASJID_UPDATE_FORM_URL: string = "https://docs.google.com/forms/d/e/1FAIpQLScEZdkbOjZG98Be0TuVvZDaDDq58SVmivTJ-3zBtrgO2OPEKQ/viewform";

export default function MasjidScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { contentContainerStyle, tableMaxWidthStyle } = useResponsiveLayout();
  const cached = getCachedMasjidsSync();
  const [masjids, setMasjids] = useState<Masjid[]>(cached || []);
  const [loading, setLoading] = useState(!cached || cached.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [selectedMasjidId, setSelectedMasjidId] = useState<string | null>(null);
  const PAGE_SIZE = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedMasjidIds, setExpandedMasjidIds] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<'nearby' | 'az'>('nearby');
  const [updateModalScope, setUpdateModalScope] = useState<'all' | 'details' | 'timings'>('all');
  const [masjidJazakCounts, setMasjidJazakCounts] = useState<Record<string, number>>({});

  const handleSendJazak = async (m: Masjid) => {
    try {
      const res = await sendJazakAllahToUpdater(m.id, m.name, m.updatedBy, m.updatedByUid);
      if (res.success) {
        setMasjidJazakCounts(prev => ({ ...prev, [m.id]: res.newCount }));
        Alert.alert("🤲 JazakAllahu Khairan!", res.message);
      } else {
        Alert.alert("Cooldown Active", res.message);
      }
    } catch (err: any) {
      Alert.alert("Notice", err.message || "Could not send JazakAllah.");
    }
  };

  const handleRequestUpdate = async (m: Masjid) => {
    try {
      const res = await requestTimingUpdate(m.id, m.name);
      Alert.alert("Request Submitted", res.message);
    } catch {
      Alert.alert("Notice", "Unable to submit update request. Please check internet connection.");
    }
  };
  const [editingMasjid, setEditingMasjid] = useState<Masjid | null>(null);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'update' | 'add'>('update');
  const [defaultMasjidId, setDefaultMasjidIdState] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [imamSession, setImamSession] = useState<ImamSession | null>(null);
  const [isMuazzinLoginModalVisible, setIsMuazzinLoginModalVisible] = useState(false);
  const [feedbackMasjid, setFeedbackMasjid] = useState<Masjid | null>(null);
  const [isFeedbackModalVisible, setIsFeedbackModalVisible] = useState(false);
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ openAdd?: string; walkthrough?: string }>();
  const [isWalkthroughVisible, setIsWalkthroughVisible] = useState(false);
  const [walkthroughMode, setWalkthroughMode] = useState<'general' | 'masjid_onboarding'>('masjid_onboarding');
  const [activeFilterTab, setActiveFilterTab] = useState<'nearby' | 'juma' | 'taraweeh'>('nearby');
  const [jumaList, setJumaList] = useState<SalahTimeJuma[]>([]);
  const [topics, setTopics] = useState<SalahTimeTopic[]>([]);

  // Nearest masjid Jumu'ah Khutbah topic based on live user GPS proximity
  const nearestKhutbah = useMemo(() => {
    if (!jumaList || jumaList.length === 0) return null;
    for (const m of masjids) {
      const history = getMasjidJumaTopics(m.id, m.name, jumaList);
      if (history.current) {
        return {
          masjidName: m.name,
          distance: m.distance,
          topic: history.current,
        };
      }
    }
    return {
      masjidName: jumaList[0].masjidName,
      distance: undefined,
      topic: jumaList[0],
    };
  }, [masjids, jumaList]);
  useEffect(() => {
    getDefaultMasjidId().then((def) => {
      setDefaultMasjidIdState(def);
    });
    getCurrentUser().then((u) => {
      setUserProfile(u);
    });
    getImamSession().then((session) => {
      setImamSession(session);
      syncMuazzinKhutbahReminders(session).catch(() => {});
    });
    fetchSalahTimeJuma().then((jumas) => {
      setJumaList(jumas);
    }).catch(() => {});
    fetchSalahTimeTopics().then((tList) => {
      setTopics(tList);
    }).catch(() => {});
  }, []);

  const handleMuazzinBadgePress = () => {
    if (!imamSession) {
      setIsMuazzinLoginModalVisible(true);
      return;
    }

    Alert.alert(
      'Muazzin Session Active',
      `Logged in as: ${imamSession.imamName}\nYou have official verified timing publishing privileges.`,
      [
        {
          text: 'Quick Update Timings',
          onPress: () => {
            const active = selectedMasjidId ? masjids.find(m => m.id === selectedMasjidId) : masjids[0];
            handleUpdateTimings(active || undefined);
          },
        },
        {
          text: 'Logout Session',
          style: 'destructive',
          onPress: async () => {
            await logoutImam();
            setImamSession(null);
            syncMuazzinKhutbahReminders(null).catch(() => {});
            Alert.alert('Logged Out', 'You have logged out of Muazzin mode.');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleDeleteCustomMasjid = async (masjidId: string) => {
    Alert.alert(
      'Delete Masjid',
      'Are you sure you want to remove this custom added masjid?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCustomAddedMasjid(masjidId);
            await loadMasjids();
            Alert.alert('Deleted', 'Custom masjid has been removed.');
          },
        },
      ]
    );
  };

  const handleOpenAddMasjid = () => {
    if (!userProfile && !imamSession) {
      Alert.alert(
        'Account Required',
        'Please sign in or create a free account to add a new masjid to the community network.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'View Walkthrough',
            onPress: () => {
              setWalkthroughMode('masjid_onboarding');
              setIsWalkthroughVisible(true);
            },
          },
          {
            text: 'Sign In',
            onPress: () => router.push('/auth/login'),
          },
          {
            text: 'Sign Up',
            onPress: () => router.push('/auth/signup'),
          },
        ]
      );
      return;
    }
    setEditingMasjid(null);
    setModalMode('add');
    setUpdateModalScope('all');
    setIsUpdateModalVisible(true);
  };

  useEffect(() => {
    if (searchParams?.walkthrough === 'masjid_onboarding') {
      setWalkthroughMode('masjid_onboarding');
      setIsWalkthroughVisible(true);
    }
    if (searchParams?.openAdd === 'true') {
      handleOpenAddMasjid();
    }
  }, [searchParams?.walkthrough, searchParams?.openAdd]);

  const canUserEditMasjid = (item: Masjid): boolean => {
    if (canManageMasjid(userProfile, item.id)) return true;
    const role = (userProfile?.role || imamSession?.role || '').toUpperCase();
    if (role === 'ADMIN' || role === 'SUPER_USER2') return true;
    if (role === 'SUPER_USER' || role === 'MUAZZIN' || role === 'IMAM' || role === 'PRESIDENT' || role === 'SECRETARY') {
      const assignedMasjidId = userProfile?.masjidId || imamSession?.masjidId;
      if (!assignedMasjidId) return false;
      const cleanItem = item.id.replace(/^salahtime-/, '').trim().toLowerCase();
      const cleanAssigned = assignedMasjidId.replace(/^salahtime-/, '').trim().toLowerCase();
      return cleanItem === cleanAssigned;
    }
    return false;
  };

  const handleUpdateTimings = (item?: Masjid) => {
    if (item && !canUserEditMasjid(item)) {
      Alert.alert(
        'Access Restricted',
        'Only a verified Muazzin, Imam, or Committee President assigned to this masjid (or an Administrator) can edit its prayer timings.'
      );
      return;
    }
    setEditingMasjid(item || null);
    setModalMode('update');
    setUpdateModalScope('all');
    setIsUpdateModalVisible(true);
  };

  const toggleDefaultMasjid = async (masjidId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (defaultMasjidId === masjidId) {
      await setDefaultMasjidId(null);
      setDefaultMasjidIdState(null);
    } else {
      await setDefaultMasjidId(masjidId);
      setDefaultMasjidIdState(masjidId);
    }
  };

  const handleModalSubmit = async (formData: TimingFormData) => {
    let session = await getImamSession();
    if (!session && formData.muazzinPasscode) {
      const loginRes = await verifyAndLoginImam(
        formData.imamName || 'Imam / Muazzin',
        formData.muazzinPasscode,
        editingMasjid?.id
      );
      if (loginRes.success && loginRes.session) {
        session = loginRes.session;
        setImamSession(session);
      }
    }

    const targetMasjid: Masjid = editingMasjid || {
      id: `custom-${Date.now()}`,
      name: formData.name || 'New Masjid',
      address: formData.address || 'Hyderabad, Telangana',
      distance: 0,
      latitude: currentLocation?.latitude || 17.385044,
      longitude: currentLocation?.longitude || 78.486671,
      school: formData.school,
      isOpen: true,
      isCustomAdded: true,
    };

    // Persist custom added masjid across sessions
    if (modalMode === 'add' || targetMasjid.isCustomAdded) {
      await saveCustomAddedMasjid(targetMasjid);
    }

    if (session) {
      const pushRes = await pushMasjidTimingToFirestore(targetMasjid, formData, session, updateModalScope);
      if (!pushRes.success) {
        Alert.alert('Update Notice', pushRes.error || 'Failed to update timings.');
        return;
      }
      const pointsMsg = pushRes?.pointsResult?.awarded
        ? `\n\n🌟 ${pushRes.pointsResult.reason} Total Points: ${pushRes.pointsResult.newTotalPoints}`
        : pushRes?.pointsResult?.reason ? `\n\n🛡️ ${pushRes.pointsResult.reason}` : '';
      Alert.alert(
        "Verified Timings Published",
        `Timings for ${targetMasjid.name} have been updated live in the 100+ masjid network!${pointsMsg}`
      );
    } else {
      await saveLocalTimingOverride({
        masjidId: targetMasjid.id,
        name: targetMasjid.name,
        address: targetMasjid.address,
        athanTimes: formData.athanTimes,
        iqamahTimes: formData.iqamahTimes,
        jummah: formData.jummah,
        jummahAthan: formData.jummahAthan,
        sunrise: formData.sunrise,
        sahar: formData.sahar,
        iftar: formData.iftar,
        notes: formData.notes,
        announcements: formData.notes || '',
        updatedBy: userProfile?.name || 'Local User',
        updatedByUid: userProfile?.uid || '',
        muazzinPasscode: formData.muazzinPasscode,
        isMuazzinVerified: false,
        updatedAt: Date.now(),
        syncStatus: 'pending',
        isCustomAdded: targetMasjid.isCustomAdded,
      });
      Alert.alert(
        "Timings Saved Locally",
        "Timings saved on your device. Enter an authorized Imam Security Code to publish updates live to all users."
      );
    }

    await loadMasjids();
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

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, activeFilterTab]);

  const filteredMasjids = useMemo(() => {
    const query = getCleanedLocalQuery();
    return masjids
      .filter(masjid => {
        if (!query) return true;
        return (
          masjid.name.toLowerCase().includes(query) ||
          (masjid.address && masjid.address.toLowerCase().includes(query)) ||
          (masjid.famousArea && masjid.famousArea.toLowerCase().includes(query)) ||
          (masjid.presidentName && masjid.presidentName.toLowerCase().includes(query)) ||
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
      .sort((a, b) => {
        if (defaultMasjidId) {
          const cleanDef = defaultMasjidId.replace(/^salahtime-/, '').trim().toLowerCase();
          const isADefault = a.id === defaultMasjidId || a.id.replace(/^salahtime-/, '').trim().toLowerCase() === cleanDef;
          const isBDefault = b.id === defaultMasjidId || b.id.replace(/^salahtime-/, '').trim().toLowerCase() === cleanDef;
          if (isADefault && !isBDefault) return -1;
          if (!isADefault && isBDefault) return 1;
        }
        if (sortMode === 'az') {
          return a.name.localeCompare(b.name);
        }
        return (a.distance ?? 0) - (b.distance ?? 0);
      });
  }, [masjids, searchQuery, currentLocation, defaultMasjidId, sortMode]);

  const displayedMasjids = useMemo(() => {
    return filteredMasjids.slice(0, visibleCount);
  }, [filteredMasjids, visibleCount]);

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

      // Pre-load JazakAllah counts for loaded masjids so cards never display 0
      const initialJazakMap: Record<string, number> = {};
      await Promise.all(
        withOverrides.slice(0, 30).map(async (m) => {
          initialJazakMap[m.id] = await getMasjidJazakCount(m.id);
        })
      );
      setMasjidJazakCounts((prev) => ({ ...prev, ...initialJazakMap }));
      if (withOverrides.length > 0 && !searchQuery) {
        const def = await getDefaultMasjidId();
        const initialId = def || withOverrides[0].id;
        setSelectedMasjidId(initialId);
        setExpandedMasjidIds(prev => {
          if (Object.keys(prev).length === 0) {
            return { [initialId]: true };
          }
          return prev;
        });
      }
      setLoading(false);

      // In the background, request fresh high-accuracy GPS coordinates and update distance
      getCurrentLocation().then(async (freshLoc) => {
        if (freshLoc) {
          setCurrentLocation(freshLoc);
          const freshMasjids = await getNearbyMasjids(freshLoc, searchRadius, cleanedQuery, searchCenter);
          const freshWithOverrides = await applyTimingOverridesToMasjids(freshMasjids, freshLoc);
          setMasjids(freshWithOverrides);
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
    return subscribeToLocationUpdates((coords) => {
      setCurrentLocation(coords);
    });
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setVisibleCount(PAGE_SIZE);
    await forceRefreshLocation();
    await loadMasjids();
  };

  const toggleMasjidTimings = (masjidId: string) => {
    setSelectedMasjidId(masjidId);
    setExpandedMasjidIds(prev => ({
      ...prev,
      [masjidId]: !prev[masjidId],
    }));
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

  const renderMasjidItem = ({ item, index }: { item: Masjid; index: number }) => {
    const isPinned = item.id === defaultMasjidId || (item.id.replace(/^salahtime-/, '') === (defaultMasjidId || '').replace(/^salahtime-/, ''));
    const isAutoClosest = !defaultMasjidId && index === 0 && !searchQuery;
    const isExpanded = !!expandedMasjidIds[item.id];
    const jumaHistory = getMasjidJumaTopics(item.id, item.name, jumaList);

    const nextMasjidPrayer = item.iqamahTimes
      ? getNextPrayer({
          Fajr: item.iqamahTimes.Fajr || '05:30 AM',
          Sunrise: item.sunrise || '06:15 AM',
          Dhuhr: item.iqamahTimes.Dhuhr || '01:15 PM',
          Asr: item.iqamahTimes.Asr || '04:45 PM',
          Maghrib: item.iqamahTimes.Maghrib || '06:20 PM',
          Isha: item.iqamahTimes.Isha || '08:30 PM',
        })
      : null;

    return (
      <View style={[styles.masjidCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* If Pinned or Auto-Closest, show prominent top status row */}
        {(isPinned || isAutoClosest) ? (
          <View style={styles.cardTopRow}>
            {isPinned ? (
              <View style={styles.pinnedMasjidBadge}>
                <Feather name="bookmark" size={11} color="#10b981" style={{ marginRight: 4 }} />
                <Text style={styles.pinnedMasjidBadgeText}>{t('masjid.defaultMasjid', 'Default Masjid')}</Text>
              </View>
            ) : (
              <View style={styles.autoClosestBadge}>
                <Feather name="navigation" size={10} color="#0f172a" style={{ marginRight: 4 }} />
                <Text style={styles.autoClosestBadgeText}>{t('masjid.closestAuto', 'Closest to You (Auto-Selected)')}</Text>
              </View>
            )}
            <View style={styles.distanceBadge}>
              <Feather name="map-pin" size={11} color="#e2a23b" style={{ marginRight: 4 }} />
              <Text style={styles.distanceText}>{formatDistance(item.distance)}</Text>
            </View>
          </View>
        ) : null}

        {/* Masjid Name & Distance Row (When unpinned, Name and Distance share the top line to eliminate wasted space) */}
        {(isPinned || isAutoClosest) ? (
          <Text style={[styles.masjidName, { color: colors.text }]}>{item.name}</Text>
        ) : (
          <View style={styles.cardNameDistanceRow}>
            <Text style={[styles.masjidName, styles.inlineMasjidName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.distanceBadge}>
              <Feather name="map-pin" size={11} color="#e2a23b" style={{ marginRight: 4 }} />
              <Text style={styles.distanceText}>{formatDistance(item.distance)}</Text>
            </View>
          </View>
        )}

        {/* Address */}
        <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={2}>{item.address}</Text>

        {/* Symmetrical Attribute Tags Row (Hidden if Pinned & Collapsed) */}
        {(!isPinned || isExpanded) && (
        <View style={styles.metaTagsRow}>
          {item.presidentName ? (
            <View style={[styles.presidentBadge, { backgroundColor: colors.pill, borderColor: colors.border }]}>
              <Feather name="user-check" size={10} color={colors.accentGold} style={{ marginRight: 4 }} />
              <Text style={[styles.presidentBadgeText, { color: colors.textSecondary }]}>President: {toTitleCase(item.presidentName)}</Text>
            </View>
          ) : null}
          {item.famousArea ? (
            <View style={[styles.famousAreaBadge, { backgroundColor: colors.pill, borderColor: colors.border }]}>
              <Feather name="map" size={10} color="#94a4a2" style={{ marginRight: 4 }} />
              <Text style={[styles.famousAreaBadgeText, { color: colors.textSecondary }]}>{item.famousArea}</Text>
            </View>
          ) : null}
          {item.ladiesSection ? (
            <View style={styles.ladiesBadge}>
              <Feather name="check-circle" size={10} color="#10b981" style={{ marginRight: 4 }} />
              <Text style={styles.ladiesBadgeText}>{t('home.ladiesSection', 'Ladies Section: Available')}</Text>
            </View>
          ) : (
            <View style={[styles.ladiesBadge, { backgroundColor: colors.pill, borderColor: colors.borderSubtle }]}>
              <Feather name="x-circle" size={10} color={colors.textMuted} style={{ marginRight: 4 }} />
              <Text style={[styles.ladiesBadgeText, { color: colors.textMuted }]}>{t('home.ladiesSectionUnavail', 'Ladies Section: Not Available')}</Text>
            </View>
          )}
          {item.isMuazzinVerified ? (
            <View style={[styles.localUpdateBadge, styles.muazzinVerifiedBadge]}>
              <Feather name="shield" size={10} color="#f59e0b" style={{ marginRight: 4 }} />
              <Text style={[styles.localUpdateBadgeText, styles.muazzinVerifiedBadgeText]}>
                Verified by Muazzin
              </Text>
            </View>
          ) : item.isCustomAdded ? (
            <View style={[styles.localUpdateBadge, styles.customAddedBadge]}>
              <Feather name="plus-circle" size={10} color="#e2a23b" style={{ marginRight: 4 }} />
              <Text style={[styles.localUpdateBadgeText, { color: '#e2a23b' }]}>Added by you</Text>
            </View>
          ) : item.isLocalUpdate ? (
            <View style={styles.localUpdateBadge}>
              <Feather name="check" size={10} color="#10b981" style={{ marginRight: 4 }} />
              <Text style={styles.localUpdateBadgeText}>Updated by you</Text>
            </View>
          ) : null}


        </View>

        )}

        {/* Updated By & JazakAllah Card Row (Hidden if Pinned & Collapsed) */}
        {(!isPinned || isExpanded) && (
        <View style={[styles.updaterCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <View style={styles.updaterInfoCol}>
            <View style={styles.updaterHeaderLine}>
              <Feather name="user-check" size={12} color={colors.accentGold} style={{ marginRight: 5 }} />
              <Text style={[styles.updaterNameText, { color: colors.text }]}>
                Updated by: <Text style={{ color: colors.accentGold, fontWeight: '700' }}>{item.updatedBy || 'Masjid Committee'}</Text>
              </Text>
              <Text style={[styles.updaterTimeText, { color: colors.textMuted }]}>
                • {formatLastUpdated(item.updatedAt)}
              </Text>
            </View>

            <View style={styles.updaterActionsRow}>
              <View style={[styles.jazakBadge, { backgroundColor: colors.pill, borderColor: colors.border }]}>
                <Text style={{ fontSize: 11, marginRight: 4 }}>🤲</Text>
                <Text style={[styles.jazakBadgeText, { color: colors.accentGold }]}>
                  {masjidJazakCounts[item.id] ?? (item.jazakallahCount || getBaselineJazakCount(item.id))} JazakAllah
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.sendJazakBtn, { backgroundColor: colors.accentGoldBg }]}
                onPress={() => handleSendJazak(item)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 12, marginRight: 4 }}>🤲</Text>
                <Text style={styles.sendJazakBtnText}>Send JazakAllahu Khairan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        )}

        {/* Stale Timing Alert Banner (10d+ Old) */}
        {(!isPinned || isExpanded) && isTimingStale(item.updatedAt) && (
          <View style={[styles.staleAlertBanner, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
            <View style={styles.staleAlertLeft}>
              <Feather name="alert-triangle" size={13} color="#ef4444" style={{ marginRight: 6 }} />
              <Text style={styles.staleAlertText}>
                Timings not updated recently (10d+ old)
              </Text>
            </View>
            <TouchableOpacity
              style={styles.requestUpdateBtn}
              onPress={() => handleRequestUpdate(item)}
              activeOpacity={0.8}
            >
              <Text style={styles.requestUpdateBtnText}>Request Update</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Toggle Timing Board Button */}
        <TouchableOpacity
          style={[styles.toggleButton, { backgroundColor: colors.pill, borderColor: colors.border }, isExpanded && { backgroundColor: isDark ? "rgba(226, 162, 59, 0.15)" : colors.surface, borderColor: colors.border }]}
          onPress={() => toggleMasjidTimings(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.toggleButtonContent}>
            <Text style={[styles.toggleButtonText, { color: isExpanded ? colors.accentGold : colors.text }]}>
              {isExpanded
                ? t('masjid.hideTimings', 'Hide Timings')
                : `${t('masjid.viewTimings', 'View Timings')}${
                    nextMasjidPrayer && nextMasjidPrayer.time !== '--:--'
                      ? `  •  Next: ${nextMasjidPrayer.name} (${formatTime(nextMasjidPrayer.time, nextMasjidPrayer.name)})`
                      : ''
                  }`}
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
            <MasjidLedBoard
              masjid={item}
              isFallback={Boolean(!item.iqamahTimes?.Fajr || item.iqamahTimes.Fajr === '--:--' || item.id?.startsWith('fallback-'))}
              compact={false}
            />

            {/* Announcements & About Masjid Box */}
            {(item.announcements || item.about || item.notes) ? (
              <View style={[styles.announcementsBox, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <View style={styles.announcementsHeader}>
                  <Feather name="volume-2" size={12} color={colors.accentGold} style={{ marginRight: 5 }} />
                  <Text style={[styles.announcementsTitle, { color: colors.accentGold }]}>Announcements & Information</Text>
                </View>
                <Text style={[styles.announcementsContent, { color: colors.textSecondary }]}>
                  {item.announcements || item.about || item.notes}
                </Text>
              </View>
            ) : null}



            {/* Pin / Auto-Closest Toggle Button */}
            <TouchableOpacity
              style={[
                styles.pinToggleBtn,
                !isPinned && { backgroundColor: colors.pill, borderColor: colors.border },
                isPinned && styles.pinToggleBtnActive,
              ]}
              onPress={() => toggleDefaultMasjid(item.id)}
              activeOpacity={0.8}
            >
              <Feather
                name={isPinned ? "bookmark" : "map-pin"}
                size={13}
                color={isPinned ? "#10b981" : colors.accentGold}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.pinToggleBtnText,
                  !isPinned && { color: colors.accentGold },
                  isPinned && styles.pinToggleBtnTextActive,
                ]}
              >
                {isPinned ? t('masjid.resetDefault', 'Default Masjid (Tap to Reset to Auto-GPS)') : t('masjid.setAsDefault', 'Set as Default Masjid')}
              </Text>
            </TouchableOpacity>

            {/* Jumu'ah Khutbah Topics Connected Directly to this Masjid (This week X + past 2 weeks Y & Z) */}
            {jumaHistory.current && (
              <View style={[styles.masjidJumaCardBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.masjidJumaCardHeader}>
                  <View style={styles.masjidJumaHeaderBadge}>
                    <Feather name="book-open" size={11} color={colors.accentGold} style={{ marginRight: 4 }} />
                    <Text style={[styles.masjidJumaHeaderBadgeText, { color: colors.accentGold }]}>{t('masjid.thisWeeksKhutbah', "This Week's Khutbah")}</Text>
                  </View>
                  {jumaHistory.current.fridayDateStr ? (
                    <Text style={[styles.masjidJumaDateText, { color: colors.textMuted }]}>{jumaHistory.current.fridayDateStr.split(' ')[0]}</Text>
                  ) : null}
                </View>

                <Text style={[styles.masjidJumaTopicTitle, { color: colors.text }]}>{jumaHistory.current.topicName}</Text>
                <View style={styles.masjidJumaSpeakerRow}>
                  <Feather name="user" size={11} color={colors.accentGold} style={{ marginRight: 4 }} />
                  <Text style={[styles.masjidJumaSpeakerText, { color: colors.textSecondary }]}>
                    {t('masjid.khateeb', 'Khateeb')}: {jumaHistory.current.speakerName} • {jumaHistory.current.timing}
                  </Text>
                </View>
              </View>
            )}



            {/* Delete Custom Masjid Button (If added by user) */}
            {item.isCustomAdded && (
              <TouchableOpacity
                style={styles.deleteCustomMasjidBtn}
                onPress={() => handleDeleteCustomMasjid(item.id)}
                activeOpacity={0.8}
              >
                <Feather name="trash-2" size={13} color="#ef4444" style={{ marginRight: 6 }} />
                <Text style={styles.deleteCustomMasjidBtnText}>Delete Custom Masjid</Text>
              </TouchableOpacity>
            )}

            {/* Authorized Roles: Separate Edit Timings vs Edit Masjid Details Buttons */}
            {canUserEditMasjid(item) && (
              <View style={styles.authEditRow}>
                <TouchableOpacity
                  style={[styles.editTimingsBtn, { backgroundColor: colors.accentGoldBg }]}
                  onPress={() => {
                    setEditingMasjid(item);
                    setModalMode('update');
                    setUpdateModalScope('timings');
                    setIsUpdateModalVisible(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Feather name="clock" size={13} color="#0f1718" style={{ marginRight: 5 }} />
                  <Text style={styles.editTimingsBtnText}>Edit Timings</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.editDetailsBtn, { backgroundColor: colors.pill, borderColor: colors.border }]}
                  onPress={() => {
                    setEditingMasjid(item);
                    setModalMode('update');
                    setUpdateModalScope('details');
                    setIsUpdateModalVisible(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Feather name="edit-2" size={13} color={colors.accentGold} style={{ marginRight: 5 }} />
                  <Text style={[styles.editDetailsBtnText, { color: colors.accentGold }]}>Edit Masjid</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Symmetrical Google Maps Directions Button */}
            <View style={styles.cardActionRow}>
              <TouchableOpacity
                style={[styles.googleMapsButton, { width: '100%', justifyContent: 'center' }]}
                onPress={() => openInMaps(item)}
                activeOpacity={0.8}
              >
                <Feather name="map-pin" size={15} color="#0d1a1b" style={{ marginRight: 6 }} />
                <Text style={styles.googleMapsButtonText}>{t('masjid.getDirections', 'Get Directions via Google Maps')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Top Header with Locked Symmetrical Search Bar */}
      <View style={[styles.header, contentContainerStyle]}>
        {/* Top Header Row: Title/Subtitle on Left & Unified Compact Login on Right */}
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleGroup}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{t('masjid.title', 'Nearby Masajid')}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>{t('masjid.subtitle', 'Find and connect to local masajid')}</Text>
          </View>
          {userProfile || imamSession ? (
            <TouchableOpacity
              style={[
                styles.muazzinActiveBadge,
                {
                  backgroundColor: isDark ? 'rgba(0, 255, 102, 0.12)' : colors.card,
                  borderColor: isDark ? '#00ff66' : colors.border,
                  maxWidth: 135,
                },
              ]}
              onPress={() => router.push('/auth/profile')}
              activeOpacity={0.8}
            >
              <Feather
                name="user-check"
                size={12}
                color={isDark ? '#00ff66' : colors.accentGreen}
                style={{ marginRight: 5 }}
              />
              <Text
                style={[
                  styles.muazzinActiveBadgeText,
                  { color: isDark ? '#00ff66' : colors.text },
                ]}
                numberOfLines={1}
              >
                {userProfile?.name?.split(' ')[0] || imamSession?.imamName?.split(' ')[0] || 'Profile'}
                {userProfile ? ` (${getDisplayRoleLabel(userProfile)})` : ''}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.muazzinLoginBtn,
                {
                  backgroundColor: isDark ? 'rgba(226, 162, 59, 0.15)' : colors.card,
                  borderColor: isDark ? 'rgba(226, 162, 59, 0.4)' : colors.border,
                },
              ]}
              onPress={() => router.push('/auth/login')}
              activeOpacity={0.8}
            >
              <Feather name="log-in" size={12} color={colors.accentGold} style={{ marginRight: 5 }} />
              <Text style={[styles.muazzinLoginBtnText, { color: colors.accentGold }]}>{t('masjid.loginSignup', 'Login / Sign Up')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Locked Symmetrical Search Bar */}
        <View style={[styles.searchBarContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="search" size={16} color="#94a4a2" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('masjid.searchPlaceholder', 'Search masajids here')}
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
            <Text style={styles.searchActionButtonText}>{t('masjid.searchBtn', 'Search')}</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Chips: Nearby (GPS) & A-Z Sort */}
        <View style={[styles.sortFilterChipsRow, { marginTop: 10, marginBottom: 2, marginHorizontal: 0 }]}>
          <TouchableOpacity
            style={[
              styles.sortFilterChip,
              {
                backgroundColor: sortMode === 'nearby' ? colors.accentGold : colors.surface,
                borderColor: sortMode === 'nearby' ? colors.accentGold : colors.border,
              },
            ]}
            onPress={() => setSortMode('nearby')}
            activeOpacity={0.8}
          >
            <Feather
              name="navigation"
              size={12}
              color={sortMode === 'nearby' ? '#0f1718' : colors.accentGold}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.sortFilterChipText,
                {
                  color: sortMode === 'nearby' ? '#0f1718' : colors.textSecondary,
                  fontWeight: sortMode === 'nearby' ? '700' : '500',
                },
              ]}
            >
              Nearby (GPS)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sortFilterChip,
              {
                backgroundColor: sortMode === 'az' ? colors.accentGold : colors.surface,
                borderColor: sortMode === 'az' ? colors.accentGold : colors.border,
              },
            ]}
            onPress={() => setSortMode('az')}
            activeOpacity={0.8}
          >
            <Feather
              name="type"
              size={12}
              color={sortMode === 'az' ? '#0f1718' : colors.accentGold}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.sortFilterChipText,
                {
                  color: sortMode === 'az' ? '#0f1718' : colors.textSecondary,
                  fontWeight: sortMode === 'az' ? '700' : '500',
                },
              ]}
            >
              A–Z Sort
            </Text>
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
          data={displayedMasjids}
          renderItem={renderMasjidItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, contentContainerStyle]}
          initialNumToRender={PAGE_SIZE}
          maxToRenderPerBatch={PAGE_SIZE}
          windowSize={7}
          removeClippedSubviews={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accentGold}
              colors={[colors.accentGold]}
            />
          }
          ListFooterComponent={
            <View style={[styles.listFooterContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {visibleCount < filteredMasjids.length ? (
                <TouchableOpacity
                  style={[styles.loadMoreBtn, { backgroundColor: colors.card, borderColor: colors.accentGold }]}
                  onPress={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                  activeOpacity={0.8}
                >
                  <Feather name="chevron-down" size={16} color={colors.accentGold} style={{ marginRight: 6 }} />
                  <Text style={[styles.loadMoreBtnText, { color: colors.text }]}>
                    {t('masjid.loadMore', 'Load More Masjids')} (+10)  •  {displayedMasjids.length} of {filteredMasjids.length}
                  </Text>
                </TouchableOpacity>
              ) : (
                filteredMasjids.length > 0 && (
                  <Text style={[styles.allLoadedText, { color: colors.textMuted }]}>
                    Showing all {filteredMasjids.length} nearby masjids
                  </Text>
                )
              )}
              <Text style={[styles.listFooterSubtext, { color: colors.textSecondary }]}>
                {searchQuery
                  ? "Don't see your local masjid in the search results?"
                  : "Can't find your local masjid in the list?"}
              </Text>
              <TouchableOpacity
                style={[styles.footerAddBtn, { backgroundColor: colors.accentGoldBg }]}
                onPress={handleOpenAddMasjid}
                activeOpacity={0.8}
              >
                <Feather name="plus-circle" size={14} color="#0f1718" style={{ marginRight: 6 }} />
                <Text style={styles.footerAddBtnText}>{t('masjid.addMasjid', 'Add Missing Masjid')}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <UpdateMasjidTimingModal
        visible={isUpdateModalVisible}
        masjid={editingMasjid}
        mode={modalMode}
        editScope={updateModalScope}
        currentLocation={currentLocation}
        onClose={() => setIsUpdateModalVisible(false)}
        onSubmit={handleModalSubmit}
      />

      <MuazzinLoginModal
        visible={isMuazzinLoginModalVisible}
        activeMasjid={selectedMasjidId ? (masjids.find(m => m.id === selectedMasjidId) || masjids[0]) : masjids[0]}
        availableMasjids={masjids}
        onClose={() => setIsMuazzinLoginModalVisible(false)}
        onSuccess={(session, masjid) => {
          setImamSession(session);
          syncMuazzinKhutbahReminders(session).catch(() => {});
          Alert.alert(
            'Verified as Muazzin',
            `Welcome, ${session.imamName}! You now have official publishing privileges. Opening timings editor...`,
            [
              {
                text: 'Proceed',
                onPress: () => {
                  handleUpdateTimings(masjid || undefined);
                },
              },
            ]
          );
        }}
      />

      <MasjidFeedbackModal
        visible={isFeedbackModalVisible}
        masjid={feedbackMasjid}
        onClose={() => {
          setIsFeedbackModalVisible(false);
          setFeedbackMasjid(null);
        }}
      />

      <FirstTimeWalkthroughModal
        visible={isWalkthroughVisible}
        mode={walkthroughMode}
        onClose={() => setIsWalkthroughVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sortFilterChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  sortFilterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  sortFilterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  authEditRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  editTimingsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  editTimingsBtnText: {
    color: '#0f1718',
    fontSize: 12,
    fontWeight: '700',
  },
  editDetailsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  editDetailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },

  updaterCard: {
    marginTop: 8,
    marginBottom: 6,
    padding: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  updaterInfoCol: {
    gap: 6,
  },
  updaterHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  updaterNameText: {
    fontSize: 11,
  },
  updaterTimeText: {
    fontSize: 11,
  },
  updaterActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  jazakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  jazakBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sendJazakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  sendJazakBtnText: {
    color: '#0f1718',
    fontSize: 11,
    fontWeight: '700',
  },
  staleAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 6,
  },
  staleAlertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  staleAlertText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  requestUpdateBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  requestUpdateBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  announcementsBox: {
    marginTop: 8,
    marginBottom: 8,
    padding: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  announcementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  announcementsTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  announcementsContent: {
    fontSize: 11,
    lineHeight: 16,
  },
  directEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 6,
  },
  directEditBtnText: {
    color: '#0f1718',
    fontSize: 12,
    fontWeight: '700',
  },

  container: {
    flex: 1,
    backgroundColor: "#0f1718",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  searchBarContainer: {
    flexDirection: "row",
    backgroundColor: "#0c2729",
    borderColor: "rgba(226, 162, 59, 0.25)",
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 12,
    paddingLeft: 12,
    paddingRight: 6,
    alignItems: "center",
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "#f3f7f6",
    fontSize: 14,
    height: "100%",
    paddingVertical: 0,
  },
  clearSearchButton: {
    paddingHorizontal: 6,
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
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  searchActionButtonText: {
    color: "#0d1a1b",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#f3f7f6",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
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
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ledArabicLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#e2a23b",
    minWidth: 42,
    textAlign: "right",
    textShadowColor: "rgba(226, 162, 59, 0.4)",
    textShadowRadius: 4,
  },
  ledEnglishLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#e2a23b",
    minWidth: 62,
    textAlign: "left",
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
    flex: 1.2,
    backgroundColor: "#e2a23b",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
  headerActionCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  muazzinLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(226, 162, 59, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    minWidth: 72,
  },
  muazzinLoginBtnText: {
    color: '#ffdda8',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  muazzinActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 255, 102, 0.15)',
    borderWidth: 1,
    borderColor: '#00ff66',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    minWidth: 72,
    maxWidth: 110,
  },
  muazzinActiveBadgeText: {
    color: '#00ff66',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  reportIssueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226, 162, 59, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    justifyContent: "center",
  },
  reportIssueChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#e2a23b',
    textAlign: "center",
    includeFontPadding: false,
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  reportFeedbackButton: {
    flex: 1,
    backgroundColor: 'rgba(226, 162, 59, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.35)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportFeedbackButtonText: {
    color: '#ffdda8',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  deleteCustomMasjidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  deleteCustomMasjidBtnText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
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
  autoClosestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e2a23b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    justifyContent: "center",
  },
  autoClosestBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: "center",
    includeFontPadding: false,
  },
  pinnedMasjidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    justifyContent: "center",
  },
  pinnedMasjidBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
    textAlign: "center",
    includeFontPadding: false,
  },
  pinToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(226, 162, 59, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.3)',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginTop: 14,
    marginBottom: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226, 162, 59, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.25)',
    justifyContent: "center",
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e2a23b',
    textAlign: "center",
    includeFontPadding: false,
  },
  metaTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 4,
  },
  pinToggleBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  pinToggleBtnText: {
    color: '#e2a23b',
    fontSize: 12,
    fontWeight: '700',
  },
  pinToggleBtnTextActive: {
    color: '#10b981',
  },
  // Onboarded Friday Khutbah Topics Card
  khutbahCard: {
    backgroundColor: '#0c3033',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.3)',
  },
  khutbahCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  khutbahBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226, 162, 59, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.25)',
  },
  khutbahBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#e2a23b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  khutbahViewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  khutbahViewAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e2a23b',
  },
  khutbahTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffdda8',
    marginBottom: 3,
  },
  khutbahDescription: {
    fontSize: 11,
    color: '#94a4a2',
    lineHeight: 15,
    marginBottom: 8,
  },
  khutbahFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  khutbahSpeakerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(7, 31, 33, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  khutbahSpeakerText: {
    fontSize: 10,
    color: '#ffdda8',
    fontWeight: '600',
  },
  khutbahCitationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  khutbahCitationText: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '600',
  },
  ledBoardFacilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    marginTop: 8,
    paddingTop: 6,
    paddingHorizontal: 4,
  },
  ledFacilityQariText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffdda8',
  },
  ledFacilityLadiesText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00ff66',
  },
  deleteCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  deleteCustomBtnText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ef4444',
  },
  presidentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226, 162, 59, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    justifyContent: "center",
  },
  presidentBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#ffdda8',
    textAlign: "center",
    includeFontPadding: false,
  },
  famousAreaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    justifyContent: "center",
  },
  famousAreaBadgeText: {
    fontSize: 9,
    color: '#94a4a2',
    textAlign: "center",
    includeFontPadding: false,
  },
  ladiesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    justifyContent: "center",
  },
  ladiesBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#10b981',
    textAlign: "center",
    includeFontPadding: false,
  },
  jumaTimingPanel: {
    flexDirection: 'row',
    backgroundColor: '#071f21',
    borderRadius: 10,
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#0b383b',
    alignItems: 'center',
  },
  jumaTimeColumn: {
    flex: 1,
    alignItems: 'center',
  },
  jumaDividerVertical: {
    width: 1,
    height: 36,
    backgroundColor: '#1b4a4d',
  },
  jumaTimeSublabel: {
    fontSize: 9,
    color: '#94a4a2',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  jumaAthanTimeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#00ff66',
  },
  jumaJamaatTimeText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffdda8',
  },
  khutbahTopicBox: {
    backgroundColor: 'rgba(15, 23, 24, 0.7)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.25)',
    marginBottom: 10,
  },
  khutbahHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  khutbahTopicTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#e2a23b',
    textTransform: 'uppercase',
  },
  khutbahTopicText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 16,
  },
  legacyKhutbahSpeakerText: {
    fontSize: 11,
    color: '#ffdda8',
    marginTop: 3,
  },
  taraweehPanel: {
    backgroundColor: '#071f21',
    borderRadius: 10,
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#0b383b',
  },
  taraweehHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 6,
  },
  taraweehPanelTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffdda8',
  },
  taraweehRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  taraweehLabel: {
    fontSize: 11,
    color: '#94a4a2',
  },
  taraweehTimeValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00ff66',
  },
  taraweehQariValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  taraweehAvailableText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  taraweehUnavailableText: {
    fontSize: 11,
    color: '#64748b',
  },
  ramadhanShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(226, 162, 59, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.35)',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 2,
  },
  ramadhanShortcutBtnText: {
    color: '#e2a23b',
    fontSize: 12,
    fontWeight: '700',
  },

  headerSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardNameDistanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  inlineMasjidName: {
    flex: 1,
    marginBottom: 0,
    marginRight: 8,
  },
  khutbahMasjidNearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  khutbahMasjidNearText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  masjidJumaCardBox: {
    backgroundColor: 'rgba(12, 48, 51, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.3)',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    marginBottom: 8,
  },
  masjidJumaCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  masjidJumaHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226, 162, 59, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    justifyContent: "center",
  },
  masjidJumaHeaderBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#e2a23b',
    textTransform: 'uppercase',
    textAlign: "center",
    includeFontPadding: false,
  },
  masjidJumaDateText: {
    fontSize: 10,
    color: '#94a4a2',
  },
  masjidJumaTopicTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffdda8',
    marginBottom: 4,
  },
  masjidJumaSpeakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  masjidJumaSpeakerText: {
    fontSize: 11,
    color: '#94a4a2',
  },
  masjidPastTopicsBox: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 8,
    marginTop: 6,
  },
  masjidPastTopicsTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#e2a23b',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  masjidPastTopicItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  masjidPastTopicName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  masjidPastTopicMeta: {
    fontSize: 10,
    color: '#64748b',
  },
  headerTitleGroup: {
    flex: 1,
    marginRight: 10,
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 37, 39, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.4)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
  },
  loadMoreBtnText: {
    color: '#ffdda8',
    fontSize: 13,
    fontWeight: '600',
  },
  allLoadedText: {
    color: '#6b8280',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  listFooterContainer: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 30,
    backgroundColor: 'rgba(15, 30, 32, 0.45)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.2)',
    borderStyle: 'dashed',
  },
  listFooterSubtext: {
    color: '#94a4a2',
    fontSize: 12,
    marginBottom: 10,
    textAlign: 'center',
  },
  footerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e2a23b',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  footerAddBtnText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
  },
});