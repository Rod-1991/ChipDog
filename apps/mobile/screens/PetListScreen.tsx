import { Image, Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import { initialsFromName } from '../utils/helpers';
import type { Pet, Screen } from '../types';

type PetListScreenProps = {
  pets: Pet[];
  petSignedUrls: Record<number, string | null>;
  loadPetDetail: (petId: number) => Promise<void>;
  setScreen: (s: Screen) => void;
};

export default function PetListScreen({
  pets, petSignedUrls, loadPetDetail, setScreen,
}: PetListScreenProps) {
  return (
    <View style={styles.form}>
      {/* Header */}
      <View style={styles.homeHeader}>
        <TouchableOpacity style={styles.inlineBackBtn} onPress={() => setScreen('Home')} activeOpacity={0.7}>
          <Text style={styles.inlineBackArrow}>‹</Text>
          <Text style={styles.inlineBackLabel}>Inicio</Text>
        </TouchableOpacity>
        <Text style={styles.homeHeaderTitle}>Mis Mascotas</Text>
        <Text style={styles.homeHeaderSubtitle}>Todo sobre tu mascota, siempre contigo.</Text>
      </View>

      {/* CTA agregar */}
      <TouchableOpacity style={styles.addPetCta} onPress={() => setScreen('AddPet')} activeOpacity={0.85}>
        <Text style={styles.addPetCtaText}>+  Agregar mascota</Text>
      </TouchableOpacity>

      {/* Lista de mascotas */}
      {pets.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>🐶</Text>
          <Text style={styles.emptyStateTitle}>Aún no tienes mascotas</Text>
          <Text style={styles.emptyStateHint}>Agrega a tu peludo y empieza a cuidarlo como se merece.</Text>
        </View>
      ) : (
        pets.map((pet) => (
          <TouchableOpacity
            key={pet.id}
            onPress={async () => {
              await loadPetDetail(pet.id);
              setScreen('PetDetail');
            }}
            style={styles.petCard}
            activeOpacity={0.85}
          >
            <View style={styles.petCardPhotoWrap}>
              {petSignedUrls[pet.id] ? (
                <Image source={{ uri: petSignedUrls[pet.id] ?? undefined }} style={styles.petCardPhoto} resizeMode="cover" />
              ) : (
                <View style={[styles.petCardPhoto, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitials}>{initialsFromName(pet.name)}</Text>
                </View>
              )}
              {pet.is_lost && <View style={styles.petCardLostDot} />}
            </View>

            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.petCardName}>{pet.name}</Text>
              <Text style={styles.petCardBreed}>
                {pet.species}{pet.breed ? ` · ${pet.breed}` : ''}
              </Text>
              <View style={[styles.badge, pet.is_lost ? styles.badgeDanger : styles.badgeOk, { alignSelf: 'flex-start', marginTop: 2 }]}>
                <Text style={[styles.badgeText, pet.is_lost ? styles.badgeTextDanger : styles.badgeTextOk]}>
                  {pet.is_lost ? '🚨 Perdido' : '🏠 En casa'}
                </Text>
              </View>
            </View>

            <Text style={styles.petCardArrow}>›</Text>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}
