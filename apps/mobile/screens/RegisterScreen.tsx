import { useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { styles } from '../styles';
import { C } from '../constants/colors';
import { COMUNAS_CHILE } from '../constants/comunas';
import { formatRut } from '../utils/helpers';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/app';

const SEX_OPTIONS = ['Masculino', 'Femenino', 'Prefiero no decir'];

type RegisterForm = {
  firstName: string; lastName: string; email: string; password: string;
  confirmPassword: string; phone: string; rut: string; sex: string; birthYear: string; commune: string;
};

const EMPTY_FORM: RegisterForm = {
  firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
  phone: '', rut: '', sex: '', birthYear: '', commune: '',
};

type Props = { onRegistered: () => void };

export default function RegisterScreen({ onRegistered }: Props) {
  const setScreen = useAppStore((s) => s.setScreen);
  const loading = useAppStore((s) => s.loading);
  const setLoading = useAppStore((s) => s.setLoading);

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<RegisterForm>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSexDropdown, setShowSexDropdown] = useState(false);
  const [showCommuneDropdown, setShowCommuneDropdown] = useState(false);
  const [communeSearch, setCommuneSearch] = useState('');

  const handleStep1 = () => {
    if (!form.firstName.trim()) { Alert.alert('Campo requerido', 'Ingresa tu nombre.'); return; }
    if (!form.lastName.trim()) { Alert.alert('Campo requerido', 'Ingresa tu apellido.'); return; }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { Alert.alert('Email inválido', 'Ingresa un email válido.'); return; }
    if (form.password.length < 6) { Alert.alert('Contraseña muy corta', 'Debe tener al menos 6 caracteres.'); return; }
    if (form.password !== form.confirmPassword) { Alert.alert('Las contraseñas no coinciden', 'Verifica que ambas sean iguales.'); return; }
    setStep(2);
  };

  const handleRegister = async () => {
    if (!form.phone.trim()) { Alert.alert('Campo requerido', 'Ingresa tu teléfono.'); return; }
    if (!form.rut.trim()) { Alert.alert('Campo requerido', 'Ingresa tu RUT.'); return; }
    if (!form.sex) { Alert.alert('Campo requerido', 'Selecciona tu sexo.'); return; }
    const year = parseInt(form.birthYear);
    if (!form.birthYear || isNaN(year) || year < 1920 || year > 2010) { Alert.alert('Año inválido', 'Ingresa un año de nacimiento válido.'); return; }
    if (!form.commune.trim()) { Alert.alert('Campo requerido', 'Ingresa tu comuna.'); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: { data: { full_name: `${form.firstName.trim()} ${form.lastName.trim()}` } },
      });
      if (error) { Alert.alert('Error al crear cuenta', error.message); return; }
      if (data.user) {
        await supabase.from('user_profiles').insert({
          id: data.user.id,
          first_name: form.firstName.trim(), last_name: form.lastName.trim(),
          phone: form.phone.trim(), rut: form.rut.trim(), sex: form.sex,
          birth_year: year, commune: form.commune.trim(),
        });
      }
      if (data.session) {
        setForm(EMPTY_FORM);
        setStep(1);
        onRegistered();
      } else {
        Alert.alert('Revisa tu correo 📬', `Te enviamos un email a ${form.email.trim()} para confirmar tu cuenta.`,
          [{ text: 'Entendido', onPress: () => { setStep(1); setScreen('Login'); } }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.loginWrap, { paddingHorizontal: 22, paddingBottom: 40 }]}>
      <View style={styles.loginBrand}>
        <Text style={styles.loginEmoji}>🐾</Text>
        <Text style={styles.loginTitle}>{step === 1 ? 'Crear cuenta' : 'Tu perfil'}</Text>
        <Text style={styles.loginSubtitle}>{step === 1 ? 'Paso 1 de 2 — Acceso' : 'Paso 2 de 2 — Datos personales'}</Text>
        <View style={styles.registerProgressBar}>
          <View style={[styles.registerProgressFill, { width: step === 1 ? '50%' : '100%' }]} />
        </View>
      </View>

      {step === 1 ? (
        <View style={styles.loginForm}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={[styles.loginInputWrap, { flex: 1 }]}>
              <Text style={styles.loginInputLabel}>Nombre</Text>
              <TextInput value={form.firstName} onChangeText={(v) => setForm(p => ({ ...p, firstName: v }))}
                style={styles.loginInput} placeholder="María" placeholderTextColor={C.textMuted} autoCorrect={false} autoComplete="off" textContentType="none" />
            </View>
            <View style={[styles.loginInputWrap, { flex: 1 }]}>
              <Text style={styles.loginInputLabel}>Apellido</Text>
              <TextInput value={form.lastName} onChangeText={(v) => setForm(p => ({ ...p, lastName: v }))}
                style={styles.loginInput} placeholder="González" placeholderTextColor={C.textMuted} autoCorrect={false} autoComplete="off" textContentType="none" />
            </View>
          </View>
          <View style={styles.loginInputWrap}>
            <Text style={styles.loginInputLabel}>Email</Text>
            <TextInput value={form.email} onChangeText={(v) => setForm(p => ({ ...p, email: v }))}
              style={styles.loginInput} placeholder="tu@email.com" placeholderTextColor={C.textMuted}
              autoCapitalize="none" keyboardType="email-address" autoCorrect={false} />
          </View>
          <View style={styles.loginInputWrap}>
            <Text style={styles.loginInputLabel}>Contraseña</Text>
            <View style={styles.loginPasswordRow}>
              <TextInput value={form.password} onChangeText={(v) => setForm(p => ({ ...p, password: v }))}
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
              <TextInput value={form.confirmPassword} onChangeText={(v) => setForm(p => ({ ...p, confirmPassword: v }))}
                style={[styles.loginInput, { flex: 1, marginBottom: 0 }]} placeholder="Repite tu contraseña"
                placeholderTextColor={C.textMuted} secureTextEntry={!showConfirmPassword} />
              <TouchableOpacity style={styles.passwordEyeBtn} onPress={() => setShowConfirmPassword(v => !v)}>
                <Text style={styles.passwordEyeText}>{showConfirmPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity style={styles.btnPrimary} onPress={handleStep1} activeOpacity={0.85}>
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
            <TextInput value={form.phone} onChangeText={(v) => setForm(p => ({ ...p, phone: v }))}
              style={styles.loginInput} placeholder="+56912345678" placeholderTextColor={C.textMuted}
              keyboardType="phone-pad" autoComplete="off" textContentType="none" />
          </View>
          <View style={styles.loginInputWrap}>
            <Text style={styles.loginInputLabel}>RUT</Text>
            <TextInput value={form.rut} onChangeText={(v) => setForm(p => ({ ...p, rut: formatRut(v) }))}
              style={styles.loginInput} placeholder="12.345.678-9" placeholderTextColor={C.textMuted}
              autoCapitalize="characters" autoCorrect={false} maxLength={12} autoComplete="off" textContentType="none" />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={[styles.loginInputWrap, { flex: 1 }]}>
              <Text style={styles.loginInputLabel}>Año de nacimiento</Text>
              <TextInput value={form.birthYear} onChangeText={(v) => setForm(p => ({ ...p, birthYear: v }))}
                style={styles.loginInput} placeholder="1991" placeholderTextColor={C.textMuted}
                keyboardType="number-pad" maxLength={4} autoComplete="off" textContentType="none" />
            </View>
            <View style={[styles.loginInputWrap, { flex: 1 }]}>
              <Text style={styles.loginInputLabel}>Sexo</Text>
              <TouchableOpacity style={[styles.loginInput, styles.selectInput]} onPress={() => setShowSexDropdown(v => !v)} activeOpacity={0.9}>
                <Text style={[styles.selectInputText, !form.sex && { color: C.textMuted }]}>{form.sex || 'Seleccionar'}</Text>
                <Text style={styles.selectChevron}>{showSexDropdown ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showSexDropdown && (
                <View style={styles.selectMenu}>
                  {SEX_OPTIONS.map(opt => (
                    <TouchableOpacity key={opt} style={[styles.selectOption, form.sex === opt && styles.selectOptionActive]}
                      onPress={() => { setForm(p => ({ ...p, sex: opt })); setShowSexDropdown(false); }}>
                      <Text style={[styles.selectOptionText, form.sex === opt && styles.selectOptionTextActive]}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
          <View style={styles.loginInputWrap}>
            <Text style={styles.loginInputLabel}>Comuna</Text>
            <TouchableOpacity style={[styles.loginInput, styles.selectInput]}
              onPress={() => { setShowCommuneDropdown(v => !v); setCommuneSearch(''); }} activeOpacity={0.9}>
              <Text style={[styles.selectInputText, !form.commune && { color: C.textMuted }]}>{form.commune || 'Seleccionar comuna'}</Text>
              <Text style={styles.selectChevron}>{showCommuneDropdown ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showCommuneDropdown && (
              <View style={[styles.selectMenu, { maxHeight: 220 }]}>
                <TextInput style={[styles.loginInput, { marginBottom: 4 }]} placeholder="Buscar comuna..."
                  placeholderTextColor={C.textMuted} value={communeSearch} onChangeText={setCommuneSearch} autoCorrect={false} />
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 160 }}>
                  {COMUNAS_CHILE.filter(c => c.toLowerCase().includes(communeSearch.toLowerCase())).map(c => (
                    <TouchableOpacity key={c} style={[styles.selectOption, form.commune === c && styles.selectOptionActive]}
                      onPress={() => { setForm(p => ({ ...p, commune: c })); setShowCommuneDropdown(false); setCommuneSearch(''); }}>
                      <Text style={[styles.selectOptionText, form.commune === c && styles.selectOptionTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.btnPrimary} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>{loading ? 'Creando cuenta...' : 'Crear mi cuenta'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 8 }} onPress={() => setStep(1)} activeOpacity={0.85}>
            <Text style={{ color: C.textLight, fontWeight: '600', fontSize: 14 }}>← Volver al paso anterior</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
    </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
