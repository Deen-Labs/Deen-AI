import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { useLanguage } from '../lib/i18n';

export default function HubBottomBar() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const extraSwipeBuffer = Platform.OS === 'android' ? 14 : 10;
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 14) + extraSwipeBuffer;
  const tabBarHeight = 58 + bottomPadding;

  const handleNav = (route: string) => {
    router.replace(route as any);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderSubtle,
          height: tabBarHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
      ]}
    >
      {/* 1. Home */}
      <TouchableOpacity
        style={styles.tabBtn}
        onPress={() => handleNav('/(tabs)')}
        activeOpacity={0.7}
      >
        <Feather name="home" size={20} color={colors.textMuted} />
        <Text style={[styles.tabLabel, { color: colors.textMuted }]}>{t('tabs.home', 'Home')}</Text>
      </TouchableOpacity>

      {/* 2. Masjid */}
      <TouchableOpacity
        style={styles.tabBtn}
        onPress={() => handleNav('/(tabs)/masjid')}
        activeOpacity={0.7}
      >
        <Feather name="map-pin" size={20} color={colors.textMuted} />
        <Text style={[styles.tabLabel, { color: colors.textMuted }]}>{t('tabs.masjid', 'Masjid')}</Text>
      </TouchableOpacity>

      {/* 3. Focus / Protection */}
      <TouchableOpacity
        style={styles.tabBtn}
        onPress={() => handleNav('/(tabs)/focus')}
        activeOpacity={0.7}
      >
        <Feather name="target" size={20} color={colors.textMuted} />
        <Text style={[styles.tabLabel, { color: colors.textMuted }]}>{t('tabs.focus', 'Focus')}</Text>
      </TouchableOpacity>

      {/* 4. Jumu'ah (Friday Topics) */}
      <TouchableOpacity
        style={styles.tabBtn}
        onPress={() => handleNav('/(tabs)/friday-topics')}
        activeOpacity={0.7}
      >
        <Feather name="mic" size={20} color={colors.textMuted} />
        <Text style={[styles.tabLabel, { color: colors.textMuted }]}>{t('tabs.jumuah', "Jumu'ah")}</Text>
      </TouchableOpacity>

      {/* 5. More */}
      <TouchableOpacity
        style={styles.tabBtn}
        onPress={() => handleNav('/(tabs)/more')}
        activeOpacity={0.7}
      >
        <Feather name="grid" size={20} color={colors.accentGold} />
        <Text style={[styles.tabLabel, { color: colors.accentGold, fontWeight: '700' }]}>{t('tabs.more', 'More')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },
});
