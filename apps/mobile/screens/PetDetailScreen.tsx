import { Alert, Button, Image, Switch, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { styles } from '../styles';
import { C } from '../constants/colors';
import Card from '../components/Card';
import { initialsFromName } from '../utils/helpers';
import type { Pet, Screen } from '../types';

type PetDetailScreenProps = {
  selectedPet: Pet | null;
  petPhotoSignedUrl: string | null;
  userId: string | null;
  loading: boolean;
  setLoading: (v: boolean) => void;
  setSelectedPet: (pet: Pet | null) => void;
  pickAndUploadPetPhoto: (petId: number) => void;
  openLostMap: () => void;
  updatePetLostStatus: (petId: number, isLost: boolean) => void;
  setIsEditingPetDetail: (v: boolean) => void;
  fetchPets: () => Promise<void>;
  setScreen: (s: Screen) => void;
};

export default function PetDetailScreen({
  selectedPet, petPhotoSignedUrl, userId, loading, setLoading, setSelectedPet,
  pickAndUploadPetPhoto, openLostMap, updatePetLostStatus,
  setIsEditingPetDetail, fetchPets, setScreen,
}: PetDetailScreenProps) {
  if (!selectedPet) {
    return (
      <View style={styles.form}>
        <Text>No hay mascota seleccionada.</Text>
        <Button title="Volver" onPress={() => setScreen('PetList')} />
      </View>
    );
  }

  const statusLabel = selectedPet.is_lost ? 'Perdido' : 'En casa';
  const badgeStyle = selectedPet.is_lost ? styles.badgeDanger : styles.badgeOk;
  const badgeTextStyle = selectedPet.is_lost ? styles.badgeTextDanger : styles.badgeTextOk;

  return (
    <View style={{ gap: 16 }}>
      {/* Botón atrás */}
      <TouchableOpacity style={styles.inlineBackBtn} onPress={() => setScreen('PetList')} activeOpacity={0.7}>
        <Text style={styles.inlineBackArrow}>‹</Text>
        <Text style={styles.inlineBackLabel}>Mis Mascotas</Text>
      </TouchableOpacity>

      {/* Hero */}
      <View style={styles.petHero}>
        <TouchableOpacity
          style={styles.petHeroAvatarWrap}
          onPress={() => pickAndUploadPetPhoto(selectedPet.id)}
          disabled={loading}
          activeOpacity={0.85}
        >
          {petPhotoSignedUrl ? (
            <Image source={{ uri: petPhotoSignedUrl }} style={styles.petHeroAvatar} resizeMode="cover" />
          ) : (
            <View style={[styles.petHeroAvatar, styles.avatarPlaceholder]}>
              <Text style={[styles.avatarInitials, { fontSize: 36 }]}>{initialsFromName(selectedPet.name)}</Text>
            </View>
          )}
          <View style={styles.petHeroCameraBtn}>
            <Text style={{ fontSize: 14 }}>📷</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.petHeroName}>{selectedPet.name}</Text>
        <Text style={styles.petHeroBreed}>
          {selectedPet.species}{selectedPet.breed ? ` · ${selectedPet.breed}` : ''}
        </Text>
        <View style={[styles.badge, badgeStyle, { alignSelf: 'center', marginTop: 6 }]}>
          <Text style={[styles.badgeText, badgeTextStyle]}>{selectedPet.is_lost ? '🚨 Perdido' : '🏠 En casa'}</Text>
        </View>
      </View>

      {/* Switch perdido — solo dueño */}
      {(!selectedPet.owner_id || !userId || selectedPet.owner_id === userId) && (
      <Card>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>🚨  Activar modo perdido</Text>
          <Switch
            value={selectedPet.is_lost}
            onValueChange={(v) => v ? openLostMap() : updatePetLostStatus(selectedPet.id, false)}
            disabled={loading}
            trackColor={{ false: C.border, true: C.danger }}
            thumbColor={C.white}
          />
        </View>
        {selectedPet.is_lost && (
          <TouchableOpacity onPress={openLostMap} style={{ marginTop: 8 }}>
            <Text style={{ color: C.primary, fontWeight: '700', fontSize: 13 }}>
              📍 Editar ubicación y radio
            </Text>
          </TouchableOpacity>
        )}
      </Card>
      )}

      {/* Nav grid 2x2 */}
      <View style={styles.navGrid}>
        <TouchableOpacity style={[styles.navGridCard, { borderTopColor: C.primary }]} onPress={() => setScreen('PetVetHistory')} activeOpacity={0.85}>
          <Text style={styles.navGridIcon}>🏥</Text>
          <Text style={styles.navGridTitle}>Historial Vet</Text>
          <Text style={styles.navGridHint}>Visitas y controles</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.navGridCard, { borderTopColor: C.success }]} onPress={() => setScreen('PetVaccines')} activeOpacity={0.85}>
          <Text style={styles.navGridIcon}>💉</Text>
          <Text style={styles.navGridTitle}>Vacunas</Text>
          <Text style={styles.navGridHint}>Cartilla al día</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.navGridCard, { borderTopColor: C.warning }]} onPress={() => { setIsEditingPetDetail(false); setScreen('PetInfo'); }} activeOpacity={0.85}>
          <Text style={styles.navGridIcon}>ℹ️</Text>
          <Text style={styles.navGridTitle}>Información</Text>
          <Text style={styles.navGridHint}>Perfil completo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.navGridCard, { borderTopColor: C.accent }]} onPress={() => { setIsEditingPetDetail(false); setScreen('PetContact'); }} activeOpacity={0.85}>
          <Text style={styles.navGridIcon}>📞</Text>
          <Text style={styles.navGridTitle}>Contacto</Text>
          <Text style={styles.navGridHint}>Dueño y emergencias</Text>
        </TouchableOpacity>
      </View>

      {(!selectedPet?.owner_id || !userId || selectedPet.owner_id === userId) && (
        <TouchableOpacity style={styles.btnPrimary} onPress={() => setScreen('LinkTag')} activeOpacity={0.85}>
          <Text style={styles.btnPrimaryText}>🏷️  Vincular tag NFC / QR</Text>
        </TouchableOpacity>
      )}

      {(!selectedPet?.owner_id || !userId || selectedPet.owner_id === userId) && (
        <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: C.dark }]} onPress={() => setScreen('PetMembers')} activeOpacity={0.85}>
          <Text style={styles.btnPrimaryText}>👥  Co-dueños</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.btnGhost} onPress={() => setScreen('Home')} activeOpacity={0.85}>
        <Text style={styles.btnGhostText}>← Volver a mis mascotas</Text>
      </TouchableOpacity>

      {selectedPet?.owner_id === userId && (
        <TouchableOpacity
          style={{ alignItems: 'center', paddingVertical: 10 }}
          onPress={() => {
            Alert.alert(
              'Eliminar mascota',
              `¿Estás seguro que quieres eliminar a ${selectedPet.name}? Esta acción no se puede deshacer.`,
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Eliminar', style: 'destructive', onPress: async () => {
                  setLoading(true);
                  try {
                    const { error } = await supabase.from('pets').delete().eq('id', selectedPet.id);
                    if (error) { Alert.alert('Error', error.message); return; }
                    setSelectedPet(null);
                    await fetchPets();
                    setScreen('Home');
                  } finally { setLoading(false); }
                }}
              ]
            );
          }}
          activeOpacity={0.7}>
          <Text style={{ color: C.danger, fontWeight: '600', fontSize: 14 }}>Eliminar mascota</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
