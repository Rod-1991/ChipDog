import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { styles } from '../styles';
import { C } from '../constants/colors';
import { COMUNAS_CHILE } from '../constants/comunas';
import { formatRut } from '../utils/helpers';
import type { Screen } from '../types';

const SEX_OPTIONS = ['Masculino', 'Femenino', 'Prefiero no decir'];

type RegisterForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  rut: string;
  sex: string;
  birthYear: string;
  commune: string;
};

type RegisterScreenProps = {
  registerStep: 1 | 2;
  setRegisterStep: (s: 1 | 2) => void;
  registerForm: RegisterForm;
  setRegisterForm: (fn: (p: RegisterForm) => RegisterForm) => void;
  showPassword: boolean;
  setShowPassword: (fn: (v: boolean) => boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (fn: (v: boolean) => boolean) => void;
  showSexDropdown: boolean;
  setShowSexDropdown: (fn: (v: boolean) => boolean) => void;
  showRegisterCommuneDropdown: boolean;
  setShowRegisterCommuneDropdown: (fn: (v: boolean) => boolean) => void;
  registerCommuneSearch: string;
  setRegisterCommuneSearch: (v: string) => void;
  loading: boolean;
  handleRegisterStep1: () => void;
  handleRegister: () => void;
  setScreen: (s: Screen) => void;
};

export default function RegisterScreen({
  registerStep, setRegisterStep, registerForm, setRegisterForm,
  showPassword, setShowPassword, showConfirmPassword, setShowConfirmPassword,
  showSexDropdown, setShowSexDropdown, showRegisterCommuneDropdown, setShowRegisterCommuneDropdown,
  registerCommuneSearch, setRegisterCommuneSearch, loading,
  handleRegisterStep1, handleRegister, setScreen,
}: RegisterScreenProps) {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.loginWrap, { paddingHorizontal: 22, paddingBottom: 40 }]}>
      {/* Brand + paso */}
      <View style={styles.loginBrand}>
        <Text style={styles.loginEmoji}>🐾</Text>
        <Text style={styles.loginTitle}>{registerStep === 1 ? 'Crear cuenta' : 'Tu perfil'}</Text>
        <Text style={styles.loginSubtitle}>{registerStep === 1 ? 'Paso 1 de 2 — Acceso' : 'Paso 2 de 2 — Datos personales'}</Text>
        {/* Barra de progreso */}
        <View style={styles.registerProgressBar}>
          <View style={[styles.registerProgressFill, { width: registerStep === 1 ? '50%' : '100%' }]} />
        </View>
      </View>

      {registerStep === 1 ? (
        <View style={styles.loginForm}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={[styles.loginInputWrap, { flex: 1 }]}>
              <Text style={styles.loginInputLabel}>Nombre</Text>
              <TextInput value={registerForm.firstName} onChangeText={(v) => setRegisterForm(p => ({ ...p, firstName: v }))}
                style={styles.loginInput} placeholder="Rodrigo" placeholderTextColor={C.textMuted} autoCorrect={false} autoComplete="off" textContentType="none" />
            </View>
            <View style={[styles.loginInputWrap, { flex: 1 }]}>
              <Text style={styles.loginInputLabel}>Apellido</Text>
              <TextInput value={registerForm.lastName} onChangeText={(v) => setRegisterForm(p => ({ ...p, lastName: v }))}
                style={styles.loginInput} placeholder="Arriagada" placeholderTextColor={C.textMuted} autoCorrect={false} autoComplete="off" textContentType="none" />
            </View>
          </View>

          <View style={styles.loginInputWrap}>
            <Text style={styles.loginInputLabel}>Email</Text>
            <TextInput value={registerForm.email} onChangeText={(v) => setRegisterForm(p => ({ ...p, email: v }))}
              style={styles.loginInput} placeholder="tu@email.com" placeholderTextColor={C.textMuted}
              autoCapitalize="none" keyboardType="email-address" autoCorrect={false} />
          </View>

          <View style={styles.loginInputWrap}>
            <Text style={styles.loginInputLabel}>Contraseña</Text>
            <View style={styles.loginPasswordRow}>
              <TextInput value={registerForm.password} onChangeText={(v) => setRegisterForm(p => ({ ...p, password: v }))}
                style={[styles.loginInput, { flex: 1, marginBottom: 0 }]} placeholder="Mínimo 6 caracteres"
                placeholderTextColor={C.textMuted} secureTextEntry={!showPassword} />
              <TouchableOpacity style={styles.passwordEyeBtn} onPress={() => setShowPassword(v => !v)}>
                <Text style={styles.passwordEyeText}>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.loginInputWrap}>
            <Text style={styles.loginInputLabel}>Confirmar contraseña</Text>
            <View style={styles.loginPasswordRow}>
              <TextInput value={registerForm.confirmPassword} onChangeText={(v) => setRegisterForm(p => ({ ...p, confirmPassword: v }))}
                style={[styles.loginInput, { flex: 1, marginBottom: 0 }]} placeholder="Repite tu contraseña"
                placeholderTextColor={C.textMuted} secureTextEntry={!showConfirmPassword} />
              <TouchableOpacity style={styles.passwordEyeBtn} onPress={() => setShowConfirmPassword(v => !v)}>
                <Text style={styles.passwordEyeText}>{showConfirmPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={handleRegisterStep1} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>Continuar →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 8 }} onPress={() => setScreen('Login')} activeOpacity={0.85}>
            <Text style={{ color: C.textLight, fontWeight: '600', fontSize: 14 }}>¿Ya tienes cuenta? Inicia sesión</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.loginForm}>
          <View style={styles.loginInputWrap}>
            <Text style={styles.loginInputLabel}>Teléfono</Text>
            <TextInput value={registerForm.phone} onChangeText={(v) => setRegisterForm(p => ({ ...p, phone: v }))}
              style={styles.loginInput} placeholder="+56912345678" placeholderTextColor={C.textMuted}
              keyboardType="phone-pad" autoComplete="off" textContentType="none" />
          </View>

          <View style={styles.loginInputWrap}>
            <Text style={styles.loginInputLabel}>RUT</Text>
            <TextInput
              value={registerForm.rut}
              onChangeText={(v) => setRegisterForm(p => ({ ...p, rut: formatRut(v) }))}
              style={styles.loginInput} placeholder="12.345.678-9" placeholderTextColor={C.textMuted}
              autoCapitalize="characters" autoCorrect={false} maxLength={12} autoComplete="off" textContentType="none" />
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={[styles.loginInputWrap, { flex: 1 }]}>
              <Text style={styles.loginInputLabel}>Año de nacimiento</Text>
              <TextInput value={registerForm.birthYear} onChangeText={(v) => setRegisterForm(p => ({ ...p, birthYear: v }))}
                style={styles.loginInput} placeholder="1991" placeholderTextColor={C.textMuted}
                keyboardType="number-pad" maxLength={4} autoComplete="off" textContentType="none" />
            </View>
            <View style={[styles.loginInputWrap, { flex: 1 }]}>
              <Text style={styles.loginInputLabel}>Sexo</Text>
              <TouchableOpacity
                style={[styles.loginInput, styles.selectInput]}
                onPress={() => setShowSexDropdown(v => !v)}
                activeOpacity={0.9}
              >
                <Text style={[styles.selectInputText, !registerForm.sex && { color: C.textMuted }]}>
                  {registerForm.sex || 'Seleccionar'}
                </Text>
                <Text style={styles.selectChevron}>{showSexDropdown ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showSexDropdown && (
                <View style={styles.selectMenu}>
                  {SEX_OPTIONS.map(opt => (
                    <TouchableOpacity key={opt} style={[styles.selectOption, registerForm.sex === opt && styles.selectOptionActive]}
                      onPress={() => { setRegisterForm(p => ({ ...p, sex: opt })); setShowSexDropdown(() => false); }}>
                      <Text style={[styles.selectOptionText, registerForm.sex === opt && styles.selectOptionTextActive]}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={styles.loginInputWrap}>
            <Text style={styles.loginInputLabel}>Comuna</Text>
            <TouchableOpacity style={[styles.loginInput, styles.selectInput]}
              onPress={() => { setShowRegisterCommuneDropdown(v => !v); setRegisterCommuneSearch(''); }} activeOpacity={0.9}>
              <Text style={[styles.selectInputText, !registerForm.commune && { color: C.textMuted }]}>
                {registerForm.commune || 'Seleccionar comuna'}
              </Text>
              <Text style={styles.selectChevron}>{showRegisterCommuneDropdown ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showRegisterCommuneDropdown && (
              <View style={[styles.selectMenu, { maxHeight: 220 }]}>
                <TextInput
                  style={[styles.loginInput, { marginBottom: 4 }]}
                  placeholder="Buscar comuna..."
                  placeholderTextColor={C.textMuted}
                  value={registerCommuneSearch}
                  onChangeText={setRegisterCommuneSearch}
                  autoCorrect={false}
                />
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 160 }}>
                  {COMUNAS_CHILE.filter(c => c.toLowerCase().includes(registerCommuneSearch.toLowerCase())).map(c => (
                    <TouchableOpacity key={c} style={[styles.selectOption, registerForm.commune === c && styles.selectOptionActive]}
                      onPress={() => { setRegisterForm(p => ({ ...p, commune: c })); setShowRegisterCommuneDropdown(() => false); setRegisterCommuneSearch(''); }}>
                      <Text style={[styles.selectOptionText, registerForm.commune === c && styles.selectOptionTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>{loading ? 'Creando cuenta...' : 'Crear mi cuenta'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 8 }} onPress={() => setRegisterStep(1)} activeOpacity={0.85}>
            <Text style={{ color: C.textLight, fontWeight: '600', fontSize: 14 }}>← Volver al paso anterior</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
    </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
