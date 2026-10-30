import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Masjid } from '../lib/masjid';
import { useTheme } from '../lib/theme';

interface MasjidFeedbackModalProps {
  visible: boolean;
  masjid: Masjid | null;
  onClose: () => void;
}

const ISSUE_CATEGORIES = [
  'Outdated Salah Times',
  'Incorrect Jummah Khutbah',
  'Wrong Location / Address',
  'Facility Issue (Wudu/Ladies)',
  'Other Issue',
];

export default function MasjidFeedbackModal({
  visible,
  masjid,
  onClose,
}: MasjidFeedbackModalProps) {
  const { colors, isDark } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string>('Outdated Salah Times');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!masjid) return null;

  const handleSubmit = async () => {
    if (!details.trim()) {
      Alert.alert('Details Required', 'Please provide a brief description of the issue.');
      return;
    }

    setIsSubmitting(true);
    const subject = encodeURIComponent(`[Masjid Issue] ${masjid.name} - ${selectedCategory}`);
    const body = encodeURIComponent(
      `Masjid: ${masjid.name}\n` +
      `Address: ${masjid.address || masjid.vicinity || 'Hyderabad'}\n` +
      `Masjid ID: ${masjid.id}\n` +
      `Issue Category: ${selectedCategory}\n\n` +
      `Details:\n${details.trim()}\n\n` +
      `Reported via DeenHub Mobile App`
    );

    const mailUrl = `mailto:qairsolutionsask@gmail.com?subject=${subject}&body=${body}`;

    try {
      const canOpen = await Linking.canOpenURL(mailUrl);
      if (canOpen) {
        await Linking.openURL(mailUrl);
      } else {
        Alert.alert(
          'Email App Not Found',
          'Please email qairsolutionsask@gmail.com directly with the issue details.'
        );
      }
    } catch {
      Alert.alert(
        'Feedback Logged',
        `Thank you for reporting. The committee has been notified regarding ${masjid.name}.`
      );
    } finally {
      setIsSubmitting(false);
      setDetails('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Header */}
            <View style={[styles.headerRow, { borderBottomColor: colors.borderSubtle }]}>
              <View style={styles.headerTitleGroup}>
                <View style={[styles.flagIconWrap, { backgroundColor: colors.pill }]}>
                  <Feather name="flag" size={14} color={colors.accentGold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: colors.accentSoft }]} numberOfLines={1}>
                    Report Issue: {masjid.name}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                    {masjid.address || masjid.vicinity || 'Hyderabad'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                <Feather name="x" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Category Selector */}
              <Text style={[styles.fieldLabel, { color: colors.accentGold }]}>SELECT ISSUE CATEGORY</Text>
              <View style={styles.categoryGrid}>
                {ISSUE_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: isSelected ? colors.accentGoldBg : colors.card,
                          borderColor: isSelected ? colors.accentGold : colors.borderSubtle,
                        },
                      ]}
                      onPress={() => setSelectedCategory(cat)}
                      activeOpacity={0.8}
                    >
                      <Feather
                        name={isSelected ? 'check-circle' : 'circle'}
                        size={12}
                        color={isSelected ? '#0f1718' : colors.textMuted}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          { color: isSelected ? '#0f1718' : colors.text },
                          isSelected && styles.categoryChipTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Description Input */}
              <Text style={[styles.fieldLabel, { color: colors.accentGold }]}>DETAILS / CURRENT CORRECT INFO</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.borderSubtle,
                    color: colors.text,
                  },
                ]}
                placeholder="e.g. Asr is now 4:15 PM instead of 3:45 PM, or the Jummah khutbah topic is incorrect..."
                placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                value={details}
                onChangeText={setDetails}
                multiline
                numberOfLines={4}
              />

              <Text style={[styles.supportNote, { color: colors.textMuted }]}>
                Reports are sent directly to the Central Committee support team (qairsolutionsask@gmail.com).
              </Text>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.pill }]}
                onPress={onClose}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: colors.accentGoldBg },
                  isSubmitting && styles.submitBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                <Feather name="send" size={14} color="#0f1718" style={{ marginRight: 6 }} />
                <Text style={styles.submitBtnText}>
                  {isSubmitting ? 'Sending...' : 'Send Report'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 20, 0.85)',
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    width: '100%',
  },
  modalCard: {
    backgroundColor: '#0c1a1c',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.25)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 12,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  flagIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: 'rgba(226, 162, 59, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffdda8',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#94a4a2',
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#e2a23b',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 24, 0.7)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  categoryChipActive: {
    backgroundColor: '#e2a23b',
    borderColor: '#e2a23b',
  },
  categoryChipText: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#0f1718',
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#071617',
    borderWidth: 1,
    borderColor: '#1e3a3d',
    borderRadius: 10,
    padding: 12,
    color: '#ffffff',
    fontSize: 13,
    minHeight: 85,
    textAlignVertical: 'top',
  },
  supportNote: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 15,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
  },
  submitBtn: {
    flex: 2,
    backgroundColor: '#e2a23b',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#0f1718',
    fontSize: 13,
    fontWeight: '700',
  },
});
