import { useEffect, useRef, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { styles } from '../styles';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/app';
import { usePetsStore } from '../store/pets';

type LostPin = { lat: number; lng: number };

const RADIUS_OPTIONS = [100, 250, 500, 1000, 2000];

export default function LostPetMapScreen() {
  const { loading, setLoading, setScreen } = useAppStore();
  const { selectedPet, fetchPets } = usePetsStore();

  const mapRef = useRef<MapView>(null);

  const [lostPin, setLostPin] = useState<LostPin | null>(
    selectedPet?.lost_lat && selectedPet?.lost_lng
      ? { lat: selectedPet.lost_lat, lng: selectedPet.lost_lng }
      : null
  );
  const [lostRadius, setLostRadius] = useState(selectedPet?.lost_radius_meters ?? 500);

  useEffect(() => {
    if (lostPin) return;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Ubicación no disponible', 'Toca el mapa para marcar dónde se perdió tu mascota.');
        return;
      }
      setLoading(true);
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setTimeout(() => {
          mapRef.current?.animateToRegion({
            latitude: coords.lat, longitude: coords.lng,
            latitudeDelta: 0.008, longitudeDelta: 0.008,
          }, 600);
        }, 300);
      } catch {
        Alert.alert('Ubicación no disponible', 'Toca el mapa para marcar dónde se perdió tu mascota.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveLostLocation = async () => {
    if (!lostPin || !selectedPet) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('pets').update({
        is_lost: true,
        lost_lat: lostPin.lat,
        lost_lng: lostPin.lng,
        lost_radius_meters: lostRadius,
      }).eq('id', selectedPet.id);
      if (error) { Alert.alert('Error', error.message); return; }
      await fetchPets();
      setScreen('PetDetail');
    } finally {
      setLoading(false);
    }
  };

  const defaultRegion = {
    latitude:      lostPin?.lat ?? -33.4489,
    longitude:     lostPin?.lng ?? -70.6693,
    latitudeDelta:  lostPin ? (lostRadius / 50000) * 2 : 0.02,
    longitudeDelta: lostPin ? (lostRadius / 50000) * 2 : 0.02,
  };

  return (
    <View style={styles.form}>
      <View style={styles.lostMapTip}>
        <Text style={styles.lostMapTipText}>
          {lostPin
            ? '📍 Arrastra el pin o toca el mapa para mover la ubicación'
            : '👆 Toca el mapa para marcar dónde se perdió tu mascota'}
        </Text>
      </View>

      <View style={styles.lostMapWrap}>
        <MapView
          ref={mapRef}
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
