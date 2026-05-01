import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../constants/colors';
import type { Pet, Screen } from '../types';

const CARD_BG = ['#E0FAF6', '#FFF0E6', '#E8F8F0', '#E8F4FF', '#F3EEFF', '#FFF8E1'];

type PetListScreenProps = {
  pets: Pet[];
  petSignedUrls: Record<number, string | null>;
  loadPetDetail: (petId: number) => Promise<void>;
  togglePetFeatured: (petId: number, currentFeatured: boolean) => Promise<void>;
  setScreen: (s: Screen) => void;
};

export default function PetListScreen({
  pets, petSignedUrls, loadPetDetail, togglePetFeatured, setScreen,
}: PetListScreenProps) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>

      {/* Header fijo */}
      <View style={{
        backgroundColor: C.primaryDark,
        paddingTop: 56, paddingBottom: 22, paddingHorizontal: 20,
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
      }}>
        <Text style={{ fontSize: 26, fontWeight: '900', color: C.white }}>Mis mascotas 🐾</Text>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '700', marginTop: 3 }}>
          {pets.length > 0
            ? `${pets.length} compañero${pets.length > 1 ? 's' : ''} registrado${pets.length > 1 ? 's' : ''}`
            : 'Aún no tienes mascotas'}
        </Text>
      </View>

      {/* Botón agregar fijo */}
      <TouchableOpacity
        style={{
          backgroundColor: C.accent, borderRadius: 16,
          paddingVertical: 13, paddingHorizontal: 18,
          margin: 14, marginBottom: 2,
          flexDirection: 'row', alignItems: 'center', gap: 9,
        }}
        activeOpacity={0.85}
        onPress={() => setScreen('AddPet')}
      >
        <Text style={{ fontSize: 20 }}>＋</Text>
        <Text style={{ fontSize: 15, fontWeight: '900', color: C.white }}>Agregar nueva mascota</Text>
      </TouchableOpacity>

      {/* Grid scrolleable */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 90 }}>
        {pets.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 }}>
            <Text style={{ fontSize: 54 }}>🐶</Text>
            <Text style={{ fontSize: 17, fontWeight: '900', color: C.dark, marginTop: 12, textAlign: 'center' }}>
              Aún no tienes mascotas
            </Text>
            <Text style={{ fontSize: 13, color: C.textMuted, fontWeight: '600', marginTop: 6, textAlign: 'center' }}>
              Agrega a tu peludo y empieza a cuidarlo como se merece.
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 14, paddingTop: 14 }}>
            {pets.map((pet, i) => {
              const bg = CARD_BG[i % CARD_BG.length];
              const photo = petSignedUrls[pet.id] ?? null;
              return (
                <TouchableOpacity
                  key={pet.id}
                  style={{
                    width: '47%', backgroundColor: C.white,
                    borderRadius: 22, overflow: 'hidden',
                    borderWidth: 1, borderColor: pet.is_lost ? '#FFD4B3' : C.border,
                  }}
                  activeOpacity={0.85}
                  onPress={async () => { await loadPetDetail(pet.id); setScreen('PetDetail'); }}
                >
                  {/* Foto */}
                  <View style={{ height: 120, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
                    {photo ? (
                      <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                      <Text style={{ fontSize: 54 }}>
                        {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
                      </Text>
                    )}
                    {/* Badge perdida */}
                    {pet.is_lost && (
                      <View style={{
                        position: 'absolute', top: 8, right: 8,
                        backgroundColor: C.danger, borderRadius: 9,
                        paddingHorizontal: 8, paddingVertical: 4,
                      }}>
                        <Text style={{ fontSize: 9, fontWeight: '900', color: C.white }}>⚠ Perdida</Text>
                      </View>
                    )}
                    {/* Estrella destacar */}
                    <TouchableOpacity
                      style={{
                        position: 'absolute', top: 8, left: 8,
                        width: 28, height: 28, borderRadius: 14,
                        backgroundColor: pet.is_featured ? C.accent : 'rgba(0,0,0,0.18)',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                      activeOpacity={0.8}
                      onPress={() => togglePetFeatured(pet.id, pet.is_featured ?? false)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Text style={{ fontSize: 14 }}>{pet.is_featured ? '⭐' : '☆'}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Info */}
                  <View style={{ padding: 10, paddingHorizontal: 14, paddingBottom: 13 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: C.dark }}>{pet.name}</Text>
                    <Text style={{ fontSize: 10, color: C.textMuted, fontWeight: '700', marginTop: 2 }}>
                      {pet.breed
                        ? `${pet.breed}${pet.birth_year ? ` · ${new Date().getFullYear() - pet.birth_year} años` : ''}`
                        : pet.species === 'dog' ? 'Perro' : pet.species === 'cat' ? 'Gato' : 'Mascota'}
                    </Text>
                    <View style={{
                      alignSelf: 'flex-start', marginTop: 6,
                      backgroundColor: pet.is_lost ? '#FFF0E6' : C.primaryLight,
                      borderRadius: 9, paddingHorizontal: 10, paddingVertical: 3,
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: pet.is_lost ? '#7A3A10' : C.primaryDark }}>
                        {pet.is_lost ? '⚠ Perdida' : '🏠 En casa'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Navbar fijo */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border,
        flexDirection: 'row', justifyContent: 'space-around',
        paddingVertical: 10, paddingBottom: 24,
      }}>
        {[
          { icon: '🏠', label: 'Inicio', target: 'Home' as Screen },
          { icon: '🐾', label: 'Mascotas', target: 'PetList' as Screen },
          { icon: '🗺️', label: 'Mapa', target: 'NearbyMap' as Screen },
          { icon: '👤', label: 'Perfil', target: 'Profile' as Screen },
        ].map(tab => {
          const active = tab.target === 'PetList';
          return (
            <TouchableOpacity
              key={tab.label}
              style={{ alignItems: 'center', gap: 3 }}
              activeOpacity={0.7}
              onPress={() => setScreen(tab.target)}
            >
              <Text style={{ fontSize: 20 }}>{tab.icon}</Text>
              <Text style={{ fontSize: 9, fontWeight: '800', color: active ? C.primaryDark : C.textMuted }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
