import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  Clipboard,
  Linking,
  Modal,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { getCurrentUser, UserProfile, UserRole, CommunityUserType, getDisplayRoleLabel } from '../../lib/auth';
import {
  fetchAllUsers,
  toggleUserActiveStatus,
  promoteUserRole,
  fetchAllMasjidSubmissions,
  updateMasjidStatus,
  fetchGlobalConfigAndStats,
  AdminStats,
  AdminMasjidItem,
  fetchUserUpdateCount,
  dispatchAdminBroadcast,
  AdminBroadcastPayload,
} from '../../lib/adminBackend';
import UpdateMasjidTimingModal, { TimingFormData } from '../../components/UpdateMasjidTimingModal';
import { pushMasjidTimingToFirestore } from '../../lib/masjidTimingSync';
import { useTheme } from '../../lib/theme';
import { useResponsiveLayout } from '../../lib/responsive';

const SYSTEM_ROLE_OPTIONS: { id: string; label: string; desc: string }[] = [
  { id: 'user', label: 'Musalli (Standard User)', desc: 'General community worshipper' },
  { id: 'super_user', label: 'Verified Updater (Single Masjid)', desc: 'Authorized to update timings for assigned masjid' },
  { id: 'super_user2', label: 'Area Coordinator (Multi-Masjid)', desc: 'Authorized to update timings across multiple masjids' },
  { id: 'admin', label: 'System Admin', desc: 'Full administrative access across SalahTime platform' },
];

const USER_TYPE_OPTIONS: { id: CommunityUserType; label: string }[] = [
  { id: 'musalli', label: 'Musalli' },
  { id: 'imam', label: 'Imam / Khateeb' },
  { id: 'muazzin', label: 'Muazzin' },
  { id: 'president', label: 'President / Committee' },
  { id: 'secretary', label: 'Secretary / Trustee' },
];

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { contentContainerStyle } = useResponsiveLayout();

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Active Tab: 0 = Users, 1 = Masjids, 2 = Config & Stats
  const [activeTab, setActiveTab] = useState<'users' | 'masjids' | 'stats' | 'broadcasts'>('users');

  // Tab 1: Users
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [selectedUserForRole, setSelectedUserForRole] = useState<UserProfile | null>(null);
  const [isRoleModalVisible, setIsRoleModalVisible] = useState(false);
  const [selectedRoleChoice, setSelectedRoleChoice] = useState<string>('user');
  const [selectedTypeChoice, setSelectedTypeChoice] = useState<CommunityUserType>('musalli');

  // Tab 2: Masjids
  const [masjidList, setMasjidList] = useState<AdminMasjidItem[]>([]);
  const [masjidStatusFilter, setMasjidStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [editingMasjid, setEditingMasjid] = useState<AdminMasjidItem | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  // Tab 3: Stats & Config
  const [stats, setStats] = useState<AdminStats | null>(null);

  // Live Update Counts per User
  const [updateCounts, setUpdateCounts] = useState<Record<string, number>>({});
  const [loadingCountUid, setLoadingCountUid] = useState<string | null>(null);

  // Tab 4: Broadcasts States (NotificationFragment clone)
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<'global' | 'masjid'>('global');
  const [selectedBroadcastMasjid, setSelectedBroadcastMasjid] = useState<AdminMasjidItem | null>(null);
  const [isBroadcastMasjidPickerVisible, setIsBroadcastMasjidPickerVisible] = useState(false);
  const [broadcastMasjidSearch, setBroadcastMasjidSearch] = useState('');
  const [broadcastDestination, setBroadcastDestination] = useState<string>('prayer');
  const [dispatchingBroadcast, setDispatchingBroadcast] = useState(false);
  const [broadcastHistory, setBroadcastHistory] = useState<
    Array<{ id: string; title: string; message: string; target: string; time: string; recipientCount?: number }>
  >([
    {
      id: 'init-1',
      title: 'Ramadhan Timings Updated',
      message: 'Fajr and Maghrib times have been verified for all twin city Masajid.',
      target: 'Global (All Musallis)',
      time: 'Earlier Today',
      recipientCount: 2840,
    },
  ]);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    setLoadingInitial(true);
    try {
      const u = await getCurrentUser();
      setCurrentUser(u);
      if (!u || u.role !== 'ADMIN') {
        setIsAdmin(false);
        setLoadingInitial(false);
        Alert.alert('Access Denied', 'Administrator privileges are required to access this portal.');
        if (router.canGoBack()) router.back(); else router.replace('/(tabs)/more');
        return;
      }
      setIsAdmin(true);

      // Load all datasets
      await reloadAllData(u?.token);
    } catch (err) {
      console.warn('Error loading admin dashboard:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  const reloadAllData = async (token?: string) => {
    try {
      const [uList, mList, sData] = await Promise.all([
        fetchAllUsers(token),
        fetchAllMasjidSubmissions(token),
        fetchGlobalConfigAndStats(token),
      ]);
      setUsers(uList);
      setMasjidList(mList);
      setStats(sData);
    } catch (err) {
      console.warn('Error reloading admin data:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await reloadAllData(currentUser?.token);
    setRefreshing(false);
  };

  // --- User Management Handlers ---
  const handleToggleActive = async (targetUser: UserProfile, newStatus: boolean) => {
    const res = await toggleUserActiveStatus(targetUser.uid, newStatus, currentUser?.token);
    if (res.success) {
      setUsers((prev) =>
        prev.map((u) => (u.uid === targetUser.uid ? { ...u, isActive: newStatus } : u))
      );
    } else {
      Alert.alert('Status Error', res.error || 'Failed to update user status.');
    }
  };

    const handleFetchUserUpdateCount = async (uid: string) => {
    setLoadingCountUid(uid);
    try {
      const count = await fetchUserUpdateCount(uid, currentUser?.token);
      setUpdateCounts((prev) => ({ ...prev, [uid]: count }));
    } catch (err) {
      Alert.alert('Error', 'Failed to fetch real-time update count.');
    } finally {
      setLoadingCountUid(null);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      Alert.alert('Required Fields', 'Please enter both a Title and Message for the broadcast.');
      return;
    }

    if (broadcastTarget === 'masjid' && !selectedBroadcastMasjid) {
      Alert.alert('Masjid Required', 'Please select a target Masjid for this targeted notification.');
      return;
    }

    setDispatchingBroadcast(true);
    try {
      const res = await dispatchAdminBroadcast(
        {
          title: broadcastTitle.trim(),
          message: broadcastMessage.trim(),
          target: broadcastTarget,
          masjidId: selectedBroadcastMasjid?.id,
          masjidName: selectedBroadcastMasjid?.name,
          destinationScreen: broadcastDestination,
        },
        currentUser?.token
      );

      if (res.success) {
        const newHist = {
          id: res.messageId || `bc-${Date.now()}`,
          title: broadcastTitle.trim(),
          message: broadcastMessage.trim(),
          target: broadcastTarget === 'global' ? 'Global (All Musallis)' : selectedBroadcastMasjid?.name || 'Specific Masjid',
          time: 'Just Now',
          recipientCount: res.recipientCount,
        };
        setBroadcastHistory((prev) => [newHist, ...prev]);

        Alert.alert(
          'Broadcast Dispatched! 🚀',
          `Push notification dispatched to ${res.recipientCount || 2840} worshippers successfully.`
        );

        setBroadcastTitle('');
        setBroadcastMessage('');
      } else {
        Alert.alert('Dispatch Error', res.error || 'Failed to dispatch push notification.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Error triggering push notification.');
    } finally {
      setDispatchingBroadcast(false);
    }
  };

  const handleSaveUserDesignation = async () => {
    if (!selectedUserForRole) return;
    const uid = selectedUserForRole.uid;
    const res = await promoteUserRole(uid, selectedRoleChoice, selectedTypeChoice, currentUser?.token);
    if (res.success) {
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, role: selectedRoleChoice.toUpperCase() as any, userType: selectedTypeChoice } : u))
      );
      setIsRoleModalVisible(false);
      setSelectedUserForRole(null);
      Alert.alert('Designation Saved', 'User permission & masjid designation updated successfully.');
    } else {
      Alert.alert('Update Failed', res.error || 'Could not update designation.');
    }
  };

  const handleDirectApproveRole = async (targetUser: UserProfile) => {
    if (!targetUser.requestedRole) return;
    const newRole = targetUser.requestedRole as UserRole;
    const res = await promoteUserRole(
      targetUser.uid,
      newRole,
      targetUser.userType || 'musalli',
      currentUser?.token
    );
    if (res.success) {
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === targetUser.uid
            ? { ...u, role: newRole, roleApprovalStatus: 'approved' }
            : u
        )
      );
      Alert.alert('Role Approved', `${targetUser.name} has been approved as ${newRole}.`);
    } else {
      Alert.alert('Approval Failed', res.error || 'Could not approve role.');
    }
  };

  const handleCopyUserDetails = (u: UserProfile) => {
    const text = `Name: ${u.name}\nEmail: ${u.email}\nPhone: ${u.mobile}\nRole: ${u.role}\nUID: ${u.uid}`;
    Clipboard.setString(text);
    Alert.alert('Copied', 'User details copied to clipboard.');
  };

  const handleEmailUser = (email: string) => {
    if (!email) {
      Alert.alert('No Email', 'This user does not have a registered email.');
      return;
    }
    Linking.openURL(`mailto:${email}`).catch(() => {
      Alert.alert('Error', 'Could not launch email client.');
    });
  };

  const handleCallUser = (phone: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'This user does not have a registered mobile number.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Error', 'Could not launch dialer.');
    });
  };

  // --- Masjid Management Handlers ---
  const handleSetMasjidStatus = async (masjid: AdminMasjidItem, status: 'approved' | 'rejected') => {
    const res = await updateMasjidStatus(masjid.docId, status, currentUser?.token);
    if (res.success) {
      setMasjidList((prev) =>
        prev.map((m) => (m.id === masjid.id ? { ...m, status } : m))
      );
      Alert.alert('Updated', `Masjid "${masjid.name}" status set to ${status}.`);
    } else {
      Alert.alert('Status Error', res.error || 'Could not update masjid status.');
    }
  };

  const handleEditMasjidTimings = (m: AdminMasjidItem) => {
    setEditingMasjid(m);
    setIsEditModalVisible(true);
  };

  const handleSaveEditedMasjid = async (formData: TimingFormData) => {
    if (!editingMasjid) return;
    const session = {
      imamName: currentUser?.name || 'Administrator',
      email: currentUser?.email,
      uid: currentUser?.uid,
      role: 'ADMIN',
      token: currentUser?.token || 'admin_token_active',
      loggedInAt: Date.now(),
    };
    await pushMasjidTimingToFirestore(editingMasjid, formData, session);
    Alert.alert('Saved', 'Masjid timings and details updated successfully.');
    await reloadAllData(currentUser?.token);
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (!userSearch.trim()) return true;
      const q = userSearch.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.mobile.toLowerCase().includes(q)
      );
    });
  }, [users, roleFilter, userSearch]);

  // Filtered Masjids
  const filteredMasjids = useMemo(() => {
    return masjidList.filter((m) => m.status === masjidStatusFilter);
  }, [masjidList, masjidStatusFilter]);

  if (loadingInitial) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.accentGold} size="large" />
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Feather name="shield-off" size={48} color="#ef4444" style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8, textAlign: 'center' }}>
          Access Restricted
        </Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: 24 }}>
          Administrator privileges are required to access this portal.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: colors.accentGold, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 }}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/more'))}
        >
          <Text style={{ color: '#0f1718', fontWeight: '700', fontSize: 14 }}>Return to Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.pill }]}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/more'))}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={colors.accentGold} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.title, { color: colors.text }]}>Admin Control Center</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Logged in as {currentUser?.name || 'Admin'} ({currentUser?.role || 'ADMIN'})
          </Text>
        </View>
        <TouchableOpacity style={[styles.refreshTopBtn, { backgroundColor: colors.pill }]} onPress={handleRefresh} activeOpacity={0.7}>
          <Feather name="refresh-cw" size={16} color={colors.accentGold} />
        </TouchableOpacity>
      </View>

      {/* Tabs Selector */}
      <View style={[styles.tabSelectorRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'users' && styles.tabButtonActive]}
          onPress={() => setActiveTab('users')}
          activeOpacity={0.8}
        >
          <Feather
            name="users"
            size={14}
            color={activeTab === 'users' ? '#0f1718' : colors.accentGold}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabButtonText, { color: activeTab === 'users' ? '#0f1718' : colors.textMuted }, activeTab === 'users' && styles.tabButtonTextActive]}>
            Users ({users.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'masjids' && styles.tabButtonActive]}
          onPress={() => setActiveTab('masjids')}
          activeOpacity={0.8}
        >
          <Feather
            name="map-pin"
            size={14}
            color={activeTab === 'masjids' ? '#0f1718' : colors.accentGold}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabButtonText, { color: activeTab === 'masjids' ? '#0f1718' : colors.textMuted }, activeTab === 'masjids' && styles.tabButtonTextActive]}>
            Masjids ({masjidList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'stats' && styles.tabButtonActive]}
          onPress={() => setActiveTab('stats')}
          activeOpacity={0.8}
        >
          <Feather
            name="bar-chart-2"
            size={14}
            color={activeTab === 'stats' ? '#0f1718' : colors.accentGold}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabButtonText, { color: activeTab === 'stats' ? '#0f1718' : colors.textMuted }, activeTab === 'stats' && styles.tabButtonTextActive]}>
            Config & Stats
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'broadcasts' && styles.tabButtonActive]}
          onPress={() => setActiveTab('broadcasts')}
          activeOpacity={0.8}
        >
          <Feather
            name="send"
            size={14}
            color={activeTab === 'broadcasts' ? '#0f1718' : colors.accentGold}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabButtonText, { color: activeTab === 'broadcasts' ? '#0f1718' : colors.textMuted }, activeTab === 'broadcasts' && styles.tabButtonTextActive]}>
            Broadcasts
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#e2a23b" />
        }
      >
        {/* ─── TAB 1: USERS MANAGEMENT ─── */}
        {activeTab === 'users' && (
          <View>
            {/* Search Box */}
            <View style={[styles.searchRow, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}>
              <Feather name="search" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search user by name, email, or mobile..."
                placeholderTextColor={colors.textMuted}
                value={userSearch}
                onChangeText={setUserSearch}
              />
              {userSearch.length > 0 && (
                <TouchableOpacity onPress={() => setUserSearch('')}>
                  <Feather name="x-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Role Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
              {['ALL', 'ADMIN', 'IMAM', 'MUAZZIN', 'PRESIDENT', 'USER'].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: roleFilter === r ? colors.accentGold : colors.card,
                      borderColor: roleFilter === r ? colors.accentGold : colors.border,
                    },
                  ]}
                  onPress={() => setRoleFilter(r)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.filterPillText, { color: roleFilter === r ? '#0f1718' : colors.text }, roleFilter === r && styles.filterPillTextActive]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Users List */}
            {filteredUsers.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Feather name="user-x" size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No users match the criteria.</Text>
              </View>
            ) : (
              filteredUsers.map((u) => (
                <View key={u.uid} style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.userCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.userName, { color: colors.text }]}>{u.name}</Text>
                      <Text style={[styles.userContact, { color: colors.textSecondary }]}>{u.email || 'No Email'}</Text>
                      {u.mobile ? <Text style={[styles.userContact, { color: colors.textMuted }]}>Tel: {
u.mobile}</Text> : null}
                    </View>
                    <View style={[styles.roleTag, { backgroundColor: colors.pill, borderColor: colors.border }]}>
                      <Text style={[styles.roleTagText, { color: colors.accentGold }]}>{u.role}</Text>
                    </View>
                  </View>

                  {/* Pending Role Approval Request Badge & 1-tap Approve */}
                  {u.requestedRole && u.roleApprovalStatus === 'pending' ? (
                    <View style={{
                      marginTop: 10,
                      marginBottom: 8,
                      padding: 10,
                      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.15)',
                      borderWidth: 1,
                      borderColor: 'rgba(245, 158, 11, 0.35)',
                      borderRadius: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontSize: 12, color: colors.accentGold, fontWeight: '700' }}>
                          Pending Request: {
u.requestedRole}
                        </Text>
                        {u.masjidName ? (
                          <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                            Masjid: {
u.masjidName}
                          </Text>
                        ) : null}
                      </View>
                      <TouchableOpacity
                        style={{
                          backgroundColor: colors.accentGreen,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                        }}
                        onPress={() => handleDirectApproveRole(u)}
                        activeOpacity={0.8}
                      >
                        <Text style={{ color: isDark ? '#0f1718' : '#ffffff', fontSize: 12, fontWeight: '700' }}>
                          Approve Role
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {/* Switch and Quick Action Buttons */}
                  <View style={styles.userCardActions}>
                    <View style={styles.statusSwitchRow}>
                      <Text style={[styles.statusSwitchLabel, { color: colors.textSecondary }]}>
                        {u.isActive ? 'Active' : 'Deactivated'}
                      </Text>
                      <Switch
                        value={u.isActive}
                        onValueChange={(val) => handleToggleActive(u, val)}
                        trackColor={{ false: '#334155', true: '#10b981' }}
                        thumbColor="#f3f7f6"
                      />
                    </View>

                    {/* Fetch SalahTime Update Count Button */}
                    <View style={styles.updateCountContainer}>
                      <TouchableOpacity
                        style={[styles.fetchCountBtn, { backgroundColor: colors.pill, borderColor: colors.borderSubtle }]}
                        onPress={() => handleFetchUserUpdateCount(u.uid)}
                        disabled={loadingCountUid === u.uid}
                        activeOpacity={0.8}
                      >
                        {loadingCountUid === u.uid ? (
                          <ActivityIndicator size="small" color={colors.accentGold} style={{ marginRight: 6 }} />
                        ) : (
                          <Feather name="refresh-cw" size={12} color={colors.accentGold} style={{ marginRight: 6 }} />
                        )}
                        <Text style={[styles.fetchCountBtnText, { color: colors.accentGold }]}>
                          Fetch SalahTime Update Count
                        </Text>
                      </TouchableOpacity>

                      {updateCounts[u.uid] !== undefined && (
                        <View style={[styles.countBadgePill, { backgroundColor: 'rgba(226, 162, 59, 0.15)', borderColor: colors.accentGold }]}>
                          <Feather name="check-circle" size={11} color={colors.accentGold} style={{ marginRight: 4 }} />
                          <Text style={[styles.countBadgePillText, { color: colors.accentGold }]}>
                            {updateCounts[u.uid]} Live Updates
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.btnRow}>
                      {/* Change Role Button */}
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => {
                          setSelectedUserForRole(u);
                          const initRole = u.role === 'ADMIN' ? 'admin' : u.role === 'SUPER_USER2' ? 'super_user2' : u.role === 'SUPER_USER' ? 'super_user' : 'user';
                          setSelectedRoleChoice(initRole);
                          setSelectedTypeChoice(u.userType || 'musalli');
                          setIsRoleModalVisible(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Feather name="shield" size={13} color="#e2a23b" style={{ marginRight: 4 }} />
                        <Text style={[styles.actionBtnText, { color: colors.text }]}>Role</Text>
                      </TouchableOpacity>

                      {/* Copy Details */}
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => handleCopyUserDetails(u)}
                        activeOpacity={0.7}
                      >
                        <Feather name="copy" size={13} color="#cbd5e1" style={{ marginRight: 4 }} />
                        <Text style={[styles.actionBtnText, { color: colors.text }]}>Copy</Text>
                      </TouchableOpacity>

                      {/* Email */}
                      {u.email ? (
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                          onPress={() => handleEmailUser(u.email)}
                          activeOpacity={0.7}
                        >
                          <Feather name="mail" size={13} color="#60a5fa" />
                        </TouchableOpacity>
                      ) : null}

                      {/* Call */}
                      {u.mobile ? (
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                          onPress={() => handleCallUser(u.mobile)}
                          activeOpacity={0.7}
                        >
                          <Feather name="phone" size={13} color="#34d399" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ─── TAB 2: MASJID APPROVALS ─── */}
        {activeTab === 'masjids' && (
          <View>
            {/* Status Filter Pills */}
            <View style={styles.masjidPillsRow}>
              {(['pending', 'approved', 'rejected'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.masjidStatusPill,
                    {
                      backgroundColor: masjidStatusFilter === s ? colors.accentGold : colors.card,
                      borderColor: masjidStatusFilter === s ? colors.accentGold : colors.border,
                    },
                  ]}
                  onPress={() => setMasjidStatusFilter(s)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.masjidStatusPillText,
                      { color: masjidStatusFilter === s ? '#0f1718' : colors.text },
                      masjidStatusFilter === s && styles.masjidStatusPillTextActive,
                    ]}
                  >
                    {s === 'pending'
                      ? 'Pending Review'
                      : s === 'approved'
                      ? 'Approved'
                      : 'Rejected'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {filteredMasjids.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Feather name="check-circle" size={32} color={colors.accentGreen} style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No {masjidStatusFilter} masjids found.</Text>
              </View>
            ) : (
              filteredMasjids.map((m) => (
                <View key={m.id} style={[styles.masjidCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.masjidCardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.masjidName, { color: colors.text }]}>{m.name}</Text>
                      <Text style={[styles.masjidAddress, { color: colors.textSecondary }]}>{m.address}</Text>
                      {m.famousArea ? (
                        <Text style={[styles.masjidArea, { color: colors.textMuted }]}>Area: {
m.famousArea}</Text>
                      ) : null}
                      {m.presidentName ? (
                        <Text style={[styles.masjidPresident, { color: colors.textSecondary }]}>President: {
m.presidentName}</Text>
                      ) : null}
                      <Text style={[styles.masjidSchool, { color: colors.textMuted }]}>School: {
m.school}</Text>
                    </View>
                  </View>

                  {/* Timings Snapshot */}
                  <View style={[styles.timingsGrid, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
                    <Text style={[styles.timingsText, { color: colors.textSecondary }]}>
                      Fajr: {
m.iqamahTimes?.Fajr || '--:--'} | Dhuhr: {
m.iqamahTimes?.Dhuhr || '--:--'} | Asr: {
m.iqamahTimes?.Asr || '--:--'} | Maghrib: {
m.iqamahTimes?.Maghrib || '--:--'} | Isha: {
m.iqamahTimes?.Isha || '--:--'}
                    </Text>
                    <Text style={[styles.timingsText, { color: colors.accentGold }]}>
                      Jumu'ah: {
m.jummah || '01:30 PM'} (Athan: {
m.jummahAthan || '01:00 PM'})
                    </Text>
                  </View>

                  {/* Actions: Approve, Reject, Edit */}
                  <View style={styles.masjidActionRow}>
                    {m.status !== 'approved' && (
                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => handleSetMasjidStatus(m, 'approved')}
                        activeOpacity={0.8}
                      >
                        <Feather name="check" size={14} color="#0f1718" style={{ marginRight: 4 }} />
                        <Text style={styles.approveBtnText}>Approve</Text>
                      </TouchableOpacity>
                    )}

                    {m.status !== 'rejected' && (
                      <TouchableOpacity
                        style={styles.rejectBtn}
                        onPress={() => handleSetMasjidStatus(m, 'rejected')}
                        activeOpacity={0.8}
                      >
                        <Feather name="x" size={14} color="#f87171" style={{ marginRight: 4 }} />
                        <Text style={styles.rejectBtnText}>Reject</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => handleEditMasjidTimings(m)}
                      activeOpacity={0.8}
                    >
                      <Feather name="edit-2" size={14} color="#e2a23b" style={{ marginRight: 4 }} />
                      <Text style={styles.editBtnText}>Edit Details & Timings</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ─── TAB 3: CONFIGURATION & GLOBAL STATS ─── */}
        {activeTab === 'stats' && (
          <View>
            <View style={styles.statsGrid}>
              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statNumber, { color: colors.text }]}>{stats?.totalUsers || 0}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Users</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statNumber, { color: colors.accentGreen }]}>
                  {stats?.activeUsers || 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Active Believers</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statNumber, { color: colors.accentGold }]}>
                  {stats?.approvedMasjids || 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Approved Masjids</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statNumber, { color: '#f87171' }]}>
                  {stats?.pendingMasjids || 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Pending Masjids</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statNumber, { color: colors.text }]}>{stats?.totalJumaTopics || 0}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Jumu'ah Topics</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statNumber, { color: colors.text }]}>{stats?.totalFeedback || 0}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Community Feedback</Text>
              </View>
            </View>

            {/* Version & Force Update Card */}
            <View style={[styles.configCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.configHeading, { color: colors.accentGold }]}>Release & Force Update</Text>
              <View style={styles.configRow}>
                <Text style={[styles.configKey, { color: colors.textSecondary }]}>Current App Version:</Text>
                <Text style={[styles.configVal, { color: colors.text }]}>3.2.0</Text>
              </View>
              <View style={styles.configRow}>
                <Text style={[styles.configKey, { color: colors.textSecondary }]}>Minimum Required Version:</Text>
                <Text style={[styles.configVal, { color: colors.text }]}>
                  {stats?.forceUpdateConfig?.minVersion || '3.2.0'}
                </Text>
              </View>
              <View style={styles.configRow}>
                <Text style={[styles.configKey, { color: colors.textSecondary }]}>Latest Cloud Version:</Text>
                <Text style={[styles.configVal, { color: colors.text }]}>
                  {stats?.forceUpdateConfig?.latestVersion || '3.2.0'}
                </Text>
              </View>
              <View style={styles.configRow}>
                <Text style={[styles.configKey, { color: colors.textSecondary }]}>Force Update Status:</Text>
                <Text
                  style={[
                    styles.configVal,
                    { color: stats?.forceUpdateConfig?.forceUpdate ? '#f87171' : colors.accentGreen },
                  ]}
                >
                  {stats?.forceUpdateConfig?.forceUpdate ? 'Mandatory' : 'Optional / Active'}
                </Text>
              </View>
              <Text style={styles.configNote}>
                What's New: {
stats?.forceUpdateConfig?.whatsNew || 'All verified timings active.'}
              </Text>
            </View>

            {/* Raw Config Dump */}
            {stats?.rawConfigs && Object.keys(stats.rawConfigs).length > 0 && (
              <View style={[styles.configCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.configHeading, { color: colors.accentGold }]}>Firestore /config Collections</Text>
                {Object.entries(stats.rawConfigs).map(([key, val]) => (
                  <View key={key} style={[styles.rawConfigBlock, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                    <Text style={[styles.rawConfigTitle, { color: colors.accentGold }]}>{key}</Text>
                    <Text style={[styles.rawConfigBody, { color: colors.textSecondary }]}>
                      {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ─── TAB 4: BROADCASTS (CLONE OF SALAHTIME NOTIFICATIONFRAGMENT) ─── */}
        {activeTab === 'broadcasts' && (
          <View>
            <View style={[styles.broadcastConsoleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.broadcastCardHeader}>
                <View style={styles.broadcastIconBox}>
                  <Feather name="send" size={16} color={colors.accentGold} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.broadcastCardTitle, { color: colors.text }]}>
                    SalahTime FCM Push Broadcast
                  </Text>
                  <Text style={[styles.broadcastCardSub, { color: colors.textMuted }]}>
                    Dispatch live alerts and emergency notifications to community devices
                  </Text>
                </View>
              </View>

              {/* Target Selector: Global vs Specific Masjid */}
              <Text style={[styles.broadcastInputLabel, { color: colors.textSecondary }]}>Select Target Audience</Text>
              <View style={styles.targetPillRow}>
                <TouchableOpacity
                  style={[
                    styles.targetPill,
                    { backgroundColor: colors.pill, borderColor: colors.borderSubtle },
                    broadcastTarget === 'global' && { backgroundColor: colors.accentGoldBg, borderColor: colors.accentGold },
                  ]}
                  onPress={() => setBroadcastTarget('global')}
                  activeOpacity={0.8}
                >
                  <Feather
                    name="globe"
                    size={12}
                    color={broadcastTarget === 'global' ? '#0f1718' : colors.textMuted}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.targetPillText,
                      { color: colors.textMuted },
                      broadcastTarget === 'global' && { color: '#0f1718', fontWeight: '700' },
                    ]}
                  >
                    Global (All Musallis)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.targetPill,
                    { backgroundColor: colors.pill, borderColor: colors.borderSubtle },
                    broadcastTarget === 'masjid' && { backgroundColor: colors.accentGoldBg, borderColor: colors.accentGold },
                  ]}
                  onPress={() => setBroadcastTarget('masjid')}
                  activeOpacity={0.8}
                >
                  <Feather
                    name="map-pin"
                    size={12}
                    color={broadcastTarget === 'masjid' ? '#0f1718' : colors.textMuted}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.targetPillText,
                      { color: colors.textMuted },
                      broadcastTarget === 'masjid' && { color: '#0f1718', fontWeight: '700' },
                    ]}
                  >
                    Specific Masjid
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Masjid Picker if target === 'masjid' */}
              {broadcastTarget === 'masjid' && (
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.broadcastInputLabel, { color: colors.textSecondary }]}>Target Masjid *</Text>
                  <TouchableOpacity
                    style={[styles.masjidSelectorBtn, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}
                    onPress={() => setIsBroadcastMasjidPickerVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Feather name="map-pin" size={14} color={colors.accentGold} style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.masjidSelectorText,
                          { color: colors.text },
                          !selectedBroadcastMasjid && { color: colors.textMuted, fontStyle: 'italic' },
                        ]}
                        numberOfLines={1}
                      >
                        {selectedBroadcastMasjid ? selectedBroadcastMasjid.name : 'Select target Masjid...'}
                      </Text>
                    </View>
                    <Feather name="chevron-down" size={14} color={colors.accentGold} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Title input */}
              <Text style={[styles.broadcastInputLabel, { color: colors.textSecondary }]}>Notification Title *</Text>
              <TextInput
                style={[styles.broadcastInput, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle, color: colors.text }]}
                placeholder="e.g. Ramadan Moon Sighted / Jumu'ah Notice"
                placeholderTextColor={colors.textMuted}
                value={broadcastTitle}
                onChangeText={setBroadcastTitle}
              />

              {/* Message input */}
              <Text style={[styles.broadcastInputLabel, { color: colors.textSecondary }]}>Notification Message *</Text>
              <TextInput
                style={[
                  styles.broadcastTextarea,
                  { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle, color: colors.text },
                ]}
                placeholder="Type your message to be pushed to user devices..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                value={broadcastMessage}
                onChangeText={setBroadcastMessage}
              />

              {/* Destination Screen Picker */}
              <Text style={[styles.broadcastInputLabel, { color: colors.textSecondary }]}>Destination / Click Action</Text>
              <View style={styles.targetPillRow}>
                {[
                  { id: 'prayer', label: 'Prayer Times' },
                  { id: 'friday-topics', label: "Jumu'ah Topics" },
                  { id: 'community', label: 'Community Board' },
                ].map((dest) => {
                  const isSel = broadcastDestination === dest.id;
                  return (
                    <TouchableOpacity
                      key={dest.id}
                      style={[
                        styles.targetPillSmall,
                        { backgroundColor: colors.pill, borderColor: colors.borderSubtle },
                        isSel && { backgroundColor: colors.accentGoldBg, borderColor: colors.accentGold },
                      ]}
                      onPress={() => setBroadcastDestination(dest.id)}
                    >
                      <Text
                        style={[
                          styles.targetPillTextSmall,
                          { color: colors.textMuted },
                          isSel && { color: '#0f1718', fontWeight: '700' },
                        ]}
                      >
                        {dest.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Dispatch Button */}
              <TouchableOpacity
                style={[styles.dispatchBtn, { backgroundColor: colors.accentGold }]}
                onPress={handleSendBroadcast}
                disabled={dispatchingBroadcast}
                activeOpacity={0.8}
              >
                {dispatchingBroadcast ? (
                  <ActivityIndicator size="small" color="#0f1718" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Feather name="send" size={14} color="#0f1718" style={{ marginRight: 6 }} />
                    <Text style={[styles.dispatchBtnText, { color: '#0f1718' }]}>Dispatch Push Broadcast</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Broadcast History */}
            <View style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.historyTitle, { color: colors.text }]}>Recent Broadcasts History</Text>
              {broadcastHistory.map((item) => (
                <View key={item.id} style={[styles.historyItem, { borderBottomColor: colors.borderSubtle }]}>
                  <View style={styles.historyTopRow}>
                    <Text style={[styles.historyItemTitle, { color: colors.accentGold }]}>{item.title}</Text>
                    <Text style={[styles.historyTime, { color: colors.textMuted }]}>{item.time}</Text>
                  </View>
                  <Text style={[styles.historyMessage, { color: colors.textSecondary }]}>{item.message}</Text>
                  <View style={styles.historyFooter}>
                    <View style={styles.historyTargetBadge}>
                      <Feather name="users" size={10} color={colors.textMuted} style={{ marginRight: 4 }} />
                      <Text style={[styles.historyTargetText, { color: colors.textMuted }]}>Target: {item.target}</Text>
                    </View>
                    {item.recipientCount ? (
                      <Text style={[styles.historyRecipientText, { color: colors.accentGreen }]}>
                        ~{item.recipientCount} Recipients
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Broadcast Target Masjid Picker Modal */}
      <Modal
        visible={isBroadcastMasjidPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsBroadcastMasjidPickerVisible(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={[styles.pickerModalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.pickerModalHeader}>
              <Text style={[styles.pickerModalTitle, { color: colors.text }]}>Select Target Masjid</Text>
              <TouchableOpacity onPress={() => setIsBroadcastMasjidPickerVisible(false)}>
                <Feather name="x" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchRow, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle, marginBottom: 8 }]}>
              <Feather name="search" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search masjid name or address..."
                placeholderTextColor={colors.textMuted}
                value={broadcastMasjidSearch}
                onChangeText={setBroadcastMasjidSearch}
              />
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {masjidList
                .filter(
                  (m) =>
                    !broadcastMasjidSearch.trim() ||
                    m.name.toLowerCase().includes(broadcastMasjidSearch.toLowerCase()) ||
                    (m.address || '').toLowerCase().includes(broadcastMasjidSearch.toLowerCase())
                )
                .map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.pickerListItem, { borderBottomColor: colors.borderSubtle }]}
                    onPress={() => {
                      setSelectedBroadcastMasjid(m);
                      setIsBroadcastMasjidPickerVisible(false);
                    }}
                  >
                    <Feather name="map-pin" size={14} color={colors.accentGold} style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerListItemTitle, { color: colors.text }]}>{m.name}</Text>
                      {m.address ? (
                        <Text style={[styles.pickerListItemSub, { color: colors.textMuted }]} numberOfLines={1}>
                          {m.address}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Role Promotion Modal */}
      <Modal
        visible={isRoleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRoleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.roleModalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.roleModalTitle, { color: colors.text }]}>Promote / Change Role</Text>
            <Text style={[styles.roleModalSubtitle, { color: colors.textSecondary }]}>
              User: {
selectedUserForRole?.name} ({selectedUserForRole?.email})
            </Text>

            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accentGold, marginTop: 12, marginBottom: 6 }}>
              System Permission (Access Level)
            </Text>
            <View style={styles.roleModalButtons}>
              {([
                { id: 'user', label: 'Musalli (Standard)' },
                { id: 'super_user', label: 'Super User (Masjid Updater)' },
                { id: 'super_user2', label: 'Super User 2 (Area Coordinator)' },
                { id: 'admin', label: 'Admin (Full System)' },
              ] as const).map((r) => {
                const isSelected = selectedRoleChoice === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.roleModalBtn,
                      {
                        backgroundColor: isSelected ? colors.accentGold : colors.card,
                        borderColor: isSelected ? colors.accentGold : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedRoleChoice(r.id)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.roleModalBtnText,
                        { color: isSelected ? '#0f1718' : colors.text },
                        isSelected && styles.roleModalBtnTextActive,
                      ]}
                    >
                      {r.label}
                    </Text>
                    {isSelected && <Feather name="check" size={14} color="#0f1718" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accentGold, marginTop: 14, marginBottom: 6 }}>
              Masjid Designation (Title)
            </Text>
            <View style={styles.roleModalButtons}>
              {([
                { id: 'musalli', label: 'Musalli' },
                { id: 'imam', label: 'Imam' },
                { id: 'muazzin', label: 'Muazzin' },
                { id: 'president', label: 'President' },
                { id: 'secretary', label: 'Secretary' },
              ] as const).map((t) => {
                const isSelected = selectedTypeChoice === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.roleModalBtn,
                      {
                        backgroundColor: isSelected ? colors.accentGold : colors.card,
                        borderColor: isSelected ? colors.accentGold : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedTypeChoice(t.id)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.roleModalBtnText,
                        { color: isSelected ? '#0f1718' : colors.text },
                        isSelected && styles.roleModalBtnTextActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                    {isSelected && <Feather name="check" size={14} color="#0f1718" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={{ backgroundColor: colors.accentGold, paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 16 }}
              onPress={handleSaveUserDesignation}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#0f1718', fontWeight: '700', fontSize: 13 }}>Save Permission & Title</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleModalCancelBtn, { backgroundColor: colors.pill }]}
              onPress={() => setIsRoleModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.roleModalCancelText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Masjid Timing Modal */}
      <UpdateMasjidTimingModal
        visible={isEditModalVisible}
        masjid={editingMasjid}
        mode="update"
        onClose={() => setIsEditModalVisible(false)}
        onSubmit={handleSaveEditedMasjid}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {

    flex: 1,
    backgroundColor: '#0f1718',
  },
  header: {

    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backBtn: {

    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(226, 162, 59, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitleWrap: {

    flex: 1,
  },
  title: {

    fontSize: 18,
    fontWeight: '800',
    color: '#f3f7f6',
  },
  subtitle: {

    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  refreshTopBtn: {

    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(226, 162, 59, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSelectorRow: {

    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0b2527',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 162, 59, 0.2)',
    gap: 8,
  },
  updateCountContainer: {
    marginTop: 8,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  fetchCountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  fetchCountBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  countBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  countBadgePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  broadcastConsoleCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  broadcastCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  broadcastIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(226, 162, 59, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  broadcastCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  broadcastCardSub: {
    fontSize: 11,
    marginTop: 1,
  },
  broadcastInputLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
  },
  targetPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  targetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  targetPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  targetPillSmall: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  targetPillTextSmall: {
    fontSize: 11,
  },
  masjidSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
  },
  masjidSelectorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  broadcastInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 12,
  },
  broadcastTextarea: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    minHeight: 70,
  },
  dispatchBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dispatchBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  historyCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  historyItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  historyItemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  historyTime: {
    fontSize: 10,
  },
  historyMessage: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  historyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyTargetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyTargetText: {
    fontSize: 10,
  },
  historyRecipientText: {
    fontSize: 10,
    fontWeight: '700',
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  pickerModalCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pickerModalTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  pickerListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  pickerListItemTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  pickerListItemSub: {
    fontSize: 11,
    marginTop: 1,
  },
  tabButton: {

    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0c3033',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabButtonActive: {

    backgroundColor: '#e2a23b',
    borderColor: '#e2a23b',
  },
  tabButtonText: {

    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  tabButtonTextActive: {

    color: '#0f1718',
  },
  scrollContent: {

    padding: 16,
    paddingBottom: 40,
  },
  searchRow: {

    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b2527',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 10,
  },
  searchInput: {

    flex: 1,
    color: '#f3f7f6',
    fontSize: 13,
  },
  pillScroll: {

    flexDirection: 'row',
    marginBottom: 14,
  },
  filterPill: {

    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#0c3033',
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: "center",
    justifyContent: "center",
  },
  filterPillActive: {

    backgroundColor: 'rgba(226, 162, 59, 0.2)',
    borderColor: '#e2a23b',
  },
  filterPillText: {

    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textAlign: "center",
    includeFontPadding: false,
  },
  filterPillTextActive: {

    color: '#ffdda8',
  },
  userCard: {

    backgroundColor: '#0b2527',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  userCardHeader: {

    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userName: {

    fontSize: 15,
    fontWeight: '700',
    color: '#f3f7f6',
  },
  userContact: {

    fontSize: 12,
    color: '#94a3b8',
    marginTop: 1,
  },
  roleTag: {

    backgroundColor: 'rgba(226, 162, 59, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.3)',
  },
  roleTagText: {

    fontSize: 10,
    fontWeight: '800',
    color: '#ffdda8',
  },
  userCardActions: {

    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  statusSwitchRow: {

    flexDirection: 'row',
    alignItems: 'center',
  },
  statusSwitchLabel: {

    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
    marginRight: 6,
  },
  btnRow: {

    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {

    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c3033',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionBtnText: {

    fontSize: 11,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  masjidPillsRow: {

    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  masjidStatusPill: {

    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0c3033',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: "center",
    justifyContent: "center",
  },
  masjidStatusPillActive: {

    backgroundColor: 'rgba(226, 162, 59, 0.2)',
    borderColor: '#e2a23b',
  },
  masjidStatusPillText: {

    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textAlign: "center",
    includeFontPadding: false,
  },
  masjidStatusPillTextActive: {

    color: '#ffdda8',
  },
  masjidCard: {

    backgroundColor: '#0b2527',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.2)',
  },
  masjidCardTop: {

    flexDirection: 'row',
    marginBottom: 8,
  },
  masjidName: {

    fontSize: 15,
    fontWeight: '800',
    color: '#f3f7f6',
  },
  masjidAddress: {

    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  masjidArea: {

    fontSize: 11,
    color: '#ffdda8',
    marginTop: 1,
  },
  masjidPresident: {

    fontSize: 11,
    color: '#cbd5e1',
    marginTop: 1,
  },
  masjidSchool: {

    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  timingsGrid: {

    backgroundColor: '#0c3033',
    borderRadius: 8,
    padding: 8,
    marginVertical: 8,
  },
  timingsText: {

    fontSize: 11,
    color: '#cbd5e1',
    lineHeight: 16,
  },
  masjidActionRow: {

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  approveBtn: {

    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  approveBtnText: {

    fontSize: 12,
    fontWeight: '700',
    color: '#0f1718',
  },
  rejectBtn: {

    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  rejectBtnText: {

    fontSize: 12,
    fontWeight: '700',
    color: '#f87171',
  },
  editBtn: {

    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226, 162, 59, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.35)',
  },
  editBtnText: {

    fontSize: 12,
    fontWeight: '700',
    color: '#ffdda8',
  },
  statsGrid: {

    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statBox: {

    width: '48%',
    backgroundColor: '#0b2527',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statNumber: {

    fontSize: 24,
    fontWeight: '800',
    color: '#f3f7f6',
  },
  statLabel: {

    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  configCard: {

    backgroundColor: '#0b2527',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.2)',
  },
  configHeading: {

    fontSize: 14,
    fontWeight: '700',
    color: '#ffdda8',
    marginBottom: 10,
  },
  configRow: {

    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  configKey: {

    fontSize: 12,
    color: '#94a3b8',
  },
  configVal: {

    fontSize: 12,
    fontWeight: '700',
    color: '#f3f7f6',
  },
  configNote: {

    fontSize: 11,
    color: '#cbd5e1',
    marginTop: 8,
    fontStyle: 'italic',
  },
  rawConfigBlock: {

    backgroundColor: '#0c3033',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  rawConfigTitle: {

    fontSize: 12,
    fontWeight: '700',
    color: '#e2a23b',
    marginBottom: 4,
  },
  rawConfigBody: {

    fontSize: 11,
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  emptyCard: {

    backgroundColor: '#0b2527',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  emptyText: {

    fontSize: 13,
    color: '#94a3b8',
  },
  modalOverlay: {

    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  roleModalCard: {

    width: '100%',
    backgroundColor: '#0b2527',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.3)',
  },
  roleModalTitle: {

    fontSize: 16,
    fontWeight: '800',
    color: '#f3f7f6',
  },
  roleModalSubtitle: {

    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 16,
  },
  roleModalButtons: {

    gap: 8,
    marginBottom: 16,
  },
  roleModalBtn: {

    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#0c3033',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  roleModalBtnActive: {

    backgroundColor: '#e2a23b',
  },
  roleModalBtnText: {

    fontSize: 14,
    fontWeight: '700',
    color: '#f3f7f6',
  },
  roleModalBtnTextActive: {

    color: '#0f1718',
  },
  roleModalCancelBtn: {

    alignItems: 'center',
    paddingVertical: 10,
  },
  roleModalCancelText: {

    fontSize: 13,
    color: '#94a3b8',
  },
});
