import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Vibration,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { useResponsiveLayout } from '../../lib/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TASBIH_HISTORY_KEY = '@deen_tasbih_history_v1';

interface TasbihSession {
  id: string;
  count: number;
  target: number | 'Unlimited';
  durationSeconds: number;
  timestamp: string;
}

const PRESET_TARGETS: (number | 'Unlimited')[] = [33, 99, 100, 1000, 'Unlimited'];

export default function TasbihScreen() {
  const { colors, isDark } = useTheme();
  const { contentContainerStyle } = useResponsiveLayout();
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState<number | 'Unlimited'>(33);
  const [history, setHistory] = useState<TasbihSession[]>([]);

  // Stopwatch state
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadHistory();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimerIfNeeded = () => {
    if (!isRunning) {
      setIsRunning(true);
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
  };

  const loadHistory = async () => {
    try {
      const raw = await AsyncStorage.getItem(TASBIH_HISTORY_KEY);
      if (raw) {
        setHistory(JSON.parse(raw));
      }
    } catch (err) {
      console.warn('Error loading tasbih history:', err);
    }
  };

  const handleTap = () => {
    startTimerIfNeeded();
    const nextCount = count + 1;
    setCount(nextCount);

    if (typeof target === 'number' && nextCount === target) {
      // Completed target!
      try {
        Vibration.vibrate([0, 80, 50, 80, 50, 100]);
      } catch {}
      Alert.alert(
        'Alhamdulillah!',
        `You have completed your target of ${target} Dhikr!`,
        [
          { text: 'Keep Going', style: 'default' },
          { text: 'Finish Session', style: 'cancel', onPress: handleFinishSession },
        ]
      );
    } else {
      try {
        Vibration.vibrate(20);
      } catch {}
    }
  };

  const handleCorrection = () => {
    if (count > 0) {
      setCount((c) => c - 1);
      try {
        Vibration.vibrate(15);
      } catch {}
    }
  };

  const handleReset = () => {
    Alert.alert('Reset Counter', 'Reset count and stopwatch back to 0?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          setCount(0);
          setSeconds(0);
          setIsRunning(false);
          if (timerRef.current) clearInterval(timerRef.current);
        },
      },
    ]);
  };

  const handleFinishSession = async () => {
    if (count === 0) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(false);

    const newSession: TasbihSession = {
      id: `session-${Date.now()}`,
      count,
      target,
      durationSeconds: seconds,
      timestamp: new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const updated = [newSession, ...history].slice(0, 30);
    setHistory(updated);
    await AsyncStorage.setItem(TASBIH_HISTORY_KEY, JSON.stringify(updated));

    Alert.alert(
      'Session Saved',
      `Saved ${count} Dhikr (${formatStopwatch(seconds)} elapsed). May Allah accept your remembrance!`
    );
    setCount(0);
    setSeconds(0);
  };

  const formatStopwatch = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h.toString().padStart(2, '0')}:${m
      .toString()
      .padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent =
    typeof target === 'number' && target > 0
      ? Math.min(100, Math.round((count / target) * 100))
      : 100;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={[styles.scrollContent, contentContainerStyle]}>
        {/* Stopwatch & Target Header */}
        <View style={[styles.topInfoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoCol}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>ELAPSED TIME</Text>
            <Text style={[styles.stopwatchText, { color: colors.text }]}>{formatStopwatch(seconds)}</Text>
          </View>

          <View style={[styles.infoDivider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.infoCol}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>TARGET GOAL</Text>
            <Text style={[styles.targetGoalText, { color: colors.accentGold }]}>{target}</Text>
          </View>

          <View style={[styles.infoDivider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.infoCol}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>PROGRESS</Text>
            <Text style={[styles.progressPercentText, { color: colors.accentGreen }]}>{progressPercent}%</Text>
          </View>
        </View>

        {/* Target Selector Bar */}
        <View style={styles.targetBar}>
          <Text style={[styles.targetBarLabel, { color: colors.textSecondary }]}>Target:</Text>
          <View style={styles.targetPillGroup}>
            {PRESET_TARGETS.map((t) => {
              const isSelected = target === t;
              return (
                <TouchableOpacity
                  key={String(t)}
                  style={[
                    styles.targetPill,
                    { backgroundColor: colors.pill, borderColor: colors.borderSubtle },
                    isSelected && { backgroundColor: colors.accentGoldBg, borderColor: colors.accentGold }
                  ]}
                  onPress={() => setTarget(t)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.targetPillText,
                      { color: colors.textMuted },
                      isSelected && { color: '#0f1718', fontWeight: '700' }
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Large Ergonomic Emerald-Gold Tap Counter */}
        <View style={styles.tapAreaContainer}>
          <TouchableOpacity
            style={[styles.bigTapButton, { backgroundColor: colors.card, borderColor: colors.accentGold }]}
            onPress={handleTap}
            activeOpacity={0.85}
          >
            <View style={[styles.innerRing, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.countNumber, { color: colors.text }]}>{count}</Text>
              <Text style={[styles.tapPromptText, { color: colors.accentGold }]}>TAP TO COUNT</Text>
              {typeof target === 'number' && (
                <Text style={[styles.countSubtext, { color: colors.textMuted }]}>Goal: {target}</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Counter Action Controls */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.secondaryActionBtn, { backgroundColor: colors.pill, borderColor: colors.border }]}
            onPress={handleCorrection}
            activeOpacity={0.7}
          >
            <Feather name="minus" size={16} color={colors.accentGold} style={{ marginRight: 4 }} />
            <Text style={[styles.secondaryActionBtnText, { color: colors.accentGold }]}>-1 (Correction)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryActionBtn, { backgroundColor: colors.pill, borderColor: colors.border }]}
            onPress={handleReset}
            activeOpacity={0.7}
          >
            <Feather name="rotate-ccw" size={16} color={colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={[styles.secondaryActionBtnText, { color: colors.textMuted }]}>Reset</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.finishSessionBtn, { backgroundColor: colors.accentGold }]}
          onPress={handleFinishSession}
          activeOpacity={0.8}
        >
          <Feather name="check" size={16} color="#0f1718" style={{ marginRight: 6 }} />
          <Text style={[styles.finishSessionBtnText, { color: '#0f1718' }]}>Finish & Save Session</Text>
        </TouchableOpacity>

        {/* Recent Sessions History */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Feather name="clock" size={14} color={colors.accentGold} style={{ marginRight: 6 }} />
            <Text style={[styles.historyTitle, { color: colors.text }]}>Recent Tasbih Sessions</Text>
          </View>

          {history.length === 0 ? (
            <Text style={[styles.historyEmptyText, { color: colors.textMuted }]}>No saved sessions yet. Start tapping!</Text>
          ) : (
            history.slice(0, 5).map((sess) => (
              <View key={sess.id} style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View>
                  <Text style={[styles.historyCountText, { color: colors.text }]}>{sess.count} Dhikr</Text>
                  <Text style={[styles.historyDateText, { color: colors.textMuted }]}>{sess.timestamp}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.historyDurationText, { color: colors.accentGold }]}>
                    {formatStopwatch(sess.durationSeconds)}
                  </Text>
                  <Text style={[styles.historyTargetBadge, { backgroundColor: colors.pill, color: colors.textMuted }]}>Target: {sess.target}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1718',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  topInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#0b2527',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#0b383b',
    alignItems: 'center',
    marginBottom: 14,
  },
  infoCol: {
    flex: 1,
    alignItems: 'center',
  },
  infoDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#1b4a4d',
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a4a2',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  stopwatchText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#00ff66',
  },
  targetGoalText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffdda8',
  },
  progressPercentText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#e2a23b',
  },
  targetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  targetBarLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffdda8',
  },
  targetPillGroup: {
    flexDirection: 'row',
    backgroundColor: '#0c3033',
    borderRadius: 8,
    padding: 2,
    gap: 4,
  },
  targetPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  targetPillActive: {
    backgroundColor: '#e2a23b',
  },
  targetPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a4a2',
    textAlign: "center",
    includeFontPadding: false,
  },
  targetPillTextActive: {
    color: '#0f1718',
  },
  tapAreaContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  bigTapButton: {
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#0b2527',
    borderWidth: 5,
    borderColor: '#e2a23b',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e2a23b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  innerRing: {
    width: 196,
    height: 196,
    borderRadius: 98,
    backgroundColor: '#0c3033',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countNumber: {
    fontSize: 52,
    fontWeight: '900',
    color: '#00ff66',
    letterSpacing: 1,
  },
  tapPromptText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffdda8',
    letterSpacing: 1,
    marginTop: 4,
  },
  countSubtext: {
    fontSize: 11,
    color: '#94a4a2',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0c3033',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  secondaryActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffdda8',
  },
  finishSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2a23b',
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  finishSessionBtnText: {
    color: '#0f1718',
    fontSize: 13,
    fontWeight: '800',
  },
  historySection: {
    backgroundColor: '#0b2527',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 6,
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffdda8',
  },
  historyEmptyText: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  historyCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00ff66',
  },
  historyDateText: {
    fontSize: 10,
    color: '#94a4a2',
  },
  historyDurationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffdda8',
  },
  historyTargetBadge: {
    fontSize: 9,
    color: '#64748b',
  },
});
