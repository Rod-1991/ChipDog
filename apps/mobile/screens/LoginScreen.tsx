import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { C } from '../constants/colors';
import type { Screen } from '../types';

type LoginScreenProps = {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  loading: boolean;
  showPassword: boolean;
  setShowPassword: (fn: (v: boolean) => boolean) => void;
  handleLogin: () => void;
  setScreen: (s: Screen) => void;
};

export default function LoginScreen({
  email, setEmail, password, setPassword, loading,
  showPassword, setShowPassword, handleLogin, setScreen,
}: LoginScreenProps) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>

      {/* Header */}
      <View style={{
        backgroundColor: C.primaryDark,
        paddingTop: 60, paddingBottom: 52, paddingHorizontal: 28,
        alignItems: 'center',
        borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
      }}>
        <Text style={{ fontSize: 50, marginBottom: 10 }}>🐾</Text>
        <Text style={{ fontSize: 36, fontWeight: '900', letterSpacing: -1 }}>
          <Text style={{ color: C.white }}>Chip</Text>
          <Text style={{ color: C.dark }}>Dog</Text>
        </Text>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '700', marginTop: 5 }}>
          El hogar digital de tus mascotas
        </Text>
      </View>

      {/* Form */}
      <View style={{ paddingHorizontal: 22, paddingTop: 26 }}>

        <Text style={{ fontSize: 13, fontWeight: '800', color: C.dark, marginBottom: 6 }}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          style={{
            height: 52, borderWidth: 1.5, borderColor: C.border, borderRadius: 16,
            backgroundColor: C.white, paddingHorizontal: 18, fontSize: 15,
            color: C.dark, marginBottom: 14,
          }}
          placeholder="tu@email.com"
          placeholderTextColor="#B2DED9"
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
        />

        <Text style={{ fontSize: 13, fontWeight: '800', color: C.dark, marginBottom: 6 }}>Contraseña</Text>
        <View style={{ position: 'relative', marginBottom: 14 }}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            style={{
              height: 52, borderWidth: 1.5, borderColor: C.border, borderRadius: 16,
              backgroundColor: C.white, paddingHorizontal: 18, paddingRight: 48,
              fontSize: 15, color: C.dark,
            }}
            placeholder="••••••••"
            placeholderTextColor="#B2DED9"
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={{ position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center' }}
            onPress={() => setShowPassword(v => !v)}
          >
            <Text style={{ fontSize: 18 }}>{showPassword ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={{
            height: 52, backgroundColor: C.primaryDark, borderRadius: 16,
            alignItems: 'center', justifyContent: 'center', marginBottom: 12,
          }}
          onPress={handleLogin} disabled={loading} activeOpacity={0.85}
        >
          <Text style={{ color: C.white, fontSize: 16, fontWeight: '900' }}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4, marginBottom: 12 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#B2DED9' }}>¿No tienes cuenta?</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
        </View>

        <TouchableOpacity
          style={{
            height: 52, backgroundColor: C.white, borderWidth: 1.5,
            borderColor: C.primaryDark, borderRadius: 16,
            alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}
          onPress={() => setScreen('Register')} activeOpacity={0.85}
        >
          <Text style={{ color: C.primaryDark, fontSize: 16, fontWeight: '900' }}>Crear cuenta gratis</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 8 }} onPress={() => setScreen('FoundTag')} activeOpacity={0.85}>
          <Text style={{ color: C.primaryDark, fontWeight: '700', fontSize: 13 }}>🔍  Encontré una mascota</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}
