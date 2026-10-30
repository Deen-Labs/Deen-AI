import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SurahMeta {
  number: number;
  name: string; // Arabic name
  english: string; // Transliterated name
  meaning: string; // Meaning in English
  verses: number; // Number of Ayahs
  revelationType: 'Meccan' | 'Medinan';
}

export interface AyahVerseItem {
  numberInSurah: number;
  arabic: string;
  english: string;
  urdu: string;
  transliteration?: string;
  hindi?: string;
  telugu?: string;
}

export interface ArchiveBookItem {
  identifier: string;
  title: string;
  creator?: string;
  year?: string;
  description?: string;
  url: string;
}

export interface CuratedHadith {
  id: string;
  book: 'Sahih al-Bukhari' | 'Sahih Muslim' | 'Sunan Abu Dawud' | 'Jami` at-Tirmidhi' | 'Sunan an-Nasa\'i' | 'Sunan Ibn Majah';
  hadithNumber: string;
  chapter: string;
  arabic: string;
  english: string;
  urdu: string;
  grade: 'Sahih' | 'Hasan';
  narrator: string;
}

export const ALL_114_SURAHS: SurahMeta[] = [
  { number: 1, name: 'الفاتحة', english: 'Al-Faatiha', meaning: 'The Opening', verses: 7, revelationType: 'Meccan' },
  { number: 2, name: 'البقرة', english: 'Al-Baqarah', meaning: 'The Cow', verses: 286, revelationType: 'Medinan' },
  { number: 3, name: 'آل عمران', english: 'Aal-e-Imran', meaning: 'Family of Imran', verses: 200, revelationType: 'Medinan' },
  { number: 4, name: 'النساء', english: 'An-Nisaa', meaning: 'The Women', verses: 176, revelationType: 'Medinan' },
  { number: 5, name: 'المائدة', english: 'Al-Maaida', meaning: 'The Table Spread', verses: 120, revelationType: 'Medinan' },
  { number: 6, name: 'الأنعام', english: 'Al-An\'aam', meaning: 'The Cattle', verses: 165, revelationType: 'Meccan' },
  { number: 7, name: 'الأعراف', english: 'Al-A\'raaf', meaning: 'The Heights', verses: 206, revelationType: 'Meccan' },
  { number: 8, name: 'الأنفال', english: 'Al-Anfaal', meaning: 'The Spoils of War', verses: 75, revelationType: 'Medinan' },
  { number: 9, name: 'التوبة', english: 'At-Tawba', meaning: 'The Repentance', verses: 129, revelationType: 'Medinan' },
  { number: 10, name: 'يونس', english: 'Yunus', meaning: 'Jonah', verses: 109, revelationType: 'Meccan' },
  { number: 11, name: 'هود', english: 'Hud', meaning: 'Hud', verses: 123, revelationType: 'Meccan' },
  { number: 12, name: 'يوسف', english: 'Yusuf', meaning: 'Joseph', verses: 111, revelationType: 'Meccan' },
  { number: 13, name: 'الرعد', english: 'Ar-Ra\'d', meaning: 'The Thunder', verses: 43, revelationType: 'Medinan' },
  { number: 14, name: 'إبراهيم', english: 'Ibrahim', meaning: 'Abraham', verses: 52, revelationType: 'Meccan' },
  { number: 15, name: 'الحجر', english: 'Al-Hijr', meaning: 'The Rocky Tract', verses: 99, revelationType: 'Meccan' },
  { number: 16, name: 'النحل', english: 'An-Nahl', meaning: 'The Bee', verses: 128, revelationType: 'Meccan' },
  { number: 17, name: 'الإسراء', english: 'Al-Israa', meaning: 'The Night Journey', verses: 111, revelationType: 'Meccan' },
  { number: 18, name: 'الكهف', english: 'Al-Kahf', meaning: 'The Cave', verses: 110, revelationType: 'Meccan' },
  { number: 19, name: 'مريم', english: 'Maryam', meaning: 'Mary', verses: 98, revelationType: 'Meccan' },
  { number: 20, name: 'طه', english: 'Taa-Haa', meaning: 'Ta-Ha', verses: 135, revelationType: 'Meccan' },
  { number: 21, name: 'الأنبياء', english: 'Al-Anbiyaa', meaning: 'The Prophets', verses: 112, revelationType: 'Meccan' },
  { number: 22, name: 'الحج', english: 'Al-Hajj', meaning: 'The Pilgrimage', verses: 78, revelationType: 'Medinan' },
  { number: 23, name: 'المؤمنون', english: 'Al-Mu\'minoon', meaning: 'The Believers', verses: 118, revelationType: 'Meccan' },
  { number: 24, name: 'النور', english: 'An-Noor', meaning: 'The Light', verses: 64, revelationType: 'Medinan' },
  { number: 25, name: 'الفرقان', english: 'Al-Furqaan', meaning: 'The Criterion', verses: 77, revelationType: 'Meccan' },
  { number: 26, name: 'الشعراء', english: 'Ash-Shu\'araa', meaning: 'The Poets', verses: 227, revelationType: 'Meccan' },
  { number: 27, name: 'النمل', english: 'An-Naml', meaning: 'The Ant', verses: 93, revelationType: 'Meccan' },
  { number: 28, name: 'القصص', english: 'Al-Qasas', meaning: 'The Stories', verses: 88, revelationType: 'Meccan' },
  { number: 29, name: 'العنكبوت', english: 'Al-Ankaboot', meaning: 'The Spider', verses: 69, revelationType: 'Meccan' },
  { number: 30, name: 'الروم', english: 'Ar-Room', meaning: 'The Romans', verses: 60, revelationType: 'Meccan' },
  { number: 31, name: 'لقمان', english: 'Luqman', meaning: 'Luqman', verses: 34, revelationType: 'Meccan' },
  { number: 32, name: 'السجدة', english: 'As-Sajda', meaning: 'The Prostration', verses: 30, revelationType: 'Meccan' },
  { number: 33, name: 'الأحزاب', english: 'Al-Ahzaab', meaning: 'The Clans', verses: 73, revelationType: 'Medinan' },
  { number: 34, name: 'سبأ', english: 'Saba', meaning: 'Sheba', verses: 54, revelationType: 'Meccan' },
  { number: 35, name: 'فاطر', english: 'Faatir', meaning: 'The Originator', verses: 45, revelationType: 'Meccan' },
  { number: 36, name: 'يس', english: 'Yaseen', meaning: 'Ya-Seen', verses: 83, revelationType: 'Meccan' },
  { number: 37, name: 'الصافات', english: 'As-Saaffaat', meaning: 'Those in Ranks', verses: 182, revelationType: 'Meccan' },
  { number: 38, name: 'ص', english: 'Saad', meaning: 'Sad', verses: 88, revelationType: 'Meccan' },
  { number: 39, name: 'الزمر', english: 'Az-Zumar', meaning: 'The Troops', verses: 75, revelationType: 'Meccan' },
  { number: 40, name: 'غافر', english: 'Ghafir', meaning: 'The Forgiver', verses: 85, revelationType: 'Meccan' },
  { number: 41, name: 'فصلت', english: 'Fussilat', meaning: 'Explained in Detail', verses: 54, revelationType: 'Meccan' },
  { number: 42, name: 'الشورى', english: 'Ash-Shoora', meaning: 'The Consultation', verses: 53, revelationType: 'Meccan' },
  { number: 43, name: 'الزخرف', english: 'Az-Zukhruf', meaning: 'The Ornaments of Gold', verses: 89, revelationType: 'Meccan' },
  { number: 44, name: 'الدخان', english: 'Ad-Dukhaan', meaning: 'The Smoke', verses: 59, revelationType: 'Meccan' },
  { number: 45, name: 'الجاثية', english: 'Al-Jaathiya', meaning: 'The Crouching', verses: 37, revelationType: 'Meccan' },
  { number: 46, name: 'الأحقاف', english: 'Al-Ahqaaf', meaning: 'The Wind-Curved Dunes', verses: 35, revelationType: 'Meccan' },
  { number: 47, name: 'محمد', english: 'Muhammad', meaning: 'Muhammad', verses: 38, revelationType: 'Medinan' },
  { number: 48, name: 'الفتح', english: 'Al-Fath', meaning: 'The Victory', verses: 29, revelationType: 'Medinan' },
  { number: 49, name: 'الحجرات', english: 'Al-Hujuraat', meaning: 'The Rooms', verses: 18, revelationType: 'Medinan' },
  { number: 50, name: 'ق', english: 'Qaaf', meaning: 'Qaf', verses: 45, revelationType: 'Meccan' },
  { number: 51, name: 'الذاريات', english: 'Adh-Dhaariyaat', meaning: 'The Winnowing Winds', verses: 60, revelationType: 'Meccan' },
  { number: 52, name: 'الطور', english: 'At-Toor', meaning: 'The Mount', verses: 49, revelationType: 'Meccan' },
  { number: 53, name: 'النجم', english: 'An-Najm', meaning: 'The Star', verses: 62, revelationType: 'Meccan' },
  { number: 54, name: 'القمر', english: 'Al-Qamar', meaning: 'The Moon', verses: 55, revelationType: 'Meccan' },
  { number: 55, name: 'الرحمن', english: 'Ar-Rahmaan', meaning: 'The Beneficent', verses: 78, revelationType: 'Medinan' },
  { number: 56, name: 'الواقعة', english: 'Al-Waaqia', meaning: 'The Inevitable', verses: 96, revelationType: 'Meccan' },
  { number: 57, name: 'الحديد', english: 'Al-Hadid', meaning: 'The Iron', verses: 29, revelationType: 'Medinan' },
  { number: 58, name: 'المجادلة', english: 'Al-Mujaadila', meaning: 'The Pleading Woman', verses: 22, revelationType: 'Medinan' },
  { number: 59, name: 'الحشر', english: 'Al-Hashr', meaning: 'The Exile', verses: 24, revelationType: 'Medinan' },
  { number: 60, name: 'الممتحنة', english: 'Al-Mumtahana', meaning: 'She that is Examined', verses: 13, revelationType: 'Medinan' },
  { number: 61, name: 'الصف', english: 'As-Saff', meaning: 'The Ranks', verses: 14, revelationType: 'Medinan' },
  { number: 62, name: 'الجمعة', english: 'Al-Jumu\'a', meaning: 'Friday', verses: 11, revelationType: 'Medinan' },
  { number: 63, name: 'المنافقون', english: 'Al-Munaafiqoon', meaning: 'The Hypocrites', verses: 11, revelationType: 'Medinan' },
  { number: 64, name: 'التغابن', english: 'At-Taghaabun', meaning: 'The Mutual Disillusion', verses: 18, revelationType: 'Medinan' },
  { number: 65, name: 'الطلاق', english: 'At-Talaaq', meaning: 'The Divorce', verses: 12, revelationType: 'Medinan' },
  { number: 66, name: 'التحريم', english: 'At-Tahrim', meaning: 'The Prohibition', verses: 12, revelationType: 'Medinan' },
  { number: 67, name: 'الملك', english: 'Al-Mulk', meaning: 'The Sovereignty', verses: 30, revelationType: 'Meccan' },
  { number: 68, name: 'القلم', english: 'Al-Qalam', meaning: 'The Pen', verses: 52, revelationType: 'Meccan' },
  { number: 69, name: 'الحاقة', english: 'Al-Haaqqa', meaning: 'The Reality', verses: 52, revelationType: 'Meccan' },
  { number: 70, name: 'المعارج', english: 'Al-Ma\'aarij', meaning: 'The Ascending Stairways', verses: 44, revelationType: 'Meccan' },
  { number: 71, name: 'نوح', english: 'Nooh', meaning: 'Noah', verses: 28, revelationType: 'Meccan' },
  { number: 72, name: 'الجن', english: 'Al-Jinn', meaning: 'The Jinn', verses: 28, revelationType: 'Meccan' },
  { number: 73, name: 'المزمل', english: 'Al-Muzzammil', meaning: 'The Enshrouded One', verses: 20, revelationType: 'Meccan' },
  { number: 74, name: 'المدثر', english: 'Al-Muddaththir', meaning: 'The Cloaked One', verses: 56, revelationType: 'Meccan' },
  { number: 75, name: 'القيامة', english: 'Al-Qiyaama', meaning: 'The Resurrection', verses: 40, revelationType: 'Meccan' },
  { number: 76, name: 'الإنسان', english: 'Al-Insaan', meaning: 'Man', verses: 31, revelationType: 'Medinan' },
  { number: 77, name: 'المرسلات', english: 'Al-Mursalaat', meaning: 'The Emissaries', verses: 50, revelationType: 'Meccan' },
  { number: 78, name: 'النبأ', english: 'An-Naba', meaning: 'The Tidings', verses: 40, revelationType: 'Meccan' },
  { number: 79, name: 'النازعات', english: 'An-Naazi\'aat', meaning: 'Those Who Drag Forth', verses: 46, revelationType: 'Meccan' },
  { number: 80, name: 'عبس', english: 'Abasa', meaning: 'He Frowned', verses: 42, revelationType: 'Meccan' },
  { number: 81, name: 'التكوير', english: 'At-Takwir', meaning: 'The Overthrowing', verses: 29, revelationType: 'Meccan' },
  { number: 82, name: 'الانفطار', english: 'Al-Infitaar', meaning: 'The Cleaving', verses: 19, revelationType: 'Meccan' },
  { number: 83, name: 'المطففين', english: 'Al-Mutaffifin', meaning: 'Defrauding', verses: 36, revelationType: 'Meccan' },
  { number: 84, name: 'الانشقاق', english: 'Al-Inshiqaaq', meaning: 'The Splitting Open', verses: 25, revelationType: 'Meccan' },
  { number: 85, name: 'البروج', english: 'Al-Burooj', meaning: 'The Mansions of the Stars', verses: 22, revelationType: 'Meccan' },
  { number: 86, name: 'الطارق', english: 'At-Taariq', meaning: 'The Morning Star', verses: 17, revelationType: 'Meccan' },
  { number: 87, name: 'الأعلى', english: 'Al-A\'laa', meaning: 'The Most High', verses: 19, revelationType: 'Meccan' },
  { number: 88, name: 'الغاشية', english: 'Al-Ghaashiya', meaning: 'The Overwhelming', verses: 26, revelationType: 'Meccan' },
  { number: 89, name: 'الفجر', english: 'Al-Fajr', meaning: 'The Dawn', verses: 30, revelationType: 'Meccan' },
  { number: 90, name: 'البلد', english: 'Al-Balad', meaning: 'The City', verses: 20, revelationType: 'Meccan' },
  { number: 91, name: 'الشمس', english: 'Ash-Shams', meaning: 'The Sun', verses: 15, revelationType: 'Meccan' },
  { number: 92, name: 'الليل', english: 'Al-Layl', meaning: 'The Night', verses: 21, revelationType: 'Meccan' },
  { number: 93, name: 'الضحى', english: 'Ad-Dhuhaa', meaning: 'The Morning Hours', verses: 11, revelationType: 'Meccan' },
  { number: 94, name: 'الشرح', english: 'Ash-Sharh', meaning: 'The Relief', verses: 8, revelationType: 'Meccan' },
  { number: 95, name: 'التين', english: 'At-Tin', meaning: 'The Fig', verses: 8, revelationType: 'Meccan' },
  { number: 96, name: 'العلق', english: 'Al-Alaq', meaning: 'The Clot', verses: 19, revelationType: 'Meccan' },
  { number: 97, name: 'القدر', english: 'Al-Qadr', meaning: 'The Power', verses: 5, revelationType: 'Meccan' },
  { number: 98, name: 'البينة', english: 'Al-Bayyina', meaning: 'The Clear Proof', verses: 8, revelationType: 'Medinan' },
  { number: 99, name: 'الزلزلة', english: 'Az-Zalzala', meaning: 'The Earthquake', verses: 8, revelationType: 'Medinan' },
  { number: 100, name: 'العاديات', english: 'Al-Aadiyaat', meaning: 'The Courser', verses: 11, revelationType: 'Meccan' },
  { number: 101, name: 'القارعة', english: 'Al-Qaari\'a', meaning: 'The Calamity', verses: 11, revelationType: 'Meccan' },
  { number: 102, name: 'التكاثر', english: 'At-Takaathur', meaning: 'The Rivalry in World Increase', verses: 8, revelationType: 'Meccan' },
  { number: 103, name: 'العصر', english: 'Al-Asr', meaning: 'The Declining Day', verses: 3, revelationType: 'Meccan' },
  { number: 104, name: 'الهمزة', english: 'Al-Humaza', meaning: 'The Traducer', verses: 9, revelationType: 'Meccan' },
  { number: 105, name: 'الفيل', english: 'Al-Feel', meaning: 'The Elephant', verses: 5, revelationType: 'Meccan' },
  { number: 106, name: 'قريش', english: 'Quraysh', meaning: 'Quraysh', verses: 4, revelationType: 'Meccan' },
  { number: 107, name: 'الماعون', english: 'Al-Maa\'oon', meaning: 'Small Kindnesses', verses: 7, revelationType: 'Meccan' },
  { number: 108, name: 'الكوثر', english: 'Al-Kawthar', meaning: 'The Abundance', verses: 3, revelationType: 'Meccan' },
  { number: 109, name: 'الكافرون', english: 'Al-Kaafiroon', meaning: 'The Disbelievers', verses: 6, revelationType: 'Meccan' },
  { number: 110, name: 'النصر', english: 'An-Nasr', meaning: 'The Divine Support', verses: 3, revelationType: 'Medinan' },
  { number: 111, name: 'المسد', english: 'Al-Masad', meaning: 'The Palm Fibre', verses: 5, revelationType: 'Meccan' },
  { number: 112, name: 'الإخلاص', english: 'Al-Ikhlaas', meaning: 'The Sincerity', verses: 4, revelationType: 'Meccan' },
  { number: 113, name: 'الفلق', english: 'Al-Falaq', meaning: 'The Daybreak', verses: 5, revelationType: 'Meccan' },
  { number: 114, name: 'الناس', english: 'An-Naas', meaning: 'Mankind', verses: 6, revelationType: 'Meccan' },
];

/**
 * Fetch complete verses for any Surah from Al-Quran Cloud API with persistent offline caching.
 */
export async function fetchSurahVerses(surahNumber: number): Promise<AyahVerseItem[]> {
  const cacheKey = `@deen_surah_cache_v2_${surahNumber}`;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  const url = `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,en.asad,ur.jalandhry,en.transliteration`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch Surah ${surahNumber}: HTTP ${response.status}`);
  }

  const json = await response.json();
  if (json.code !== 200 || !Array.isArray(json.data)) {
    throw new Error(`Invalid response format for Surah ${surahNumber}`);
  }

  const uthmaniData = json.data.find((d: any) => d.identifier === 'quran-uthmani')?.ayahs || [];
  const enData = json.data.find((d: any) => d.identifier === 'en.asad')?.ayahs || [];
  const urData = json.data.find((d: any) => d.identifier === 'ur.jalandhry')?.ayahs || [];
  const transData = json.data.find((d: any) => d.identifier === 'en.transliteration')?.ayahs || [];

  const verses: AyahVerseItem[] = uthmaniData.map((ayah: any, idx: number) => ({
    numberInSurah: ayah.numberInSurah,
    arabic: ayah.text,
    english: enData[idx]?.text || '',
    urdu: urData[idx]?.text || '',
    transliteration: transData[idx]?.text || '',
  }));

  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(verses));
  } catch {}

  return verses;
}

/**
 * Query Internet Archive for scholarly classical books & verified PDFs across Quran, Hadith, & Tafsir.
 */
export async function searchInternetArchiveScholarlyBooks(query: string): Promise<ArchiveBookItem[]> {
  const cleanQ = query.trim();
  const searchTerms = cleanQ ? `(${encodeURIComponent(cleanQ)})` : 'hadith OR tafsir';
  const url = `https://archive.org/advancedsearch.php?q=subject%3A(%22hadith%22+OR+%22quran%22+OR+%22tafsir%22)+AND+${searchTerms}&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=year&fl[]=description&fl[]=mediatype&sort[]=downloads+desc&rows=15&page=1&output=json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Internet Archive search failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  const docs = data.response?.docs || [];

  return docs.map((doc: any) => ({
    identifier: doc.identifier,
    title: doc.title || doc.identifier,
    creator: Array.isArray(doc.creator) ? doc.creator.join(', ') : (doc.creator || 'Classical Scholar'),
    year: doc.year ? String(doc.year) : undefined,
    description: Array.isArray(doc.description) ? doc.description[0] : (doc.description || ''),
    url: `https://archive.org/details/${doc.identifier}`,
  }));
}

export const EXPANDED_HADITH_BANK: CuratedHadith[] = [
  {
    id: 'bukhari-1',
    book: 'Sahih al-Bukhari',
    hadithNumber: '1',
    chapter: 'Revelation & Intentions',
    arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى',
    english: 'Actions are according to intentions, and everyone will get what was intended for them.',
    urdu: 'اعمال کا دارومدار نیتوں پر ہے اور ہر انسان کے لیے وہی ہے جس کی اس نے نیت کی۔',
    grade: 'Sahih',
    narrator: 'Umar bin Al-Khattab (RA)',
  },
  {
    id: 'bukhari-52',
    book: 'Sahih al-Bukhari',
    hadithNumber: '52',
    chapter: 'Belief & Rectitude of the Heart',
    arabic: 'أَلا وَإِنَّ فِي الْجَسَدِ مُضْغَةً إِذَا صَلَحَتْ صَلَحَ الْجَسَدُ كُلُّهُ وَإِذَا فَسَدَتْ فَسَدَ الْجَسَدُ كُلُّهُ أَلا وَهِيَ الْقَلْبُ',
    english: 'There is a piece of flesh in the body: if it becomes good, the whole body becomes good, but if it gets spoilt, the whole body gets spoilt, and that is the heart.',
    urdu: 'خبردار! جسم میں ایک گوشت کا ٹکڑا ہے، اگر وہ سنور جائے تو سارا جسم سنور جاتا ہے اور اگر وہ بگڑ جائے تو سارا جسم بگڑ جاتا ہے، سنو! وہ دل ہے۔',
    grade: 'Sahih',
    narrator: 'An-Nu\'man bin Bashir (RA)',
  },
  {
    id: 'bukhari-5027',
    book: 'Sahih al-Bukhari',
    hadithNumber: '5027',
    chapter: 'Virtues of the Quran',
    arabic: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ',
    english: 'The best among you are those who learn the Quran and teach it to others.',
    urdu: 'تم میں سے بہترین شخص وہ ہے جو قرآن سیکھے اور اسے دوسروں کو سکھائے۔',
    grade: 'Sahih',
    narrator: 'Uthman bin Affan (RA)',
  },
  {
    id: 'muslim-223',
    book: 'Sahih Muslim',
    hadithNumber: '223',
    chapter: 'Purification & Faith',
    arabic: 'الطُّهُورُ شَطْرُ الإِيمَانِ، وَالْحَمْدُ لِلَّهِ تَمْلأُ الْمِيزَانَ',
    english: 'Cleanliness is half of faith, and saying "Al-Hamdulillah" fills the scales of good deeds.',
    urdu: 'طہارت اور پاکیزگی آدھا ایمان ہے اور الحمد للہ میزان کو بھر دیتا ہے۔',
    grade: 'Sahih',
    narrator: 'Abu Malik Al-Ash\'ari (RA)',
  },
  {
    id: 'muslim-2564',
    book: 'Sahih Muslim',
    hadithNumber: '2564',
    chapter: 'Righteousness & Sins',
    arabic: 'الْبِرُّ حُسْنُ الْخُلُقِ، وَالإِثْمُ مَا حَاكَ فِي صَدْرِكَ وَكَرِهْتَ أَنْ يَطَّلِعَ عَلَيْهِ النَّاسُ',
    english: 'Righteousness is good character, and sin is that which wavers in your heart and you dislike people finding out about it.',
    urdu: 'نیکی اچھے اخلاق کا نام ہے اور گناہ وہ ہے جو تمہارے سینے میں کھٹکے اور تم ناپسند کرو کہ لوگوں کو اس کی خبر ہو۔',
    grade: 'Sahih',
    narrator: 'An-Nawwas bin Sam\'an (RA)',
  },
  {
    id: 'tirmidhi-2516',
    book: 'Jami` at-Tirmidhi',
    hadithNumber: '2516',
    chapter: 'Reliance upon Allah',
    arabic: 'احْفَظِ اللَّهَ يَحْفَظْكَ، احْفَظِ اللَّهَ تَجِدْهُ تُجَاهَكَ',
    english: 'Be mindful of Allah and He will protect you. Be mindful of Allah and you will find Him in front of you.',
    urdu: 'اللہ کے حقوق کی حفاظت کرو، وہ تمہاری حفاظت فرمائے گا۔ اللہ کو یاد رکھو، تم اسے اپنے سامنے پاؤ گے۔',
    grade: 'Sahih',
    narrator: 'Abdullah bin Abbas (RA)',
  },
  {
    id: 'abudawud-4941',
    book: 'Sunan Abu Dawud',
    hadithNumber: '4941',
    chapter: 'Mercy to Creation',
    arabic: 'الرَّاحِمُونَ يَرْحَمُهُمُ الرَّحْمَنُ، ارْحَمُوا مَنْ فِي الأَرْضِ يَرْحَمْكُمْ مَنْ فِي السَّمَاءِ',
    english: 'The merciful are shown mercy by the Most Merciful. Be merciful to those on earth, and the One in the heavens will have mercy upon you.',
    urdu: 'رحم کرنے والوں پر رحمن رحم فرماتا ہے۔ تم زمین والوں پر رحم کرو، آسمان والا تم پر رحم فرمائے گا۔',
    grade: 'Sahih',
    narrator: 'Abdullah bin Amr (RA)',
  },
  {
    id: 'nasai-3104',
    book: 'Sunan an-Nasa\'i',
    hadithNumber: '3104',
    chapter: 'Repentance & Purity',
    arabic: 'كُلُّ بَنِي آدَمَ خَطَّاءٌ وَخَيْرُ الْخَطَّائِينَ التَّوَّابُونَ',
    english: 'Every son of Adam commits sins frequently, and the best of sinners are those who constantly repent.',
    urdu: 'تمام بنی آدم بہت خطاکار ہیں، اور بہترین خطاکار وہ ہیں جو کثرت سے توبہ کرنے والے ہیں۔',
    grade: 'Hasan',
    narrator: 'Anas bin Malik (RA)',
  },
  {
    id: 'ibnmajah-4251',
    book: 'Sunan Ibn Majah',
    hadithNumber: '4251',
    chapter: 'Modesty & Faith',
    arabic: 'إِنَّ لِكُلِّ دِينٍ خُلُقًا، وَخُلُقُ الإِسْلاَمِ الْحَيَاءُ',
    english: 'Every religion has a distinct characteristic, and the distinct characteristic of Islam is modesty.',
    urdu: 'ہر دین کا ایک خاص خلق ہے، اور اسلام کا امتیازی خلق حیا ہے۔',
    grade: 'Hasan',
    narrator: 'Anas bin Malik (RA)',
  },
];
