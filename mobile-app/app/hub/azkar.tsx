import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Vibration,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  AzkarItem,
  CustomCategory,
  PREBUILT_AZKAR_CATEGORIES,
  getAzkarByCategory,
  getCustomCategories,
  saveCustomCategory,
  deleteCustomCategory,
  saveCustomAzkar,
  deleteCustomAzkar,
  syncCustomAzkarWithFirestore,
} from '../../lib/azkarData';
import { getCurrentUser, UserProfile } from '../../lib/auth';
import { getAppLanguage } from '../../lib/onboarding';
import { useTheme } from '../../lib/theme';
import { useResponsiveLayout } from '../../lib/responsive';

type LanguageMode = 'en' | 'ur' | 'hinglish';

const PREBUILT_LIST = ['Morning Azkar', 'Evening Azkar', 'Rabbana Duas'];

export default function AzkarScreen() {
  const { colors, isDark } = useTheme();
  const { contentContainerStyle } = useResponsiveLayout();

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Morning Azkar');
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [language, setLanguage] = useState<LanguageMode>('en');
  const [items, setItems] = useState<AzkarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Add custom dua modal states
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [targetCategoryForDua, setTargetCategoryForDua] = useState<string>('My Custom Azkar');
  const [newArabic, setNewArabic] = useState('');
  const [newEnglish, setNewEnglish] = useState('');
  const [newUrdu, setNewUrdu] = useState('');
  const [newHinglish, setNewHinglish] = useState('');
  const [newDetail, setNewDetail] = useState('');
  const [newRepeat, setNewRepeat] = useState('1');
  const [newRef, setNewRef] = useState('');
  const [savingDua, setSavingDua] = useState(false);

  // Add custom category modal states
  const [isAddCatModalVisible, setIsAddCatModalVisible] = useState(false);
  const [newCatNameEn, setNewCatNameEn] = useState('');
  const [newCatNameUr, setNewCatNameUr] = useState('');
  const [savingCat, setSavingCat] = useState(false);

  useEffect(() => {
    initScreen();
  }, []);

  const initScreen = async () => {
    const [u, lang] = await Promise.all([
      getCurrentUser().catch(() => null),
      getAppLanguage().catch(() => 'en'),
    ]);
    setCurrentUser(u);
    if (lang === 'ur') setLanguage('ur');

    // Load custom categories and perform Firestore sync if logged in
    await loadCategories(u?.uid);
    if (u?.uid) {
      syncCustomAzkarWithFirestore(u.uid).catch(() => {});
    }
  };

  const loadCategories = async (uid?: string) => {
    try {
      const cats = await getCustomCategories(uid);
      setCustomCategories(cats);
    } catch (err) {
      console.warn('[AzkarScreen] Error loading categories:', err);
    }
  };

  useEffect(() => {
    loadCategory(selectedCategory);
  }, [selectedCategory]);

  const loadCategory = async (cat: string) => {
    setLoading(true);
    try {
      const data = await getAzkarByCategory(cat, currentUser?.uid);
      setItems(data);
    } catch (err) {
      console.warn('Error loading azkar:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTapCount = (id: string, targetCount: number) => {
    setCounts((prev) => {
      const current = prev[id] || 0;
      const next = current + 1;
      if (next === targetCount) {
        try {
          Vibration.vibrate([0, 60, 40, 60]);
        } catch {}
      } else {
        try {
          Vibration.vibrate(25);
        } catch {}
      }
      return { ...prev, [id]: next > targetCount ? 0 : next };
    });
  };

  const handleResetCount = (id: string) => {
    setCounts((prev) => ({ ...prev, [id]: 0 }));
  };

  // Create new Custom Category
  const handleSaveCategory = async () => {
    if (!newCatNameEn.trim()) {
      Alert.alert('Required', 'Please enter a Category Title in English.');
      return;
    }
    setSavingCat(true);
    try {
      const saved = await saveCustomCategory(newCatNameEn, newCatNameUr, currentUser?.uid);
      await loadCategories(currentUser?.uid);
      setSelectedCategory(saved.nameEn);
      setNewCatNameEn('');
      setNewCatNameUr('');
      setIsAddCatModalVisible(false);
      Alert.alert('Category Created', `"${saved.nameEn}" is now available in your Azkar roster.`);
    } catch (err) {
      Alert.alert('Error', 'Failed to create category.');
    } finally {
      setSavingCat(false);
    }
  };

  // Delete Custom Category
  const handleDeleteCategory = (cat: CustomCategory) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete category "${cat.nameEn}" and all supplications inside it?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCustomCategory(cat.id, currentUser?.uid);
            await loadCategories(currentUser?.uid);
            setSelectedCategory('Morning Azkar');
          },
        },
      ]
    );
  };

  // Save Custom Dua (with inputs for Arabic, English, Urdu, Hinglish, Virtue/Detail)
  const handleSaveCustomDua = async () => {
    if (!newEnglish.trim() && !newArabic.trim()) {
      Alert.alert('Required', 'Please enter either Arabic supplication or English translation.');
      return;
    }
    setSavingDua(true);
    try {
      const countNum = parseInt(newRepeat, 10) || 1;
      const cat = targetCategoryForDua.trim() || selectedCategory || 'My Custom Azkar';

      await saveCustomAzkar(
        {
          categoryName: cat,
          supplication: newArabic.trim(),
          translationEn: newEnglish.trim(),
          translationUr: newUrdu.trim(),
          translationHinglish: newHinglish.trim(),
          detailEn: newDetail.trim(),
          detailUr: newDetail.trim(),
          detailHinglish: newDetail.trim(),
          repeatCount: countNum,
          reference: newRef.trim() || 'My Personal Dua',
        },
        currentUser?.uid
      );

      setNewArabic('');
      setNewEnglish('');
      setNewUrdu('');
      setNewHinglish('');
      setNewDetail('');
      setNewRepeat('1');
      setNewRef('');
      setIsAddModalVisible(false);

      if (selectedCategory === cat) {
        await loadCategory(cat);
      } else {
        setSelectedCategory(cat);
      }
      Alert.alert('Dua Saved', 'Your supplication has been saved and synced to your profile.');
    } catch (err) {
      Alert.alert('Error', 'Failed to save supplication.');
    } finally {
      setSavingDua(false);
    }
  };

  const handleDeleteDua = async (id: string) => {
    Alert.alert('Delete Dua', 'Are you sure you want to delete this custom Dua?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCustomAzkar(id, currentUser?.uid);
          loadCategory(selectedCategory);
        },
      },
    ]);
  };

  const isCustomCategorySelected = useMemo(() => {
    return !PREBUILT_LIST.includes(selectedCategory);
  }, [selectedCategory]);

  const currentCustomCatObj = useMemo(() => {
    return customCategories.find((c) => c.nameEn.toLowerCase() === selectedCategory.toLowerCase());
  }, [customCategories, selectedCategory]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.translationEn.toLowerCase().includes(q) ||
        item.translationHinglish.toLowerCase().includes(q) ||
        item.translationUr.includes(q) ||
        item.supplication.includes(q) ||
        (item.detailEn || '').toLowerCase().includes(q) ||
        (item.reference || '').toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Search & Actions Bar */}
      <View style={styles.topControlRow}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
          <Feather name="search" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search supplications & virtues..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Add Dua Action Button */}
        <TouchableOpacity
          style={[styles.addDuaTopBtn, { backgroundColor: colors.accentGold }]}
          onPress={() => {
            setTargetCategoryForDua(isCustomCategorySelected ? selectedCategory : 'My Custom Azkar');
            setIsAddModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={13} color="#0f1718" style={{ marginRight: 4 }} />
          <Text style={[styles.addDuaTopBtnText, { color: '#0f1718' }]}>Add Dua</Text>
        </TouchableOpacity>
      </View>

      {/* Language Selector Pills */}
      <View style={styles.langSelectorRow}>
        <Text style={[styles.langLabel, { color: colors.textSecondary }]}>Translation:</Text>
        <View style={[styles.langPillContainer, contentContainerStyle]}>
          <TouchableOpacity
            style={[
              styles.langPill,
              { backgroundColor: colors.pill, borderColor: colors.borderSubtle },
              language === 'en' && { backgroundColor: colors.accentGoldBg, borderColor: colors.accentGold },
            ]}
            onPress={() => setLanguage('en')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.langText,
                { color: colors.textMuted },
                language === 'en' && { color: '#0f1718', fontWeight: '700' },
              ]}
            >
              English
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.langPill,
              { backgroundColor: colors.pill, borderColor: colors.borderSubtle },
              language === 'ur' && { backgroundColor: colors.accentGoldBg, borderColor: colors.accentGold },
            ]}
            onPress={() => setLanguage('ur')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.langText,
                { color: colors.textMuted },
                language === 'ur' && { color: '#0f1718', fontWeight: '700' },
              ]}
            >
              اردو
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.langPill,
              { backgroundColor: colors.pill, borderColor: colors.borderSubtle },
              language === 'hinglish' && { backgroundColor: colors.accentGoldBg, borderColor: colors.accentGold },
            ]}
            onPress={() => setLanguage('hinglish')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.langText,
                { color: colors.textMuted },
                language === 'hinglish' && { color: '#0f1718', fontWeight: '700' },
              ]}
            >
              Hinglish
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Categories Horizontal Tabs (Prebuilt + Dynamic Custom Categories + Add Category Button) */}
      <View style={styles.categoryBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {/* Prebuilt Categories */}
          {PREBUILT_LIST.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catTab,
                  { backgroundColor: colors.pill, borderColor: colors.borderSubtle },
                  isActive && { backgroundColor: colors.accentGoldBg, borderColor: colors.accentGold },
                ]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.catTabText,
                    { color: colors.textMuted },
                    isActive && { color: '#0f1718', fontWeight: '700' },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Default My Custom Azkar Tab if no custom categories */}
          {customCategories.length === 0 && (
            <TouchableOpacity
              key="My Custom Azkar"
              style={[
                styles.catTab,
                { backgroundColor: colors.pill, borderColor: colors.borderSubtle },
                selectedCategory === 'My Custom Azkar' && { backgroundColor: colors.accentGoldBg, borderColor: colors.accentGold },
              ]}
              onPress={() => setSelectedCategory('My Custom Azkar')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.catTabText,
                  { color: colors.textMuted },
                  selectedCategory === 'My Custom Azkar' && { color: '#0f1718', fontWeight: '700' },
                ]}
              >
                My Custom Azkar
              </Text>
            </TouchableOpacity>
          )}

          {/* Dynamically Rendered Custom Categories */}
          {customCategories.map((c) => {
            const isActive = selectedCategory === c.nameEn;
            return (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.catTab,
                  { backgroundColor: colors.pill, borderColor: colors.borderSubtle },
                  isActive && { backgroundColor: colors.accentGoldBg, borderColor: colors.accentGold },
                ]}
                onPress={() => setSelectedCategory(c.nameEn)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.catTabText,
                    { color: colors.textMuted },
                    isActive && { color: '#0f1718', fontWeight: '700' },
                  ]}
                >
                  {c.nameEn}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Create Custom Category (+) Pill */}
          <TouchableOpacity
            style={[styles.addCatPill, { backgroundColor: colors.surface, borderColor: colors.accentGold }]}
            onPress={() => setIsAddCatModalVisible(true)}
            activeOpacity={0.8}
          >
            <Feather name="folder-plus" size={12} color={colors.accentGold} style={{ marginRight: 4 }} />
            <Text style={[styles.addCatPillText, { color: colors.accentGold }]}>New Category</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Subheader banner for active custom category */}
      {isCustomCategorySelected && (
        <View style={[styles.customCatBanner, { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Feather name="bookmark" size={13} color={colors.accentGold} style={{ marginRight: 6 }} />
            <Text style={[styles.customCatBannerTitle, { color: colors.text }]}>{selectedCategory}</Text>
            <Text style={[styles.customCatBannerCount, { color: colors.textMuted }]}> ({items.length} Duas)</Text>
          </View>
          {currentCustomCatObj && (
            <TouchableOpacity
              style={styles.deleteCatBtn}
              onPress={() => handleDeleteCategory(currentCustomCatObj)}
              activeOpacity={0.7}
            >
              <Feather name="trash" size={12} color="#ef4444" style={{ marginRight: 4 }} />
              <Text style={styles.deleteCatBtnText}>Delete Category</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Azkar Cards List */}
      <ScrollView style={styles.listScrollView} contentContainerStyle={[styles.listContent, contentContainerStyle]}>
        {loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="small" color={colors.accentGold} />
            <Text style={[styles.emptyText, { color: colors.textMuted, marginTop: 8 }]}>Loading Azkar...</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="book-open" size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {isCustomCategorySelected
                ? 'No custom supplications in this category yet. Tap "+ Add Dua" to add one.'
                : 'No supplications found'}
            </Text>
          </View>
        ) : (
          filteredItems.map((item, idx) => {
            const currentCount = counts[item.id] || 0;
            const isCompleted = currentCount >= item.repeatCount;

            const translation =
              language === 'ur'
                ? item.translationUr || item.translationEn
                : language === 'hinglish'
                ? item.translationHinglish || item.translationEn
                : item.translationEn;

            const detail =
              language === 'ur'
                ? item.detailUr || item.detailEn
                : language === 'hinglish'
                ? item.detailHinglish || item.detailEn
                : item.detailEn;

            return (
              <View key={item.id} style={[styles.azkarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {/* Card Header: Number & Progress Counter */}
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIndexBadge, { backgroundColor: colors.pill }]}>
                    <Text style={[styles.cardIndexText, { color: colors.textMuted }]}>#{idx + 1}</Text>
                  </View>

                  <View style={styles.headerRightActions}>
                    {item.isCustom && (
                      <TouchableOpacity
                        onPress={() => handleDeleteDua(item.id)}
                        style={styles.deleteDuaBtn}
                        activeOpacity={0.7}
                      >
                        <Feather name="trash-2" size={13} color="#ef4444" />
                      </TouchableOpacity>
                    )}

                    {/* Tap-To-Count Progress Button */}
                    <TouchableOpacity
                      style={[
                        styles.tapCountPill,
                        { backgroundColor: colors.pill, borderColor: colors.border },
                        isCompleted && {
                          backgroundColor: isDark ? 'rgba(0, 255, 102, 0.12)' : 'rgba(5, 150, 105, 0.12)',
                          borderColor: colors.accentGreen,
                        },
                      ]}
                      onPress={() => handleTapCount(item.id, item.repeatCount)}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name={isCompleted ? 'check-circle' : 'repeat'}
                        size={12}
                        color={isCompleted ? colors.accentGreen : colors.accentGold}
                        style={{ marginRight: 5 }}
                      />
                      <Text
                        style={[
                          styles.tapCountText,
                          { color: colors.accentGold },
                          isCompleted && { color: colors.accentGreen },
                        ]}
                      >
                        {currentCount} / {item.repeatCount}
                      </Text>
                    </TouchableOpacity>

                    {currentCount > 0 && (
                      <TouchableOpacity
                        onPress={() => handleResetCount(item.id)}
                        style={styles.resetBtn}
                      >
                        <Feather name="rotate-ccw" size={12} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Arabic Supplication */}
                {item.supplication ? (
                  <Text style={[styles.arabicText, { color: colors.accentSoft }]}>{item.supplication}</Text>
                ) : null}

                {/* Translation */}
                <Text
                  style={[
                    styles.translationText,
                    { color: colors.textSecondary },
                    language === 'ur' && styles.urduTranslationText,
                  ]}
                >
                  "{translation}"
                </Text>

                {/* Virtue / Detail */}
                {detail ? (
                  <View style={[styles.virtueBox, { backgroundColor: colors.surface, borderLeftColor: colors.accentGold }]}>
                    <View style={styles.virtueHeader}>
                      <Feather name="award" size={11} color={colors.accentGold} style={{ marginRight: 4 }} />
                      <Text style={[styles.virtueTitle, { color: colors.accentGold }]}>Virtue & Detail</Text>
                    </View>
                    <Text
                      style={[
                        styles.virtueText,
                        { color: colors.textMuted },
                        language === 'ur' && styles.urduTranslationText,
                      ]}
                    >
                      {detail}
                    </Text>
                  </View>
                ) : null}

                {/* Hadith / Surah Reference */}
                {item.reference ? (
                  <View style={styles.referenceRow}>
                    <Feather name="bookmark" size={11} color={colors.textMuted} style={{ marginRight: 4 }} />
                    <Text style={[styles.referenceText, { color: colors.textMuted }]}>{item.reference}</Text>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Custom Category Modal */}
      <Modal visible={isAddCatModalVisible} transparent animationType="slide" onRequestClose={() => setIsAddCatModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Create Custom Category</Text>
              <TouchableOpacity onPress={() => setIsAddCatModalVisible(false)}>
                <Feather name="x" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Category Name (English) *</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle, color: colors.text }]}
                placeholder="e.g. Travel Duas, Exam Azkar, Family Protection..."
                placeholderTextColor={colors.textMuted}
                value={newCatNameEn}
                onChangeText={setNewCatNameEn}
              />

              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Category Name (Urdu, Optional)</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle, color: colors.text }]}
                placeholder="مثلاً: دعائے سفر، امتحانات کے اذکار..."
                placeholderTextColor={colors.textMuted}
                value={newCatNameUr}
                onChangeText={setNewCatNameUr}
              />

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: colors.accentGold }]}
                onPress={handleSaveCategory}
                disabled={savingCat}
                activeOpacity={0.8}
              >
                {savingCat ? (
                  <ActivityIndicator size="small" color="#0f1718" />
                ) : (
                  <Text style={[styles.modalSubmitBtnText, { color: '#0f1718' }]}>Create Category</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Custom Dua Modal (inputs for Arabic, English, Urdu, Hinglish, Virtue/Detail) */}
      <Modal visible={isAddModalVisible} transparent animationType="slide" onRequestClose={() => setIsAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCardLarge, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Custom Dua</Text>
              <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                <Feather name="x" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Category selection */}
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Select Category</Text>
              <View style={styles.catChipsSelectorRow}>
                {['My Custom Azkar', ...customCategories.map((c) => c.nameEn)].map((catName) => {
                  const isTarget = targetCategoryForDua === catName;
                  return (
                    <TouchableOpacity
                      key={catName}
                      style={[
                        styles.catChoiceChip,
                        { backgroundColor: colors.pill, borderColor: colors.borderSubtle },
                        isTarget && { backgroundColor: colors.accentGoldBg, borderColor: colors.accentGold },
                      ]}
                      onPress={() => setTargetCategoryForDua(catName)}
                    >
                      <Text
                        style={[
                          styles.catChoiceChipText,
                          { color: colors.textMuted },
                          isTarget && { color: '#0f1718', fontWeight: '700' },
                        ]}
                      >
                        {catName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Arabic Supplication</Text>
              <TextInput
                style={[
                  styles.modalTextarea,
                  styles.arabicInput,
                  { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle, color: colors.text },
                ]}
                placeholder="اَللّٰهُمَّ إِنِّي أَسْأَلُكَ..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                value={newArabic}
                onChangeText={setNewArabic}
              />

              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>English Translation *</Text>
              <TextInput
                style={[
                  styles.modalTextarea,
                  { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle, color: colors.text },
                ]}
                placeholder="O Allah, I ask You for beneficial knowledge..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={2}
                value={newEnglish}
                onChangeText={setNewEnglish}
              />

              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Urdu Translation (اردو)</Text>
              <TextInput
                style={[
                  styles.modalTextarea,
                  { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle, color: colors.text },
                ]}
                placeholder="اے اللہ! میں تجھ سے نفع بخش علم کا سوال کرتا ہوں..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={2}
                value={newUrdu}
                onChangeText={setNewUrdu}
              />

              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Hinglish Roman Script</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle, color: colors.text },
                ]}
                placeholder="Ae Allah! Main tujh se nafa bakhsh ilm maangta hoon..."
                placeholderTextColor={colors.textMuted}
                value={newHinglish}
                onChangeText={setNewHinglish}
              />

              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Virtue & Detail (Virtues / Fazilat)</Text>
              <TextInput
                style={[
                  styles.modalTextarea,
                  { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle, color: colors.text },
                ]}
                placeholder="Recite after Fajr prayer for protection and barakah..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={2}
                value={newDetail}
                onChangeText={setNewDetail}
              />

              <View style={styles.modalDualRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Repeat Count</Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle, color: colors.text },
                    ]}
                    placeholder="1"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textMuted}
                    value={newRepeat}
                    onChangeText={setNewRepeat}
                  />
                </View>

                <View style={{ flex: 1.5 }}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Reference / Source</Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      { backgroundColor: colors.inputBg, borderColor: colors.borderSubtle, color: colors.text },
                    ]}
                    placeholder="e.g. Sahih Muslim 2723"
                    placeholderTextColor={colors.textMuted}
                    value={newRef}
                    onChangeText={setNewRef}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: colors.accentGold, marginBottom: 25 }]}
                onPress={handleSaveCustomDua}
                disabled={savingDua}
                activeOpacity={0.8}
              >
                {savingDua ? (
                  <ActivityIndicator size="small" color="#0f1718" />
                ) : (
                  <Text style={[styles.modalSubmitBtnText, { color: '#0f1718' }]}>Save Supplication</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topControlRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
  },
  addDuaTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 8,
  },
  addDuaTopBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  langSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  langLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginRight: 8,
  },
  langPillContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  langPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  langText: {
    fontSize: 11,
    fontWeight: '600',
  },
  categoryBarContainer: {
    paddingVertical: 6,
  },
  categoryScroll: {
    paddingHorizontal: 16,
  },
  categoryScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 24,
  },
  catTab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  catTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addCatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addCatPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  customCatBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  customCatBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  customCatBannerCount: {
    fontSize: 12,
  },
  deleteCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  deleteCatBtnText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '600',
  },
  listScrollView: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  azkarCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardIndexBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardIndexText: {
    fontSize: 10,
    fontWeight: '700',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteDuaBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  tapCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  tapCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  resetBtn: {
    padding: 4,
  },
  arabicText: {
    fontSize: 18,
    lineHeight: 32,
    textAlign: 'right',
    marginBottom: 10,
    fontWeight: '600',
  },
  translationText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  urduTranslationText: {
    textAlign: 'right',
    lineHeight: 22,
  },
  virtueBox: {
    borderLeftWidth: 3,
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  virtueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  virtueTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  virtueText: {
    fontSize: 11,
    lineHeight: 16,
  },
  referenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  referenceText: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  modalCardLarge: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalBody: {
    marginTop: 10,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    fontSize: 12,
  },
  modalTextarea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    minHeight: 55,
  },
  arabicInput: {
    textAlign: 'right',
    fontSize: 15,
  },
  catChipsSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  catChoiceChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  catChoiceChipText: {
    fontSize: 11,
  },
  modalDualRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalSubmitBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
