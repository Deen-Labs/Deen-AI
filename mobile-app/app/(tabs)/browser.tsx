/**
 * Browser Tab with Content Protection
 * This demonstrates the NSFW blocking in action
 */

import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { detectNSFWContent, showContentBlockedNotification } from '../../lib/contentProtection';
import { getBlockingSettings } from '../../lib/focus';

export default function BrowserScreen() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [protectionEnabled, setProtectionEnabled] = useState(true);

  const checkProtectionStatus = async () => {
    const settings = await getBlockingSettings();
    setProtectionEnabled(settings.enableNSFWBlocking);
  };

  React.useEffect(() => {
    checkProtectionStatus();
  }, []);

  const handleNavigate = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }

    // Ensure URL has protocol
    let fullUrl = url.trim();
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = 'https://' + fullUrl;
    }

    // Check if NSFW content
    if (protectionEnabled && detectNSFWContent(fullUrl)) {
      showContentBlockedNotification('nsfw');

      // Log the blocked attempt
      Alert.alert(
        '🛡️ BLOCKED BY DEEN AI',
        `This content has been blocked for your protection.\n\nBlocked URL: ${fullUrl}\n\nDEEN AI detected this as inappropriate content and prevented access.`,
        [{ text: 'I Understand', style: 'default' }]
      );

      return;
    }

    // For demo purposes, show success
    setCurrentUrl(fullUrl);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setContent(`✅ Safe to browse: ${fullUrl}\n\nContent Protection is active and monitoring.`);
    }, 1000);
  };


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Protected Browser</Text>
          <Text style={styles.subtitle}>
            Browse safely with DEEN AI protection
          </Text>
        </View>

        {/* Protection Status */}
        <View style={styles.statusBanner}>
          <Text style={styles.statusIcon}>🛡️</Text>
          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>
              {protectionEnabled ? 'Protection Active' : 'Protection Disabled'}
            </Text>
            <Text style={styles.statusText}>
              {protectionEnabled
                ? 'DEEN AI is monitoring and blocking inappropriate content'
                : 'Enable NSFW blocking in Focus tab to activate protection'}
            </Text>
          </View>
        </View>

        {/* Address Bar */}
        <View style={styles.addressBar}>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            onSubmitEditing={handleNavigate}
            placeholder="Enter URL to test the site"
            placeholderTextColor="#94a4a2"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <TouchableOpacity
            style={styles.goButton}
            onPress={handleNavigate}
            disabled={isLoading}
          >
            <Text style={styles.goButtonText}>
              {isLoading ? '...' : 'Go'}
            </Text>
          </TouchableOpacity>
        </View>


        {/* Content Display */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#e2a23b" />
            <Text style={styles.loadingText}>Checking content...</Text>
          </View>
        )}

        {!isLoading && content && (
          <View style={styles.contentContainer}>
            <Text style={styles.contentTitle}>Current Page:</Text>
            <Text style={styles.contentUrl}>{currentUrl}</Text>
            <Text style={styles.contentText}>{content}</Text>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>How It Works</Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>🔍</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>URL Detection</Text>
              <Text style={styles.infoDescription}>
                Scans URLs for NSFW keywords and known inappropriate domains
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>🚫</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Instant Blocking</Text>
              <Text style={styles.infoDescription}>
                Prevents access before any content is loaded
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>⚙️</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Configurable</Text>
              <Text style={styles.infoDescription}>
                Control settings in the Focus tab
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.noteSection}>
          <Text style={styles.noteTitle}>⚠️ Important Note</Text>
          <Text style={styles.noteText}>
            This is a demonstration browser within the DEEN AI app. For system-wide protection (blocking content in Chrome, Safari, etc.), native VPN or Network Extension implementation is required.
          </Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1718',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f3f7f6',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a4a2',
  },
  statusBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(226, 162, 59, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffdda8',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 13,
    color: '#d6e2e0',
    lineHeight: 18,
  },
  addressBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#0b2527',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f3f7f6',
    fontSize: 14,
  },
  goButton: {
    backgroundColor: '#e2a23b',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    minWidth: 60,
  },
  goButtonText: {
    color: '#0f1718',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  testSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffdda8',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  testNote: {
    fontSize: 13,
    color: '#94a4a2',
    marginBottom: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  testButtonSafe: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  testButtonBlocked: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderColor: 'rgba(244, 67, 54, 0.3)',
  },
  testButtonIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  testButtonContent: {
    flex: 1,
  },
  testButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f3f7f6',
    marginBottom: 2,
  },
  testButtonUrl: {
    fontSize: 12,
    color: '#94a4a2',
  },
  testButtonStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a4a2',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94a4a2',
  },
  contentContainer: {
    backgroundColor: '#0b2527',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  contentTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffdda8',
    marginBottom: 8,
  },
  contentUrl: {
    fontSize: 12,
    color: '#e2a23b',
    marginBottom: 12,
  },
  contentText: {
    fontSize: 14,
    color: '#d6e2e0',
    lineHeight: 20,
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#0b2527',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
    width: 40,
    textAlign: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f3f7f6',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 13,
    color: '#94a4a2',
    lineHeight: 18,
  },
  noteSection: {
    backgroundColor: 'rgba(226, 162, 59, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffdda8',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 13,
    color: '#d6e2e0',
    lineHeight: 20,
  },
});
