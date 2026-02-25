import "dotenv/config";
import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'chipdog-mobile',
  slug: 'chipdog-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  // include web so `expo start --web` works; mobile will ignore web at runtime
  platforms: ['ios', 'android', 'web'],
  extra: {
    // Prefer EXPO_PUBLIC_ env vars for web, fall back to legacy names for native
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
    supabaseAnonKey:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
  }
};

export default config;
