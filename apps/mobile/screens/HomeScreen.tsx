import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../constants/colors';
import Svg, { Circle } from 'react-native-svg';
import type { Pet, PetMemberInvitation, Screen, UserProfile } from '../types';

type HomeScreenProps = {
  pets: Pet[];
  petSignedUrls: Record<number, string | null>;
  userProfile: UserProfile | null;
  userName: string | null;
  upcomingVaccinesCount: number;
  pendingInvitations: PetMemberInvitation[];
  handleLogout: () => void;
  loadPetDetail: (petId: number) => Promise<void>;
  setScreen: (s: Screen) => void;
};

function PetArcAvatar({ pet, photoUrl, size = 58 }: { pet: Pet; photoUrl: string | null; size?: number }) {
  const R = (size - 8) / 2;
  const circ = 2 * Math.PI * R;
  // % completado del perfil de la mascota (campos básicos)
  const fields = [pet.breed, pet.color, pet.birth_year, pet.weight_kg, pet.sex, pet.chip_number, pet.photo_url];
  const filled = fields.filter(Boolean).length;
  const pct = filled / fields.length;
  const dash = circ * pct;

  return (
    <View style={{ width: size, height: size }}>
      {/* Foto o emoji */}
      <View style={{
        position: 'absolute', top: 4, left: 4,
        width: size - 8, height: size - 8, borderRadius: (size - 8) / 2,
        backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={{ width: size - 8, height: size - 8 }} resizeMode="cover" />
        ) : (
          <Text style={{ fontSize: size * 0.42 }}>{pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}</Text>
        )}
      </View>
      {/* Arco SVG */}
      <Svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
        {/* Track gris */}
        <Circle cx={size / 2} cy={size / 2} r={R} stroke={C.border} strokeWidth={4} fill="none" />
        {/* Arco progreso */}
        {pct > 0 && (
          <Circle
            cx={size / 2} cy={size / 2} r={R}
            stroke={C.primaryDark} strokeWidth={4} fill="none"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={circ / 4}
            strokeLinecap="round"
          />
        )}
      </Svg>
    </View>
  );
}

export default function HomeScreen({
  pets, petSignedUrls, userProfile, userName,
  upcomingVaccinesCount, pendingInvitations, handleLogout, loadPetDetail, setScreen,
}: HomeScreenProps) {
  // Nombre y apellido
  const firstName = userProfile?.first_name || userName?.split(' ')[0] || '';
  const lastName = userProfile?.last_name || userName?.split(' ')[1] || '';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';
  const displayName = firstName
    ? firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
    : 'tú';

  // Mascota destacada
  const featured = pets.find(p => p.is_featured) ?? pets[0] ?? null;
  const featuredPhoto = featured ? petSignedUrls[featured.id] ?? null : null;

  // Mascota perdida propia
  const ownLost = pets.filter(p => p.is_lost);

  // % perfil usuario
  const profileFields = [userProfile?.first_name, userProfile?.last_name, userProfile?.phone, userProfile?.rut, userProfile?.commune, userProfile?.sex, userProfile?.birth_year];
  const profileComplete = profileFields.filter(Boolean).length === profileFields.length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 90 }}>

        {/* Header */}
        <View style={{
          backgroundColor: C.primaryDark,
          paddingTop: 56, paddingBottom: 42, paddingHorizontal: 20,
          borderBottomLeftRadius: 34, borderBottomRightRadius: 34,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ fontSize: 19, fontWeight: '900' }}>
              <Text style={{ color: C.white }}>Chip</Text>
              <Text style={{ color: C.dark }}>Dog</Text>
              <Text> 🐾</Text>
            </Text>
            <TouchableOpacity onPress={handleLogout} activeOpacity={0.8}>
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: C.white }}>{initials}</Text>
              </View>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 26, fontWeight: '900', color: C.white }}>
            Hola, <Text style={{ color: C.accent }}>{displayName}</Text> 👋
          </Text>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '700', marginTop: 3 }}>
            {pets.length > 0
              ? `${pets.length} compañero${pets.length > 1 ? 's' : ''} te espera${pets.length > 1 ? 'n' : ''} hoy`
              : 'Agrega tu primera mascota'}
          </Text>
        </View>

        {/* Card mascota destacada */}
        {featured && (
          <TouchableOpacity
            style={{
              marginHorizontal: 16, marginTop: -22,
              backgroundColor: C.white, borderRadius: 22,
              padding: 14, borderWidth: 1, borderColor: C.border,
              flexDirection: 'row', alignItems: 'center', gap: 13,
            }}
            activeOpacity={0.85}
            onPress={async () => { await loadPetDetail(featured.id); setScreen('PetDetail'); }}
          >
            <PetArcAvatar pet={featured} photoUrl={featuredPhoto} size={62} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '900', color: C.dark }}>{featured.name}</Text>
              <Text style={{ fontSize: 11, color: C.textMuted, fontWeight: '700' }}>
                {featured.breed ?? (featured.species === 'dog' ? 'Perro' : featured.species === 'cat' ? 'Gato' : 'Mascota')} · Destacada
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                {featured.birth_year && (
                  <View style={{ backgroundColor: C.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: C.primaryDark }}>
                      {new Date().getFullYear() - featured.birth_year} años
                    </Text>
                  </View>
                )}
                {featured.weight_kg && (
                  <View style={{ backgroundColor: C.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: C.primaryDark }}>{featured.weight_kg} kg</Text>
                  </View>
                )}
                {upcomingVaccinesCount > 0 && (
                  <View style={{ backgroundColor: '#FFF0E6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#C05E1A' }}>
                      Vacuna {upcomingVaccinesCount === 1 ? 'próxima' : `${upcomingVaccinesCount} próximas`}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}

        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>

          {/* Alertas mascotas perdidas propias */}
          {ownLost.map(p => (
            <TouchableOpacity
              key={p.id}
              style={{
                backgroundColor: '#FFF0E6', borderRadius: 14,
                padding: 11, paddingHorizontal: 14,
                flexDirection: 'row', alignItems: 'center', gap: 10,
                borderWidth: 1, borderColor: '#FFD4B3', marginBottom: 6,
              }}
              activeOpacity={0.85}
              onPress={async () => { await loadPetDetail(p.id); setScreen('PetDetail'); }}
            >
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: C.accent }} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#7A3A10', flex: 1 }}>
                {p.name} está reportada como perdida
              </Text>
              <Text style={{ fontSize: 14, color: C.accent, fontWeight: '900' }}>›</Text>
            </TouchableOpacity>
          ))}

          {/* Mis mascotas */}
          {pets.length > 0 && (
            <>
              <Text style={{ fontSize: 11, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 12, marginBottom: 8 }}>
                Mis mascotas
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', gap: 9 }}>
                  {pets.map(pet => (
                    <TouchableOpacity
                      key={pet.id}
                      style={{
                        backgroundColor: C.white, borderRadius: 16,
                        padding: 11, paddingHorizontal: 12, minWidth: 76,
                        alignItems: 'center',
                        borderWidth: 1, borderColor: pet.is_lost ? '#FFD4B3' : C.border,
                      }}
                      activeOpacity={0.85}
                      onPress={async () => { await loadPetDetail(pet.id); setScreen('PetDetail'); }}
                    >
                      {petSignedUrls[pet.id] ? (
                        <Image
                          source={{ uri: petSignedUrls[pet.id] ?? undefined }}
                          style={{ width: 36, height: 36, borderRadius: 18, marginBottom: 4 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={{ fontSize: 26, marginBottom: 4 }}>
                          {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
                        </Text>
                      )}
                      <Text style={{ fontSize: 12, fontWeight: '800', color: C.dark }}>{pet.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <View style={{
                          width: 6, height: 6, borderRadius: 3, marginRight: 2,
                          backgroundColor: pet.is_lost ? C.danger : C.success,
                        }} />
                        <Text style={{ fontSize: 10, fontWeight: '700', color: C.textMuted }}>
                          {pet.is_lost ? 'Perdida' : 'Casa'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {/* Accesos rápidos */}
          <Text style={{ fontSize: 11, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 16, marginBottom: 8 }}>
            Accesos rápidos
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[
              {
                icon: '🗺️', title: 'Mapa perdidos', sub: 'Alertas cercanas',
                screen: 'NearbyMap' as Screen,
                badge: null,
              },
              {
                icon: '📷', title: 'Escanear tag', sub: 'Encontré mascota',
                screen: 'FoundTag' as Screen,
                badge: null,
              },
              {
                icon: '💉', title: 'Vacunas', sub: 'Vencimientos',
                screen: 'PetList' as Screen,
                badge: upcomingVaccinesCount > 0 ? { label: `${upcomingVaccinesCount} próxima${upcomingVaccinesCount > 1 ? 's' : ''}`, color: '#FFF8E1', text: '#7A4500' } : null,
              },
              {
                icon: '👤', title: 'Mi perfil', sub: 'Datos personales',
                screen: 'Profile' as Screen,
                badge: { label: profileComplete ? 'Completo' : 'Incompleto', color: profileComplete ? C.primaryLight : '#FFF0E6', text: profileComplete ? C.primaryDark : '#7A3A10' },
              },
            ].map(item => (
              <TouchableOpacity
                key={item.title}
                style={{
                  width: '47.5%', backgroundColor: C.white,
                  borderRadius: 18, padding: 14, paddingHorizontal: 12,
                  borderWidth: 1, borderColor: C.border,
                }}
                activeOpacity={0.85}
                onPress={() => setScreen(item.screen)}
              >
                <Text style={{ fontSize: 26, marginBottom: 7 }}>{item.icon}</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: C.dark }}>{item.title}</Text>
                <Text style={{ fontSize: 11, color: C.textMuted, fontWeight: '600', marginTop: 2 }}>{item.sub}</Text>
                {item.badge && (
                  <View style={{ backgroundColor: item.badge.color, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: item.badge.text }}>{item.badge.label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

        </View>
      </ScrollView>

      {/* Navbar inferior */}
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
          const active = tab.target === 'Home';
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
