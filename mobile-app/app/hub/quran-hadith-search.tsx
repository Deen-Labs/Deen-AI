import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../lib/theme';
import { useResponsiveLayout } from '../../lib/responsive';
import { audioPlayer, getSurahAudioUrls } from '../../lib/audioPlayer';
import { shareDeenContent } from '../../lib/shareHelper';
import { getAppLanguage } from '../../lib/onboarding';
import {
  ALL_114_SURAHS,
  SurahMeta,
  AyahVerseItem,
  fetchSurahVerses,
  EXPANDED_HADITH_BANK,
  CuratedHadith,
  ArchiveBookItem,
  searchInternetArchiveScholarlyBooks,
} from '../../lib/quranData';

const LAST_READ_AYAH_KEY = '@deen_last_read_ayah_v1';

type SearchTab = 'ayat' | 'hadith' | 'listen';
type AyatLanguage = 'English' | 'Urdu' | 'Hinglish' | 'Hindi' | 'Telugu';
type QuranSubTab = 'browser' | 'search';
type HadithSubTab = 'hadiths' | 'archive';

interface AyatResult {
  surahNumber: number;
  ayahNumber: number;
  surahNameEnglish: string;
  arabicText: string;
  translations: Record<AyatLanguage, string>;
}

const SAMPLE_AYATS: AyatResult[] = [
  {
    surahNumber: 2,
    ayahNumber: 255,
    surahNameEnglish: 'Al-Baqarah (Ayat-ul-Kursi)',
    arabicText: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ',
    translations: {
      English: 'Allah! There is no deity except Him, the Ever-Living, the Sustainer of all existence. Neither drowsiness overtakes Him nor sleep.',
      Urdu: 'اللہ تعالیٰ ہی معبود برحق ہے جس کے سوا کوئی معبود نہیں جو زندہ اور سب کا تھامنے والا ہے، نہ اسے اونگھ آتی ہے نہ نیند۔',
      Hinglish: 'Allah! Uske siwa koi sachha mabood nahi, wo hamesha zinda aur sabka thaamne wala hai.',
      Hindi: 'अल्लाह! उसके सिवा कोई सच्चा पूज्य नहीं, वह सदा जीवित और सबका संभालने वाला है।',
      Telugu: 'అల్లాహ్! ఆయన తప్ప వేరే దైవం లేడు. ఆయన సజీవుడు, సర్వాన్ని నడిపించేవాడు.',
    },
  },
  {
    surahNumber: 94,
    ayahNumber: 5,
    surahNameEnglish: 'Ash-Sharh',
    arabicText: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا',
    translations: {
      English: 'For indeed, with hardship comes ease.',
      Urdu: 'پس یقیناً مشکل کے ساتھ آسانی ہے۔',
      Hinglish: 'Beshaq mushkil ke sath aasaani hai.',
      Hindi: 'निसंदेह कठिनाई के साथ सरलता है।',
      Telugu: 'నిశ్చయంగా కష్టంతో పాటు సుఖం ఉంటుంది.',
    },
  },
  {
    surahNumber: 2,
    ayahNumber: 153,
    surahNameEnglish: 'Al-Baqarah',
    arabicText: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ',
    translations: {
      English: 'O you who have believed, seek help through patience and prayer. Indeed, Allah is with the patient.',
      Urdu: 'اے ایمان والو! صبر اور نماز کے ذریعہ مدد چاہو، یقیناً اللہ تعالیٰ صبر کرنے والوں کے ساتھ ہے۔',
      Hinglish: 'Aye imaan walo! Sabr aur Namaz ke zariye madad mango, beshaq Allah sabr karne walo ke sath hai.',
      Hindi: 'हे ईमान लाने वालो! धैर्य और नमाज़ से सहायता प्राप्त करो, निस्संदेह अल्लाह धैर्य रखने वालों के साथ है।',
      Telugu: 'విశ్వసించిన ప్రజలారా! ఓర్పు మరియు ప్రార్థనల ద్వారా సహాయం పొందండి.',
    },
  },
];

export default function QuranHadithSearchScreen() {
  const { colors, isDark } = useTheme();
  const { contentContainerStyle } = useResponsiveLayout();
  const [activeTab, setActiveTab] = useState<SearchTab>('ayat');
  const [quranSubTab, setQuranSubTab] = useState<QuranSubTab>('browser');
  const [hadithSubTab, setHadithSubTab] = useState<HadithSubTab>('hadiths');

  // Search queries
  const [surahFilterQuery, setSurahFilterQuery] = useState('');
  const [verseSearchQuery, setVerseSearchQuery] = useState('');
  const [hadithSearchQuery, setHadithSearchQuery] = useState('');
  const [archiveSearchQuery, setArchiveSearchQuery] = useState('');
  const [audioSearchQuery, setAudioSearchQuery] = useState('');

  // Selected language for translations
  const [ayatLanguage, setAyatLanguage] = useState<AyatLanguage>('English');
  const [lastReadAyah, setLastReadAyah] = useState<string | null>(null);

  // Surah Reader Modal State
  const [selectedSurahForReading, setSelectedSurahForReading] = useState<SurahMeta | null>(null);
  const [surahVerses, setSurahVerses] = useState<AyahVerseItem[]>([]);
  const [loadingSurahVerses, setLoadingSurahVerses] = useState(false);
  const [surahError, setSurahError] = useState<string | null>(null);
  const [readerLanguage, setReaderLanguage] = useState<'english' | 'urdu' | 'transliteration'>('english');

  // Online Ayat Search State
  const [liveApiAyats, setLiveApiAyats] = useState<AyatResult[]>([]);
  const [searchingLiveApi, setSearchingLiveApi] = useState<boolean>(false);
  const [apiSearchError, setApiSearchError] = useState<string | null>(null);

  // Hadith Filter
  const [selectedHadithBook, setSelectedHadithBook] = useState<string>('All');

  // Internet Archive Search State
  const [archiveResults, setArchiveResults] = useState<ArchiveBookItem[]>([]);
  const [searchingArchive, setSearchingArchive] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  // Audio player state
  const [playingSurah, setPlayingSurah] = useState<number | null>(null);
  const [bufferingSurah, setBufferingSurah] = useState<number | null>(null);

  useEffect(() => {
    loadLastRead();
    getAppLanguage().then((lang) => {
      if (lang === 'ur') {
        setAyatLanguage('Urdu');
        setReaderLanguage('urdu');
      }
    });
    return () => {
      audioPlayer.stop().catch(() => {});
    };
  }, []);

  const loadLastRead = async () => {
    try {
      const raw = await AsyncStorage.getItem(LAST_READ_AYAH_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setLastReadAyah(`Surah ${parsed.surahNumber || 1}, Ayah ${parsed.ayahNumber || 1}`);
      }
    } catch {}
  };

  const handleOpenSurahReader = async (surah: SurahMeta) => {
    setSelectedSurahForReading(surah);
    setSurahVerses([]);
    setSurahError(null);
    setLoadingSurahVerses(true);

    try {
      const verses = await fetchSurahVerses(surah.number);
      setSurahVerses(verses);
    } catch (err: any) {
      setSurahError(err?.message || 'Failed to load Surah verses. Please check your internet connection.');
    } finally {
      setLoadingSurahVerses(false);
    }
  };

  const handleSaveLastRead = async (surahNum: number, ayahNum: number) => {
    try {
      await AsyncStorage.setItem(
        LAST_READ_AYAH_KEY,
        JSON.stringify({
          surahNumber: surahNum,
          ayahNumber: ayahNum,
          savedAt: new Date().toISOString(),
        })
      );
      setLastReadAyah(`Surah ${surahNum}, Ayah ${ayahNum}`);
      Alert.alert('Bookmark Saved', `Saved [${surahNum}:${ayahNum}] as your last read verse.`);
    } catch {
      Alert.alert('Error', 'Unable to bookmark verse.');
    }
  };

  const handleShareAyatItem = async (item: AyatResult) => {
    await shareDeenContent({
      title: `Ayat [${item.surahNumber}:${item.ayahNumber}] (${item.surahNameEnglish})`,
      arabic: item.arabicText,
      translation: item.translations[ayatLanguage] || item.translations.English,
      source: `Holy Quran — Surah ${item.surahNameEnglish}`,
    });
  };

  const handleShareHadithItem = async (item: CuratedHadith) => {
    await shareDeenContent({
      title: `Hadith — ${item.book} (${item.hadithNumber})`,
      arabic: item.arabic,
      translation: item.english,
      source: `${item.book} • ${item.chapter} (${item.grade})`,
    });
  };

  const handleSearchFullQuran = async () => {
    const q = verseSearchQuery.trim();
    if (q.length < 3) {
      Alert.alert('Query Too Short', 'Please enter at least 3 characters to search the full Quran.');
      return;
    }
    setSearchingLiveApi(true);
    setApiSearchError(null);
    try {
      const isRefMatch = q.match(/^(\d{1,3}):(\d{1,3})$/);
      const results: AyatResult[] = [];
      if (isRefMatch) {
        const url = `https://api.alquran.cloud/v1/ayah/${encodeURIComponent(q)}/editions/quran-uthmani,en.sahih,ur.jalandhry`;
        const res = await fetch(url);
        if (res.ok) {
          const d = await res.json();
          if (Array.isArray(d.data) && d.data.length >= 1) {
            const uthmani = d.data[0];
            const en = d.data[1];
            const ur = d.data[2];
            results.push({
              surahNumber: uthmani.surah?.number || parseInt(isRefMatch[1], 10),
              ayahNumber: uthmani.numberInSurah || parseInt(isRefMatch[2], 10),
              surahNameEnglish: uthmani.surah?.englishName || `Surah ${isRefMatch[1]}`,
              arabicText: uthmani.text || '',
              translations: {
                English: en?.text || '',
                Urdu: ur?.text || '',
                Hinglish: en?.text || '',
                Hindi: en?.text || '',
                Telugu: en?.text || '',
              },
            });
          }
        }
      } else {
        const url = `https://api.alquran.cloud/v1/search/${encodeURIComponent(q)}/all/en`;
        const res = await fetch(url);
        if (res.ok) {
          const d = await res.json();
          if (d.data?.matches && Array.isArray(d.data.matches)) {
            const topMatches = d.data.matches.slice(0, 10);
            for (const m of topMatches) {
              results.push({
                surahNumber: m.surah?.number || 1,
                ayahNumber: m.numberInSurah || 1,
                surahNameEnglish: m.surah?.englishName || `Surah ${m.surah?.number}`,
                arabicText: '',
                translations: {
                  English: m.text || '',
                  Urdu: '',
                  Hinglish: m.text || '',
                  Hindi: m.text || '',
                  Telugu: m.text || '',
                },
              });
            }
          }
        }
      }
      if (results.length === 0) {
        setApiSearchError('No matching verses found in the 6,236 Ayats.');
      } else {
        setLiveApiAyats(results);
      }
    } catch {
      setApiSearchError('Unable to reach Quran API. Please check your internet connection.');
    } finally {
      setSearchingLiveApi(false);
    }
  };

  const handleSearchArchiveBooks = async (overrideQuery?: string) => {
    const q = (overrideQuery !== undefined ? overrideQuery : archiveSearchQuery).trim();
    setSearchingArchive(true);
    setArchiveError(null);
    try {
      const results = await searchInternetArchiveScholarlyBooks(q);
      if (results.length === 0) {
        setArchiveError('No scholarly books found on Internet Archive for this topic.');
      } else {
        setArchiveResults(results);
      }
    } catch {
      setArchiveError('Unable to connect to Internet Archive. Please check your internet connection.');
    } finally {
      setSearchingArchive(false);
    }
  };

  const handleToggleSurahAudio = async (surahNum: number) => {
    if (playingSurah === surahNum || bufferingSurah === surahNum) {
      await audioPlayer.stop();
      setPlayingSurah(null);
      setBufferingSurah(null);
      return;
    }

    setBufferingSurah(surahNum);
    setPlayingSurah(null);

    const { primary, fallback } = getSurahAudioUrls(surahNum);

    const started = await audioPlayer.play(primary, (status) => {
      if (status.isBuffering) {
        setBufferingSurah(surahNum);
        setPlayingSurah(null);
      } else if (status.isPlaying) {
        setBufferingSurah(null);
        setPlayingSurah(surahNum);
      } else if (status.didJustFinish) {
        setBufferingSurah(null);
        setPlayingSurah(null);
      } else if (status.error) {
        audioPlayer.play(fallback, (fbStatus) => {
          if (fbStatus.isBuffering) {
            setBufferingSurah(surahNum);
            setPlayingSurah(null);
          } else if (fbStatus.isPlaying) {
            setBufferingSurah(null);
            setPlayingSurah(surahNum);
          } else if (fbStatus.didJustFinish || fbStatus.error) {
            setBufferingSurah(null);
            setPlayingSurah(null);
            if (fbStatus.error) {
              Alert.alert('Audio Error', 'Unable to stream Surah audio. Please check your internet connection.');
            }
          }
        }).catch(() => {
          setBufferingSurah(null);
          setPlayingSurah(null);
        });
      }
    });

    if (!started) {
      await audioPlayer.play(fallback, (fbStatus) => {
        if (fbStatus.isBuffering) {
          setBufferingSurah(surahNum);
          setPlayingSurah(null);
        } else if (fbStatus.isPlaying) {
          setBufferingSurah(null);
          setPlayingSurah(surahNum);
        } else if (fbStatus.didJustFinish || fbStatus.error) {
          setBufferingSurah(null);
          setPlayingSurah(null);
          if (fbStatus.error) {
            Alert.alert('Audio Error', 'Unable to stream Surah audio. Please check your internet connection.');
          }
        }
      });
    }
  };

  // Filtered lists
  const filteredSurahs = useMemo(() => {
    const q = surahFilterQuery.toLowerCase().trim();
    if (!q) return ALL_114_SURAHS;
    return ALL_114_SURAHS.filter((s) => {
      const matchNum = String(s.number) === q;
      const matchEng = s.english.toLowerCase().includes(q);
      const matchMeaning = s.meaning.toLowerCase().includes(q);
      const matchArabic = s.name.includes(q);
      return matchNum || matchEng || matchMeaning || matchArabic;
    });
  }, [surahFilterQuery]);

  const filteredAyats = useMemo(() => {
    const q = verseSearchQuery.toLowerCase().trim();
    if (!q) return SAMPLE_AYATS;
    return SAMPLE_AYATS.filter((item) => {
      const matchSurah = item.surahNameEnglish.toLowerCase().includes(q);
      const matchRef = `[${item.surahNumber}:${item.ayahNumber}]`.includes(q) || `${item.surahNumber}:${item.ayahNumber}`.includes(q);
      const matchArabic = item.arabicText.includes(q);
      const matchTrans = Object.values(item.translations).some((t) => t.toLowerCase().includes(q));
      return matchSurah || matchRef || matchArabic || matchTrans;
    });
  }, [verseSearchQuery]);

  const filteredHadiths = useMemo(() => {
    let list = EXPANDED_HADITH_BANK;
    if (selectedHadithBook !== 'All') {
      list = list.filter((h) => h.book.toLowerCase().includes(selectedHadithBook.toLowerCase()));
    }
    const q = hadithSearchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter((item) => {
      const matchBook = item.book.toLowerCase().includes(q);
      const matchNum = item.hadithNumber.toLowerCase().includes(q);
      const matchNarrator = item.narrator.toLowerCase().includes(q);
      const matchChapter = item.chapter.toLowerCase().includes(q);
      const matchEng = item.english.toLowerCase().includes(q);
      const matchUrdu = item.urdu ? item.urdu.includes(q) : false;
      const matchArabic = item.arabic.includes(q);
      return matchBook || matchNum || matchNarrator || matchChapter || matchEng || matchUrdu || matchArabic;
    });
  }, [hadithSearchQuery, selectedHadithBook]);

  const filteredAudioSurahs = useMemo(() => {
    const q = audioSearchQuery.toLowerCase().trim();
    if (!q) return ALL_114_SURAHS;
    return ALL_114_SURAHS.filter((s) => {
      return (
        String(s.number) === q ||
        s.english.toLowerCase().includes(q) ||
        s.meaning.toLowerCase().includes(q) ||
        s.name.includes(q)
      );
    });
  }, [audioSearchQuery]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* 3 Top Sub-Tabs */}
      <View style={[styles.topTabBar, { backgroundColor: colors.pill, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.topTabBtn, activeTab === 'ayat' && { backgroundColor: colors.accentGoldBg }]}
          onPress={() => setActiveTab('ayat')}
          activeOpacity={0.8}
        >
          <Feather
            name="book"
            size={12}
            color={activeTab === 'ayat' ? '#0f1718' : colors.text}
            style={{ marginRight: 4 }}
          />
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[styles.topTabText, { color: colors.text }, activeTab === 'ayat' && { color: '#0f1718', fontWeight: '700' }]}
          >
            Holy Quran
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTabBtn, activeTab === 'hadith' && { backgroundColor: colors.accentGoldBg }]}
          onPress={() => setActiveTab('hadith')}
          activeOpacity={0.8}
        >
          <Feather
            name="award"
            size={12}
            color={activeTab === 'hadith' ? '#0f1718' : colors.text}
            style={{ marginRight: 4 }}
          />
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[styles.topTabText, { color: colors.text }, activeTab === 'hadith' && { color: '#0f1718', fontWeight: '700' }]}
          >
            Hadith & Library
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTabBtn, activeTab === 'listen' && { backgroundColor: colors.accentGoldBg }]}
          onPress={() => setActiveTab('listen')}
          activeOpacity={0.8}
        >
          <Feather
            name="headphones"
            size={12}
            color={activeTab === 'listen' ? '#0f1718' : colors.text}
            style={{ marginRight: 4 }}
          />
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[styles.topTabText, { color: colors.text }, activeTab === 'listen' && { color: '#0f1718', fontWeight: '700' }]}
          >
            Listen Quran
          </Text>
        </TouchableOpacity>
      </View>

      {/* ══════════════════════════════════════════════════════════
          TAB 1: HOLY QURAN (BROWSER & AYAT SEARCH)
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'ayat' && (
        <View style={{ flex: 1 }}>
          {/* Submode Switcher: 114 Surahs Browser vs Ayat Keyword Search */}
          <View style={[styles.subModeBar, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <TouchableOpacity
              style={[
                styles.subModeBtn,
                quranSubTab === 'browser' && { backgroundColor: colors.accentGoldBg },
              ]}
              onPress={() => setQuranSubTab('browser')}
              activeOpacity={0.8}
            >
              <Feather
                name="grid"
                size={12}
                color={quranSubTab === 'browser' ? '#0f1718' : colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.subModeBtnText,
                  { color: quranSubTab === 'browser' ? '#0f1718' : colors.textMuted },
                  quranSubTab === 'browser' && { fontWeight: '700' },
                ]}
              >
                114 Surahs Browser
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.subModeBtn,
                quranSubTab === 'search' && { backgroundColor: colors.accentGoldBg },
              ]}
              onPress={() => setQuranSubTab('search')}
              activeOpacity={0.8}
            >
              <Feather
                name="search"
                size={12}
                color={quranSubTab === 'search' ? '#0f1718' : colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.subModeBtnText,
                  { color: quranSubTab === 'search' ? '#0f1718' : colors.textMuted },
                  quranSubTab === 'search' && { fontWeight: '700' },
                ]}
              >
                Verse & Topic Search
              </Text>
            </TouchableOpacity>
          </View>

          {/* Submode 1: 114 Surahs Browser */}
          {quranSubTab === 'browser' && (
            <ScrollView contentContainerStyle={[styles.tabContent, contentContainerStyle]}>
              {/* Last Read Ayah Banner */}
              {lastReadAyah && (
                <View style={[styles.bookmarkBanner, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                  <Feather name="bookmark" size={13} color={colors.accentGreen} style={{ marginRight: 6 }} />
                  <Text style={[styles.bookmarkText, { color: colors.accentGreen }]}>Last Read Ayah: {lastReadAyah}</Text>
                </View>
              )}

              {/* Filter Search Bar */}
              <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
                <Feather name="search" size={14} color={colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Filter by Surah number, English, or Arabic name..."
                  placeholderTextColor={colors.textMuted}
                  value={surahFilterQuery}
                  onChangeText={setSurahFilterQuery}
                />
              </View>

              <Text style={[styles.sectionMetaHeading, { color: colors.textMuted }]}>
                Showing {filteredSurahs.length} of 114 Surahs (Tap to read full verses):
              </Text>

              {filteredSurahs.map((surah) => (
                <TouchableOpacity
                  key={surah.number}
                  style={[styles.surahBrowseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleOpenSurahReader(surah)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.surahNumberCircle, { backgroundColor: colors.pill }]}>
                    <Text style={[styles.surahNumberCircleText, { color: colors.accentGold }]}>{surah.number}</Text>
                  </View>

                  <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={[styles.surahTitle, { color: colors.text }]}>{surah.english}</Text>
                      <Text style={[styles.arabicSurahName, { color: colors.accentSoft }]}>{surah.name}</Text>
                    </View>
                    <Text style={[styles.surahSubTitle, { color: colors.textMuted }]}>
                      {surah.meaning} • {surah.verses} Verses • {surah.revelationType}
                    </Text>
                  </View>

                  <Feather name="chevron-right" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Submode 2: Verse & Topic Search */}
          {quranSubTab === 'search' && (
            <ScrollView contentContainerStyle={[styles.tabContent, contentContainerStyle]}>
              {/* Last Read Ayah Banner */}
              {lastReadAyah && (
                <View style={[styles.bookmarkBanner, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                  <Feather name="bookmark" size={13} color={colors.accentGreen} style={{ marginRight: 6 }} />
                  <Text style={[styles.bookmarkText, { color: colors.accentGreen }]}>Last Read Ayah: {lastReadAyah}</Text>
                </View>
              )}

              {/* Search Bar */}
              <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
                <Feather name="search" size={14} color={colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search by keyword, topic, or Surah:Ayah (e.g. 2:255)..."
                  placeholderTextColor={colors.textMuted}
                  value={verseSearchQuery}
                  onChangeText={setVerseSearchQuery}
                />
              </View>

              {/* Language Selector */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 2, paddingVertical: 4 }}
                style={{ marginVertical: 8 }}
              >
                {(['English', 'Urdu', 'Hinglish', 'Hindi', 'Telugu'] as AyatLanguage[]).map((lang) => {
                  const isSelected = ayatLanguage === lang;
                  return (
                    <TouchableOpacity
                      key={lang}
                      style={[
                        styles.langPill,
                        {
                          backgroundColor: isSelected ? colors.accentGoldBg : colors.surface,
                          borderColor: isSelected ? colors.accentGold : colors.border,
                        },
                      ]}
                      onPress={() => setAyatLanguage(lang)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.langPillText,
                          {
                            color: isSelected ? '#0f1718' : colors.text,
                            fontWeight: isSelected ? '700' : '600',
                          },
                        ]}
                      >
                        {lang}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Search Full Quran CTA Banner */}
              {verseSearchQuery.trim().length >= 3 && (
                <TouchableOpacity
                  style={[styles.searchFullQuranBtn, { backgroundColor: colors.accentGold }]}
                  onPress={handleSearchFullQuran}
                  disabled={searchingLiveApi}
                  activeOpacity={0.8}
                >
                  {searchingLiveApi ? (
                    <ActivityIndicator size="small" color="#0f1718" />
                  ) : (
                    <>
                      <Feather name="globe" size={13} color="#0f1718" style={{ marginRight: 6 }} />
                      <Text style={[styles.searchFullQuranBtnText, { color: '#0f1718' }]}>
                        Search Full Quran (6,236 Ayats) for "{verseSearchQuery.trim()}"
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {apiSearchError ? (
                <View style={styles.apiErrorBox}>
                  <Feather name="info" size={13} color="#ef4444" style={{ marginRight: 6 }} />
                  <Text style={styles.apiErrorText}>{apiSearchError}</Text>
                </View>
              ) : null}

              {/* Live API Results */}
              {liveApiAyats.length > 0 && (
                <View style={styles.liveApiSectionHeader}>
                  <Feather name="check-circle" size={12} color={colors.accentGreen} style={{ marginRight: 4 }} />
                  <Text style={[styles.liveApiSectionTitle, { color: colors.accentGreen }]}>Online Quran Search Results ({liveApiAyats.length}):</Text>
                </View>
              )}

              {liveApiAyats.map((item, idx) => (
                <View key={`live-${idx}`} style={[styles.itemCard, styles.liveItemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.itemHeader}>
                    <View style={[styles.surahTag, { backgroundColor: colors.pill, borderColor: colors.border }]}>
                      <Text style={[styles.surahTagText, { color: colors.accentGold }]}>
                        [{item.surahNumber}:{item.ayahNumber}] {item.surahNameEnglish}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TouchableOpacity
                        style={[styles.saveBookmarkBtn, { backgroundColor: colors.pill, borderColor: colors.borderSubtle }]}
                        onPress={() => handleShareAyatItem(item)}
                        activeOpacity={0.7}
                      >
                        <Feather name="share-2" size={12} color={colors.accentGold} style={{ marginRight: 4 }} />
                        <Text style={[styles.saveBookmarkBtnText, { color: colors.accentGold }]}>Share</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.saveBookmarkBtn, { backgroundColor: colors.pill, borderColor: colors.borderSubtle }]}
                        onPress={() => handleSaveLastRead(item.surahNumber, item.ayahNumber)}
                        activeOpacity={0.7}
                      >
                        <Feather name="bookmark" size={12} color={colors.accentGold} style={{ marginRight: 4 }} />
                        <Text style={[styles.saveBookmarkBtnText, { color: colors.accentGold }]}>Bookmark</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {item.arabicText ? (
                    <Text style={[styles.arabicVerseText, { color: colors.accentSoft }]}>{item.arabicText}</Text>
                  ) : null}

                  <Text style={[styles.translationText, { color: colors.textSecondary }]}>
                    "{item.translations[ayatLanguage] || item.translations.English}"
                  </Text>
                </View>
              ))}

              {/* Local Curated Ayats */}
              {filteredAyats.map((item, idx) => (
                <View key={idx} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.itemHeader}>
                    <View style={[styles.surahTag, { backgroundColor: colors.pill, borderColor: colors.border }]}>
                      <Text style={[styles.surahTagText, { color: colors.accentGold }]}>
                        [{item.surahNumber}:{item.ayahNumber}] {item.surahNameEnglish}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TouchableOpacity
                        style={[styles.saveBookmarkBtn, { backgroundColor: colors.pill, borderColor: colors.borderSubtle }]}
                        onPress={() => handleShareAyatItem(item)}
                        activeOpacity={0.7}
                      >
                        <Feather name="share-2" size={12} color={colors.accentGold} style={{ marginRight: 4 }} />
                        <Text style={[styles.saveBookmarkBtnText, { color: colors.accentGold }]}>Share</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.saveBookmarkBtn, { backgroundColor: colors.pill, borderColor: colors.borderSubtle }]}
                        onPress={() => handleSaveLastRead(item.surahNumber, item.ayahNumber)}
                        activeOpacity={0.7}
                      >
                        <Feather name="bookmark" size={12} color={colors.accentGold} style={{ marginRight: 4 }} />
                        <Text style={[styles.saveBookmarkBtnText, { color: colors.accentGold }]}>Bookmark</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={[styles.arabicVerseText, { color: colors.accentSoft }]}>{item.arabicText}</Text>

                  <Text style={[styles.translationText, { color: colors.textSecondary }, ayatLanguage === 'Urdu' && { textAlign: 'right' }]}>
                    "{item.translations[ayatLanguage] || item.translations.English}"
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2: HADITH SEARCH & INTERNET ARCHIVE SCHOLARLY LIBRARY
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'hadith' && (
        <View style={{ flex: 1 }}>
          {/* Submode Switcher: Authentic Hadith Bank vs Internet Archive Classical Library */}
          <View style={[styles.subModeBar, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <TouchableOpacity
              style={[
                styles.subModeBtn,
                hadithSubTab === 'hadiths' && { backgroundColor: colors.accentGoldBg },
              ]}
              onPress={() => setHadithSubTab('hadiths')}
              activeOpacity={0.8}
            >
              <Feather
                name="book-open"
                size={12}
                color={hadithSubTab === 'hadiths' ? '#0f1718' : colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.subModeBtnText,
                  { color: hadithSubTab === 'hadiths' ? '#0f1718' : colors.textMuted },
                  hadithSubTab === 'hadiths' && { fontWeight: '700' },
                ]}
              >
                Hadith Collections (6 Books)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.subModeBtn,
                hadithSubTab === 'archive' && { backgroundColor: colors.accentGoldBg },
              ]}
              onPress={() => setHadithSubTab('archive')}
              activeOpacity={0.8}
            >
              <Feather
                name="external-link"
                size={12}
                color={hadithSubTab === 'archive' ? '#0f1718' : colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.subModeBtnText,
                  { color: hadithSubTab === 'archive' ? '#0f1718' : colors.textMuted },
                  hadithSubTab === 'archive' && { fontWeight: '700' },
                ]}
              >
                Classical Scholarly Books
              </Text>
            </TouchableOpacity>
          </View>

          {/* Submode 1: 6 Canonical Hadith Collections */}
          {hadithSubTab === 'hadiths' && (
            <ScrollView contentContainerStyle={[styles.tabContent, contentContainerStyle]}>
              {/* Search Bar */}
              <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
                <Feather name="search" size={14} color={colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search Sahih al-Bukhari, Muslim, Tirmidhi, topic, narrator..."
                  placeholderTextColor={colors.textMuted}
                  value={hadithSearchQuery}
                  onChangeText={setHadithSearchQuery}
                />
              </View>

              {/* Book Filter Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 2, paddingVertical: 4 }}
                style={{ marginVertical: 6 }}
              >
                {['All', 'Bukhari', 'Muslim', 'Abu Dawud', 'Tirmidhi', 'Nasa\'i', 'Ibn Majah'].map((book) => {
                  const isSelected = selectedHadithBook === book;
                  return (
                    <TouchableOpacity
                      key={book}
                      style={[
                        styles.langPill,
                        {
                          backgroundColor: isSelected ? colors.accentGoldBg : colors.surface,
                          borderColor: isSelected ? colors.accentGold : colors.border,
                        },
                      ]}
                      onPress={() => setSelectedHadithBook(book)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.langPillText,
                          {
                            color: isSelected ? '#0f1718' : colors.text,
                            fontWeight: isSelected ? '700' : '600',
                          },
                        ]}
                      >
                        {book}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.hadithBooksRow}>
                <Text style={[styles.hadithBooksSubtext, { color: colors.textMuted }]}>
                  Showing {filteredHadiths.length} authentic narrations with Arabic, English & Urdu:
                </Text>
              </View>

              {filteredHadiths.map((item) => (
                <View key={item.id} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.itemHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                      <Text style={[styles.bookTitle, { color: colors.accentGold }]}>{item.book}</Text>
                      <Text style={[styles.hadithNumberText, { color: colors.textMuted }]}>• Hadith {item.hadithNumber}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.gradeBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                        <Text style={[styles.gradeBadgeText, { color: colors.accentGreen }]}>{item.grade}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.saveBookmarkBtn, { backgroundColor: colors.pill, borderColor: colors.borderSubtle, paddingHorizontal: 6, paddingVertical: 3 }]}
                        onPress={() => handleShareHadithItem(item)}
                        activeOpacity={0.7}
                      >
                        <Feather name="share-2" size={12} color={colors.accentGold} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={[styles.narratorText, { color: colors.textMuted }]}>Narrated by {item.narrator} — [{item.chapter}]</Text>

                  <Text style={[styles.arabicVerseText, { color: colors.accentSoft }]}>{item.arabic}</Text>

                  <Text style={[styles.translationText, { color: colors.textSecondary }]}>"{item.english}"</Text>

                  {item.urdu && (
                    <Text style={[styles.translationText, { textAlign: 'right', color: colors.accentSoft, marginTop: 4 }]}>
                      "{item.urdu}"
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          )}

          {/* Submode 2: Internet Archive Classical Scholarly Library */}
          {hadithSubTab === 'archive' && (
            <ScrollView contentContainerStyle={[styles.tabContent, contentContainerStyle]}>
              <View style={[styles.archiveIntroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="book" size={20} color={colors.accentGold} style={{ marginBottom: 6 }} />
                <Text style={[styles.archiveIntroTitle, { color: colors.text }]}>
                  Classical Islamic Library (archive.org)
                </Text>
                <Text style={[styles.archiveIntroDesc, { color: colors.textMuted }]}>
                  Search tens of thousands of verified public domain classical Islamic manuscripts, Hadith commentaries, and Tafsir volumes on the Internet Archive with direct reader links.
                </Text>
              </View>

              {/* Search Bar */}
              <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
                <Feather name="search" size={14} color={colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search e.g., Ibn Kathir, Fath al-Bari, Nawawi..."
                  placeholderTextColor={colors.textMuted}
                  value={archiveSearchQuery}
                  onChangeText={setArchiveSearchQuery}
                  onSubmitEditing={() => handleSearchArchiveBooks()}
                />
              </View>

              {/* Quick Search Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 2, paddingVertical: 4 }}
                style={{ marginVertical: 6 }}
              >
                {[
                  'Sahih Bukhari Commentary',
                  'Tafsir Ibn Kathir',
                  'Riyad as-Salihin',
                  'Imam Nawawi 40 Hadith',
                  'Mishkat al-Masabih',
                  'Tafsir al-Qurtubi',
                ].map((topic) => (
                  <TouchableOpacity
                    key={topic}
                    style={[styles.langPill, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => {
                      setArchiveSearchQuery(topic);
                      handleSearchArchiveBooks(topic);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.langPillText, { color: colors.accentGold }]}>{topic}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={[styles.searchFullQuranBtn, { backgroundColor: colors.accentGoldBg, marginTop: 4 }]}
                onPress={() => handleSearchArchiveBooks()}
                disabled={searchingArchive}
                activeOpacity={0.8}
              >
                {searchingArchive ? (
                  <ActivityIndicator size="small" color="#0f1718" />
                ) : (
                  <>
                    <Feather name="search" size={14} color="#0f1718" style={{ marginRight: 6 }} />
                    <Text style={[styles.searchFullQuranBtnText, { color: '#0f1718' }]}>
                      Search Classical Islamic Books
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {archiveError ? (
                <View style={styles.apiErrorBox}>
                  <Feather name="info" size={13} color="#ef4444" style={{ marginRight: 6 }} />
                  <Text style={styles.apiErrorText}>{archiveError}</Text>
                </View>
              ) : null}

              {archiveResults.map((book) => (
                <View key={book.identifier} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.itemHeader}>
                    <Text style={[styles.bookTitle, { color: colors.accentGold, flex: 1 }]} numberOfLines={2}>
                      {book.title}
                    </Text>
                    {book.year && (
                      <View style={[styles.gradeBadge, { backgroundColor: colors.pill, borderColor: colors.border }]}>
                        <Text style={[styles.gradeBadgeText, { color: colors.textMuted }]}>{book.year}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.narratorText, { color: colors.textSecondary }]}>
                    Scholar / Author: {book.creator || 'Classical Scholar'}
                  </Text>

                  {book.description ? (
                    <Text style={[styles.translationText, { color: colors.textMuted, marginTop: 4 }]} numberOfLines={3}>
                      {book.description}
                    </Text>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.openArchiveBtn, { backgroundColor: colors.accentGoldBg }]}
                    onPress={() => Linking.openURL(book.url)}
                    activeOpacity={0.8}
                  >
                    <Feather name="external-link" size={13} color="#0f1718" style={{ marginRight: 6 }} />
                    <Text style={styles.openArchiveBtnText}>Open Text on Internet Archive</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 3: LISTEN QURAN (ALL 114 SURAHS HIGH-FIDELITY STREAM)
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'listen' && (
        <ScrollView contentContainerStyle={[styles.tabContent, contentContainerStyle]}>
          <View style={[styles.reciterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="mic" size={16} color={colors.accentGold} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.reciterTitle, { color: colors.text }]}>Qari Mishary Rashid Alafasy</Text>
              <Text style={[styles.reciterSub, { color: colors.textMuted }]}>
                Complete 114 Surahs • High-fidelity audio stream (QuranicAudio CDN)
              </Text>
            </View>
          </View>

          {/* Search bar for audio surahs */}
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
            <Feather name="search" size={14} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Filter audio Surahs by name or number..."
              placeholderTextColor={colors.textMuted}
              value={audioSearchQuery}
              onChangeText={setAudioSearchQuery}
            />
          </View>

          <Text style={[styles.surahListHeading, { color: colors.text }]}>
            Select Surah to Stream ({filteredAudioSurahs.length} of 114 Surahs):
          </Text>

          {filteredAudioSurahs.map((surah) => {
            const isPlaying = playingSurah === surah.number;
            const isBuffering = bufferingSurah === surah.number;
            return (
              <View key={surah.number} style={[styles.surahRowCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.surahNumberCircle, { backgroundColor: colors.pill }]}>
                  <Text style={[styles.surahNumberCircleText, { color: colors.accentGold }]}>{surah.number}</Text>
                </View>

                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={[styles.surahTitle, { color: colors.text }]}>{surah.english}</Text>
                    <Text style={[styles.arabicSurahName, { color: colors.accentSoft }]}>{surah.name}</Text>
                  </View>
                  <Text style={[styles.surahSubTitle, { color: colors.textMuted }]}>
                    {surah.meaning} • {surah.verses} Verses
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.audioPlayBtn,
                    { backgroundColor: colors.pill, borderColor: colors.border },
                    isPlaying && { backgroundColor: colors.accentGold, borderColor: colors.accentGold },
                    isBuffering && styles.audioPlayBtnBuffering,
                  ]}
                  onPress={() => handleToggleSurahAudio(surah.number)}
                  activeOpacity={0.8}
                >
                  {isBuffering ? (
                    <ActivityIndicator size="small" color={colors.accentGold} style={{ marginRight: 4 }} />
                  ) : (
                    <Feather
                      name={isPlaying ? 'pause' : 'play'}
                      size={14}
                      color={isPlaying ? '#0f1718' : colors.accentGold}
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text style={[styles.audioPlayBtnText, { color: isPlaying ? '#0f1718' : colors.accentGold }]}>
                    {isBuffering ? 'Buffering...' : isPlaying ? 'Playing' : 'Listen'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════════
          SURAH READER MODAL (FULL 114 SURAH VERSES + OFFLINE CACHE)
      ══════════════════════════════════════════════════════════ */}
      <Modal
        visible={selectedSurahForReading !== null}
        animationType="slide"
        onRequestClose={() => setSelectedSurahForReading(null)}
      >
        <SafeAreaView style={[styles.readerModalContainer, { backgroundColor: colors.background }]}>
          {/* Reader Header */}
          <View style={[styles.readerHeader, { borderBottomColor: colors.borderSubtle }]}>
            <TouchableOpacity
              style={[styles.readerCloseBtn, { backgroundColor: colors.pill }]}
              onPress={() => setSelectedSurahForReading(null)}
              activeOpacity={0.7}
            >
              <Feather name="arrow-left" size={20} color={colors.accentGold} />
            </TouchableOpacity>

            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={[styles.readerSurahTitle, { color: colors.text }]} numberOfLines={1}>
                {selectedSurahForReading?.number}. {selectedSurahForReading?.english} ({selectedSurahForReading?.name})
              </Text>
              <Text style={[styles.readerSurahSubtitle, { color: colors.textMuted }]}>
                {selectedSurahForReading?.meaning} • {selectedSurahForReading?.verses} Ayahs • {selectedSurahForReading?.revelationType}
              </Text>
            </View>
          </View>

          {/* Reader Translation Controls */}
          <View style={[styles.readerControlRow, { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle }]}>
            <Text style={[styles.readerLangLabel, { color: colors.textMuted }]}>Translation:</Text>
            {(['english', 'urdu', 'transliteration'] as const).map((mode) => {
              const active = readerLanguage === mode;
              const label = mode === 'english' ? 'English (Asad)' : mode === 'urdu' ? 'اردو (جالندھری)' : 'Transliteration';
              return (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.readerLangPill,
                    { backgroundColor: active ? colors.accentGoldBg : colors.card, borderColor: active ? colors.accentGold : colors.borderSubtle },
                  ]}
                  onPress={() => setReaderLanguage(mode)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.readerLangPillText, { color: active ? '#0f1718' : colors.text, fontWeight: active ? '700' : '500' }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Loading or Verses */}
          {loadingSurahVerses ? (
            <View style={styles.readerLoadingBox}>
              <ActivityIndicator size="large" color={colors.accentGold} />
              <Text style={[styles.readerLoadingText, { color: colors.textMuted }]}>
                Loading Surah {selectedSurahForReading?.english} verses...
              </Text>
            </View>
          ) : surahError ? (
            <View style={styles.readerErrorBox}>
              <Feather name="alert-circle" size={24} color="#ef4444" style={{ marginBottom: 8 }} />
              <Text style={[styles.readerErrorText, { color: colors.text }]}>{surahError}</Text>
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: colors.accentGoldBg }]}
                onPress={() => selectedSurahForReading && handleOpenSurahReader(selectedSurahForReading)}
                activeOpacity={0.8}
              >
                <Text style={styles.retryBtnText}>Retry Download</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView contentContainerStyle={[styles.readerScrollContent, contentContainerStyle]}>
              {/* Bismillah Banner for non-Tawba Surahs */}
              {selectedSurahForReading?.number !== 9 && (
                <View style={[styles.bismillahBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.bismillahText, { color: colors.accentGold }]}>
                    بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                  </Text>
                  <Text style={[styles.bismillahTranslation, { color: colors.textMuted }]}>
                    In the name of Allah, the Entirely Merciful, the Especially Merciful.
                  </Text>
                </View>
              )}

              {surahVerses.map((verse) => {
                const transText =
                  readerLanguage === 'urdu'
                    ? verse.urdu
                    : readerLanguage === 'transliteration'
                    ? verse.transliteration || verse.english
                    : verse.english;

                return (
                  <View
                    key={verse.numberInSurah}
                    style={[styles.readerAyahCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
                  >
                    <View style={styles.readerAyahHeader}>
                      <View style={[styles.surahTag, { backgroundColor: colors.pill, borderColor: colors.border }]}>
                        <Text style={[styles.surahTagText, { color: colors.accentGold }]}>
                          Ayah {verse.numberInSurah}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity
                          style={[styles.saveBookmarkBtn, { backgroundColor: colors.pill, borderColor: colors.borderSubtle }]}
                          onPress={() => {
                            if (selectedSurahForReading) {
                              shareDeenContent({
                                title: `${selectedSurahForReading.english} [${selectedSurahForReading.number}:${verse.numberInSurah}]`,
                                arabic: verse.arabic,
                                translation: transText,
                                source: `Surah ${selectedSurahForReading.english}`,
                              });
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Feather name="share-2" size={12} color={colors.accentGold} style={{ marginRight: 4 }} />
                          <Text style={[styles.saveBookmarkBtnText, { color: colors.accentGold }]}>Share</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.saveBookmarkBtn, { backgroundColor: colors.pill, borderColor: colors.borderSubtle }]}
                          onPress={() => {
                            if (selectedSurahForReading) {
                              handleSaveLastRead(selectedSurahForReading.number, verse.numberInSurah);
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Feather name="bookmark" size={12} color={colors.accentGold} style={{ marginRight: 4 }} />
                          <Text style={[styles.saveBookmarkBtnText, { color: colors.accentGold }]}>Bookmark</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={[styles.readerArabicText, { color: colors.accentSoft }]}>
                      {verse.arabic}
                    </Text>

                    <Text
                      style={[
                        styles.readerTranslationText,
                        { color: colors.textSecondary },
                        readerLanguage === 'urdu' && { textAlign: 'right', fontSize: 16, lineHeight: 26 },
                      ]}
                    >
                      {transText}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1718',
  },
  topTabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
  },
  topTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 9,
  },
  topTabText: {
    fontSize: 12,
    fontWeight: '600',
    includeFontPadding: false,
  },
  subModeBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 2,
  },
  subModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
  },
  subModeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    includeFontPadding: false,
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  bookmarkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  bookmarkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    marginBottom: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  sectionMetaHeading: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
    marginBottom: 10,
  },
  surahBrowseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  arabicSurahName: {
    fontSize: 18,
    fontWeight: '700',
  },
  langPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
  },
  langPillText: {
    fontSize: 11,
  },
  searchFullQuranBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  searchFullQuranBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  apiErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginVertical: 6,
  },
  apiErrorText: {
    color: '#ef4444',
    fontSize: 12,
    flex: 1,
  },
  liveApiSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  liveApiSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  itemCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  liveItemCard: {
    borderWidth: 1.5,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  surahTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  surahTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  saveBookmarkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  saveBookmarkBtnText: {
    fontSize: 10,
    fontWeight: '600',
  },
  arabicVerseText: {
    fontSize: 18,
    lineHeight: 30,
    textAlign: 'right',
    marginBottom: 8,
    fontWeight: '600',
  },
  translationText: {
    fontSize: 13,
    lineHeight: 20,
  },
  hadithBooksRow: {
    marginVertical: 4,
  },
  hadithBooksSubtext: {
    fontSize: 11,
  },
  bookTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  hadithNumberText: {
    fontSize: 12,
  },
  gradeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  gradeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  narratorText: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 6,
  },
  archiveIntroCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  archiveIntroTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  archiveIntroDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  openArchiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  openArchiveBtnText: {
    color: '#0f1718',
    fontSize: 12,
    fontWeight: '700',
  },
  reciterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  reciterTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  reciterSub: {
    fontSize: 11,
    marginTop: 2,
  },
  surahListHeading: {
    fontSize: 13,
    fontWeight: '700',
    marginVertical: 8,
  },
  surahRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  surahNumberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surahNumberCircleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  surahTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  surahSubTitle: {
    fontSize: 11,
    marginTop: 2,
  },
  audioPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 70,
  },
  audioPlayBtnBuffering: {
    opacity: 0.8,
  },
  audioPlayBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  readerModalContainer: {
    flex: 1,
    backgroundColor: '#0f1718',
  },
  readerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  readerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readerSurahTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  readerSurahSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  readerControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  readerLangLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  readerLangPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  readerLangPillText: {
    fontSize: 11,
  },
  readerLoadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  readerLoadingText: {
    fontSize: 13,
    marginTop: 10,
  },
  readerErrorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  readerErrorText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#0f1718',
    fontSize: 12,
    fontWeight: '700',
  },
  readerScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 40,
  },
  bismillahBanner: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  bismillahText: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  bismillahTranslation: {
    fontSize: 12,
    textAlign: 'center',
  },
  readerAyahCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  readerAyahHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  readerArabicText: {
    fontSize: 22,
    lineHeight: 38,
    textAlign: 'right',
    fontWeight: '600',
    marginBottom: 10,
  },
  readerTranslationText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
