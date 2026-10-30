import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  getCurrentUser,
  logoutUser,
  updateUserProfile,
  requestRoleUpgrade,
  getDisplayRoleLabel,
  UserProfile,
  UserRole,
} from '../../lib/auth';
import { fetchSalahTimeMasjids } from '../../lib/salahTimeBackend';
import { getDefaultMasjidId, setDefaultMasjidId } from '../../lib/masjidTimingSync';
import { Masjid } from '../../lib/masjid';
import { useTheme } from '../../lib/theme';
import { useResponsiveLayout } from '../../lib/responsive';

type UpgradeChoice = 'SUPER_USER' | 'SUPER_USER2';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { contentContainerStyle } = useResponsiveLayout();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [defaultMasjid, setDefaultMasjid] = useState<Masjid | null>(null);

  // Upgrade Role state
  const [upgradeChoice, setUpgradeChoice] = useState<UpgradeChoice>('SUPER_USER');
  const [upgradeMasjid, setUpgradeMasjid] = useState<Masjid | null>(null);
  const [submittingUpgrade, setSubmittingUpgrade] = useState(false);

  // Modal for masjid picking
  const [approvedMasjids, setApprovedMasjids] = useState<Masjid[]>([]);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'default' | 'upgrade'>('default');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [u, list, defId] = await Promise.all([
        getCurrentUser(),
        fetchSalahTimeMasjids(),
        getDefaultMasjidId(),
      ]);

      setUser(u);
      setApprovedMasjids(list);

      if (u) {
        setName(u.name || '');
        setEmail(u.email || '');
        setMobile(u.mobile || '');

        const targetId = u.defaultMasjidId || u.masjidId || defId;
        if (targetId) {
          const found = list.find(
            (m) =>
              m.id === targetId ||
              m.id.replace(/^salahtime-/, '') === targetId.replace(/^salahtime-/, '')
          );
          if (found) {
            setDefaultMasjid(found);
            setUpgradeMasjid(found);
          }
        }
      }
    } catch (err) {
      console.warn('[Profile] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredMasjids = useMemo(() => {
    if (!searchQuery.trim()) return approvedMasjids;
    const q = searchQuery.trim().toLowerCase();
    return approvedMasjids.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.address && m.address.toLowerCase().includes(q)) ||
        (m.famousArea && m.famousArea.toLowerCase().includes(q))
    );
  }, [approvedMasjids, searchQuery]);

  const handleSelectMasjid = async (selected: Masjid) => {
    setIsPickerVisible(false);
    if (pickerTarget === 'upgrade') {
      setUpgradeMasjid(selected);
      return;
    }

    // Default masjid update: sync local storage and Firestore profile
    setDefaultMasjid(selected);
    await setDefaultMasjidId(selected.id).catch(() => {});

    if (user?.uid) {
      setSavingProfile(true);
      try {
        await updateUserProfile(
          user.uid,
          {
            defaultMasjidId: selected.id,
            masjidId: selected.id,
            masjidName: selected.name,
          },
          user.token
        );
        Alert.alert('Default Masjid Updated', `Your home masjid has been set to ${selected.name}.`);
      } catch (err) {
        console.warn('[Profile] Error syncing default masjid:', err);
      } finally {
        setSavingProfile(false);
      }
    }
  };

  const handleSaveContactInfo = async () => {
    if (!user?.uid) return;
    const cleanName = name.trim();
    const cleanMobile = mobile.trim();
    if (!cleanName) {
      Alert.alert('Required Field', 'Name cannot be empty.');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await updateUserProfile(
        user.uid,
        {
          name: cleanName,
          mobile: cleanMobile,
        },
        user.token
      );
      if (res.success && res.user) {
        setUser(res.user);
        Alert.alert('Profile Saved', 'Your contact information has been updated.');
      } else {
        Alert.alert('Update Failed', res.error || 'Could not update profile.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSubmitRoleUpgrade = async () => {
    if (!user) return;
    const target = upgradeMasjid || defaultMasjid;
    if (!target) {
      Alert.alert('Masjid Required', 'Please select a Masjid before submitting your role upgrade request.');
      return;
    }

    setSubmittingUpgrade(true);
    try {
      const res = await requestRoleUpgrade(
        user.uid,
        upgradeChoice,
        target.id,
        target.name,
        user.token
      );

      if (res.success) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                requestedRole: upgradeChoice,
                roleApprovalStatus: 'pending',
                masjidId: target.id,
                masjidName: target.name,
              }
            : null
        );
        Alert.alert(
          'Upgrade Request Submitted 📋',
          `Your request for "${upgradeChoice === 'SUPER_USER2' ? 'Area Coordinator (Multi-Masjid)' : 'Verified Updater (Single Masjid)'}" has been queued for Admin review. You will receive privileges once approved.`
        );
      } else {
        Alert.alert('Submission Error', res.error || 'Could not submit upgrade request.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to submit request.');
    } finally {
      setSubmittingUpgrade(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out from DeenHub?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logoutUser();
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accentGold} />
      </SafeAreaView>
    );
  }

  const isPendingReview = user?.roleApprovalStatus === 'pending';
  const roleLabel = getDisplayRoleLabel(user);
  const canAccessAdminDashboard = user?.role === 'ADMIN' || user?.role === 'SUPER_USER2';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: colors.pill }]}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
              activeOpacity={0.7}
            >
              <Feather name="arrow-left" size={20} color={colors.accentGold} />
            </TouchableOpacity>
            <Text style={[styles.topBarTitle, { color: colors.text }]}>Account & Authority</Text>
            <TouchableOpacity
              style={[styles.logoutTopBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Feather name="log-out" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>

          {/* User Identity Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.userHeaderRow}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.pill, borderColor: colors.accentGold }]}>
                <Text style={[styles.avatarText, { color: colors.accentGold }]}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.userName, { color: colors.text }]}>{user?.name || 'Musalli'}</Text>
                <Text style={[styles.userEmail, { color: colors.textMuted }]}>{user?.email}</Text>
                {user?.mobile ? (
                  <Text style={[styles.userMobile, { color: colors.textMuted }]}>{user.mobile}</Text>
                ) : null}
              </View>
            </View>

            {/* Badges Row */}
            <View style={styles.badgesRow}>
              <View style={[styles.roleBadge, { backgroundColor: colors.pill, borderColor: colors.accentGold }]}>
                <Feather name="award" size={13} color={colors.accentGold} style={{ marginRight: 6 }} />
                <Text style={[styles.roleBadgeText, { color: colors.accentGold }]}>{roleLabel}</Text>
              </View>

              {isPendingReview ? (
                <View style={[styles.statusBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: '#d97706' }]}>
                  <Feather name="clock" size={13} color="#d97706" style={{ marginRight: 6 }} />
                  <Text style={[styles.statusBadgeText, { color: '#d97706' }]}>
                    Pending Admin Review: {user?.requestedRole}
                  </Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10b981' }]}>
                  <Feather name="check-circle" size={13} color="#10b981" style={{ marginRight: 6 }} />
                  <Text style={[styles.statusBadgeText, { color: '#10b981' }]}>Approved</Text>
                </View>
              )}
            </View>
          </View>

          {/* Admin / Area Coordinator Access Portal */}
          {canAccessAdminDashboard && (
            <TouchableOpacity
              style={[styles.adminPortalCard, { backgroundColor: colors.accentGold }]}
              onPress={() => router.push('/hub/admin-dashboard')}
              activeOpacity={0.85}
            >
              <View style={styles.adminPortalLeft}>
                <Feather name="shield" size={24} color="#0f1718" style={{ marginRight: 12 }} />
                <View>
                  <Text style={styles.adminPortalTitle}>Admin Management Portal</Text>
                  <Text style={styles.adminPortalSubtitle}>
                    {user?.role === 'ADMIN' ? 'Review Masjids, Users & Broadcasts' : 'Area Coordinator: Review Pending Masjids'}
                  </Text>
                </View>
              </View>
              <Feather name="arrow-right" size={20} color="#0f1718" />
            </TouchableOpacity>
          )}

          {/* Default Masjid Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 14 }]}>
            <View style={styles.sectionHeader}>
              <Feather name="map-pin" size={16} color={colors.accentGold} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Default / Home Masjid</Text>
            </View>
            <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
              This masjid displays automatically on your Home LED Board and quick athan alerts.
            </Text>

            <TouchableOpacity
              style={[styles.pickerTrigger, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}
              onPress={() => {
                setPickerTarget('default');
                setIsPickerVisible(true);
              }}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.pickerValue, { color: colors.text }]}>
                  {defaultMasjid ? defaultMasjid.name : 'No default masjid chosen'}
                </Text>
                <Text style={[styles.pickerSub, { color: colors.textMuted }]} numberOfLines={1}>
                  {defaultMasjid?.famousArea || defaultMasjid?.address || 'Tap to search approved masjids'}
                </Text>
              </View>
              <Feather name="edit-2" size={16} color={colors.accentGold} />
            </TouchableOpacity>
          </View>

          {/* Role Upgrade Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 14 }]}>
            <View style={styles.sectionHeader}>
              <Feather name="trending-up" size={16} color={colors.accentGold} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Request Role Upgrade</Text>
            </View>
            <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
              Apply for verified publishing authority to keep timings live and accurate for your community.
            </Text>

            {/* Upgrade Options */}
            <View style={styles.upgradeOptionsRow}>
              <TouchableOpacity
                style={[
                  styles.upgradeOptionCard,
                  {
                    backgroundColor: upgradeChoice === 'SUPER_USER' ? (isDark ? '#1a2c20' : '#eaf7ee') : colors.inputBg,
                    borderColor: upgradeChoice === 'SUPER_USER' ? '#10b981' : colors.borderSubtle,
                  },
                ]}
                onPress={() => setUpgradeChoice('SUPER_USER')}
                activeOpacity={0.7}
              >
                <View style={styles.upgradeOptionTop}>
                  <Feather
                    name="check-circle"
                    size={16}
                    color={upgradeChoice === 'SUPER_USER' ? '#10b981' : colors.textMuted}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.upgradeOptionTitle, { color: colors.text }]}>Verified Updater</Text>
                </View>
                <Text style={[styles.upgradeOptionDesc, { color: colors.textMuted }]}>
                  Single Masjid (SUPER_USER)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.upgradeOptionCard,
                  {
                    backgroundColor: upgradeChoice === 'SUPER_USER2' ? (isDark ? '#1a2c20' : '#eaf7ee') : colors.inputBg,
                    borderColor: upgradeChoice === 'SUPER_USER2' ? '#10b981' : colors.borderSubtle,
                  },
                ]}
                onPress={() => setUpgradeChoice('SUPER_USER2')}
                activeOpacity={0.7}
              >
                <View style={styles.upgradeOptionTop}>
                  <Feather
                    name="check-circle"
                    size={16}
                    color={upgradeChoice === 'SUPER_USER2' ? '#10b981' : colors.textMuted}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.upgradeOptionTitle, { color: colors.text }]}>Area Coordinator</Text>
                </View>
                <Text style={[styles.upgradeOptionDesc, { color: colors.textMuted }]}>
                  Multi-Masjid (SUPER_USER2)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Masjid selector for role */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Assigned Masjid</Text>
            <TouchableOpacity
              style={[styles.pickerTrigger, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}
              onPress={() => {
                setPickerTarget('upgrade');
                setIsPickerVisible(true);
              }}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.pickerValue, { color: colors.text }]}>
                  {upgradeMasjid ? upgradeMasjid.name : 'Choose masjid for verification'}
                </Text>
                <Text style={[styles.pickerSub, { color: colors.textMuted }]} numberOfLines={1}>
                  {upgradeMasjid?.famousArea || upgradeMasjid?.address || 'Tap to select'}
                </Text>
              </View>
              <Feather name="chevron-down" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.upgradeSubmitBtn, { backgroundColor: colors.pill, borderColor: colors.accentGold }]}
              onPress={handleSubmitRoleUpgrade}
              disabled={submittingUpgrade}
              activeOpacity={0.8}
            >
              {submittingUpgrade ? (
                <ActivityIndicator color={colors.accentGold} size="small" />
              ) : (
                <View style={styles.btnContent}>
                  <Text style={[styles.upgradeSubmitBtnText, { color: colors.accentGold }]}>
                    Submit Upgrade Request
                  </Text>
                  <Feather name="send" size={15} color={colors.accentGold} style={{ marginLeft: 8 }} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Edit Profile Info Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 14 }]}>
            <View style={styles.sectionHeader}>
              <Feather name="user" size={16} color={colors.accentGold} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Information</Text>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Full Name</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={name}
                onChangeText={setName}
              />
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Mobile Number</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={mobile}
                onChangeText={setMobile}
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.accentGold }]}
              onPress={handleSaveContactInfo}
              disabled={savingProfile}
              activeOpacity={0.8}
            >
              {savingProfile ? (
                <ActivityIndicator color="#0f1718" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save Profile Changes</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Log Out Button */}
          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: '#ef4444' }]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Feather name="log-out" size={16} color="#ef4444" style={{ marginRight: 8 }} />
            <Text style={styles.logoutBtnText}>Log Out from Account</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Searchable Modal for Masjids */}
      <Modal
        visible={isPickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPickerVisible(false)}
      >
        <SafeAreaView style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {pickerTarget === 'default' ? 'Select Default Masjid' : 'Select Masjid for Upgrade'}
              </Text>
              <TouchableOpacity
                onPress={() => setIsPickerVisible(false)}
                style={[styles.closeModalBtn, { backgroundColor: colors.pill }]}
              >
                <Feather name="x" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalSearchRow, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}>
              <Feather name="search" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Search approved masjids..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Feather name="x-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredMasjids}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.masjidItemRow, { borderColor: colors.borderSubtle }]}
                  onPress={() => handleSelectMasjid(item)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.masjidItemName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.masjidItemArea, { color: colors.textMuted }]} numberOfLines={1}>
                      {item.famousArea || item.address || 'Hyderabad'}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    No approved masjids found matching "{searchQuery}".
                  </Text>
                </View>
              }
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  logoutTopBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  userHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
  },
  userMobile: {
    fontSize: 13,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  adminPortalCard: {
    marginTop: 14,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adminPortalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  adminPortalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f1718',
  },
  adminPortalSubtitle: {
    fontSize: 12,
    color: 'rgba(15, 23, 24, 0.75)',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  pickerValue: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  pickerSub: {
    fontSize: 12,
  },
  upgradeOptionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  upgradeOptionCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  upgradeOptionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  upgradeOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  upgradeOptionDesc: {
    fontSize: 11,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 6,
  },
  inputRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center',
    marginBottom: 10,
  },
  input: {
    fontSize: 14,
  },
  upgradeSubmitBtn: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  upgradeSubmitBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveBtn: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  saveBtnText: {
    color: '#0f1718',
    fontSize: 14,
    fontWeight: '700',
  },
  logoutBtn: {
    marginTop: 20,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtnText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
  },
  masjidItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  masjidItemName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  masjidItemArea: {
    fontSize: 12,
  },
  emptyBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
});
