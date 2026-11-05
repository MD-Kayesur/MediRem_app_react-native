import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Root Chat route redirects directly into the Tab-enabled Chat screen (/(tabs)/chat)
 * so the bottom navigation tab bar is always preserved.
 */
export default function RootChatRedirect() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/(tabs)/chat', params }} />;
}
