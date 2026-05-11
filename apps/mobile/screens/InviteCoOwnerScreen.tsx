import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import { C } from '../constants/colors';
import Card from '../components/Card';
import { useAppStore } from '../store/app';
import { usePetsStore } from '../store/pets';
import { useCoOwnerStore } from '../store/coOwner';

export default function InviteCoOwnerScreen() {
  const loading = useAppStore((s) => s.loading);
  const setScreen = useAppStore((s) => s.setScreen);
  const { selectedPet } = usePetsStore();
  const { sendCoOwnerInvite } = useCoOwnerStore();

  const [inviteEmail, setInviteEmail] = useState('');

  const handleSend = async () => {
    if (!selectedPet) return;
    const ok = await sendCoOwnerInvite(selectedPet.id, inviteEmail.trim());
    if (ok) { setInviteEmail(''); setScreen('PetMembers'); }
  };

  return (
    <View style={styles.form}>
      <Card title={`Invitar co-dueño para ${selectedPet?.name}`} accent={C.primary}>
        <Text style={{ color: C.textLight, fontSize: 13, lineHeight: 18 }}>
          El co-dueño podrá ver y editar el perfil, vacunas e historial veterinario de {selectedPet?.name}.
          Recibirá un email con la invitación.
        </Text>
      </Card>

      <Card>
        <Text style={styles.fieldLabel}>Email del co-dueño</Text>
        <TextInput
          style={styles.input}
          placeholder="correo@ejemplo.com"
          placeholderTextColor={C.textMuted}
          value={inviteEmail}
          onChangeText={setInviteEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
        />
      </Card>

      <TouchableOpacity style={styles.btnPrimary} onPress={handleSend} disabled={loading} activeOpacity={0.85}>
        <Text style={styles.btnPrimaryText}>{loading ? 'Enviando...' : 'Enviar invitación'}</Text>
      </TouchableOpacity>
    </View>
  );
}
