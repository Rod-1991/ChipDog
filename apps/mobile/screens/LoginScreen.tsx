import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
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
    <View style={styles.loginWrap}>
      {/* Brand */}
      <View style={styles.loginBrand}>
        <Text style={styles.loginEmoji}>🐾</Text>
        <Text style={styles.loginTitle}>ChipDog</Text>
        <Text style={styles.loginSubtitle}>El hogar digital de tus mascotas</Text>
      </View>

      {/* Form */}
      <View style={styles.loginForm}>
        <View style={styles.loginInputWrap}>
          <Text style={styles.loginInputLabel}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.loginInput}
            placeholder="tu@email.com"
            placeholderTextColor={C.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
        </View>
        <View style={styles.loginInputWrap}>
          <Text style={styles.loginInputLabel}>Contraseña</Text>
          <View style={styles.loginPasswordRow}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              style={[styles.loginInput, { flex: 1, marginBottom: 0 }]}
              placeholder="••••••••"
              placeholderTextColor={C.textMuted}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity style={styles.passwordEyeBtn} onPress={() => setShowPassword(v => !v)}>
              <Text style={styles.passwordEyeText}>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
          <Text style={styles.btnPrimaryText}>{loading ? 'Ingresando...' : 'Ingresar'}</Text>
        </TouchableOpacity>

        <View style={styles.loginDivider}>
          <View style={styles.loginDividerLine} />
          <Text style={styles.loginDividerText}>¿No tienes cuenta?</Text>
          <View style={styles.loginDividerLine} />
        </View>

        <TouchableOpacity style={styles.btnOutline} onPress={() => setScreen('Register')} activeOpacity={0.85}>
          <Text style={styles.btnOutlineText}>Crear cuenta gratis</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 8 }} onPress={() => setScreen('FoundTag')} activeOpacity={0.85}>
          <Text style={{ color: C.textLight, fontWeight: '600', fontSize: 14 }}>🔍  Encontré una mascota</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
