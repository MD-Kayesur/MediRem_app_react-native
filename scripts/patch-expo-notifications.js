const fs = require('fs');
const path = require('path');

// 1. Patch TopicSubscriptionModule in expo-notifications
const topicSubscriptionFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-notifications',
  'build',
  'TopicSubscriptionModule.android.js'
);

if (fs.existsSync(topicSubscriptionFile)) {
  const content = `import { requireOptionalNativeModule } from 'expo';

const fallbackModule = {
  addListener: () => {},
  removeListeners: () => {},
  subscribeToTopicAsync: () => Promise.resolve(null),
  unsubscribeFromTopicAsync: () => Promise.resolve(null),
};

export default requireOptionalNativeModule('ExpoTopicSubscriptionModule') ?? fallbackModule;
`;
  fs.writeFileSync(topicSubscriptionFile, content, 'utf8');
  console.log('[patch] Patched TopicSubscriptionModule.android.js');
}

// 2. Patch ExpoApplication in expo-application
const expoApplicationFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-application',
  'build',
  'ExpoApplication.js'
);

if (fs.existsSync(expoApplicationFile)) {
  const content = `import { requireOptionalNativeModule } from 'expo';

const fallback = {
  get applicationName() { return null; },
  get bundleId() { return null; },
  get nativeApplicationVersion() { return null; },
  get nativeBuildVersion() { return null; },
  get androidId() { return null; },
  async getInstallationTimeAsync() { return null; },
};

export default requireOptionalNativeModule('ExpoApplication') ?? fallback;
`;
  fs.writeFileSync(expoApplicationFile, content, 'utf8');
  console.log('[patch] Patched ExpoApplication.js');
}
