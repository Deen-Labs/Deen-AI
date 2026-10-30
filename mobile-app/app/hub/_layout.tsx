import React from "react";
import { View, Text, TouchableOpacity, BackHandler } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import HubBottomBar from "../../components/HubBottomBar";
import { useTheme } from "../../lib/theme";
import { useLanguage } from "../../lib/i18n";

export default function HubLayout() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const handleBack = React.useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/more");
    }
  }, [router]);

  React.useEffect(() => {
    const onHardwareBack = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [handleBack]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.accentGold,
          headerTitleStyle: {
            fontWeight: "700",
            fontSize: 16,
            color: colors.text,
          },
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity
              onPress={handleBack}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingRight: 12,
                paddingVertical: 6,
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="arrow-left" size={20} color={colors.accentGold} />
              <Text
                style={{
                  color: colors.accentGold,
                  fontSize: 14,
                  fontWeight: "600",
                  marginLeft: 6,
                }}
              >
                {t('common.back', 'Back')}
              </Text>
            </TouchableOpacity>
          ),
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen
          name="azkar"
          options={{
            title: "Azkar & Supplications",
          }}
        />
        <Stack.Screen
          name="asma-ul-husna"
          options={{
            title: "99 Names of Allah",
          }}
        />
        <Stack.Screen
          name="tasbih"
          options={{
            title: "Digital Tasbih Counter",
          }}
        />
        <Stack.Screen
          name="quran-hadith-search"
          options={{
            title: "Quran & Hadith Library",
          }}
        />
        <Stack.Screen
          name="friday-topics"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="ramadhan"
          options={{
            title: "Ramadhan 30-Day Calendar",
          }}
        />
        <Stack.Screen
          name="madrasa"
          options={{
            title: "Maktab Student Attendance",
          }}
        />
        <Stack.Screen
          name="community-feedback"
          options={{
            title: "Community & Feedback",
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: "Settings",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="admin-dashboard"
          options={{
            title: "Admin Portal",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="prayer"
          options={{
            title: "Prayer Times (API)",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="clean-stats"
          options={{
            title: "Days Clean & Stats",
          }}
        />
        <Stack.Screen
          name="community-network"
          options={{
            title: "SalahTime Network",
          }}
        />
      </Stack>
      <HubBottomBar />
    </View>
  );
}
