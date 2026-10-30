import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Linking,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getUserName,
  saveUserName,
  fetchCommunityFeedback,
  submitFeedback,
  deleteFeedback,
  sendJazakAllah,
  sendCommunityJazakAllahDocument,
  getJazakAllahCount,
  submitStructuredRequest,
  CommunityFeedback,
  fetchCommunityLeaderboard,
  LeaderboardUser,
} from '../../lib/community';
import { getImamSession } from '../../lib/masjidTimingSync';
import { getCurrentUser, UserProfile } from '../../lib/auth';
import { fetchSalahTimeMasjids } from '../../lib/salahTimeBackend';
import { useTheme } from '../../lib/theme';
import { useResponsiveLayout } from '../../lib/responsive';
import { Masjid } from '../../lib/masjid';

const HOME_MASJID_KEY = '@deen_home_masjid_pref_v1';
const GENDER_PRIVACY_KEY = '@deen_gender_privacy_pref_v1';

const REQUEST_TYPES = ['Feedback', 'Masjid Request', 'Role Upgrade', 'Contact Request'] as const;

export default function CommunityFeedbackScreen() {
  const { colors, isDark } = useTheme();
  const { contentContainerStyle } = useResponsiveLayout();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'feedback' | 'request' | 'contact'>('leaderboard');

  useEffect(() => {
    if (params.tab === '2' || params.tab === 'request') {
      setActiveTab('request');
    }
  }, [params.tab]);
  const [leaderboardUsers, setLeaderboardUsers] = useState<LeaderboardUser[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardUser | null>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // User state
  const [name, setName] = useState('');
  const [homeMasjid, setHomeMasjid] = useState('');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Feedback board
  const [feedbacks, setFeedbacks] = useState<CommunityFeedback[]>([]);
  const [newFeedbackText, setNewFeedbackText] = useState('');
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [imamSession, setImamSession] = useState<any>(null);

  // Jazakallah state
  const [jazakAllahCount, setJazakAllahCount] = useState<number>(482);

  // Structured Request state
  const [requestType, setRequestType] = useState<typeof REQUEST_TYPES[number]>('Feedback');
  const [requestMessage, setRequestMessage] = useState('');
  const [wantToContact, setWantToContact] = useState(false);
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Masjid selector for requests
  const [masjids, setMasjids] = useState<Masjid[]>([]);
  const [selectedMasjid, setSelectedMasjid] = useState<Masjid | null>(null);
  const [isMasjidPickerVisible, setIsMasjidPickerVisible] = useState(false);
  const [masjidSearch, setMasjidSearch] = useState('');

  useEffect(() => {
    loadPreferences();
    loadFeedbackBoard();
    loadLeaderboardData();
    getJazakAllahCount().then(setJazakAllahCount);
    fetchSalahTimeMasjids().then(setMasjids).catch(() => {});
  }, []);

  const handleResetLeaderboardStats = async () => {
    Alert.alert(
      "Reset & Refresh Leaderboard",
      "Do you want to recalculate and refresh all leaderboard stats for all users?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset & Sync",
          onPress: async () => {
            setLoadingLeaderboard(true);
            try {
              await AsyncStorage.removeItem('@salah_time_leaderboard_cache');
              const res = await fetchCommunityLeaderboard();
              setLeaderboardUsers(res.leaderboard);
              Alert.alert("Leaderboard Refreshed", "All stats for all users have been synchronized with the latest contributions!");
            } catch (err) {
              Alert.alert("Error", "Could not refresh leaderboard stats.");
            } finally {
              setLoadingLeaderboard(false);
            }
          },
        },
      ]
    );
  };

  const loadLeaderboardData = async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await fetchCommunityLeaderboard();
      setLeaderboardUsers(res.leaderboard);
      setCurrentUserRank(res.currentUserRank || null);
    } catch (err) {
      console.warn('Error loading leaderboard:', err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };



  const loadPreferences = async () => {
    try {
      const u = await getCurrentUser();
      setCurrentUser(u);
      if (u) {
        setName(u.name);
        setContactPhone(u.mobile || '');
        setContactEmail(u.email || '');
      } else {
        const uName = await getUserName();
        setName(uName);
      }
      const hMasjid = await AsyncStorage.getItem(HOME_MASJID_KEY);
      if (hMasjid) setHomeMasjid(hMasjid);

      const imamS = await getImamSession();
      setImamSession(imamS);
    } catch {}
  };

  const loadFeedbackBoard = async () => {
    setLoadingFeedback(true);
    try {
      const data = await fetchCommunityFeedback();
      // Ensure the feedback list sorts newest items to the very top (reverse chronological)
      const sorted = [...data].sort((a, b) => {
        const timeA = a.createdOn ? new Date(a.createdOn).getTime() : 0;
        const timeB = b.createdOn ? new Date(b.createdOn).getTime() : 0;
        return timeB - timeA;
      });
      setFeedbacks(sorted);
    } catch (err) {
      console.warn('Error loading feedback:', err);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const handleSendJazakAllah = async (targetName?: string, targetUid?: string) => {
    const senderUid = currentUser?.uid || 'sender_uid';
    const targetUserId = targetUid || (targetName ? `uid_${targetName.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : 'target_uid');

    // Refactored Firestore document structure exactly as requested for the jazakallah collection:
    // {
    //   "salahTimeId": "community_board",
    //   "jazakAllahGivenUserId": "target_uid",
    //   "jazakAllahTakenUserId": "sender_uid",
    //   "masjidId": "global"
    // }
    const res = await sendCommunityJazakAllahDocument(
      {
        salahTimeId: 'community_board',
        jazakAllahGivenUserId: targetUserId,
        jazakAllahTakenUserId: senderUid,
        masjidId: 'global',
      },
      currentUser?.token
    );

    setJazakAllahCount(res.newCount);
    Alert.alert(
      'JazakAllah Khair! 🤲',
      'May Allah reward your appreciation and bless the entire community with khair.'
    );
  };

  const handlePostFeedback = async () => {
    const author = name.trim() || currentUser?.name || 'Believer';
    if (!newFeedbackText.trim() || newFeedbackText.trim().length < 5) {
      Alert.alert('Message Too Short', 'Please enter your thoughts or suggestions (at least 5 characters).');
      return;
    }

    setSubmittingFeedback(true);
    try {
      const res = await submitFeedback(author, newFeedbackText.trim());
      if (res.success) {
        setNewFeedbackText('');
        loadFeedbackBoard();
        Alert.alert('JazakAllah Khair!', 'Your message has been shared with the community.');
      } else {
        Alert.alert('Error', res.error || 'Failed to submit feedback.');
      }
    } catch {
      Alert.alert('Error', 'Unable to post feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleSubmitRequest = async () => {
    const author = name.trim() || currentUser?.name || 'Believer';
    if (!requestMessage.trim() || requestMessage.trim().length < 5) {
      Alert.alert('Details Required', 'Please enter details for your request (at least 5 characters).');
      return;
    }
    if (wantToContact && !contactPhone.trim() && !contactEmail.trim()) {
      Alert.alert('Contact Required', 'Please enter your phone number or email so we can contact you.');
      return;
    }

    setSubmittingRequest(true);
    try {
      const res = await submitStructuredRequest({
        name: author,
        contactPhone: contactPhone.trim(),
        email: contactEmail.trim(),
        wantToContact,
        requestType,
        masjidId: selectedMasjid ? selectedMasjid.id.replace(/^salahtime-/, '') : undefined,
        masjidName: selectedMasjid ? selectedMasjid.name : undefined,
        message: requestMessage.trim(),
      });

      if (res.success) {
        setRequestMessage('');
        Alert.alert(
          'Request Submitted',
          'Your request has been logged. Our administration team will review it shortly. JazakAllah Khair!'
        );
        setActiveTab('feedback');
        loadFeedbackBoard();
      } else {
        Alert.alert('Submission Error', res.error || 'Failed to submit request.');
      }
    } catch {
      Alert.alert('Error', 'Unable to submit request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleDeleteFeedback = (docId: string) => {
    Alert.alert('Delete Feedback', 'Are you sure you want to delete this community feedback item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const res = await deleteFeedback(docId);
          if (res.success) {
            setFeedbacks((prev) => prev.filter((f) => (f.docId || f.id) !== docId));
          } else {
            Alert.alert('Error', res.error || 'Failed to delete');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* 4-Segment Control Bar with Perfect 25% Symmetry */}
      <View style={[styles.segmentedBar, { backgroundColor: colors.pill }]}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'leaderboard' && { backgroundColor: colors.accentGoldBg }]}
          onPress={() => setActiveTab('leaderboard')}
          activeOpacity={0.8}
        >
          <Feather
            name="award"
            size={11}
            color={activeTab === 'leaderboard' ? '#0f1718' : colors.textMuted}
            style={{ marginRight: 2 }}
          />
          <Text
            numberOfLines={1}
            style={[styles.segmentText, { color: colors.textMuted }, activeTab === 'leaderboard' && { color: '#0f1718', fontWeight: '700' }]}
          >
            Ranks
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'feedback' && { backgroundColor: colors.accentGoldBg }]}
          onPress={() => setActiveTab('feedback')}
          activeOpacity={0.8}
        >
          <Feather
            name="message-square"
            size={11}
            color={activeTab === 'feedback' ? '#0f1718' : colors.textMuted}
            style={{ marginRight: 2 }}
          />
          <Text
            numberOfLines={1}
            style={[styles.segmentText, { color: colors.textMuted }, activeTab === 'feedback' && { color: '#0f1718', fontWeight: '700' }]}
          >
            Community
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'request' && { backgroundColor: colors.accentGoldBg }]}
          onPress={() => setActiveTab('request')}
          activeOpacity={0.8}
        >
          <Feather
            name="send"
            size={11}
            color={activeTab === 'request' ? '#0f1718' : colors.textMuted}
            style={{ marginRight: 2 }}
          />
          <Text
            numberOfLines={1}
            style={[styles.segmentText, { color: colors.textMuted }, activeTab === 'request' && { color: '#0f1718', fontWeight: '700' }]}
          >
            Requests
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'contact' && { backgroundColor: colors.accentGoldBg }]}
          onPress={() => setActiveTab('contact')}
          activeOpacity={0.8}
        >
          <Feather
            name="heart"
            size={11}
            color={activeTab === 'contact' ? '#0f1718' : colors.textMuted}
            style={{ marginRight: 2 }}
          />
          <Text
            numberOfLines={1}
            style={[styles.segmentText, { color: colors.textMuted }, activeTab === 'contact' && { color: '#0f1718', fontWeight: '700' }]}
          >
            Reach Us
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, contentContainerStyle]} keyboardShouldPersistTaps="handled">
        {/* ─── TAB 0: COMMUNITY LEADERBOARD ─── */}
        {activeTab === 'leaderboard' && (
          <View>
            {/* Header Banner */}
            <View style={[styles.leaderboardBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.leaderboardHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.leaderboardBannerTitle, { color: colors.accentGold }]}>
                    🏆 Khadim-e-Masjid Leaderboard
                  </Text>
                  <Text style={[styles.leaderboardBannerSubtitle, { color: colors.textSecondary }]}>
                    Honoring believers who maintain accurate Salah timings & expand our Masjid network.
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity
                    style={[styles.leaderboardResetBtn, { backgroundColor: 'rgba(226, 162, 59, 0.15)', borderColor: 'rgba(226, 162, 59, 0.35)' }]}
                    onPress={handleResetLeaderboardStats}
                    disabled={loadingLeaderboard}
                  >
                    <Feather name="rotate-ccw" size={12} color={colors.accentGold} style={{ marginRight: 4 }} />
                    <Text style={[styles.leaderboardResetBtnText, { color: colors.accentGold }]}>Reset Stats</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.leaderboardRefreshBtn, { backgroundColor: colors.pill }]}
                    onPress={loadLeaderboardData}
                    disabled={loadingLeaderboard}
                  >
                    {loadingLeaderboard ? (
                      <ActivityIndicator size="small" color={colors.accentGold} />
                    ) : (
                      <Feather name="refresh-cw" size={14} color={colors.accentGold} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Formula & Anti-Spam Legend */}
              <View style={[styles.formulaBox, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.formulaTitle, { color: colors.accentGold }]}>Sadaqah Point Engine:</Text>
                <View style={styles.formulaPillsRow}>
                  <View style={[styles.formulaPill, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.formulaPillText, { color: colors.text }]}>➕ New Masjid: <Text style={{ color: colors.accentGold, fontWeight: '700' }}>+100 pts</Text></Text>
                  </View>
                  <View style={[styles.formulaPill, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.formulaPillText, { color: colors.text }]}>🕌 Unique Masjid: <Text style={{ color: colors.accentGold, fontWeight: '700' }}>+50 pts</Text></Text>
                  </View>
                  <View style={[styles.formulaPill, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.formulaPillText, { color: colors.text }]}>🔄 Timing Update: <Text style={{ color: colors.accentGold, fontWeight: '700' }}>+10 pts</Text></Text>
                  </View>
                </View>
                <View style={styles.antiSpamGuardRow}>
                  <Feather name="shield" size={11} color="#00ff66" style={{ marginRight: 4 }} />
                  <Text style={[styles.antiSpamGuardText, { color: colors.textMuted }]}>
                    Anti-Spam Guard: 24h cooldown per masjid & live diff validation active
                  </Text>
                </View>
              </View>
            </View>

            {/* Current User Standing Card */}
            {currentUserRank && (
              <View style={[styles.currentUserStandingCard, { backgroundColor: colors.card, borderColor: colors.accentGold }]}>
                <View style={styles.currentUserHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.currentUserRankBadge, { backgroundColor: colors.accentGoldBg, color: '#0f1718' }]}>
                        Rank #{currentUserRank.rank}
                      </Text>
                      <Text style={[styles.currentUserBadgeTag, { color: colors.accentGold }]}>
                        {currentUserRank.badgeIcon} {currentUserRank.badge}
                      </Text>
                    </View>
                    <Text style={[styles.currentUserName, { color: colors.text }]}>{currentUserRank.name}</Text>
                    <Text style={[styles.currentUserRoleTag, { color: colors.textMuted }]}>{currentUserRank.displayRole}</Text>
                  </View>
                  <View style={styles.currentUserPointsBox}>
                    <Text style={[styles.currentUserPointsValue, { color: colors.accentGold }]}>
                      {currentUserRank.totalPoints.toLocaleString()}
                    </Text>
                    <Text style={[styles.currentUserPointsLabel, { color: colors.textMuted }]}>Sadaqah Pts</Text>
                  </View>
                </View>

                {/* 4-Grid Breakdown */}
                <View style={[styles.statsGrid, { borderTopColor: colors.borderSubtle }]}>
                  <View style={styles.statCell}>
                    <Text style={[styles.statCellNum, { color: colors.text }]}>{currentUserRank.masjidsAddedCount}</Text>
                    <Text style={[styles.statCellLabel, { color: colors.textMuted }]}>Added</Text>
                  </View>
                  <View style={styles.statCell}>
                    <Text style={[styles.statCellNum, { color: colors.text }]}>{currentUserRank.uniqueMasjidsUpdatedCount}</Text>
                    <Text style={[styles.statCellLabel, { color: colors.textMuted }]}>Unique Masjids</Text>
                  </View>
                  <View style={styles.statCell}>
                    <Text style={[styles.statCellNum, { color: colors.text }]}>{currentUserRank.salahUpdateCount}</Text>
                    <Text style={[styles.statCellLabel, { color: colors.textMuted }]}>Updates</Text>
                  </View>
                  <View style={styles.statCell}>
                    <Text style={[styles.statCellNum, { color: colors.accentGold }]}>{currentUserRank.totalPoints}</Text>
                    <Text style={[styles.statCellLabel, { color: colors.textMuted }]}>Points</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Top Contributors Header */}
            <View style={styles.leaderboardSectionHeader}>
              <Text style={[styles.leaderboardSectionTitle, { color: colors.text }]}>Top Contributors</Text>
              <Text style={[styles.leaderboardSectionCount, { color: colors.textMuted }]}>
                {leaderboardUsers.length} verified contributors
              </Text>
            </View>

            {/* Contributors List */}
            {leaderboardUsers.map((user) => {
              const isTop1 = user.rank === 1;
              const isTop2 = user.rank === 2;
              const isTop3 = user.rank === 3;
              const isCurrent = user.isCurrentUser;

              let rankBorderColor = colors.border;
              let rankBgColor = colors.card;
              if (isTop1) {
                rankBorderColor = '#FFD700';
              } else if (isTop2) {
                rankBorderColor = '#C0C0C0';
              } else if (isTop3) {
                rankBorderColor = '#CD7F32';
              } else if (isCurrent) {
                rankBorderColor = colors.accentGold;
              }

              return (
                <View
                  key={user.uid}
                  style={[
                    styles.contributorCard,
                    {
                      backgroundColor: rankBgColor,
                      borderColor: rankBorderColor,
                      borderWidth: isTop1 || isTop2 || isTop3 || isCurrent ? 1.5 : 1,
                    },
                  ]}
                >
                  <View style={styles.contributorLeftCol}>
                    <View
                      style={[
                        styles.contributorRankCircle,
                        isTop1 && { backgroundColor: 'rgba(255, 215, 0, 0.2)' },
                        isTop2 && { backgroundColor: 'rgba(192, 192, 192, 0.2)' },
                        isTop3 && { backgroundColor: 'rgba(205, 127, 50, 0.2)' },
                        !isTop1 && !isTop2 && !isTop3 && { backgroundColor: colors.pill },
                      ]}
                    >
                      <Text
                        style={[
                          styles.contributorRankNum,
                          isTop1 && { color: '#FFD700', fontWeight: '800' },
                          isTop2 && { color: '#C0C0C0', fontWeight: '800' },
                          isTop3 && { color: '#CD7F32', fontWeight: '800' },
                          !isTop1 && !isTop2 && !isTop3 && { color: colors.textMuted },
                        ]}
                      >
                        #{user.rank}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.contributorMidCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Text style={[styles.contributorNameText, { color: colors.text }]}>
                        {user.name}
                      </Text>
                      {isCurrent && (
                        <Text style={[styles.youTag, { backgroundColor: colors.accentGoldBg, color: '#0f1718' }]}>
                          YOU
                        </Text>
                      )}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <Text style={[styles.contributorRoleText, { color: colors.accentGold }]}>
                        {user.displayRole}
                      </Text>
                      <Text style={[styles.contributorBadgeTag, { color: colors.textMuted }]}>
                        • {user.badgeIcon} {user.badge}
                      </Text>
                    </View>

                    <Text style={[styles.contributorStatsBreakdown, { color: colors.textMuted }]}>
                      {user.masjidsAddedCount > 0 ? `${user.masjidsAddedCount} Added • ` : ''}
                      {user.uniqueMasjidsUpdatedCount} Masjids • {user.salahUpdateCount} Updates
                    </Text>
                  </View>

                  <View style={styles.contributorRightCol}>
                    <Text style={[styles.contributorPointsValue, { color: colors.accentGold }]}>
                      {user.totalPoints.toLocaleString()}
                    </Text>
                    <Text style={[styles.contributorPointsUnit, { color: colors.textMuted }]}>pts</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ─── TAB 1: COMMUNITY FEEDBACK BOARD ─── */}
        {activeTab === 'feedback' && (
          <View>
            {/* Quick Feedback Post Card */}
            <View style={[styles.panelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.panelTitle, { color: colors.text }]}>Share Feedback or Community Dua</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle, color: colors.text, height: 75, textAlignVertical: 'top', marginTop: 10 }]}
                placeholder="Suggest a masjid timing correction, dua request, or community idea..."
                placeholderTextColor={colors.textMuted}
                multiline
                value={newFeedbackText}
                onChangeText={setNewFeedbackText}
              />
              <TouchableOpacity
                style={[styles.postBtn, { backgroundColor: colors.accentGold }]}
                onPress={handlePostFeedback}
                disabled={submittingFeedback}
                activeOpacity={0.8}
              >
                {submittingFeedback ? (
                  <ActivityIndicator color="#0f1718" size="small" />
                ) : (
                  <Text style={[styles.postBtnText, { color: '#0f1718' }]}>Post to Community Board</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={[styles.feedHeading, { color: colors.text }]}>Recent Community Submissions:</Text>

            {loadingFeedback ? (
              <ActivityIndicator color={colors.accentGold} style={{ marginVertical: 30 }} />
            ) : feedbacks.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No community feedback yet. Be the first to post!</Text>
            ) : (
              feedbacks.map((item) => (
                <View key={item.docId || item.id} style={[styles.feedbackCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.feedbackHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.feedbackAuthor, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.feedbackDate, { color: colors.textMuted }]}>{item.createdOn?.split('T')[0] || 'Recent'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {currentUser?.role === 'ADMIN' ? (
                        <TouchableOpacity
                          onPress={() => handleDeleteFeedback(item.docId || item.id)}
                          style={{ padding: 4 }}
                          activeOpacity={0.7}
                        >
                          <Feather name="trash-2" size={13} color="#ef4444" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                  <Text style={[styles.feedbackMsg, { color: colors.textSecondary }]}>{item.comment}</Text>
                  {item.reply ? (
                    <View style={[styles.adminReplyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.adminReplyTitle, { color: colors.accentGold }]}>Admin / Imam Response:</Text>
                      <Text style={[styles.adminReplyText, { color: colors.textSecondary }]}>{item.reply}</Text>
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </View>
        )}

        {/* ─── TAB 2: STRUCTURED REQUEST WORKFLOW ─── */}
        {activeTab === 'request' && (
          <View style={[styles.panelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.panelHeader}>
              <Feather name="send" size={16} color={colors.accentGold} style={{ marginRight: 8 }} />
              <Text style={[styles.panelTitle, { color: colors.text }]}>Submit Structured Community Request</Text>
            </View>
            <Text style={[styles.panelSubtext, { color: colors.textMuted }]}>
              Request role upgrades (Imam/Muazzin), submit new Masjids, or request a callback from the administration team.
            </Text>

            {/* Request Type Pills */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Request Category</Text>
            <View style={styles.requestTypeRow}>
              {REQUEST_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.requestTypePill,
                    { backgroundColor: colors.pill, borderColor: colors.borderSubtle },
                    requestType === t && { backgroundColor: colors.accentGoldBg, borderColor: colors.accentGold }
                  ]}
                  onPress={() => setRequestType(t)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.requestTypePillText,
                      { color: colors.textMuted },
                      requestType === t && { color: '#0f1718', fontWeight: '700' }
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Target Masjid selector (if Masjid Request or Role Upgrade) */}
            {(requestType === 'Masjid Request' || requestType === 'Role Upgrade') && (
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Target Masjid (Optional)</Text>
                <TouchableOpacity
                  style={[styles.masjidSelectorBtn, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}
                  onPress={() => setIsMasjidPickerVisible(true)}
                  activeOpacity={0.8}
                >
                  <Feather name="map-pin" size={14} color={colors.accentGold} style={{ marginRight: 8 }} />
                  <Text
                    style={[
                      styles.masjidSelectorText,
                      { color: colors.text },
                      !selectedMasjid && { color: colors.textMuted, fontStyle: 'italic' },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedMasjid ? selectedMasjid.name : 'Select Associated Masjid from Directory...'}
                  </Text>
                  <Feather name="chevron-down" size={16} color={colors.accentGold} />
                </TouchableOpacity>
              </View>
            )}

            {/* Want to Contact / Callback Toggle */}
            <View style={styles.toggleRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>Want to Contact / Request Callback</Text>
                <Text style={[styles.toggleSub, { color: colors.textMuted }]}>
                  Allow the admin team to follow up directly via phone or email
                </Text>
              </View>
              <Switch
                value={wantToContact}
                onValueChange={setWantToContact}
                trackColor={{ false: '#334155', true: colors.accentGreen }}
                thumbColor="#f3f7f6"
              />
            </View>

            {/* Contact Details Inputs if Want To Contact */}
            {wantToContact && (
              <View style={[styles.contactDetailsBox, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Contact Phone / Mobile Number *</Text>
                <TextInput
                  style={[styles.inputField, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle, color: colors.text }]}
                  placeholder="e.g. 9876543210"
                  placeholderTextColor={colors.textMuted}
                  value={contactPhone}
                  onChangeText={setContactPhone}
                  keyboardType="phone-pad"
                />

                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Contact Email</Text>
                <TextInput
                  style={[styles.inputField, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle, color: colors.text }]}
                  placeholder="e.g. believer@example.com"
                  placeholderTextColor={colors.textMuted}
                  value={contactEmail}
                  onChangeText={setContactEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            )}

            {/* Message Details */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Request Description & Details *</Text>
            <TextInput
              style={[styles.inputField, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle, color: colors.text, height: 90, textAlignVertical: 'top' }]}
              placeholder="Describe your request, timing corrections, or role upgrade background..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={requestMessage}
              onChangeText={setRequestMessage}
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitRequestBtn, { backgroundColor: colors.accentGold }, submittingRequest && { opacity: 0.7 }]}
              onPress={handleSubmitRequest}
              disabled={submittingRequest}
              activeOpacity={0.85}
            >
              {submittingRequest ? (
                <ActivityIndicator color="#0f1718" size="small" />
              ) : (
                <>
                  <Feather name="send" size={16} color="#0f1718" style={{ marginRight: 8 }} />
                  <Text style={[styles.submitRequestBtnText, { color: '#0f1718' }]}>Submit Request</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ─── TAB 3: REACH US & SADAQAH JARIYAH ─── */}
        {activeTab === 'contact' && (
          <View style={[styles.panelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.sadaqahIconBox, { backgroundColor: 'rgba(226, 162, 59, 0.15)' }]}>
              <Feather name="heart" size={32} color={colors.accentGold} />
            </View>
            <Text style={[styles.sadaqahTitle, { color: colors.text }]}>DeenHub • 100% Free Sadaqah Jariyah</Text>
            <Text style={[styles.sadaqahDesc, { color: colors.textSecondary }]}>
              DeenHub is an open-source, ad-free Islamic platform built for the Ummah. We respect your privacy, charge no fees, and sell no personal data.
            </Text>

            <View style={[styles.divider, { backgroundColor: colors.borderSubtle, marginVertical: 16 }]} />

            <TouchableOpacity
              style={styles.contactRow}
              onPress={() => Linking.openURL('mailto:qairsolutionsask@gmail.com')}
              activeOpacity={0.7}
            >
              <Feather name="mail" size={18} color={colors.accentGold} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.contactTitle, { color: colors.text }]}>Official Email Support</Text>
                <Text style={[styles.contactSub, { color: colors.textMuted }]}>qairsolutionsask@gmail.com</Text>
              </View>
              <Feather name="external-link" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Masjid Picker Modal */}
      <Modal
        visible={isMasjidPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsMasjidPickerVisible(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.pickerHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Associated Masjid</Text>
              <TouchableOpacity onPress={() => setIsMasjidPickerVisible(false)}>
                <Feather name="x" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={[styles.pickerSearchRow, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}>
              <Feather name="search" size={15} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.pickerSearchInput, { color: colors.text }]}
                placeholder="Search masjid..."
                placeholderTextColor={colors.textMuted}
                value={masjidSearch}
                onChangeText={setMasjidSearch}
                autoFocus
              />
              {masjidSearch.length > 0 && (
                <TouchableOpacity onPress={() => setMasjidSearch('')}>
                  <Feather name="x-circle" size={15} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {masjids
                .filter((m) => {
                  if (!masjidSearch.trim()) return true;
                  const q = masjidSearch.toLowerCase();
                  return m.name.toLowerCase().includes(q) || m.address.toLowerCase().includes(q);
                })
                .map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.pickerItem,
                      { borderBottomColor: colors.borderSubtle },
                      selectedMasjid?.id === m.id && { backgroundColor: isDark ? 'rgba(226, 162, 59, 0.15)' : colors.surface },
                    ]}
                    onPress={() => {
                      setSelectedMasjid(m);
                      setIsMasjidPickerVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerItemName, { color: colors.text }]}>{m.name}</Text>
                      <Text style={[styles.pickerItemAddress, { color: colors.textMuted }]} numberOfLines={1}>
                        {m.address}
                      </Text>
                    </View>
                    {selectedMasjid?.id === m.id && (
                      <Feather name="check" size={16} color={colors.accentGreen} />
                    )}
                  </TouchableOpacity>
                ))}
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
    backgroundColor: '#0f1718',
  },
  segmentedBar: {
    flexDirection: 'row',
    backgroundColor: '#071f21',
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#0b383b',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 2,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#e2a23b',
  },
  segmentText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94a4a2',
  },
  segmentTextActive: {
    color: '#0f1718',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  jazakallahBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 102, 0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 102, 0.25)',
    marginBottom: 14,
  },
  jazakallahBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f3f7f6',
  },
  jazakallahBannerCount: {
    fontSize: 11,
    color: '#00ff66',
    marginTop: 2,
    fontWeight: '600',
  },
  jazakallahActionBtn: {
    backgroundColor: '#00ff66',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  jazakallahActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f1718',
  },
  panelCard: {
    backgroundColor: '#0b2527',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.2)',
    marginBottom: 16,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffdda8',
  },
  panelSubtext: {
    fontSize: 11,
    color: '#94a4a2',
    lineHeight: 16,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
    marginTop: 10,
    marginBottom: 5,
  },
  inputField: {
    backgroundColor: '#0f1718',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: '#f3f7f6',
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  postBtn: {
    backgroundColor: '#e2a23b',
    borderRadius: 8,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  postBtnText: {
    color: '#0f1718',
    fontSize: 13,
    fontWeight: '700',
  },
  feedHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 10,
    marginTop: 4,
  },
  feedbackCard: {
    backgroundColor: '#0b2527',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  feedbackAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffdda8',
  },
  feedbackDate: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  cardJazakallahBtn: {
    backgroundColor: 'rgba(0, 255, 102, 0.1)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 102, 0.25)',
  },
  cardJazakallahText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00ff66',
  },
  feedbackMsg: {
    fontSize: 12,
    color: '#f3f7f6',
    lineHeight: 18,
  },
  adminReplyBox: {
    backgroundColor: '#0c3033',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#e2a23b',
  },
  adminReplyTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#e2a23b',
  },
  adminReplyText: {
    fontSize: 11,
    color: '#cbd5e1',
    marginTop: 2,
  },
  requestTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  requestTypePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0c3033',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: "center",
    justifyContent: "center",
  },
  requestTypePillActive: {
    backgroundColor: 'rgba(226, 162, 59, 0.2)',
    borderColor: '#e2a23b',
  },
  requestTypePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a4a2',
    textAlign: "center",
    includeFontPadding: false,
  },
  requestTypePillTextActive: {
    color: '#ffdda8',
    fontWeight: '700',
  },
  masjidSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1718',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.3)',
  },
  masjidSelectorText: {
    flex: 1,
    fontSize: 12,
    color: '#f3f7f6',
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f3f7f6',
  },
  toggleSub: {
    fontSize: 10,
    color: '#94a4a2',
    marginTop: 2,
  },
  contactDetailsBox: {
    backgroundColor: '#0c3033',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  submitRequestBtn: {
    backgroundColor: '#e2a23b',
    borderRadius: 8,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  submitRequestBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f1718',
  },
  sadaqahIconBox: {
    alignItems: 'center',
    marginVertical: 12,
  },
  sadaqahTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#00ff66',
    textAlign: 'center',
    marginBottom: 6,
  },
  sadaqahDesc: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
    textAlign: 'center',
  },
  bigJazakallahBtn: {
    backgroundColor: '#00ff66',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  bigJazakallahBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f1718',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  contactTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f3f7f6',
  },
  contactSub: {
    fontSize: 11,
    color: '#94a4a2',
    marginTop: 2,
  },
  emptyText: {
    color: '#94a4a2',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 20,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  pickerCard: {
    backgroundColor: '#0b2527',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.25)',
    maxHeight: '75%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f3f7f6',
  },
  pickerSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1718',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  pickerSearchInput: {
    flex: 1,
    color: '#f3f7f6',
    fontSize: 12,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  pickerItemActive: {
    backgroundColor: 'rgba(226, 162, 59, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
  },
  pickerItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f3f7f6',
  },
  pickerItemAddress: {
    fontSize: 11,
    color: '#94a4a2',
    marginTop: 2,
  },

  // Leaderboard styles
  leaderboardBanner: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  leaderboardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  leaderboardBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  leaderboardBannerSubtitle: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  leaderboardResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  leaderboardResetBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  leaderboardRefreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  formulaBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  formulaTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  formulaPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  formulaPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  formulaPillText: {
    fontSize: 10,
  },
  antiSpamGuardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  antiSpamGuardText: {
    fontSize: 9.5,
    flex: 1,
  },
  currentUserStandingCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 14,
  },
  currentUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  currentUserRankBadge: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  currentUserBadgeTag: {
    fontSize: 11,
    fontWeight: '700',
  },
  currentUserName: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  currentUserRoleTag: {
    fontSize: 11,
    marginTop: 1,
  },
  currentUserPointsBox: {
    alignItems: 'flex-end',
  },
  currentUserPointsValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  currentUserPointsLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statCellNum: {
    fontSize: 14,
    fontWeight: '800',
  },
  statCellLabel: {
    fontSize: 9.5,
    marginTop: 2,
  },
  leaderboardSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  leaderboardSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  leaderboardSectionCount: {
    fontSize: 11,
  },
  contributorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  contributorLeftCol: {
    marginRight: 10,
  },
  contributorRankCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contributorRankNum: {
    fontSize: 12,
  },
  contributorMidCol: {
    flex: 1,
  },
  contributorNameText: {
    fontSize: 13,
    fontWeight: '700',
  },
  youTag: {
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginLeft: 6,
  },
  contributorRoleText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  contributorBadgeTag: {
    fontSize: 10.5,
  },
  contributorStatsBreakdown: {
    fontSize: 10,
    marginTop: 2,
  },
  contributorRightCol: {
    alignItems: 'flex-end',
    marginLeft: 6,
  },
  contributorPointsValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  contributorPointsUnit: {
    fontSize: 9,
  },

});
