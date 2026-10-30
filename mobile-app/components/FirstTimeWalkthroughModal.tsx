import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Vibration,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  AppLanguage,
  SUPPORTED_LANGUAGES,
  setAppLanguage,
  getAppLanguage,
  setWalkthroughCompleted,
} from '../lib/onboarding';
import { useTheme } from '../lib/theme';

export interface FirstTimeWalkthroughModalProps {
  visible: boolean;
  onClose: () => void;
  mode?: 'general' | 'masjid_onboarding';
}

interface WalkthroughSlide {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  badge: string;
  highlights: {
    icon: keyof typeof Feather.glyphMap;
    title: string;
    description: string;
  }[];
}

const WALKTHROUGH_SLIDES: WalkthroughSlide[] = [
  {
    icon: 'layers',
    title: 'Salah Time Meets DeenHub',
    subtitle: 'Unified v3.2.0 Architecture',
    badge: 'Major Upgrade',
    highlights: [
      {
        icon: 'zap',
        title: '0ms Startup Engine',
        description: 'Instant loading with background cache pre-warming for offline prayer calculation.',
      },
      {
        icon: 'database',
        title: 'Salah Time Database Unified',
        description: 'All masajid, timings, and legacy modules safely ported with zero data loss.',
      },
      {
        icon: 'shield',
        title: 'Privacy & Halal Protection',
        description: 'Protected PIN storage, zero plaintext passwords, and integrated digital well-being.',
      },
    ],
  },
  {
    icon: 'clock',
    title: 'Live Masjid & Jamat Timings',
    subtitle: 'Mahmood Watch Co. Digital Boards',
    badge: 'Precision Salah',
    highlights: [
      {
        icon: 'navigation',
        title: 'Auto-Closest GPS Default',
        description: 'The app automatically selects the closest masjid to your current GPS location on first boot.',
      },
      {
        icon: 'tv',
        title: 'Iconic Digital LED Clock',
        description: 'Authentic Athan and Jamaat board matching Hyderabad and regional masjid displays.',
      },
      {
        icon: 'filter',
        title: '3-Pill Filter Tabs',
        description: 'Quickly switch between Nearby Masjids, All Jumu\'ah Timings, and Taraweeh & Ramadhan.',
      },
    ],
  },
  {
    icon: 'grid',
    title: 'Discover the Deen Hub',
    subtitle: 'Where Legacy & New Features Live',
    badge: 'Home Bento Grid',
    highlights: [
      {
        icon: 'book-open',
        title: 'Azkar & 99 Names of Allah',
        description: 'Morning/Evening Azkar with tap-to-count plus full audio pronunciation for 99 Names.',
      },
      {
        icon: 'search',
        title: 'Quran & Hadith Multi-Language',
        description: 'Search 6 Hadith books and Quran with English, Urdu, Hinglish, Hindi, and Telugu.',
      },
      {
        icon: 'activity',
        title: 'Digital Tasbih & Amanah Ledger',
        description: 'Tasbih stopwatch with session history, Halal Pin Money ledger, and Maktab attendance.',
      },
    ],
  },
  {
    icon: 'shield',
    title: 'Empowering Muazzins & Imams',
    subtitle: 'One-Tap Verified Timings Update',
    badge: 'Muazzin Portal',
    highlights: [
      {
        icon: 'user-check',
        title: 'Top-Right Muazzin Login',
        description: 'Direct login button on the top right corner of the Masjid screen for instant access.',
      },
      {
        icon: 'edit-3',
        title: 'Fast Jamat Times Publishing',
        description: 'Enter your security code and publish updated timings to thousands of local believers.',
      },
      {
        icon: 'award',
        title: 'Verified by Muazzin Seal',
        description: 'Your changes display a verified badge to assure the congregation of official timings.',
      },
    ],
  },
  {
    icon: 'shield',
    title: '18+ Halal Content Protection',
    subtitle: 'Device-Wide Adult Site & Keyword Shield',
    badge: 'Spiritual Well-Being',
    highlights: [
      {
        icon: 'lock',
        title: 'System & Secure Folder Protection',
        description: 'Blocks adult sites across Chrome, Samsung Internet, Incognito tabs, and isolated Secure Folders.',
      },
      {
        icon: 'settings',
        title: 'How To Set It Up (30 Seconds)',
        description: 'Phone Settings -> Connections -> More Connection Settings -> Private DNS -> Enter family-filter-dns.cleanbrowsing.org',
      },
      {
        icon: 'eye-off',
        title: 'In-App Shield & PIN Lock',
        description: 'DeenHub detects inappropriate searches and locks settings behind a secure PIN code so protection cannot be bypassed.',
      },
    ],
  },
];

const MASJID_ONBOARDING_SLIDES: WalkthroughSlide[] = [
  {
    icon: 'map-pin',
    title: 'Find or Pin Your Default Masjid',
    subtitle: 'GPS Proximity & Custom Pinning',
    badge: 'Step 1 of 4',
    highlights: [
      {
        icon: 'navigation',
        title: 'Auto-Closest GPS Selection',
        description: 'DeenHub detects your location to display the nearest masjid automatically with live walking or driving distance.',
      },
      {
        icon: 'bookmark',
        title: 'Pin Your Home Masjid',
        description: 'Tap the pin icon on your neighborhood masjid card so it permanently remains your Homepage LED board display.',
      },
      {
        icon: 'sun',
        title: 'Precision Solar Fallback',
        description: 'When a newly added masjid does not yet have verified Jama\'at times, Deen AI calculates exact solar timings.',
      },
    ],
  },
  {
    icon: 'plus-circle',
    title: 'Adding a Missing Masjid',
    subtitle: 'Grow the Community Directory',
    badge: 'Step 2 of 4',
    highlights: [
      {
        icon: 'plus',
        title: 'One-Tap + Add Missing Masjid',
        description: 'Tap "+ Add Missing Masjid" on the Masjid tab or after logging into your free account.',
      },
      {
        icon: 'map',
        title: 'Auto-Tagged GPS Coordinates',
        description: 'Tap "Use Current Location" to automatically record latitude and longitude coordinates for maximum accuracy.',
      },
      {
        icon: 'users',
        title: 'President & Community Facilities',
        description: 'Add President / Committee details, Ladies prayer section status, and Taraweeh arrangements.',
      },
    ],
  },
  {
    icon: 'tv',
    title: 'Setting the Digital LED Board',
    subtitle: 'Mahmood Watch Co. Digital Replica',
    badge: 'Step 3 of 4',
    highlights: [
      {
        icon: 'clock',
        title: 'Green Athan & Red Jama\'at',
        description: 'Our authentic LED board displays glowing green digits for Athan and glowing red digits for Jama\'at.',
      },
      {
        icon: 'calendar',
        title: 'Jumu\'ah, Taraweeh & Fasting Times',
        description: 'Configure Friday khutbah timings, Ramadhan Taraweeh schedules, Sahar, and Iftar timings with one tap.',
      },
      {
        icon: 'alert-triangle',
        title: 'Solar Fallback Indicator',
        description: 'A gold banner lets believers know if timings are temporarily calculated from solar data until updated.',
      },
    ],
  },
  {
    icon: 'award',
    title: 'Muazzin & Committee Verification',
    subtitle: 'Earn the Official Verified Badge',
    badge: 'Step 4 of 4',
    highlights: [
      {
        icon: 'user-check',
        title: 'Muazzin & Imam Login',
        description: 'Registered Muazzins and Imams can log in directly from the Masjid tab with their phone number.',
      },
      {
        icon: 'check-circle',
        title: 'Verified by Muazzin Seal',
        description: 'Timings submitted by verified personnel display the green verification seal to build congregation trust.',
      },
      {
        icon: 'shield',
        title: 'Tamper-Proof Community Network',
        description: 'Security features and admin verification protect all prayer times from unauthorized changes.',
      },
    ],
  },
];

export default function FirstTimeWalkthroughModal({
  visible,
  onClose,
  mode = 'general',
}: FirstTimeWalkthroughModalProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [currentStep, setCurrentStep] = useState<'language' | 'slides'>(mode === 'masjid_onboarding' ? 'slides' : 'language');
  const [selectedLang, setSelectedLang] = useState<AppLanguage>('en');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const activeSlides = mode === 'masjid_onboarding' ? MASJID_ONBOARDING_SLIDES : WALKTHROUGH_SLIDES;

  useEffect(() => {
    if (visible) {
      if (mode === 'masjid_onboarding') {
        setCurrentStep('slides');
      } else {
        getAppLanguage().then(setSelectedLang);
        setCurrentStep('language');
      }
      setCurrentSlideIndex(0);
    }
  }, [visible, mode]);

  if (!visible) return null;

  const handleSelectLanguage = (lang: AppLanguage) => {
    setSelectedLang(lang);
    try {
      Vibration.vibrate(20);
    } catch {}
  };

  const handleConfirmLanguage = async () => {
    await setAppLanguage(selectedLang);
    setCurrentStep('slides');
  };

  const handleNextSlide = () => {
    try {
      Vibration.vibrate(20);
    } catch {}
    if (currentSlideIndex < activeSlides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else {
      handleCompleteWalkthrough();
    }
  };

  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    } else {
      if (mode === 'masjid_onboarding') {
        onClose();
      } else {
        setCurrentStep('language');
      }
    }
  };

  const handleCompleteWalkthrough = async () => {
    try {
      Vibration.vibrate(30);
    } catch {}
    if (mode === 'general') {
      await setWalkthroughCompleted(true);
    }
    onClose();
  };

  const handleTryAddMasjidNow = () => {
    handleCompleteWalkthrough();
    router.push('/(tabs)/masjid?openAdd=true');
  };

  const currentSlide = activeSlides[currentSlideIndex] || activeSlides[0];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={handleCompleteWalkthrough}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Top Header / Progress Row */}
        <View style={[styles.topHeader, { borderBottomColor: colors.borderSubtle }]}>
          <View style={styles.brandRow}>
            <View style={[styles.brandIconCircle, { backgroundColor: colors.pill, borderColor: colors.border }]}>
              <Feather name="compass" size={16} color={colors.accentGold} />
            </View>
            <View>
              <Text style={[styles.brandTitle, { color: colors.text }]}>DEENHUB</Text>
              <Text style={[styles.brandSubtitle, { color: colors.textMuted }]}>v3.2.0 • Unified Edition</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.skipButton, { backgroundColor: colors.pill }]}
            onPress={handleCompleteWalkthrough}
            activeOpacity={0.7}
          >
            <Text style={[styles.skipButtonText, { color: colors.textMuted }]}>Skip Tour</Text>
          </TouchableOpacity>
        </View>

        {currentStep === 'language' ? (
          /* ─── STEP 1: LANGUAGE SELECTION ─── */
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.welcomeHero}>
              <View style={[styles.heroIconBadge, { backgroundColor: colors.pill, borderColor: colors.border }]}>
                <Feather name="globe" size={28} color={colors.accentGold} />
              </View>
              <Text style={[styles.welcomeHeading, { color: colors.text }]}>Select Your Language</Text>
              <Text style={[styles.welcomeUrduText, { color: colors.accentGold }]}>اپنی پسندیدہ زبان منتخب کریں</Text>
              <Text style={[styles.welcomeSubtext, { color: colors.textMuted }]}>
                Choose your primary language for Quran translations, supplications, and app notifications. You can change this anytime in Settings.
              </Text>
            </View>

            {/* 3 Default Languages Cards */}
            <View style={styles.languageCardsContainer}>
              {SUPPORTED_LANGUAGES.map((lang, idx) => {
                const isSelected = selectedLang === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.langCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.borderSubtle,
                      },
                      isSelected && {
                        backgroundColor: colors.cardElevated,
                        borderColor: colors.accentGold,
                        borderWidth: 1.5,
                      },
                    ]}
                    onPress={() => handleSelectLanguage(lang.code)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.langCardLeft}>
                      <View
                        style={[
                          styles.langIndexBadge,
                          { backgroundColor: colors.pill },
                          isSelected && { backgroundColor: 'rgba(226, 162, 59, 0.2)' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.langIndexText,
                            { color: colors.textMuted },
                            isSelected && { color: colors.accentGold },
                          ]}
                        >
                          #{idx + 1}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.langNameRow}>
                          <Text
                            style={[
                              styles.langNativeName,
                              { color: colors.text },
                              isSelected && { color: colors.accentSoft },
                            ]}
                          >
                            {lang.nativeName}
                          </Text>
                          <Text style={[styles.langEnglishName, { color: colors.textMuted }]}>({lang.name})</Text>
                        </View>
                        <Text style={[styles.langDescription, { color: colors.textMuted }]}>{lang.sublabel}</Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.radioButton,
                        { borderColor: colors.borderSubtle },
                        isSelected && { borderColor: colors.accentGold },
                      ]}
                    >
                      {isSelected && <View style={[styles.radioButtonInner, { backgroundColor: colors.accentGold }]} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.primaryActionButton, { backgroundColor: colors.accentGoldBg }]}
              onPress={handleConfirmLanguage}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryActionButtonText}>Continue to App Tour</Text>
              <Feather name="arrow-right" size={16} color="#0f1718" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </ScrollView>
        ) : (
          /* ─── STEP 2: GUIDED WALKTHROUGH SLIDES ─── */
          <View style={styles.slidesWrapper}>
            {/* Slide Progress Indicator */}
            <View style={styles.progressBarContainer}>
              {activeSlides.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressSegment,
                    { backgroundColor: colors.pill },
                    i <= currentSlideIndex && { backgroundColor: colors.accentGold },
                  ]}
                />
              ))}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Slide Hero Card */}
              <View style={styles.slideHero}>
                <View style={[styles.slideIconCircle, { backgroundColor: colors.pill, borderColor: colors.border }]}>
                  <Feather name={currentSlide.icon} size={32} color={colors.accentGold} />
                </View>

                <View style={[styles.slideBadge, { backgroundColor: colors.pill, borderColor: colors.border }]}>
                  <Text style={[styles.slideBadgeText, { color: colors.accentGold }]}>{currentSlide.badge}</Text>
                </View>

                <Text style={[styles.slideTitle, { color: colors.text }]}>{currentSlide.title}</Text>
                <Text style={[styles.slideSubtitle, { color: colors.textMuted }]}>{currentSlide.subtitle}</Text>
              </View>

              {/* Highlights Feature Cards */}
              <View style={styles.highlightsContainer}>
                {currentSlide.highlights.map((h, i) => (
                  <View
                    key={i}
                    style={[styles.highlightCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
                  >
                    <View
                      style={[
                        styles.highlightIconBox,
                        { backgroundColor: colors.cardElevated, borderColor: colors.border },
                      ]}
                    >
                      <Feather name={h.icon} size={16} color={colors.accentGold} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.highlightTitle, { color: colors.accentSoft }]}>{h.title}</Text>
                      <Text style={[styles.highlightDescription, { color: colors.textMuted }]}>{h.description}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Masjid Onboarding CTA on Final Slide */}
              {mode === 'masjid_onboarding' && currentSlideIndex === activeSlides.length - 1 && (
                <TouchableOpacity
                  style={[styles.primaryActionButton, { backgroundColor: colors.accentGoldBg, marginTop: 16 }]}
                  onPress={handleTryAddMasjidNow}
                  activeOpacity={0.8}
                >
                  <Feather name="plus-circle" size={16} color="#0f1718" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryActionButtonText}>Try Adding a Masjid Now</Text>
                </TouchableOpacity>
              )}

              {currentSlide.badge === 'Spiritual Well-Being' && (
                <View style={[styles.dnsHelperCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.dnsHelperTitle, { color: colors.accentSoft }]}>
                    Recommended Private DNS Hostname:
                  </Text>
                  <View style={[styles.dnsCopyRow, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle }]}>
                    <Text style={[styles.dnsHostnameText, { color: colors.accentGreen }]} numberOfLines={1}>
                      family-filter-dns.cleanbrowsing.org
                    </Text>
                    <TouchableOpacity
                      style={[styles.dnsCopyBtn, { backgroundColor: colors.accentGoldBg }]}
                      onPress={() => {
                        Alert.alert(
                          'How to Enable 18+ Protection',
                          'To block adult content across your entire phone:\n\n1. Open your Android Settings app.\n2. Tap Connections (or Network & Internet).\n3. Tap More connection settings -> Private DNS.\n4. Select "Private DNS provider hostname".\n5. Enter:\nfamily-filter-dns.cleanbrowsing.org\n6. Tap Save.\n\nAdult content is now permanently blocked across all browsers, Incognito tabs, and Samsung Secure Folder with zero speed penalty!'
                        );
                      }}
                      activeOpacity={0.8}
                    >
                      <Feather name="info" size={12} color="#0f1718" style={{ marginRight: 4 }} />
                      <Text style={styles.dnsCopyBtnText}>How To Guide</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Bottom Navigation Controls */}
            <View style={[styles.bottomControlBar, { backgroundColor: colors.surface, borderTopColor: colors.borderSubtle }]}>
              <TouchableOpacity
                style={styles.backSlideButton}
                onPress={handlePrevSlide}
                activeOpacity={0.7}
              >
                <Feather name="arrow-left" size={16} color={colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={[styles.backSlideButtonText, { color: colors.textMuted }]}>Back</Text>
              </TouchableOpacity>

              <View style={styles.dotsRow}>
                {activeSlides.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      { backgroundColor: colors.pill },
                      i === currentSlideIndex && [styles.dotActive, { backgroundColor: colors.accentGold }],
                    ]}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.nextSlideButton, { backgroundColor: colors.accentGoldBg }]}
                onPress={handleNextSlide}
                activeOpacity={0.8}
              >
                <Text style={styles.nextSlideButtonText}>
                  {currentSlideIndex === activeSlides.length - 1 ? 'Get Started' : 'Next'}
                </Text>
                <Feather
                  name={currentSlideIndex === activeSlides.length - 1 ? 'check' : 'arrow-right'}
                  size={15}
                  color="#0f1718"
                  style={{ marginLeft: 6 }}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1718',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(226, 162, 59, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    fontSize: 10,
    color: '#94a4a2',
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  skipButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a4a2',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  welcomeHero: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
  },
  heroIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(226, 162, 59, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  welcomeHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  welcomeUrduText: {
    fontSize: 16,
    color: '#e2a23b',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'normal',
  },
  welcomeSubtext: {
    fontSize: 13,
    color: '#94a4a2',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
  },
  languageCardsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0b2527',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  langCardSelected: {
    backgroundColor: '#0c3033',
    borderColor: '#e2a23b',
    borderWidth: 1.5,
  },
  langCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
    gap: 12,
  },
  langIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  langIndexBadgeSelected: {
    backgroundColor: 'rgba(226, 162, 59, 0.2)',
  },
  langIndexText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a4a2',
  },
  langIndexTextSelected: {
    color: '#e2a23b',
  },
  langNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  langNativeName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  langNativeNameSelected: {
    color: '#ffdda8',
  },
  langEnglishName: {
    fontSize: 13,
    color: '#94a4a2',
  },
  langDescription: {
    fontSize: 11,
    color: '#7b9291',
    lineHeight: 15,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#e2a23b',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e2a23b',
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2a23b',
    borderRadius: 12,
    paddingVertical: 14,
    shadowColor: '#e2a23b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f1718',
  },

  // Slides Layout
  slidesWrapper: {
    flex: 1,
  },
  progressBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 6,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressSegmentActive: {
    backgroundColor: '#e2a23b',
  },
  slideHero: {
    alignItems: 'center',
    marginBottom: 18,
    paddingVertical: 10,
  },
  slideIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(226, 162, 59, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  slideBadge: {
    backgroundColor: 'rgba(226, 162, 59, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.25)',
  },
  slideBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#e2a23b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  slideTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  slideSubtitle: {
    fontSize: 13,
    color: '#94a4a2',
    textAlign: 'center',
  },
  highlightsContainer: {
    gap: 10,
    marginBottom: 20,
  },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#0b2527',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  highlightIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#0c3033',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.25)',
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffdda8',
    marginBottom: 2,
  },
  highlightDescription: {
    fontSize: 12,
    color: '#94a4a2',
    lineHeight: 16,
  },
  dnsHelperCard: {
    backgroundColor: '#0c3033',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.35)',
    marginBottom: 20,
  },
  dnsHelperTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffdda8',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dnsCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#071f21',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#0b383b',
    gap: 8,
  },
  dnsHostnameText: {
    fontSize: 11,
    color: '#00ff66',
    fontWeight: '700',
    flex: 1,
  },
  dnsCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e2a23b',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  dnsCopyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f1718',
  },
  bottomControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#091516',
  },
  backSlideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backSlideButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a4a2',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dotActive: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e2a23b',
  },
  nextSlideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e2a23b',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  nextSlideButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f1718',
  },
});
