import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { styles } from '../styles';
import { C } from '../constants/colors';
import { COMUNAS_CHILE } from '../constants/comunas';
import { formatRut } from '../utils/helpers';
import type { Pet, PetMemberInvitation, Screen, UserProfile } from '../types';

const SEX_OPTIONS = ['Masculino', 'Femenino', 'Prefiero no decir'];

type ProfileDraft = Omit<UserProfile, 'id'>;

type ProfileScreenProps = {
  loading: boolean;
  profileDraft: ProfileDraft;
  setProfileDraft: (fn: (p: ProfileDraft) => ProfileDraft) => void;
  isEditingProfile: boolean;
  setIsEditingProfile: (v: boolean) => void;
  showProfileSexDropdown: boolean;
  setShowProfileSexDropdown: (fn: (v: boolean) => boolean) => void;
  showProfileCommuneDropdown: boolean;
  setShowProfileCommuneDropdown: (fn: (v: boolean) => boolean) => void;
  communeSearch: string;
  setCommuneSearch: (v: string) => void;
  pendingInvitations: PetMemberInvitation[];
  respondInvitation: (memberId: number, accept: boolean) => void;
  saveUserProfile: () => void;
  handleLogout: () => void;
  pets: Pet[];
  userEmail: string | null;
  setScreen: (s: Screen) => void;
};

export default function ProfileScreen({
  loading, profileDraft, setProfileDraft, isEditingProfile, setIsEditingProfile,
  showProfileSexDropdown, setShowProfileSexDropdown,
  showProfileCommuneDropdown, setShowProfileCommuneDropdown,
  communeSearch, setCommuneSearch, pendingInvitations,
  respondInvitation, saveUserProfile, handleLogout,
  pets, userEmail, setScreen,
}: ProfileScreenProps) {
  const [tagCount, setTagCount] = useState(0);

  useEffect(() => {
    (async () => {
      const petIds = pets.map(p => p.id);
      if (!petIds.length) { setTagCount(0); return; }
      const { data } = await supabase
        .from('tags')
        .select('pet_id')
        .in('pet_id', petIds)
        .eq('status', 'linked');
      const unique = new Set((data ?? []).map(t => t.pet_id)).size;
      setTagCount(unique);
    })();
  }, [pets]);

  const initials =
    (profileDraft.first_name?.[0] ?? '').toUpperCase() +
    (profileDraft.last_name?.[0] ?? '').toUpperCase() || '?';

  const fullName = `${profileDraft.first_name} ${profileDraft.last_name}`.trim() || 'Sin nombre';
  const lostCount = pets.filter(p => p.is_lost).length;

  // ── MODO EDICIÓN (pantalla completa) ─────────────────────────────────────
  if (isEditingProfile) {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={{ backgroundColor: C.primaryDark, paddingTop: 56, paddingBottom: 16,
          paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => { setIsEditingProfile(false); setShowProfileSexDropdown(() => false); }}
            activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ fontSize: 22, color: C.white, lineHeight: 26 }}>‹</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '900', color: C.white, flex: 1 }}>Editar perfil</Text>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}>

          {/* Datos personales */}
          <View style={{ backgroundColor: C.white, borderRadius: 20, padding: 16,
            borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: C.primary,
              textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Datos personales</Text>

            <Text style={styles.fieldLabel}>Nombre</Text>
            <TextInput style={styles.input} value={profileDraft.first_name}
              onChangeText={(v) => setProfileDraft(p => ({ ...p, first_name: v }))}
              placeholder="Nombre" placeholderTextColor={C.textMuted}
              autoCorrect={false} autoComplete="off" textContentType="none" />

            <Text style={styles.fieldLabel}>Apellido</Text>
            <TextInput style={styles.input} value={profileDraft.last_name}
              onChangeText={(v) => setProfileDraft(p => ({ ...p, last_name: v }))}
              placeholder="Apellido" placeholderTextColor={C.textMuted}
              autoCorrect={false} autoComplete="off" textContentType="none" />

            <Text style={styles.fieldLabel}>Teléfono</Text>
            <TextInput style={styles.input} value={profileDraft.phone}
              onChangeText={(v) => setProfileDraft(p => ({ ...p, phone: v }))}
              placeholder="+56912345678" placeholderTextColor={C.textMuted}
              keyboardType="phone-pad" autoComplete="off" textContentType="none" />

            <Text style={styles.fieldLabel}>RUT</Text>
            <TextInput style={styles.input} value={profileDraft.rut}
              onChangeText={(v) => setProfileDraft(p => ({ ...p, rut: formatRut(v) }))}
              placeholder="12.345.678-9" placeholderTextColor={C.textMuted}
              autoCapitalize="characters" autoCorrect={false} maxLength={12}
              autoComplete="off" textContentType="none" />

            <Text style={styles.fieldLabel}>Año de nacimiento</Text>
            <TextInput style={styles.input}
              value={profileDraft.birth_year ? String(profileDraft.birth_year) : ''}
              onChangeText={(v) => setProfileDraft(p => ({ ...p, birth_year: parseInt(v) || 0 }))}
              placeholder="1991" placeholderTextColor={C.textMuted}
              keyboardType="number-pad" maxLength={4}
              autoComplete="off" textContentType="none" />

            <Text style={styles.fieldLabel}>Sexo</Text>
            <TouchableOpacity style={[styles.input, styles.selectInput]}
              onPress={() => setShowProfileSexDropdown(v => !v)} activeOpacity={0.9}>
              <Text style={[styles.selectInputText, !profileDraft.sex && { color: C.textMuted }]}>
                {profileDraft.sex || 'Seleccionar'}
              </Text>
              <Text style={styles.selectChevron}>{showProfileSexDropdown ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showProfileSexDropdown && (
              <View style={styles.selectMenu}>
                {SEX_OPTIONS.map(opt => (
                  <TouchableOpacity key={opt}
                    style={[styles.selectOption, profileDraft.sex === opt && styles.selectOptionActive]}
                    onPress={() => { setProfileDraft(p => ({ ...p, sex: opt })); setShowProfileSexDropdown(() => false); }}>
                    <Text style={[styles.selectOptionText, profileDraft.sex === opt && styles.selectOptionTextActive]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.fieldLabel}>Comuna</Text>
            <TouchableOpacity style={[styles.input, styles.selectInput]}
              onPress={() => { setShowProfileCommuneDropdown(v => !v); setCommuneSearch(''); }} activeOpacity={0.9}>
              <Text style={[styles.selectInputText, !profileDraft.commune && { color: C.textMuted }]}>
                {profileDraft.commune || 'Seleccionar comuna'}
              </Text>
              <Text style={styles.selectChevron}>{showProfileCommuneDropdown ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showProfileCommuneDropdown && (
              <View style={[styles.selectMenu, { maxHeight: 200 }]}>
                <TextInput style={[styles.input, { marginBottom: 4 }]}
                  placeholder="Buscar comuna..." placeholderTextColor={C.textMuted}
                  value={communeSearch} onChangeText={setCommuneSearch} autoCorrect={false} />
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 150 }}>
                  {COMUNAS_CHILE.filter(c => c.toLowerCase().includes(communeSearch.toLowerCase())).map(c => (
                    <TouchableOpacity key={c}
                      style={[styles.selectOption, profileDraft.commune === c && styles.selectOptionActive]}
                      onPress={() => { setProfileDraft(p => ({ ...p, commune: c })); setShowProfileCommuneDropdown(() => false); setCommuneSearch(''); }}>
                      <Text style={[styles.selectOptionText, profileDraft.commune === c && styles.selectOptionTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={saveUserProfile} disabled={loading} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>{loading ? 'Guardando...' : 'Guardar cambios'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnGhost}
            onPress={() => { setIsEditingProfile(false); setShowProfileSexDropdown(() => false); }} activeOpacity={0.7}>
            <Text style={styles.btnGhostText}>Cancelar</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── VISTA NORMAL ─────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Header */}
        <View style={{ backgroundColor: C.primaryDark, paddingTop: 56, paddingBottom: 52,
          paddingHorizontal: 20, borderBottomLeftRadius: 34, borderBottomRightRadius: 34 }}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: C.white }}>Mi Perfil</Text>
          <TouchableOpacity
            onPress={() => setIsEditingProfile(true)}
            style={{ position: 'absolute', top: 54, right: 20,
              backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12,
              paddingHorizontal: 16, paddingVertical: 7 }}
            activeOpacity={0.8}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: C.white }}>Editar</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={{ alignItems: 'center', marginTop: -38 }}>
          <View style={{ width: 76, height: 76, borderRadius: 38,
            backgroundColor: C.white, borderWidth: 4, borderColor: C.primaryDark,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: C.primaryDark, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12,
            elevation: 8 }}>
            <Text style={{ fontSize: 24, fontWeight: '900', color: C.primaryDark }}>{initials}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 18 }}>
          {/* Nombre y comuna */}
          <Text style={{ textAlign: 'center', fontSize: 22, fontWeight: '900',
            color: C.dark, marginTop: 10 }}>{fullName}</Text>
          {profileDraft.commune ? (
            <Text style={{ textAlign: 'center', fontSize: 13, color: C.primary,
              fontWeight: '700', marginTop: 4 }}>{profileDraft.commune}</Text>
          ) : null}

          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 14 }}>
            {[
              { val: pets.length,  label: 'Mascotas' },
              { val: tagCount,     label: 'Con tag' },
              { val: lostCount,    label: 'Perdidos' },
            ].map(s => (
              <View key={s.label} style={{ flex: 1, backgroundColor: C.white, borderRadius: 18,
                padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: C.dark }}>{s.val}</Text>
                <Text style={{ fontSize: 10, color: C.primary, fontWeight: '700',
                  marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Datos personales */}
          {loading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 20 }} />
          ) : (
            <View style={{ backgroundColor: C.white, borderRadius: 22,
              borderWidth: 1, borderColor: C.border, marginBottom: 12, overflow: 'hidden' }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: C.primary,
                textTransform: 'uppercase', letterSpacing: 1,
                paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10,
                borderBottomWidth: 1, borderBottomColor: C.border }}>Datos personales</Text>
              {[
                { label: 'Teléfono', val: profileDraft.phone },
                { label: 'RUT',     val: profileDraft.rut },
                { label: 'Año nacim.', val: profileDraft.birth_year ? String(profileDraft.birth_year) : null },
                { label: 'Sexo',    val: profileDraft.sex },
                { label: 'Comuna',  val: profileDraft.commune },
              ].map((row, i, arr) => (
                <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center',
                  justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12,
                  borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: C.border }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: C.primary,
                    textTransform: 'uppercase', letterSpacing: 0.5 }}>{row.label}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: row.val ? C.dark : C.textMuted }}>
                    {row.val || '—'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Cuenta */}
          <View style={{ backgroundColor: C.white, borderRadius: 22, padding: 16,
            paddingHorizontal: 18, borderWidth: 1, borderColor: C.border,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: C.dark }}>{userEmail ?? '—'}</Text>
              <Text style={{ fontSize: 11, color: C.primary, fontWeight: '700', marginTop: 3 }}>Cuenta verificada</Text>
            </View>
            <View style={{ backgroundColor: C.primaryLight, borderRadius: 10,
              paddingHorizontal: 14, paddingVertical: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: C.primaryDark }}>Activa</Text>
            </View>
          </View>

          {/* Invitaciones pendientes */}
          {pendingInvitations.length > 0 && (
            <View style={{ backgroundColor: C.white, borderRadius: 22,
              borderWidth: 1, borderColor: '#FFE0A3', marginBottom: 12, overflow: 'hidden' }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: C.warning,
                textTransform: 'uppercase', letterSpacing: 1,
                paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10,
                borderBottomWidth: 1, borderBottomColor: C.border }}>
                Invitaciones ({pendingInvitations.length})
              </Text>
              <View style={{ padding: 16, gap: 12 }}>
                {pendingInvitations.map(inv => (
                  <View key={inv.id}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <Text style={{ fontSize: 24 }}>{inv.pet_species === 'cat' ? '🐱' : '🐶'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: C.dark, fontWeight: '700', fontSize: 14 }}>{inv.pet_name}</Text>
                        <Text style={{ color: C.textMuted, fontSize: 12 }}>
                          Invitación de {inv.invited_by_name || inv.invited_email}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity style={[styles.btnPrimary, { flex: 1, paddingVertical: 10 }]}
                        onPress={() => respondInvitation(inv.id, true)} disabled={loading} activeOpacity={0.85}>
                        <Text style={styles.btnPrimaryText}>Aceptar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.btnGhost, { flex: 1, paddingVertical: 10 }]}
                        onPress={() => respondInvitation(inv.id, false)} disabled={loading} activeOpacity={0.7}>
                        <Text style={styles.btnGhostText}>Rechazar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Cerrar sesión */}
          <TouchableOpacity onPress={handleLogout} activeOpacity={0.7}
            style={{ alignItems: 'center', paddingVertical: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.textMuted }}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Navbar */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border,
        flexDirection: 'row', justifyContent: 'space-around',
        paddingVertical: 10, paddingBottom: 24 }}>
        {[
          { icon: '🏠', label: 'Inicio',    target: 'Home' as Screen },
          { icon: '🐾', label: 'Mascotas',  target: 'PetList' as Screen },
          { icon: '🗺️', label: 'Mapa',      target: 'NearbyMap' as Screen },
          { icon: '👤', label: 'Perfil',    target: 'Profile' as Screen },
        ].map(tab => (
          <TouchableOpacity key={tab.label} style={{ alignItems: 'center', gap: 3 }}
            activeOpacity={0.7} onPress={() => setScreen(tab.target)}>
            <Text style={{ fontSize: 20 }}>{tab.icon}</Text>
            <Text style={{ fontSize: 9, fontWeight: '800',
              color: tab.target === 'Profile' ? C.primary : C.textMuted }}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
