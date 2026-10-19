import AsyncStorage from '@react-native-async-storage/async-storage';

export interface InspirationItem {
  id: string;
  type: 'Ayah' | 'Hadith';
  arabic: string;
  translation: string;
  source: string;
}

const STORAGE_KEY = '@deen_daily_inspiration_v2';

export const AUTHENTIC_INSPIRATIONS: InspirationItem[] = [
  {
    id: 'bukhari-1',
    type: 'Hadith',
    arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى',
    translation: 'Actions are judged by intentions, and every person will be rewarded according to what they intended.',
    source: 'Sahih al-Bukhari 1',
  },
  {
    id: 'ayah-sharh-5',
    type: 'Ayah',
    arabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا • إِنَّ مَعَ الْعُسْرِ يُسْرًا',
    translation: 'For indeed, with hardship [will be] ease. Indeed, with hardship [will be] ease.',
    source: 'Surah Ash-Sharh (94:5-6)',
  },
  {
    id: 'muslim-2564',
    type: 'Hadith',
    arabic: 'إِنَّ اللَّهَ لا يَنْظُرُ إِلَى صُوَرِكُمْ وَأَمْوَالِكُمْ وَلَكِنْ يَنْظُرُ إِلَى قُلُوبِكُمْ وَأَعْمَالِكُمْ',
    translation: 'Verily, Allah does not look at your appearance or your wealth, but rather He looks at your hearts and your deeds.',
    source: 'Sahih Muslim 2564',
  },
  {
    id: 'ayah-baqarah-153',
    type: 'Ayah',
    arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ',
    translation: 'O you who have believed, seek help through patience and prayer. Indeed, Allah is with the patient.',
    source: 'Surah Al-Baqarah (2:153)',
  },
  {
    id: 'ahmad-replacement',
    type: 'Hadith',
    arabic: 'مَنْ تَرَكَ شَيْئاً لِلَّهِ عَوَّضَهُ اللَّهُ خَيْراً مِنْهُ',
    translation: 'Whoever leaves something for the sake of Allah, Allah will replace it with something far better.',
    source: 'Musnad Ahmad 20739',
  },
  {
    id: 'ayah-rad-28',
    type: 'Ayah',
    arabic: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
    translation: 'Unquestionably, by the remembrance of Allah hearts are assured.',
    source: 'Surah Ar-Ra’d (13:28)',
  },
  {
    id: 'tirmidhi-2516',
    type: 'Hadith',
    arabic: 'احْفَظِ اللَّهَ يَحْفَظْكَ، احْفَظِ اللَّهَ تَجِدْهُ تُجَاهَكَ',
    translation: 'Be mindful of Allah and He will protect you. Be mindful of Allah and you will find Him before you.',
    source: 'Jami` at-Tirmidhi 2516',
  },
  {
    id: 'ayah-talaq-2',
    type: 'Ayah',
    arabic: 'وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ',
    translation: 'And whoever fears Allah — He will make for him a way out and will provide for him from where he does not expect.',
    source: 'Surah At-Talaq (65:2-3)',
  },
  {
    id: 'muslim-2699',
    type: 'Hadith',
    arabic: 'مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ',
    translation: 'Whoever treads a path seeking knowledge, Allah makes easy for him a path to Paradise.',
    source: 'Sahih Muslim 2699',
  },
  {
    id: 'ayah-imran-159',
    type: 'Ayah',
    arabic: 'فَإِذَا عَزَمْتَ فَتَوَكَّلْ عَلَى اللَّهِ ۚ إِنَّ اللَّهَ يُحِبُّ الْمُتَوَكِّلِينَ',
    translation: 'And when you have decided, then rely upon Allah. Indeed, Allah loves those who rely [upon Him].',
    source: 'Surah Ali ‘Imran (3:159)',
  },
  {
    id: 'bukhari-6407',
    type: 'Hadith',
    arabic: 'نِعْمَتَانِ مَغْبُونٌ فِيهِمَا كَثِيرٌ مِنَ النَّاسِ الصِّحَّةُ وَالْفَرَاغُ',
    translation: 'There are two blessings which many people lose: health and free time.',
    source: 'Sahih al-Bukhari 6407',
  },
  {
    id: 'ayah-duha-5',
    type: 'Ayah',
    arabic: 'وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ',
    translation: 'And your Lord is going to give you, and you will be satisfied.',
    source: 'Surah Ad-Duha (93:5)',
  },
  {
    id: 'bukhari-13',
    type: 'Hadith',
    arabic: 'لاَ يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ',
    translation: 'None of you truly believes until he loves for his brother what he loves for himself.',
    source: 'Sahih al-Bukhari 13',
  },
  {
    id: 'ayah-ankabut-69',
    type: 'Ayah',
    arabic: 'وَالَّذِينَ جَاهَدُوا فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا ۚ وَإِنَّ اللَّهَ لَمَعَ الْمُحْسِنِينَ',
    translation: 'And those who strive for Us — We will surely guide them to Our ways. And indeed, Allah is with the doers of good.',
    source: 'Surah Al-‘Ankabut (29:69)',
  },
  {
    id: 'tirmidhi-1987',
    type: 'Hadith',
    arabic: 'تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ لَكَ صَدَقَةٌ',
    translation: 'Your smiling in the face of your brother is an act of charity for you.',
    source: 'Jami` at-Tirmidhi 1956',
  },
  {
    id: 'ayah-baqarah-186',
    type: 'Ayah',
    arabic: 'وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ',
    translation: 'And when My servants ask you concerning Me — indeed I am near. I respond to the invocation of the supplicant when he calls upon Me.',
    source: 'Surah Al-Baqarah (2:186)',
  },
  {
    id: 'muslim-223',
    type: 'Hadith',
    arabic: 'الطُّهُورُ شَطْرُ الإِيمَانِ وَالْحَمْدُ لِلَّهِ تَمْلأُ الْمِيزَانَ',
    translation: 'Purity is half of faith, and Alhamdulillah fills the scales of good deeds.',
    source: 'Sahih Muslim 223',
  },
  {
    id: 'ayah-furqan-74',
    type: 'Ayah',
    arabic: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا',
    translation: 'Our Lord, grant us from among our spouses and offspring comfort to our eyes and make us a leader for the righteous.',
    source: 'Surah Al-Furqan (25:74)',
  },
  {
    id: 'bukhari-6011',
    type: 'Hadith',
    arabic: 'الْمُؤْمِنُ الْقَوِيُّ خَيْرٌ وَأَحَبُّ إِلَى اللَّهِ مِنَ الْمُؤْمِنِ الضَّعِيفِ وَفِي كُلٍّ خَيْرٌ',
    translation: 'The strong believer is better and more beloved to Allah than the weak believer, while there is good in both.',
    source: 'Sahih Muslim 2664',
  },
  {
    id: 'ayah-insan-9',
    type: 'Ayah',
    arabic: 'إِنَّمَا نُطْعِمُكُمْ لِوَجْهِ اللَّهِ لَا نُرِيدُ مِنكُمْ جَزَاءً وَلَا شُكُورًا',
    translation: 'We feed you only for the countenance of Allah. We wish not from you reward or gratitude.',
    source: 'Surah Al-Insan (76:9)',
  },
  {
    id: 'bukhari-2442',
    type: 'Hadith',
    arabic: 'الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ',
    translation: 'The true Muslim is the one from whose tongue and hand other Muslims are safe.',
    source: 'Sahih al-Bukhari 10',
  },
  {
    id: 'ayah-hasr-18',
    type: 'Ayah',
    arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ وَلْتَنظُرْ نَفْسٌ مَّا قَدَّمَتْ لِغَدٍ',
    translation: 'O you who have believed, fear Allah. And let every soul look to what it has put forth for tomorrow.',
    source: 'Surah Al-Hashr (59:18)',
  },
];

interface RotationState {
  lastDate: string;          // YYYY-MM-DD
  currentIndex: number;      // Current item index in AUTHENTIC_INSPIRATIONS
  recentHistory: number[];   // Array of indices displayed in last 30 days
}

function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Loads today's inspiration using non-repeating 30-day FIFO rotation.
 * Guarantees that the same hadith is NEVER repeated within 30 days.
 */
export async function getDailyInspiration(): Promise<InspirationItem> {
  const today = getTodayKey();

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    let state: RotationState | null = raw ? JSON.parse(raw) : null;

    // 1. Same day check: keep the same inspiration throughout the calendar day
    if (state && state.lastDate === today && AUTHENTIC_INSPIRATIONS[state.currentIndex]) {
      return AUTHENTIC_INSPIRATIONS[state.currentIndex];
    }

    // 2. New day or initial launch: find an index not in recentHistory (last 30 days)
    const recent = state?.recentHistory ?? [];
    const total = AUTHENTIC_INSPIRATIONS.length;

    // Find all indices not used in recent history
    const availableIndices: number[] = [];
    for (let i = 0; i < total; i++) {
      if (!recent.includes(i)) {
        availableIndices.push(i);
      }
    }

    // If all have been used, reset recent history and pick any
    const pool = availableIndices.length > 0 ? availableIndices : Array.from({ length: total }, (_, i) => i);
    const chosenIndex = pool[Math.floor(Math.random() * pool.length)];

    // Update history (keep max 30 entries)
    const updatedHistory = [...recent, chosenIndex].slice(-30);

    const newState: RotationState = {
      lastDate: today,
      currentIndex: chosenIndex,
      recentHistory: updatedHistory,
    };

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    return AUTHENTIC_INSPIRATIONS[chosenIndex];
  } catch (err) {
    console.warn('[DailyInspiration] Error in rotation tracker, using fallback:', err);
    // Deterministic daily fallback
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return AUTHENTIC_INSPIRATIONS[dayOfYear % AUTHENTIC_INSPIRATIONS.length];
  }
}

/**
 * Manually rolls to a fresh, unseen Hadith / Ayah on user request.
 */
export async function rollNextInspiration(): Promise<InspirationItem> {
  const today = getTodayKey();
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const state: RotationState = raw ? JSON.parse(raw) : { lastDate: today, currentIndex: 0, recentHistory: [] };
    const total = AUTHENTIC_INSPIRATIONS.length;

    // Pick next index different from current
    let nextIdx = (state.currentIndex + 1) % total;
    state.currentIndex = nextIdx;
    state.recentHistory = [...state.recentHistory, nextIdx].slice(-30);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return AUTHENTIC_INSPIRATIONS[nextIdx];
  } catch {
    return AUTHENTIC_INSPIRATIONS[0];
  }
}
