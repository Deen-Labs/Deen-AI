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
import { registerUser, CommunityUserType, UserRole } from '../../lib/auth';
import { fetchSalahTimeMasjids } from '../../lib/salahTimeBackend';
import { setDefaultMasjidId } from '../../lib/masjidTimingSync';
import { Masjid } from '../../lib/masjid';
import { useTheme } from '../../lib/theme';
import { useResponsiveLayout } from '../../lib/responsive';

interface DesignationOption {
  type: CommunityUserType;
  label: string;
  desc: string;
  requiresApproval: boolean;
}

const DESIGNATION_OPTIONS: DesignationOption[] = [
  {
    type: 'musalli',
    label: 'Musalli (Worshipper)',
    desc: 'Regular worshipper with verified prayer times and community access',
    requiresApproval: false,
  },
  {
    type: 'muazzin',
    label: 'Muazzin',
    desc: 'Official Athan caller authorized to update daily Iqamah timings',
    requiresApproval: true,
  },
  {
    type: 'imam',
    label: 'Imam / Khateeb',
    desc: 'Mosque leader authorized for timing management & Jumu’ah topics',
    requiresApproval: true,
  },
  {
    type: 'president',
    label: 'President / Committee',
    desc: 'Masjid managing committee officer with administrative authority',
    requiresApproval: true,
  },
  {
    type: 'secretary',
    label: 'Secretary / Trustee',
    desc: 'Trustee or board secretary managing mosque records & notices',
    requiresApproval: true,
  },
];

export default function SignupScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { contentContainerStyle } = useResponsiveLayout();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Designation selection
  const [selectedDesignation, setSelectedDesignation] = useState<CommunityUserType>('musalli');

  // Searchable Default Masjid Picker Modal
  const [approvedMasjids, setApprovedMasjids] = useState<Masjid[]>([]);
  const [selectedMasjid, setSelectedMasjid] = useState<Masjid | null>(null);
  const [isMasjidModalVisible, setIsMasjidModalVisible] = useState(false);
  const [masjidSearchQuery, setMasjidSearchQuery] = useState('');
  const [loadingMasjids, setLoadingMasjids] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadApprovedMasjids();
  }, []);

  const loadApprovedMasjids = async () => {
    setLoadingMasjids(true);
    try {
      const list = await fetchSalahTimeMasjids();
      setApprovedMasjids(list);
    } catch (err) {
      console.warn('[Signup] Error fetching approved masjids:', err);
    } finally {
      setLoadingMasjids(false);
    }
  };

  const filteredMasjids = useMemo(() => {
    if (!masjidSearchQuery.trim()) return approvedMasjids;
    const q = masjidSearchQuery.trim().toLowerCase();
    return approvedMasjids.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.address && m.address.toLowerCase().includes(q)) ||
        (m.famousArea && m.famousArea.toLowerCase().includes(q))
    );
  }, [approvedMasjids, masjidSearchQuery]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/masjid');
    }
  };

  const handleRegister = async () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile.trim();
    const cleanPass = password.trim();

    if (!cleanName || cleanName.length < 2) {
      Alert.alert('Required Field', 'Please enter your full name (at least 2 characters).');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      Alert.alert('Required Field', 'Please enter a valid email address.');
      return;
    }
    if (!cleanMobile || cleanMobile.length < 10) {
      Alert.alert('Required Field', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!cleanPass || cleanPass.length < 6) {
      Alert.alert('Required Field', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      // Security Enforcement (VULN-02):
      // Active role is ALWAYS 'USER'. If clergy/committee designation selected,
      // requestedRole is set to 'SUPER_USER' and roleApprovalStatus to 'pending'.
      const isPrivileged = selectedDesignation !== 'musalli';
      const requestedRole: UserRole | undefined = isPrivileged ? 'SUPER_USER' : undefined;
      const roleApprovalStatus = isPrivileged ? ('pending' as const) : undefined;

      const res = await registerUser({
        name: cleanName,
        email: cleanEmail,
        mobile: cleanMobile,
        password: cleanPass,
        role: 'USER',
        userType: selectedDesignation,
        requestedRole,
        roleApprovalStatus,
        masjidId: selectedMasjid?.id,
        masjidName: selectedMasjid?.name,
      });

      if (res.success) {
        if (selectedMasjid?.id) {
          await setDefaultMasjidId(selectedMasjid.id).catch(() => {});
        }

        if (isPrivileged) {
          const currentOption = DESIGNATION_OPTIONS.find((o) => o.type === selectedDesignation);
          Alert.alert(
            'Account Created! 🕌',
            `Your account has been registered. Because you selected "${currentOption?.label || selectedDesignation}", your verification request has been queued for Administrator approval. Until approved, you have Musalli permissions. Please sign in to proceed.`,
            [
              {
                text: 'Sign In Now',
                onPress: () => router.replace('/auth/login'),
              },
            ]
          );
        } else {
          Alert.alert(
            'Account Created! 🌟',
            'Your DeenHub account has been created successfully! Please sign in with your credentials.',
            [
              {
                text: 'Sign In Now',
                onPress: () => router.replace('/auth/login'),
              },
            ]
          );
        }
      } else {
        Alert.alert('Registration Failed', res.error || 'Could not complete registration. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Unable to connect to authentication server.');
    } finally {
      setLoading(false);
    }
  };

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
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <Feather name="arrow-left" size={20} color={colors.accentGold} />
            </TouchableOpacity>
            <Text style={[styles.topBarTitle, { color: colors.text }]}>Create Account</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Form Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.brandBadge, { backgroundColor: colors.pill, borderColor: colors.borderSubtle }]}>
              <Feather name="user-plus" size={14} color={colors.accentGold} style={{ marginRight: 6 }} />
              <Text style={[styles.brandBadgeText, { color: colors.accentGold }]}>
                DeenHub Community Registration
              </Text>
            </View>

            <Text style={[styles.title, { color: colors.text }]}>Join the Network</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Register as a Musalli or request official Mosque leadership designation.
            </Text>

            {/* Full Name */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Full Name *</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}>
              <Feather name="user" size={16} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="e.g. Mohammed Farhan"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Email Address */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email Address *</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}>
              <Feather name="mail" size={16} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="name@example.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Mobile Number */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Mobile Number *</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}>
              <Feather name="phone" size={16} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.textMuted}
                value={mobile}
                onChangeText={setMobile}
                keyboardType="phone-pad"
              />
            </View>

            {/* Password */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Password * (min 6 characters)</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}>
              <Feather name="lock" size={16} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text, flex: 1 }]}
                placeholder="Choose a secure password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.eyeBtn}
                activeOpacity={0.7}
              >
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Default Masjid Selector Modal Trigger */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Default / Home Masjid</Text>
            <TouchableOpacity
              style={[styles.pickerTrigger, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}
              onPress={() => setIsMasjidModalVisible(true)}
              activeOpacity={0.7}
            >
              <Feather name="map-pin" size={16} color={colors.accentGold} style={styles.inputIcon} />
              <Text
                style={[
                  styles.pickerTriggerText,
                  { color: selectedMasjid ? colors.text : colors.textMuted },
                ]}
                numberOfLines={1}
              >
                {selectedMasjid ? selectedMasjid.name : 'Select your local approved masjid'}
              </Text>
              <Feather name="chevron-down" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Masjid Designation / Role Selector */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>
              Masjid Designation / Community Role *
            </Text>
            <View style={styles.designationList}>
              {DESIGNATION_OPTIONS.map((opt) => {
                const isSelected = selectedDesignation === opt.type;
                return (
                  <TouchableOpacity
                    key={opt.type}
                    style={[
                      styles.designationCard,
                      {
                        backgroundColor: isSelected ? (isDark ? '#1a2c20' : '#eaf7ee') : colors.inputBg,
                        borderColor: isSelected ? '#10b981' : colors.borderSubtle,
                      },
                    ]}
                    onPress={() => setSelectedDesignation(opt.type)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.radioRow}>
                      <View
                        style={[
                          styles.radioCircle,
                          { borderColor: isSelected ? '#10b981' : colors.textMuted },
                        ]}
                      >
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.badgeLine}>
                          <Text style={[styles.designationLabel, { color: colors.text }]}>{opt.label}</Text>
                          {opt.requiresApproval && (
                            <View style={styles.approvalBadge}>
                              <Text style={styles.approvalBadgeText}>Requires Admin Review</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.designationDesc, { color: colors.textMuted }]}>{opt.desc}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.accentGold }]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#0f1718" size="small" />
              ) : (
                <View style={styles.btnContent}>
                  <Text style={styles.primaryBtnText}>Complete Registration</Text>
                  <Feather name="arrow-right" size={18} color="#0f1718" style={{ marginLeft: 8 }} />
                </View>
              )}
            </TouchableOpacity>

            {/* Symmetrical Footer Link to Sign In */}
            <View style={styles.footerWrap}>
              <Text style={[styles.footerText, { color: colors.textMuted }]}>
                Already registered?{' '}
              </Text>
              <TouchableOpacity
                onPress={() => router.replace('/auth/login')}
                activeOpacity={0.7}
              >
                <Text style={[styles.footerLink, { color: colors.accentGold }]}>
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Searchable Approved Masjid Picker Modal */}
      <Modal
        visible={isMasjidModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsMasjidModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Approved Masjid</Text>
              <TouchableOpacity
                onPress={() => setIsMasjidModalVisible(false)}
                style={[styles.closeModalBtn, { backgroundColor: colors.pill }]}
              >
                <Feather name="x" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalSearchRow, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}>
              <Feather name="search" size={16} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Search approved masjids or areas..."
                placeholderTextColor={colors.textMuted}
                value={masjidSearchQuery}
                onChangeText={setMasjidSearchQuery}
                autoCorrect={false}
              />
              {masjidSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setMasjidSearchQuery('')}>
                  <Feather name="x-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {loadingMasjids ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={colors.accentGold} />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading verified masjids...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredMasjids}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const isSelected = selectedMasjid?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.masjidItemRow,
                        {
                          backgroundColor: isSelected ? (isDark ? '#1a2c20' : '#eaf7ee') : colors.surface,
                          borderColor: isSelected ? '#10b981' : colors.borderSubtle,
                        },
                      ]}
                      onPress={() => {
                        setSelectedMasjid(item);
                        setIsMasjidModalVisible(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.masjidItemName, { color: colors.text }]}>{item.name}</Text>
                        <Text style={[styles.masjidItemArea, { color: colors.textMuted }]} numberOfLines={1}>
                          {item.famousArea || item.address || 'Hyderabad'}
                        </Text>
                      </View>
                      {isSelected && (
                        <Feather name="check" size={18} color="#10b981" />
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyBox}>
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                      No approved masjids found matching "{masjidSearchQuery}".
                    </Text>
                  </View>
                }
              />
            )}
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
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
  card: {
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  brandBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 22,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    height: 48,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    height: 48,
  },
  pickerTriggerText: {
    flex: 1,
    fontSize: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  eyeBtn: {
    padding: 6,
  },
  designationList: {
    marginTop: 6,
    marginBottom: 16,
  },
  designationCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
  },
  badgeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  designationLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  approvalBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  approvalBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#d97706',
  },
  designationDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 18,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#0f1718',
    fontSize: 16,
    fontWeight: '700',
  },
  footerWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
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
    height: 44,
    marginBottom: 14,
  },
  masjidItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  masjidItemName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  masjidItemArea: {
    fontSize: 12,
  },
  loadingBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
