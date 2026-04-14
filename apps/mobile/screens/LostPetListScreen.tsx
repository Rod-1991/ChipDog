import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import { C } from '../constants/colors';
import { initialsFromName } from '../utils/helpers';
import type { LostPetPin, Screen } from '../types';

type LostPetListScreenProps = {
  allLostPets: LostPetPin[];
  lostListSpecies: 'Todos' | 'Perro' | 'Gato';
  setLostListSpecies: (s: 'Todos' | 'Perro' | 'Gato') => void;
  lostListCommune: string;
  setLostListCommune: (c: string) => void;
  lostPetSignedUrls: Record<number, string | null>;
  setSelectedLostPet: (pet: LostPetPin) => void;
  setScreen: (s: Screen) => void;
};

export default function LostPetListScreen({
  allLostPets, lostListSpecies, setLostListSpecies,
  lostListCommune, setLostListCommune,
  lostPetSignedUrls, setSelectedLostPet, setScreen,
}: LostPetListScreenProps) {
  const communes = ['Todas', ...Array.from(new Set(allLostPets.map(p => p.lost_commune).filter(Boolean) as string[])).sort()];
  const speciesOptions: Array<'Todos' | 'Perro' | 'Gato'> = ['Todos', 'Perro', 'Gato'];

  const filtered = allLostPets.filter(p => {
    if (lostListSpecies !== 'Todos' && p.species !== lostListSpecies) return false;
    if (lostListCommune !== 'Todas' && p.lost_commune !== lostListCommune) return false;
    return true;
  });

  return (
    <View style={styles.form}>
      {/* Filtro especie */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {speciesOptions.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, lostListSpecies === s && styles.filterChipActive]}
            onPress={() => setLostListSpecies(s)}
            activeOpacity={0.85}
          >
            <Text style={[styles.filterChipText, lostListSpecies === s && styles.filterChipTextActive]}>
              {s === 'Todos' ? '🐾 Todos' : s === 'Perro' ? '🐶 Perros' : '🐱 Gatos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filtro comuna */}
      {communes.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: 8 }}>
            {communes.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.filterChip, lostListCommune === c && styles.filterChipActive]}
                onPress={() => setLostListCommune(c)}
                activeOpacity={0.85}
              >
                <Text style={[styles.filterChipText, lostListCommune === c && styles.filterChipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      <Text style={{ color: C.textLight, fontSize: 13, fontWeight: '600' }}>
        {filtered.length} mascota{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
      </Text>

      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>🎉</Text>
          <Text style={styles.emptyStateTitle}>Sin resultados</Text>
          <Text style={styles.emptyStateHint}>Prueba cambiando los filtros.</Text>
        </View>
      ) : (
        filtered.map(pet => (
          <TouchableOpacity
            key={pet.id}
            style={styles.petCard}
            activeOpacity={0.85}
            onPress={() => { setSelectedLostPet(pet); setScreen('LostPetDetail'); }}
          >
            <View style={styles.petCardPhotoWrap}>
              {lostPetSignedUrls[pet.id] ? (
                <Image source={{ uri: lostPetSignedUrls[pet.id]! }} style={styles.petCardPhoto} resizeMode="cover" />
              ) : (
                <View style={[styles.petCardPhoto, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitials}>{initialsFromName(pet.name)}</Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.petCardName}>{pet.name}</Text>
              <Text style={styles.petCardBreed}>{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</Text>
              {pet.lost_commune && <Text style={{ fontSize: 12, color: C.textLight, fontWeight: '600' }}>📍 {pet.lost_commune}</Text>}
            </View>
            <Text style={styles.petCardArrow}>›</Text>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}
