import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  Linking,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { useResponsiveLayout } from '../../lib/responsive';
import { audioPlayer } from '../../lib/audioPlayer';
import { ASMA_UL_HUSNA, AsmaUlHusnaData, searchAsmaUlHusna } from '../../lib/asmaUlHusnaData';

export default function AsmaUlHusnaScreen() {
  const { colors, isDark } = useTheme();
  const { gridColumns, contentContainerStyle } = useResponsiveLayout();
  const [searchQuery, setSearchQuery] = useState('');
  const [playingNumber, setPlayingNumber] = useState<number | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState<boolean>(false);
  const playAllActiveRef = useRef<boolean>(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    return () => {
      playAllActiveRef.current = false;
      audioPlayer.stop().catch(() => {});
    };
  }, []);

  const filteredNames = useMemo(() => {
    return searchAsmaUlHusna(searchQuery);
  }, [searchQuery]);

  const playTrackPromise = (url: string, number: number): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      let resolved = false;
      audioPlayer.play(url, (status) => {
        if (status.isPlaying) {
          setPlayingNumber(number);
        } else if (status.didJustFinish) {
          if (!resolved) {
            resolved = true;
            resolve(true);
          }
        } else if (status.error) {
          if (!resolved) {
            resolved = true;
            resolve(false);
          }
        }
      }).catch(() => {
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      });
    });
  };

  const stopPlayAll = async () => {
    playAllActiveRef.current = false;
    setIsPlayingAll(false);
    setPlayingNumber(null);
    await audioPlayer.stop().catch(() => {});
  };

  const handleTogglePlayAll = async () => {
    if (isPlayingAll) {
      await stopPlayAll();
      return;
    }

    try {
      Vibration.vibrate(25);
    } catch {}

    playAllActiveRef.current = true;
    setIsPlayingAll(true);

    const list = filteredNames;
    for (let i = 0; i < list.length; i++) {
      if (!playAllActiveRef.current) break;
      const item = list[i];
      try {
        const rowIndex = Math.floor(i / Math.max(1, gridColumns));
        flatListRef.current?.scrollToIndex({
          index: rowIndex,
          animated: true,
          viewPosition: 0.3,
        });
      } catch {}

      await playTrackPromise(item.audioUrl, item.number);
      if (!playAllActiveRef.current) break;
      await new Promise((r) => setTimeout(r, 350));
    }

    playAllActiveRef.current = false;
    setIsPlayingAll(false);
    setPlayingNumber(null);
  };

  const handlePlayPronunciation = async (item: AsmaUlHusnaData) => {
    if (isPlayingAll) {
      await stopPlayAll();
    }
    try {
      Vibration.vibrate(25);
    } catch {}

    if (playingNumber === item.number) {
      await audioPlayer.stop();
      setPlayingNumber(null);
      return;
    }

    setPlayingNumber(item.number);

    await audioPlayer.play(item.audioUrl, (status) => {
      if (status.isPlaying) {
        setPlayingNumber(item.number);
      } else if (status.didJustFinish || status.error) {
        setPlayingNumber(null);
      }
    });
  };

  const renderItem = ({ item }: { item: AsmaUlHusnaData }) => {
    const isPlaying = playingNumber === item.number;

    return (
      <View style={[styles.nameCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Top Row: Number Badge & Play Button */}
        <View style={styles.cardHeader}>
          <View style={[styles.numberBadge, { backgroundColor: colors.pill }]}>
            <Text style={[styles.numberBadgeText, { color: colors.textMuted }]}>#{item.number}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.playButton,
              { backgroundColor: colors.pill, borderColor: colors.border },
              isPlaying && { backgroundColor: isDark ? 'rgba(0, 255, 102, 0.15)' : 'rgba(5, 150, 105, 0.15)', borderColor: colors.accentGreen },
            ]}
            onPress={() => handlePlayPronunciation(item)}
            activeOpacity={0.7}
          >
            <Feather
              name={isPlaying ? 'volume-2' : 'volume-1'}
              size={13}
              color={isPlaying ? colors.accentGreen : colors.accentGold}
            />
          </TouchableOpacity>
        </View>

        {/* Arabic Calligraphy */}
        <Text style={[styles.arabicName, { color: colors.accentSoft }]}>{item.name}</Text>

        {/* Transliteration */}
        <Text style={[styles.transliterationText, { color: colors.text }]}>{item.transliteration}</Text>

        {/* Meaning */}
        <Text style={[styles.meaningText, { color: colors.textSecondary }]} numberOfLines={2}>
          "{item.meaning}"
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Search Header */}
      <View style={[styles.searchContainer, contentContainerStyle]}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
          <Feather name="search" size={14} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by name, meaning, or # (1-99)..."
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

        <View style={styles.subInfoRow}>
          <TouchableOpacity
            style={[
              styles.playAllBtn,
              { backgroundColor: isPlayingAll ? colors.accentGold : colors.pill, borderColor: colors.accentGold },
            ]}
            onPress={handleTogglePlayAll}
            activeOpacity={0.8}
          >
            <Feather
              name={isPlayingAll ? "square" : "play"}
              size={12}
              color={isPlayingAll ? "#0f1718" : colors.accentGold}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.playAllBtnText,
                { color: isPlayingAll ? "#0f1718" : colors.accentGold },
              ]}
            >
              {isPlayingAll ? "Stop Playing" : "Play All (1–99)"}
            </Text>
          </TouchableOpacity>

          <View style={[styles.hadithRefBadge, { backgroundColor: colors.pill, borderColor: colors.border }]}>
            <Text style={[styles.hadithRefBadgeText, { color: colors.accentGold }]}>Sahih Al-Bukhari 7392</Text>
          </View>
        </View>
      </View>

      {/* Grid */}
      <FlatList
        ref={flatListRef}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
          }, 200);
        }}
        key={`grid-${gridColumns}`}
        data={filteredNames}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.number)}
        numColumns={gridColumns}
        contentContainerStyle={[styles.listContent, contentContainerStyle]}
        columnWrapperStyle={styles.columnWrapper}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="search" size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No matching divine names found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  playAllBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  container: {
    flex: 1,
    backgroundColor: '#0f1718',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c3033',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 12,
  },
  subInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  subInfoText: {
    fontSize: 11,
    color: '#94a4a2',
  },
  hadithRefBadge: {
    backgroundColor: 'rgba(226, 162, 59, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hadithRefBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#e2a23b',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  columnWrapper: {
    gap: 8,
    marginBottom: 8,
  },
  nameCard: {
    flex: 1,
    backgroundColor: '#0b2527',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.18)',
    alignItems: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  numberBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  numberBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a4a2',
  },
  playButton: {
    padding: 5,
    backgroundColor: 'rgba(226, 162, 59, 0.12)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.25)',
  },
  playButtonActive: {
    backgroundColor: 'rgba(0, 255, 102, 0.15)',
    borderColor: '#00ff66',
  },
  arabicName: {
    fontSize: 22,
    lineHeight: 34,
    color: '#ffdda8',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'normal',
    marginVertical: 4,
  },
  transliterationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 2,
  },
  meaningText: {
    fontSize: 11,
    color: '#94a4a2',
    textAlign: 'center',
    lineHeight: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#94a4a2',
    fontSize: 13,
  },
});
