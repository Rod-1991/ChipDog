import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import { C } from '../constants/colors';
import { COMUNAS_CHILE } from '../constants/comunas';
import { formatRut } from '../utils/helpers';
import Card from '../components/Card';
import InfoRow from '../components/InfoRow';
import type { PetMemberInvitation, UserProfile } from '../types';

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
};

export default function ProfileScreen({
  loading, profileDraft, setProfileDraft, isEditingProfile, setIsEditingProfile,
  showProfileSexDropdown, setShowProfileSexDropdown,
  showProfileCommuneDropdown, setShowProfileCommuneDropdown,
  communeSearch, setCommuneSearch, pendingInvitations,
  respondInvitation, saveUserProfile, handleLogout,
}: ProfileScreenProps) {
  return (
    <View style={styles.form}>
      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Avatar iniciales */}
          <View style={styles.profileHero}>
            <View style={styles.profileAvatarLarge}>
              <Text style={styles.profileAvatarLargeText}>
                {profileDraft.first_name?.[0]?.toUpperCase() ?? ''}{profileDraft.last_name?.[0]?.toUpperCase() ?? ''}
              </Text>
            </View>
            {!isEditingProfile && (
              <Text style={styles.profileHeroName}>
                {profileDraft.first_name} {profileDraft.last_name}
              </Text>
            )}
            {!isEditingProfile && profileDraft.commune ? (
              <Text style={styles.profileHeroMeta}>{profileDraft.commune}</Text>
            ) : null}
          </View>

          {isEditingProfile ? (
            <>
              <Card title="Datos personales" accent={C.primary}>
                <Text style={styles.fieldLabel}>Nombre</Text>
                <TextInput style={styles.input} value={profileDraft.first_name}
                  onChangeText={(v) => setProfileDraft(p => ({ ...p, first_name: v }))}
                  placeholder="Nombre" placeholderTextColor={C.textMuted} autoCorrect={false} autoComplete="off" textContentType="none" />

                <Text style={styles.fieldLabel}>Apellido</Text>
                <TextInput style={styles.input} value={profileDraft.last_name}
                  onChangeText={(v) => setProfileDraft(p => ({ ...p, last_name: v }))}
                  placeholder="Apellido" placeholderTextColor={C.textMuted} autoCorrect={false} autoComplete="off" textContentType="none" />

                <Text style={styles.fieldLabel}>Teléfono</Text>
                <TextInput style={styles.input} value={profileDraft.phone}
                  onChangeText={(v) => setProfileDraft(p => ({ ...p, phone: v }))}
                  placeholder="+56912345678" placeholderTextColor={C.textMuted}
                  keyboardType="phone-pad" autoComplete="off" textContentType="none" />

                <Text style={styles.fieldLabel}>RUT</Text>
                <TextInput style={styles.input} value={profileDraft.rut}
                  onChangeText={(v) => setProfileDraft(p => ({ ...p, rut: formatRut(v) }))}
                  placeholder="12.345.678-9" placeholderTextColor={C.textMuted}
                  autoCapitalize="characters" autoCorrect={false} maxLength={12} autoComplete="off" textContentType="none" />

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
                        <Text style={[styles.selectOptionText, profileDraft.sex === opt && styles.selectOptionTextActive]}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={styles.fieldLabel}>Año de nacimiento</Text>
                <TextInput style={styles.input} value={profileDraft.birth_year ? String(profileDraft.birth_year) : ''}
                  onChangeText={(v) => setProfileDraft(p => ({ ...p, birth_year: parseInt(v) || 0 }))}
                  placeholder="1991" placeholderTextColor={C.textMuted}
                  keyboardType="number-pad" maxLength={4} autoComplete="off" textContentType="none" />

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
                    <TextInput
                      style={[styles.input, { marginBottom: 4 }]}
                      placeholder="Buscar comuna..."
                      placeholderTextColor={C.textMuted}
                      value={communeSearch}
                      onChangeText={setCommuneSearch}
                      autoCorrect={false}
                    />
                    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 150 }}>
                      {COMUNAS_CHILE.filter(c => c.toLowerCase().includes(communeSearch.toLowerCase())).map(c => (
                        <TouchableOpacity key={c} style={[styles.selectOption, profileDraft.commune === c && styles.selectOptionActive]}
                          onPress={() => { setProfileDraft(p => ({ ...p, commune: c })); setShowProfileCommuneDropdown(() => false); setCommuneSearch(''); }}>
                          <Text style={[styles.selectOptionText, profileDraft.commune === c && styles.selectOptionTextActive]}>{c}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </Card>

              <TouchableOpacity style={styles.btnPrimary} onPress={saveUserProfile} disabled={loading} activeOpacity={0.85}>
                <Text style={styles.btnPrimaryText}>{loading ? 'Guardando...' : 'Guardar cambios'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 8 }}
                onPress={() => { setIsEditingProfile(false); setShowProfileSexDropdown(() => false); }} activeOpacity={0.7}>
                <Text style={{ color: C.textLight, fontWeight: '600', fontSize: 14 }}>Cancelar</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Card title="Datos personales" accent={C.primary}>
                <InfoRow label="Nombre" value={`${profileDraft.first_name} ${profileDraft.last_name}`} />
                <InfoRow label="Teléfono" value={profileDraft.phone} />
                <InfoRow label="RUT" value={profileDraft.rut} />
                <InfoRow label="Sexo" value={profileDraft.sex} />
                <InfoRow label="Año nacimiento" value={profileDraft.birth_year ? String(profileDraft.birth_year) : null} />
                <InfoRow label="Comuna" value={profileDraft.commune} />
              </Card>

              {pendingInvitations.length > 0 && (
                <Card title={`Invitaciones (${pendingInvitations.length})`} accent={C.warning}>
                  {pendingInvitations.map(inv => (
                    <View key={inv.id} style={{ marginBottom: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <View style={[styles.dashCardIconWrap, { backgroundColor: C.warningLight }]}>
                          <Text style={{ fontSize: 18 }}>{inv.pet_species === 'Gato' ? '🐱' : '🐶'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }}>{inv.pet_name}</Text>
                          <Text style={{ color: C.textMuted, fontSize: 12 }}>
                            Invitación de {inv.invited_by_name || inv.invited_email}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity
                          style={[styles.btnPrimary, { flex: 1, paddingVertical: 10 }]}
                          onPress={() => respondInvitation(inv.id, true)}
                          disabled={loading}
                          activeOpacity={0.85}>
                          <Text style={styles.btnPrimaryText}>Aceptar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.btnGhost, { flex: 1, paddingVertical: 10 }]}
                          onPress={() => respondInvitation(inv.id, false)}
                          disabled={loading}
                          activeOpacity={0.7}>
                          <Text style={styles.btnGhostText}>Rechazar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </Card>
              )}

              <TouchableOpacity style={styles.btnPrimary} onPress={() => setIsEditingProfile(true)} activeOpacity={0.85}>
                <Text style={styles.btnPrimaryText}>Editar perfil</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
                <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}
    </View>
  );
}
