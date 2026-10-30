import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';

interface ProtectionActivationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  hasPin: boolean;
  onRequirePin: () => void;
}

export default function ProtectionActivationModal({
  visible,
  onClose,
  onConfirm,
  hasPin,
  onRequirePin,
}: ProtectionActivationModalProps) {
  const { colors, isDark } = useTheme();
  const handleProceed = () => {
    if (!hasPin) {
      onClose();
      setTimeout(() => {
        onRequirePin();
      }, 250);
    } else {
      onConfirm();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header Icon */}
          <View style={styles.iconContainer}>
            <Feather name="shield" size={32} color={colors.accentGreen} />
          </View>

          {/* Title & Subtitle */}
          <Text style={[styles.title, { color: colors.text }]}>System-Wide Protection</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Filters explicit and harmful content across all browsers and applications on this device.
          </Text>

          {/* Highlights */}
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Feather name="check" size={16} color={colors.accentGreen} />
              </View>
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                Active blocking across Chrome, browsers, and social feeds
              </Text>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Feather name="cpu" size={16} color={colors.accentGreen} />
              </View>
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                Local on-device inspection with zero data collection or tracking
              </Text>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Feather name="lock" size={16} color={colors.accentGold} />
              </View>
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                Requires 4-digit PIN to disable, preventing impulsive bypass
              </Text>
            </View>
          </View>

          {!hasPin && (
            <View style={[styles.pinNotice, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <Feather name="alert-circle" size={16} color={colors.accentGold} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.pinNoticeText, { color: colors.accentGold }]}>
                  Security rule: You must create a 4-digit PIN before enabling protection.
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, lineHeight: 15 }}>
                  💡 Tip: Have a trusted family member or close friend set and hold this PIN for you so you cannot impulsively disable it.
                </Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: colors.accentGold }]}
              onPress={handleProceed}
              activeOpacity={0.8}
            >
              <Text style={[styles.confirmButtonText, { color: '#0f1718' }]}>
                {hasPin ? "Enable Protection" : "Set PIN and Enable"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.pill, borderColor: colors.borderSubtle }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0a1c1d',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f3f7f6',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a4a2',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  featuresList: {
    width: '100%',
    marginBottom: 16,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0f292b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    color: '#d1dedc',
    lineHeight: 18,
  },
  pinNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(226, 162, 59, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.3)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 18,
    width: '100%',
  },
  pinNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#ffd07a',
    lineHeight: 16,
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  confirmButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#041d14',
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a4a2',
  },
});
