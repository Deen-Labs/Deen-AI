import { Share, Clipboard, Alert } from 'react-native';

export const DEEN_AI_PROMO_FOOTER = `
---
Shared via DeenHub: Masjid & SalahTime — Your Private Islamic Spiritual Companion

Key Features of DeenHub:
1. Live Masjid Jama'at Timings: Synchronized neighborhood prayer boards with offline solar calculation & Qibla compass.
2. Quran & Hadith Intelligence: Sequential Ayat tracker, multi-language Hadith search, 99 Names of Allah & classical guidance.
3. Focus Mode & Content Protection: System-wide digital detox, distracting app blocking during prayer, and streak accountability.

Elevate your worship and daily Islamic habits with DeenHub.`;

export async function shareDeenContent(params: {
  title: string;
  arabic?: string;
  translation: string;
  source?: string;
}): Promise<void> {
  const parts: string[] = [];

  parts.push(params.title);
  if (params.source) {
    parts.push(`Source: ${params.source}`);
  }
  parts.push('');

  if (params.arabic) {
    parts.push(params.arabic);
    parts.push('');
  }

  parts.push(`"${params.translation}"`);
  parts.push(DEEN_AI_PROMO_FOOTER);

  const fullMessage = parts.join('\n');

  try {
    await Share.share({
      title: params.title,
      message: fullMessage,
    });
  } catch {
    Clipboard.setString(fullMessage);
    Alert.alert('Copied to Clipboard', 'Content and DeenHub introduction copied to clipboard.');
  }
}

export async function shareAppGeneral(): Promise<void> {
  const message = `DeenHub: Masjid & SalahTime — Your Private Islamic Spiritual Companion

Elevate your worship and daily Islamic habits with 3 powerful features:
1. Live Masjid Jama'at Timings: Synchronized neighborhood prayer boards with offline solar calculation & Qibla compass.
2. Quran & Hadith Intelligence: Sequential Ayat tracker, multi-language Hadith search, 99 Names of Allah & classical guidance.
3. Focus Mode & Content Protection: System-wide digital detox, distracting app blocking during prayer, and streak accountability.

Download DeenHub today.`;

  try {
    await Share.share({
      title: 'DeenHub: Masjid & SalahTime',
      message,
    });
  } catch {
    Clipboard.setString(message);
    Alert.alert('Copied to Clipboard', 'DeenHub introduction copied to clipboard.');
  }
}
