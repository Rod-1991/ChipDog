import { Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
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
  const initialRegion = {
    latitude: -33.4489, longitude: -70.6693,
    latitudeDelta: 0.12, longitudeDelta: 0.12,
  };

  const petEmoji = (species: string) => species === 'cat' ? '🐈' : '🐕';
  const petColor = (species: string) => species === 'cat' ? '#FF8C42' : '#FF4757';

  return (
    <View style={{ flex: 1, backgroundColor: '#F0FDFB' }}>

      {/* Header */}
      <View style={{
        backgroundColor: C.primaryDark,
        paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20,
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff', lineHeight: 28 }}>
            Mapa de{'\n'}perdidos
          </Text>
          {allLostPets.length > 0 && (
            <View style={{
              backgroundColor: '#FF4757', borderRadius: 20,
              paddingHorizontal: 14, paddingVertical: 6,
              flexDirection: 'row', alignItems: 'center', gap: 6,
            }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' }} />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>
                {allLostPets.length} activo{allLostPets.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '700', marginTop: 6 }}>
          Toca un pin para ver la ficha
        </Text>
      </View>

      {/* Mapa */}
      <View style={{ flex: 1 }}>
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
              onPress={() => { setSelectedLostPet(pet); setScreen('LostPetDetail'); }}
            >
              {/* Pin custom con emoji */}
              <View style={{ alignItems: 'center' }}>
                <View style={{
                  width: 42, height: 42, borderRadius: 21,
                  backgroundColor: petColor(pet.species),
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 3, borderColor: '#fff',
                  shadowColor: petColor(pet.species), shadowOpacity: 0.5,
                  shadowOffset: { width: 0, height: 4 }, shadowRadius: 8,
                  elevation: 6,
                }}>
                  <Text style={{ fontSize: 20 }}>{petEmoji(pet.species)}</Text>
                </View>
                {/* Sombra del pin */}
                <View style={{
                  width: 12, height: 4, borderRadius: 6,
                  backgroundColor: 'rgba(0,0,0,0.15)', marginTop: 2,
                }} />
              </View>
            </Marker>
          ))}
        </MapView>
      </View>

      {/* Botones */}
      <View style={{ padding: 16, paddingBottom: 28, gap: 10, backgroundColor: '#F0FDFB' }}>
        <TouchableOpacity
          style={{
            backgroundColor: '#FF8C42', borderRadius: 18,
            padding: 15, alignItems: 'center', justifyContent: 'center',
          }}
          onPress={() => setScreen('LostPetList')}
          activeOpacity={0.85}
        >
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '900' }}>Ver lista completa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ backgroundColor: '#fff', borderRadius: 18,
            padding: 13, alignItems: 'center',
            borderWidth: 1.5, borderColor: C.border }}
          onPress={() => setScreen('Home')}
          activeOpacity={0.85}>
          <Text style={{ color: C.primaryDark, fontSize: 14, fontWeight: '800' }}>Volver al inicio</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
