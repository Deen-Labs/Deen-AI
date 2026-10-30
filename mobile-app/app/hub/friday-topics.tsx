import React from 'react';
import { Redirect } from 'expo-router';

/**
 * Backwards compatibility redirect for legacy route /hub/friday-topics.
 * Friday Khutbah Topics has migrated to the main bottom tab navigation.
 */
export default function LegacyFridayTopicsRedirect() {
  return <Redirect href="/(tabs)/friday-topics" />;
}
