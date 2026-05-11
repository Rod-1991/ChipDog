import { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  PanResponder,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import MapView from 'react-native-maps';
import { C } from './constants/colors';
import { styles } from './styles';
import { supabase } from './lib/supabase';

// Stores
import { useAppStore } from './store/app';
import { useUserStore } from './store/user';
import { usePetsStore } from './store/pets';
import { useVaccinesStore } from './store/vaccines';
import { useVetStore } from './store/vet';
import { useLostPetsStore } from './store/lostPets';
import { useNutritionStore } from './store/nutrition';
import { useCoOwnerStore } from './store/coOwner';

// Screens
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import FoundTagScreen from './screens/FoundTagScreen';
import FoundResultScreen from './screens/FoundResultScreen';
import LinkTagScreen from './screens/LinkTagScreen';
import ProfileScreen from './screens/ProfileScreen';
import HomeScreen from './screens/HomeScreen';
import AddPetScreen from './screens/AddPetScreen';
import PetDetailScreen from './screens/PetDetailScreen';
import PetListScreen from './screens/PetListScreen';
import LostPetMapScreen from './screens/LostPetMapScreen';
import NearbyMapScreen from './screens/NearbyMapScreen';
import LostPetListScreen from './screens/LostPetListScreen';
import LostPetDetailScreen from './screens/LostPetDetailScreen';
import PetMembersScreen from './screens/PetMembersScreen';
import InviteCoOwnerScreen from './screens/InviteCoOwnerScreen';
import ScanTagScreen from './screens/ScanTagScreen';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldPlaySound: true,
    shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true,
  }),
});

export default function App() {
  const { screen, setScreen, isInitializing, setIsInitializing, isLoggedIn, setIsLoggedIn, loading } = useAppStore();
  const { loadUserName, loadUserProfile, clearUser, registerPushToken } = useUserStore();
  const { fetchPets, clearPets, selectedPet } = usePetsStore();
  const { fetchUpcomingVaccines, showVaccineForm, resetVaccineForm } = useVaccinesStore();
  const { vetView, editingVetRecordId, selectedVetRecord, startEditVetRecord, resetVetForm, resetVetView, clearVet } = useVetStore();
  const { loadAllLostPets, setNearbyUserLoc, selectedLostPet } = useLostPetsStore();
  const { loadPendingInvitations } = useCoOwnerStore();

  const nearbyMapRef = useRef<MapView>(null);

  // ── Inicialización de sesión ─────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error || !data.session) { setScreen('Login'); return; }

        setIsLoggedIn(true);
        useUserStore.getState().setUserId(data.session.user.id);
        setScreen('Home');
        setIsInitializing(false);

        Promise.all([fetchPets(), fetchUpcomingVaccines(), loadUserName(), loadUserProfile()]);
      } finally {
        if (mounted) setIsInitializing(false);
      }
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session) {
        setIsLoggedIn(true);
        useUserStore.getState().setUserId(session.user.id);
        setScreen('Home');
        Promise.all([fetchPets(), fetchUpcomingVaccines(), loadUserName(), loadUserProfile()]);
      } else {
        clearPets();
        clearUser();
        clearVet();
        setIsLoggedIn(false);
        setScreen('Login');
      }
    });

    return () => { mounted = false; sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Side effects de navegación ───────────────────────────────────────────
  useEffect(() => {
    if (screen === 'PetDetail' && selectedPet) {
      useVaccinesStore.getState().fetchVaccines(selectedPet.id);
      useNutritionStore.getState().fetchWeightHistory(selectedPet.id);
      useNutritionStore.getState().fetchFoodHistory(selectedPet.id);
      usePetsStore.getState().fetchPetTags(selectedPet.id);
    }
  }, [screen, selectedPet?.id]);

  useEffect(() => {
    if (screen !== 'PetVetHistory' || !selectedPet) return;
    useVetStore.getState().loadVetHistory(selectedPet.id);
  }, [screen, selectedPet?.id]);

  useEffect(() => {
    if (screen === 'PetVetHistory') return;
    resetVetView();
  }, [screen, selectedPet?.id]);

  useEffect(() => {
    if (screen === 'PetVaccines') return;
    resetVaccineForm();
  }, [screen, selectedPet?.id]);

  useEffect(() => {
    if (screen === 'Home') {
      loadAllLostPets();
      loadPendingInvitations();
      loadUserProfile();
    }
  }, [screen]);

  useEffect(() => {
    if (screen === 'Profile') {
      loadUserProfile();
      loadPendingInvitations();
    }
  }, [screen]);

  useEffect(() => {
    if (screen === 'PetMembers' && selectedPet) {
      useCoOwnerStore.getState().loadPetMembers(selectedPet.id);
    }
  }, [screen, selectedPet?.id]);

  useEffect(() => {
    if (screen !== 'NearbyMap') return;
    loadAllLostPets();
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setNearbyUserLoc(coords);
        setTimeout(() => {
          nearbyMapRef.current?.animateToRegion({
            latitude: coords.lat, longitude: coords.lng,
            latitudeDelta: 0.08, longitudeDelta: 0.08,
          }, 600);
        }, 400);
      } catch { /* sin ubicación */ }
    })();
  }, [screen]);

  // ── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    const { setLoading } = useAppStore.getState();
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (error) { Alert.alert('Error cerrando sesión', error.message); return; }
    clearPets();
    clearUser();
    clearVet();
    useLostPetsStore.getState().clearLostPets();
    useCoOwnerStore.getState().clearCoOwner();
    useVaccinesStore.getState().clearVaccines();
    useNutritionStore.getState().clearNutrition();
    setIsLoggedIn(false);
    setScreen('Login');
  };

  // ── Navegación atrás ─────────────────────────────────────────────────────
  const handleBack = () => {
    switch (screen) {
      case 'Register':      return setScreen('Login');
      case 'PetList':       return setScreen('Home');
      case 'NearbyMap':     return setScreen('Home');
      case 'LostPetList':   return setScreen('NearbyMap');
      case 'LostPetDetail': return setScreen('LostPetList');
      case 'AddPet':        return setScreen('PetList');
      case 'PetDetail':     return setScreen('PetList');
      case 'PetInfo':
      case 'PetContact':
      case 'LinkTag':
      case 'LostPetMap':    return setScreen('PetDetail');
      case 'PetVaccines':
        if (showVaccineForm) { resetVaccineForm(); return; }
        return setScreen('PetDetail');
      case 'PetVetHistory':
        if (vetView === 'form') {
          editingVetRecordId ? setVetView('detail') : (resetVetView(), resetVetForm());
          return;
        }
        if (vetView === 'detail') { resetVetView(); return; }
        return setScreen('PetDetail');
      case 'Profile':       return setScreen('Home');
      case 'InviteCoOwner': return setScreen('PetMembers');
      case 'PetMembers':    return setScreen('PetDetail');
      case 'FoundTag':      return setScreen(isLoggedIn ? 'Home' : 'Login');
      case 'FoundResult':   return setScreen('FoundTag');
      case 'ScanTag':       return setScreen('FoundTag');
      default: break;
    }
  };

  const canGoBack = screen !== 'Login' && screen !== 'Home';
  const handleBackRef = useRef(handleBack);
  handleBackRef.current = handleBack;

  const swipePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e, gs) => gs.dx > 10 && Math.abs(gs.dy) < 50,
      onPanResponderRelease: (_e, gs) => { if (gs.dx > 50) handleBackRef.current(); },
    })
  ).current;

  // ── Título de la barra ───────────────────────────────────────────────────
  const title = useMemo(() => {
    switch (screen) {
      case 'Login':         return 'Login';
      case 'Register':      return 'Crear cuenta';
      case 'Home':          return 'ChipDog';
      case 'PetList':       return 'Mis Mascotas';
      case 'NearbyMap':     return 'Mapa de perdidos';
      case 'LostPetList':   return 'Mascotas perdidas';
      case 'LostPetDetail': return selectedLostPet ? selectedLostPet.name : 'Detalle';
      case 'AddPet':        return 'Agregar mascota';
      case 'PetDetail':     return selectedPet ? selectedPet.name : 'Perfil';
      case 'PetInfo':       return 'Información';
      case 'PetContact':    return 'Contacto';
      case 'PetVetHistory': return 'Historial Clínico';
      case 'PetVaccines':   return 'Vacunas';
      case 'LostPetMap':    return 'Marcar como perdido';
      case 'LinkTag':       return 'Vincular Tag';
      case 'Profile':       return 'Mi Perfil';
      case 'PetMembers':    return 'Co-dueños';
      case 'InviteCoOwner': return 'Invitar co-dueño';
      default:              return 'ChipDog';
    }
  }, [screen, selectedPet, selectedLostPet]);

  // ── Render de pantallas ──────────────────────────────────────────────────
  const renderScreen = () => {
    switch (screen) {
      case 'Login':         return <LoginScreen onLoggedIn={() => { setIsLoggedIn(true); Promise.all([fetchPets(), fetchUpcomingVaccines(), registerPushToken(), loadUserName(), loadUserProfile()]); }} />;
      case 'Register':      return <RegisterScreen onRegistered={() => { setIsLoggedIn(true); Promise.all([fetchPets(), fetchUpcomingVaccines(), registerPushToken(), loadUserName(), loadUserProfile()]); }} />;
      case 'Home':          return <HomeScreen handleLogout={handleLogout} />;
      case 'PetList':       return <PetListScreen />;
      case 'AddPet':        return <AddPetScreen />;
      case 'PetDetail':
      case 'PetVaccines':
      case 'PetVetHistory':
      case 'PetInfo':
      case 'PetContact':    return <PetDetailScreen />;
      case 'Profile':       return <ProfileScreen handleLogout={handleLogout} />;
      case 'LostPetMap':    return <LostPetMapScreen />;
      case 'NearbyMap':     return <NearbyMapScreen nearbyMapRef={nearbyMapRef} />;
      case 'LostPetList':   return <LostPetListScreen />;
      case 'LostPetDetail': return <LostPetDetailScreen />;
      case 'LinkTag':       return <LinkTagScreen />;
      case 'FoundTag':      return <FoundTagScreen />;
      case 'FoundResult':   return <FoundResultScreen />;
      case 'ScanTag':       return <ScanTagScreen />;
      case 'PetMembers':    return <PetMembersScreen />;
      case 'InviteCoOwner': return <InviteCoOwnerScreen />;
      default:              return null;
    }
  };

  const isFullScreenMap = screen === 'ScanTag';
  const isFullScreen = isFullScreenMap || ['NearbyMap', 'Login', 'Register', 'Home', 'PetList', 'PetDetail', 'Profile'].includes(screen);

  // ── Splash ───────────────────────────────────────────────────────────────
  if (isInitializing) {
    return (
      <View style={{ flex: 1, backgroundColor: C.primaryDark, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 42, fontWeight: '900' }}>
          <Text style={{ color: '#fff' }}>Chip</Text>
          <Text style={{ color: C.dark }}>Dog</Text>
          <Text> 🐾</Text>
        </Text>
      </View>
    );
  }

  // ── Shell ────────────────────────────────────────────────────────────────
  if (isFullScreen) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {renderScreen()}
        {isFullScreenMap && (
          <TouchableOpacity
            style={{ position: 'absolute', top: 54, left: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 4 }}
            onPress={handleBack} activeOpacity={0.85}>
            <Text style={{ fontSize: 22, color: C.primary, lineHeight: 26, marginTop: -2 }}>‹</Text>
            <Text style={{ fontSize: 14, color: C.primary, fontWeight: '700', marginLeft: 4 }}>Inicio</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 6 : 0}
      >
        {canGoBack && (
          <View style={styles.navBar}>
            <TouchableOpacity style={styles.navBackBtn} onPress={handleBack} activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.navBackArrow}>‹</Text>
              <Text style={styles.navBackLabel}>Atrás</Text>
            </TouchableOpacity>

            <Text style={styles.navTitle} numberOfLines={1}>{title}</Text>

            <View style={styles.navActionBtn} />
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onScrollBeginDrag={Keyboard.dismiss}
        >
          {renderScreen()}
        </ScrollView>

        {loading && <ActivityIndicator style={styles.loader} />}

        {canGoBack && (
          <View
            pointerEvents="box-only"
            style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 30 }}
            {...swipePan.panHandlers}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Helper used in handleBack
function setVetView(v: 'list' | 'detail' | 'form') {
  useVetStore.getState().setVetView(v);
}
