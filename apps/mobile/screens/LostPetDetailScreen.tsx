import { Image, Linking, Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import { C } from '../constants/colors';
import { initialsFromName } from '../utils/helpers';
import Card from '../components/Card';
import InfoRow from '../components/InfoRow';
import type { LostPetPin, Screen } from '../types';

type LostPetDetailScreenProps = {
  selectedLostPet: LostPetPin;
  lostPetPhotoUrl: string | null;
  setScreen: (s: Screen) => void;
};

export default function LostPetDetailScreen({
  selectedLostPet, lostPetPhotoUrl, setScreen,
}: LostPetDetailScreenProps) {
  const pet = selectedLostPet;

  return (
    <View style={styles.form}>
      {/* Hero */}
      <View style={styles.petHero}>
        {lostPetPhotoUrl ? (
          <Image source={{ uri: lostPetPhotoUrl }} style={styles.petHeroAvatar} resizeMode="cover" />
        ) : (
          <View style={[styles.petHeroAvatar, styles.avatarPlaceholder]}>
            <Text style={[styles.avatarInitials, { fontSize: 32 }]}>{initialsFromName(pet.name)}</Text>
          </View>
        )}
        <Text style={styles.petHeroName}>{pet.name}</Text>
        <Text style={styles.petHeroBreed}>{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</Text>
        <View style={[styles.badge, styles.badgeDanger, { marginTop: 4 }]}>
          <Text style={[styles.badgeText, styles.badgeTextDanger]}>🚨 Perdido</Text>
        </View>
      </View>

      <Card>
        {pet.color      && <InfoRow label="Color"   value={pet.color} />}
        {pet.lost_commune && <InfoRow label="Comuna" value={pet.lost_commune} />}
        {pet.contact_primary_name && <InfoRow label="Dueño" value={pet.contact_primary_name} />}
      </Card>

      {pet.public_notes && (
        <Card title="Indicaciones" accent={C.warning}>
          <Text style={{ color: C.text, lineHeight: 20 }}>{pet.public_notes}</Text>
        </Card>
      )}

      {pet.owner_phone && (
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => Linking.openURL(`tel:${pet.owner_phone}`)}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>📞  Llamar al dueño</Text>
        </TouchableOpacity>
      )}


      <TouchableOpacity style={styles.btnGhost} onPress={() => setScreen('LostPetList')} activeOpacity={0.85}>
        <Text style={styles.btnGhostText}>Volver a la lista</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btnGhost, { marginTop: 4 }]} onPress={() => setScreen('NearbyMap')} activeOpacity={0.85}>
        <Text style={styles.btnGhostText}>Volver al mapa</Text>
      </TouchableOpacity>
    </View>
  );
}
