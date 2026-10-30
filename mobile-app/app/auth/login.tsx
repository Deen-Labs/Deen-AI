import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { loginUser, getDisplayRoleLabel } from '../../lib/auth';
import { setDefaultMasjidId } from '../../lib/masjidTimingSync';
import { useTheme } from '../../lib/theme';
import { useLanguage } from '../../lib/i18n';
import { useResponsiveLayout } from '../../lib/responsive';

export default function LoginScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { contentContainerStyle } = useResponsiveLayout();

  const [emailOrMobile, setEmailOrMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/masjid');
    }
  };

  const handleLogin = async () => {
    const cleanInput = emailOrMobile.trim();
    const cleanPass = password.trim();

    if (!cleanInput) {
      Alert.alert('Required Field', 'Please enter your registered Email or Mobile number.');
      return;
    }
    if (!cleanPass) {
      Alert.alert('Required Field', 'Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await loginUser(cleanInput, cleanPass);
      if (res.success && res.user) {
        const u = res.user;

        // If user has a defaultMasjidId or masjidId, synchronize it
        const targetMasjidId = u.defaultMasjidId || u.masjidId;
        if (targetMasjidId) {
          await setDefaultMasjidId(targetMasjidId).catch(() => {});
        }

        const roleLabel = getDisplayRoleLabel(u);
        Alert.alert(
          'Login Successful 🕌',
          `Welcome back, ${u.name}! You are signed in as ${roleLabel}.`,
          [
            {
              text: 'Continue',
              onPress: () => router.replace('/(tabs)'),
            },
          ]
        );
      } else {
        Alert.alert('Authentication Failed', res.error || 'Please verify your credentials and try again.');
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
          {/* Top Navigation */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: colors.pill }]}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <Feather name="arrow-left" size={20} color={colors.accentGold} />
            </TouchableOpacity>
            <Text style={[styles.topBarTitle, { color: colors.text }]}>DeenHub Sign In</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Header Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.brandBadge, { backgroundColor: colors.pill, borderColor: colors.borderSubtle }]}>
              <Feather name="shield" size={14} color={colors.accentGold} style={{ marginRight: 6 }} />
              <Text style={[styles.brandBadgeText, { color: colors.accentGold }]}>
                DeenHub & SalahTime Verified Authentication
              </Text>
            </View>

            <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Sign in to manage masjid timings, view real-time congregation boards, and earn Sadaqah points.
            </Text>

            {/* Email or Mobile Input */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email or Mobile Number</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}>
              <Feather name="mail" size={16} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="name@example.com or 10-digit mobile"
                placeholderTextColor={colors.textMuted}
                value={emailOrMobile}
                onChangeText={setEmailOrMobile}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Password</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}>
              <Feather name="lock" size={16} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text, flex: 1 }]}
                placeholder="Enter your password"
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

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.accentGold }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#0f1718" size="small" />
              ) : (
                <View style={styles.btnContent}>
                  <Text style={styles.primaryBtnText}>Sign In to Account</Text>
                  <Feather name="log-in" size={18} color="#0f1718" style={{ marginLeft: 8 }} />
                </View>
              )}
            </TouchableOpacity>

            {/* Symmetrical Footer Link to Sign Up */}
            <View style={styles.footerWrap}>
              <Text style={[styles.footerText, { color: colors.textMuted }]}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/auth/signup')}
                activeOpacity={0.7}
              >
                <Text style={[styles.footerLink, { color: colors.accentGold }]}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    marginTop: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 48,
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
});
