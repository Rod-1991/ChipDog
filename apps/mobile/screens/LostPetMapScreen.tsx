import { Text, TouchableOpacity, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import { styles } from '../styles';
import type { Pet, Screen } from '../types';

type LostPin = { lat: number; lng: number };

type LostPetMapScreenProps = {
  lostPin: LostPin | null;
  setLostPin: (pin: LostPin | null) => void;
  lostRadius: number;
  setLostRadius: (r: number) => void;
  selectedPet: Pet | null;
  loading: boolean;
  saveLostLocation: () => void;
  setScreen: (s: Screen) => void;
};

export default function LostPetMapScreen({
  lostPin, setLostPin, lostRadius, setLostRadius,
  selectedPet, loading, saveLostLocation, setScreen,
}: LostPetMapScreenProps) {
  const RADIUS_OPTIONS = [100, 250, 500, 1000, 2000];
  const defaultRegion = {
    latitude:      lostPin?.lat ?? -33.4489,
    longitude:     lostPin?.lng ?? -70.6693,
    latitudeDelta:  lostPin ? (lostRadius / 50000) * 2 : 0.02,
    longitudeDelta: lostPin ? (lostRadius / 50000) * 2 : 0.02,
  };

  return (
    <View style={styles.form}>
      {/* Instrucción */}
      <View style={styles.lostMapTip}>
        <Text style={styles.lostMapTipText}>
          {lostPin
            ? '📍 Arrastra el pin o toca el mapa para mover la ubicación'
            : '👆 Toca el mapa para marcar dónde se perdió tu mascota'}
        </Text>
      </View>

      {/* Mapa */}
      <View style={styles.lostMapWrap}>
        <MapView
          style={{ flex: 1 }}
          initialRegion={defaultRegion}
          onPress={(e) => setLostPin({
            lat: e.nativeEvent.coordinate.latitude,
            lng: e.nativeEvent.coordinate.longitude,
          })}
          showsUserLocation
          showsMyLocationButton
        >
          {lostPin && (
            <>
              <Marker
                coordinate={{ latitude: lostPin.lat, longitude: lostPin.lng }}
                draggable
                onDragEnd={(e) => setLostPin({
                  lat: e.nativeEvent.coordinate.latitude,
                  lng: e.nativeEvent.coordinate.longitude,
                })}
                title={selectedPet?.name ?? 'Mascota'}
                description="Arrastra para ajustar"
              />
              <Circle
                center={{ latitude: lostPin.lat, longitude: lostPin.lng }}
                radius={lostRadius}
                fillColor="rgba(108,71,255,0.12)"
                strokeColor="rgba(108,71,255,0.5)"
                strokeWidth={2}
              />
            </>
          )}
        </MapView>
      </View>

      {/* Selector de radio */}
      <View style={styles.card}>
        <Text style={[styles.cardHeader, { marginBottom: 12 }]}>Radio de búsqueda</Text>
        <View style={styles.lostRadiusRow}>
          {RADIUS_OPTIONS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.lostRadiusBtn, lostRadius === r && styles.lostRadiusBtnActive]}
              onPress={() => setLostRadius(r)}
              activeOpacity={0.85}
            >
              <Text style={[styles.lostRadiusBtnText, lostRadius === r && styles.lostRadiusBtnTextActive]}>
                {r >= 1000 ? `${r / 1000}km` : `${r}m`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Botones */}
      <TouchableOpacity
        style={[styles.btnPrimary, !lostPin && { opacity: 0.5 }]}
        onPress={saveLostLocation}
        disabled={loading || !lostPin}
        activeOpacity={0.85}
      >
        <Text style={styles.btnPrimaryText}>
          {loading ? 'Publicando...' : '🚨 Publicar alerta de búsqueda'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnGhost} onPress={() => setScreen('PetDetail')} activeOpacity={0.85}>
        <Text style={styles.btnGhostText}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}
