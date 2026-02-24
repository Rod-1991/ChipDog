import 'dotenv/config';
import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'chipdog-mobile',
  slug: 'chipdog-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  extra: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY
  }
};

export default config;
