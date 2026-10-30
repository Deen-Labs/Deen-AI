import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  fetchSalahTimeJuma,
  SalahTimeJuma,
  getMasjidJumaTopics,
  parseFridayDate,
  fetchSalahTimeMasjids,
  publishSalahTimeJuma,
  fetchAalimUsers,
  AalimUser,
} from '../../lib/salahTimeBackend';
import { syncMuazzinKhutbahReminders } from '../../lib/muazzinNotifications';
import { getImamSession } from '../../lib/masjidTimingSync';
import { getCurrentUser, UserProfile } from '../../lib/auth';
import { Masjid, formatDistance, calculateDistance } from '../../lib/masjid';
import { getQuickLocation, subscribeToLocationUpdates, Coordinates } from '../../lib/location';
import { useRouter } from 'expo-router';
import { useTheme } from '../../lib/theme';
import { useLanguage } from '../../lib/i18n';
import { useResponsiveLayout } from '../../lib/responsive';

export default function FridayTopicsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { contentContainerStyle } = useResponsiveLayout();

  const [jumas, setJumas] = useState<SalahTimeJuma[]>([]);
  const [masjids, setMasjids] = useState<Masjid[]>([]);
  const [aalimUsers, setAalimUsers] = useState<AalimUser[]>([]);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  // Filter chips: 'all', 'nearby', 'khateeb', 'masjid' (redundant 'president' removed)
  const [activeFilter, setActiveFilter] = useState<'all' | 'nearby' | 'khateeb' | 'masjid'>('all');
  const [likedMap, setLikedMap] = useState<Record<string, number>>({});
  const [expandedPastMap, setExpandedPastMap] = useState<Record<string, boolean>>({});

  // Submit Modal States
  const [isSubmitModalVisible, setIsSubmitModalVisible] = useState(false);
  const [selectedMasjid, setSelectedMasjid] = useState<Masjid | null>(null);
  const [isMasjidPickerVisible, setIsMasjidPickerVisible] = useState(false);
  const [masjidPickerSearch, setMasjidPickerSearch] = useState('');
  const [topicName, setTopicName] = useState('');
  const [speakerName, setSpeakerName] = useState('');
  const [timing, setTiming] = useState('01:00 PM - 01:30 PM');
  const [aboutSpeaker, setAboutSpeaker] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Aalim auto-selector modal state
  const [selectedAalimId, setSelectedAalimId] = useState<string>('manual');
  const [isAalimPickerVisible, setIsAalimPickerVisible] = useState(false);

  useEffect(() => {
    loadData();
    return subscribeToLocationUpdates((coords) => {
      setUserLocation(coords);
    });
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jList, mList, aList, loc] = await Promise.all([
        fetchSalahTimeJuma(),
        fetchSalahTimeMasjids(),
        fetchAalimUsers(),
        getQuickLocation(),
      ]);
      setJumas(jList);
      setMasjids(mList);
      setAalimUsers(aList);
      setUserLocation(loc);
    } catch (err) {
      console.warn('[FridayTopics] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group topics by masjid and calculate GPS distance
  const masjidTopicsList = useMemo(() => {
    const seenMasjids = new Map<
      string,
      {
        id: string;
        name: string;
        address?: string;
        distance?: number;
        lat?: number;
        lng?: number;
        presidentName?: string;
        famousArea?: string;
      }
    >();

    for (const m of masjids) {
      let dist = m.distance;
      if (dist === undefined && userLocation && m.latitude && m.longitude) {
        dist = calculateDistance(userLocation.latitude, userLocation.longitude, m.latitude, m.longitude);
      }
      seenMasjids.set(m.id, {
        id: m.id,
        name: m.name,
        address: m.address,
        distance: dist,
        lat: m.latitude,
        lng: m.longitude,
        presidentName: m.presidentName,
        famousArea: m.famousArea,
      });
    }

    for (const j of jumas) {
      if (j.masjidId && !seenMasjids.has(j.masjidId)) {
        seenMasjids.set(j.masjidId, {
          id: j.masjidId,
          name: j.masjidName,
          address: j.masjidAddress || j.address,
        });
      }
    }

    const list: Array<{
      masjidId: string;
      masjidName: string;
      address?: string;
      distance?: number;
      lat?: number;
      lng?: number;
      presidentName?: string;
      famousArea?: string;
      currentTopic?: SalahTimeJuma;
      pastTopics: SalahTimeJuma[];
    }> = [];

    seenMasjids.forEach((m) => {
      const history = getMasjidJumaTopics(m.id, m.name, jumas);
      // ONLY include in main default list if there is an upcoming Friday topic OR if it has past topics
      if (history.current || (history.past && history.past.length > 0)) {
        const mObj = masjids.find((x) => x.id === m.id || x.name.toLowerCase() === m.name.toLowerCase());
        const presName =
          mObj?.presidentName ||
          (m as any).presidentName ||
          history.current?.presidentName ||
          history.current?.createdByName;
        const famArea = mObj?.famousArea || (m as any).famousArea;

        list.push({
          masjidId: m.id,
          masjidName: m.name,
          address: m.address,
          distance: m.distance,
          lat: m.lat,
          lng: m.lng,
          presidentName: presName,
          famousArea: famArea,
          currentTopic: history.current,
          pastTopics: history.past,
        });
      }
    });

    // Proximity and freshness sort
    list.sort((a, b) => {
      // Masjids with an upcoming topic float before ones with only past topics
      if (a.currentTopic && !b.currentTopic) return -1;
      if (!a.currentTopic && b.currentTopic) return 1;

      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      if (a.distance !== undefined) return -1;
      if (b.distance !== undefined) return 1;

      const aTime = parseFridayDate(a.currentTopic?.fridayDateStr || a.currentTopic?.fridayDate);
      const bTime = parseFridayDate(b.currentTopic?.fridayDateStr || b.currentTopic?.fridayDate);
      return bTime - aTime;
    });

    return list;
  }, [masjids, jumas, userLocation]);

  // Main List: Filter the default view to ONLY show upcoming Fridays
  // and handle search and filter chips
  const filteredList = useMemo(() => {
    let list = masjidTopicsList;

    // Filter by chips
    if (activeFilter === 'nearby') {
      // Nearby filter chip: filter by GPS proximity (within 25km or with distance known)
      list = list.filter((i) => i.distance !== undefined && i.distance <= 25);
      list.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } else if (activeFilter === 'khateeb') {
      list = list.filter((i) => Boolean(i.currentTopic?.speakerName));
    } else if (activeFilter === 'masjid') {
      list = list.filter((i) => Boolean(i.masjidName));
    }

    if (!searchQuery.trim()) {
      // In default view, ensure every visible card has an upcoming topic or is searchable
      return list;
    }

    const q = searchQuery.toLowerCase().trim();
    return list.filter((item) => {
      const inMasjid = item.masjidName.toLowerCase().includes(q);
      const inTopic =
        (item.currentTopic?.topicName || '').toLowerCase().includes(q) ||
        (item.currentTopic?.aboutSpeaker || '').toLowerCase().includes(q);
      const inSpeaker = (item.currentTopic?.speakerName || '').toLowerCase().includes(q);
      const inAddress =
        (item.address || '').toLowerCase().includes(q) || (item.famousArea || '').toLowerCase().includes(q);
      const inCreator = (item.currentTopic?.createdBy || item.currentTopic?.createdByName || '')
        .toLowerCase()
        .includes(q);

      if (activeFilter === 'khateeb') return inSpeaker;
      if (activeFilter === 'masjid') return inMasjid || inAddress;
      return inMasjid || inTopic || inSpeaker || inAddress || inCreator;
    });
  }, [masjidTopicsList, searchQuery, activeFilter]);

  const togglePastTopics = (masjidId: string) => {
    setExpandedPastMap((prev) => ({
      ...prev,
      [masjidId]: !prev[masjidId],
    }));
  };

  const handleLike = (topicId: string, currentHearts: number = 0) => {
    setLikedMap((prev) => ({
      ...prev,
      [topicId]: (prev[topicId] ?? currentHearts) + 1,
    }));
  };

  const openInMaps = (lat?: number, lng?: number, name?: string) => {
    if (!lat || !lng) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}(${encodeURIComponent(name || 'Masjid')})`,
      android: `geo:0,0?q=${lat},${lng}(${encodeURIComponent(name || 'Masjid')})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });
    Linking.openURL(url!).catch(() => {});
  };

  const handleOpenPostModal = async () => {
    const u = await getCurrentUser();
    setCurrentUser(u);
    if (!u) {
      Alert.alert(
        'Login Required',
        'Only verified Imams, Muazzins, Committee members, and Administrators can post Friday Khutbah topics.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log In', onPress: () => router.push('/auth/login') },
        ]
      );
      return;
    }

    const allowed = ['ADMIN', 'IMAM', 'MUAZZIN', 'PRESIDENT', 'SECRETARY'];
    if (!allowed.includes(u.role)) {
      Alert.alert(
        'Permission Denied',
        `Your current tier (${u.role}) is not authorized to publish Friday topics. Please request an Imam or Muazzin role upgrade.`
      );
      return;
    }

    const targetId = u.masjidId || u.defaultMasjidId;
    if (targetId && masjids.length > 0) {
      const cleanTarget = targetId.replace(/^salahtime-/, '');
      const found = masjids.find(
        (m) => m.id === targetId || m.id.replace(/^salahtime-/, '') === cleanTarget
      );
      if (found) {
        setSelectedMasjid(found);
      }
    }

    if (u.name) {
      setSpeakerName(u.name);
    }

    setIsSubmitModalVisible(true);
  };

  const handleSelectAalim = (aalim: AalimUser | null) => {
    if (!aalim) {
      setSelectedAalimId('manual');
      // Reveal standard manual text input
      setIsAalimPickerVisible(false);
      return;
    }

    setSelectedAalimId(aalim.uid);
    setSpeakerName(aalim.name);
    setAboutSpeaker(aalim.about || 'Senior Islamic Scholar & Resident Aalim');
    setIsAalimPickerVisible(false);
  };

  const handleSubmitNewTopic = async () => {
    if (!selectedMasjid) {
      Alert.alert('Masjid Required', 'Please select an assigned Masjid from the dropdown list.');
      return;
    }
    if (!topicName.trim() || !speakerName.trim()) {
      Alert.alert('Required Fields', 'Please enter both the Topic Title and Khateeb Name.');
      return;
    }

    setSubmitting(true);
    const rawMasjidId = selectedMasjid.id.replace(/^salahtime-/, '');
    const dateFormatted = new Date().toLocaleDateString('en-GB') + ' 11:59 PM';
    const creator = currentUser?.name || 'Imam';
    const createdDateStr = new Date().toLocaleDateString('en-GB');

    const newEntry: SalahTimeJuma = {
      id: `juma-${Date.now()}`,
      masjidId: rawMasjidId,
      masjidName: selectedMasjid.name,
      masjidAddress: selectedMasjid.address || '',
      speakerName: speakerName.trim(),
      aboutSpeaker: aboutSpeaker.trim() || 'Resident Khateeb & Scholar',
      timing: timing.trim() || '01:00 PM - 01:30 PM',
      topicName: topicName.trim(),
      fridayDateStr: dateFormatted,
      createdByName: creator,
      createdBy: creator,
      createdOnStr: createdDateStr,
      status: 'approved',
      heartCount: 1,
    };

    setJumas((prev) => [newEntry, ...prev]);

    try {
      await publishSalahTimeJuma(newEntry);
      const session = await getImamSession();
      if (session) {
        await syncMuazzinKhutbahReminders(session);
      }
    } catch (e) {
      console.warn('[FridayTopics] Error publishing juma:', e);
    }

    setSubmitting(false);
    setIsSubmitModalVisible(false);
    setTopicName('');
    setSpeakerName('');
    setAboutSpeaker('');
    setSelectedAalimId('manual');
    Alert.alert('Khutbah Topic Published', `Topic published for "${selectedMasjid.name}" successfully.`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* ─── TOP NAVIGATION HEADER: TITLE | ADD FRIDAY TOPIC ─── */}
      <View style={[styles.navHeader, contentContainerStyle, { borderBottomColor: colors.borderSubtle }]}>
        <View style={styles.navHeaderLeft}>
          <Feather name="mic" size={20} color={colors.accentGold} style={{ marginRight: 8 }} />
          <Text style={[styles.navTitle, { color: colors.text }]}>{t('friday.title', "Jumu'ah Topics")}</Text>
        </View>

        {/* Change button text to "Add Friday Topic" */}
        <TouchableOpacity
          style={[styles.postTopicBtn, { backgroundColor: colors.accentGold }]}
          onPress={handleOpenPostModal}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={13} color="#0f1718" style={{ marginRight: 4 }} />
          <Text style={[styles.postTopicBtnText, { color: '#0f1718' }]}>Add Friday Topic</Text>
        </TouchableOpacity>
      </View>

      {/* Multi-Field Search Bar & Filter Chips (Nearby Masjids chip added, By President removed) */}
      <View style={[styles.searchBarRow, contentContainerStyle, { borderBottomColor: colors.borderSubtle }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.accentGold} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('friday.searchPlaceholder', "Search by Topic, Khateeb, Masjid...")}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterChipsRow}>
          {[
            { id: 'all', label: 'All Upcoming' },
            { id: 'nearby', label: 'Nearby Masjids' },
            { id: 'khateeb', label: 'By Khateeb' },
            { id: 'masjid', label: 'By Masjid' },
          ].map((chip) => {
            const isSelected = activeFilter === chip.id;
            return (
              <TouchableOpacity
                key={chip.id}
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.pill, borderColor: colors.borderSubtle },
                  isSelected && { backgroundColor: colors.accentGoldBg, borderColor: colors.accentGold },
                ]}
                onPress={() => setActiveFilter(chip.id as any)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: colors.textMuted },
                    isSelected && { color: '#0f1718', fontWeight: '700' },
                  ]}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Topics Content Stream */}
      <ScrollView contentContainerStyle={[styles.scrollList, contentContainerStyle]}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.accentGold} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading Upcoming Jumu'ah Topics...</Text>
          </View>
        ) : filteredList.length === 0 ? (
          <View style={styles.centerBox}>
            <Feather name="book-open" size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No upcoming Jumu'ah topics found.</Text>
          </View>
        ) : (
          filteredList.map((item) => {
            const topic = item.currentTopic;
            const isPastExpanded = Boolean(expandedPastMap[item.masjidId]);

            return (
              <View key={item.masjidId} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {/* Masjid Name & Distance Header */}
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.masjidName, { color: colors.text }]} numberOfLines={1}>
                      {item.masjidName}
                    </Text>
                    {item.address ? (
                      <Text style={[styles.masjidAddress, { color: colors.textMuted }]} numberOfLines={1}>
                        {item.address}
                      </Text>
                    ) : null}
                  </View>

                  {item.distance !== undefined && item.distance > 0 && userLocation && formatDistance(item.distance) ? (
                    <View style={styles.distanceBadge}>
                      <Feather name="map-pin" size={10} color={colors.accentGold} style={{ marginRight: 3 }} />
                      <Text style={[styles.distanceText, { color: colors.accentGold }]}>{formatDistance(item.distance)}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Main List: Filter the default view to ONLY show upcoming Fridays */}
                {topic ? (
                  <View style={[styles.khutbahBox, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                    <View style={styles.khutbahHeaderRow}>
                      <View style={styles.khutbahBadge}>
                        <Feather name="book-open" size={10} color={colors.accentGold} style={{ marginRight: 4 }} />
                        <Text style={styles.khutbahBadgeText}>Upcoming Friday Khutbah</Text>
                      </View>
                      <View style={styles.timingBadge}>
                        <Feather name="clock" size={10} color={colors.accentGreen} style={{ marginRight: 3 }} />
                        <Text style={styles.timingBadgeText}>{topic.timing}</Text>
                      </View>
                    </View>

                    <Text style={[styles.topicTitle, { color: colors.accentGold }]}>{topic.topicName}</Text>

                    <View style={styles.speakerRow}>
                      <Feather name="user" size={11} color={colors.accentGold} style={{ marginRight: 4 }} />
                      <Text style={[styles.speakerText, { color: colors.textSecondary }]}>
                        Khateeb: <Text style={[styles.speakerNameBold, { color: colors.text }]}>{topic.speakerName}</Text>
                      </Text>
                    </View>
                    {topic.aboutSpeaker ? (
                      <Text style={[styles.aboutSpeakerText, { color: colors.textMuted }]}>{topic.aboutSpeaker}</Text>
                    ) : null}

                    {/* Topic Cards: Display Created By: {topic.createdBy} and Created On: {topic.createdOnStr} on every card */}
                    <View style={[styles.createdMetaBox, { borderTopColor: colors.borderSubtle }]}>
                      <View style={styles.createdMetaItem}>
                        <Feather name="user-check" size={10} color={colors.textMuted} style={{ marginRight: 4 }} />
                        <Text style={[styles.createdMetaText, { color: colors.textMuted }]}>
                          Created By: <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{topic.createdBy || topic.createdByName || 'Imam'}</Text>
                        </Text>
                      </View>
                      <View style={styles.createdMetaItem}>
                        <Feather name="calendar" size={10} color={colors.textMuted} style={{ marginRight: 4 }} />
                        <Text style={[styles.createdMetaText, { color: colors.textMuted }]}>
                          Created On: <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{topic.createdOnStr || (topic.fridayDateStr ? topic.fridayDateStr.split(' ')[0] : 'Recently')}</Text>
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.noUpcomingBox, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.noUpcomingText, { color: colors.textMuted }]}>
                      No upcoming Khutbah announced yet. Check past weeks below.
                    </Text>
                  </View>
                )}

                {/* Past List: Move any Khutbah with a date older than today into the "Past Weeks" accordion */}
                {item.pastTopics && item.pastTopics.length > 0 && (
                  <View style={[styles.pastContainer, { borderTopColor: colors.borderSubtle }]}>
                    <TouchableOpacity
                      style={[styles.pastToggleBtn, { backgroundColor: colors.pill }]}
                      onPress={() => togglePastTopics(item.masjidId)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Feather name="calendar" size={11} color={colors.accentGold} style={{ marginRight: 5 }} />
                        <Text style={[styles.pastToggleBtnText, { color: colors.textSecondary }]}>
                          Past Weeks' Khutbahs ({item.pastTopics.length})
                        </Text>
                      </View>
                      <Feather
                        name={isPastExpanded ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color={colors.accentGold}
                      />
                    </TouchableOpacity>

                    {isPastExpanded && (
                      <View style={styles.pastList}>
                        {[...item.pastTopics]
                          .sort((a, b) => parseFridayDate(b.fridayDateStr || b.fridayDate) - parseFridayDate(a.fridayDateStr || a.fridayDate))
                          .map((pt, pIdx) => (
                            <View key={pt.id || `past-${pIdx}`} style={[styles.pastItem, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                              <View style={styles.pastItemHeader}>
                                <Text style={[styles.pastWeekLabel, { color: colors.accentGold }]}>
                                  {pIdx === 0 ? 'Last Week' : `${pIdx + 1} Weeks Ago`}
                                </Text>
                                <Text style={[styles.pastDateLabel, { color: colors.textMuted }]}>
                                  {pt.fridayDateStr ? pt.fridayDateStr.split(' ')[0] : 'Past Friday'}
                                </Text>
                              </View>
                              <Text style={[styles.pastTopicName, { color: colors.text }]}>{pt.topicName}</Text>
                              <Text style={[styles.pastSpeakerName, { color: colors.textSecondary }]}>
                                Khateeb: {pt.speakerName}
                              </Text>
                              {/* Display Created By and Created On for past cards too */}
                              <View style={styles.pastMetaRow}>
                                <Text style={[styles.pastMetaText, { color: colors.textMuted }]}>
                                  Created By: {pt.createdBy || pt.createdByName || 'Imam'}  •  Created On: {pt.createdOnStr || (pt.fridayDateStr ? pt.fridayDateStr.split(' ')[0] : 'Past')}
                                </Text>
                              </View>
                            </View>
                          ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Card Action Footer */}
                <View style={styles.cardFooter}>
                  {topic ? (
                    <TouchableOpacity
                      style={[styles.heartBtn, { backgroundColor: colors.pill, borderColor: colors.borderSubtle }]}
                      onPress={() => handleLike(topic.id, topic.heartCount)}
                      activeOpacity={0.7}
                    >
                      <Feather name="heart" size={12} color="#f43f5e" style={{ marginRight: 4 }} />
                      <Text style={[styles.heartText, { color: colors.textSecondary }]}>
                        {likedMap[topic.id] ?? (topic.heartCount || 0)} Helpful
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {item.lat && item.lng ? (
                    <TouchableOpacity
                      style={[styles.directionsBtn, { backgroundColor: colors.pill, borderColor: colors.borderSubtle }]}
                      onPress={() => openInMaps(item.lat, item.lng, item.masjidName)}
                      activeOpacity={0.7}
                    >
                      <Feather name="navigation" size={11} color={colors.accentGold} style={{ marginRight: 4 }} />
                      <Text style={[styles.directionsBtnText, { color: colors.accentGold }]}>Directions</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Post Jumu'ah Topic Modal */}
      <Modal visible={isSubmitModalVisible} animationType="slide" transparent onRequestClose={() => setIsSubmitModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Friday Topic</Text>
              <TouchableOpacity onPress={() => setIsSubmitModalVisible(false)}>
                <Feather name="x" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Select Masjid (Verified Directory) *</Text>
              <TouchableOpacity
                style={[styles.modalDdlBtn, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}
                onPress={() => setIsMasjidPickerVisible(true)}
                activeOpacity={0.8}
              >
                <Feather name="map-pin" size={15} color={colors.accentGold} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.modalDdlText,
                      { color: colors.text },
                      !selectedMasjid && { color: colors.textMuted, fontStyle: 'italic' },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedMasjid ? selectedMasjid.name : 'Select Masjid from verified directory...'}
                  </Text>
                  {selectedMasjid && (
                    <Text style={[styles.modalDdlSubtext, { color: colors.textMuted }]} numberOfLines={1}>
                      {selectedMasjid.address}
                    </Text>
                  )}
                </View>
                <Feather name="chevron-down" size={16} color={colors.accentGold} />
              </TouchableOpacity>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Khutbah Topic Title *</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle, color: colors.text }]}
                placeholder="e.g. Importance of Sincerity (Ikhlas)"
                placeholderTextColor={colors.textMuted}
                value={topicName}
                onChangeText={setTopicName}
              />

              {/* Add Topic Modal: Selector to auto-load users where isAalim === true for the "About Speaker" field.
                  Provide "None of the above / Manual Input" fallback option that reveals standard text input. */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Select Speaker / Aalim (Auto-Load isAalim)</Text>
              <TouchableOpacity
                style={[styles.modalDdlBtn, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}
                onPress={() => setIsAalimPickerVisible(true)}
                activeOpacity={0.8}
              >
                <Feather name="user-check" size={15} color={colors.accentGold} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalDdlText, { color: colors.text }]} numberOfLines={1}>
                    {selectedAalimId === 'manual'
                      ? 'None of the above / Manual Input'
                      : aalimUsers.find((a) => a.uid === selectedAalimId)?.name || 'Verified Scholar Selected'}
                  </Text>
                  <Text style={[styles.modalDdlSubtext, { color: colors.textMuted }]} numberOfLines={1}>
                    {selectedAalimId === 'manual'
                      ? 'Tap to select a verified scholar or type manually below'
                      : aalimUsers.find((a) => a.uid === selectedAalimId)?.about || 'Verified Islamic Scholar'}
                  </Text>
                </View>
                <Feather name="chevron-down" size={16} color={colors.accentGold} />
              </TouchableOpacity>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Khateeb / Speaker Name *</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle, color: colors.text }]}
                placeholder="e.g. Shaikh Saleh Saed Ba Yazid"
                placeholderTextColor={colors.textMuted}
                value={speakerName}
                onChangeText={setSpeakerName}
              />

              {/* Standard text input for About Speaker revealed when manual input is active */}
              {selectedAalimId === 'manual' && (
                <>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>About Khateeb (Manual Input)</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle, color: colors.text }]}
                    placeholder="e.g. Senior Scholar & Resident Imam"
                    placeholderTextColor={colors.textMuted}
                    value={aboutSpeaker}
                    onChangeText={setAboutSpeaker}
                  />
                </>
              )}

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Jumu'ah Timings</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle, color: colors.text }]}
                placeholder="01:00 PM - 01:30 PM"
                placeholderTextColor={colors.textMuted}
                value={timing}
                onChangeText={setTiming}
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.accentGold }]}
                onPress={handleSubmitNewTopic}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#0f1718" />
                ) : (
                  <Text style={[styles.submitBtnText, { color: '#0f1718' }]}>Publish Friday Topic</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Aalim Selector Modal */}
      <Modal visible={isAalimPickerVisible} transparent animationType="slide" onRequestClose={() => setIsAalimPickerVisible(false)}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Verified Scholar (isAalim)</Text>
              <TouchableOpacity onPress={() => setIsAalimPickerVisible(false)}>
                <Feather name="x" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {/* Fallback Option */}
              <TouchableOpacity
                style={[
                  styles.pickerItem,
                  { borderBottomColor: colors.borderSubtle },
                  selectedAalimId === 'manual' && { backgroundColor: colors.pill },
                ]}
                onPress={() => handleSelectAalim(null)}
              >
                <Feather name="edit-3" size={16} color={colors.accentGold} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickerItemName, { color: colors.accentGold, fontWeight: '700' }]}>
                    None of the above / Manual Input
                  </Text>
                  <Text style={[styles.pickerItemAddress, { color: colors.textMuted }]}>
                    Reveals standard custom text input for speaker and about speaker.
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Verified Scholars List */}
              {aalimUsers.map((aalim) => {
                const isSelected = selectedAalimId === aalim.uid;
                return (
                  <TouchableOpacity
                    key={aalim.uid}
                    style={[
                      styles.pickerItem,
                      { borderBottomColor: colors.borderSubtle },
                      isSelected && { backgroundColor: colors.pill },
                    ]}
                    onPress={() => handleSelectAalim(aalim)}
                  >
                    <Feather name="award" size={16} color={colors.accentGold} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerItemName, { color: colors.text }]}>{aalim.name}</Text>
                      {aalim.about ? (
                        <Text style={[styles.pickerItemAddress, { color: colors.textMuted }]}>{aalim.about}</Text>
                      ) : null}
                    </View>
                    {isSelected && <Feather name="check" size={16} color={colors.accentGold} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Searchable Masjid Dropdown List Picker Modal */}
      <Modal visible={isMasjidPickerVisible} transparent animationType="slide" onRequestClose={() => setIsMasjidPickerVisible(false)}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Masjid for Topic</Text>
              <TouchableOpacity onPress={() => setIsMasjidPickerVisible(false)}>
                <Feather name="x" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.pickerSearchBox, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}>
              <Feather name="search" size={14} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.pickerSearchInput, { color: colors.text }]}
                placeholder="Search masjid name or area..."
                placeholderTextColor={colors.textMuted}
                value={masjidPickerSearch}
                onChangeText={setMasjidPickerSearch}
              />
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {masjids
                .filter(
                  (m) =>
                    !masjidPickerSearch.trim() ||
                    m.name.toLowerCase().includes(masjidPickerSearch.toLowerCase()) ||
                    (m.address || '').toLowerCase().includes(masjidPickerSearch.toLowerCase())
                )
                .map((m) => {
                  const isSelected = selectedMasjid?.id === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        styles.pickerItem,
                        { borderBottomColor: colors.borderSubtle },
                        isSelected && { backgroundColor: colors.pill },
                      ]}
                      onPress={() => {
                        setSelectedMasjid(m);
                        setIsMasjidPickerVisible(false);
                      }}
                    >
                      <Feather name="map-pin" size={14} color={colors.accentGold} style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pickerItemName, { color: colors.text }]}>{m.name}</Text>
                        {m.address ? (
                          <Text style={[styles.pickerItemAddress, { color: colors.textMuted }]} numberOfLines={1}>
                            {m.address}
                          </Text>
                        ) : null}
                      </View>
                      {isSelected && <Feather name="check" size={16} color={colors.accentGold} />}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  navHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  postTopicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  postTopicBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchBarRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
  },
  filterChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  scrollList: {
    padding: 16,
    gap: 12,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  masjidName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  masjidAddress: {
    fontSize: 12,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226, 162, 59, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  distanceText: {
    fontSize: 10,
    fontWeight: '700',
  },
  khutbahBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  noUpcomingBox: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  noUpcomingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  khutbahHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  khutbahBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226, 162, 59, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  khutbahBadgeText: {
    color: '#e2a23b',
    fontSize: 10,
    fontWeight: '700',
  },
  timingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timingBadgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
  },
  topicTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  speakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  speakerText: {
    fontSize: 12,
  },
  speakerNameBold: {
    fontWeight: '700',
  },
  aboutSpeakerText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  createdMetaBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 4,
  },
  createdMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createdMetaText: {
    fontSize: 10,
  },
  pastContainer: {
    borderTopWidth: 1,
    paddingTop: 8,
    marginBottom: 8,
  },
  pastToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  pastToggleBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pastList: {
    marginTop: 8,
    gap: 6,
  },
  pastItem: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  pastItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  pastWeekLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  pastDateLabel: {
    fontSize: 10,
  },
  pastTopicName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  pastSpeakerName: {
    fontSize: 11,
  },
  pastMetaRow: {
    marginTop: 4,
    paddingTop: 4,
  },
  pastMetaText: {
    fontSize: 9,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  heartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  heartText: {
    fontSize: 11,
    fontWeight: '600',
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  directionsBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    maxHeight: '85%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalForm: {
    marginTop: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  modalDdlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  modalDdlText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalDdlSubtext: {
    fontSize: 11,
    marginTop: 1,
  },
  submitBtn: {
    marginTop: 18,
    marginBottom: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  pickerCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    maxHeight: 450,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  pickerSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    marginBottom: 10,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 12,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderRadius: 6,
  },
  pickerItemName: {
    fontSize: 13,
    fontWeight: '600',
  },
  pickerItemAddress: {
    fontSize: 11,
    marginTop: 1,
  },
});
