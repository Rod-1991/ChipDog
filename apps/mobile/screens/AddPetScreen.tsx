import { Alert, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import { C } from '../constants/colors';
import { SPECIES_OPTIONS, DOG_BREEDS, CAT_BREEDS } from '../constants/breeds';
import { buildCalendarDays, formatBirthDate } from '../utils/helpers';
import type { Screen } from '../types';

type PetForm = {
  name: string;
  species: 'Perro' | 'Gato';
  breed: string;
  sex: string;
  description: string;
  weight_kg: string;
  sterilized: boolean;
  chip_number: string;
};

type AddPetScreenProps = {
  petForm: PetForm;
  setPetForm: (fn: (p: PetForm) => PetForm) => void;
  petFormStep: 1 | 2;
  setPetFormStep: (s: 1 | 2) => void;
  petBirthDate: Date | null;
  setPetBirthDate: (d: Date | null) => void;
  birthDateText: string;
  setBirthDateText: (v: string) => void;
  calendarMonthDate: Date;
  setCalendarMonthDate: (fn: (c: Date) => Date) => void;
  showBirthCalendar: boolean;
  setShowBirthCalendar: (fn: (v: boolean) => boolean) => void;
  showSpeciesDropdown: boolean;
  setShowSpeciesDropdown: (fn: (v: boolean) => boolean) => void;
  showBreedDropdown: boolean;
  setShowBreedDropdown: (v: boolean) => void;
  showSexPetDropdown: boolean;
  setShowSexPetDropdown: (fn: (v: boolean) => boolean) => void;
  breedSearch: string;
  setBreedSearch: (v: string) => void;
  loading: boolean;
  handleCreatePet: () => void;
  setScreen: (s: Screen) => void;
};

const SEX_PET_OPTIONS = ['Macho', 'Hembra'];

export default function AddPetScreen({
  petForm, setPetForm, petFormStep, setPetFormStep,
  petBirthDate, setPetBirthDate, birthDateText, setBirthDateText,
  calendarMonthDate, setCalendarMonthDate, showBirthCalendar, setShowBirthCalendar,
  showSpeciesDropdown, setShowSpeciesDropdown, showBreedDropdown, setShowBreedDropdown,
  showSexPetDropdown, setShowSexPetDropdown, breedSearch, setBreedSearch,
  loading, handleCreatePet, setScreen,
}: AddPetScreenProps) {
  const breedList = petForm.species === 'Perro' ? DOG_BREEDS : CAT_BREEDS;
  const filteredBreeds = breedSearch.trim()
    ? breedList.filter(b => b.toLowerCase().includes(breedSearch.toLowerCase()))
    : breedList.slice(0, 8);
  const monthDays = buildCalendarDays(calendarMonthDate);
  const monthTitle = calendarMonthDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

  return (
    <View style={styles.form}>
      {/* Barra de progreso */}
      <View style={styles.registerProgressBar}>
        <View style={[styles.registerProgressFill, { width: petFormStep === 1 ? '50%' : '100%' }]} />
      </View>
      <Text style={{ color: C.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
        {petFormStep === 1 ? 'Paso 1 de 2 — Identidad' : 'Paso 2 de 2 — Más datos'}
      </Text>

      {petFormStep === 1 ? (
        <>
          {/* Nombre */}
          <TextInput
            style={styles.input}
            placeholder="Nombre de tu mascota"
            placeholderTextColor={C.textMuted}
            value={petForm.name}
            onChangeText={(v) => setPetForm((p) => ({ ...p, name: v }))}
          />

          {/* Especie */}
          <View>
            <TouchableOpacity style={[styles.input, styles.selectInput]} onPress={() => { setShowSpeciesDropdown(v => !v); setShowBreedDropdown(false); }} activeOpacity={0.9}>
              <Text style={styles.selectInputText}>{petForm.species === 'Perro' ? '🐶 Perro' : '🐱 Gato'}</Text>
              <Text style={styles.selectChevron}>{showSpeciesDropdown ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showSpeciesDropdown && (
              <View style={styles.selectMenu}>
                {SPECIES_OPTIONS.map(opt => (
                  <TouchableOpacity key={opt} style={[styles.selectOption, petForm.species === opt && styles.selectOptionActive]}
                    onPress={() => { setPetForm(p => ({ ...p, species: opt, breed: '' })); setBreedSearch(''); setShowSpeciesDropdown(() => false); }}>
                    <Text style={[styles.selectOptionText, petForm.species === opt && styles.selectOptionTextActive]}>
                      {opt === 'Perro' ? '🐶 Perro' : '🐱 Gato'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Sexo */}
          <View>
            <TouchableOpacity style={[styles.input, styles.selectInput]} onPress={() => { setShowSexPetDropdown(v => !v); setShowBreedDropdown(false); }} activeOpacity={0.9}>
              <Text style={[styles.selectInputText, !petForm.sex && { color: C.textMuted }]}>{petForm.sex || 'Sexo'}</Text>
              <Text style={styles.selectChevron}>{showSexPetDropdown ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showSexPetDropdown && (
              <View style={styles.selectMenu}>
                {SEX_PET_OPTIONS.map(opt => (
                  <TouchableOpacity key={opt} style={[styles.selectOption, petForm.sex === opt && styles.selectOptionActive]}
                    onPress={() => { setPetForm(p => ({ ...p, sex: opt })); setShowSexPetDropdown(() => false); }}>
                    <Text style={[styles.selectOptionText, petForm.sex === opt && styles.selectOptionTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Raza con autocomplete */}
          <View>
            <View style={[styles.input, styles.selectInput, { paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' }]}>
              <TextInput
                style={{ flex: 1, paddingVertical: 13, paddingHorizontal: 14, fontSize: 15, color: C.dark, fontWeight: '500' }}
                placeholder="Buscar raza (ej: border, persa...)"
                placeholderTextColor={C.textMuted}
                value={breedSearch || petForm.breed}
                onChangeText={(v) => { setBreedSearch(v); setPetForm(p => ({ ...p, breed: '' })); setShowBreedDropdown(true); }}
                onFocus={() => setShowBreedDropdown(true)}
              />
              {petForm.breed ? (
                <TouchableOpacity onPress={() => { setPetForm(p => ({ ...p, breed: '' })); setBreedSearch(''); setShowBreedDropdown(true); }} style={{ paddingHorizontal: 12 }}>
                  <Text style={{ color: C.textMuted, fontSize: 18 }}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {showBreedDropdown && (
              <View style={[styles.selectMenu, { maxHeight: 220 }]}>
                {/* Mestizo siempre primero y destacado */}
                {!breedSearch && (
                  <TouchableOpacity style={[styles.selectOption, { backgroundColor: C.primaryLight }]}
                    onPress={() => { setPetForm(p => ({ ...p, breed: 'Mestizo' })); setBreedSearch(''); setShowBreedDropdown(false); }}>
                    <Text style={[styles.selectOptionText, { color: C.primary, fontWeight: '800' }]}>⭐ Mestizo</Text>
                  </TouchableOpacity>
                )}
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 180 }}>
                  {filteredBreeds.filter(b => b !== 'Mestizo').map(b => (
                    <TouchableOpacity key={b} style={[styles.selectOption, petForm.breed === b && styles.selectOptionActive]}
                      onPress={() => { setPetForm(p => ({ ...p, breed: b })); setBreedSearch(''); setShowBreedDropdown(false); }}>
                      <Text style={[styles.selectOptionText, petForm.breed === b && styles.selectOptionTextActive]}>{b}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Fecha de nacimiento */}
          <View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="dd/mm/aaaa (opcional)"
                placeholderTextColor={C.textMuted}
                value={birthDateText}
                onChangeText={(v) => {
                  // Solo dígitos y barras
                  let clean = v.replace(/[^\d]/g, '');
                  // Auto-formato dd/mm/aaaa
                  if (clean.length > 2) clean = clean.slice(0, 2) + '/' + clean.slice(2);
                  if (clean.length > 5) clean = clean.slice(0, 5) + '/' + clean.slice(5);
                  if (clean.length > 10) clean = clean.slice(0, 10);
                  setBirthDateText(clean);
                  // Parsear cuando esté completo
                  const match = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                  if (match) {
                    const d = parseInt(match[1]), m = parseInt(match[2]), y = parseInt(match[3]);
                    const date = new Date(y, m - 1, d);
                    if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
                      setPetBirthDate(date);
                      setCalendarMonthDate(() => date);
                    } else {
                      setPetBirthDate(null);
                    }
                  } else {
                    setPetBirthDate(null);
                  }
                }}
                keyboardType="number-pad"
                maxLength={10}
              />
              <TouchableOpacity style={[styles.input, { paddingHorizontal: 14 }]} onPress={() => { setShowBirthCalendar(v => !v); setShowBreedDropdown(false); }}>
                <Text style={{ fontSize: 20 }}>{showBirthCalendar ? '▲' : '📅'}</Text>
              </TouchableOpacity>
            </View>
            {showBirthCalendar && (
              <View style={styles.calendarCard}>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity style={styles.calendarArrowBtn} onPress={() => setCalendarMonthDate(c => new Date(c.getFullYear(), c.getMonth() - 1, 1))}>
                    <Text style={styles.calendarArrowText}>‹</Text>
                  </TouchableOpacity>
                  <Text style={styles.calendarMonthTitle}>{monthTitle}</Text>
                  <TouchableOpacity style={styles.calendarArrowBtn} onPress={() => setCalendarMonthDate(c => new Date(c.getFullYear(), c.getMonth() + 1, 1))}>
                    <Text style={styles.calendarArrowText}>›</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.calendarWeekRow}>
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <Text key={d} style={styles.calendarWeekDay}>{d}</Text>)}
                </View>
                <View style={styles.calendarGrid}>
                  {monthDays.map((day, idx) => {
                    const isSelected = day != null && petBirthDate != null &&
                      petBirthDate.getFullYear() === calendarMonthDate.getFullYear() &&
                      petBirthDate.getMonth() === calendarMonthDate.getMonth() &&
                      petBirthDate.getDate() === day;
                    return (
                      <TouchableOpacity key={`${day ?? 'e'}-${idx}`} disabled={day == null}
                        style={[styles.calendarDayBtn, day == null && styles.calendarDayBtnDisabled, isSelected && styles.calendarDayBtnSelected]}
                        onPress={() => { if (!day) return; const d = new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth(), day); setPetBirthDate(d); setBirthDateText(formatBirthDate(d)); setShowBirthCalendar(() => false); }}>
                        <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected]}>{day ?? ''}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={() => {
            if (!petForm.name.trim()) { Alert.alert('Campo requerido', 'El nombre es obligatorio.'); return; }
            setPetFormStep(2); setShowBreedDropdown(false);
          }} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>Continuar →</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {/* Descripción física */}
          <View>
            <Text style={styles.fieldLabel}>Descripción física *</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder='Ej: "Blanco con manchas café en el lomo, orejas negras"'
              placeholderTextColor={C.textMuted}
              value={petForm.description}
              onChangeText={(v) => setPetForm(p => ({ ...p, description: v }))}
              multiline
            />
          </View>

          {/* Peso */}
          <View>
            <Text style={styles.fieldLabel}>Peso aproximado (kg)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 8.5"
              placeholderTextColor={C.textMuted}
              value={petForm.weight_kg}
              onChangeText={(v) => setPetForm(p => ({ ...p, weight_kg: v }))}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Esterilizado */}
          <View style={[styles.card, { paddingVertical: 14 }]}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>✂️  Esterilizado/a</Text>
              <Switch
                value={petForm.sterilized}
                onValueChange={(v) => setPetForm(p => ({ ...p, sterilized: v }))}
                trackColor={{ false: C.border, true: C.primary }}
                thumbColor={C.white}
              />
            </View>
          </View>

          {/* Número de chip */}
          <View>
            <Text style={styles.fieldLabel}>Número de chip / microchip</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 985112345678901"
              placeholderTextColor={C.textMuted}
              value={petForm.chip_number}
              onChangeText={(v) => setPetForm(p => ({ ...p, chip_number: v }))}
              keyboardType="number-pad"
            />
            <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 4, marginLeft: 2 }}>
              El número está en el certificado de vacunas o lo entrega el veterinario.
            </Text>
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={handleCreatePet} disabled={loading} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>{loading ? 'Guardando...' : '🐾 Agregar mascota'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 8 }} onPress={() => setPetFormStep(1)} activeOpacity={0.85}>
            <Text style={{ color: C.textLight, fontWeight: '600', fontSize: 14 }}>← Volver al paso anterior</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
