import { Linking, Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import { C } from '../constants/colors';
import Card from '../components/Card';
import InfoRow from '../components/InfoRow';
import type { FoundPet, Screen } from '../types';

type FoundResultScreenProps = {
  foundPet: FoundPet | null;
  isLoggedIn: boolean;
  setScreen: (s: Screen) => void;
};

export default function FoundResultScreen({ foundPet, isLoggedIn, setScreen }: FoundResultScreenProps) {
  return (
    <View style={styles.foundWrap}>
      {foundPet ? (
        <>
          <Text style={styles.foundEmoji}>
            {foundPet.is_lost ? '🚨' : '🐾'}
          </Text>
          {foundPet.is_lost && (
            <View style={styles.lostAlertBanner}>
              <Text style={styles.lostAlertText}>Esta mascota está reportada como PERDIDA</Text>
            </View>
          )}
          <Text style={styles.foundPetName}>{foundPet.public_name}</Text>
          <Card>
            <InfoRow label="Especie"  value={foundPet.species} />
            {foundPet.breed ? <InfoRow label="Raza"   value={foundPet.breed} /> : null}
            {foundPet.color ? <InfoRow label="Color"  value={foundPet.color} /> : null}
            {foundPet.owner_name ? <InfoRow label="Dueño" value={foundPet.owner_name} /> : null}
          </Card>
          {foundPet.public_notes ? (
            <Card title="Indicaciones" accent={C.warning}>
              <Text style={{ color: C.text, lineHeight: 20 }}>{foundPet.public_notes}</Text>
            </Card>
          ) : null}
          {foundPet.contact_phone ? (
            <TouchableOpacity style={styles.btnPrimary} onPress={() => Linking.openURL(`tel:${foundPet.contact_phone}`)} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>📞  Llamar al dueño</Text>
            </TouchableOpacity>
          ) : null}
          {foundPet.contact_whatsapp ? (
            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: '#25D366' }]}
              onPress={() => Linking.openURL(`https://wa.me/${foundPet.contact_whatsapp!.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, encontré a ${foundPet.public_name} 🐾`)}`)}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>💬  WhatsApp</Text>
            </TouchableOpacity>
          ) : null}
        </>
      ) : (
        <Text style={{ color: C.textLight, textAlign: 'center' }}>No hay datos disponibles.</Text>
      )}
      <TouchableOpacity style={styles.btnGhost} onPress={() => setScreen('FoundTag')} activeOpacity={0.85}>
        <Text style={styles.btnGhostText}>Buscar otro tag</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnGhost} onPress={() => setScreen(isLoggedIn ? 'Home' : 'Login')} activeOpacity={0.85}>
        <Text style={styles.btnGhostText}>Volver al inicio</Text>
      </TouchableOpacity>
    </View>
  );
}
