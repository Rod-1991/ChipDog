import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import { C } from '../constants/colors';
import Card from '../components/Card';
import InfoRow from '../components/InfoRow';
import type { Pet } from '../types';

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
  food_brand: string;
  food_notes: string;
};

type PetContactScreenProps = {
  selectedPet: Pet | null;
  isEditingPetDetail: boolean;
  petDraft: PetDraft;
  setPetDraft: (fn: (p: PetDraft) => PetDraft) => void;
  loading: boolean;
  savePetProfile: () => void;
};

export default function PetContactScreen({
  selectedPet, isEditingPetDetail, petDraft, setPetDraft,
  loading, savePetProfile,
}: PetContactScreenProps) {
  if (!selectedPet) return null;

  // Aviso público (siempre visible)
  const publicBanner = (
    <View style={{ backgroundColor: C.warningLight, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 4 }}>
      <Text style={{ fontSize: 20 }}>👁</Text>
      <Text style={{ flex: 1, color: C.warning, fontWeight: '600', fontSize: 13, lineHeight: 19 }}>
        Esta información es pública: aparece cuando alguien escanea el tag de {selectedPet?.name ?? 'tu mascota'}.
      </Text>
    </View>
  );

  if (!isEditingPetDetail) {
    // ── Vista de solo lectura ──
    return (
      <View style={styles.form}>
        {publicBanner}
        <Card title="📞  Contacto principal" accent={C.primary}>
          <InfoRow label="Nombre" value={petDraft.contact_primary_name} />
          <InfoRow label="Teléfono" value={petDraft.owner_phone} />
        </Card>

        <Card title="👤  Contacto secundario" accent={C.accent}>
          <InfoRow label="Nombre" value={petDraft.contact_secondary_name} />
          <InfoRow label="Teléfono" value={petDraft.contact_secondary_phone} />
        </Card>

        <Card title="🩺  Veterinario de cabecera" accent={C.success}>
          <InfoRow label="Nombre / clínica" value={petDraft.vet_name} />
          <InfoRow label="Teléfono" value={petDraft.vet_phone} />
        </Card>

        <Card title="💬  Mensaje al que escanea" accent={C.primaryLight}>
          <Text style={{ color: petDraft.public_notes ? C.text : C.textMuted, lineHeight: 20 }}>
            {petDraft.public_notes || '—'}
          </Text>
        </Card>
      </View>
    );
  }

  // ── Vista de edición ──
  return (
    <View style={styles.form}>
      {publicBanner}

      {/* ── Contacto principal ── */}
      <Card title="📞  Contacto principal" accent={C.primary}>
        <Text style={styles.fieldLabel}>Nombre</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Nombre Apellido"
          placeholderTextColor={C.textMuted}
          value={petDraft.contact_primary_name}
          onChangeText={(v) => setPetDraft((p) => ({ ...p, contact_primary_name: v }))}
        />
        <Text style={styles.fieldLabel}>Teléfono</Text>
        <TextInput
          style={styles.input}
          placeholder="+56912345678"
          placeholderTextColor={C.textMuted}
          value={petDraft.owner_phone}
          onChangeText={(v) => setPetDraft((p) => ({ ...p, owner_phone: v }))}
          keyboardType="phone-pad"
        />
      </Card>

      {/* ── Contacto secundario ── */}
      <Card title="👤  Contacto secundario" accent={C.accent}>
        <Text style={styles.fieldLabel}>Nombre</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: María González"
          placeholderTextColor={C.textMuted}
          value={petDraft.contact_secondary_name}
          onChangeText={(v) => setPetDraft((p) => ({ ...p, contact_secondary_name: v }))}
        />
        <Text style={styles.fieldLabel}>Teléfono</Text>
        <TextInput
          style={styles.input}
          placeholder="+56912345678"
          placeholderTextColor={C.textMuted}
          value={petDraft.contact_secondary_phone}
          onChangeText={(v) => setPetDraft((p) => ({ ...p, contact_secondary_phone: v }))}
          keyboardType="phone-pad"
        />
      </Card>

      {/* ── Veterinario ── */}
      <Card title="🩺  Veterinario de cabecera" accent={C.success}>
        <Text style={styles.fieldLabel}>Nombre del veterinario / clínica</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Dr. Martínez — ClínicaVet Las Condes"
          placeholderTextColor={C.textMuted}
          value={petDraft.vet_name}
          onChangeText={(v) => setPetDraft((p) => ({ ...p, vet_name: v }))}
        />
        <Text style={styles.fieldLabel}>Teléfono</Text>
        <TextInput
          style={styles.input}
          placeholder="+56912345678"
          placeholderTextColor={C.textMuted}
          value={petDraft.vet_phone}
          onChangeText={(v) => setPetDraft((p) => ({ ...p, vet_phone: v }))}
          keyboardType="phone-pad"
        />
      </Card>

      {/* ── Mensaje al que escanea ── */}
      <Card title="💬  Mensaje al que escanea" accent={C.primaryLight}>
        <Text style={[styles.fieldLabel, { marginBottom: 4 }]}>
          Notas visibles al escanear el tag (indicaciones, carácter de la mascota, etc.)
        </Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          multiline
          placeholder='Ej: "Es asustadizo, no lo persigan. Llamen al dueño."'
          placeholderTextColor={C.textMuted}
          value={petDraft.public_notes}
          onChangeText={(v) => setPetDraft((p) => ({ ...p, public_notes: v }))}
        />
      </Card>

      <TouchableOpacity style={styles.btnPrimary} onPress={savePetProfile} disabled={loading} activeOpacity={0.85}>
        <Text style={styles.btnPrimaryText}>{loading ? 'Guardando...' : 'Guardar contacto'}</Text>
      </TouchableOpacity>
    </View>
  );
}
