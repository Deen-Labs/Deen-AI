import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser } from './auth';

export const CUSTOM_AZKAR_STORAGE_KEY = '@deen_custom_azkar_v1';
export const CUSTOM_CATEGORIES_STORAGE_KEY = '@deen_custom_categories_v1';

export interface CustomCategory {
  id: string;
  nameEn: string;
  nameUr?: string;
  userId?: string;
  createdOn?: string;
  firestoreId?: string;
}

export interface SaveCustomDuaParams {
  categoryName?: string;
  supplication: string;
  translationEn: string;
  translationUr?: string;
  translationHinglish?: string;
  detailEn?: string;
  detailUr?: string;
  detailHinglish?: string;
  repeatCount?: number;
  reference?: string;
}


export interface AzkarItem {
  id: string;
  categoryName: string;
  supplication: string;
  translationEn: string;
  translationUr: string;
  translationHinglish: string;
  detailEn: string;
  detailUr: string;
  detailHinglish: string;
  repeatCount: number;
  reference: string;
  isCustom?: boolean;
}

export const PREBUILT_AZKAR_CATEGORIES = ['Morning Azkar', 'Evening Azkar', 'Rabbana Duas', 'My Custom Azkar'] as const;

export const BUNDLED_AZKAR: AzkarItem[] = [
  {
    "id": "morning-azkar-1",
    "categoryName": "Morning Azkar",
    "supplication": "اَعُوْذُ بِاللّٰهِ مِنَ الشَّيْطٰنِ الرَّجِيْمِ\nاَللّٰهُ لَآ اِلٰهَ اِلَّا ھُوَ  ۚ اَلْـحَيُّ الْقَيُّوْمُ ڬ لَا تَاْخُذُهٗ سِـنَةٌ وَّلَا نَوْمٌ  ۭ لَهٗ مَا فِي السَّمٰوٰتِ وَمَا فِي الْاَرْضِ  ۭ مَنْ ذَا الَّذِيْ يَشْفَعُ عِنْدَهٗٓ اِلَّا بِاِذْنِهٖ ۭ يَعْلَمُ مَا بَيْنَ اَيْدِيْهِمْ وَمَا خَلْفَھُمْ ۚ وَلَا يُحِيْطُوْنَ بِشَيْءٍ مِّنْ عِلْمِهٖٓ اِلَّا بِمَا شَاۗءَ  ۚ وَسِعَ كُرْسِـيُّهُ السَّمٰوٰتِ وَالْاَرْضَ ۚ وَلَا يَـــــُٔـــوْدُهٗ حِفْظُهُمَا  ۚ وَھُوَ الْعَلِيُّ الْعَظِيْمُ ۔",
    "translationEn": "Allah - there is no deity except Him, the Ever-Living, the Sustainer of [all] existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is [presently] before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills. His Kursi extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great.",
    "translationUr": "میں اللہ کی پناہ مانگتا ہوں شیطان مردود سے\nاللہ تعالٰی ہی معبود برحق ہے جس کے سوا کوئی معبود نہیں جو زندہ اور سب کا تھامنے والا ہے ،  جسے نہ اونگھ آتی ہے نہ نیند ،  اس کی ملکیت میں زمین اور آسمانوں کی تمام چیزیں ہیں ۔  کون ہے جو اس کی اجازت کے بغیر اس کے سامنے شفاعت کرسکے ،  وہ جانتا ہے جو اس کے سامنے ہے اور جو ان کے پیچھے ہے اور وہ اس کے علم میں سے کسی چیز کا احاطہ نہیں کر سکتے مگر جتنا وہ چاہے ،   اس کی کرسی کی وُسعت  نے زمین اور آسمان کو گھیر رکھا ہے اور اللہ تعالٰی ان کی حفاظت سے نہ تھکتا ہے اور نہ اُکتاتا ہے وہ تو بہت بلند اور بہت بڑا ہے۔",
    "translationHinglish": "mein Allah ki panah mangta hon shetan mardood se.\nAllah taala hi mabood barhaq hai jis ke siwa koi mabood nahi jo zindah aur sab ka thaamnay wala hai, jisay nah ongh aati hai nah neend, is ki malkiat mein zameen aur asmano ki tamam cheeze hain. kon hai jo is ki ijazat ke baghair is ke samnay Shafaat kar sakay, woh jaanta hai jo is ke samnay hai aur jo un ke peechay hai aur woh is ke ilm mein se kisi cheez ka ihata nahi kar satke magar jitna woh chahay, is ki kursi ki wusat ne zameen aur aasman ko ghair rakha hai aur Allah taala un ki hifazat se nah thakta hai aur nah اکتاتا hai woh to bohat buland aur bohat bara hai .",
    "detailEn": "He who recites the Aya al-Kursi in the morning is safe from the jinn till evening and he who recites it in the evening is safe from them till morning.",
    "detailUr": "جو شخص صبح کے وقت آیۃالکرسی پڑھے وہ شام تک جنوں سے محفوظ ہوجاتا ہے اور جو اسے شام کے وقت پڑھے وہ صبح تک ان سے محفوظ ہو جاتا ہے۔",
    "detailHinglish": "jo shakhs subah ke waqt آیہالکرسی parhay woh shaam tak junoo se mehfooz hojata hai aur jo usay shaam ke waqt parhay woh subah tak un se mehfooz ho jata hai",
    "repeatCount": 1,
    "reference": "Sahih Al Targheeb Wal Tarheeb 662"
  },
  {
    "id": "morning-azkar-2",
    "categoryName": "Morning Azkar",
    "supplication": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ  ۔ قُلْ هُوَ اللَّهُ أَحَدٌ  ۔ اللَّهُ الصَّمَدُ  ۔ لَمْ يَلِدْ وَلَمْ يُولَدْ  ۔ وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ  ۔",
    "translationEn": "SAY: HE IS God the one the most unique, God the immanently indispensable. He has begotten no one, and is begotten of none. There is no one comparable to Him.",
    "translationUr": "کہہ دو وہ الله ایک ہے ، اللہ بے نیاز ہے، نہ اس کی کوئی اولاد ہے اور نہ وہ کسی کی اولاد ہے ، اور اس کے برابر کا کوئی نہیں ہے ۔",
    "translationHinglish": "keh do woh allah aik hai, Allah be niaz hai, nah is ki koi aulaad hai aur nah woh kisi ki aulaad hai, aur is ke barabar ka koi nahi hai .",
    "detailEn": "Whoever recites the last three surah three times in the morning and three times in the evening, this process is enough for him to provide for everything in the world.",
    "detailUr": "جو شخص آخری تینوں قل تین دفعہ صبح اور تین دفعہ شام کے وقت پڑھے، یہ عمل اس کے لیے دنیا کی ہر چیز کی کفالت کے واسطے کافی ہو جاتا ہے۔",
    "detailHinglish": "jo shakhs aakhri tenu qul teen dafaa subah aur teen dafaa shaam ke waqt parhay, yeh amal is ke liye duniya ki har cheez ki kifalat ke wastay kaafi ho jata hai.",
    "repeatCount": 3,
    "reference": "Sunan Abu Dawood 5082"
  },
  {
    "id": "morning-azkar-3",
    "categoryName": "Morning Azkar",
    "supplication": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ  ۔ قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ  ۔ مِنْ شَرِّ مَا خَلَقَ  ۔  وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ  ۔  وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ  ۔  وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ  ۔",
    "translationEn": "SAY: \"I SEEK refuge with the Lord of rising day, From the evil of what He has created, And the evil of evening darkness when it overspreads, From the evil of sorceresses who blow incantations on knots, From the evil of the envier when he envies.",
    "translationUr": "کہہ دو صبح کے پیدا کرنے والے کی پناہ مانگتا ہوں، اس کی مخلوقات کے شر سے، اور اندھیری رات کے شر سے جب وہ چھا جائے، اورگرہوں میں پھونکنے والیوں کے شر سے، اور حسد کرنے والے کے شر سے جب وہ حسد کرے۔",
    "translationHinglish": "keh do subah ke peda karne walay ki panah mangta hon, is ki makhloqaat ke shar se, aur andheri raat ke shar se jab woh chhaa jaye, اورگرہوں mein phoonknay walion ke shar se, aur hasad karne walay ke shar se jab woh hasad kere .",
    "detailEn": "Whoever recites the last three surah three times in the morning and three times in the evening, this process is enough for him to provide for everything in the world.",
    "detailUr": "جو شخص آخری تینوں قل تین دفعہ صبح اور تین دفعہ شام کے وقت پڑھے، یہ عمل اس کے لیے دنیا کی ہر چیز کی کفالت کے واسطے کافی ہو جاتا ہے۔",
    "detailHinglish": "jo shakhs aakhri tenu qul teen dafaa subah aur teen dafaa shaam ke waqt parhay, yeh amal is ke liye duniya ki har cheez ki kifalat ke wastay kaafi ho jata hai.",
    "repeatCount": 3,
    "reference": "Sunan Abu Dawood 5082"
  },
  {
    "id": "morning-azkar-4",
    "categoryName": "Morning Azkar",
    "supplication": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ  ۔  قُلْ أَعُوذُ بِرَبِّ النَّاسِ  ۔  مَلِكِ النَّاسِ  ۔  إِلَٰهِ النَّاسِ  ۔  مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ  ۔ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ  ۔ مِنَ الْجِنَّةِ وَالنَّاسِ ۔",
    "translationEn": "SAY: \"I SEEK refuge with the Lord of men, The King of men, The God of men, From the evil of him who breathes temptations into the minds of men, Who suggests evil thoughts to the hearts of men -- From among the jinns and men.",
    "translationUr": "کہہ دو میں لوگوں کے رب کی پناہ میں آیا، لوگوں کے بادشاہ کی، لوگوں کے معبود کی، اس شیطان کے شر سے جووسوسہ ڈال کر چھپ جاتا ہے، جو لوگوں کے سینوں میں وسوسہ ڈالتا ہے، جنوں اور انسانوں میں سے ۔",
    "translationHinglish": "keh do mein logon ke rab ki panah mein aaya, logon ke badshah ki, logon ke mabood ki, is shetan ke shar se jo waswase daal kar choup jata hai, jo logon ke seenon mein waswasa dalta hai, junoo aur insanon mein se .",
    "detailEn": "Whoever recites the last three surah three times in the morning and three times in the evening, this process is enough for him to provide for everything in the world.",
    "detailUr": "جو شخص آخری تینوں قل تین دفعہ صبح اور تین دفعہ شام کے وقت پڑھے، یہ عمل اس کے لیے دنیا کی ہر چیز کی کفالت کے واسطے کافی ہو جاتا ہے۔",
    "detailHinglish": "jo shakhs aakhri tenu qul teen dafaa subah aur teen dafaa shaam ke waqt parhay, yeh amal is ke liye duniya ki har cheez ki kifalat ke wastay kaafi ho jata hai.",
    "repeatCount": 3,
    "reference": "Sunan Abu Dawood 5082"
  },
  {
    "id": "morning-azkar-5",
    "categoryName": "Morning Azkar",
    "supplication": "حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ ۖ عَلَيْهِ تَوَكَّلْتُ ۖ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ ۔",
    "translationEn": "God is sufficient for me. There is no God but He; I depend on Him alone, the Lord of the glorious Throne.",
    "translationUr": "مجھے الله ہی کافی ہے اس کے سوا اور کوئی معبود نہیں اسی پر میں بھروسہ کرتا ہوں اور وہی عرش عظیم کا مالک ہے",
    "translationHinglish": "mujhe allah hi kaafi hai is ke siwa aur koi mabood nahi isi par mein bharosa karta hon aur wohi arsh azeem ka maalik hai",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 7,
    "reference": "Sunan Abu Dawood 5081"
  },
  {
    "id": "morning-azkar-6",
    "categoryName": "Morning Azkar",
    "supplication": "اَصْبَحْنَا وَاَصْبَحَ الْمُلْکُ لِلّٰہِ وَالْحَمْدُلِلّٰہِ لَآ اِلٰہَ اِلَّا اللّٰہُ وَحْدَہٗ لَاشَرِیْکَ لَہٗ، لَہُ الْمُلْکُ وَلَہُ الْحَمْدُ وَھُوَ عَلٰی کُلِّ شَیْءٍ قَدِیْرٌ، رَبِّ اَسْئَلُکَ خَیْرَ مَا فِیْ ھٰذَا الْیَوْمِ وَخَیْرَ مَا بَعْدَہٗ وَاَعُوْذُبِکَ مِنْ شَرِّ مَا فِیْ ھٰذَا الْیَوْمِ وَشَرِّ مَا بَعْدَہٗ، رَبِّ اَعُوْذُبِکَ مِنَ الْکَسَلِ وَسُوْءِ الْکِبَرِ رَبِّ اَعُوْذُبِکَ مِنْ عَذَابٍ فِی النَّارِ وَعَذَابٍ فِی الْقَبْرِ",
    "translationEn": "We have reached the morning and at this very time unto Allah belongs all sovereignty and all praise is for Allah. None has the right to be worshipped except Allah, alone, without any partner, to Him belongs all sovereignty and praise and everything is in His control. My Lord, I ask You for the good of this day and the good of what follows it and I take refuge in You from the evil of this day and the evil of what follows it. My Lord, I take refuge in You from laziness and senility. My Lord, I take refuge in You from torment in the Fire and punishment in the grave.",
    "translationUr": "ہم نے صبح کی اور اللہ کے سارے ملک نے صبح کی اور سب تعریف اللہ ہی کے لیے ہے۔ اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے، اس کا کوئی شریک نہیں، اسی کی بادشاہت ہے اور اسی کے لیے سب تعریف ہے اور وہ ہر چیز پر کامل قدرت رکھتا ہے۔ اے میرے رب! میں تجھ سے اس دن کی بہتری کا سوال کرتا ہوں اور اس دن کی بہتری کا جو اس کے بعد آنے والا ہے اور میں اس دن کے شر سے تیری پناہ میں آتا ہوں اور اس کے بعد آنے والے دن کے شر سے۔ اے میرے رب! میں کاہلی اور بڑھاپے کی خرابی سے تیری پناہ میں آتا ہوں۔ اے میرے رب! میں آگ کے عذاب سے اور قبر کے عذاب سے تیری پناہ میں آتا ہوں۔",
    "translationHinglish": "hum ne subah ki aur Allah ke saaray malik ne subah ki aur sab tareef Allah hi ke liye hai. Allah ke siwa koi mabood nahi, woh akela hai, is ka koi shareek nahi, isi ki badshahat hai aur isi ke liye sab tareef hai aur woh har cheez par kaamil qudrat rakhta hai. ae mere rab! mein tujh se is din ki behtari ka sawal karta hon aur is din ki behtari ka jo is ke baad anay wala hai aur mein is din ke shar se teri panah mein aata hon aur is ke baad anay walay din ke shar se. ae mere rab! mein kahili aur burhapay ki kharabi se teri panah mein aata hon. ae mere rab! mein aag ke azaab se aur qabar ke azaab se teri panah mein aata hon .\r\n\r\n",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 1,
    "reference": "Sahih Al Muslim 2723"
  },
  {
    "id": "morning-azkar-7",
    "categoryName": "Morning Azkar",
    "supplication": "اَللّٰھُمَّ مَآ اَصْبَحَ بِیْ مِنْ نِّعْمَۃٍ اَوْ بِاَحَدٍ مِّنْ خَلْقِکَ فَمِنْکَ وَحْدَکَ لَا شَرِیْکَ لَکَ، فَلَکَ الْحَمْدُ وَلَکَ الشُّکْرُ",
    "translationEn": "O Allah, whatever blessing I or any of Your creation have risen upon is from You alone, without any partner, so for You is all praise and unto You all thanks.",
    "translationUr": "اے اللہ! صبح کے وقت مجھ پر یا تیری مخلوق میں سے کسی پر جو بھی انعام ہوا ہے، وہ تیری ہی طرف سے ہے۔ تو اکیلا ہے، تیرا کوئی شریک نہیں، پس تیرے ہی لیے سب تعریف ہے اور تیرے ہی لیے شکر ہے۔",
    "translationHinglish": "ae Allah ! subah ke waqt mujh par ya teri makhlooq mein se kisi par jo bhi inaam sun-hwa hai, woh teri hi taraf se hai. to akela hai, tera koi shareek nahi, pas tairay hi liye sab tareef hai aur tairay hi liye shukar hai .",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 1,
    "reference": "Sunan Abu Dawood 5073"
  },
  {
    "id": "morning-azkar-8",
    "categoryName": "Morning Azkar",
    "supplication": "اَللّٰھُمَّ بِکَ اَصْبَحْنَا وَبِکَ اَمْسَیْنَا وَبِکَ نَحْیَا وَبِکَ نَمُوْتُ وَاِلَیْکَ النُّشُوْرُ",
    "translationEn": "O Allah, by Your leave we have reached the morning and by Your leave we have reached the evening, by Your leave we live and die and unto You is our resurrection.",
    "translationUr": "اے اللہ! تیری ہی حفاظت میں ہم نے صبح کی اور تیری ہی حفاظت میں شام کی اور تیرے ہی نام پر ہم زندہ ہوتے اور تیرے ہی نام پر ہم مرتے ہیں اور تیری ہی طرف لوٹنا ہے۔",
    "translationHinglish": "ae Allah ! teri hi hifazat mein hum ne subah ki aur teri hi hifazat mein shaam ki aur tairay hi naam par hum zindah hotay aur tairay hi naam par hum martay hain aur teri hi taraf lootna hai .\r\n\r\n",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 1,
    "reference": "Al Silsila Tul Sahiha 262"
  },
  {
    "id": "morning-azkar-9",
    "categoryName": "Morning Azkar",
    "supplication": "یَا حَیُّ یَا قَیُّوْمُ بِرَحْمَتِکَ اَسْتَغِیْثُ اَصْلِحْ لِیْ شَاْنِیْ کُلَّہٗ، وَلَا تَکِلْنِیْٓ اِلٰی نَفْسِیْ طَرْفَۃَ عَیْنٍ",
    "translationEn": "O Ever Living, O Self-Subsisting and Supporter of All, by Your mercy, I seek assistance, rectify for me all of my affairs and don't leave me to myself even for the blink of an eye.",
    "translationUr": "اے زندۂ جاوید! اے قائم و دائم! میں تیری ہی رحمت کے ذریعے سے مدد طلب کرتا ہوں، تو میرا ہر کام سنوار دے اور آنکھ جھپکنے کے برابر بھی مجھے میرے نفس کے سپرد نہ کرنا۔",
    "translationHinglish": "ae zinda Javed ! ae qaim o daaim! mein teri hi rehmat ke zariye se madad talabb karta hon, to mera har kaam sanwaar day aur aankh jhapkane ke barabar bhi mujhe mere nafs ke supurd nah karna .\n\n",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 1,
    "reference": "Mustadrak Al Hakim 2000"
  },
  {
    "id": "morning-azkar-10",
    "categoryName": "Morning Azkar",
    "supplication": "اَصْبَحْنَا وَاَصْبَحَ الْمُلْکُ لِلّٰہِ رَبِّ الْعَالَمِیْنَ، اَللّٰھُمَّ اِنِّیْٓ اَسْئَلُکَ خَیْرَ ھٰذَا الْیَوْمِ فَتْحَہٗ وَنَصْرَہٗ وَنُوْرَہٗ وَبَرَکَتَہٗ وَھُدَاہُ، وَاَعُوْذُبِکَ مِنْ شَرِّ مَا فِیْہِ وَشَرِّ مَا بَعْدَہٗ",
    "translationEn": "We have reached the morning and at this very time all sovereignty belongs to Allah, Lord of the Worlds. O Allah, I ask You for the good of this day, its triumphs and its victories, its light and its blessings, and its guidance. And I take refuge in You from the evil of this day and the evil that follows it.",
    "translationUr": "ہم نے صبح کی اور اللہ رب العالمین کے سارے ملک نے صبح کی۔ اے اللہ! میں تجھ سے اس دن کی بہتری مانگتا ہوں، اس کی فتح و نصرت، اس کا نور، اس کی برکت اور اس کی ہدایت اور میں اس دن کے شر اور اس کے بعد کے شر سے تیری پناہ چاہتا ہوں۔",
    "translationHinglish": "hum ne subah ki aur Allah rab alameen ke saaray malik ne subah ki. ae Allah ! mein tujh se is din ki behtari mangta hon, is ki fatah o nusrat, is ka noor, is ki barket aur is ki hadaayat aur mein is din ke shar aur is ke baad ke shar se teri panah chahta hon .\r\n\r\n",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 1,
    "reference": "Sunan Abu Dawood 5084"
  },
  {
    "id": "morning-azkar-11",
    "categoryName": "Morning Azkar",
    "supplication": "اَصْبَحْنَا عَلٰی فِطْرَۃِ الْاِسْلَامِ وَعَلٰی کَلِمَۃِ الْاِخْلَاصِ وَعَلٰی دِیْنِ نَبِیِّنَا مُحَمَّدٍ وَّعَلٰی مِلَّۃِ اَبِیْنَا اِبْرَاھِیْمَ حَنِیْفًا مُّسْلِمًا وَّمَا کَانَ مِنَ الْمُشْرِکِیْنَ",
    "translationEn": "We rise upon the fitrah (religion) of Islam, and the word of pure faith, and upon the religion of our Prophet Muhammad and the religion of our forefather Ibrahim, who was a Muslim and of true faith and was not one of those who associate others with Allah.",
    "translationUr": "ہم نے فطرتِ اسلام، کلمۂ اخلاص، اپنے نبی حضرت محمد صلی اللہ علیہ وآلہ وسلم کے دین اور اپنے باپ حضرت ابراہیم علیہ السلام، جو یک رخ (اور) فرماں بردار تھے، کی ملت پر صبح کی اور وہ مشرکوں میں سے نہیں تھے۔",
    "translationHinglish": "hum ne Fitrat islam, kalma ikhlaas, –apne nabi hazrat Mohammad sale Allah alaihi wa-alehe wasallam ke deen aur –apne baap hazrat ibrahim alaihi salam, jo yak rukh ( aur ) farmaa bardaar thay, ki millat par subah ki aur woh mushrikon mein se nahi thay .\n\n",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 1,
    "reference": "Musnad Ahmad 406/3"
  },
  {
    "id": "morning-azkar-12",
    "categoryName": "Morning Azkar",
    "supplication": "اَللّٰھُمَّ عَافِنِیْ فِیْ بَدَنِیْ، اَللّٰھُمَّ عَافِنِیْ فِیْ سَمْعِیْ، اَللّٰھُمَّ عَافِنِیْ فِیْ بَصَرِیْ، لَآ اِلٰہَ اِلَّآ اَنْتَ، اَللّٰھُمَّ اِنِّیْٓ اَعُوْذُبِکَ مِنَ الْکُفْرِ وَالْفَقْرِ اَللّٰھُمَّ اِنِّیْٓ اَعُوْذُبِکَ مِنْ عَذَابِ الْقَبْرِ، لَآ اِلٰہَ اِلَّآ اَنْتَ",
    "translationEn": "O Allah, grant my body health, o Allah, grant my hearing health, o Allah, grant my sight health. None has the right to be worshipped except You. O Allah, I take refuge with You from disbelief and poverty, and I take refuge with You from the punishment of the grave. None has the right to be worshipped except You.",
    "translationUr": "اے اللہ! مجھے میرے بدن میں عافیت دے۔ اے اللہ! مجھے میرے کانوں میں عافیت دے۔ اے اللہ! مجھے میری آنکھوں میں عافیت دے، تیرے سوا کوئی معبود نہیں۔ اے اللہ! یقیناً میں کفر اور غربت سے تیری پناہ میں آتا ہوں اور اے اللہ! یقیناً میں عذابِ قبر سے تیری پناہ میں آتا ہوں، تیرے سوا کوئی معبود نہیں۔",
    "translationHinglish": "ae Allah ! mujhe mere badan mein aafiat day. ae Allah ! mujhe mere kaanon mein aafiat day. ae Allah ! mujhe meri aankhon mein aafiat day, tairay siwa koi mabood nahi. ae Allah ! yaqeenan mein kufar aur gurbat se teri panah mein aata hon aur ae Allah ! yaqeenan mein azabِ qabar se teri panah mein aata hon, tairay siwa koi mabood nahi .\r\n\r\n",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 3,
    "reference": "Sunan Abu Dawood 5090"
  },
  {
    "id": "morning-azkar-13",
    "categoryName": "Morning Azkar",
    "supplication": "بِسْمِ اللّٰہِ الَّذِیْ لَا یَضُرُّ مَعَ اسْمِہٖ شَیْءٌ فِی الْاَرْضِ وَلَا فِی السَّمَآءِ وَھُوَ السَّمِیْعُ الْعَلِیْمُ",
    "translationEn": "In the name of Allah with those name nothing is harmed on earth nor in the heavens and He is the All-Seeing, the All-Knowing.",
    "translationUr": "اس اللہ کے نام کے ساتھ جس کے نام کی برکت سے کوئی چیز نقصان نہیں پہنچا سکتی، زمین کی ہو یا آسمانوں کی اور وہ خوب سننے والا، خوب جاننے والا ہے۔",
    "translationHinglish": "is Allah ke naam ke sath jis ke naam ki barket se koi cheez nuqsaan nahi pouncha sakti, zameen ki ho ya asmano ki aur woh khoob suneney wala, khoob jan-nay wala hai .\r\n\r\n",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 3,
    "reference": "Sunan Abu Dawood 5088"
  },
  {
    "id": "morning-azkar-14",
    "categoryName": "Morning Azkar",
    "supplication": "رَضِیْتُ بِاللّٰہِ رَبًّا وَّبِالْاِسْلَامِ دِیْنًا وَّبِمُحَمَّدٍ نَبِیًّا",
    "translationEn": "I'm pleased with Allah as a Lord, and Islam as a religion and Muhammad as a Prophet.",
    "translationUr": "میں اللہ کے ساتھ (اس کے) رب ہونے پر راضی ہوگیا اور اسلام کے ساتھ (اس کے) دین ہونے پر اور محمد (صلی اللہ علیہ وآلہ وسلم) کے ساتھ (ان کے) نبی ہونے پر۔",
    "translationHinglish": "mein Allah ke sath ( is ke ) rab honay par raazi hogaya aur islam ke sath ( is ke ) deen honay par aur Mohammad ( sale Allah alaihi wa-alehe wasallam ) ke sath ( un ke ) nabi honay par.",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 3,
    "reference": "Sunan Abu Dawood 5072"
  },
  {
    "id": "morning-azkar-15",
    "categoryName": "Morning Azkar",
    "supplication": "سُبْحَانَ اللّٰہِ وَبِحَمْدِہٖ عَدَدَ خَلْقِہٖ وَرِضَا نَفْسِہٖ، وَزِنَۃَ عَرْشِہٖ وَمِدَادَ کَلِمَاتِہٖ",
    "translationEn": "How perfect is Allah and I praise Him by the number of His Creation and His pleasure and by the weight of His throne and the ink of His words.",
    "translationUr": "میں اللہ کی پاکیزگی بیان کرتا ہوں اس کی تعریفوں کے ساتھ، اس کی مخلوق کی تعداد کے برابر، اس کی ذات کی رضا کے برابر، اس کے عرش کے وزن اور اس کے کلمات کی روشنائی کے برابر۔",
    "translationHinglish": "mein Allah ki pakizgee bayan karta hon is ki tareefon ke sath, is ki makhlooq ki tadaad ke barabar, is ki zaat ki Raza ke barabar, is ke arsh ke wazan aur is ke kalmaat ki roshnaye ke barabar .\r\n\r\n",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 3,
    "reference": "Sahih Al Muslim 6913"
  },
  {
    "id": "morning-azkar-16",
    "categoryName": "Morning Azkar",
    "supplication": "اَللّٰھُمَّ اَنْتَ رَبِّیْ لَآ اِلٰہَ اِلَّآ اَنْتَ خَلَقْتَنِیْ وَاَنَا عَبْدُکَ وَاَنَا عَلٰی عَھْدِکَ وَ وَعْدِکَ مَا اسْتَطَعْتُ اَعُوْذُبِکَ مِنْ شَرِّ مَا صَنَعْتُ اَبُوْءُ لَکَ بِنِعْمَتِکَ عَلَیَّ وَاَبُوْءُ بِذَنۡۢبِیْ  فَاغْفِرْلِیْ فَاِنَّہٗ لَا یَغْفِرُ الذُّنُوْبَ اِلَّآ اَنْتَ",
    "translationEn": "O Allah, You are my Lord, none has the right to be worshipped except You, You created me and I am Your servent and I abide to Your covenant and promise as best as I can, I take refuge in You from the evil of which I have commited. I acknowledge Your favor upon me and I acknowledge my sin, so fogrive me, for verily none can forgive sin except You.",
    "translationUr": "اے اللہ! تو ہی میرا رب ہے، تیرے سوا کوئی معبود نہیں، تو نے مجھے پیدا فرمایا اور میں تیرا بندہ ہوں اور میں اپنی طاقت کے مطابق تیرے عہد اور وعدے پر قائم ہوں، میں تجھ سے اس چیز کے شر سے پناہ مانگتا ہوں جس کا میں نے ارتکاب کیا، میں تیرے سامنے تیرے انعام کا اقرار کرتا ہوں جو مجھ پر ہوا اور میں اپنے گناہوں کا اقرار کرتا ہوں، لہٰذا تو مجھے معاف کردے۔ واقعہ یہ ہے کہ تیرے سوا کوئی گناہوں کو معاف نہیں کرسکتا۔",
    "translationHinglish": "ae Allah ! to hi mera rab hai, tairay siwa koi mabood nahi, to ne mujhe peda farmaya aur mein tera bandah hon aur mein apni taaqat ke mutabiq tairay ehad aur waday par qaim hon, mein tujh se is cheez ke shar se panah mangta hon jis ka mein ne irtikaab kya, mein tairay samnay tairay inaam ka iqraar karta hon jo mujh par sun-hwa aur mein –apne gunaaho ka iqraar karta hon, lehaza to mujhe maaf kardey. waqea yeh hai ke tairay siwa koi gunaaho ko maaf nahi karsaktha .\r\n\r\n",
    "detailEn": "This prayer is called Syed ul Istighfar.",
    "detailUr": "یہ دعا سیدالاستغفار کہلاتی ہے۔",
    "detailHinglish": "yeh dua سیدالاستغفار kehlati hai.",
    "repeatCount": 1,
    "reference": "Sahih Al Bukhari 6306"
  },
  {
    "id": "morning-azkar-17",
    "categoryName": "Morning Azkar",
    "supplication": "اَللّٰھُمَّ اِنِّیْٓ اَصْبَحْتُ اُشْھِدُکَ وَاُشْھِدُ حَمَلَۃَ عَرْشِکَ وَمَلَآئِکَتَکَ وَجَمِیْعَ خَلْقِکَ اَنَّکَ اَنْتَ اللّٰہُ لَآ اِلٰہَ اِلَّآ اَنْتَ وَحْدَکَ لَا شَرِیْکَ لَکَ وَاَنَّ مُحَمَّدًا عَبْدُکَ وَرَسُوْلُکَ",
    "translationEn": "O Allah, verily I have reached the morning and I call on You, the bearers of Your throne, Your angels, and all of Your Creation, to withness that You are Allah, none has the right to be worshipped except You, alone, without any partner and that Muhammad is Your servant and messenger.",
    "translationUr": "اے اللہ! یقیناً میں نے ایسی حالت میں صبح کی کہ تجھے، تیرا عرش اٹھانے والے فرشتوں، تیرے (دیگر) فرشتوں اور تیری تمام مخلوق کو اس بات پر گواہ بناتا ہوں کہ تو ہی اللہ ہے، تیرے سوا کوئی معبود نہیں، تو اکیلا ہے، تیرا کوئی شریک نہیں اور بلاشبہ محمد (صلی اللہ علیہ وآلہ وسلم) تیرے بندے اور تیرے رسول ہیں۔",
    "translationHinglish": "ae Allah ! yaqeenan mein ne aisi haalat mein subah ki ke tujhe, tera arsh uthany walay firshton, tairay ( deegar ) firshton aur teri tamam makhlooq ko is baat par gawah banata hon ke to hi Allah hai, tairay siwa koi mabood nahi, to akela hai, tera koi shareek nahi aur bilashuba Mohammad ( sale Allah alaihi wa-alehe wasallam ) tairay bande aur tairay rasool hain .\r\n\r\n",
    "detailEn": "Whoever recites this prayer, Allah Almighty will free him from the fire.",
    "detailUr": "جو شخص یہ دعا پڑھے گا، اللہ تعالیٰ اسے آگ سے آزاد کرے گا۔",
    "detailHinglish": "jo shakhs yeh dua parhay ga, Allah taala usay aag se azad kere ga.",
    "repeatCount": 4,
    "reference": "Sunan Abu Dawood 5069"
  },
  {
    "id": "morning-azkar-18",
    "categoryName": "Morning Azkar",
    "supplication": "اَللّٰھُمَّ اِنِّیْٓ اَسْئَلُکَ الْعَفْوَ وَالْعَافِیَۃَ فِی الدُّنْیَا وَالْاٰخِرَۃِ، اَللّٰھُمَّ اِنِّیْٓ اَسْئَلُکَ الْعَفْوَ وَالْعَافِیَۃَ فِی دِیْنِیْ وَدُنْیَایَ وَاَھْلِیْ وَمَالِیْ، اَللّٰھُمَّ اسْتُرْ عَوْرَاتِیْ وَاٰمِنْ رَّوْعَاتِیْ، اَللّٰھُمَّ احْفَظْنِیْ مِنْۢ بَیْنِ یَدَیَّ وَمِنْ خَلْفِیْ وَعَنْ یَّمِیْنِیْ وَعَنْ شِمَالِیْ وَمِنْ فَوْقِیْ وَاَعُوْذُ بِعَظَمَتِکَ اَنْ اُغْتَالَ مِنْ تَحْتِیْ",
    "translationEn": "O Allah, I ask You for pardon and well-being in this life and the next. O Allah, I ask You for pardon and well-being in my religious and worldly affairs, and my family and my wealth. O Allah, veil my weaknesses and set at ease my dismay. O Allah, preserve me from the front and from behind and on my right and on my left and from above, and I take refuge with you lest I be swallowed up by the earth.",
    "translationUr": "اے اللہ! بے شک میں تجھ سے دنیا اور آخرت میں معافی اور عافیت کا سوال کرتا ہوں، اے اللہ! بے شک میں تجھ سے اپنے دین، اپنی دنیا اور اپنے اہل و مال میں معافی اور عافیت کا سوال کرتا ہوں۔ اے اللہ! میرے عیبوں پر پردہ ڈال دے اور میری گھبراہٹوں میں امن دے۔ اے اللہ! تو میری حفاظت فرما میرے سامنے سے، میرے پیچھے سے، میری دائیں طرف سے، میری بائیں طرف سے اور میرے اوپر سے۔ اور میں تیری عظمت کے ساتھ اس بات سے پناہ مانگتا ہوں کہ ناگہاں اپنے نیچے سے ہلاک کیا جاؤں۔",
    "translationHinglish": "ae Allah ! be shak mein tujh se duniya aur akhirat mein maffi aur aafiat ka sawal karta hon, ae Allah ! be shak mein tujh se –apne deen, apni duniya aur –apne ahal o maal mein maffi aur aafiat ka sawal karta hon. ae Allah ! mere aiboon par parda daal day aur meri ghabrahatoon mein aman day. ae Allah ! to meri hifazat farma mere samnay se, mere peechay se, meri dayen taraf se, meri baen taraf se aur mere oopar se. aur mein teri Azmat ke sath is baat se panah mangta hon ke nagahan –apne neechay se halaak kya jaoon .\n\n",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 1,
    "reference": "Sunan Abu Dawood 5074"
  },
  {
    "id": "morning-azkar-19",
    "categoryName": "Morning Azkar",
    "supplication": "اَللّٰھُمَّ عَالِمَ الْغَیْبِ وَالشَّھَادَۃِ فَاطِرَالسَّمٰوٰتِ وَالْاَرْضِ رَبَّ کُلِّ شَیْءٍ وَمَلِیْکَہٗ، اَشْھَدُ اَنْ لَّآ اِلٰہَ اِلَّا اَنْتَ، اَعُوْذُبِکَ مِنْ شَرِّ نَفْسِیْ وَمِنْ شَرِّ الشَّیْطَانِ وَشِرْکِہٖ وَاَنْ اَقْتَرِفَ عَلٰی نَفْسِیْ سُوْٓءً ا اَوْ اَجُرَّہٗ اِلٰی مُسْلِمٍ",
    "translationEn": "O Allah, Knower of the unseen and the seen, Creator of the Heavens and the Earth, Lord and Sovereign of all things, I bear witness that none has the right to be worshipped except You. I take refuge in You from the evil of my soul and from the evil and shirk of shaytan and from committing wrong against my soul and bringing such upon another Muslim.",
    "translationUr": "اے اللہ! غیب اور حاضر کے جاننے والے! آسمانوں اور زمین کے پیدا کرنے والے! ہر چیز کے رب اور اس کے مالک! میں گواہی دیتا ہوں کہ تیرے سوا کوئی معبود نہیں۔ میں تیری پناہ میں آتا ہوں اپنے نفس کے شر سے اور شیطان کے شر سے اور اس کے شرک سے اور اس بات سے کہ اپنے ہی خلاف کسی برائی کا ارتکاب کروں یا اسے کسی مسلمان کی طرف کھینچ لاؤں۔",
    "translationHinglish": "ae Allah ! ghaib aur haazir ke jan-nay walay! asmano aur zameen ke peda karne walay! har cheez ke rab aur is ke maalik! mein gawahi deta hon ke tairay siwa koi mabood nahi. mein teri panah mein aata hon –apne nafs ke shar se aur shetan ke shar se aur is ke shirk se aur is baat se ke –apne hi khilaaf kisi buraiee ka irtikaab karoon ya usay kisi musalman ki taraf khech lau .\n\n",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 1,
    "reference": "Sunan Abu Dawood 5083"
  },
  {
    "id": "morning-azkar-20",
    "categoryName": "Morning Azkar",
    "supplication": "لَآ اِلٰہَ اِلَّا اللّٰہُ وَحْدَہٗ لَاشَرِیْکَ لَہٗ، لَہُ الْمُلْکُ وَلَہُ الْحَمْدُ وَھُوَ عَلٰی کُلِّ شَیْءٍ قَدِیْرٌ",
    "translationEn": "None has the right to be worshipped except Allah, alone, without any partner, to Him belong all sovereignty and praise and everything is in His control.",
    "translationUr": "اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے، اس کا کوئی شریک نہیں، اسی کی بادشاہت اور اسی کی تعریف ہے اور وہ ہر چیز پر کامل قدرت رکھتا ہے۔",
    "translationHinglish": "Allah ke siwa koi mabood nahi, woh akela hai, is ka koi shareek nahi, isi ki badshahat aur isi ki tareef hai aur woh har cheez par kaamil qudrat rakhta hai .\n\n",
    "detailEn": "Whoever recites it in the morning, ten good deeds will be written for him, ten sins will be forgiven, ten degrees will be raised and this prayer is equal to freeing ten necks from the children of Ismaeel. He will keep the one who prays safe from the devil. And whoever reads it in the evening has the same reward.",
    "detailUr": "جو شخص اسے صبح کے وقت پڑھے گا، اُس کے لیے دس نیکیاں لکھی جائیں گی، دس گناہ معاف کردیے جائیں گے، دس درجات بلند کیے جائیں گے اور یہ دعا بنو اسماعیل میں سے دس گردنیں آزاد کرنے کے برابر ہے، نیز اللہ تعالیٰ یہ دعا پڑھنے والے کو شیطان سے محفوظ رکھے گا۔ اور جو اسے شام کے وقت پڑھے گا، اُس کے لیے بھی یہی اجر ہے۔ ",
    "detailHinglish": "jo shakhs usay subah ke waqt parhay ga, uss ke liye das naikian likhi jayen gi, das gunah maaf kardiye jayen ge, das darjaat buland kiye jayen ge aur yeh dua bano ismael mein se das gardanein azad karne ke barabar hai, neez Allah taala yeh dua parhnay walay ko shetan se mehfooz rakhay ga. aur jo usay shaam ke waqt parhay ga, uss ke liye bhi yahi ajar hai.",
    "repeatCount": 10,
    "reference": "Sunan Abu Dawood 5077"
  },
  {
    "id": "morning-azkar-21",
    "categoryName": "Morning Azkar",
    "supplication": "سُبْحَانَ اللّٰہِ وَبِحَمْدِہ",
    "translationEn": "How perfect is Allah and I praise Him.",
    "translationUr": "میں اللہ کی پاکیزگی بیان کرتا ہوں اس کی تعریف کے ساتھ۔",
    "translationHinglish": "mein Allah ki pakizgee bayan karta hon is ki tareef ke sath .\r\n\r\n",
    "detailEn": "Whoever recites this supplication a hundred times in the morning will be rewarded with the release of ten slaves, one hundred good deeds will be written in his name and one hundred sins will be erased, and with the blessing of these words that evening Until then he will be safe from the devil and no one will come up with a better deed than him. However, if a person says it more often (it can be better than that).",
    "detailUr": "جو شخص سو مرتبہ صبح کے وقت یہ دعا پڑھے گا، اسے دس غلام آزاد کرنے کے برابر ثواب ملے گا، ایک سو نیکیاں اس کے نام لکھی جائیں گی اور اس کے ایک سو گناہ مٹادیے جائیں گے اور ان الفاظ کی برکت سے اس دن شام تک وہ شیطان سے محفوظ رہے گا اور کوئی شخص اس سے افضل عمل لے کر نہیں آئے گا۔ تاہم اگر کوئی شخص زیادہ دفعہ کہے (تو وہ اس سے بہتر ہوسکتا ہے۔)",
    "detailHinglish": "jo shakhs so martaba subah ke waqt yeh dua parhay ga, usay das ghulam azad karne ke barabar sawab miley ga, aik so naikian is ke naam likhi jayen gi aur is ke aik so gunah mtadie jayen ge aur un alfaaz ki barket se is din shaam tak woh shetan se mehfooz rahay ga aur koi shakhs is se afzal amal le kar nahi aaye ga. taham agar koi shakhs ziyada dafaa kahe ( to woh is se behtar ho sakta hai.",
    "repeatCount": 100,
    "reference": "Sahih Al Muslim 2692"
  },
  {
    "id": "morning-azkar-22",
    "categoryName": "Morning Azkar",
    "supplication": "لَآ اِلٰہَ اِلَّا اللّٰہُ وَحْدَہٗ لَاشَرِیْکَ لَہٗ، لَہُ الْمُلْکُ وَلَہُ الْحَمْدُ وَھُوَ عَلٰی کُلِّ شَیْءٍ قَدِیْرٌ",
    "translationEn": "None has the right to be worshipped except Allah, alone, without any partner, to Him belong all sovereignty and praise and everything is in His control.",
    "translationUr": "اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے، اس کا کوئی شریک نہیں، اسی کی بادشاہت اور اسی کی تعریف ہے اور وہ ہر چیز پر کامل قدرت رکھتا ہے۔",
    "translationHinglish": "Allah ke siwa koi mabood nahi, woh akela hai, is ka koi shareek nahi, isi ki badshahat aur isi ki tareef hai aur woh har cheez par kaamil qudrat rakhta hai .\r\n\r\n",
    "detailEn": "Any time of the day",
    "detailUr": "دن بھر میں کسی بھی وقت",
    "detailHinglish": "din bhar mein kisi bhi waqt",
    "repeatCount": 100,
    "reference": "Sahih Al Bukhari 3293"
  },
  {
    "id": "morning-azkar-23",
    "categoryName": "Morning Azkar",
    "supplication": "اَسْتَغْفِرُ اللّٰہَ وَاَتُوْبُ اِلَیْہِ",
    "translationEn": "I seek Allah's forgiveness and I turn to Him in repentance.",
    "translationUr": "میں اللہ سے بخشش مانگتا ہوں اور اس کے حضور توبہ کرتا ہوں۔",
    "translationHinglish": "mein Allah se bakhshish mangta hon aur is ke huzoor tauba karta hon .\r\n\r\n",
    "detailEn": "Any time of the day",
    "detailUr": "دن بھر میں کسی بھی وقت",
    "detailHinglish": "din bhar mein kisi bhi waqt",
    "repeatCount": 100,
    "reference": "Sahih Al Bukhari 6307"
  },
  {
    "id": "morning-azkar-24",
    "categoryName": "Morning Azkar",
    "supplication": "اَللّٰھُمَّ صَلِّ عَلٰی مُحَمَّدٍ وَّعَلٰٓی اٰلِ مُحَمَّدٍ",
    "translationEn": "O Allah, send blessing upon our Prophet Muhammad and his family.",
    "translationUr": "اے اللہ! رحمت نازل فرما محمد (صلی اللہ علیہ وآلہ وسلم) پر اور آل محمد (صلی اللہ علیہ وآلہ وسلم) پر۔",
    "translationHinglish": "ae Allah ! rehmat nazil farma Mohammad ( sale Allah alaihi wa-alehe wasallam ) par aur all Mohammad ( sale Allah alaihi wa-alehe wasallam ) par .\r\n\r\n",
    "detailEn": "Any Masnoon Durood Sharif",
    "detailUr": "کوئی سا مسنون درود شریف",
    "detailHinglish": "koi sa masnoon duroood shareef",
    "repeatCount": 10,
    "reference": "Sunan an-Nasa'i 1293"
  },
  {
    "id": "evening-azkar-1",
    "categoryName": "Evening Azkar",
    "supplication": "اَعُوْذُ بِاللّٰهِ مِنَ الشَّيْطٰنِ الرَّجِيْمِ\nاَللّٰهُ لَآ اِلٰهَ اِلَّا ھُوَ  ۚ اَلْـحَيُّ الْقَيُّوْمُ ڬ لَا تَاْخُذُهٗ سِـنَةٌ وَّلَا نَوْمٌ  ۭ لَهٗ مَا فِي السَّمٰوٰتِ وَمَا فِي الْاَرْضِ  ۭ مَنْ ذَا الَّذِيْ يَشْفَعُ عِنْدَهٗٓ اِلَّا بِاِذْنِهٖ ۭ يَعْلَمُ مَا بَيْنَ اَيْدِيْهِمْ وَمَا خَلْفَھُمْ ۚ وَلَا يُحِيْطُوْنَ بِشَيْءٍ مِّنْ عِلْمِهٖٓ اِلَّا بِمَا شَاۗءَ  ۚ وَسِعَ كُرْسِـيُّهُ السَّمٰوٰتِ وَالْاَرْضَ ۚ وَلَا يَـــــُٔـــوْدُهٗ حِفْظُهُمَا  ۚ وَھُوَ الْعَلِيُّ الْعَظِيْمُ ۔",
    "translationEn": "Allah - there is no deity except Him, the Ever-Living, the Sustainer of [all] existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is [presently] before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills. His Kursi extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great.",
    "translationUr": "میں اللہ کی پناہ مانگتا ہوں شیطان مردود سے\nاللہ تعالٰی ہی معبود برحق ہے جس کے سوا کوئی معبود نہیں جو زندہ اور سب کا تھامنے والا ہے ،  جسے نہ اونگھ آتی ہے نہ نیند ،  اس کی ملکیت میں زمین اور آسمانوں کی تمام چیزیں ہیں ۔  کون ہے جو اس کی اجازت کے بغیر اس کے سامنے شفاعت کرسکے ،  وہ جانتا ہے جو اس کے سامنے ہے اور جو ان کے پیچھے ہے اور وہ اس کے علم میں سے کسی چیز کا احاطہ نہیں کر سکتے مگر جتنا وہ چاہے ،   اس کی کرسی کی وُسعت  نے زمین اور آسمان کو گھیر رکھا ہے اور اللہ تعالٰی ان کی حفاظت سے نہ تھکتا ہے اور نہ اُکتاتا ہے وہ تو بہت بلند اور بہت بڑا ہے۔",
    "translationHinglish": "mein Allah ki panah mangta hon shetan mardood se.\nAllah taala hi mabood barhaq hai jis ke siwa koi mabood nahi jo zindah aur sab ka thaamnay wala hai, jisay nah ongh aati hai nah neend, is ki malkiat mein zameen aur asmano ki tamam cheeze hain. kon hai jo is ki ijazat ke baghair is ke samnay Shafaat kar sakay, woh jaanta hai jo is ke samnay hai aur jo un ke peechay hai aur woh is ke ilm mein se kisi cheez ka ihata nahi kar satke magar jitna woh chahay, is ki kursi ki wusat ne zameen aur aasman ko ghair rakha hai aur Allah taala un ki hifazat se nah thakta hai aur nah اکتاتا hai woh to bohat buland aur bohat bara hai .",
    "detailEn": "He who recites the Aya al-Kursi in the morning is safe from the jinn till evening and he who recites it in the evening is safe from them till morning.",
    "detailUr": "جو شخص صبح کے وقت آیۃالکرسی پڑھے وہ شام تک جنوں سے محفوظ ہوجاتا ہے اور جو اسے شام کے وقت پڑھے وہ صبح تک ان سے محفوظ ہو جاتا ہے۔",
    "detailHinglish": "jo shakhs subah ke waqt آیہالکرسی parhay woh shaam tak junoo se mehfooz hojata hai aur jo usay shaam ke waqt parhay woh subah tak un se mehfooz ho jata hai",
    "repeatCount": 1,
    "reference": "Sahih Al Targheeb Wal Tarheeb 662"
  },
  {
    "id": "evening-azkar-2",
    "categoryName": "Evening Azkar",
    "supplication": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ  ۔ قُلْ هُوَ اللَّهُ أَحَدٌ  ۔ اللَّهُ الصَّمَدُ  ۔ لَمْ يَلِدْ وَلَمْ يُولَدْ  ۔ وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ  ۔",
    "translationEn": "SAY: HE IS God the one the most unique, God the immanently indispensable. He has begotten no one, and is begotten of none. There is no one comparable to Him.",
    "translationUr": "کہہ دو وہ الله ایک ہے ، اللہ بے نیاز ہے، نہ اس کی کوئی اولاد ہے اور نہ وہ کسی کی اولاد ہے ، اور اس کے برابر کا کوئی نہیں ہے ۔",
    "translationHinglish": "keh do woh allah aik hai, Allah be niaz hai, nah is ki koi aulaad hai aur nah woh kisi ki aulaad hai, aur is ke barabar ka koi nahi hai .",
    "detailEn": "Whoever recites the last three surah three times in the morning and three times in the evening, this process is enough for him to provide for everything in the world.",
    "detailUr": "جو شخص آخری تینوں قل تین دفعہ صبح اور تین دفعہ شام کے وقت پڑھے، یہ عمل اس کے لیے دنیا کی ہر چیز کی کفالت کے واسطے کافی ہو جاتا ہے۔",
    "detailHinglish": "jo shakhs aakhri tenu qul teen dafaa subah aur teen dafaa shaam ke waqt parhay, yeh amal is ke liye duniya ki har cheez ki kifalat ke wastay kaafi ho jata hai.",
    "repeatCount": 3,
    "reference": "Sunan Abu Dawood 5082"
  },
  {
    "id": "evening-azkar-3",
    "categoryName": "Evening Azkar",
    "supplication": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ  ۔ قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ  ۔ مِنْ شَرِّ مَا خَلَقَ  ۔  وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ  ۔  وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ  ۔  وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ  ۔",
    "translationEn": "SAY: \"I SEEK refuge with the Lord of rising day, From the evil of what He has created, And the evil of evening darkness when it overspreads, From the evil of sorceresses who blow incantations on knots, From the evil of the envier when he envies.",
    "translationUr": "کہہ دو صبح کے پیدا کرنے والے کی پناہ مانگتا ہوں، اس کی مخلوقات کے شر سے، اور اندھیری رات کے شر سے جب وہ چھا جائے، اورگرہوں میں پھونکنے والیوں کے شر سے، اور حسد کرنے والے کے شر سے جب وہ حسد کرے۔",
    "translationHinglish": "keh do subah ke peda karne walay ki panah mangta hon, is ki makhloqaat ke shar se, aur andheri raat ke shar se jab woh chhaa jaye, اورگرہوں mein phoonknay walion ke shar se, aur hasad karne walay ke shar se jab woh hasad kere .",
    "detailEn": "Whoever recites the last three surah three times in the morning and three times in the evening, this process is enough for him to provide for everything in the world.",
    "detailUr": "جو شخص آخری تینوں قل تین دفعہ صبح اور تین دفعہ شام کے وقت پڑھے، یہ عمل اس کے لیے دنیا کی ہر چیز کی کفالت کے واسطے کافی ہو جاتا ہے۔",
    "detailHinglish": "jo shakhs aakhri tenu qul teen dafaa subah aur teen dafaa shaam ke waqt parhay, yeh amal is ke liye duniya ki har cheez ki kifalat ke wastay kaafi ho jata hai.",
    "repeatCount": 3,
    "reference": "Sunan Abu Dawood 5082"
  },
  {
    "id": "evening-azkar-4",
    "categoryName": "Evening Azkar",
    "supplication": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ  ۔  قُلْ أَعُوذُ بِرَبِّ النَّاسِ  ۔  مَلِكِ النَّاسِ  ۔  إِلَٰهِ النَّاسِ  ۔  مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ  ۔ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ  ۔ مِنَ الْجِنَّةِ وَالنَّاسِ ۔",
    "translationEn": "SAY: \"I SEEK refuge with the Lord of men, The King of men, The God of men, From the evil of him who breathes temptations into the minds of men, Who suggests evil thoughts to the hearts of men -- From among the jinns and men.",
    "translationUr": "کہہ دو میں لوگوں کے رب کی پناہ میں آیا، لوگوں کے بادشاہ کی، لوگوں کے معبود کی، اس شیطان کے شر سے جووسوسہ ڈال کر چھپ جاتا ہے، جو لوگوں کے سینوں میں وسوسہ ڈالتا ہے، جنوں اور انسانوں میں سے ۔",
    "translationHinglish": "keh do mein logon ke rab ki panah mein aaya, logon ke badshah ki, logon ke mabood ki, is shetan ke shar se jo waswase daal kar choup jata hai, jo logon ke seenon mein waswasa dalta hai, junoo aur insanon mein se .",
    "detailEn": "Whoever recites the last three surah three times in the morning and three times in the evening, this process is enough for him to provide for everything in the world.",
    "detailUr": "جو شخص آخری تینوں قل تین دفعہ صبح اور تین دفعہ شام کے وقت پڑھے، یہ عمل اس کے لیے دنیا کی ہر چیز کی کفالت کے واسطے کافی ہو جاتا ہے۔",
    "detailHinglish": "jo shakhs aakhri tenu qul teen dafaa subah aur teen dafaa shaam ke waqt parhay, yeh amal is ke liye duniya ki har cheez ki kifalat ke wastay kaafi ho jata hai.",
    "repeatCount": 3,
    "reference": "Sunan Abu Dawood 5082"
  },
  {
    "id": "evening-azkar-5",
    "categoryName": "Evening Azkar",
    "supplication": "حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ ۖ عَلَيْهِ تَوَكَّلْتُ ۖ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ ۔",
    "translationEn": "God is sufficient for me. There is no God but He; I depend on Him alone, the Lord of the glorious Throne.",
    "translationUr": "مجھے الله ہی کافی ہے اس کے سوا اور کوئی معبود نہیں اسی پر میں بھروسہ کرتا ہوں اور وہی عرش عظیم کا مالک ہے",
    "translationHinglish": "mujhe allah hi kaafi hai is ke siwa aur koi mabood nahi isi par mein bharosa karta hon aur wohi arsh azeem ka maalik hai",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 7,
    "reference": "Sunan Abu Dawood 5081"
  },
  {
    "id": "evening-azkar-6",
    "categoryName": "Evening Azkar",
    "supplication": "اَمْسَیْنَا وَاَمْسَی الْمُلْکُ لِلّٰہِ وَالْحَمْدُ لِلّٰہِ لَآ اِلٰہَ اِلَّا اللّٰہُ وَحْدَہٗ لَاشَرِیْکَ لَہٗ، لَہُ الْمُلْکُ وَلَہُ الْحَمْدُ وَھُوَ عَلٰی کُلِّ شَیْءٍ قَدِیْرٌ، رَبِّ اَسْئَلُکَ خَیْرَ مَا فِیْ ھٰذِہِ اللَّیْلَۃِ وَخَیْرَ مَا بَعْدَھَا وَاَعُوْذُبِکَ مِنْ شَرِّ مَا فِیْ ھٰذِہِ اللَّیْلَۃِ وَشَرِّ مَا بَعْدَھَا، رَبِّ اَعُوْذُبِکَ مِنَ الْکَسَلِ وَسُوْءِ الْکِبَرِ رَبِّ اَعُوْذُبِکَ مِنْ عَذَابٍ فِی النَّارِ وَعَذَابٍ فِی الْقَبْرِ",
    "translationEn": "We have reached the night and at this very time unto Allah belongs all sovereignty and all praise is for Allah. None has the right to be worshipped except Allah, alone, without any partner, to Him belongs all sovereignty and praise and everything is in His control. My Lord, I ask You for the good of this night and the good of what follows it and I take refuge in You from the evil of this night and the evil of what follows it. My Lord, I take refuge in You from laziness and senility. My Lord, I take refuge in You from torment in the Fire and punishment in the grave.",
    "translationUr": "ہم نے شام کی اور اللہ کے سارے ملک نے شام کی اور سب تعریف اللہ ہی کے لیے ہے۔ اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے، اس کا کوئی شریک نہیں، اسی کی بادشاہت ہے اور اسی کے لیے سب تعریف ہے اور وہ ہر چیز پر کامل قدرت رکھتا ہے۔ اے میرے رب! میں تجھ سے اس رات کی بہتری کا سوال کرتا ہوں اور اس رات کی بہتری کا جو اس کے بعد آنے والی ہے اور میں اس رات کے شر سے تیری پناہ میں آتا ہوں اور اس کے بعد آنے والی رات کے شر سے، اے میرے رب! میں کاہلی اور بڑھاپے کی خرابی سے تیری پناہ میں آتا ہوں۔ اے میرے رب! میں آگ کے عذاب سے اور قبر کے عذاب سے تیری پناہ میں آتا ہوں۔",
    "translationHinglish": "hum ne shaam ki aur Allah ke saaray malik ne shaam ki aur sab tareef Allah hi ke liye hai. Allah ke siwa koi mabood nahi, woh akela hai, is ka koi shareek nahi, isi ki badshahat hai aur isi ke liye sab tareef hai aur woh har cheez par kaamil qudrat rakhta hai. ae mere rab! mein tujh se is raat ki behtari ka sawal karta hon aur is raat ki behtari ka jo is ke baad anay wali hai aur mein is raat ke shar se teri panah mein aata hon aur is ke baad anay wali raat ke shar se, ae mere rab! mein kahili aur burhapay ki kharabi se teri panah mein aata hon. ae mere rab! mein aag ke azaab se aur qabar ke azaab se teri panah mein aata hon .\r\n\r\n",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 1,
    "reference": "Sahih Al Muslim 2723"
  },
  {
    "id": "evening-azkar-7",
    "categoryName": "Evening Azkar",
    "supplication": "اَللّٰھُمَّ مَآ اَمْسٰی بِیْ مِنْ نِّعْمَۃٍ اَوْبِاَحَدٍ مِّنْ خَلْقِکَ فَمِنْکَ وَحْدَکَ لَا شَرِیْکَ لَکَ، فَلَکَ الْحَمْدُ وَلَکَ الشُّکْرُ",
    "translationEn": "O Allah, whatever blessing I or any of Your creation have reached the evening upon is from You alone, without any partner, so for You is all praise and unto You all thanks.",
    "translationUr": "اے اللہ! شام کے وقت مجھ پر یا تیری مخلوق میں سے کسی پر جو بھی انعام ہوا ہے، وہ تیری ہی طرف سے ہے۔ تو اکیلا ہے، تیرا کوئی شریک نہیں، پس تیرے ہی لیے شکر ہے۔",
    "translationHinglish": "ae Allah ! shaam ke waqt mujh par ya teri makhlooq mein se kisi par jo bhi inaam sun-hwa hai, woh teri hi taraf se hai. to akela hai, tera koi shareek nahi, pas tairay hi liye shukar hai .",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 1,
    "reference": "Sunan Abu Dawood 5073"
  },
  {
    "id": "evening-azkar-8",
    "categoryName": "Evening Azkar",
    "supplication": "اَللّٰھُمَّ بِکَ اَمْسَیْنَا وَبِکَ اَصْبَحْنَا وَبِکَ نَحْیَا وَبِکَ نَمُوْتُ وَاِلَیْکَ الْمَصِیْرُ",
    "translationEn": "O Allah, by Your leave we have reached the evening and by Your leave we have reached the morning, by Your leave we live and die and unto You is our return.",
    "translationUr": "’اے اللہ! تیری ہی حفاظت میں ہم نے شام کی اور تیری ہی حفاظت میں صبح کی اور تیرے ہی نام کے ساتھ ہم زندہ ہوتے اور تیرے ہی نام کے ساتھ ہم مرتے ہیں اور تیری ہی طرف اٹھ کر جانا ہے۔",
    "translationHinglish": "ae Allah ! teri hi hifazat mein hum ne shaam ki aur teri hi hifazat mein subah ki aur tairay hi naam ke sath hum zindah hotay aur tairay hi naam ke sath hum martay hain aur teri hi taraf uth kar jana hai .\r\n\r\n",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 1,
    "reference": "Al Silsila Tul Sahiha 262"
  },
  {
    "id": "evening-azkar-9",
    "categoryName": "Evening Azkar",
    "supplication": "یَا حَیُّ یَا قَیُّوْمُ بِرَحْمَتِکَ اَسْتَغِیْثُ اَصْلِحْ لِیْ شَاْنِیْ کُلَّہٗ، وَلَا تَکِلْنِیْٓ اِلٰی نَفْسِیْ طَرْفَۃَ عَیْنٍ",
    "translationEn": "O Ever Living, O Self-Subsisting and Supporter of All, by Your mercy, I seek assistance, rectify for me all of my affairs and don't leave me to myself even for the blink of an eye.",
    "translationUr": "اے زندۂ جاوید! اے قائم و دائم! میں تیری ہی رحمت کے ذریعے سے مدد طلب کرتا ہوں، تو میرا ہر کام سنوار دے اور آنکھ جھپکنے کے برابر بھی مجھے میرے نفس کے سپرد نہ کرنا۔",
    "translationHinglish": "ae zinda Javed ! ae qaim o daaim! mein teri hi rehmat ke zariye se madad talabb karta hon, to mera har kaam sanwaar day aur aankh jhapkane ke barabar bhi mujhe mere nafs ke supurd nah karna .\n\n",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 1,
    "reference": "Mustadrak Al Hakim 2000"
  },
  {
    "id": "evening-azkar-10",
    "categoryName": "Evening Azkar",
    "supplication": "اَمْسَیْنَا وَاَمْسَی الْمُلْکُ لِلّٰہِ رَبِّ الْعَالَمِیْنَ، اَللّٰھُمَّ اِنِّیْٓ اَسْئَلُکَ خَیْرَ ھٰذِہِ اللَّیْلَۃِ فَتْحَھَا وَنَصْرَھَا وَنُوْرَھَا وَبَرَکَتَھَا وَھُدَاھَا، وَاَعُوْذُبِکَ مِنْ شَرِّ مَا فِیْھَا وَشَرِّ مَا بَعْدَھَا",
    "translationEn": "We have reaached the evening and at this very time all sovereignty belongs to Allah, Lord of the Worlds. O Allah, I ask You for the good of this night, its triumphs and its victories, its light and its blessings, and its guidance. And I take refuge in You from the evil of this day and the evil that follows it.",
    "translationUr": "ہم نے شام کی اور اللہ رب العالمین کے سارے ملک نے شام کی۔ اے اللہ! میں تجھ سے اس رات کی بہتری مانگتا ہوں، اس کی فتح و نصرت، اس کا نور، اس کی برکت اور اس کی ہدایت اور میں تجھ سے اس رات کے شر اور اس کے بعد کے شر سے پناہ چاہتا ہوں۔",
    "translationHinglish": "hum ne shaam ki aur Allah rab alameen ke saaray malik ne shaam ki. ae Allah ! mein tujh se is raat ki behtari mangta hon, is ki fatah o nusrat, is ka noor, is ki barket aur is ki hadaayat aur mein tujh se is raat ke shar aur is ke baad ke shar se panah chahta hon .\n\n",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 1,
    "reference": "Sunan Abu Dawood 5084"
  },
  {
    "id": "evening-azkar-11",
    "categoryName": "Evening Azkar",
    "supplication": "اَللّٰھُمَّ عَافِنِیْ فِیْ بَدَنِیْ، اَللّٰھُمَّ عَافِنِیْ فِیْ سَمْعِیْ، اَللّٰھُمَّ عَافِنِیْ فِیْ بَصَرِیْ، لَآ اِلٰہَ اِلَّآ اَنْتَ، اَللّٰھُمَّ اِنِّیْٓ اَعُوْذُبِکَ مِنَ الْکُفْرِ وَالْفَقْرِ اَللّٰھُمَّ اِنِّیْٓ اَعُوْذُبِکَ مِنْ عَذَابِ الْقَبْرِ، لَآ اِلٰہَ اِلَّآ اَنْتَ",
    "translationEn": "O Allah, grant my body health, o Allah, grant my hearing health, o Allah, grant my sight health. None has the right to be worshipped except You. O Allah, I take refuge with You from disbelief and poverty, and I take refuge with You from the punishment of the grave. None has the right to be worshipped except You.",
    "translationUr": "اے اللہ! مجھے میرے بدن میں عافیت دے۔ اے اللہ! مجھے میرے کانوں میں عافیت دے۔ اے اللہ! مجھے میری آنکھوں میں عافیت دے، تیرے سوا کوئی معبود نہیں۔ اے اللہ! یقیناً میں کفر اور غربت سے تیری پناہ میں آتا ہوں اور اے اللہ! یقیناً میں عذابِ قبر سے تیری پناہ میں آتا ہوں، تیرے سوا کوئی معبود نہیں۔",
    "translationHinglish": "ae Allah ! mujhe mere badan mein aafiat day. ae Allah ! mujhe mere kaanon mein aafiat day. ae Allah ! mujhe meri aankhon mein aafiat day, tairay siwa koi mabood nahi. ae Allah ! yaqeenan mein kufar aur gurbat se teri panah mein aata hon aur ae Allah ! yaqeenan mein azabِ qabar se teri panah mein aata hon, tairay siwa koi mabood nahi .\r\n\r\n",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 3,
    "reference": "Sunan Abu Dawood 5090"
  },
  {
    "id": "evening-azkar-12",
    "categoryName": "Evening Azkar",
    "supplication": "بِسْمِ اللّٰہِ الَّذِیْ لَا یَضُرُّ مَعَ اسْمِہٖ شَیْءٌ فِی الْاَرْضِ وَلَا فِی السَّمَآءِ وَھُوَ السَّمِیْعُ الْعَلِیْمُ",
    "translationEn": "In the name of Allah with those name nothing is harmed on earth nor in the heavens and He is the All-Seeing, the All-Knowing.",
    "translationUr": "اس اللہ کے نام کے ساتھ جس کے نام کی برکت سے کوئی چیز نقصان نہیں پہنچا سکتی، زمین کی ہو یا آسمانوں کی اور وہ خوب سننے والا، خوب جاننے والا ہے۔",
    "translationHinglish": "is Allah ke naam ke sath jis ke naam ki barket se koi cheez nuqsaan nahi pouncha sakti, zameen ki ho ya asmano ki aur woh khoob suneney wala, khoob jan-nay wala hai .\r\n\r\n",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 3,
    "reference": "Sunan Abu Dawood 5088"
  },
  {
    "id": "evening-azkar-13",
    "categoryName": "Evening Azkar",
    "supplication": "اَعُوْذُ بِکَلِمَاتِ للّٰہِ التَّآمَّاتِ مِنْ شَرِّ مَا خَلَقَ",
    "translationEn": "I take refuge in Allah's perfect words from the evil He has created.",
    "translationUr": "میں اللہ کے مکمل کلمات کی پناہ میں آتا ہوں، اس کی مخلوق کے شر سے۔",
    "translationHinglish": "mein Allah ke mukammal kalmaat ki panah mein aata hon, is ki makhlooq ke shar se .\r\n\r\n",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 3,
    "reference": "Sahih Al Muslim 6880"
  },
  {
    "id": "evening-azkar-14",
    "categoryName": "Evening Azkar",
    "supplication": "رَضِیْتُ بِاللّٰہِ رَبًّا وَّبِالْاِسْلَامِ دِیْنًا وَّبِمُحَمَّدٍ نَبِیًّا",
    "translationEn": "I'm pleased with Allah as a Lord, and Islam as a religion and Muhammad as a Prophet.",
    "translationUr": "میں اللہ کے ساتھ (اس کے) رب ہونے پر راضی ہوگیا اور اسلام کے ساتھ (اس کے) دین ہونے پر اور محمد (صلی اللہ علیہ وآلہ وسلم) کے ساتھ (ان کے) نبی ہونے پر۔",
    "translationHinglish": "mein Allah ke sath ( is ke ) rab honay par raazi hogaya aur islam ke sath ( is ke ) deen honay par aur Mohammad ( sale Allah alaihi wa-alehe wasallam ) ke sath ( un ke ) nabi honay par.",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 3,
    "reference": "Sunan Abu Dawood 5072"
  },
  {
    "id": "evening-azkar-15",
    "categoryName": "Evening Azkar",
    "supplication": "اَللّٰھُمَّ اَنْتَ رَبِّیْ لَآ اِلٰہَ اِلَّآ اَنْتَ خَلَقْتَنِیْ وَاَنَا عَبْدُکَ وَاَنَا عَلٰی عَھْدِکَ وَ وَعْدِکَ مَا اسْتَطَعْتُ اَعُوْذُبِکَ مِنْ شَرِّ مَا صَنَعْتُ اَبُوْءُ لَکَ بِنِعْمَتِکَ عَلَیَّ وَاَبُوْءُ بِذَنۡۢبِیْ  فَاغْفِرْلِیْ فَاِنَّہٗ لَا یَغْفِرُ الذُّنُوْبَ اِلَّآ اَنْتَ",
    "translationEn": "O Allah, You are my Lord, none has the right to be worshipped except You, You created me and I am Your servent and I abide to Your covenant and promise as best as I can, I take refuge in You from the evil of which I have commited. I acknowledge Your favor upon me and I acknowledge my sin, so fogrive me, for verily none can forgive sin except You.",
    "translationUr": "اے اللہ! تو ہی میرا رب ہے، تیرے سوا کوئی معبود نہیں، تو نے مجھے پیدا فرمایا اور میں تیرا بندہ ہوں اور میں اپنی طاقت کے مطابق تیرے عہد اور وعدے پر قائم ہوں، میں تجھ سے اس چیز کے شر سے پناہ مانگتا ہوں جس کا میں نے ارتکاب کیا، میں تیرے سامنے تیرے انعام کا اقرار کرتا ہوں جو مجھ پر ہوا اور میں اپنے گناہوں کا اقرار کرتا ہوں، لہٰذا تو مجھے معاف کردے۔ واقعہ یہ ہے کہ تیرے سوا کوئی گناہوں کو معاف نہیں کرسکتا۔",
    "translationHinglish": "ae Allah ! to hi mera rab hai, tairay siwa koi mabood nahi, to ne mujhe peda farmaya aur mein tera bandah hon aur mein apni taaqat ke mutabiq tairay ehad aur waday par qaim hon, mein tujh se is cheez ke shar se panah mangta hon jis ka mein ne irtikaab kya, mein tairay samnay tairay inaam ka iqraar karta hon jo mujh par sun-hwa aur mein –apne gunaaho ka iqraar karta hon, lehaza to mujhe maaf kardey. waqea yeh hai ke tairay siwa koi gunaaho ko maaf nahi karsaktha .\r\n\r\n",
    "detailEn": "This prayer is called Syed ul Istighfar.",
    "detailUr": "یہ دعا سیدالاستغفار کہلاتی ہے۔",
    "detailHinglish": "yeh dua سیدالاستغفار kehlati hai.",
    "repeatCount": 1,
    "reference": "Sahih Al Bukhari 6306"
  },
  {
    "id": "evening-azkar-16",
    "categoryName": "Evening Azkar",
    "supplication": "اَللّٰھُمَّ اِنِّیْٓ اَمْسَیْتُ اُشْھِدُکَ وَاُشْھِدُ حَمَلَۃَ عَرْشِکَ وَمَلَآئِکَتَکَ وَجَمِیْعَ خَلْقِکَ اَنَّکَ اَنْتَ اللّٰہُ لَآ اِلٰہَ اِلَّآ اَنْتَ وَحْدَکَ لَا شَرِیْکَ لَکَ وَاَنَّ مُحَمَّدًا عَبْدُکَ وَرَسُوْلُکَ",
    "translationEn": "O Allah, verily I have reached the evening and I call on You, the bearers of Your throne, Your angels, and all of Your Creation, to withness that You are Allah, none has the right to be worshipped except You, alone, without any partner and that Muhammad is Your servant and messenger.",
    "translationUr": "اے اللہ! یقیناً میں نے ایسی حالت میں شام کی کہ تجھے، تیرا عرش اٹھانے والے فرشتوں، تیرے (دیگر) فرشتوں اور تیری تمام مخلوق کو اس بات پر گواہ بناتا ہوں کہ تو ہی اللہ ہے، تیرے سوا کوئی معبود نہیں، تو اکیلا ہے، تیرا کوئی شریک نہیں اور بلاشبہ محمد (صلی اللہ علیہ وآلہ وسلم) تیرے بندے اور تیرے رسول ہیں۔",
    "translationHinglish": "ae Allah ! yaqeenan mein ne aisi haalat mein shaam ki ke tujhe, tera arsh uthany walay firshton, tairay ( deegar ) firshton aur teri tamam makhlooq ko is baat par gawah banata hon ke to hi Allah hai, tairay siwa koi mabood nahi, to akela hai, tera koi shareek nahi aur bilashuba Mohammad ( sale Allah alaihi wa-alehe wasallam ) tairay bande aur tairay rasool hain .\r\n\r\n",
    "detailEn": "Whoever recites this prayer, Allah Almighty will free him from the fire.",
    "detailUr": "جو شخص یہ دعا پڑھے گا، اللہ تعالیٰ اسے آگ سے آزاد کرے گا۔",
    "detailHinglish": "jo shakhs yeh dua parhay ga, Allah taala usay aag se azad kere ga.",
    "repeatCount": 4,
    "reference": "Sunan Abu Dawood 5069"
  },
  {
    "id": "evening-azkar-17",
    "categoryName": "Evening Azkar",
    "supplication": "اَللّٰھُمَّ اِنِّیْٓ اَسْئَلُکَ الْعَفْوَ وَالْعَافِیَۃَ فِی الدُّنْیَا وَالْاٰخِرَۃِ، اَللّٰھُمَّ اِنِّیْٓ اَسْئَلُکَ الْعَفْوَ وَالْعَافِیَۃَ فِی دِیْنِیْ وَدُنْیَایَ وَاَھْلِیْ وَمَالِیْ، اَللّٰھُمَّ اسْتُرْ عَوْرَاتِیْ وَاٰمِنْ رَّوْعَاتِیْ، اَللّٰھُمَّ احْفَظْنِیْ مِنْۢ بَیْنِ یَدَیَّ وَمِنْ خَلْفِیْ وَعَنْ یَّمِیْنِیْ وَعَنْ شِمَالِیْ وَمِنْ فَوْقِیْ وَاَعُوْذُ بِعَظَمَتِکَ اَنْ اُغْتَالَ مِنْ تَحْتِیْ",
    "translationEn": "O Allah, I ask You for pardon and well-being in this life and the next. O Allah, I ask You for pardon and well-being in my religious and worldly affairs, and my family and my wealth. O Allah, veil my weaknesses and set at ease my dismay. O Allah, preserve me from the front and from behind and on my right and on my left and from above, and I take refuge with you lest I be swallowed up by the earth.",
    "translationUr": "اے اللہ! بے شک میں تجھ سے دنیا اور آخرت میں معافی اور عافیت کا سوال کرتا ہوں، اے اللہ! بے شک میں تجھ سے اپنے دین، اپنی دنیا اور اپنے اہل و مال میں معافی اور عافیت کا سوال کرتا ہوں۔ اے اللہ! میرے عیبوں پر پردہ ڈال دے اور میری گھبراہٹوں میں امن دے۔ اے اللہ! تو میری حفاظت فرما میرے سامنے سے، میرے پیچھے سے، میری دائیں طرف سے، میری بائیں طرف سے اور میرے اوپر سے۔ اور میں تیری عظمت کے ساتھ اس بات سے پناہ مانگتا ہوں کہ ناگہاں اپنے نیچے سے ہلاک کیا جاؤں۔",
    "translationHinglish": "ae Allah ! be shak mein tujh se duniya aur akhirat mein maffi aur aafiat ka sawal karta hon, ae Allah ! be shak mein tujh se –apne deen, apni duniya aur –apne ahal o maal mein maffi aur aafiat ka sawal karta hon. ae Allah ! mere aiboon par parda daal day aur meri ghabrahatoon mein aman day. ae Allah ! to meri hifazat farma mere samnay se, mere peechay se, meri dayen taraf se, meri baen taraf se aur mere oopar se. aur mein teri Azmat ke sath is baat se panah mangta hon ke nagahan –apne neechay se halaak kya jaoon .\n\n",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 1,
    "reference": "Sunan Abu Dawood 5074"
  },
  {
    "id": "evening-azkar-18",
    "categoryName": "Evening Azkar",
    "supplication": "اَللّٰھُمَّ عَالِمَ الْغَیْبِ وَالشَّھَادَۃِ فَاطِرَالسَّمٰوٰتِ وَالْاَرْضِ رَبَّ کُلِّ شَیْءٍ وَمَلِیْکَہٗ، اَشْھَدُ اَنْ لَّآ اِلٰہَ اِلَّا اَنْتَ، اَعُوْذُبِکَ مِنْ شَرِّ نَفْسِیْ وَمِنْ شَرِّ الشَّیْطَانِ وَشِرْکِہٖ وَاَنْ اَقْتَرِفَ عَلٰی نَفْسِیْ سُوْٓءً ا اَوْ اَجُرَّہٗ اِلٰی مُسْلِمٍ",
    "translationEn": "O Allah, Knower of the unseen and the seen, Creator of the Heavens and the Earth, Lord and Sovereign of all things, I bear witness that none has the right to be worshipped except You. I take refuge in You from the evil of my soul and from the evil and shirk of shaytan and from committing wrong against my soul and bringing such upon another Muslim.",
    "translationUr": "اے اللہ! غیب اور حاضر کے جاننے والے! آسمانوں اور زمین کے پیدا کرنے والے! ہر چیز کے رب اور اس کے مالک! میں گواہی دیتا ہوں کہ تیرے سوا کوئی معبود نہیں۔ میں تیری پناہ میں آتا ہوں اپنے نفس کے شر سے اور شیطان کے شر سے اور اس کے شرک سے اور اس بات سے کہ اپنے ہی خلاف کسی برائی کا ارتکاب کروں یا اسے کسی مسلمان کی طرف کھینچ لاؤں۔",
    "translationHinglish": "ae Allah ! ghaib aur haazir ke jan-nay walay! asmano aur zameen ke peda karne walay! har cheez ke rab aur is ke maalik! mein gawahi deta hon ke tairay siwa koi mabood nahi. mein teri panah mein aata hon –apne nafs ke shar se aur shetan ke shar se aur is ke shirk se aur is baat se ke –apne hi khilaaf kisi buraiee ka irtikaab karoon ya usay kisi musalman ki taraf khech lau .\n\n",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 1,
    "reference": "Sunan Abu Dawood 5083"
  },
  {
    "id": "evening-azkar-19",
    "categoryName": "Evening Azkar",
    "supplication": "لَآ اِلٰہَ اِلَّا اللّٰہُ وَحْدَہٗ لَاشَرِیْکَ لَہٗ، لَہُ الْمُلْکُ وَلَہُ الْحَمْدُ وَھُوَ عَلٰی کُلِّ شَیْءٍ قَدِیْرٌ",
    "translationEn": "None has the right to be worshipped except Allah, alone, without any partner, to Him belong all sovereignty and praise and everything is in His control.",
    "translationUr": "اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے، اس کا کوئی شریک نہیں، اسی کی بادشاہت اور اسی کی تعریف ہے اور وہ ہر چیز پر کامل قدرت رکھتا ہے۔",
    "translationHinglish": "Allah ke siwa koi mabood nahi, woh akela hai, is ka koi shareek nahi, isi ki badshahat aur isi ki tareef hai aur woh har cheez par kaamil qudrat rakhta hai .\n\n",
    "detailEn": "Whoever recites it in the morning, ten good deeds will be written for him, ten sins will be forgiven, ten degrees will be raised and this prayer is equal to freeing ten necks from the children of Ismaeel. He will keep the one who prays safe from the devil. And whoever reads it in the evening has the same reward.",
    "detailUr": "جو شخص اسے صبح کے وقت پڑھے گا، اُس کے لیے دس نیکیاں لکھی جائیں گی، دس گناہ معاف کردیے جائیں گے، دس درجات بلند کیے جائیں گے اور یہ دعا بنو اسماعیل میں سے دس گردنیں آزاد کرنے کے برابر ہے، نیز اللہ تعالیٰ یہ دعا پڑھنے والے کو شیطان سے محفوظ رکھے گا۔ اور جو اسے شام کے وقت پڑھے گا، اُس کے لیے بھی یہی اجر ہے۔ ",
    "detailHinglish": "jo shakhs usay subah ke waqt parhay ga, uss ke liye das naikian likhi jayen gi, das gunah maaf kardiye jayen ge, das darjaat buland kiye jayen ge aur yeh dua bano ismael mein se das gardanein azad karne ke barabar hai, neez Allah taala yeh dua parhnay walay ko shetan se mehfooz rakhay ga. aur jo usay shaam ke waqt parhay ga, uss ke liye bhi yahi ajar hai.",
    "repeatCount": 10,
    "reference": "Sunan Abu Dawood 5077"
  },
  {
    "id": "evening-azkar-20",
    "categoryName": "Evening Azkar",
    "supplication": "سُبْحَانَ اللّٰہِ وَبِحَمْدِہ",
    "translationEn": "How perfect is Allah and I praise Him.",
    "translationUr": "میں اللہ کی پاکیزگی بیان کرتا ہوں اس کی تعریف کے ساتھ۔",
    "translationHinglish": "mein Allah ki pakizgee bayan karta hon is ki tareef ke sath .\r\n\r\n",
    "detailEn": "Whoever recites this supplication a hundred times in the morning will be rewarded with the release of ten slaves, one hundred good deeds will be written in his name and one hundred sins will be erased, and with the blessing of these words that evening Until then he will be safe from the devil and no one will come up with a better deed than him. However, if a person says it more often (it can be better than that).",
    "detailUr": "جو شخص سو مرتبہ صبح کے وقت یہ دعا پڑھے گا، اسے دس غلام آزاد کرنے کے برابر ثواب ملے گا، ایک سو نیکیاں اس کے نام لکھی جائیں گی اور اس کے ایک سو گناہ مٹادیے جائیں گے اور ان الفاظ کی برکت سے اس دن شام تک وہ شیطان سے محفوظ رہے گا اور کوئی شخص اس سے افضل عمل لے کر نہیں آئے گا۔ تاہم اگر کوئی شخص زیادہ دفعہ کہے (تو وہ اس سے بہتر ہوسکتا ہے۔)",
    "detailHinglish": "jo shakhs so martaba subah ke waqt yeh dua parhay ga, usay das ghulam azad karne ke barabar sawab miley ga, aik so naikian is ke naam likhi jayen gi aur is ke aik so gunah mtadie jayen ge aur un alfaaz ki barket se is din shaam tak woh shetan se mehfooz rahay ga aur koi shakhs is se afzal amal le kar nahi aaye ga. taham agar koi shakhs ziyada dafaa kahe ( to woh is se behtar ho sakta hai.",
    "repeatCount": 100,
    "reference": "Sahih Al Muslim 2692"
  },
  {
    "id": "evening-azkar-21",
    "categoryName": "Evening Azkar",
    "supplication": "لَآ اِلٰہَ اِلَّا اللّٰہُ وَحْدَہٗ لَاشَرِیْکَ لَہٗ، لَہُ الْمُلْکُ وَلَہُ الْحَمْدُ وَھُوَ عَلٰی کُلِّ شَیْءٍ قَدِیْرٌ",
    "translationEn": "None has the right to be worshipped except Allah, alone, without any partner, to Him belong all sovereignty and praise and everything is in His control.",
    "translationUr": "اللہ کے سوا کوئی معبود نہیں، وہ اکیلا ہے، اس کا کوئی شریک نہیں، اسی کی بادشاہت اور اسی کی تعریف ہے اور وہ ہر چیز پر کامل قدرت رکھتا ہے۔",
    "translationHinglish": "Allah ke siwa koi mabood nahi, woh akela hai, is ka koi shareek nahi, isi ki badshahat aur isi ki tareef hai aur woh har cheez par kaamil qudrat rakhta hai .\r\n\r\n",
    "detailEn": "Any time of the day",
    "detailUr": "دن بھر میں کسی بھی وقت",
    "detailHinglish": "din bhar mein kisi bhi waqt",
    "repeatCount": 100,
    "reference": "Sahih Al Bukhari 3293"
  },
  {
    "id": "evening-azkar-22",
    "categoryName": "Evening Azkar",
    "supplication": "اَسْتَغْفِرُ اللّٰہَ وَاَتُوْبُ اِلَیْہِ",
    "translationEn": "I seek Allah's forgiveness and I turn to Him in repentance.",
    "translationUr": "میں اللہ سے بخشش مانگتا ہوں اور اس کے حضور توبہ کرتا ہوں۔",
    "translationHinglish": "mein Allah se bakhshish mangta hon aur is ke huzoor tauba karta hon .\r\n\r\n",
    "detailEn": "Any time of the day",
    "detailUr": "دن بھر میں کسی بھی وقت",
    "detailHinglish": "din bhar mein kisi bhi waqt",
    "repeatCount": 100,
    "reference": "Sahih Al Bukhari 6307"
  },
  {
    "id": "evening-azkar-23",
    "categoryName": "Evening Azkar",
    "supplication": "اَللّٰھُمَّ صَلِّ عَلٰی مُحَمَّدٍ وَّعَلٰٓی اٰلِ مُحَمَّدٍ",
    "translationEn": "O Allah, send blessing upon our Prophet Muhammad and his family.",
    "translationUr": "اے اللہ! رحمت نازل فرما محمد (صلی اللہ علیہ وآلہ وسلم) پر اور آل محمد (صلی اللہ علیہ وآلہ وسلم) پر۔",
    "translationHinglish": "ae Allah ! rehmat nazil farma Mohammad ( sale Allah alaihi wa-alehe wasallam ) par aur all Mohammad ( sale Allah alaihi wa-alehe wasallam ) par .\r\n\r\n",
    "detailEn": "Any Masnoon Durood Sharif",
    "detailUr": "کوئی سا مسنون درود شریف",
    "detailHinglish": "koi sa masnoon duroood shareef",
    "repeatCount": 10,
    "reference": "Sunan an-Nasa'i 1293"
  },
  {
    "id": "rabbana-duas-1",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا تَقَبَّلْ مِنَّا ۖ إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ",
    "translationEn": "Our Lord, accept [this] from us. Indeed You are the Hearing, the Knowing.",
    "translationUr": "اے ہمارے رب! ہم سے (یہ خدمت) قبول فرما، بیشک تو ہی خوب سننے والا خوب جاننے والا ہے",
    "translationHinglish": "Ae hamare Rabb! Hum se (ye khidmat) qubool farma, beshak Tu hi khoob sunne wala khoob janne wala hai.",
    "detailEn": "Dua of Prophet Ibrahim (AS) and Ismail (AS) while building the Kaaba.",
    "detailUr": "حضرت ابراہیم اور حضرت اسماعیل علیہما السلام کی دعا کعبہ کی تعمیر کے وقت۔",
    "detailHinglish": "Hazrat Ibrahim aur Hazrat Ismail (AS) ki dua Kaaba ki tameer ke waqt.",
    "repeatCount": 1,
    "reference": "Surah Al-Baqarah 2:127"
  },
  {
    "id": "rabbana-duas-2",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا وَاجْعَلْنَا مُسْلِمَيْنِ لَكَ وَمِن ذُرِّيَّتِنَا أُمَّةً مُّسْلِمَةً لَّكَ وَأَرِنَا مَنَاسِكَنَا وَتُبْ عَلَيْنَا ۖ إِنَّكَ أَنتَ التَّوَّابُ الرَّحِيمُ",
    "translationEn": "Our Lord, and make us Muslims [in submission] to You and from our descendants a Muslim nation [in submission] to You. And show us our rites and accept our repentance. Indeed, You are the Accepting of repentance, the Merciful.",
    "translationUr": "اے ہمارے رب! ہمیں اپنا فرمانبردار بنا لے اور ہماری اولاد میں سے بھی ایک جماعت کو اپنا فرمانبردار رکھ، اور ہمیں ہماری عبادت کے طریقے بتا دے اور ہماری توبہ قبول فرما، بیشک تو ہی توبہ قبول کرنے والا نہایت رحم والا ہے",
    "translationHinglish": "Ae hamare Rabb! Hamein apna farmanbardar bana le aur hamari aulad mein se bhi ek jamaat ko apna farmanbardar rakh, aur hamein hamari ibadat ke tariqe bata de aur hamari tauba qubool farma, beshak Tu hi tauba qubool karne wala nihayat raham wala hai.",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 1,
    "reference": "Surah Al-Baqarah 2:128"
  },
  {
    "id": "rabbana-duas-3",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
    "translationEn": "Our Lord, give us in this world [that which is] good and in the Hereafter [that which is] good and protect us from the punishment of the Fire.",
    "translationUr": "اے ہمارے رب! ہمیں دنیا میں بھی بھلائی عطا فرما اور آخرت میں بھی بھلائی عطا فرما اور ہمیں دوزخ کے عذاب سے بچا",
    "translationHinglish": "Ae hamare Rabb! Hamein duniya mein bhi bhalayi ata farma aur aakhirat mein bhi bhalayi ata farma aur hamein dozakh ke azab se bacha.",
    "detailEn": "One of the most comprehensive Duas, often recited by the Prophet (PBUH).",
    "detailUr": "جامع ترین دعاؤں میں سے ایک، جو نبی کریم صلی اللہ علیہ وسلم اکثر پڑھا کرتے تھے۔",
    "detailHinglish": "Jame tareen duaon mein se ek, jo Nabi Kareem (SAW) aksar parha karte thay.",
    "repeatCount": 1,
    "reference": "Surah Al-Baqarah 2:201"
  },
  {
    "id": "rabbana-duas-4",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَثَبِّتْ أَقْدَامَنَا وَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ",
    "translationEn": "Our Lord, pour upon us patience and plant firmly our feet and give us victory over the disbelieving people.",
    "translationUr": "اے ہمارے رب! ہم پر صبر کے دہانے کھول دے، ہمیں ثابت قدم رکھ اور ہمیں کافروں کی قوم پر غلبہ عطا فرما",
    "translationHinglish": "Ae hamare Rabb! Hum par sabr ke dahane khol de, hamein sabit qadam rakh aur hamein kafiron ki qoum par ghalba ata farma.",
    "detailEn": "Dua of the believers when they faced Jalut (Goliath).",
    "detailUr": "اہلِ ایمان کی دعا جب انہوں نے جالوت کا مقابلہ کیا۔",
    "detailHinglish": "Ahle-e-iman ki dua jab unhon ne Jalut ka muqabla kiya.",
    "repeatCount": 1,
    "reference": "Surah Al-Baqarah 2:250"
  },
  {
    "id": "rabbana-duas-5",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا",
    "translationEn": "Our Lord, do not impose blame upon us if we have forgotten or erred.",
    "translationUr": "اے ہمارے رب! اگر ہم بھول گئے ہوں یا خطا کی ہو تو ہمیں نہ پکڑنا",
    "translationHinglish": "Ae hamare Rabb! Agar hum bhool gaye hon ya khata ki ho to hamein na pakarna.",
    "detailEn": "Part of the last verses of Surah Al-Baqarah.",
    "detailUr": "سورہ بقرہ کی آخری آیات کا حصہ۔",
    "detailHinglish": "Surah Baqarah ki aakhri aayat ka hissa.",
    "repeatCount": 1,
    "reference": "Surah Al-Baqarah 2:286"
  },
  {
    "id": "rabbana-duas-6",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِن قَبْلِنَا",
    "translationEn": "Our Lord, and lay not upon us a burden like that which You laid upon those before us.",
    "translationUr": "اے ہمارے رب! ہم پر وہ بوجھ نہ ڈال جو تو نے ہم سے پہلے لوگوں پر ڈالا تھا",
    "translationHinglish": "Ae hamare Rabb! Hum par woh bojh na daal jo Tu ne hum se pehle logon par dala tha.",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 1,
    "reference": "Surah Al-Baqarah 2:286"
  },
  {
    "id": "rabbana-duas-7",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ ۖ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا ۖ أَنتَ مَوْلَانَا فَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ",
    "translationEn": "Our Lord, and burden us not with that which we have no ability to bear. And pardon us; and forgive us; and have mercy upon us. You are our protector, so give us victory over the disbelieving people.",
    "translationUr": "اے ہمارے رب! ہم پر وہ بوجھ نہ ڈال جس کی ہمیں طاقت نہ ہو، اور ہم سے درگزر فرما، اور ہمیں بخش دے، اور ہم پر رحم فرما، تو ہی ہمارا کارساز ہے، پس ہمیں کافروں کی قوم پر غلبہ عطا فرما",
    "translationHinglish": "Ae hamare Rabb! Hum par woh bojh na daal jis ki hamein taqat na ho, aur hum se darguzar farma, aur hamein bakhsh de, aur hum par raham farma, Tu hi hamara karsaz hai, pas hamein kafiron ki qoum par ghalba ata farma.",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 1,
    "reference": "Surah Al-Baqarah 2:286"
  },
  {
    "id": "rabbana-duas-8",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً ۚ إِنَّكَ أَنتَ الْوَهَّابُ",
    "translationEn": "[Who say], \"Our Lord, let not our hearts deviate after You have guided us and grant us from Yourself mercy. Indeed, You are the Bestower.\"",
    "translationUr": "اے ہمارے رب! ہمیں ہدایت دینے کے بعد ہمارے دلوں کو ٹیڑھا نہ ہونے دے اور ہمیں اپنے پاس سے رحمت عطا فرما، بیشک تو ہی بہت بڑا عطا فرمانے والا ہے",
    "translationHinglish": "Ae hamare Rabb! Hamein hidayat dene ke baad hamare dilon ko tedha na hone de aur hamein apne pas se rahmat ata farma, beshak Tu hi bahut bada ata farmane wala hai.",
    "detailEn": "Dua for steadfastness in faith.",
    "detailUr": "ایمان پر ثابت قدمی کی دعا۔",
    "detailHinglish": "Iman par sabit qadmi ki dua.",
    "repeatCount": 1,
    "reference": "Surah Al-Imran 3:8"
  },
  {
    "id": "rabbana-duas-9",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا إِنَّكَ جَامِعُ النَّاسِ لِيَوْمٍ لَّا رَيْبَ فِيهِ ۚ إِنَّ اللَّهَ لَا يُخْلِفُ الْمِيعَادَ",
    "translationEn": "Our Lord, surely You will gather the people for a Day about which there is no doubt. Indeed, Allah does not fail in His promise.",
    "translationUr": "اے ہمارے رب! تو یقیناً لوگوں کو اس دن جمع کرنے والا ہے جس کے آنے میں کوئی شک نہیں، بیشک اللہ اپنے وعدے کے خلاف نہیں کرتا",
    "translationHinglish": "Ae hamare Rabb! Tu yaqinan logon ko us din jama karne wala hai jis ke aane mein koi shak nahi, beshak Allah apne wade ke khilaf nahi karta.",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 1,
    "reference": "Surah Al-Imran 3:9"
  },
  {
    "id": "rabbana-duas-10",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا إِنَّنَا آمَنَّا فَاغْفِرْ لَنَا ذُنُوبَنَا وَقِنَا عَذَابَ النَّارِ",
    "translationEn": "Our Lord, indeed we have believed, so forgive us our sins and protect us from the punishment of the Fire.",
    "translationUr": "اے ہمارے رب! ہم ایمان لائے، پس ہمارے گناہ معاف فرما اور ہمیں آگ کے عذاب سے بچا",
    "translationHinglish": "Ae hamare Rabb! Hum iman laye, pas hamare gunah maaf farma aur hamein aag ke azab se bacha.",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 1,
    "reference": "Surah Al-Imran 3:16"
  },
  {
    "id": "rabbana-duas-11",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا آمَنَّا بِمَا أَنزَلْتَ وَاتَّبَعْنَا الرَّسُولَ فَاكْتُبْنَا مَعَ الشَّاهِدِينَ",
    "translationEn": "Our Lord, we have believed in what You revealed and have followed the messenger, so register us among the witnesses [to truth].",
    "translationUr": "اے ہمارے رب! ہم اس پر ایمان لائے جو تو نے نازل فرمایا اور ہم نے تیرے رسول کی اتباع کی، پس ہمیں گواہی دینے والوں میں لکھ لے",
    "translationHinglish": "Ae hamare Rabb! Hum us par iman laye jo Tu ne nazil farmaya aur hum ne Tere Rasool ki itteba ki, pas hamein gawahi dene walon mein likh le.",
    "detailEn": "Dua of the disciples of Isa (AS).",
    "detailUr": "حضرت عیسیٰ علیہ السلام کے حواریوں کی دعا۔",
    "detailHinglish": "Hazrat Isa (AS) ke hawariyon ki dua.",
    "repeatCount": 1,
    "reference": "Surah Al-Imran 3:53"
  },
  {
    "id": "rabbana-duas-12",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا اغْفِرْ لَنَا ذُنُوبَنَا وَإِسْرَافَنَا فِي أَمْرِنَا وَثَبِّتْ أَقْدَامَنَا وَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ",
    "translationEn": "Our Lord, forgive us our sins and the excess [committed] in our affairs and plant firmly our feet and give us victory over the disbelieving people.",
    "translationUr": "اے ہمارے رب! ہمارے گناہ معاف فرما اور ہمارے کام میں ہماری زیادتیوں کو بخش دے اور ہمیں ثابت قدم رکھ اور ہمیں کافروں کی قوم پر فتح عطا فرما",
    "translationHinglish": "Ae hamare Rabb! Hamare gunah maaf farma aur hamare kaam mein hamari ziyadatiyon ko bakhsh de aur hamein sabit qadam rakh aur hamein kafiron ki qoum par fatah ata farma.",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 1,
    "reference": "Surah Al-Imran 3:147"
  },
  {
    "id": "rabbana-duas-13",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا مَا خَلَقْتَ هَٰذَا بَاطِلًا سُبْحَانَكَ فَقِنَا عَذَابَ النَّارِ",
    "translationEn": "Our Lord, You did not create this aimlessly; exalted are You [above such a thing]; then protect us from the punishment of the Fire.",
    "translationUr": "اے ہمارے رب! تو نے یہ سب بے مقصد پیدا نہیں کیا، تو پاک ہے، پس ہمیں آگ کے عذاب سے بچا لے",
    "translationHinglish": "Ae hamare Rabb! Tu ne ye sab be-maqsad paida nahi kiya, Tu pak hai, pas hamein aag ke azab se bacha le.",
    "detailEn": "Dua of those who reflect on the creation of the heavens and the earth.",
    "detailUr": "ان لوگوں کی دعا جو آسمانوں اور زمین کی تخلیق میں غور و فکر کرتے ہیں۔",
    "detailHinglish": "Un logon ki dua jo aasmanon aur zameen ki takhliq mein ghor-o-fikr karte hain.",
    "repeatCount": 1,
    "reference": "Surah Al-Imran 3:191"
  },
  {
    "id": "rabbana-duas-14",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا إِنَّكَ مَن تُدْخِلِ النَّارَ فَقَدْ أَخْزَيْتَهُ ۖ وَمَا لِلظَّالِمِينَ مِنْ أَنصَارٍ",
    "translationEn": "Our Lord, indeed whoever You admit to the Fire - You have disgraced him, and for the wrongdoers there are no helpers.",
    "translationUr": "اے ہمارے رب! بیشک جسے تو نے آگ میں ڈال دیا اسے تو نے رسوا کر دیا، اور ظالموں کا کوئی مددگار نہیں",
    "translationHinglish": "Ae hamare Rabb! Beshak jise Tu ne aag mein daal diya use Tu ne ruswa kar diya, aur zalimon ka koi madadgar nahi.",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 1,
    "reference": "Surah Al-Imran 3:192"
  },
  {
    "id": "rabbana-duas-15",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا إِنَّنَا سَمِعْنَا مُنَادِيًا يُنَادِي لِلْإِيمَانِ أَنْ آمِنُوا بِرَبِّكُمْ فَآمَنَّا ۚ رَبَّنَا فَاغْفِرْ لَنَا ذُنُوبَنَا وَكَفِّرْ عَنَّا سَيِّئَاتِنَا وَتَوَفَّنَا مَعَ الْأَبْرَارِ",
    "translationEn": "Our Lord, indeed we have heard a caller calling to faith, [saying], 'Believe in your Lord,' and we have believed. Our Lord, so forgive us our sins and remove from us our misdeeds and cause us to die with the righteous.",
    "translationUr": "اے ہمارے رب! ہم نے ایک پکارنے والے کو سنا جو ایمان کی طرف پکار رہا تھا کہ اپنے رب پر ایمان لاؤ، تو ہم ایمان لائے۔ اے ہمارے رب! پس ہمارے گناہ معاف فرما اور ہماری برائیاں ہم سے دور کر دے اور ہمیں نیک لوگوں کے ساتھ موت عطا فرما",
    "translationHinglish": "Ae hamare Rabb! Hum ne ek pukarne wale ko suna jo iman ki taraf pukar raha tha ke apne Rabb par iman lao, to hum iman laye. Ae hamare Rabb! Pas hamare gunah maaf farma aur hamari buraiyan hum se door kar de aur hamein nek logon ke sath maut ata farma.",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 1,
    "reference": "Surah Al-Imran 3:193"
  },
  {
    "id": "rabbana-duas-16",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا وَآتِنَا مَا وَعَدتَّنَا عَلَىٰ رُسُلِكَ وَلَا تُخْزِنَا يَوْمَ الْقِيَامَةِ ۖ إِنَّكَ لَا تُخْلِفُ الْمِيعَادَ",
    "translationEn": "Our Lord, and grant us what You promised us through Your messengers and do not disgrace us on the Day of Resurrection. Indeed, You do not fail in His promise.",
    "translationUr": "اے ہمارے رب! اور ہمیں وہ عطا فرما جس کا تو نے اپنے رسولوں کے ذریعے ہم سے وعدہ کیا ہے اور ہمیں قیامت کے دن رسوا نہ کرنا، بیشک تو وعدہ خلافی نہیں کرتا",
    "translationHinglish": "Ae hamare Rabb! Aur hamein woh ata farma jis ka Tu ne apne Rasoolon ke zariye hum se wada kiya hai aur hamein Qayamat ke din ruswa na karna, beshak Tu wada khilafi nahi karta.",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 1,
    "reference": "Surah Al-Imran 3:194"
  },
  {
    "id": "rabbana-duas-17",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا آمَنَّا فَاكْتُبْنَا مَعَ الشَّاهِدِينَ",
    "translationEn": "Our Lord, we have believed, so write us down among the witnesses.",
    "translationUr": "اے ہمارے رب! ہم ایمان لائے، پس ہمیں گواہی دینے والوں میں لکھ لے",
    "translationHinglish": "Ae hamare Rabb! Hum iman laye, pas hamein gawahi dene walon mein likh le.",
    "detailEn": "Dua of those who recognize the truth of the Quran.",
    "detailUr": "ان لوگوں کی دعا جو قرآن کی سچائی کو پہچان لیتے ہیں۔",
    "detailHinglish": "Un logon ki dua jo Quran ki sachayi ko pehchan lete hain.",
    "repeatCount": 1,
    "reference": "Surah Al-Ma'idah 5:83"
  },
  {
    "id": "rabbana-duas-18",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا أَنزِلْ عَلَيْنَا مَائِدَةً مِّنَ السَّمَاءِ تَكُونُ لَنَا عِيدًا لِّأَوَّلِنَا وَآخِرِنَا وَآيَةً مِّنكَ ۖ وَارْزُقْنَا وَأَنتَ خَيْرُ الرَّازِقِينَ",
    "translationEn": "Our Lord, send down to us a table [spread with food] from the heaven to be for us a festival for the first of us and the last of us and a sign from You. And provide for us, and You are the best of providers.",
    "translationUr": "اے اللہ، اے ہمارے رب! ہم پر آسمان سے کھانے کا ایک خوان نازل فرما جو ہمارے اگلوں اور پچھلوں کے لیے عید (خوشی) قرار پائے اور تیری طرف سے ایک نشانی ہو، اور ہمیں رزق عطا فرما، تو ہی بہترین رزق دینے والا ہے",
    "translationHinglish": "Ae Allah, ae hamare Rabb! Hum par aasman se khane ka ek khwan nazil farma jo hamare aglon aur pichlon ke liye eid (khushi) qarar paye aur Teri taraf se ek nishani ho, aur hamein rizq ata farma, Tu hi behtarin rizq dene wala hai.",
    "detailEn": "Dua of Isa (AS).",
    "detailUr": "حضرت عیسیٰ علیہ السلام کی دعا۔",
    "detailHinglish": "Hazrat Isa (AS) ki dua.",
    "repeatCount": 1,
    "reference": "Surah Al-Ma'idah 5:114"
  },
  {
    "id": "rabbana-duas-19",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا ظَلَمْنَا أَنفُسَنَا وَإِن لَّمْ تَغْفِرْ لَنَا وَارْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ",
    "translationEn": "Our Lord, we have wronged ourselves, and if You do not forgive us and have mercy upon us, we will surely be among the losers.",
    "translationUr": "اے ہمارے رب! ہم نے اپنی جانوں پر ظلم کیا، اور اگر تو نے ہمیں معاف نہ فرمایا اور ہم پر رحم نہ کیا تو ہم یقیناً نقصان اٹھانے والوں میں سے ہو جائیں گے",
    "translationHinglish": "Ae hamare Rabb! Hum ne apni janon par zulm kiya, aur agar Tu ne hamein maaf na farmaya aur hum par raham na kiya to hum yaqinan nuqsan uthane walon mein se ho jayenge.",
    "detailEn": "Dua of Adam (AS) and Hawa (AS) after their error.",
    "detailUr": "حضرت آدم اور حضرت حوا علیہما السلام کی دعا اپنی خطا کے بعد۔",
    "detailHinglish": "Hazrat Adam aur Hazrat Hawa (AS) ki dua apni khata ke baad.",
    "repeatCount": 1,
    "reference": "Surah Al-A'raf 7:23"
  },
  {
    "id": "rabbana-duas-20",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا لَا تَجْعَلْنَا مَعَ الْقَوْمِ الظَّالِمِينَ",
    "translationEn": "Our Lord, do not place us with the wrongdoing people.",
    "translationUr": "اے ہمارے رب! ہمیں ظالم لوگوں کے ساتھ شامل نہ کرنا",
    "translationHinglish": "Ae hamare Rabb! Hamein zalim logon ke sath shamil na karna.",
    "detailEn": "Dua of the people of Al-A'raf.",
    "detailUr": "اصحابِ اعراف کی دعا۔",
    "detailHinglish": "As'hab-e-A'raf ki dua.",
    "repeatCount": 1,
    "reference": "Surah Al-A'raf 7:47"
  },
  {
    "id": "rabbana-duas-21",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا افْتَحْ بَيْنَنَا وَبَيْنَ قَوْمِنَا بِالْحَقِّ وَأَنتَ خَيْرُ الْفَاتِحِينَ",
    "translationEn": "Our Lord, decide between us and our people in truth, and You are the best of those who give decision.",
    "translationUr": "اے ہمارے رب! ہمارے اور ہماری قوم کے درمیان حق کے ساتھ فیصلہ فرما دے، اور تو ہی بہترین فیصلہ کرنے والا ہے",
    "translationHinglish": "Ae hamare Rabb! Hamare aur hamari qoum ke darmiyan haq ke sath faisla farma de, aur Tu hi behtarin faisla karne wala hai.",
    "detailEn": "Dua of Shu'ayb (AS).",
    "detailUr": "حضرت شعیب علیہ السلام کی دعا۔",
    "detailHinglish": "Hazrat Shu'ayb (AS) ki dua.",
    "repeatCount": 1,
    "reference": "Surah Al-A'raf 7:89"
  },
  {
    "id": "rabbana-duas-22",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا أَفْرِغْ عَلَيْنَا صَبْرًا وَتَوَفَّنَا مُسْلِمِينَ",
    "translationEn": "Our Lord, pour upon us patience and let us die as Muslims [in submission to You].",
    "translationUr": "اے ہمارے رب! ہم پر صبر کے دہانے کھول دے اور ہمیں اس حال میں موت دے کہ ہم تیرے فرمانبردار ہوں",
    "translationHinglish": "Ae hamare Rabb! Hum par sabr ke dahane khol de aur hamein is haal mein maut de ke hum Tere farmanbardar hon.",
    "detailEn": "Dua of the sorcerers of Fir'awn after they believed in Musa (AS).",
    "detailUr": "فرعون کے جادوگروں کی دعا جب وہ حضرت موسیٰ علیہ السلام پر ایمان لائے۔",
    "detailHinglish": "Fir'awn ke jadugaron ki dua jab woh Hazrat Musa (AS) par iman laye.",
    "repeatCount": 1,
    "reference": "Surah Al-A'raf 7:126"
  },
  {
    "id": "rabbana-duas-23",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا لَا تَجْعَلْنَا فِتْنَةً لِّلْقَوْمِ الظَّالِمِينَ وَنَجِّنَا بِرَحْمَتِكَ مِنَ الْقَوْمِ الْكَافِرِينَ",
    "translationEn": "Our Lord, make us not [objects of] trial for the wrongdoing people. And save us by Your mercy from the disbelieving people.",
    "translationUr": "اے ہمارے رب! ہمیں ظالم لوگوں کے لیے آزمائش نہ بنا، اور ہمیں اپنی رحمت سے کافر قوم سے نجات عطا فرما",
    "translationHinglish": "Ae hamare Rabb! Hamein zalim logon ke liye aazmaish na bana, aur hamein apni rahmat se kafir qoum se najat ata farma.",
    "detailEn": "Dua of the followers of Musa (AS).",
    "detailUr": "حضرت موسیٰ علیہ السلام کے متبعین کی دعا۔",
    "detailHinglish": "Hazrat Musa (AS) ke muttabe'in ki dua.",
    "repeatCount": 1,
    "reference": "Surah Yunus 10:85-86"
  },
  {
    "id": "rabbana-duas-24",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا إِنَّكَ تَعْلَمُ مَا نُخْفِي وَمَا نُعْلِنُ ۗ وَمَا يَخْفَىٰ عَلَى اللَّهِ مِن شَيْءٍ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ",
    "translationEn": "Our Lord, indeed You know what we conceal and what we declare, and nothing is hidden from Allah on the earth or in the heaven.",
    "translationUr": "اے ہمارے رب! بیشک تو جانتا ہے جو کچھ ہم چھپاتے ہیں اور جو کچھ ہم ظاہر کرتے ہیں، اور اللہ پر زمین اور آسمان کی کوئی چیز پوشیدہ نہیں",
    "translationHinglish": "Ae hamare Rabb! Beshak Tu jaanta hai jo kuch hum chupate hain aur jo kuch hum zahir karte hain, aur Allah par zameen aur aasman ki koi cheez poshida nahi.",
    "detailEn": "Dua of Ibrahim (AS).",
    "detailUr": "حضرت ابراہیم علیہ السلام کی دعا۔",
    "detailHinglish": "Hazrat Ibrahim (AS) ki dua.",
    "repeatCount": 1,
    "reference": "Surah Ibrahim 14:38"
  },
  {
    "id": "rabbana-duas-25",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا وَتَقَبَّلْ دُعَاءِ",
    "translationEn": "Our Lord, and accept my supplication.",
    "translationUr": "اے ہمارے رب! اور میری دعا قبول فرما",
    "translationHinglish": "Ae hamare Rabb! Aur meri dua qubool farma.",
    "detailEn": "Part of Ibrahim (AS)'s Dua for himself and his progeny.",
    "detailUr": "حضرت ابراہیم علیہ السلام کی اپنے اور اپنی اولاد کے لیے دعا کا حصہ۔",
    "detailHinglish": "Hazrat Ibrahim (AS) ki apne aur apni aulad ke liye dua ka hissa.",
    "repeatCount": 1,
    "reference": "Surah Ibrahim 14:40"
  },
  {
    "id": "rabbana-duas-26",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ",
    "translationEn": "Our Lord, forgive me and my parents and the believers the Day the account is established.",
    "translationUr": "اے ہمارے رب! مجھے اور میرے والدین کو اور سب مومنوں کو اس دن بخش دے جس دن حساب قائم ہوگا",
    "translationHinglish": "Ae hamare Rabb! Mujhe aur mere walidain ko aur sab momino ko us din bakhsh de jis din hisab qaim hoga.",
    "detailEn": "One of the most famous Duas for parents.",
    "detailUr": "والدین کے لیے سب سے مشہور دعاؤں میں سے ایک۔",
    "detailHinglish": "Walidain ke liye sab se mash'hoor duaon mein se ek.",
    "repeatCount": 1,
    "reference": "Surah Ibrahim 14:41"
  },
  {
    "id": "rabbana-duas-27",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا آتِنَا مِن لَّدُنكَ رَحْمَةً وَهَيِّئْ لَنَا مِنْ أَمْرِنَا رَشَدًا",
    "translationEn": "Our Lord, grant us from Yourself mercy and prepare for us from our affair right guidance.",
    "translationUr": "اے ہمارے رب! ہمیں اپنے پاس سے رحمت عطا فرما اور ہمارے اس کام میں ہمارے لیے ہدایت (درستگی) کا سامان کر دے",
    "translationHinglish": "Ae hamare Rabb! Hamein apne pas se rahmat ata farma aur hamare is kaam mein hamare liye hidayat (durustagi) ka saman kar de.",
    "detailEn": "Dua of the People of the Cave (Ashab-ul-Kahf).",
    "detailUr": "اصحابِ کہف کی دعا۔",
    "detailHinglish": "As'hab-e-Kahf ki dua.",
    "repeatCount": 1,
    "reference": "Surah Al-Kahf 18:10"
  },
  {
    "id": "rabbana-duas-28",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا إِنَّنَا نَخَافُ أَن يَفْرُطَ عَلَيْنَا أَوْ أَن يَطْغَىٰ",
    "translationEn": "Our Lord, indeed we are afraid that he will hasten [punishment] against us or that he will transgress.",
    "translationUr": "اے ہمارے رب! ہمیں اندیشہ ہے کہ وہ (فرعون) ہم پر زیادتی کرے گا یا سرکشی کرے گا",
    "translationHinglish": "Ae hamare Rabb! Hamein andesha hai ke woh (Fir'awn) hum par ziyadati karega ya sarkashi karega.",
    "detailEn": "Dua of Musa (AS) and Harun (AS) when sent to Fir'awn.",
    "detailUr": "حضرت موسیٰ اور حضرت ہارون علیہما السلام کی دعا جب انہیں فرعون کے پاس بھیجا گیا۔",
    "detailHinglish": "Hazrat Musa aur Hazrat Harun (AS) ki dua jab unhein Fir'awn ke pas bheja gaya.",
    "repeatCount": 1,
    "reference": "Surah Ta-Ha 20:45"
  },
  {
    "id": "rabbana-duas-29",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا آمَنَّا فَاغْفِرْ لَنَا وَارْحَمْنَا وَأَنتَ خَيْرُ الرَّاحِمِينَ",
    "translationEn": "Our Lord, we have believed, so forgive us and have mercy upon us, and You are the best of the merciful.",
    "translationUr": "اے ہمارے رب! ہم ایمان لائے، پس ہمیں بخش دے اور ہم پر رحم فرما، اور تو ہی بہترین رحم فرمانے والا ہے",
    "translationHinglish": "Ae hamare Rabb! Hum iman laye, pas hamein bakhsh de aur hum par raham farma, aur Tu hi behtarin raham farmane wala hai.",
    "detailEn": "Dua of the group of believers mentioned in Surah Al-Mu'minun.",
    "detailUr": "اہلِ ایمان کے اس گروہ کی دعا جس کا ذکر سورہ مومنون میں ہے۔",
    "detailHinglish": "Ahle-e-iman ke us giroh ki dua jis ka zikr Surah Mu'minun mein hai.",
    "repeatCount": 1,
    "reference": "Surah Al-Mu'minun 23:109"
  },
  {
    "id": "rabbana-duas-30",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا اصْرِفْ عَنَّا عَذَابَ جَهَنَّمَ ۖ إِنَّ عَذَابَهَا كَانَ غَرَامًا إِنَّهَا سَاءَتْ مُسْتَقَرًّا وَمُقَامًا",
    "translationEn": "Our Lord, avert from us the punishment of Hell. Indeed, its punishment is ever adhering. Indeed, it is evil as a settlement and residence.",
    "translationUr": "اے ہمارے رب! ہم سے جہنم کا عذاب دور کر دے، بیشک اس کا عذاب چمٹ جانے والا ہے، یقیناً وہ بہت بری جگہ اور بہت برا ٹھکانا ہے",
    "translationHinglish": "Ae hamare Rabb! Hum se jahannam ka azab door kar de, beshak us ka azab chimat jaane wala hai, yaqinan woh bahut buri jagah aur bahut bura thikana hai.",
    "detailEn": "Dua of the servants of the Most Merciful (Ibad-ur-Rahman).",
    "detailUr": "عباد الرحمن کی دعا۔",
    "detailHinglish": "Ibad-ur-Rahman ki dua.",
    "repeatCount": 1,
    "reference": "Surah Al-Furqan 25:65-66"
  },
  {
    "id": "rabbana-duas-31",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا",
    "translationEn": "Our Lord, grant us from among our wives and offspring comfort to our eyes and make us an example for the righteous.",
    "translationUr": "اے ہمارے رب! ہمیں ہماری بیویوں اور ہماری اولاد سے آنکھوں کی ٹھنڈک عطا فرما اور ہمیں پرہیزگاروں کا پیشوا بنا",
    "translationHinglish": "Ae hamare Rabb! Hamein hamari biwiyon aur hamari aulad se aankhon ki thandak ata farma aur hamein parhezgaron ka peshwa bana.",
    "detailEn": "Dua for a pious family.",
    "detailUr": "نیک خاندان کے لیے دعا۔",
    "detailHinglish": "Nek khandan ke liye dua.",
    "repeatCount": 1,
    "reference": "Surah Al-Furqan 25:74"
  },
  {
    "id": "rabbana-duas-32",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا وَسِعْتَ كُلَّ شَيْءٍ رَّحْمَةً وَعِلْمًا فَاغْفِرْ لِلَّذِينَ تَابُوا وَاتَّبَعُوا سَبِيلَكَ وَقِهِمْ عَذَابَ الْجَحِيمِ",
    "translationEn": "Our Lord, You have encompassed all things in mercy and knowledge, so forgive those who have repented and followed Your way and protect them from the punishment of Hellfire.",
    "translationUr": "اے ہمارے رب! تیری رحمت اور تیرا علم ہر چیز کا احاطہ کیے ہوئے ہے، پس ان لوگوں کو بخش دے جنہوں نے توبہ کی اور تیرے راستے کی اتباع کی، اور انہیں جہنم کے عذاب سے بچا لے",
    "translationHinglish": "Ae hamare Rabb! Teri rahmat aur Tera ilm har cheez ka ihata kiye hue hai, pas un logon ko bakhsh de jinhon ne tauba ki aur Tere raste ki itteba ki, aur unhein jahannam ke azab se bacha le.",
    "detailEn": "Dua of the angels who carry the Throne.",
    "detailUr": "عرش اٹھانے والے فرشتوں کی دعا۔",
    "detailHinglish": "Arsh uthane wale farishton ki dua.",
    "repeatCount": 1,
    "reference": "Surah Ghafir 40:7"
  },
  {
    "id": "rabbana-duas-33",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا وَأَدْخِلْهُمْ جَنَّاتِ عَدْنٍ الَّتِي وَعَدتَّهُمْ وَمَن صَلَحَ مِنْ آبَائِهِمْ وَأَزْوَاجِهِمْ وَذُرِّيَّاتِهِمْ ۚ إِنَّكَ أَنتَ الْعَزِيزُ الْحَكِيمُ وَقِهِمُ السَّيِّئَاتِ ۚ وَمَن تَقِ السَّيِّئَاتِ يَوْمَئِذٍ فَقَدْ رَحِمْتَهُ ۚ وَذَٰلِكَ هُوَ الْفَوْزُ الْعَظِيمُ",
    "translationEn": "Our Lord, and admit them to gardens of perpetual residence which You have promised them and whoever was righteous among their fathers, their spouses and their offspring. Indeed, it is You who is the Exalted in Might, the Wise. And protect them from the evil deeds. And he whom You protect from evil deeds that Day - You have given him mercy. And that is the great attainment.",
    "translationUr": "اے ہمارے رب! انہیں ہمیشہ رہنے والی جنتوں میں داخل فرما جن کا تو نے ان سے وعدہ کیا ہے، اور ان کے باپ دادا، ان کی بیویوں اور ان کی اولاد میں سے جو نیک ہوں، بیشک تو ہی غالب حکمت والا ہے۔ اور انہیں برائیوں سے بچا لے، اور جسے تو نے اس دن برائیوں سے بچا لیا تو یقیناً تو نے اس پر بڑا رحم کیا، اور یہی بہت بڑی کامیابی ہے",
    "translationHinglish": "Ae hamare Rabb! Unhein hamesha rehne wali jannaton mein dakhil farma jin ka Tu ne un se wada kiya hai, aur un ke baap dada, un ki biwiyon aur un ki aulad mein se jo nek hon, beshak Tu hi Ghalib Hikmat wala hai. Aur unhein buraiyon se bacha le, aur jise Tu ne us din buraiyon se bacha liya to yaqinan Tu ne us par bada raham kiya, aur yahi bahut badi kamyabi hai.",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 1,
    "reference": "Surah Ghafir 40:8-9"
  },
  {
    "id": "rabbana-duas-34",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا اغْفِرْ لَنَا وَلِإِخْوَانِنَا الَّذِينَ سَبَقُونَا بِالْإِيمَانِ وَلَا تَجْعَلْ فِي قُلُوبَنَا غِلًّا لِّلَّذِينَ آمَنُوا رَبَّنَا إِنَّكَ رَءُوفٌ رَّحِيمٌ",
    "translationEn": "Our Lord, forgive us and our brothers who preceded us in faith and put not in our hearts [any] resentment toward those who have believed. Our Lord, indeed You are Kind and Merciful.",
    "translationUr": "اے ہمارے رب! ہمیں بخش دے اور ہمارے ان بھائیوں کو بھی جو ہم سے پہلے ایمان لا چکے ہیں، اور ہمارے دلوں میں ایمان لانے والوں کے لیے کوئی کینہ نہ رہنے دے، اے ہمارے رب! بیشک تو بہت مہربان نہایت رحم والا ہے",
    "translationHinglish": "Ae hamare Rabb! Hamein bakhsh de aur hamare un bhaiyon ko bhi jo hum se pehle iman la chuke hain, aur hamare dilon mein iman lane walon ke liye koi kina na rehne de, Ae hamare Rabb! Beshak Tu bahut Meharban nihayat Raham wala hai.",
    "detailEn": "Dua for the brotherhood of believers.",
    "detailUr": "اہلِ ایمان کی آپسی بھائی چارے کی دعا۔",
    "detailHinglish": "Ahle-e-iman ki aapsi bhai-chare ki dua.",
    "repeatCount": 1,
    "reference": "Surah Al-Hashr 59:10"
  },
  {
    "id": "rabbana-duas-35",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا عَلَيْكَ تَوَكَّلْنَا وَإِلَيْكَ أَنَبْنَا وَإِلَيْكَ الْمَصِيرُ",
    "translationEn": "Our Lord, upon You we have relied, and to You we have returned, and to You is the destination.",
    "translationUr": "اے ہمارے رب! ہم نے تجھی پر بھروسہ کیا اور تیری ہی طرف رجوع کیا اور تیری ہی طرف لوٹ کر جانا ہے",
    "translationHinglish": "Ae hamare Rabb! Hum ne Tujhi par bharosa kiya aur Teri hi taraf ruju kiya aur Teri hi taraf lout kar jana hai.",
    "detailEn": "Dua of Ibrahim (AS).",
    "detailUr": "حضرت ابراہیم علیہ السلام کی دعا۔",
    "detailHinglish": "Hazrat Ibrahim (AS) ki dua.",
    "repeatCount": 1,
    "reference": "Surah Al-Mumtahanah 60:4"
  },
  {
    "id": "rabbana-duas-36",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا لَا تَجْعَلْنَا فِتْنَةً لِّلَّذِينَ كَفَرُوا وَاغْفِرْ لَنَا رَبَّنَا ۖ إِنَّكَ أَنتَ الْعَزِيزُ الْحَكِيمُ",
    "translationEn": "Our Lord, make us not [objects of] trial for the disbelievers, and forgive us, our Lord. Indeed, it is You who is the Exalted in Might, the Wise.",
    "translationUr": "اے ہمارے رب! ہمیں کافروں کے لیے آزمائش نہ بنا، اور اے ہمارے رب! ہمیں بخش دے، بیشک تو ہی غالب حکمت والا ہے",
    "translationHinglish": "Ae hamare Rabb! Hamein kafiron ke liye aazmaish na bana, aur ae hamare Rabb! Hamein bakhsh de, beshak Tu hi Ghalib Hikmat wala hai.",
    "detailEn": "",
    "detailUr": "",
    "detailHinglish": "",
    "repeatCount": 1,
    "reference": "Surah Al-Mumtahanah 60:5"
  },
  {
    "id": "rabbana-duas-37",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا أَتْمِمْ لَنَا نُورَنَا وَاغْفِرْ لَنَا ۖ إِنَّكَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ",
    "translationEn": "Our Lord, perfect for us our light and forgive us. Indeed, You are over all things competent.",
    "translationUr": "اے ہمارے رب! ہمارے لیے ہمارا نور مکمل فرما دے اور ہمیں بخش دے، بیشک تو ہر چیز پر قادر ہے",
    "translationHinglish": "Ae hamare Rabb! Hamare liye hamara noor mukammal farma de aur hamein bakhsh de, beshak Tu har cheez par Qadir hai.",
    "detailEn": "Dua of the believers on the Day of Judgment.",
    "detailUr": "قیامت کے دن اہل ایمان کی دعا۔",
    "detailHinglish": "Qayamat ke din ahle iman ki dua.",
    "repeatCount": 1,
    "reference": "Surah Al-Tahrim 66:8"
  },
  {
    "id": "rabbana-duas-38",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا آمَنَّا فَاغْفِرْ لَنَا وَارْحَمْنَا وَأَنتَ خَيْرُ الرَّاحِمِينَ",
    "translationEn": "Our Lord, we have believed, so forgive us and have mercy upon us, and You are the best of the merciful.",
    "translationUr": "اے ہمارے رب! ہم ایمان لائے، پس ہمیں بخش دے اور ہم پر رحم فرما، اور تو ہی بہترین رحم فرمانے والا ہے",
    "translationHinglish": "Ae hamare Rabb! Hum iman laye, pas hamein bakhsh de aur hum par raham farma, aur Tu hi behtarin raham farmane wala hai.",
    "detailEn": "Dua of the people of faith.",
    "detailUr": "اہلِ ایمان کی دعا۔",
    "detailHinglish": "Ahle-e-iman ki dua.",
    "repeatCount": 1,
    "reference": "Surah Al-Mu'minun 23:109"
  },
  {
    "id": "rabbana-duas-39",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا أَبْصَرْنَا وَسَمِعْنَا فَارْجِعْنَا نَعْمَلْ صَالِحًا إِنَّا مُوقِنُونَ",
    "translationEn": "Our Lord, we have seen and heard, so return us [to the world]; we will work righteousness. Indeed, we are [now] certain.",
    "translationUr": "اے ہمارے رب! ہم نے دیکھ لیا اور سن لیا، اب ہمیں (دنیا میں) واپس بھیج دے کہ ہم نیک عمل کریں، اب ہمیں یقین آ چکا ہے",
    "translationHinglish": "Ae hamare Rabb! Hum ne dekh liya aur sun liya, ab hamein (duniya mein) wapas bhej de ke hum nek amal karein, ab hamein yaqin aa chuka hai.",
    "detailEn": "Dua of the criminals on the Day of Judgment (as reported in the Quran).",
    "detailUr": "قیامت کے دن مجرموں کا قول (بطورِ دعا/التجا)۔",
    "detailHinglish": "Qayamat ke din mujrimon ka qoul (bator-e-dua/iltija).",
    "repeatCount": 1,
    "reference": "Surah Al-Sajdah 32:12"
  },
  {
    "id": "rabbana-duas-40",
    "categoryName": "Rabbana Duas",
    "supplication": "رَبَّنَا غَلَبَتْ عَلَيْنَا شِقْوَتُنَا وَكُنَّا قَوْمًا ضَالِّينَ",
    "translationEn": "Our Lord, our wretchedness overcame us, and we were a people astray.",
    "translationUr": "اے ہمارے رب! ہم پر ہماری بدبختی غالب آ گئی اور ہم گمراہ لوگ تھے",
    "translationHinglish": "Ae hamare Rabb! Hum par hamari badbakhti ghalib aa gayi aur hum gumrah log thay.",
    "detailEn": "Dua/confession of the people of the Fire.",
    "detailUr": "اہلِ جہنم کا اعتراف۔",
    "detailHinglish": "Ahle-e-jahannam ka aitraf.",
    "repeatCount": 1,
    "reference": "Surah Al-Mu'minun 23:106"
  }
];

/**
 * Get all custom azkar saved by user in AsyncStorage.
 */
const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/salahtime-ee90f/databases/(default)/documents';

function parseAzkarFirestoreFields(fields: Record<string, any> | undefined): Record<string, any> {
  if (!fields) return {};
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(fields)) {
    if (val === null || val === undefined) {
      result[key] = null;
    } else if ('stringValue' in val) {
      result[key] = val.stringValue;
    } else if ('integerValue' in val) {
      result[key] = parseInt(val.integerValue, 10);
    } else if ('doubleValue' in val) {
      result[key] = Number(val.doubleValue);
    } else if ('booleanValue' in val) {
      result[key] = Boolean(val.booleanValue);
    } else if ('timestampValue' in val) {
      result[key] = val.timestampValue;
    }
  }
  return result;
}

function toAzkarFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val === null) continue;
    if (typeof val === 'string') {
      fields[key] = { stringValue: val };
    } else if (typeof val === 'number') {
      if (Number.isInteger(val)) {
        fields[key] = { integerValue: String(val) };
      } else {
        fields[key] = { doubleValue: val };
      }
    } else if (typeof val === 'boolean') {
      fields[key] = { booleanValue: val };
    }
  }
  return fields;
}

/**
 * Get all custom categories saved locally and synced from Firestore.
 */
export async function getCustomCategories(uid?: string): Promise<CustomCategory[]> {
  let categories: CustomCategory[] = [];
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_CATEGORIES_STORAGE_KEY);
    if (raw) {
      categories = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[AzkarData] Error loading local categories:', err);
  }

  // If user is authenticated, attempt background sync with Firestore (/users/{uid}/custom_categories)
  if (uid && uid.trim()) {
    try {
      const url = `${FIRESTORE_BASE}/users/${encodeURIComponent(uid.trim())}/custom_categories`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.documents)) {
          const remoteCats: CustomCategory[] = data.documents.map((doc: any) => {
            const f = parseAzkarFirestoreFields(doc.fields);
            const docId = doc.name ? doc.name.split('/').pop() : `cat-${Date.now()}`;
            return {
              id: f.id || docId || '',
              nameEn: f.nameEn || f.categoryName || 'Custom Category',
              nameUr: f.nameUr || '',
              userId: uid,
              createdOn: f.createdOn || new Date().toISOString(),
              firestoreId: docId,
            };
          });

          // Merge remote with local
          const catMap = new Map<string, CustomCategory>();
          for (const c of categories) catMap.set(c.id, c);
          for (const r of remoteCats) catMap.set(r.id, r);
          const merged = Array.from(catMap.values());
          categories = merged;
          await AsyncStorage.setItem(CUSTOM_CATEGORIES_STORAGE_KEY, JSON.stringify(merged));
        }
      }
    } catch (netErr) {
      console.warn('[AzkarData] Remote categories fetch error, using local:', netErr);
    }
  }

  return categories;
}

/**
 * Save a new Custom Category to local storage and sync to Firestore.
 */
export async function saveCustomCategory(
  nameEn: string,
  nameUr?: string,
  uid?: string
): Promise<CustomCategory> {
  const current = await getCustomCategories(uid);
  const cleanEn = nameEn.trim();
  const existing = current.find((c) => c.nameEn.toLowerCase() === cleanEn.toLowerCase());
  if (existing) {
    return existing;
  }

  const newCat: CustomCategory = {
    id: `cat-${Date.now()}`,
    nameEn: cleanEn,
    nameUr: (nameUr || '').trim(),
    userId: uid || '',
    createdOn: new Date().toISOString(),
  };

  const updated = [...current, newCat];
  try {
    await AsyncStorage.setItem(CUSTOM_CATEGORIES_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[AzkarData] Error saving category locally:', err);
  }

  // Push to Firestore under /users/{uid}/custom_categories
  if (uid && uid.trim()) {
    try {
      const currentUser = await getCurrentUser().catch(() => null);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (currentUser?.token && !currentUser.token.startsWith('admin_token_')) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
      }
      const url = `${FIRESTORE_BASE}/users/${encodeURIComponent(uid.trim())}/custom_categories?documentId=${encodeURIComponent(newCat.id)}`;
      await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fields: toAzkarFirestoreFields({
            id: newCat.id,
            nameEn: newCat.nameEn,
            nameUr: newCat.nameUr,
            userId: uid,
            createdOn: newCat.createdOn,
          }),
        }),
      });
    } catch (netErr) {
      console.warn('[AzkarData] Error syncing custom category to Firestore:', netErr);
    }
  }

  return newCat;
}

/**
 * Delete a custom category and its associated azkar items.
 */
export async function deleteCustomCategory(categoryId: string, uid?: string): Promise<void> {
  const current = await getCustomCategories(uid);
  const target = current.find((c) => c.id === categoryId);
  const updated = current.filter((c) => c.id !== categoryId);

  try {
    await AsyncStorage.setItem(CUSTOM_CATEGORIES_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  // Delete items belonging to this category
  if (target) {
    const allItems = await getCustomAzkar(undefined, uid);
    const remainingItems = allItems.filter(
      (i) => i.categoryName.toLowerCase() !== target.nameEn.toLowerCase()
    );
    await AsyncStorage.setItem(CUSTOM_AZKAR_STORAGE_KEY, JSON.stringify(remainingItems));
  }

  // Remote delete from Firestore
  if (uid && uid.trim()) {
    try {
      const currentUser = await getCurrentUser().catch(() => null);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (currentUser?.token && !currentUser.token.startsWith('admin_token_')) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
      }
      const url = `${FIRESTORE_BASE}/users/${encodeURIComponent(uid.trim())}/custom_categories/${encodeURIComponent(categoryId)}`;
      await fetch(url, { method: 'DELETE', headers });
    } catch (err) {
      console.warn('[AzkarData] Error deleting remote category:', err);
    }
  }
}

/**
 * Get all custom azkar saved by user in AsyncStorage and Firestore (/users/{uid}/custom_azkar).
 */
export async function getCustomAzkar(categoryName?: string, uid?: string): Promise<AzkarItem[]> {
  let items: AzkarItem[] = [];
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_AZKAR_STORAGE_KEY);
    if (raw) {
      items = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[AzkarData] Error loading custom azkar:', err);
  }

  // If user is authenticated, sync from Firestore (/users/{uid}/custom_azkar)
  if (uid && uid.trim()) {
    try {
      const url = `${FIRESTORE_BASE}/users/${encodeURIComponent(uid.trim())}/custom_azkar?pageSize=100`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.documents)) {
          const remoteItems: AzkarItem[] = data.documents.map((doc: any) => {
            const f = parseAzkarFirestoreFields(doc.fields);
            const docId = doc.name ? doc.name.split('/').pop() : `azkar-${Date.now()}`;
            return {
              id: f.id || docId,
              categoryName: f.categoryName || 'My Custom Azkar',
              supplication: f.supplication || '',
              translationEn: f.translationEn || '',
              translationUr: f.translationUr || '',
              translationHinglish: f.translationHinglish || '',
              detailEn: f.detailEn || '',
              detailUr: f.detailUr || '',
              detailHinglish: f.detailHinglish || '',
              repeatCount: typeof f.repeatCount === 'number' ? f.repeatCount : 1,
              reference: f.reference || 'Personal Dua',
              isCustom: true,
            };
          });

          const itemMap = new Map<string, AzkarItem>();
          for (const it of items) itemMap.set(it.id, it);
          for (const rem of remoteItems) itemMap.set(rem.id, rem);
          const merged = Array.from(itemMap.values());
          items = merged;
          await AsyncStorage.setItem(CUSTOM_AZKAR_STORAGE_KEY, JSON.stringify(merged));
        }
      }
    } catch (netErr) {
      console.warn('[AzkarData] Error pulling remote custom azkar:', netErr);
    }
  }

  if (categoryName && categoryName.trim() && categoryName !== 'My Custom Azkar') {
    const cleanCat = categoryName.trim().toLowerCase();
    return items.filter((item) => (item.categoryName || '').toLowerCase() === cleanCat);
  }

  return items;
}

/**
 * Add a new user custom Dua to AsyncStorage and sync to Firestore under /users/{uid}/custom_azkar.
 */
export async function saveCustomAzkar(
  dua: SaveCustomDuaParams,
  uid?: string
): Promise<AzkarItem> {
  const current = await getCustomAzkar(undefined, uid);
  const newItem: AzkarItem = {
    id: `custom-azkar-${Date.now()}`,
    categoryName: (dua.categoryName || 'My Custom Azkar').trim(),
    supplication: dua.supplication.trim(),
    translationEn: dua.translationEn.trim(),
    translationUr: dua.translationUr?.trim() || '',
    translationHinglish: dua.translationHinglish?.trim() || '',
    detailEn: dua.detailEn?.trim() || '',
    detailUr: dua.detailUr?.trim() || '',
    detailHinglish: dua.detailHinglish?.trim() || '',
    repeatCount: dua.repeatCount || 1,
    reference: dua.reference?.trim() || 'Personal Dua',
    isCustom: true,
  };

  const updated = [newItem, ...current];
  try {
    await AsyncStorage.setItem(CUSTOM_AZKAR_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('[AzkarData] Error saving custom dua:', err);
  }

  // Sync to Firestore under /users/{uid}/custom_azkar
  if (uid && uid.trim()) {
    try {
      const currentUser = await getCurrentUser().catch(() => null);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (currentUser?.token && !currentUser.token.startsWith('admin_token_')) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
      }
      const url = `${FIRESTORE_BASE}/users/${encodeURIComponent(uid.trim())}/custom_azkar?documentId=${encodeURIComponent(newItem.id)}`;
      await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fields: toAzkarFirestoreFields({
            id: newItem.id,
            categoryName: newItem.categoryName,
            supplication: newItem.supplication,
            translationEn: newItem.translationEn,
            translationUr: newItem.translationUr,
            translationHinglish: newItem.translationHinglish,
            detailEn: newItem.detailEn,
            detailUr: newItem.detailUr,
            detailHinglish: newItem.detailHinglish,
            repeatCount: newItem.repeatCount,
            reference: newItem.reference,
            isCustom: true,
            createdOn: new Date().toISOString(),
          }),
        }),
      });
    } catch (netErr) {
      console.warn('[AzkarData] Error saving custom azkar to Firestore:', netErr);
    }
  }

  return newItem;
}

/**
 * Delete a custom Dua by id from AsyncStorage and Firestore.
 */
export async function deleteCustomAzkar(id: string, uid?: string): Promise<void> {
  const current = await getCustomAzkar(undefined, uid);
  const updated = current.filter((item) => item.id !== id);
  try {
    await AsyncStorage.setItem(CUSTOM_AZKAR_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[AzkarData] Error deleting custom dua:', err);
  }

  if (uid && uid.trim()) {
    try {
      const currentUser = await getCurrentUser().catch(() => null);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (currentUser?.token && !currentUser.token.startsWith('admin_token_')) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
      }
      const url = `${FIRESTORE_BASE}/users/${encodeURIComponent(uid.trim())}/custom_azkar/${encodeURIComponent(id)}`;
      await fetch(url, { method: 'DELETE', headers });
    } catch (err) {
      console.warn('[AzkarData] Error deleting remote custom azkar:', err);
    }
  }
}

/**
 * Full bidirectional sync of Custom Azkar & Categories with Firestore.
 */
export async function syncCustomAzkarWithFirestore(uid: string): Promise<void> {
  if (!uid || !uid.trim()) return;
  await Promise.all([
    getCustomCategories(uid),
    getCustomAzkar(undefined, uid),
  ]);
}

/**
 * Get azkar items filtered by category name.
 */
export async function getAzkarByCategory(category: string, uid?: string): Promise<AzkarItem[]> {
  if (category === 'My Custom Azkar') {
    return await getCustomAzkar(undefined, uid);
  }
  // Check if it's one of the prebuilt bundled categories
  const prebuilt = BUNDLED_AZKAR.filter((item) => item.categoryName === category);
  if (prebuilt.length > 0) {
    return prebuilt;
  }
  // Otherwise it's a dynamic custom category
  return await getCustomAzkar(category, uid);
}
