import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Support Screen redirects directly to the Tab-enabled Chat screen (/(tabs)/chat)
 * so the bottom navigation tab bar is always preserved.
 */
export default function SupportRedirect() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/(tabs)/chat', params }} />;
}
