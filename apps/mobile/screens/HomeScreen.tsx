import { Image, Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import { C } from '../constants/colors';
import type { LostPetPin, PetMemberInvitation, Screen, UserProfile } from '../types';

type HomeScreenProps = {
  allLostPets: LostPetPin[];
  userProfile: UserProfile | null;
  userName: string | null;
  pendingInvitations: PetMemberInvitation[];
  handleLogout: () => void;
  setScreen: (s: Screen) => void;
};

export default function HomeScreen({
  allLostPets, userProfile, userName, pendingInvitations, handleLogout, setScreen,
}: HomeScreenProps) {
  const lostCount = allLostPets.length;
  const rawFirst = userProfile?.first_name || userName?.split(' ')[0] || null;
  const firstName = rawFirst
    ? rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1).toLowerCase()
    : null;

  return (
    <View style={styles.form}>
      {/* Logo + nombre */}
      <View style={styles.homeLogoRow}>
        <Image source={require('../assets/icon.png')} style={styles.homeLogoImg} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={styles.homeLogoTitle}>ChipDog</Text>
          {firstName && <Text style={styles.homeLogoSub}>Hola, {firstName}</Text>}
        </View>
      </View>

      {/* Alerta perdidos */}
      {lostCount > 0 && (
        <TouchableOpacity style={styles.nearbyAlertBanner} onPress={() => setScreen('NearbyMap')} activeOpacity={0.85}>
          <View style={styles.nearbyAlertDot} />
          <Text style={styles.nearbyAlertTitle}>
            {lostCount} mascota{lostCount > 1 ? 's' : ''} perdida{lostCount > 1 ? 's' : ''} en tu área
          </Text>
          <Text style={styles.nearbyAlertArrow}>›</Text>
        </TouchableOpacity>
      )}

      {/* Cards de acciones */}
      <TouchableOpacity style={styles.dashCard} onPress={() => setScreen('PetList')} activeOpacity={0.85}>
        <View style={[styles.dashCardIconWrap, { backgroundColor: C.primaryLight }]}>
          <Text style={styles.dashCardIconEmoji}>🐾</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.dashCardTitle}>Mis Mascotas</Text>
          <Text style={styles.dashCardHint}>Perfiles, vacunas e historial</Text>
        </View>
        <Text style={styles.dashCardArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.dashCard} onPress={() => setScreen('NearbyMap')} activeOpacity={0.85}>
        <View style={[styles.dashCardIconWrap, { backgroundColor: '#FFF1F2' }]}>
          <Text style={styles.dashCardIconEmoji}>🗺️</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.dashCardTitle}>Mapa de alertas</Text>
          <Text style={styles.dashCardHint}>Mascotas perdidas cercanas</Text>
        </View>
        <Text style={styles.dashCardArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.dashCard} onPress={() => setScreen('FoundTag')} activeOpacity={0.85}>
        <View style={[styles.dashCardIconWrap, { backgroundColor: C.successLight }]}>
          <Text style={styles.dashCardIconEmoji}>🔍</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.dashCardTitle}>Escanear tag</Text>
          <Text style={styles.dashCardHint}>Encontré una mascota</Text>
        </View>
        <Text style={styles.dashCardArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.dashCard} onPress={() => setScreen('Profile')} activeOpacity={0.85}>
        <View style={[styles.dashCardIconWrap, { backgroundColor: C.warningLight }]}>
          <Text style={styles.dashCardIconEmoji}>👤</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.dashCardTitle}>Mi Perfil</Text>
          <Text style={styles.dashCardHint}>Datos personales y cuenta</Text>
        </View>
        {pendingInvitations.length > 0 && (
          <View style={styles.inviteBadge}>
            <Text style={styles.inviteBadgeText}>{pendingInvitations.length}</Text>
          </View>
        )}
        <Text style={styles.dashCardArrow}>›</Text>
      </TouchableOpacity>

      {/* Cerrar sesión */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}
