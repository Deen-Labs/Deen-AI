import React from 'react';
import { View, Text, StyleSheet, Platform, StyleProp, ViewStyle, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Masjid } from '../lib/masjid';
import { PrayerTimings, formatTime, getNextPrayer } from '../lib/prayerTimes';
import { useResponsiveLayout } from '../lib/responsive';
import { useLanguage } from '../lib/i18n';

export interface MasjidLedBoardProps {
  masjid?: Masjid | null;
  effectivePrayerTimes?: PrayerTimings | null;
  isFallback?: boolean;
  compact?: boolean;
  nextPrayerName?: string | null;
  nextPrayerCountdown?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export default function MasjidLedBoard({
  masjid,
  effectivePrayerTimes,
  isFallback,
  compact = false,
  nextPrayerName,
  nextPrayerCountdown,
  containerStyle,
}: MasjidLedBoardProps) {
  const [showRainNotice, setShowRainNotice] = React.useState<boolean>(false);
  const [isBoardCollapsed, setIsBoardCollapsed] = React.useState<boolean>(false);

  const hasRainAlert = Boolean(
    (masjid as any)?.rainAlert ||
    (masjid as any)?.isRainMode ||
    masjid?.notes?.toLowerCase().includes('rain') ||
    (masjid as any)?.rainCombined
  );
  const { tableMaxWidthStyle } = useResponsiveLayout();
  const { t } = useLanguage();

  // Determine upcoming prayer
  const resolvedNextPrayer = nextPrayerName !== undefined
    ? nextPrayerName
    : (effectivePrayerTimes ? getNextPrayer(effectivePrayerTimes)?.name : null);

  // Check if unupdated or falling back to solar/API
  const isUnupdated = Boolean(
    isFallback ||
    !masjid ||
    !masjid.iqamahTimes?.Fajr ||
    masjid.iqamahTimes.Fajr === '--:--' ||
    masjid.id?.startsWith('fallback-')
  );

  const formatPrayerTime = (
    masjidTime: string | undefined,
    prayerKey: keyof PrayerTimings,
    fallbackDefault: string = '--:--'
  ): string => {
    if (masjidTime && masjidTime !== '--:--') {
      return formatTime(masjidTime, prayerKey);
    }
    if (effectivePrayerTimes?.[prayerKey]) {
      return formatTime(effectivePrayerTimes[prayerKey], prayerKey);
    }
    return fallbackDefault;
  };

  const fajrAthan = formatPrayerTime(masjid?.athanTimes?.Fajr, 'Fajr');
  const fajrJamaat = isUnupdated ? fajrAthan : (masjid?.iqamahTimes?.Fajr || fajrAthan);

  const getMinutesDiff = (t1?: string, t2?: string): number | null => {
    if (!t1 || !t2 || t1 === '--:--' || t2 === '--:--') return null;
    const parseM = (timeStr: string) => {
      const match = timeStr.trim().match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!match) return null;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[3]?.toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };
    const m1 = parseM(t1);
    const m2 = parseM(t2);
    if (m1 === null || m2 === null) return null;
    let diff = m2 - m1;
    if (diff < 0) diff += 24 * 60;
    return (diff > 0 && diff <= 120) ? diff : null;
  };

  const fajrIntervalMinutes = getMinutesDiff(fajrAthan, fajrJamaat);

  const sunriseAthan = formatPrayerTime(masjid?.sunrise, 'Sunrise');

  const dhuhrAthan = formatPrayerTime(masjid?.athanTimes?.Dhuhr, 'Dhuhr');
  const dhuhrJamaat = isUnupdated ? dhuhrAthan : (masjid?.iqamahTimes?.Dhuhr || dhuhrAthan);

  const asrAthan = formatPrayerTime(masjid?.athanTimes?.Asr, 'Asr');
  const asrJamaat = isUnupdated ? asrAthan : (masjid?.iqamahTimes?.Asr || asrAthan);

  const maghribAthan = formatPrayerTime(masjid?.athanTimes?.Maghrib, 'Maghrib', 'Sunset');
  const maghribJamaat = isUnupdated
    ? maghribAthan
    : (masjid?.iqamahTimes?.Maghrib && masjid.iqamahTimes.Maghrib !== '--:--'
        ? masjid.iqamahTimes.Maghrib
        : 'Sunset');

  const ishaAthan = formatPrayerTime(masjid?.athanTimes?.Isha, 'Isha');
  const ishaJamaat = isUnupdated ? ishaAthan : (masjid?.iqamahTimes?.Isha || ishaAthan);

  const jummahAthan = masjid?.jummahAthan && masjid.jummahAthan !== '--:--'
    ? masjid.jummahAthan
    : (effectivePrayerTimes?.Dhuhr ? formatTime(effectivePrayerTimes.Dhuhr, 'Dhuhr') : '12:45 PM');
  const jummahJamaat = masjid?.jummah && masjid.jummah !== '--:--' ? masjid.jummah : '01:30 PM';

  const taraweehAthan = masjid?.athanTimes?.Isha && masjid.athanTimes.Isha !== '--:--'
    ? formatTime(masjid.athanTimes.Isha, 'Isha')
    : '8:15 PM';
  const taraweehJamaat = masjid?.taravihTime && masjid.taravihTime !== '--:--' ? masjid.taravihTime : '8:45 PM';

  const suhoorTime = masjid?.suhoor && masjid.suhoor !== '--:--'
    ? masjid.suhoor
    : (effectivePrayerTimes?.Fajr ? formatTime(effectivePrayerTimes.Fajr, 'Fajr') : '5:05 AM');

  const iftarTime = masjid?.iftar && masjid.iftar !== '--:--'
    ? masjid.iftar
    : (effectivePrayerTimes?.Maghrib ? formatTime(effectivePrayerTimes.Maghrib, 'Maghrib') : 'Sunset');

  const standardRows = [
    { key: 'Fajr', english: 'FAJR', athan: fajrAthan, jamaat: fajrJamaat, isSunrise: false },
    ...(!compact ? [{ key: 'Sunrise', english: 'SUNRISE', athan: sunriseAthan, jamaat: '--:--', isSunrise: true }] : []),
    { key: 'Dhuhr', english: 'DHUHR', athan: dhuhrAthan, jamaat: dhuhrJamaat, isSunrise: false },
    { key: 'Asr', english: 'ASR', athan: asrAthan, jamaat: asrJamaat, isSunrise: false },
    { key: 'Maghrib', english: 'MAGHRIB', athan: maghribAthan, jamaat: maghribJamaat, isSunrise: false },
    { key: 'Isha', english: 'ISHA', athan: ishaAthan, jamaat: ishaJamaat, isSunrise: false },
  ];

  const isJummahNext = Boolean(
    resolvedNextPrayer &&
    (resolvedNextPrayer.toLowerCase() === 'jummah' || resolvedNextPrayer.toLowerCase() === 'juma')
  );

  return (
    <View style={[styles.boardWrapper, containerStyle]}>
      <View style={styles.ledBoard}>
        {/* Calligraphy Header Banner */}
        <View style={[styles.ledBanner, isBoardCollapsed && { marginBottom: 0, borderBottomWidth: 0, paddingBottom: 0 }]}>
          <Text style={styles.ledCalligraphy}>لَا إِلٰهَ إِلَّا ٱللَّٰهُ مُحَمَّدٌ رَسُولُ ٱللَّٰهِ</Text>

          {/* Authentic Next Salah LED Status Strip */}
          {resolvedNextPrayer ? (
            <View style={styles.nextSalahLedBanner}>
              <View style={styles.pulsingLedDot} />
              <Text style={styles.nextSalahLedBannerText}>
                NEXT SALAH: {resolvedNextPrayer.toUpperCase()} {nextPrayerCountdown ? `• IN ${nextPrayerCountdown}` : ''}
              </Text>
            </View>
          ) : null}

          {/* Header Controls Line: Verified / Calculated badge on left, Hide LED Board on right */}
          <View style={styles.boardTopControlRow}>
            {isUnupdated || !masjid?.isMuazzinVerified ? (
              <View style={styles.verifiedRow}>
                <Feather name="alert-circle" size={10} color="#f59e0b" style={{ marginRight: 4 }} />
                <Text style={[styles.verifiedText, { color: '#f59e0b' }]}>
                  {t('masjid.calculated', 'Calculated Timings • Update Needed')}
                </Text>
              </View>
            ) : (
              <View style={styles.verifiedRow}>
                <Feather name="shield" size={10} color="#10b981" style={{ marginRight: 4 }} />
                <Text style={[styles.verifiedText, { color: '#10b981' }]}>
                  {t('masjid.verified', 'Official Timings • Verified by Muazzin')}
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => setIsBoardCollapsed(prev => !prev)}
              style={styles.collapseToggleBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 10, right: 10 }}
            >
              <Text style={styles.collapseToggleText}>
                {isBoardCollapsed ? '▼ Show LED Timings' : '▲ Hide LED Board'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Collapsible LED Timing Table Rows */}
        {!isBoardCollapsed && (
        <>
        {/* Column Header Titles */}
        <View style={[styles.ledRowHeader, tableMaxWidthStyle]}>
          <Text style={[styles.ledHeaderCell, { flex: 1.1, textAlign: 'left', paddingLeft: 12 }]}>{t('led.prayer', 'PRAYER')}</Text>
          <Text style={[styles.ledHeaderCell, { color: '#00ff66', textShadowColor: 'rgba(0, 255, 102, 0.5)' }]}>{t('led.athan', 'ATHAN')}</Text>
          <Text style={[styles.ledHeaderCell, { color: '#ff2a2a', textShadowColor: 'rgba(255, 42, 42, 0.5)' }]}>{t('led.jamaat', "JAMA'AT")}</Text>
        </View>

        {/* 5 Daily Prayers + Sunrise (Arabic removed to eliminate wasted horizontal space) */}
        {standardRows.map((row) => {
          const isNextRow = Boolean(resolvedNextPrayer && row.key.toLowerCase() === resolvedNextPrayer.toLowerCase());
          return (
            <View
              key={row.key}
              style={[
                styles.ledRow,
                tableMaxWidthStyle,
                isNextRow && styles.ledRowActive,
              ]}
            >
              <View style={styles.ledLabelCol}>
                <View style={[styles.ledDiodeIndicator, isNextRow && styles.ledDiodeIndicatorActive]} />
                <Text style={[styles.ledEnglishLabel, isNextRow && styles.ledEnglishLabelActive]}>
                  {isNextRow ? `▶ ${row.english}` : row.english}
                </Text>
                {row.key === 'Fajr' && fajrIntervalMinutes ? (
                  <View style={styles.intervalBadge}>
                    <Feather name="clock" size={8} color="#e2a23b" style={{ marginRight: 2 }} />
                    <Text style={styles.intervalBadgeText}>+{fajrIntervalMinutes}m</Text>
                  </View>
                ) : null}
                {hasRainAlert && (row.key === 'Dhuhr' || row.key === 'Maghrib') ? (
                  <TouchableOpacity
                    onPress={() => setShowRainNotice(prev => !prev)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ marginLeft: 5 }}
                    accessibilityLabel="Toggle Heavy Rain Jama'at Notice"
                  >
                    <Feather name="cloud-rain" size={11} color={showRainNotice ? "#38bdf8" : "#526361"} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <Text style={styles.ledAthanTime}>{row.athan}</Text>
              <Text style={row.isSunrise ? styles.ledDisabledTime : styles.ledJamaatTime}>{row.jamaat}</Text>
            </View>
          );
        })}

        {/* Compact 4-Column Bottom Grid (Matches Website UI Exactly) */}
        <View style={[styles.bottomFourGrid, tableMaxWidthStyle]}>
          <View style={styles.bottomGridCol}>
            <Text style={styles.bottomGridLabelGold}>JUMMAH</Text>
            <Text style={styles.bottomGridTimeRed}>{jummahJamaat}</Text>
          </View>
          <View style={styles.bottomGridCol}>
            <Text style={styles.bottomGridLabelWhite}>TARAWEEH</Text>
            <Text style={styles.bottomGridTimeRed}>{taraweehJamaat}</Text>
          </View>
          <View style={styles.bottomGridCol}>
            <Text style={styles.bottomGridLabelGold}>SAHAR</Text>
            <Text style={styles.bottomGridTimeGreen}>{suhoorTime}</Text>
          </View>
          <View style={styles.bottomGridCol}>
            <Text style={styles.bottomGridLabelGold}>IFTAR</Text>
            <Text style={styles.bottomGridTimeAmber}>{iftarTime}</Text>
          </View>
        </View>

        {/* Facilities Banner (Taraweeh Qari & Ladies Section Status) */}
        <View style={[styles.ledBoardFacilityRow, tableMaxWidthStyle]}>
          <Text style={styles.ledFacilityQariText}>
            Taraweeh Qari: {masjid?.qariName || 'Hafiz Ibrahim'}
          </Text>
          <Text style={masjid?.ladiesSection === false ? styles.ledFacilityLadiesUnavailable : styles.ledFacilityLadiesAvailable}>
            {masjid?.ladiesSection === false ? 'Ladies Section: Not Available' : 'Ladies Section Available'}
          </Text>
        </View>

        </>
        )}

        {/* Rain Notice Strip (Toggleable via Cloud-Rain Icon on Dhuhr/Maghrib) */}
        {hasRainAlert && showRainNotice && (
          <View style={styles.rainNoticeStrip}>
            <Feather name="cloud-rain" size={12} color="#38bdf8" style={{ marginRight: 6 }} />
            <Text style={styles.rainNoticeText}>Pray at Home / Combined in Heavy Rain</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  boardTopControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  bottomFourGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1f1f1f',
  },
  bottomGridCol: {
    flex: 1,
    alignItems: 'center',
  },
  bottomGridLabelGold: {
    fontSize: 9,
    fontWeight: '700',
    color: '#e2a23b',
    marginBottom: 2,
  },
  bottomGridLabelWhite: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a4a2',
    marginBottom: 2,
  },
  bottomGridTimeRed: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ff3333',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textShadowColor: 'rgba(255, 51, 51, 0.45)',
    textShadowRadius: 2.5,
  },
  bottomGridTimeGreen: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00ff66',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textShadowColor: 'rgba(0, 255, 102, 0.45)',
    textShadowRadius: 2.5,
  },
  bottomGridTimeAmber: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f59e0b',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textShadowColor: 'rgba(245, 158, 11, 0.45)',
    textShadowRadius: 2.5,
  },
  ledFacilityLadiesAvailable: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00ff66',
  },
  ledFacilityLadiesUnavailable: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ef4444',
  },

  collapseToggleBtn: {
    alignSelf: 'center',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 6,
  },
  collapseToggleText: {
    color: '#94a4a2',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  intervalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226, 162, 59, 0.16)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(226, 162, 59, 0.3)',
  },
  intervalBadgeText: {
    color: '#e2a23b',
    fontSize: 9,
    fontWeight: '700',
  },
  rainNoticeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 8,
    marginHorizontal: 10,
    marginBottom: 4,
  },
  rainNoticeText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },

  boardWrapper: {
    marginTop: 8,
    overflow: 'hidden',
    width: '100%',
  },
  ledBoard: {
    backgroundColor: '#080808',
    borderColor: '#4a3321',
    borderWidth: 4,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  ledBanner: {
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderColor: '#1a1a1a',
    paddingBottom: 8,
  },
  ledCalligraphy: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#e2a23b',
    textShadowColor: 'rgba(226, 162, 59, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2.5,
    textAlign: 'center',
  },
  nextSalahLedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    backgroundColor: 'rgba(0, 255, 102, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 102, 0.45)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'center',
  },
  pulsingLedDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#00ff66',
    marginRight: 6,
    shadowColor: '#00ff66',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 4,
  },
  nextSalahLedBannerText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#00ff66',
    letterSpacing: 0.5,
  },
  fallbackNoticeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'center',
    maxWidth: '96%',
  },
  fallbackNoticeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#f59e0b',
    textAlign: 'center',
    flexShrink: 1,
  },
  muazzinBoardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'center',
  },
  muazzinBoardBannerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#f59e0b',
    letterSpacing: 0.3,
  },
  ledRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderColor: '#1f1f1f',
  },
  ledHeaderCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    color: '#94a4a2',
    textAlign: 'center',
  },
  ledRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderColor: '#0f0f0f',
  },
  ledRowActive: {
    backgroundColor: 'rgba(0, 255, 102, 0.12)',
    borderColor: '#00ff66',
    borderWidth: 1,
    borderRadius: 6,
  },
  ledLabelCol: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 4,
  },
  ledDiodeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#262626',
    marginRight: 6,
  },
  ledDiodeIndicatorActive: {
    backgroundColor: '#00ff66',
    shadowColor: '#00ff66',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 2.5,
    elevation: 2,
  },
  ledEnglishLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e2a23b',
    textShadowColor: 'rgba(226, 162, 59, 0.25)',
    textShadowRadius: 2,
  },
  ledEnglishLabelActive: {
    color: '#00ff66',
    fontWeight: '900',
    textShadowColor: 'rgba(0, 255, 102, 0.35)',
    textShadowRadius: 2.5,
  },
  ledAthanTime: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#00ff66',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textShadowColor: 'rgba(0, 255, 102, 0.35)',
    textShadowRadius: 2.5,
  },
  ledJamaatTime: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#ff2a2a',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textShadowColor: 'rgba(255, 42, 42, 0.35)',
    textShadowRadius: 2.5,
  },
  ledDisabledTime: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#242829',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  ledBoardDivider: {
    height: 1.5,
    backgroundColor: '#1a1a1a',
    marginVertical: 8,
  },
  ledBoardFacilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    marginTop: 8,
    paddingTop: 6,
    paddingHorizontal: 4,
  },
  ledFacilityQariText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffdda8',
  },
  ledFacilityLadiesText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00ff66',
  },
});
