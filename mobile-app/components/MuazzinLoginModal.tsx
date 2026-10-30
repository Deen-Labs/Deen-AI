import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Masjid } from '../lib/masjid';
import { verifyAndLoginImam, ImamSession } from '../lib/masjidTimingSync';
import { useTheme } from '../lib/theme';

interface MuazzinLoginModalProps {
  visible: boolean;
  activeMasjid: Masjid | null;
  availableMasjids?: Masjid[];
  onClose: () => void;
  onSuccess: (session: ImamSession, masjid: Masjid | null) => void;
}

export default function MuazzinLoginModal({
  visible,
  activeMasjid,
  availableMasjids = [],
  onClose,
  onSuccess,
}: MuazzinLoginModalProps) {
  const { colors, isDark } = useTheme();
  const [imamName, setImamName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [selectedMasjidId, setSelectedMasjidId] = useState<string>(activeMasjid?.id || '');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!visible) return null;

  const currentChosenMasjid =
    availableMasjids.find((m) => m.id === selectedMasjidId) || activeMasjid;

  const handleLogin = async () => {
    setErrorMessage(null);
    if (!imamName.trim()) {
      setErrorMessage('Please enter your registered Muazzin Email or ID.');
      return;
    }
    if (!passcode.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyAndLoginImam(
        imamName.trim(),
        passcode.trim(),
        currentChosenMasjid?.id
      );

      if (res.success && res.session) {
        onSuccess(res.session, currentChosenMasjid);
        onClose();
      } else {
        setErrorMessage(res.error || 'Invalid security code. Please check with your committee.');
      }
    } catch {
      setErrorMessage('Unable to verify login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
          >
            <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
                <View style={[styles.iconCircle, { backgroundColor: colors.pill, borderColor: colors.border }]}>
                  <Feather name="shield" size={24} color={colors.accentGold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: colors.text }]}>Muazzin & Imam Login</Text>
                  <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                    Publish verified prayer times to your community
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                  <Feather name="x" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                {/* Active Masjid Target Card */}
                {currentChosenMasjid && (
                  <View style={[styles.masjidTargetCard, { backgroundColor: colors.card, borderColor: colors.accentGreen }]}>
                    <View style={styles.masjidTargetBadge}>
                      <Feather name="map-pin" size={11} color="#00ff66" style={{ marginRight: 4 }} />
                      <Text style={styles.masjidTargetBadgeText}>Target Masjid</Text>
                    </View>
                    <Text style={[styles.masjidTargetName, { color: colors.accentSoft }]}>{currentChosenMasjid.name}</Text>
                    <Text style={[styles.masjidTargetAddress, { color: colors.textMuted }]} numberOfLines={1}>
                      {currentChosenMasjid.address}
                    </Text>
                  </View>
                )}

                {/* Form Fields */}
                <View style={styles.formGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.accentGold }]}>MUAZZIN EMAIL / ID</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}>
                    <Feather name="mail" size={14} color={colors.textMuted} style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.textInput, { color: colors.text }]}
                      value={imamName}
                      onChangeText={(val) => {
                        setImamName(val);
                        setErrorMessage(null);
                      }}
                      placeholder="e.g. muazzin@email.com"
                      placeholderTextColor={isDark ? "#5c7375" : "#94a3b8"}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.accentGold }]}>PASSWORD</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}>
                    <Feather name="lock" size={14} color={colors.textMuted} style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.textInput, { color: colors.text }]}
                      value={passcode}
                      onChangeText={(val) => {
                        setPasscode(val);
                        setErrorMessage(null);
                      }}
                      placeholder="Enter your registered password"
                      placeholderTextColor={isDark ? "#5c7375" : "#94a3b8"}
                      secureTextEntry={!showPasscode}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPasscode(!showPasscode)}
                      style={styles.eyeBtn}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name={showPasscode ? 'eye-off' : 'eye'}
                        size={14}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {errorMessage ? (
                  <View style={styles.errorBox}>
                    <Feather name="alert-circle" size={13} color="#ef4444" style={{ marginRight: 6 }} />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                {/* Quick Helper Note */}
                <View style={[styles.helperBox, { backgroundColor: colors.pill, borderColor: colors.border }]}>
                  <Feather name="info" size={12} color={colors.accentGold} style={{ marginRight: 6, marginTop: 1 }} />
                  <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                    Sign in with your registered Muazzin Email and Password to publish verified prayer times for your masjid.
                  </Text>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: colors.pill }]}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.loginBtn, { backgroundColor: colors.accentGoldBg }, loading && { opacity: 0.7 }]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#0f1718" />
                  ) : (
                    <>
                      <Feather name="check" size={15} color="#0f1718" style={{ marginRight: 6 }} />
                      <Text style={styles.loginBtnText}>Verify & Login</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    width: '100%',
  },
  container: {
    backgroundColor: '#0b2527',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(226, 162, 59, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a4a2',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  masjidTargetCard: {
    backgroundColor: 'rgba(7, 31, 33, 0.8)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 102, 0.25)',
    marginBottom: 14,
  },
  masjidTargetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 255, 102, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  masjidTargetBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#00ff66',
  },
  masjidTargetName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffdda8',
  },
  masjidTargetAddress: {
    fontSize: 11,
    color: '#94a4a2',
    marginTop: 2,
  },
  formGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffdda8',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c3033',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  textInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
  },
  eyeBtn: {
    padding: 6,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 11,
    color: '#ef4444',
    flex: 1,
  },
  helperBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(226, 162, 59, 0.08)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.2)',
    marginBottom: 16,
  },
  helperText: {
    fontSize: 11,
    color: '#ffdda8',
    lineHeight: 15,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a4a2',
  },
  loginBtn: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#e2a23b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f1718',
  },
});
