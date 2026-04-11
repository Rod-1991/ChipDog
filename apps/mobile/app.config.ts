import "dotenv/config";
import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'ChipDog',
  slug: 'chipdog-mobile',
  owner: 'rod.arriagada',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  icon: './assets/icon.png',
  splash: {
    image: './assets/icon.png',
    resizeMode: 'contain',
    backgroundColor: '#6C47FF',
  },
  ios: {
    bundleIdentifier: 'com.chipdog.app',
    supportsTablet: false,
    entitlements: {
      'com.apple.developer.nfc.readersession.formats': ['TAG']
    },
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
      NSLocationWhenInUseUsageDescription: 'ChipDog necesita tu ubicación para marcar dónde se perdió tu mascota.',
      NSLocationAlwaysAndWhenInUseUsageDescription: 'ChipDog necesita tu ubicación para marcar dónde se perdió tu mascota.',
      NSCameraUsageDescription: 'ChipDog usa la cámara para escanear códigos QR de tags de mascotas.',
      NFCReaderUsageDescription: 'ChipDog usa NFC para vincular y leer tags de mascotas.'
    }
  },
  plugins: [
    'expo-notifications',
    'expo-location',
    'expo-camera',
    ['react-native-nfc-manager', { nfcPermission: 'ChipDog necesita NFC para vincular tags a tu mascota.', includeNdefEntitlement: false }]
  ],
  extra: {
    supabaseUrl: process.env.SUPABASE_URL ?? 'https://kcowhlsfbuixvdjhrikl.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? 'sb_publishable_wVtif8m5qtuzbqmB0h3XJQ_mtRJwc_7',
    eas: {
      projectId: 'f824aecc-b54f-49e8-85a7-68feb3e64b25'
    }
  }
};

export default config;
