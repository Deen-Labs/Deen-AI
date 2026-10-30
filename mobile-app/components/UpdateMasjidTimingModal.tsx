import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Masjid } from '../lib/masjid';

export interface TimingFormData {
  name?: string;
  address?: string;
  school?: 'Ahle Sunnah (Hanafi)' | 'Ahle Hadees';
  athanTimes: {
    Fajr: string;
    Dhuhr: string;
    Asr: string;
    Maghrib: string;
    Isha: string;
  };
  iqamahTimes: {
    Fajr: string;
    Dhuhr: string;
    Asr: string;
    Maghrib: string;
    Isha: string;
  };
  jummah: string;
  jummahAthan?: string;
  sunrise?: string;
  sahar?: string;
  iftar?: string;
  notes?: string;
  muazzinPasscode?: string;
}

interface UpdateMasjidTimingModalProps {
  visible: boolean;
  masjid: Masjid | null;
  mode?: 'update' | 'add';
  currentLocation?: { latitude: number; longitude: number } | null;
  onClose: () => void;
  onSubmit: (data: TimingFormData) => Promise<void>;
}

// ─── Digital LED Time Cell Component ──────────────────────────────────────────
interface DigitalTimeInputProps {
  value: string;
  onChange: (val: string) => void;
  color: string;
  shadowColor: string;
  defaultPeriod?: 'AM' | 'PM';
  allowSunset?: boolean;
  disabled?: boolean;
}

function DigitalTimeInput({
  value,
  onChange,
  color,
  shadowColor,
  defaultPeriod = 'PM',
  allowSunset = false,
  disabled = false,
}: DigitalTimeInputProps) {
  const hourRef = useRef<TextInput>(null);
  const minuteRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Parse initial value safely without defaulting to 12
  const parseTime = (str: string) => {
    if (!str || str === '--:--') {
      return { hour: '', minute: '', period: defaultPeriod, isSunset: false };
    }
    if (str.toLowerCase().includes('sunset')) {
      return { hour: '', minute: '', period: 'PM' as const, isSunset: true };
    }
    const match = str.match(/(\d{1,2})?:?(\d{1,2})?\s*(AM|PM)?/i);
    if (match) {
      return {
        hour: match[1] || '',
        minute: match[2] || '',
        period: (match[3] ? match[3].toUpperCase() : defaultPeriod) as 'AM' | 'PM',
        isSunset: false,
      };
    }
    return { hour: '', minute: '', period: defaultPeriod, isSunset: false };
  };

  const parsed = parseTime(value);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [period, setPeriod] = useState<'AM' | 'PM'>(parsed.period);
  const [isSunset, setIsSunset] = useState(parsed.isSunset);

  // Only re-sync when input is NOT actively focused by the user
  useEffect(() => {
    if (!isFocused) {
      const p = parseTime(value);
      setHour(p.hour);
      setMinute(p.minute);
      setPeriod(p.period);
      setIsSunset(p.isSunset);
    }
  }, [value, isFocused]);

  if (disabled) {
    return (
      <View style={styles.disabledDigitalBox}>
        <Text style={styles.disabledDigitalText}>--:--</Text>
      </View>
    );
  }

  // Emit changes directly without forcing "12" on backspace!
  const emit = (h: string, m: string, p: 'AM' | 'PM') => {
    if (!h && !m) {
      onChange('--:--');
      return;
    }
    onChange(`${h}:${m} ${p}`);
  };

  if (isSunset) {
    return (
      <TouchableOpacity
        style={[styles.digitalCellBox, { borderColor: color }]}
        onPress={() => {
          setIsSunset(false);
          setHour('6');
          setMinute('40');
          emit('6', '40', 'PM');
        }}
      >
        <Text style={[styles.sunsetText, { color }]}>Sunset</Text>
        <Feather name="edit-2" size={10} color={color} style={{ marginLeft: 4 }} />
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        styles.digitalCellBox,
        isFocused && { borderColor: color, backgroundColor: 'rgba(0,0,0,0.9)' },
      ]}
    >
      {/* Hour Input (Numbers Only, NO 12 GLITCH) */}
      <TextInput
        ref={hourRef}
        style={[
          styles.digitalDigitInput,
          { color, textShadowColor: shadowColor, textShadowRadius: 4 },
        ]}
        value={hour}
        keyboardType="number-pad"
        maxLength={2}
        selectTextOnFocus
        placeholder="--"
        placeholderTextColor="rgba(255,255,255,0.2)"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChangeText={(val) => {
          const clean = val.replace(/[^0-9]/g, '');
          if (clean === '') {
            setHour('');
            emit('', minute, period);
            return;
          }
          const num = parseInt(clean, 10);
          if (num > 12) {
            const last = clean.slice(-1);
            setHour(last);
            emit(last, minute, period);
            return;
          }
          setHour(clean);
          emit(clean, minute, period);

          // Auto-advance to minute when 2 digits or number >= 2 (since hours can only be 1-12)
          if (clean.length === 2 || (clean.length === 1 && num >= 2)) {
            minuteRef.current?.focus();
          }
        }}
      />

      {/* Permanently LOCKED Colon */}
      <Text
        style={[
          styles.digitalColon,
          { color, textShadowColor: shadowColor, textShadowRadius: 4 },
        ]}
      >
        :
      </Text>

      {/* Minute Input (Numbers Only) */}
      <TextInput
        ref={minuteRef}
        style={[
          styles.digitalDigitInput,
          { color, textShadowColor: shadowColor, textShadowRadius: 4 },
        ]}
        value={minute}
        keyboardType="number-pad"
        maxLength={2}
        selectTextOnFocus
        placeholder="--"
        placeholderTextColor="rgba(255,255,255,0.2)"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyPress={({ nativeEvent }) => {
          if (nativeEvent.key === 'Backspace' && (!minute || minute.length === 0)) {
            hourRef.current?.focus();
          }
        }}
        onChangeText={(val) => {
          const clean = val.replace(/[^0-9]/g, '');
          if (clean === '') {
            setMinute('');
            emit(hour, '', period);
            return;
          }
          const num = parseInt(clean, 10);
          if (num > 59) {
            const last = clean.slice(-1);
            setMinute(last);
            emit(hour, last, period);
            return;
          }
          setMinute(clean);
          emit(hour, clean, period);
        }}
      />

      {/* AM/PM Toggle Pill */}
      <TouchableOpacity
        style={styles.ampmPill}
        onPress={() => {
          const next = period === 'AM' ? 'PM' : 'AM';
          setPeriod(next);
          emit(hour, minute, next);
        }}
        activeOpacity={0.7}
      >
        <Text style={[styles.ampmText, { color }]}>{period}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Format Final Time on Submit Helper ───────────────────────────────────────
const cleanFinalTime = (val: string, fallback: string): string => {
  if (!val || val === '--:--') return '--:--';
  if (val.toLowerCase().includes('sunset')) return 'Sunset';
  const match = val.match(/(\d{1,2})?:?(\d{1,2})?\s*(AM|PM)?/i);
  if (match && (match[1] || match[2])) {
    const h = match[1] || '12';
    const m = match[2] ? match[2].padStart(2, '0') : '00';
    const p = match[3] || 'PM';
    return `${h}:${m} ${p}`;
  }
  return val.trim() || fallback;
};

// ─── Main Modal Component ─────────────────────────────────────────────────────
export default function UpdateMasjidTimingModal({
  visible,
  masjid,
  mode = 'update',
  currentLocation,
  onClose,
  onSubmit,
}: UpdateMasjidTimingModalProps) {
  const isAddMode = mode === 'add';

  // Masjid Meta
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [school, setSchool] = useState<'Ahle Sunnah (Hanafi)' | 'Ahle Hadees'>('Ahle Sunnah (Hanafi)');
  const [notes, setNotes] = useState('');
  const [muazzinPasscode, setMuazzinPasscode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Athan Times (Green)
  const [fajrAthan, setFajrAthan] = useState('5:00 AM');
  const [sunriseAthan, setSunriseAthan] = useState('6:15 AM');
  const [dhuhrAthan, setDhuhrAthan] = useState('12:45 PM');
  const [asrAthan, setAsrAthan] = useState('3:45 PM');
  const [maghribAthan, setMaghribAthan] = useState('6:35 PM');
  const [ishaAthan, setIshaAthan] = useState('8:15 PM');
  const [jummahAthan, setJummahAthan] = useState('12:45 PM');
  const [saharAthan, setSaharAthan] = useState('5:05 AM');

  // Jama'at Times (Red)
  const [fajrJamaat, setFajrJamaat] = useState('5:20 AM');
  const [dhuhrJamaat, setDhuhrJamaat] = useState('1:00 PM');
  const [asrJamaat, setAsrJamaat] = useState('4:00 PM');
  const [maghribJamaat, setMaghribJamaat] = useState('Sunset');
  const [ishaJamaat, setIshaJamaat] = useState('8:30 PM');
  const [jummahJamaat, setJummahJamaat] = useState('1:30 PM');
  const [iftarJamaat, setIftarJamaat] = useState('6:38 PM');

  useEffect(() => {
    if (visible) {
      if (isAddMode) {
        setName('');
        setAddress('');
        setSchool('Ahle Sunnah (Hanafi)');
        setNotes('');
        setMuazzinPasscode('');
        setFajrAthan('5:00 AM');
        setSunriseAthan('6:15 AM');
        setDhuhrAthan('12:45 PM');
        setAsrAthan('3:45 PM');
        setMaghribAthan('6:35 PM');
        setIshaAthan('8:15 PM');
        setJummahAthan('12:45 PM');
        setSaharAthan('5:05 AM');

        setFajrJamaat('5:20 AM');
        setDhuhrJamaat('1:00 PM');
        setAsrJamaat('4:00 PM');
        setMaghribJamaat('Sunset');
        setIshaJamaat('8:30 PM');
        setJummahJamaat('1:30 PM');
        setIftarJamaat('6:38 PM');
      } else if (masjid) {
        setName(masjid.name);
        setAddress(masjid.address || masjid.vicinity || '');
        setSchool(masjid.school || 'Ahle Sunnah (Hanafi)');
        setNotes('');
        setMuazzinPasscode('');

        setFajrAthan(masjid.athanTimes?.Fajr || '5:00 AM');
        setSunriseAthan(masjid.sunrise || '6:15 AM');
        setDhuhrAthan(masjid.athanTimes?.Dhuhr || '12:45 PM');
        setAsrAthan(masjid.athanTimes?.Asr || '3:45 PM');
        setMaghribAthan(masjid.athanTimes?.Maghrib || '6:35 PM');
        setIshaAthan(masjid.athanTimes?.Isha || '8:15 PM');
        setJummahAthan('12:45 PM');
        setSaharAthan(masjid.suhoor || '5:05 AM');

        setFajrJamaat(masjid.iqamahTimes?.Fajr || '5:20 AM');
        setDhuhrJamaat(masjid.iqamahTimes?.Dhuhr || '1:00 PM');
        setAsrJamaat(masjid.iqamahTimes?.Asr || '4:00 PM');
        setMaghribJamaat(masjid.iqamahTimes?.Maghrib || 'Sunset');
        setIshaJamaat(masjid.iqamahTimes?.Isha || '8:30 PM');
        setJummahJamaat(masjid.jummah || '1:30 PM');
        setIftarJamaat(masjid.iftar || '6:38 PM');
      }
    }
  }, [masjid, visible, isAddMode]);

  if (!visible) return null;

  const handleSave = async () => {
    if (isAddMode) {
      if (!name.trim()) {
        Alert.alert('Required Field', 'Please enter the Masjid name.');
        return;
      }
      if (!address.trim()) {
        Alert.alert('Required Field', 'Please enter the locality or neighborhood.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        address: address.trim(),
        school,
        athanTimes: {
          Fajr: cleanFinalTime(fajrAthan, '5:00 AM'),
          Dhuhr: cleanFinalTime(dhuhrAthan, '12:45 PM'),
          Asr: cleanFinalTime(asrAthan, '3:45 PM'),
          Maghrib: cleanFinalTime(maghribAthan, '6:35 PM'),
          Isha: cleanFinalTime(ishaAthan, '8:15 PM'),
        },
        iqamahTimes: {
          Fajr: cleanFinalTime(fajrJamaat, '5:20 AM'),
          Dhuhr: cleanFinalTime(dhuhrJamaat, '1:00 PM'),
          Asr: cleanFinalTime(asrJamaat, '4:00 PM'),
          Maghrib: cleanFinalTime(maghribJamaat, 'Sunset'),
          Isha: cleanFinalTime(ishaJamaat, '8:30 PM'),
        },
        jummah: cleanFinalTime(jummahJamaat, '1:30 PM'),
        jummahAthan: cleanFinalTime(jummahAthan, '12:45 PM'),
        sunrise: cleanFinalTime(sunriseAthan, '6:15 AM'),
        sahar: cleanFinalTime(saharAthan, '5:05 AM'),
        iftar: cleanFinalTime(iftarJamaat, '6:38 PM'),
        notes: notes.trim(),
        muazzinPasscode: muazzinPasscode.trim(),
      });
      onClose();
    } catch (err) {
      console.error('[UpdateMasjidTimingModal] Error saving masjid timings:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop touchable to dismiss without blocking card gestures */}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <View style={styles.modalCard}>
            {/* Top Handle */}
            <View style={styles.handleBar} />

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View style={styles.iconBadge}>
                  <Feather name={isAddMode ? 'plus-circle' : 'clock'} size={18} color="#e2a23b" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={1}>
                    {isAddMode ? 'Add Missing Masjid' : 'Edit Masjid Timing Board'}
                  </Text>
                  <Text style={styles.masjidName} numberOfLines={1}>
                    {isAddMode ? "Add masjid & set Jama'at board" : masjid?.name}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
                  style={styles.closeBtn}
                >
                  <Feather name="x" size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {!isAddMode && (
                <Text style={styles.addressText} numberOfLines={1}>
                  {masjid?.address || masjid?.vicinity || 'Hyderabad'}
                </Text>
              )}
            </View>

            {/* Scrollable Form Content (Completely Unblocked) */}
            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formContainer}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              {/* Add Mode Meta Inputs */}
              {isAddMode && (
                <View style={styles.addDetailsSection}>
                  <Text style={styles.sectionLabel}>MASJID INFORMATION</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Masjid Name *</Text>
                    <TextInput
                      style={styles.metaTextInput}
                      value={name}
                      onChangeText={setName}
                      placeholder="e.g. Masjid-e-Bilal"
                      placeholderTextColor="#64748b"
                      returnKeyType="next"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Area / Locality *</Text>
                    <TextInput
                      style={styles.metaTextInput}
                      value={address}
                      onChangeText={setAddress}
                      placeholder="e.g. Paramount Colony, Tolichowki, Hyderabad"
                      placeholderTextColor="#64748b"
                      returnKeyType="next"
                    />
                  </View>

                  <Text style={[styles.inputLabel, { marginTop: 4 }]}>School of Thought</Text>
                  <View style={styles.schoolPillRow}>
                    <TouchableOpacity
                      style={[
                        styles.schoolPill,
                        school === 'Ahle Sunnah (Hanafi)' && styles.schoolPillActive,
                      ]}
                      onPress={() => setSchool('Ahle Sunnah (Hanafi)')}
                    >
                      <Text
                        style={[
                          styles.schoolPillText,
                          school === 'Ahle Sunnah (Hanafi)' && styles.schoolPillTextActive,
                        ]}
                      >
                        Ahle Sunnah (Hanafi)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.schoolPill,
                        school === 'Ahle Hadees' && styles.schoolPillActive,
                      ]}
                      onPress={() => setSchool('Ahle Hadees')}
                    >
                      <Text
                        style={[
                          styles.schoolPillText,
                          school === 'Ahle Hadees' && styles.schoolPillTextActive,
                        ]}
                      >
                        Ahle Hadees
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {currentLocation && (
                    <View style={styles.gpsBadge}>
                      <Feather name="navigation" size={11} color="#e2a23b" style={{ marginRight: 5 }} />
                      <Text style={styles.gpsBadgeText}>
                        GPS Location Auto-Tagged: {currentLocation.latitude.toFixed(4)},{' '}
                        {currentLocation.longitude.toFixed(4)}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* ─── EXACT DIGITAL LED TIMING BOARD UI ─── */}
              <View style={styles.ledBoardWrapper}>
                <View style={styles.ledBoard}>
                  {/* Calligraphy Header Banner */}
                  <View style={styles.ledBanner}>
                    <Text style={styles.ledCalligraphy}>لَا إِلٰهَ إِلَّا ٱللَّٰهُ مُحَمَّدٌ رَسُولُ ٱللَّٰهِ</Text>
                  </View>

                  {/* Column Headers */}
                  <View style={styles.ledRowHeader}>
                    <Text style={[styles.ledHeaderCell, { flex: 1.1, textAlign: 'left' }]}>PRAYER</Text>
                    <Text
                      style={[
                        styles.ledHeaderCell,
                        { color: '#00ff66', textShadowColor: 'rgba(0, 255, 102, 0.5)', flex: 1.45 },
                      ]}
                    >
                      ATHAN
                    </Text>
                    <Text
                      style={[
                        styles.ledHeaderCell,
                        { color: '#ff2a2a', textShadowColor: 'rgba(255, 42, 42, 0.5)', flex: 1.45 },
                      ]}
                    >
                      JAMA'AT
                    </Text>
                  </View>

                  {/* 1. FAJR */}
                  <View style={styles.ledRow}>
                    <View style={styles.ledLabelCol}>
                      <Text style={styles.ledArabicLabel}>فجر</Text>
                      <Text style={styles.ledEnglishLabel}>FAJR</Text>
                    </View>
                    <View style={styles.ledInputCol}>
                      <DigitalTimeInput
                        value={fajrAthan}
                        onChange={setFajrAthan}
                        color="#00ff66"
                        shadowColor="rgba(0, 255, 102, 0.5)"
                        defaultPeriod="AM"
                      />
                    </View>
                    <View style={styles.ledInputCol}>
                      <DigitalTimeInput
                        value={fajrJamaat}
                        onChange={setFajrJamaat}
                        color="#ff2a2a"
                        shadowColor="rgba(255, 42, 42, 0.5)"
                        defaultPeriod="AM"
                      />
                    </View>
                  </View>

                  {/* 2. SUNRISE */}
                  <View style={styles.ledRow}>
                    <View style={styles.ledLabelCol}>
                      <Text style={styles.ledArabicLabel}>طلوع</Text>
                      <Text style={styles.ledEnglishLabel}>SUNRISE</Text>
                    </View>
                    <View style={styles.ledInputCol}>
                      <DigitalTimeInput
                        value={sunriseAthan}
                        onChange={setSunriseAthan}
                        color="#00ff66"
                        shadowColor="rgba(0, 255, 102, 0.5)"
                        defaultPeriod="AM"
                      />
                    </View>
                    <View style={styles.ledInputCol}>
                      <DigitalTimeInput
                        value="--:--"
                        onChange={() => {}}
                        color="#ff2a2a"
                        shadowColor="transparent"
                        disabled
                      />
                    </View>
                  </View>

                  {/* 3. DHUHR */}
                  <View style={styles.ledRow}>
                    <View style={styles.ledLabelCol}>
                      <Text style={styles.ledArabicLabel}>ظهر</Text>
                      <Text style={styles.ledEnglishLabel}>DHUHR</Text>
                    </View>
                    <View style={styles.ledInputCol}>
                      <DigitalTimeInput
                        value={dhuhrAthan}
                        onChange={setDhuhrAthan}
                        color="#00ff66"
                        shadowColor="rgba(0, 255, 102, 0.5)"
                        defaultPeriod="PM"
                      />
                    </View>
                    <View style={styles.ledInputCol}>
                      <DigitalTimeInput
                        value={dhuhrJamaat}
                        onChange={setDhuhrJamaat}
                        color="#ff2a2a"
                        shadowColor="rgba(255, 42, 42, 0.5)"
                        defaultPeriod="PM"
                      />
                    </View>
                  </View>

                  {/* 4. ASR */}
                  <View style={styles.ledRow}>
                    <View style={styles.ledLabelCol}>
                      <Text style={styles.ledArabicLabel}>عصر</Text>
                      <Text style={styles.ledEnglishLabel}>ASR</Text>
                    </View>
                    <View style={styles.ledInputCol}>
                      <DigitalTimeInput
                        value={asrAthan}
                        onChange={setAsrAthan}
                        color="#00ff66"
                        shadowColor="rgba(0, 255, 102, 0.5)"
                        defaultPeriod="PM"
                      />
                    </View>
                    <View style={styles.ledInputCol}>
                      <DigitalTimeInput
                        value={asrJamaat}
                        onChange={setAsrJamaat}
                        color="#ff2a2a"
                        shadowColor="rgba(255, 42, 42, 0.5)"
                        defaultPeriod="PM"
                      />
                    </View>
                  </View>

                  {/* 5. MAGHRIB */}
                  <View style={styles.ledRow}>
                    <View style={styles.ledLabelCol}>
                      <Text style={styles.ledArabicLabel}>مغرب</Text>
                      <Text style={styles.ledEnglishLabel}>MAGHRIB</Text>
                    </View>
                    <View style={styles.ledInputCol}>
                      <DigitalTimeInput
                        value={maghribAthan}
                        onChange={setMaghribAthan}
                        color="#00ff66"
                        shadowColor="rgba(0, 255, 102, 0.5)"
                        defaultPeriod="PM"
                      />
                    </View>
                    <View style={styles.ledInputCol}>
                      <DigitalTimeInput
                        value={maghribJamaat}
                        onChange={setMaghribJamaat}
                        color="#ff2a2a"
                        shadowColor="rgba(255, 42, 42, 0.5)"
                        defaultPeriod="PM"
                        allowSunset
                      />
                    </View>
                  </View>

                  {/* 6. ISHA */}
                  <View style={styles.ledRow}>
                    <View style={styles.ledLabelCol}>
                      <Text style={styles.ledArabicLabel}>عشاء</Text>
                      <Text style={styles.ledEnglishLabel}>ISHA</Text>
                    </View>
                    <View style={styles.ledInputCol}>
                      <DigitalTimeInput
                        value={ishaAthan}
                        onChange={setIshaAthan}
                        color="#00ff66"
                        shadowColor="rgba(0, 255, 102, 0.5)"
                        defaultPeriod="PM"
                      />
                    </View>
                    <View style={styles.ledInputCol}>
                      <DigitalTimeInput
                        value={ishaJamaat}
                        onChange={setIshaJamaat}
                        color="#ff2a2a"
                        shadowColor="rgba(255, 42, 42, 0.5)"
                        defaultPeriod="PM"
                      />
                    </View>
                  </View>

                  {/* Divider */}
                  <View style={styles.ledBoardDivider} />

                  {/* 7. JUMMAH */}
                  <View style={styles.ledRow}>
                    <View style={styles.ledLabelCol}>
                      <Text style={styles.ledArabicLabel}>جمعة</Text>
                      <Text style={styles.ledEnglishLabel}>JUMMAH</Text>
                    </View>
                    <View style={styles.ledInputCol}>
                      <DigitalTimeInput
                        value={jummahAthan}
                        onChange={setJummahAthan}
                        color="#00ff66"
                        shadowColor="rgba(0, 255, 102, 0.5)"
                        defaultPeriod="PM"
                      />
                    </View>
                    <View style={styles.ledInputCol}>
                      <DigitalTimeInput
                        value={jummahJamaat}
                        onChange={setJummahJamaat}
                        color="#ff2a2a"
                        shadowColor="rgba(255, 42, 42, 0.5)"
                        defaultPeriod="PM"
                      />
                    </View>
                  </View>

                  {/* 8. SAHAR */}
                  <View style={styles.ledRow}>
                    <View style={styles.ledLabelCol}>
                      <Text style={styles.ledArabicLabel}>سحر</Text>
                      <Text style={styles.ledEnglishLabel}>SAHAR</Text>
                    </View>
                    <View style={styles.ledInputCol}>
                      <DigitalTimeInput
                        value={saharAthan}
                        onChange={setSaharAthan}
                        color="#00ff66"
                        shadowColor="rgba(0, 255, 102, 0.5)"
                        defaultPeriod="AM"
                      />
                    </View>
                    <View style={styles.ledInputCol}>
                      <DigitalTimeInput
                        value="--:--"
                        onChange={() => {}}
                        color="#ff2a2a"
                        shadowColor="transparent"
                        disabled
                      />
                    </View>
                  </View>

                  {/* 9. IFTAR */}
                  <View style={styles.ledRow}>
                    <View style={styles.ledLabelCol}>
                      <Text style={styles.ledArabicLabel}>افطار</Text>
                      <Text style={styles.ledEnglishLabel}>IFTAR</Text>
                    </View>
                    <View style={styles.ledInputCol}>
                      <DigitalTimeInput
                        value="--:--"
                        onChange={() => {}}
                        color="#00ff66"
                        shadowColor="transparent"
                        disabled
                      />
                    </View>
                    <View style={styles.ledInputCol}>
                      <DigitalTimeInput
                        value={iftarJamaat}
                        onChange={setIftarJamaat}
                        color="#ff2a2a"
                        shadowColor="rgba(255, 42, 42, 0.5)"
                        defaultPeriod="PM"
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Official Muazzin / Committee Access Section */}
              <View style={styles.muazzinSection}>
                <View style={styles.muazzinHeaderRow}>
                  <View style={styles.muazzinShieldIcon}>
                    <Feather name="shield" size={14} color="#f59e0b" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.muazzinTitle}>MUAZZIN / COMMITTEE ACCESS (OPTIONAL)</Text>
                    <Text style={styles.muazzinSubtitle}>
                      Official Muazzins: enter your 4-digit passcode to grant official verified status.
                    </Text>
                  </View>
                </View>

                <View style={styles.muazzinInputRow}>
                  <Feather name="lock" size={14} color="#f59e0b" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.muazzinTextInput}
                    value={muazzinPasscode}
                    onChangeText={setMuazzinPasscode}
                    placeholder="Enter 4-digit code (e.g. 7860)"
                    placeholderTextColor="#64748b"
                    keyboardType="number-pad"
                    maxLength={8}
                    secureTextEntry={true}
                  />
                  {muazzinPasscode.trim().length >= 4 && (
                    <View style={styles.muazzinStatusPill}>
                      <Feather name="check" size={12} color="#10b981" />
                      <Text style={styles.muazzinStatusPillText}>Code Entered</Text>
                    </View>
                  )}
                </View>

                {muazzinPasscode.trim().length >= 4 && (
                  <View style={styles.muazzinVerifiedPreview}>
                    <Feather name="award" size={12} color="#f59e0b" style={{ marginRight: 5 }} />
                    <Text style={styles.muazzinVerifiedPreviewText}>
                      Will publish as "Verified by Muazzin 🕌"
                    </Text>
                  </View>
                )}
              </View>

              {/* Optional Notes */}
              <Text style={[styles.sectionLabel, { marginTop: 14 }]}>OPTIONAL NOTES / NOTICE</Text>
              <TextInput
                style={[styles.metaTextInput, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. 2nd Jummah at 2:00 PM, Taraweeh timings"
                placeholderTextColor="#64748b"
                multiline
                numberOfLines={2}
              />
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                onPress={handleSave}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#0f172a" />
                ) : (
                  <>
                    <Feather
                      name={isAddMode ? 'plus' : 'check'}
                      size={16}
                      color="#0f172a"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.submitBtnText}>
                      {isAddMode ? 'Add Masjid & Board' : 'Save Timings'}
                    </Text>
                  </>
                )}
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
    backgroundColor: '#0c0f17',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    paddingHorizontal: 16,
    maxHeight: '90%',
  },
  handleBar: {
    width: 44,
    height: 4,
    backgroundColor: '#475569',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  header: {
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(226, 162, 59, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.3)',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  masjidName: {
    fontSize: 13,
    color: '#e2a23b',
    fontWeight: '600',
  },
  closeBtn: {
    padding: 6,
  },
  addressText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  formScroll: {
    flexGrow: 0,
  },
  formContainer: {
    paddingBottom: 28,
  },
  addDetailsSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '600',
    marginBottom: 4,
  },
  metaTextInput: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  notesInput: {
    height: 52,
    textAlignVertical: 'top',
    fontSize: 12,
    fontWeight: '400',
  },
  schoolPillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  schoolPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  schoolPillActive: {
    backgroundColor: 'rgba(226, 162, 59, 0.18)',
    borderColor: '#e2a23b',
  },
  schoolPillText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  schoolPillTextActive: {
    color: '#e2a23b',
    fontWeight: '700',
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226, 162, 59, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 2,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.2)',
  },
  gpsBadgeText: {
    fontSize: 10,
    color: '#fde68a',
    fontWeight: '600',
  },

  // ─── EXACT DIGITAL BOARD STYLES ───
  ledBoardWrapper: {
    marginTop: 4,
  },
  ledBoard: {
    backgroundColor: '#080808',
    borderColor: '#4a3321',
    borderWidth: 3,
    borderRadius: 14,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  ledBanner: {
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderColor: '#1a1a1a',
    paddingBottom: 6,
  },
  ledCalligraphy: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e2a23b',
    textShadowColor: 'rgba(226, 162, 59, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
    textAlign: 'center',
  },
  ledRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderColor: '#1f1f1f',
  },
  ledHeaderCell: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a4a2',
    textAlign: 'center',
  },
  ledRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderColor: '#121212',
  },
  ledLabelCol: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ledArabicLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#e2a23b',
    width: 36,
    textAlign: 'left',
    textShadowColor: 'rgba(226, 162, 59, 0.4)',
    textShadowRadius: 4,
  },
  ledEnglishLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#e2a23b',
    textShadowColor: 'rgba(226, 162, 59, 0.4)',
    textShadowRadius: 4,
  },
  ledInputCol: {
    flex: 1.45,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  ledBoardDivider: {
    height: 1.5,
    backgroundColor: '#1f1f1f',
    marginVertical: 6,
  },

  // ─── DIGITAL INPUT CELL ───
  digitalCellBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#030303',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minHeight: 30,
    width: '96%',
  },
  digitalDigitInput: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
    width: 20,
    padding: 0,
    margin: 0,
  },
  digitalColon: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginHorizontal: 1,
  },
  ampmPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 3,
  },
  ampmText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  sunsetText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  disabledDigitalBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  disabledDigitalText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#242829',
  },

  // Muazzin Section
  muazzinSection: {
    marginTop: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 12,
    padding: 12,
  },
  muazzinHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  muazzinShieldIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  muazzinTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fbbf24',
    letterSpacing: 0.8,
  },
  muazzinSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  muazzinInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  muazzinTextInput: {
    flex: 1,
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
    padding: 0,
  },
  muazzinStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  muazzinStatusPillText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 3,
  },
  muazzinVerifiedPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingLeft: 2,
  },
  muazzinVerifiedPreviewText: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '600',
  },

  // Action Buttons
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cancelBtnText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#e2a23b',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#e2a23b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
});
