import { Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import { C } from '../constants/colors';
import { buildCalendarDays, formatBirthDateShort, parseBirthDateText } from '../utils/helpers';
import Card from '../components/Card';
import InfoRow from '../components/InfoRow';
import type { Pet, Screen } from '../types';

const SEX_PET_INFO = ['Macho', 'Hembra'];
const BLOOD_TYPES = ['DEA 1.1+', 'DEA 1.1-', 'DEA 1.2+', 'DEA 1.2-', 'No sé'];

type PetDraft = {
  color: string;
  birth_year: string;
  birth_date_text: string;
  sex: string;
  weight_kg: string;
  description: string;
  sterilized: boolean;
  chip_number: string;
  blood_type: string;
  insurance_name: string;
  insurance_policy: string;
  contact_primary_name: string;
  owner_phone: string;
  contact_secondary_name: string;
  contact_secondary_phone: string;
  owner_whatsapp: string;
  public_notes: string;
  allergies: string;
  medications: string;
  conditions: string;
  vet_name: string;
  vet_phone: string;
};

type PetInfoScreenProps = {
  selectedPet: Pet | null;
  isEditingPetDetail: boolean;
  petDraft: PetDraft;
  setPetDraft: (fn: (p: PetDraft) => PetDraft) => void;
  showProfileBirthCalendar: boolean;
  setShowProfileBirthCalendar: (fn: (v: boolean) => boolean) => void;
  profileBirthCalendarMonth: Date;
  setProfileBirthCalendarMonth: (fn: (p: Date) => Date) => void;
  loading: boolean;
  savePetProfile: () => void;
  setScreen: (s: Screen) => void;
};

export default function PetInfoScreen({
  selectedPet, isEditingPetDetail, petDraft, setPetDraft,
  showProfileBirthCalendar, setShowProfileBirthCalendar,
  profileBirthCalendarMonth, setProfileBirthCalendarMonth,
  loading, savePetProfile,
}: PetInfoScreenProps) {
  if (!selectedPet) return null;

  if (!isEditingPetDetail) {
    // ── Vista de solo lectura ──
    return (
      <View style={styles.form}>
        <Card title="📋  Identidad" accent={C.primary}>
          <InfoRow label="Sexo" value={petDraft.sex} />
          <InfoRow label="Fecha de nacimiento" value={petDraft.birth_date_text} />
          <InfoRow label="Peso" value={petDraft.weight_kg ? `${petDraft.weight_kg} kg` : null} />
          <InfoRow label="Esterilizado/a" value={petDraft.sterilized ? 'Sí' : 'No'} />
          <InfoRow label="N° de chip / microchip" value={petDraft.chip_number} />
        </Card>

        <Card title="🐾  Descripción física" accent={C.accent}>
          <Text style={{ color: petDraft.description ? C.text : C.textMuted, lineHeight: 20 }}>
            {petDraft.description || '—'}
          </Text>
        </Card>

        <Card title="🩺  Salud" accent={C.success}>
          <InfoRow label="Alergias" value={petDraft.allergies} />
          <InfoRow label="Medicamentos" value={petDraft.medications} />
          <InfoRow label="Condiciones" value={petDraft.conditions} />
          <InfoRow label="Grupo sanguíneo" value={petDraft.blood_type} />
        </Card>

        <Card title="🛡️  Seguro veterinario" accent={C.warning}>
          <InfoRow label="Seguro" value={petDraft.insurance_name} />
          <InfoRow label="N° de póliza" value={petDraft.insurance_policy} />
        </Card>
      </View>
    );
  }

  // ── Vista de edición ──
  return (
    <View style={styles.form}>

      {/* ── Identidad ── */}
      <Card title="📋  Identidad" accent={C.primary}>
        <Text style={styles.fieldLabel}>Sexo</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {SEX_PET_INFO.map(opt => (
            <TouchableOpacity key={opt}
              style={[styles.filterChip, { flex: 1, alignItems: 'center' }, petDraft.sex === opt && styles.filterChipActive]}
              onPress={() => setPetDraft(p => ({ ...p, sex: opt }))}>
              <Text style={[styles.filterChipText, petDraft.sex === opt && styles.filterChipTextActive]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Fecha de nacimiento</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="dd/mm/aaaa"
            placeholderTextColor={C.textMuted}
            value={petDraft.birth_date_text}
            keyboardType="number-pad"
            maxLength={10}
            onChangeText={(v) => {
              let clean = v.replace(/[^\d]/g, '');
              if (clean.length > 2) clean = clean.slice(0, 2) + '/' + clean.slice(2);
              if (clean.length > 5) clean = clean.slice(0, 5) + '/' + clean.slice(5);
              if (clean.length > 10) clean = clean.slice(0, 10);
              setPetDraft(p => ({ ...p, birth_date_text: clean }));
            }}
          />
          <TouchableOpacity style={[styles.input, { paddingHorizontal: 14 }]} onPress={() => setShowProfileBirthCalendar(v => !v)}>
            <Text style={{ fontSize: 20 }}>{showProfileBirthCalendar ? '▲' : '📅'}</Text>
          </TouchableOpacity>
        </View>
        {showProfileBirthCalendar && (
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity style={styles.calendarArrowBtn} onPress={() => setProfileBirthCalendarMonth(p => new Date(p.getFullYear(), p.getMonth() - 1, 1))}>
                <Text style={styles.calendarArrowText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.calendarMonthTitle}>{profileBirthCalendarMonth.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</Text>
              <TouchableOpacity style={styles.calendarArrowBtn} onPress={() => setProfileBirthCalendarMonth(p => new Date(p.getFullYear(), p.getMonth() + 1, 1))}>
                <Text style={styles.calendarArrowText}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.calendarWeekRow}>
              {['L','M','X','J','V','S','D'].map(d => <Text key={d} style={styles.calendarWeekDay}>{d}</Text>)}
            </View>
            <View style={styles.calendarGrid}>
              {buildCalendarDays(profileBirthCalendarMonth).map((day, idx) => {
                const selectedDate = parseBirthDateText(petDraft.birth_date_text);
                const isSelected = selectedDate != null && selectedDate.getFullYear() === profileBirthCalendarMonth.getFullYear() && selectedDate.getMonth() === profileBirthCalendarMonth.getMonth() && selectedDate.getDate() === day;
                return (
                  <TouchableOpacity key={`pd-${idx}`} disabled={!day}
                    style={[styles.calendarDayBtn, !day && styles.calendarDayBtnDisabled, isSelected && styles.calendarDayBtnSelected]}
                    onPress={() => { if (!day) return; const d = new Date(profileBirthCalendarMonth.getFullYear(), profileBirthCalendarMonth.getMonth(), day); setPetDraft(p => ({ ...p, birth_date_text: formatBirthDateShort(d) })); setShowProfileBirthCalendar(() => false); }}>
                    <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected]}>{day ?? ''}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <Text style={styles.fieldLabel}>Peso (kg)</Text>
        <TextInput style={styles.input} placeholder="Ej: 8.5" placeholderTextColor={C.textMuted}
          value={petDraft.weight_kg} onChangeText={(v) => setPetDraft(p => ({ ...p, weight_kg: v }))}
          keyboardType="decimal-pad" />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>✂️  Esterilizado/a</Text>
          <Switch value={petDraft.sterilized} onValueChange={(v) => setPetDraft(p => ({ ...p, sterilized: v }))}
            trackColor={{ false: C.border, true: C.primary }} thumbColor={C.white} />
        </View>

        <Text style={styles.fieldLabel}>Número de chip / microchip</Text>
        <TextInput style={styles.input} placeholder="Ej: 985112345678901" placeholderTextColor={C.textMuted}
          value={petDraft.chip_number} onChangeText={(v) => setPetDraft(p => ({ ...p, chip_number: v }))}
          keyboardType="number-pad" />
      </Card>

      {/* ── Descripción física ── */}
      <Card title="🐾  Descripción física" accent={C.accent}>
        <TextInput style={[styles.input, styles.multiline]} multiline
          placeholder='Ej: "Blanco con manchas café en el lomo, orejas negras"'
          placeholderTextColor={C.textMuted}
          value={petDraft.description}
          onChangeText={(v) => setPetDraft(p => ({ ...p, description: v }))} />
      </Card>

      {/* ── Salud ── */}
      <Card title="🩺  Salud" accent={C.success}>
        <Text style={styles.fieldLabel}>Alergias</Text>
        <TextInput style={[styles.input, styles.multiline]} multiline
          placeholder="Ej: Polen, ciertos antibióticos"
          placeholderTextColor={C.textMuted}
          value={petDraft.allergies}
          onChangeText={(v) => setPetDraft(p => ({ ...p, allergies: v }))} />

        <Text style={styles.fieldLabel}>Medicamentos actuales</Text>
        <TextInput style={[styles.input, styles.multiline]} multiline
          placeholder="Ej: Frontline mensual, Nexgard"
          placeholderTextColor={C.textMuted}
          value={petDraft.medications}
          onChangeText={(v) => setPetDraft(p => ({ ...p, medications: v }))} />

        <Text style={styles.fieldLabel}>Condiciones / enfermedades</Text>
        <TextInput style={[styles.input, styles.multiline]} multiline
          placeholder="Ej: Displasia de cadera leve"
          placeholderTextColor={C.textMuted}
          value={petDraft.conditions}
          onChangeText={(v) => setPetDraft(p => ({ ...p, conditions: v }))} />

        <Text style={styles.fieldLabel}>Grupo sanguíneo</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {BLOOD_TYPES.map(bt => (
            <TouchableOpacity key={bt}
              style={[styles.filterChip, petDraft.blood_type === bt && styles.filterChipActive]}
              onPress={() => setPetDraft(p => ({ ...p, blood_type: bt }))}>
              <Text style={[styles.filterChipText, petDraft.blood_type === bt && styles.filterChipTextActive]}>{bt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* ── Seguro veterinario ── */}
      <Card title="🛡️  Seguro veterinario" accent={C.warning}>
        <Text style={styles.fieldLabel}>Nombre del seguro</Text>
        <TextInput style={styles.input} placeholder="Ej: Mapfre Mascotas, BCI Seguros"
          placeholderTextColor={C.textMuted}
          value={petDraft.insurance_name}
          onChangeText={(v) => setPetDraft(p => ({ ...p, insurance_name: v }))} />

        <Text style={styles.fieldLabel}>Número de póliza</Text>
        <TextInput style={styles.input} placeholder="Ej: 1234567-8"
          placeholderTextColor={C.textMuted}
          value={petDraft.insurance_policy}
          onChangeText={(v) => setPetDraft(p => ({ ...p, insurance_policy: v }))} />
      </Card>

      <TouchableOpacity style={styles.btnPrimary} onPress={savePetProfile} disabled={loading} activeOpacity={0.85}>
        <Text style={styles.btnPrimaryText}>{loading ? 'Guardando...' : 'Guardar información'}</Text>
      </TouchableOpacity>
    </View>
  );
}
