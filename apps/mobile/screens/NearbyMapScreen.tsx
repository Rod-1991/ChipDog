import { Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { styles } from '../styles';
import { C } from '../constants/colors';
import type { LostPetPin, Screen } from '../types';

type NearbyMapScreenProps = {
  allLostPets: LostPetPin[];
  nearbyMapRef: React.RefObject<MapView | null>;
  setSelectedLostPet: (pet: LostPetPin) => void;
  setScreen: (s: Screen) => void;
};

export default function NearbyMapScreen({
  allLostPets, nearbyMapRef, setSelectedLostPet, setScreen,
}: NearbyMapScreenProps) {
  const initialRegion = { latitude: -33.4489, longitude: -70.6693, latitudeDelta: 0.12, longitudeDelta: 0.12 };

  return (
    <View style={{ flex: 1, gap: 0 }}>
      {/* Header compacto */}
      <View style={[styles.homeHeader, { margin: 16, marginBottom: 8 }]}>
        <Text style={styles.homeHeaderEyebrow}>🗺  Mapa de perdidos</Text>
        <Text style={styles.homeHeaderTitle}>
          {allLostPets.length === 0 ? 'Sin reportes activos' : `${allLostPets.length} reportes activos`}
        </Text>
        <Text style={styles.homeHeaderSubtitle}>Toca un pin para ver la ficha de la mascota</Text>
      </View>

      {/* Mapa full */}
      <View style={{ flex: 1, marginHorizontal: 16, borderRadius: 20, overflow: 'hidden' }}>
        <MapView
          ref={nearbyMapRef}
          style={{ flex: 1 }}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton
        >
          {allLostPets.map((pet) => (
            <Marker
              key={pet.id}
              coordinate={{ latitude: pet.lost_lat, longitude: pet.lost_lng }}
              title={`🚨 ${pet.name}`}
              description={`${pet.species}${pet.breed ? ` · ${pet.breed}` : ''}${pet.lost_commune ? ` · ${pet.lost_commune}` : ''}`}
              pinColor="#EF4444"
              onCalloutPress={() => { setSelectedLostPet(pet); setScreen('LostPetDetail'); }}
            />
          ))}
        </MapView>
      </View>

      {/* Botones */}
      <View style={{ padding: 16, gap: 10 }}>
        <TouchableOpacity
          style={[styles.btnPrimary, { backgroundColor: C.accent }]}
          onPress={() => setScreen('LostPetList')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>📋  Ver lista completa</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnGhost} onPress={() => setScreen('Home')} activeOpacity={0.85}>
          <Text style={styles.btnGhostText}>Volver al inicio</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
