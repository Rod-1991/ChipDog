import { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../constants/colors';
import Svg, { Circle } from 'react-native-svg';
import type { Pet, Screen } from '../types';
import { useAppStore } from '../store/app';
import { useUserStore } from '../store/user';
import { usePetsStore } from '../store/pets';
import { useVaccinesStore } from '../store/vaccines';
import { useCoOwnerStore } from '../store/coOwner';

function PetArcAvatar({ pet, photoUrl, size = 58 }: { pet: Pet; photoUrl: string | null; size?: number }) {
  const R = (size - 8) / 2;
  const circ = 2 * Math.PI * R;
  const fields = [pet.breed, pet.color, pet.birth_year, pet.weight_kg, pet.sex, pet.chip_number, pet.photo_url];
  const pct = fields.filter(Boolean).length / fields.length;
  const dash = circ * pct;
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: 'absolute', top: 4, left: 4, width: size - 8, height: size - 8, borderRadius: (size - 8) / 2, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {photoUrl
          ? <Image source={{ uri: photoUrl }} style={{ width: size - 8, height: size - 8 }} resizeMode="cover" />
          : <Text style={{ fontSize: size * 0.42 }}>{pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}</Text>}
      </View>
      <Svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
        <Circle cx={size / 2} cy={size / 2} r={R} stroke={C.border} strokeWidth={4} fill="none" />
        {pct > 0 && <Circle cx={size / 2} cy={size / 2} r={R} stroke={C.primaryDark} strokeWidth={4} fill="none" strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4} strokeLinecap="round" />}
      </Svg>
    </View>
  );
}

type Props = { handleLogout: () => void };

export default function HomeScreen({ handleLogout }: Props) {
  const setScreen = useAppStore((s) => s.setScreen);
  const { userName, userProfile } = useUserStore();
  const { pets, petSignedUrls, loadPetDetail } = usePetsStore();
  const upcomingVaccinesCount = useVaccinesStore((s) => s.upcomingVaccinesCount);
  const pendingInvitations = useCoOwnerStore((s) => s.pendingInvitations);

  const [showNotifs, setShowNotifs] = useState(false);
  const [notifsRead, setNotifsRead] = useState(false);

  const firstName = userProfile?.first_name || userName?.split(' ')[0] || '';
  const lastName = userProfile?.last_name || userName?.split(' ')[1] || '';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';
  const displayName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase() : 'tú';

  const featured = pets.find(p => p.is_featured) ?? pets[0] ?? null;
  const featuredPhoto = featured ? petSignedUrls[featured.id] ?? null : null;
  const ownLost = pets.filter(p => p.is_lost);

  const profileFields = [userProfile?.first_name, userProfile?.last_name, userProfile?.phone, userProfile?.rut, userProfile?.commune, userProfile?.sex, userProfile?.birth_year];
  const profileComplete = profileFields.filter(Boolean).length === profileFields.length;

  const notifications = useMemo(() => {
    const list: { id: string; icon: string; title: string; sub: string; action?: () => void; color?: string }[] = [
      { id: 'welcome', icon: '🐾', title: `¡Bienvenido a ChipDog, ${displayName}!`, sub: 'Ya eres parte de ChipDog. Miles de mascotas en Chile tienen su hogar digital.', color: C.primaryLight, action: () => setShowNotifs(false) },
    ];
    if (!profileComplete) list.push({ id: 'profile', icon: '👤', title: 'Completa tu perfil', sub: 'Faltan datos personales — te toma 1 minuto', action: () => { setShowNotifs(false); setScreen('Profile'); }, color: C.primaryLight });
    pets.forEach(pet => {
      const fields = [pet.breed, pet.color, pet.birth_year, pet.weight_kg, pet.photo_url];
      if (fields.filter(Boolean).length / fields.length < 0.6) {
        list.push({ id: `pet-${pet.id}`, icon: pet.species === 'cat' ? '🐈' : '🐕', title: `Perfil de ${pet.name} incompleto`, sub: 'Falta raza, color, peso o foto', action: () => { setShowNotifs(false); loadPetDetail(pet.id).then(() => setScreen('PetDetail')); }, color: '#F3EEFF' });
      }
    });
    if (upcomingVaccinesCount > 0) list.push({ id: 'vaccines', icon: '💉', title: `${upcomingVaccinesCount} vacuna${upcomingVaccinesCount > 1 ? 's' : ''} próxima${upcomingVaccinesCount > 1 ? 's' : ''}`, sub: 'Vence en los próximos 30 días', action: () => { setShowNotifs(false); setScreen('PetList'); }, color: '#FFF8E1' });
    if (pendingInvitations.length > 0) list.push({ id: 'invites', icon: '📩', title: `${pendingInvitations.length} invitación${pendingInvitations.length > 1 ? 'es' : ''} pendiente${pendingInvitations.length > 1 ? 's' : ''}`, sub: 'Te invitaron como co-dueño', action: () => { setShowNotifs(false); setScreen('Profile'); }, color: '#E0FAF6' });
    return list;
  }, [displayName, profileComplete, pets, upcomingVaccinesCount, pendingInvitations]);

  const notifCount = notifications.length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 90 }}>
        {/* Header */}
        <View style={{ backgroundColor: C.primaryDark, paddingTop: 56, paddingBottom: 42, paddingHorizontal: 20, borderBottomLeftRadius: 34, borderBottomRightRadius: 34 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ fontSize: 19, fontWeight: '900' }}>
              <Text style={{ color: C.white }}>Chip</Text><Text style={{ color: C.dark }}>Dog</Text><Text> 🐾</Text>
            </Text>
            <TouchableOpacity onPress={() => { setShowNotifs(true); setNotifsRead(true); }} activeOpacity={0.8}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18 }}>🔔</Text>
                {notifCount > 0 && !notifsRead && (
                  <View style={{ position: 'absolute', top: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#FF4757', borderWidth: 2, borderColor: C.primaryDark, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 8, fontWeight: '900', color: '#fff' }}>{notifCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 26, fontWeight: '900', color: C.white }}>Hola, <Text style={{ color: C.accent }}>{displayName}</Text></Text>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '700', marginTop: 3 }}>
            {pets.length > 0 ? `${pets.length} compañero${pets.length > 1 ? 's' : ''} te espera${pets.length > 1 ? 'n' : ''} hoy` : 'Agrega tu primera mascota'}
          </Text>
        </View>

        {/* Card mascota destacada */}
        {featured && (
          <TouchableOpacity style={{ marginHorizontal: 16, marginTop: -22, backgroundColor: C.white, borderRadius: 22, padding: 14, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 13 }} activeOpacity={0.85} onPress={async () => { await loadPetDetail(featured.id); setScreen('PetDetail'); }}>
            <PetArcAvatar pet={featured} photoUrl={featuredPhoto} size={62} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '900', color: C.dark }}>{featured.name}</Text>
              <Text style={{ fontSize: 11, color: C.textMuted, fontWeight: '700' }}>{featured.breed ?? (featured.species === 'dog' ? 'Perro' : featured.species === 'cat' ? 'Gato' : 'Mascota')} · Destacada</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                {featured.birth_year && <View style={{ backgroundColor: C.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 11, fontWeight: '800', color: C.primaryDark }}>{new Date().getFullYear() - featured.birth_year} años</Text></View>}
                {featured.weight_kg && <View style={{ backgroundColor: C.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 11, fontWeight: '800', color: C.primaryDark }}>{featured.weight_kg} kg</Text></View>}
                {upcomingVaccinesCount > 0 && <View style={{ backgroundColor: '#FFF0E6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 11, fontWeight: '800', color: '#C05E1A' }}>Vacuna {upcomingVaccinesCount === 1 ? 'próxima' : `${upcomingVaccinesCount} próximas`}</Text></View>}
              </View>
            </View>
          </TouchableOpacity>
        )}

        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          {ownLost.map(p => (
            <TouchableOpacity key={p.id} style={{ backgroundColor: '#FFF0E6', borderRadius: 14, padding: 11, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#FFD4B3', marginBottom: 6 }} activeOpacity={0.85} onPress={async () => { await loadPetDetail(p.id); setScreen('PetDetail'); }}>
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: C.accent }} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#7A3A10', flex: 1 }}>{p.name} está reportada como perdida</Text>
              <Text style={{ fontSize: 14, color: C.accent, fontWeight: '900' }}>›</Text>
            </TouchableOpacity>
          ))}

          {pets.length > 0 && (
            <>
              <Text style={{ fontSize: 11, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 12, marginBottom: 8 }}>Mis mascotas</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', gap: 9 }}>
                  {pets.map(pet => (
                    <TouchableOpacity key={pet.id} style={{ backgroundColor: C.white, borderRadius: 16, padding: 11, paddingHorizontal: 12, minWidth: 76, alignItems: 'center', borderWidth: 1, borderColor: pet.is_lost ? '#FFD4B3' : C.border }} activeOpacity={0.85} onPress={async () => { await loadPetDetail(pet.id); setScreen('PetDetail'); }}>
                      {petSignedUrls[pet.id]
                        ? <Image source={{ uri: petSignedUrls[pet.id] ?? undefined }} style={{ width: 36, height: 36, borderRadius: 18, marginBottom: 4 }} resizeMode="cover" />
                        : <Text style={{ fontSize: 26, marginBottom: 4 }}>{pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}</Text>}
                      <Text style={{ fontSize: 12, fontWeight: '800', color: C.dark }}>{pet.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, marginRight: 2, backgroundColor: pet.is_lost ? C.danger : C.success }} />
                        <Text style={{ fontSize: 10, fontWeight: '700', color: C.textMuted }}>{pet.is_lost ? 'Perdida' : 'Casa'}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          <Text style={{ fontSize: 11, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 16, marginBottom: 8 }}>Acciones rápidas</Text>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={{ flex: 1, backgroundColor: C.primaryDark, borderRadius: 18, padding: 16 }} activeOpacity={0.85} onPress={() => setScreen('FoundTag')}>
                <Text style={{ fontSize: 28, marginBottom: 8 }}>📷</Text>
                <Text style={{ fontSize: 14, fontWeight: '900', color: C.white }}>Escanear tag</Text>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginTop: 2 }}>Encontré una mascota</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, backgroundColor: C.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border }} activeOpacity={0.85} onPress={() => setScreen('AddPet')}>
                <Text style={{ fontSize: 28, marginBottom: 8 }}>➕</Text>
                <Text style={{ fontSize: 14, fontWeight: '900', color: C.dark }}>Agregar mascota</Text>
                <Text style={{ fontSize: 11, color: C.textMuted, fontWeight: '600', marginTop: 2 }}>Registrar nuevo compañero</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Panel notificaciones */}
      <Modal visible={showNotifs} transparent animationType="fade" onRequestClose={() => setShowNotifs(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setShowNotifs(false)}>
          <Pressable onPress={() => {}} style={{ position: 'absolute', top: 100, right: 16, left: 16, backgroundColor: C.white, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 12, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <Text style={{ fontSize: 15, fontWeight: '900', color: C.dark }}>Notificaciones</Text>
              {notifCount > 0 && <View style={{ backgroundColor: '#FF4757', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 }}><Text style={{ fontSize: 11, fontWeight: '900', color: '#fff' }}>{notifCount}</Text></View>}
            </View>
            {notifications.length === 0 ? (
              <View style={{ padding: 28, alignItems: 'center' }}>
                <Text style={{ fontSize: 32 }}>✅</Text>
                <Text style={{ color: C.textMuted, fontSize: 13, fontWeight: '700', marginTop: 8 }}>Todo al día, sin pendientes</Text>
              </View>
            ) : notifications.map((n, i) => (
              <TouchableOpacity key={n.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 13, borderBottomWidth: i < notifications.length - 1 ? 1 : 0, borderBottomColor: C.border, backgroundColor: n.color ?? C.white }} activeOpacity={0.75} onPress={n.action ?? (() => setShowNotifs(false))}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20 }}>{n.icon}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: C.dark }}>{n.title}</Text>
                  <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{n.sub}</Text>
                </View>
                <Text style={{ fontSize: 18, color: C.textMuted }}>›</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Navbar inferior */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border, flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, paddingBottom: 24 }}>
        {([
          { icon: '🏠', label: 'Inicio', target: 'Home' },
          { icon: '🐾', label: 'Mascotas', target: 'PetList' },
          { icon: '🗺️', label: 'Mapa', target: 'NearbyMap' },
          { icon: '👤', label: 'Perfil', target: 'Profile' },
        ] as { icon: string; label: string; target: Screen }[]).map(tab => (
          <TouchableOpacity key={tab.label} style={{ alignItems: 'center', gap: 3 }} activeOpacity={0.7} onPress={() => setScreen(tab.target)}>
            <Text style={{ fontSize: 20 }}>{tab.icon}</Text>
            <Text style={{ fontSize: 9, fontWeight: '800', color: tab.target === 'Home' ? C.primaryDark : C.textMuted }}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
