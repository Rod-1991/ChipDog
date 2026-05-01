import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../../styles';
import { C } from '../../constants/colors';
import Card from '../../components/Card';
import InfoRow from '../../components/InfoRow';
import type { Pet } from '../../types';
import type { PetDraft } from './PetInfoTab';

type Props = {
  selectedPet: Pet;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  petDraft: PetDraft;
  setPetDraft: (fn: (p: PetDraft) => PetDraft) => void;
  loading: boolean;
  savePetProfile: () => void;
};

export default function PetContactTab({
  selectedPet, isEditing, setIsEditing, petDraft, setPetDraft, loading, savePetProfile,
}: Props) {
  const publicBanner = (
    <View style={{ backgroundColor: C.warningLight, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 4 }}>
      <Text style={{ fontSize: 20 }}>👁</Text>
      <Text style={{ flex: 1, color: C.warning, fontWeight: '600', fontSize: 13, lineHeight: 19 }}>
        Esta info es pública: aparece cuando alguien escanea el tag de {selectedPet.name}.
      </Text>
    </View>
  );

  if (!isEditing) {
    return (
      <View style={styles.form}>
        {publicBanner}
        <Card title="📞  Contacto principal" accent={C.primary}>
          <InfoRow label="Nombre" value={petDraft.contact_primary_name} />
          <InfoRow label="Teléfono" value={petDraft.owner_phone} />
          <InfoRow label="WhatsApp" value={petDraft.owner_whatsapp} />
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
        <TouchableOpacity style={[styles.btnPrimary, { marginBottom: 8 }]} onPress={() => setIsEditing(true)} activeOpacity={0.85}>
          <Text style={styles.btnPrimaryText}>✏️  Editar contacto</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.form}>
      {publicBanner}
      <Card title="📞  Contacto principal" accent={C.primary}>
        <Text style={styles.fieldLabel}>Nombre</Text>
        <TextInput style={styles.input} placeholder="Ej: Rodrigo Arriagada" placeholderTextColor={C.textMuted}
          value={petDraft.contact_primary_name} onChangeText={(v) => setPetDraft(p => ({ ...p, contact_primary_name: v }))} />
        <Text style={styles.fieldLabel}>Teléfono</Text>
        <TextInput style={styles.input} placeholder="+56912345678" placeholderTextColor={C.textMuted}
          value={petDraft.owner_phone} keyboardType="phone-pad"
          onChangeText={(v) => setPetDraft(p => ({ ...p, owner_phone: v }))} />
        <Text style={styles.fieldLabel}>WhatsApp</Text>
        <TextInput style={styles.input} placeholder="+56912345678" placeholderTextColor={C.textMuted}
          value={petDraft.owner_whatsapp} keyboardType="phone-pad"
          onChangeText={(v) => setPetDraft(p => ({ ...p, owner_whatsapp: v }))} />
      </Card>

      <Card title="👤  Contacto secundario" accent={C.accent}>
        <Text style={styles.fieldLabel}>Nombre</Text>
        <TextInput style={styles.input} placeholder="Ej: María González" placeholderTextColor={C.textMuted}
          value={petDraft.contact_secondary_name} onChangeText={(v) => setPetDraft(p => ({ ...p, contact_secondary_name: v }))} />
        <Text style={styles.fieldLabel}>Teléfono</Text>
        <TextInput style={styles.input} placeholder="+56912345678" placeholderTextColor={C.textMuted}
          value={petDraft.contact_secondary_phone} keyboardType="phone-pad"
          onChangeText={(v) => setPetDraft(p => ({ ...p, contact_secondary_phone: v }))} />
      </Card>

      <Card title="🩺  Veterinario de cabecera" accent={C.success}>
        <Text style={styles.fieldLabel}>Nombre / clínica</Text>
        <TextInput style={styles.input} placeholder="Dr. Martínez — ClínicaVet" placeholderTextColor={C.textMuted}
          value={petDraft.vet_name} onChangeText={(v) => setPetDraft(p => ({ ...p, vet_name: v }))} />
        <Text style={styles.fieldLabel}>Teléfono</Text>
        <TextInput style={styles.input} placeholder="+56912345678" placeholderTextColor={C.textMuted}
          value={petDraft.vet_phone} keyboardType="phone-pad"
          onChangeText={(v) => setPetDraft(p => ({ ...p, vet_phone: v }))} />
      </Card>

      <Card title="💬  Mensaje al que escanea" accent={C.primaryLight}>
        <TextInput style={[styles.input, styles.multiline]} multiline
          placeholder='Ej: "Es asustadizo, llamen al dueño."'
          placeholderTextColor={C.textMuted}
          value={petDraft.public_notes}
          onChangeText={(v) => setPetDraft(p => ({ ...p, public_notes: v }))} />
      </Card>

      <TouchableOpacity style={styles.btnPrimary} onPress={savePetProfile} disabled={loading} activeOpacity={0.85}>
        <Text style={styles.btnPrimaryText}>{loading ? 'Guardando...' : 'Guardar contacto'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnGhost} onPress={() => setIsEditing(false)} activeOpacity={0.85}>
        <Text style={styles.btnGhostText}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}
