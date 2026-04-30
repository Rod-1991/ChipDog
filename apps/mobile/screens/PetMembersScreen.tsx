import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import { C } from '../constants/colors';
import Card from '../components/Card';
import type { Pet, PetMember, Screen } from '../types';

type PetMembersScreenProps = {
  petMembers: PetMember[];
  selectedPet: Pet | null;
  loading: boolean;
  removeCoOwner: (id: number) => void;
  setInviteEmail: (email: string) => void;
  setScreen: (s: Screen) => void;
};

export default function PetMembersScreen({
  petMembers, selectedPet, loading, removeCoOwner, setInviteEmail, setScreen,
}: PetMembersScreenProps) {
  const accepted = petMembers.filter(m => m.status === 'accepted');
  const pending  = petMembers.filter(m => m.status === 'pending');

  return (
    <View style={styles.form}>
      <TouchableOpacity style={styles.btnPrimary} onPress={() => { setInviteEmail(''); setScreen('InviteCoOwner'); }} activeOpacity={0.85}>
        <Text style={styles.btnPrimaryText}>+ Invitar co-dueño</Text>
      </TouchableOpacity>

      {accepted.length > 0 && (
        <Card title="Co-dueños activos" accent={C.success}>
          {accepted.map(m => (
            <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.dashCardIconWrap, { backgroundColor: C.successLight }]}>
                <Text style={{ fontSize: 18 }}>👤</Text>
              </View>
              <Text style={{ flex: 1, color: C.text, fontWeight: '600', fontSize: 14 }}>{m.invited_email}</Text>
              <TouchableOpacity onPress={() => removeCoOwner(m.id)} activeOpacity={0.7}>
                <Text style={{ color: C.danger, fontWeight: '700', fontSize: 13 }}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          ))}
        </Card>
      )}

      {pending.length > 0 && (
        <Card title="Invitaciones pendientes" accent={C.warning}>
          {pending.map(m => (
            <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.dashCardIconWrap, { backgroundColor: C.warningLight }]}>
                <Text style={{ fontSize: 18 }}>⏳</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontWeight: '600', fontSize: 14 }}>{m.invited_email}</Text>
                <Text style={{ color: C.textMuted, fontSize: 12 }}>Pendiente de aceptar</Text>
              </View>
              <TouchableOpacity onPress={() => removeCoOwner(m.id)} activeOpacity={0.7}>
                <Text style={{ color: C.danger, fontWeight: '700', fontSize: 13 }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          ))}
        </Card>
      )}

      {petMembers.length === 0 && !loading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>👥</Text>
          <Text style={styles.emptyStateTitle}>Sin co-dueños</Text>
          <Text style={styles.emptyStateHint}>Invita a alguien para compartir el cuidado de {selectedPet?.name}.</Text>
        </View>
      )}
    </View>
  );
}
