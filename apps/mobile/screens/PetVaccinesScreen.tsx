import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import { C } from '../constants/colors';
import { autoFormatDate } from '../utils/helpers';
import Card from '../components/Card';
import type { Pet, Vaccine } from '../types';

type VaccineForm = {
  vaccine_name: string;
  applied_date: string;
  expiry_date: string;
  next_dose_date: string;
  veterinarian: string;
  clinic: string;
  batch_number: string;
  notes: string;
};

type VaccineStatusResult = { color: string; label: string };

type PetVaccinesScreenProps = {
  selectedPet: Pet | null;
  vaccines: Vaccine[];
  showVaccineForm: boolean;
  setShowVaccineForm: (v: boolean) => void;
  editingVaccineId: number | null;
  setEditingVaccineId: (id: number | null) => void;
  vaccineForm: VaccineForm;
  setVaccineForm: (fn: (p: VaccineForm) => VaccineForm) => void;
  loading: boolean;
  saveVaccine: () => void;
  deleteVaccine: (id: number) => void;
  resetVaccineForm: () => void;
  startEditVaccine: (v: Vaccine) => void;
  vaccineStatus: (v: Vaccine) => VaccineStatusResult;
};

export default function PetVaccinesScreen({
  selectedPet, vaccines, showVaccineForm, editingVaccineId,
  vaccineForm, setVaccineForm, loading,
  saveVaccine, deleteVaccine, resetVaccineForm,
  startEditVaccine, vaccineStatus, setShowVaccineForm, setEditingVaccineId,
}: PetVaccinesScreenProps) {

  // ── FORMULARIO (nueva / editar) ──
  if (showVaccineForm) {
    return (
      <View style={styles.form}>
        <Card title="💉  Vacuna" accent={C.primary}>
          <Text style={styles.fieldLabel}>Nombre de la vacuna *</Text>
          <TextInput style={styles.input} placeholder='Ej: "Antirrábica", "Polivalente"'
            placeholderTextColor={C.textMuted}
            value={vaccineForm.vaccine_name}
            onChangeText={(v) => setVaccineForm((p) => ({ ...p, vaccine_name: v }))} />

          <Text style={styles.fieldLabel}>Fecha de aplicación *</Text>
          <TextInput style={styles.input} placeholder="dd/mm/aaaa"
            placeholderTextColor={C.textMuted}
            value={vaccineForm.applied_date}
            onChangeText={(v) => setVaccineForm((p) => ({ ...p, applied_date: autoFormatDate(v) }))}
            keyboardType="number-pad" maxLength={10} />
        </Card>

        <Card title="📅  Fechas de control" accent={C.success}>
          <Text style={styles.fieldLabel}>Fecha de vencimiento</Text>
          <TextInput style={styles.input} placeholder="dd/mm/aaaa"
            placeholderTextColor={C.textMuted}
            value={vaccineForm.expiry_date}
            onChangeText={(v) => setVaccineForm((p) => ({ ...p, expiry_date: autoFormatDate(v) }))}
            keyboardType="number-pad" maxLength={10} />

          <Text style={styles.fieldLabel}>Próxima dosis</Text>
          <TextInput style={styles.input} placeholder="dd/mm/aaaa"
            placeholderTextColor={C.textMuted}
            value={vaccineForm.next_dose_date}
            onChangeText={(v) => setVaccineForm((p) => ({ ...p, next_dose_date: autoFormatDate(v) }))}
            keyboardType="number-pad" maxLength={10} />
        </Card>

        <Card title="🏥  Clínica" accent={C.accent}>
          <Text style={styles.fieldLabel}>Veterinario</Text>
          <TextInput style={styles.input} placeholder="Dr. Nombre Apellido"
            placeholderTextColor={C.textMuted}
            value={vaccineForm.veterinarian}
            onChangeText={(v) => setVaccineForm((p) => ({ ...p, veterinarian: v }))} />

          <Text style={styles.fieldLabel}>Clínica</Text>
          <TextInput style={styles.input} placeholder="Nombre de la clínica"
            placeholderTextColor={C.textMuted}
            value={vaccineForm.clinic}
            onChangeText={(v) => setVaccineForm((p) => ({ ...p, clinic: v }))} />

          <Text style={styles.fieldLabel}>N° de lote</Text>
          <TextInput style={styles.input} placeholder="Ej: AB1234"
            placeholderTextColor={C.textMuted}
            value={vaccineForm.batch_number}
            onChangeText={(v) => setVaccineForm((p) => ({ ...p, batch_number: v }))} />
        </Card>

        <Card title="📝  Notas" accent={C.warning}>
          <TextInput style={[styles.input, styles.multiline]} multiline
            placeholder="Observaciones adicionales"
            placeholderTextColor={C.textMuted}
            value={vaccineForm.notes}
            onChangeText={(v) => setVaccineForm((p) => ({ ...p, notes: v }))} />
        </Card>

        <TouchableOpacity style={styles.btnPrimary} onPress={saveVaccine} disabled={loading} activeOpacity={0.85}>
          <Text style={styles.btnPrimaryText}>{loading ? 'Guardando...' : (editingVaccineId ? 'Guardar cambios' : 'Registrar vacuna')}</Text>
        </TouchableOpacity>

        {editingVaccineId ? (
          <TouchableOpacity
            style={{ backgroundColor: C.dangerLight, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
            onPress={() => deleteVaccine(editingVaccineId)} disabled={loading} activeOpacity={0.85}>
            <Text style={{ color: C.danger, fontWeight: '700', fontSize: 15 }}>Eliminar vacuna</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  // ── LISTA ──
  return (
    <View style={styles.form}>
      <TouchableOpacity style={styles.addPetCta}
        onPress={() => { resetVaccineForm(); setShowVaccineForm(true); setEditingVaccineId(null); }}
        activeOpacity={0.85}>
        <Text style={styles.addPetCtaText}>+  Registrar vacuna</Text>
      </TouchableOpacity>

      {vaccines.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>💉</Text>
          <Text style={styles.emptyStateTitle}>Sin vacunas registradas</Text>
          <Text style={styles.emptyStateHint}>Registra las vacunas de {selectedPet?.name ?? 'tu mascota'} para mantenerlas al día.</Text>
        </View>
      ) : (
        vaccines.map((v) => {
          const status = vaccineStatus(v);
          return (
            <TouchableOpacity key={v.id} style={styles.vaccineCard}
              onPress={() => startEditVaccine(v)} activeOpacity={0.85}>
              {/* Barra de color estado */}
              <View style={[styles.vaccineStatusBar, { backgroundColor: status.color }]} />
              <View style={{ flex: 1, gap: 5 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.vaccineCardName}>{v.vaccine_name}</Text>
                  <View style={[styles.vaccineBadge, { backgroundColor: status.color + '22' }]}>
                    <Text style={[styles.vaccineBadgeText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>
                <Text style={styles.vaccineCardDate}>Aplicada: {v.applied_date}</Text>
                {v.expiry_date ? <Text style={styles.vaccineCardDate}>Vence: {v.expiry_date}</Text> : null}
                {v.next_dose_date ? <Text style={styles.vaccineCardDate}>Próxima dosis: {v.next_dose_date}</Text> : null}
                {(v.veterinarian || v.clinic) ? (
                  <Text style={styles.vaccineCardMeta}>{[v.veterinarian, v.clinic].filter(Boolean).join(' · ')}</Text>
                ) : null}
              </View>
              <Text style={styles.petCardArrow}>›</Text>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}
