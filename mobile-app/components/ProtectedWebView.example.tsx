/**
 * Example: Protected WebView Component
 * 
 * This example shows how to integrate content protection
 * into a WebView component to block NSFW content.
 * 
 * Usage:
 * import ProtectedWebView from './components/ProtectedWebView';
 * 
 * <ProtectedWebView 
 *   uri="https://example.com"
 *   onBlocked={(url) => console.log('Blocked:', url)}
 * />
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { useContentProtection } from '../lib/useContentProtection';

interface ProtectedWebViewProps {
  uri: string;
  onBlocked?: (url: string) => void;
}

export default function ProtectedWebView({ uri, onBlocked }: ProtectedWebViewProps) {
  const [currentUrl, setCurrentUrl] = useState(uri);
  const [isLoading, setIsLoading] = useState(true);
  const { isEnabled, checkURL, isNSFW, showBlockedNotification } = useContentProtection();

  // Check if URL should be blocked before navigation
  const handleNavigationStateChange = async (navState: any) => {
    const url = navState.url;
    
    if (isEnabled && isNSFW(url)) {
      // Block the navigation
      showBlockedNotification('nsfw');
      onBlocked?.(url);
      
      // Navigate back to safe page
      return false; // Prevent navigation
    }
    
    setCurrentUrl(url);
    return true; // Allow navigation
  };

  // Intercept requests at the WebView level
  const handleShouldStartLoadWithRequest = (request: any) => {
    const url = request.url;
    
    if (isEnabled && isNSFW(url)) {
      showBlockedNotification('nsfw');
      onBlocked?.(url);
      return false; // Block the request
    }
    
    return true; // Allow the request
  };

  return (
    <View style={styles.container}>
      {isEnabled && (
        <View style={styles.protectionBanner}>
          <Text style={styles.protectionText}>🛡️ Protected by DEEN AI</Text>
        </View>
      )}
      
      <WebView
        source={{ uri: currentUrl }}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#e2a23b" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1718',
  },
  protectionBanner: {
    backgroundColor: 'rgba(226, 162, 59, 0.2)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 162, 59, 0.3)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  protectionText: {
    fontSize: 12,
    color: '#ffdda8',
    fontWeight: '600',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f1718',
  },
});


/**
 * Example: Browser Screen with Content Protection
 */

import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  Text, 
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import ProtectedWebView from '../components/ProtectedWebView';
import { useContentProtection } from '../lib/useContentProtection';

export function BrowserScreen() {
  const [url, setUrl] = useState('https://www.google.com');
  const [currentUrl, setCurrentUrl] = useState('https://www.google.com');
  const { isEnabled, isNSFW } = useContentProtection();

  const handleGo = () => {
    if (isNSFW(url)) {
      Alert.alert(
        '🛡️ Blocked by DEEN AI',
        'This website has been identified as inappropriate content.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setCurrentUrl(url);
  };

  const handleBlocked = (blockedUrl: string) => {
    console.log('Content blocked:', blockedUrl);
    // Optionally log to analytics or reporting system
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={url}
          onChangeText={setUrl}
          onSubmitEditing={handleGo}
          placeholder="Enter URL or search..."
          placeholderTextColor="#94a4a2"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <TouchableOpacity style={styles.goButton} onPress={handleGo}>
          <Text style={styles.goButtonText}>Go</Text>
        </TouchableOpacity>
      </View>

      <ProtectedWebView 
        uri={currentUrl} 
        onBlocked={handleBlocked}
      />
    </SafeAreaView>
  );
}

const browserStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1718',
  },
  searchBar: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#0b2527',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#0c3033',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#f3f7f6',
    fontSize: 14,
    marginRight: 8,
  },
  goButton: {
    backgroundColor: '#e2a23b',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  goButtonText: {
    color: '#0f1718',
    fontWeight: '700',
    fontSize: 14,
  },
});
