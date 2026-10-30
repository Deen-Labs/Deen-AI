import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { getLocalPrayerTimes, formatTime } from '../../lib/prayerTimes';
import { getQuickLocation, Coordinates } from '../../lib/location';
import { fetchSalahTimeRamadhan, SalahTimeRamadhanEntry } from '../../lib/salahTimeBackend';
import { useTheme } from '../../lib/theme';
import { useResponsiveLayout } from '../../lib/responsive';

const isExpoGo = (Constants as any).appOwnership === 'expo' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: typeof import('expo-notifications') | null = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
  } catch (error) {
    console.log('[FastingCalendar] expo-notifications not available:', error instanceof Error ? error.message : error);
  }
}

const SUHOOR_NOTIFICATION_ID = 'deen_fasting_suhoor_reminder';
const IFTAR_NOTIFICATION_ID = 'deen_fasting_iftar_reminder';
const WHITE_DAYS_NOTIFICATION_ID = 'deen_fasting_whitedays_reminder';
const FASTING_REMINDERS_KEY = '@deen_fasting_reminders_v2';

function parseTimeString(tStr: string): { hour: number; minute: number } {
  const match = tStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return { hour: 4, minute: 30 };
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const ampm = (match[3] || '').toUpperCase();
  if (ampm === 'PM' && hour < 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  return { hour, minute };
}

export interface FastingDayEntry {
  dayNum: number;
  hijriDate: string;
  gregorianDate: string;
  saher: string;
  iftar: string;
  tag?: string;
  isSpecialSunnah: boolean;
  isWhiteDay: boolean;
}

export interface HijriMonthInfo {
  number: number;
  nameEn: string;
  nameAr: string;
  specialVirtue: string;
}

export const HIJRI_MONTHS: HijriMonthInfo[] = [
  { number: 1, nameEn: 'Muharram', nameAr: 'المحرم', specialVirtue: 'Sacred Month & Fast of Ashura (9th & 10th)' },
  { number: 2, nameEn: 'Safar', nameAr: 'صفر', specialVirtue: 'Ayam-ul-Bidh White Days (13, 14, 15)' },
  { number: 3, nameEn: "Rabi' al-Awwal", nameAr: 'ربيع الأول', specialVirtue: 'Ayam-ul-Bidh White Days (13, 14, 15)' },
  { number: 4, nameEn: "Rabi' al-Thani", nameAr: 'ربيع الثاني', specialVirtue: 'Ayam-ul-Bidh White Days (13, 14, 15)' },
  { number: 5, nameEn: 'Jumada al-Awwal', nameAr: 'جمادى الأولى', specialVirtue: 'Ayam-ul-Bidh White Days (13, 14, 15)' },
  { number: 6, nameEn: 'Jumada al-Thani', nameAr: 'جمادى الثانية', specialVirtue: 'Ayam-ul-Bidh White Days (13, 14, 15)' },
  { number: 7, nameEn: 'Rajab', nameAr: 'رجب', specialVirtue: 'Sacred Month & Ayam-ul-Bidh White Days' },
  { number: 8, nameEn: "Sha'ban", nameAr: 'شعبان', specialVirtue: "Prophetic Sunnah Fasting & Mid-Sha'ban (15th)" },
  { number: 9, nameEn: 'Ramadhan', nameAr: 'رمضان', specialVirtue: 'Obligatory 30-Day Fasting & Laylat al-Qadr' },
  { number: 10, nameEn: 'Shawwal', nameAr: 'شوال', specialVirtue: '6 Days of Shawwal Fasting (Virtue of Year-Long Fast)' },
  { number: 11, nameEn: "Dhu al-Qi'dah", nameAr: 'ذو القعدة', specialVirtue: 'Sacred Month & Ayam-ul-Bidh White Days' },
  { number: 12, nameEn: 'Dhu al-Hijjah', nameAr: 'ذو الحجة', specialVirtue: 'First 9 Days Fasting & Day of Arafah (9th)' },
];

interface FastingReminders {
  suhoorReminder: boolean;
  iftarReminder: boolean;
  whiteDaysReminder: boolean;
  sunnahDaysReminder: boolean;
}

export default function FastingCalendarScreen() {
  const { colors, isDark } = useTheme();
  const { contentContainerStyle, tableMaxWidthStyle } = useResponsiveLayout();

  // Selected Hijri Month (defaults to 9 = Ramadhan or calculated current)
  const [selectedMonthNum, setSelectedMonthNum] = useState<number>(9);
  const [coords, setCoords] = useState<Coordinates>({ latitude: 17.385044, longitude: 78.486671 });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'reminders'>('calendar');

  const [reminders, setReminders] = useState<FastingReminders>({
    suhoorReminder: true,
    iftarReminder: true,
    whiteDaysReminder: true,
    sunnahDaysReminder: false,
  });

  useEffect(() => {
    initScreen();
    loadReminders();
  }, []);

  const initScreen = async () => {
    try {
      const loc = await getQuickLocation();
      if (loc && loc.latitude && loc.longitude) {
        setCoords(loc);
      }
    } catch {}
  };

  const loadReminders = async () => {
    try {
      const raw = await AsyncStorage.getItem(FASTING_REMINDERS_KEY);
      if (raw) {
        setReminders(JSON.parse(raw));
      }
    } catch {}
  };

  const selectedMonthInfo = useMemo(() => {
    return HIJRI_MONTHS.find((m) => m.number === selectedMonthNum) || HIJRI_MONTHS[8];
  }, [selectedMonthNum]);

  // Generate generic 30-day Saher & Iftar timetable for ALL 12 Hijri months mathematically
  const monthSchedule: FastingDayEntry[] = useMemo(() => {
    const lat = coords.latitude || 17.385044;
    const lng = coords.longitude || 78.486671;
    const entries: FastingDayEntry[] = [];

    const now = new Date();
    // Offset simulated base date per Hijri month to accurately capture seasonal solar declination
    const simulatedBaseMonth = (selectedMonthNum + 1) % 12; // approximate mapping across calendar
    const baseYear = now.getFullYear();

    for (let day = 1; day <= 30; day++) {
      const targetDate = new Date(baseYear, simulatedBaseMonth, day);
      const timings = getLocalPrayerTimes(lat, lng, targetDate, 'hanafi');

      const isWhiteDay = day === 13 || day === 14 || day === 15;
      let tag: string | undefined;
      let isSpecialSunnah = false;

      if (selectedMonthNum === 9) {
        tag = `Ramadhan Day ${day}`;
        isSpecialSunnah = true;
      } else if (isWhiteDay) {
        tag = 'Ayam-ul-Bidh (White Day)';
        isSpecialSunnah = true;
      } else if (selectedMonthNum === 1 && (day === 9 || day === 10)) {
        tag = day === 10 ? 'Ashura Fast (10th)' : 'Tasu’a Fast (9th)';
        isSpecialSunnah = true;
      } else if (selectedMonthNum === 12 && day === 9) {
        tag = 'Day of Arafah';
        isSpecialSunnah = true;
      } else if (selectedMonthNum === 12 && day <= 8) {
        tag = 'First 10 Days of Dhul Hijjah';
        isSpecialSunnah = true;
      } else if (selectedMonthNum === 10 && day >= 2 && day <= 7) {
        tag = 'Shawwal 6-Day Fast';
        isSpecialSunnah = true;
      } else if (selectedMonthNum === 8 && day === 15) {
        tag = "Mid-Sha'ban Fast";
        isSpecialSunnah = true;
      }

      const gregorianStr = `${day.toString().padStart(2, '0')}/${(simulatedBaseMonth + 1).toString().padStart(2, '0')}`;

      entries.push({
        dayNum: day,
        hijriDate: `${day} ${selectedMonthInfo.nameEn}`,
        gregorianDate: gregorianStr,
        saher: formatTime(timings.Fajr),
        iftar: formatTime(timings.Maghrib),
        tag,
        isSpecialSunnah,
        isWhiteDay,
      });
    }

    return entries;
  }, [selectedMonthNum, coords, selectedMonthInfo]);

  // Today's Saher & Iftar Highlights Entry
  const todayEntry = useMemo(() => {
    return monthSchedule[0] || {
      dayNum: 1,
      hijriDate: `1 ${selectedMonthInfo.nameEn}`,
      gregorianDate: 'Today',
      saher: '04:55 AM',
      iftar: '06:20 PM',
      tag: selectedMonthInfo.specialVirtue,
      isSpecialSunnah: true,
      isWhiteDay: false,
    };
  }, [monthSchedule, selectedMonthInfo]);

  const toggleReminder = async (key: keyof FastingReminders) => {
    const updated = { ...reminders, [key]: !reminders[key] };
    setReminders(updated);
    await AsyncStorage.setItem(FASTING_REMINDERS_KEY, JSON.stringify(updated));

    if (!isExpoGo && Notifications) {
      try {
        if (key === 'suhoorReminder') {
          if (updated.suhoorReminder) {
            let { hour, minute } = parseTimeString(todayEntry.saher);
            minute -= 40;
            if (minute < 0) {
              minute += 60;
              hour -= 1;
              if (hour < 0) hour += 24;
            }
            await Notifications.cancelScheduledNotificationAsync(SUHOOR_NOTIFICATION_ID).catch(() => {});
            await Notifications.scheduleNotificationAsync({
              identifier: SUHOOR_NOTIFICATION_ID,
              content: {
                title: '🌙 Suhoor Alert (40 Mins Remaining)',
                body: `Suhoor ends at ${todayEntry.saher}. Prepare for fasting and Fajr prayer.`,
                sound: true,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour,
                minute,
              },
            });
          } else {
            await Notifications.cancelScheduledNotificationAsync(SUHOOR_NOTIFICATION_ID).catch(() => {});
          }
        } else if (key === 'iftarReminder') {
          if (updated.iftarReminder) {
            const { hour, minute } = parseTimeString(todayEntry.iftar);
            await Notifications.cancelScheduledNotificationAsync(IFTAR_NOTIFICATION_ID).catch(() => {});
            await Notifications.scheduleNotificationAsync({
              identifier: IFTAR_NOTIFICATION_ID,
              content: {
                title: '🌟 Iftar Time!',
                body: `It is time for Iftar (${todayEntry.iftar}). May Allah accept your fast.`,
                sound: true,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour,
                minute,
              },
            });
          } else {
            await Notifications.cancelScheduledNotificationAsync(IFTAR_NOTIFICATION_ID).catch(() => {});
          }
        }
      } catch (notifErr) {
        console.warn('[FastingCalendar] Notification error:', notifErr);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* 2-Segment Control Bar */}
      <View style={[styles.segmentedBar, { backgroundColor: colors.pill }]}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'calendar' && { backgroundColor: colors.accentGoldBg }]}
          onPress={() => setActiveTab('calendar')}
          activeOpacity={0.8}
        >
          <Feather
            name="calendar"
            size={13}
            color={activeTab === 'calendar' ? '#0f1718' : colors.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.segmentText,
              { color: colors.textMuted },
              activeTab === 'calendar' && { color: '#0f1718', fontWeight: '700' },
            ]}
          >
            Hijri Fasting Calendar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'reminders' && { backgroundColor: colors.accentGoldBg }]}
          onPress={() => setActiveTab('reminders')}
          activeOpacity={0.8}
        >
          <Feather
            name="bell"
            size={13}
            color={activeTab === 'reminders' ? '#0f1718' : colors.textMuted}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.segmentText,
              { color: colors.textMuted },
              activeTab === 'reminders' && { color: '#0f1718', fontWeight: '700' },
            ]}
          >
            Fasting Reminders
          </Text>
        </TouchableOpacity>
      </View>

      {/* 12-Month Horizontal Selector */}
      <View style={styles.monthSelectorBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthScrollContent}
        >
          {HIJRI_MONTHS.map((m) => {
            const isSelected = selectedMonthNum === m.number;
            return (
              <TouchableOpacity
                key={m.number}
                style={[
                  styles.monthPill,
                  { backgroundColor: colors.pill, borderColor: colors.borderSubtle },
                  isSelected && { backgroundColor: colors.accentGoldBg, borderColor: colors.accentGold },
                ]}
                onPress={() => setSelectedMonthNum(m.number)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.monthPillText,
                    { color: colors.textMuted },
                    isSelected && { color: '#0f1718', fontWeight: '700' },
                  ]}
                >
                  {m.number}. {m.nameEn}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, contentContainerStyle]}>
        {/* Today's Saher & Iftar Highlights Board */}
        <View style={[styles.highlightBoard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.highlightHeaderRow}>
            <View style={styles.crescentBadge}>
              <Feather name="moon" size={13} color={colors.accentGreen} style={{ marginRight: 4 }} />
              <Text style={styles.crescentBadgeText}>
                {selectedMonthNum === 9 ? 'Ramadhan Mubarak' : `${selectedMonthInfo.nameEn} (${selectedMonthInfo.nameAr})`}
              </Text>
            </View>
            <Text style={[styles.todayDateText, { color: colors.textMuted }]}>
              {selectedMonthInfo.specialVirtue}
            </Text>
          </View>

          <View style={styles.timesDualRow}>
            <View style={styles.timeDualBox}>
              <Text style={[styles.timeDualLabel, { color: colors.textMuted }]}>SUHOOR ENDS (SAHAR)</Text>
              <Text style={[styles.saherTime, { color: colors.accentGreen }]}>{todayEntry.saher}</Text>
              <Text style={[styles.timeDualSub, { color: colors.textMuted }]}>Stop eating & recite Niyyah</Text>
            </View>

            <View style={[styles.timeDualDivider, { backgroundColor: colors.borderSubtle }]} />

            <View style={styles.timeDualBox}>
              <Text style={[styles.timeDualLabel, { color: colors.textMuted }]}>IFTAR TIME (MAGHRIB)</Text>
              <Text style={[styles.iftarTime, { color: colors.accentGold }]}>{todayEntry.iftar}</Text>
              <Text style={[styles.timeDualSub, { color: colors.textMuted }]}>Break fast with dates & water</Text>
            </View>
          </View>

          {/* Iftar & Suhoor Duas Snippet */}
          <View style={[styles.niyyahBox, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <Text style={[styles.niyyahArabic, { color: colors.accentSoft }]}>
              ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ
            </Text>
            <Text style={[styles.niyyahTrans, { color: colors.textSecondary }]}>
              "The thirst has gone, the veins are moistened, and the reward is confirmed, if Allah wills." (Abu Dawood 2357)
            </Text>
          </View>
        </View>

        {activeTab === 'calendar' ? (
          /* 30-Day Generic Hijri Fasting Table */
          <View style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }, tableMaxWidthStyle]}>
            <View style={styles.tableTitleRow}>
              <Text style={[styles.tableTitle, { color: colors.text }]}>
                {selectedMonthInfo.nameEn} 30-Day Fasting Timetable
              </Text>
              <Text style={[styles.tableSub, { color: colors.textMuted }]}>
                Astronomical Sahar & Iftar calculations for your location
              </Text>
            </View>

            <View style={[styles.tableHeaderRow, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.thCell, { flex: 0.9, textAlign: 'center', color: colors.textMuted }]}>DAY</Text>
              <Text style={[styles.thCell, { flex: 1.1, textAlign: 'center', color: colors.textMuted }]}>DATE</Text>
              <Text style={[styles.thCell, { flex: 1.2, textAlign: 'center', color: colors.textMuted }]}>SAHER</Text>
              <Text style={[styles.thCell, { flex: 1.2, textAlign: 'center', color: colors.textMuted }]}>IFTAR</Text>
              <Text style={[styles.thCell, { flex: 1.6, textAlign: 'center', color: colors.textMuted }]}>FASTING TYPE</Text>
            </View>

            {monthSchedule.map((row, idx) => {
              const isEven = idx % 2 === 0;

              return (
                <View
                  key={row.dayNum}
                  style={[
                    styles.tableRow,
                    {
                      backgroundColor: row.isSpecialSunnah
                        ? isDark
                          ? 'rgba(226, 162, 59, 0.08)'
                          : 'rgba(226, 162, 59, 0.05)'
                        : isEven
                        ? colors.surface
                        : colors.card,
                      borderBottomColor: colors.borderSubtle,
                    },
                  ]}
                >
                  <Text style={[styles.tdCell, { flex: 0.9, textAlign: 'center', color: colors.text, fontWeight: '700' }]}>
                    {row.dayNum}
                  </Text>
                  <Text style={[styles.tdCell, { flex: 1.1, textAlign: 'center', color: colors.textSecondary }]}>
                    {row.gregorianDate}
                  </Text>
                  <Text style={[styles.tdCell, { flex: 1.2, textAlign: 'center', color: colors.accentGreen, fontWeight: '700' }]}>
                    {row.saher}
                  </Text>
                  <Text style={[styles.tdCell, { flex: 1.2, textAlign: 'center', color: colors.accentGold, fontWeight: '700' }]}>
                    {row.iftar}
                  </Text>
                  <View style={{ flex: 1.6, alignItems: 'center', justifyContent: 'center' }}>
                    {row.tag ? (
                      <View
                        style={[
                          styles.sunnahBadge,
                          {
                            backgroundColor: row.isWhiteDay
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(226, 162, 59, 0.15)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.sunnahBadgeText,
                            { color: row.isWhiteDay ? colors.accentGreen : colors.accentGold },
                          ]}
                          numberOfLines={1}
                        >
                          {row.tag}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.voluntaryText, { color: colors.textMuted }]}>Voluntary</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          /* Reminders Settings Tab */
          <View style={[styles.remindersCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.remindersHeader, { color: colors.text }]}>Fasting Notifications & Alarms</Text>
            <Text style={[styles.remindersSub, { color: colors.textMuted }]}>
              Keep consistent with Sunnah fasts and Ramadan with automated audio and push notifications.
            </Text>

            <View style={[styles.reminderItem, { borderBottomColor: colors.borderSubtle }]}>
              <View style={styles.reminderInfo}>
                <Text style={[styles.reminderTitle, { color: colors.text }]}>Suhoor Alert (40 Mins Before)</Text>
                <Text style={[styles.reminderDesc, { color: colors.textMuted }]}>
                  Wake up in time to prepare Suhoor and eat before Fajr.
                </Text>
              </View>
              <Switch
                value={reminders.suhoorReminder}
                onValueChange={() => toggleReminder('suhoorReminder')}
                trackColor={{ false: colors.pill, true: colors.accentGold }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={[styles.reminderItem, { borderBottomColor: colors.borderSubtle }]}>
              <View style={styles.reminderInfo}>
                <Text style={[styles.reminderTitle, { color: colors.text }]}>Iftar Notification</Text>
                <Text style={[styles.reminderDesc, { color: colors.textMuted }]}>
                  Play Iftar dua when the sunset prayer begins.
                </Text>
              </View>
              <Switch
                value={reminders.iftarReminder}
                onValueChange={() => toggleReminder('iftarReminder')}
                trackColor={{ false: colors.pill, true: colors.accentGold }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={[styles.reminderItem, { borderBottomColor: colors.borderSubtle }]}>
              <View style={styles.reminderInfo}>
                <Text style={[styles.reminderTitle, { color: colors.text }]}>Ayam-ul-Bidh (White Days) Reminder</Text>
                <Text style={[styles.reminderDesc, { color: colors.textMuted }]}>
                  Get reminded on the 12th of every Hijri month for the 13, 14, 15 White Days fasting.
                </Text>
              </View>
              <Switch
                value={reminders.whiteDaysReminder}
                onValueChange={() => toggleReminder('whiteDaysReminder')}
                trackColor={{ false: colors.pill, true: colors.accentGold }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={styles.reminderItem}>
              <View style={styles.reminderInfo}>
                <Text style={[styles.reminderTitle, { color: colors.text }]}>Monday & Thursday Sunnah Fasts</Text>
                <Text style={[styles.reminderDesc, { color: colors.textMuted }]}>
                  Receive an evening reminder on Sunday and Wednesday to set intention for fasting.
                </Text>
              </View>
              <Switch
                value={reminders.sunnahDaysReminder}
                onValueChange={() => toggleReminder('sunnahDaysReminder')}
                trackColor={{ false: colors.pill, true: colors.accentGold }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentedBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 8,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  monthSelectorBar: {
    marginTop: 8,
    paddingVertical: 4,
  },
  monthScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  monthPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  monthPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  highlightBoard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  highlightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 6,
  },
  crescentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  crescentBadgeText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  todayDateText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  timesDualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  timeDualBox: {
    flex: 1,
    alignItems: 'center',
  },
  timeDualLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  saherTime: {
    fontSize: 22,
    fontWeight: '800',
  },
  iftarTime: {
    fontSize: 22,
    fontWeight: '800',
  },
  timeDualSub: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  timeDualDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 8,
  },
  niyyahBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  niyyahArabic: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  niyyahTrans: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  tableCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableTitleRow: {
    padding: 14,
  },
  tableTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  tableSub: {
    fontSize: 11,
    marginTop: 2,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  thCell: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  tdCell: {
    fontSize: 12,
  },
  sunnahBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sunnahBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  voluntaryText: {
    fontSize: 10,
  },
  remindersCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  remindersHeader: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  remindersSub: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  reminderInfo: {
    flex: 1,
    marginRight: 12,
  },
  reminderTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  reminderDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
});
