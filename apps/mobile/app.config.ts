import "dotenv/config";
import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'ChipDog',
  slug: 'chipdog-mobile',
  owner: 'rod.arriagada',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: 'com.chipdog.app',
    supportsTablet: false,
    infoPlist: {
      UIBackgroundModes: ['remote-notification']
    }
  },
  plugins: [
    'expo-notifications'
  ],
  extra: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    eas: {
      projectId: 'f824aecc-b54f-49e8-85a7-68feb3e64b25'
    }
  }
};

export default config;
