import { Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../../styles';
import { C } from '../../constants/colors';
import { buildCalendarDays, formatBirthDateShort, parseBirthDateText } from '../../utils/helpers';
import Card from '../../components/Card';
import InfoRow from '../../components/InfoRow';
import type { Pet } from '../../types';

const SEX_OPTS = ['Macho', 'Hembra'];
const BLOOD_TYPES = ['DEA 1.1+', 'DEA 1.1-', 'DEA 1.2+', 'DEA 1.2-', 'No sé'];

export type PetDraft = {
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
  food_brand: string;
  food_notes: string;
};

type Props = {
  selectedPet: Pet;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  petDraft: PetDraft;
  setPetDraft: (fn: (p: PetDraft) => PetDraft) => void;
  showBirthCalendar: boolean;
  setShowBirthCalendar: (fn: (v: boolean) => boolean) => void;
  birthCalendarMonth: Date;
  setBirthCalendarMonth: (fn: (p: Date) => Date) => void;
  loading: boolean;
  savePetProfile: () => void;
};

export default function PetInfoTab({
  selectedPet, isEditing, setIsEditing, petDraft, setPetDraft,
  showBirthCalendar, setShowBirthCalendar, birthCalendarMonth, setBirthCalendarMonth,
  loading, savePetProfile,
}: Props) {

  if (!isEditing) {
    return (
      <View style={styles.form}>
        <Card title="📋  Identidad" accent={C.primary}>
          <InfoRow label="Sexo" value={petDraft.sex} />
          <InfoRow label="Fecha de nacimiento" value={petDraft.birth_date_text} />
          <InfoRow label="Peso" value={petDraft.weight_kg ? `${petDraft.weight_kg} kg` : null} />
          <InfoRow label="Esterilizado/a" value={petDraft.sterilized ? 'Sí' : 'No'} />
          <InfoRow label="N° de chip / microchip" value={petDraft.chip_number} />
          <InfoRow label="Color" value={petDraft.color} />
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

        <TouchableOpacity
          style={[styles.btnPrimary, { marginBottom: 8 }]}
          onPress={() => setIsEditing(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>✏️  Editar información</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <Card title="📋  Identidad" accent={C.primary}>
        <Text style={styles.fieldLabel}>Sexo</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {SEX_OPTS.map(opt => (
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
              setPetDraft(p => ({ ...p, birth_date_text: clean.slice(0, 10) }));
            }}
          />
          <TouchableOpacity style={[styles.input, { paddingHorizontal: 14 }]} onPress={() => setShowBirthCalendar(v => !v)}>
            <Text style={{ fontSize: 20 }}>{showBirthCalendar ? '▲' : '📅'}</Text>
          </TouchableOpacity>
        </View>
        {showBirthCalendar && (
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity style={styles.calendarArrowBtn} onPress={() => setBirthCalendarMonth(p => new Date(p.getFullYear(), p.getMonth() - 1, 1))}>
                <Text style={styles.calendarArrowText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.calendarMonthTitle}>{birthCalendarMonth.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</Text>
              <TouchableOpacity style={styles.calendarArrowBtn} onPress={() => setBirthCalendarMonth(p => new Date(p.getFullYear(), p.getMonth() + 1, 1))}>
                <Text style={styles.calendarArrowText}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.calendarWeekRow}>
              {['L','M','X','J','V','S','D'].map(d => <Text key={d} style={styles.calendarWeekDay}>{d}</Text>)}
            </View>
            <View style={styles.calendarGrid}>
              {buildCalendarDays(birthCalendarMonth).map((day, idx) => {
                const sel = parseBirthDateText(petDraft.birth_date_text);
                const isSelected = sel != null && sel.getFullYear() === birthCalendarMonth.getFullYear() && sel.getMonth() === birthCalendarMonth.getMonth() && sel.getDate() === day;
                return (
                  <TouchableOpacity key={`cal-${idx}`} disabled={!day}
                    style={[styles.calendarDayBtn, !day && styles.calendarDayBtnDisabled, isSelected && styles.calendarDayBtnSelected]}
                    onPress={() => {
                      if (!day) return;
                      const d = new Date(birthCalendarMonth.getFullYear(), birthCalendarMonth.getMonth(), day);
                      setPetDraft(p => ({ ...p, birth_date_text: formatBirthDateShort(d) }));
                      setShowBirthCalendar(() => false);
                    }}>
                    <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected]}>{day ?? ''}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <Text style={styles.fieldLabel}>Peso (kg)</Text>
        <TextInput style={styles.input} placeholder="Ej: 8.5" placeholderTextColor={C.textMuted}
          value={petDraft.weight_kg} keyboardType="decimal-pad"
          onChangeText={(v) => setPetDraft(p => ({ ...p, weight_kg: v }))} />

        <Text style={styles.fieldLabel}>Color</Text>
        <TextInput style={styles.input} placeholder='Ej: "Dorado", "Blanco con manchas negras"'
          placeholderTextColor={C.textMuted}
          value={petDraft.color}
          onChangeText={(v) => setPetDraft(p => ({ ...p, color: v }))} />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>✂️  Esterilizado/a</Text>
          <Switch value={petDraft.sterilized} onValueChange={(v) => setPetDraft(p => ({ ...p, sterilized: v }))}
            trackColor={{ false: C.border, true: C.primary }} thumbColor={C.white} />
        </View>

        <Text style={styles.fieldLabel}>N° de chip / microchip</Text>
        <TextInput style={styles.input} placeholder="Ej: 985112345678901" placeholderTextColor={C.textMuted}
          value={petDraft.chip_number} keyboardType="number-pad"
          onChangeText={(v) => setPetDraft(p => ({ ...p, chip_number: v }))} />
      </Card>

      <Card title="🐾  Descripción física" accent={C.accent}>
        <TextInput style={[styles.input, styles.multiline]} multiline
          placeholder='Ej: "Blanco con manchas café, orejas negras"'
          placeholderTextColor={C.textMuted}
          value={petDraft.description}
          onChangeText={(v) => setPetDraft(p => ({ ...p, description: v }))} />
      </Card>

      <Card title="🩺  Salud" accent={C.success}>
        <Text style={styles.fieldLabel}>Alergias</Text>
        <TextInput style={[styles.input, styles.multiline]} multiline placeholder="Ej: Polen, antibióticos"
          placeholderTextColor={C.textMuted} value={petDraft.allergies}
          onChangeText={(v) => setPetDraft(p => ({ ...p, allergies: v }))} />

        <Text style={styles.fieldLabel}>Medicamentos actuales</Text>
        <TextInput style={[styles.input, styles.multiline]} multiline placeholder="Ej: Frontline mensual"
          placeholderTextColor={C.textMuted} value={petDraft.medications}
          onChangeText={(v) => setPetDraft(p => ({ ...p, medications: v }))} />

        <Text style={styles.fieldLabel}>Condiciones / enfermedades</Text>
        <TextInput style={[styles.input, styles.multiline]} multiline placeholder="Ej: Displasia leve"
          placeholderTextColor={C.textMuted} value={petDraft.conditions}
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

      <Card title="🛡️  Seguro veterinario" accent={C.warning}>
        <Text style={styles.fieldLabel}>Nombre del seguro</Text>
        <TextInput style={styles.input} placeholder="Ej: Mapfre Mascotas"
          placeholderTextColor={C.textMuted} value={petDraft.insurance_name}
          onChangeText={(v) => setPetDraft(p => ({ ...p, insurance_name: v }))} />
        <Text style={styles.fieldLabel}>N° de póliza</Text>
        <TextInput style={styles.input} placeholder="Ej: 1234567-8"
          placeholderTextColor={C.textMuted} value={petDraft.insurance_policy}
          onChangeText={(v) => setPetDraft(p => ({ ...p, insurance_policy: v }))} />
      </Card>

      <TouchableOpacity style={styles.btnPrimary} onPress={savePetProfile} disabled={loading} activeOpacity={0.85}>
        <Text style={styles.btnPrimaryText}>{loading ? 'Guardando...' : 'Guardar información'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnGhost} onPress={() => setIsEditing(false)} activeOpacity={0.85}>
        <Text style={styles.btnGhostText}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}
