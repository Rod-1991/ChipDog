import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  PanResponder,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from 'react-native';
import { linkTagSchema, loginSchema } from '@chipdog/shared';
import { supabase, vetAttachmentsBucket } from './lib/supabase';
import { C } from './constants/colors';
import {
  normalizeStringOrNull, sanitizeFilename,
  formatBirthDate, parseBirthDateText,
} from './utils/helpers';
import type {
  Screen, Pet, PetMember, PetMemberInvitation, UserProfile,
  FoundPet, Vaccine, LostPetPin, NearbyLostPet, VetRecord, VetAttachment,
  WeightEntry, FoodEntry, PetSighting,
} from './types';
import { styles } from './styles';
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
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Buffer } from 'buffer';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import MapView from 'react-native-maps';
import { useCameraPermissions } from 'expo-camera';

// NFC: carga dinámica — no disponible en Expo Go
let NfcManager: any = null;
let NfcTech: any = null;
let Ndef: any = null;
try {
  const nfc = require('react-native-nfc-manager');
  NfcManager = nfc.default;
  NfcTech = nfc.NfcTech;
  Ndef = nfc.Ndef;
} catch { /* Expo Go o dispositivo sin NFC */ }

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});


export default function App() {
  const [screen, setScreen] = useState<Screen>('Login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [registerForm, setRegisterForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    phone: '', rut: '', sex: '', birthYear: '', commune: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSexDropdown, setShowSexDropdown] = useState(false);

  const [pets, setPets] = useState<Pet[]>([]);
  const [petSignedUrls, setPetSignedUrls] = useState<Record<number, string | null>>({});
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);

  const [petPhotoSignedUrl, setPetPhotoSignedUrl] = useState<string | null>(null);

  const [petDraft, setPetDraft] = useState({
    color: '',
    birth_year: '',
    birth_date_text: '',
    sex: '',
    weight_kg: '',
    description: '',
    sterilized: false,
    chip_number: '',
    blood_type: '',
    insurance_name: '',
    insurance_policy: '',
    contact_primary_name: '',
    owner_phone: '',
    contact_secondary_name: '',
    contact_secondary_phone: '',
    owner_whatsapp: '',
    public_notes: '',
    allergies: '',
    medications: '',
    conditions: '',
    vet_name: '',
    vet_phone: '',
    food_brand: '',
    food_notes: '',
  });

  const [foundCode, setFoundCode] = useState('');
  const [foundPet, setFoundPet] = useState<FoundPet | null>(null);

  const [petForm, setPetForm] = useState({
    name: '',
    species: 'Perro' as 'Perro' | 'Gato',
    breed: '',
    sex: '',
    description: '',
    weight_kg: '',
    sterilized: false,
    chip_number: '',
  });
  const [petFormStep, setPetFormStep] = useState<1 | 2>(1);
  const [petBirthDate, setPetBirthDate] = useState<Date | null>(null);
  const [showSpeciesDropdown, setShowSpeciesDropdown] = useState(false);
  const [showBirthCalendar, setShowBirthCalendar] = useState(false);
  const [calendarMonthDate, setCalendarMonthDate] = useState(() => new Date());
  const [showProfileBirthCalendar, setShowProfileBirthCalendar] = useState(false);
  const [isEditingPetDetail, setIsEditingPetDetail] = useState(false);
  const [profileBirthCalendarMonth, setProfileBirthCalendarMonth] = useState(() => new Date());
  const [breedSearch, setBreedSearch] = useState('');
  const [showBreedDropdown, setShowBreedDropdown] = useState(false);
  const [showSexPetDropdown, setShowSexPetDropdown] = useState(false);
  const [birthDateText, setBirthDateText] = useState('');

  const [tagCode, setTagCode] = useState('');
  const [linkTagCode, setLinkTagCode] = useState('');
  const [linkTagMode, setLinkTagMode] = useState<'choose' | 'nfc' | 'qr'>('choose');
  const [nfcStatus, setNfcStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [nfcError, setNfcError] = useState('');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [qrScanned, setQrScanned] = useState(false);

  const [lostPin, setLostPin] = useState<{ lat: number; lng: number } | null>(null);
  const [lostRadius, setLostRadius] = useState(500);
  const mapRef = useRef<MapView>(null);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [nearbyLostPets, setNearbyLostPets] = useState<NearbyLostPet[]>([]);
  const [allLostPets, setAllLostPets] = useState<LostPetPin[]>([]);
  const [nearbyUserLoc, setNearbyUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const nearbyMapRef = useRef<MapView>(null);
  const [selectedLostPet, setSelectedLostPet] = useState<LostPetPin | null>(null);
  const [lostListSpecies, setLostListSpecies] = useState<'Todos' | 'Perro' | 'Gato'>('Todos');
  const [lostListCommune, setLostListCommune] = useState<string>('Todas');
  const [lostPetPhotoUrl, setLostPetPhotoUrl] = useState<string | null>(null);
  const [lostPetSignedUrls, setLostPetSignedUrls] = useState<Record<number, string | null>>({});

  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [showVaccineForm, setShowVaccineForm] = useState(false);
  const [editingVaccineId, setEditingVaccineId] = useState<number | null>(null);
  const [vaccineForm, setVaccineForm] = useState({
    vaccine_name: '',
    applied_date: '',
    expiry_date: '',
    next_dose_date: '',
    veterinarian: '',
    clinic: '',
    batch_number: '',
    notes: ''
  });

  const [upcomingVaccinesCount, setUpcomingVaccinesCount] = useState(0);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [foodHistory, setFoodHistory] = useState<FoodEntry[]>([]);
  const [sightings, setSightings] = useState<PetSighting[]>([]);

  const [inviteEmail, setInviteEmail] = useState('');
  const [petMembers, setPetMembers] = useState<PetMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PetMemberInvitation[]>([]);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileDraft, setProfileDraft] = useState<Omit<UserProfile, 'id'>>({
    first_name: '', last_name: '', phone: '', rut: '', sex: '', birth_year: 0, commune: ''
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showProfileSexDropdown, setShowProfileSexDropdown] = useState(false);
  const [showProfileCommuneDropdown, setShowProfileCommuneDropdown] = useState(false);
  const [communeSearch, setCommuneSearch] = useState('');
  const [showRegisterCommuneDropdown, setShowRegisterCommuneDropdown] = useState(false);
  const [registerCommuneSearch, setRegisterCommuneSearch] = useState('');

  const [vetHistory, setVetHistory] = useState<VetRecord[]>([]);
  const [vetView, setVetView] = useState<'list' | 'detail' | 'form'>('list');
  const [selectedVetRecord, setSelectedVetRecord] = useState<VetRecord | null>(null);
  const [editingVetRecordId, setEditingVetRecordId] = useState<string | null>(null);
  const [symptomText, setSymptomText] = useState('');
  const [vetForm, setVetForm] = useState({
    date: '',
    doctor: '',
    clinic: '',
    reason: '',
    diagnosis: '',
    treatment: '',
    description: '',
    attachments: [] as VetAttachment[]
  });

  const title = useMemo(() => {
    switch (screen) {
      case 'Login':        return 'Login';
      case 'Register':     return 'Crear cuenta';
      case 'Home':         return 'ChipDog';
      case 'PetList':      return 'Mis Mascotas';
      case 'NearbyMap':    return 'Mapa de perdidos';
      case 'LostPetList':  return 'Mascotas perdidas';
      case 'LostPetDetail':return selectedLostPet ? selectedLostPet.name : 'Detalle';
      case 'AddPet':       return 'Agregar mascota';
      case 'PetDetail':    return selectedPet ? selectedPet.name : 'Perfil';
      case 'PetInfo':      return 'Información';
      case 'PetContact':   return 'Contacto';
      case 'PetVetHistory':return 'Historial Veterinario';
      case 'PetVaccines':  return showVaccineForm ? (editingVaccineId ? 'Editar vacuna' : 'Nueva vacuna') : 'Vacunas';
      case 'LinkTag':      return 'Vincular tag';
      case 'ScanTag':      return 'Escanear QR';
      case 'LostPetMap':   return selectedPet ? `¿Dónde se perdió ${selectedPet.name}?` : 'Ubicación';
      case 'Profile':       return 'Mi Perfil';
      case 'PetMembers':    return selectedPet ? `Co-dueños de ${selectedPet.name}` : 'Co-dueños';
      case 'InviteCoOwner': return 'Invitar co-dueño';
      case 'FoundTag':     return 'Encontré una mascota';
      case 'FoundResult':  return 'Mascota encontrada';
    }
  }, [screen, selectedPet]);

  const fetchPets = async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from('pets')
      .select('id,owner_id,name,species,breed,is_lost,is_featured,photo_url,birth_year,weight_kg,color,chip_number')
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('Error listando mascotas', error.message);
      return;
    }

    const nextPets = (data as Pet[]) ?? [];
    setPets(nextPets);
    await loadHomePetPhotos(nextPets);
  };

  const fetchUpcomingVaccines = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    const { data } = await supabase
      .from('pet_vaccines')
      .select('id, next_dose_date, expiry_date, pet_id')
      .in('pet_id', (await supabase.from('pets').select('id').eq('owner_id', user.id)).data?.map((p: { id: number }) => p.id) ?? []);
    if (!data) return;
    const today = new Date();
    const count = data.filter((v: { next_dose_date: string | null; expiry_date: string | null }) => {
      const d = v.next_dose_date ?? v.expiry_date;
      if (!d) return false;
      const date = new Date(d);
      return date >= today && date <= in30;
    }).length;
    setUpcomingVaccinesCount(count);
  };

  const registerPushToken = async () => {
    if (!Device.isDevice) return; // no funciona en simulador
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('user_push_tokens')
      .upsert({ user_id: user.id, token, updated_at: new Date().toISOString() });
  };

  const loadAllLostPets = async () => {
    try {
      const { data } = await supabase.rpc('get_all_lost_pets');
      setAllLostPets((data as LostPetPin[]) ?? []);
    } catch { /* silent */ }
  };

  const fetchSightings = async (petId: number) => {
    const { data } = await supabase
      .from('pet_sightings')
      .select('*')
      .eq('pet_id', petId)
      .order('created_at', { ascending: false });
    setSightings((data as PetSighting[]) ?? []);
  };

  const saveSighting = async (petId: number, reporterName: string, comment: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('pet_sightings')
      .insert({ pet_id: petId, reporter_name: reporterName || 'Anónimo', comment, user_id: user?.id ?? null });
    if (error) { Alert.alert('Error', error.message); return false; }
    await fetchSightings(petId);
    return true;
  };

  const deleteSighting = async (id: number, petId: number) => {
    const { error } = await supabase.from('pet_sightings').delete().eq('id', id);
    if (error) { Alert.alert('Error', error.message); return; }
    await fetchSightings(petId);
  };

  const loadNearbyLostPets = async (requestPermission = false) => {
    try {
      let status: string;
      if (requestPermission) {
        ({ status } = await Location.requestForegroundPermissionsAsync());
      } else {
        ({ status } = await Location.getForegroundPermissionsAsync());
      }
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setNearbyUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      const { data } = await supabase.rpc('get_nearby_lost_pets', {
        p_lat: loc.coords.latitude,
        p_lng: loc.coords.longitude,
        p_radius_km: 10,
      });
      setNearbyLostPets((data as NearbyLostPet[]) ?? []);
    } catch {
      // silent fail — nearby is optional
    }
  };

  const loadHomePetPhotos = async (petsToResolve: Pet[]) => {
    if (!petsToResolve.length) {
      setPetSignedUrls({});
      return;
    }

    const resolvedEntries = await Promise.all(
      petsToResolve.map(async (pet) => {
        if (!pet.photo_url) {
          return [pet.id, null] as const;
        }

        const { data, error } = await supabase.storage.from('pet-photos').createSignedUrl(pet.photo_url, 60 * 60);

        if (error) {
          console.log('signedUrl home error', error.message);
          return [pet.id, null] as const;
        }

        return [pet.id, data.signedUrl] as const;
      })
    );

    setPetSignedUrls(Object.fromEntries(resolvedEntries));
  };

  const loadSelectedPetPhoto = async (photoPath?: string | null) => {
    if (!photoPath) {
      setPetPhotoSignedUrl(null);
      return;
    }

    const { data, error } = await supabase.storage.from('pet-photos').createSignedUrl(photoPath, 60 * 60);

    if (error) {
      console.log('signedUrl error', error.message);
      setPetPhotoSignedUrl(null);
      return;
    }

    setPetPhotoSignedUrl(data.signedUrl);
  };

  const loadPetDetail = async (petId: number) => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pets')
        .select(
          'id,owner_id,name,species,breed,is_lost,photo_url,color,birth_year,birth_date_text,sex,weight_kg,description,sterilized,chip_number,blood_type,insurance_name,insurance_policy,contact_primary_name,owner_phone,contact_secondary_name,contact_secondary_phone,owner_whatsapp,public_notes,allergies,medications,conditions,vet_name,vet_phone'
        )
        .eq('id', petId)
        .single();

      if (error) {
        Alert.alert('Error cargando perfil', error.message);
        return;
      }

      const pet = data as Pet;
      setSelectedPet(pet);

      setPetDraft({
        color: pet.color ?? '',
        birth_year: pet.birth_year ? String(pet.birth_year) : '',
        birth_date_text: pet.birth_date_text ?? '',
        sex: pet.sex ?? '',
        weight_kg: pet.weight_kg != null ? String(pet.weight_kg) : '',
        description: pet.description ?? '',
        sterilized: pet.sterilized ?? false,
        chip_number: pet.chip_number ?? '',
        blood_type: pet.blood_type ?? '',
        insurance_name: pet.insurance_name ?? '',
        insurance_policy: pet.insurance_policy ?? '',
        contact_primary_name: pet.contact_primary_name ?? '',
        owner_phone: pet.owner_phone ?? '',
        contact_secondary_name: pet.contact_secondary_name ?? '',
        contact_secondary_phone: pet.contact_secondary_phone ?? '',
        owner_whatsapp: pet.owner_whatsapp ?? '',
        public_notes: pet.public_notes ?? '',
        allergies: pet.allergies ?? '',
        medications: pet.medications ?? '',
        conditions: pet.conditions ?? '',
        vet_name: pet.vet_name ?? '',
        vet_phone: pet.vet_phone ?? '',
        food_brand: pet.food_brand ?? '',
        food_notes: pet.food_notes ?? '',
      });

      await loadSelectedPetPhoto(pet.photo_url ?? null);
    } finally {
      setLoading(false);
    }
  };

  const togglePetFeatured = async (petId: number, currentFeatured: boolean) => {
    // Si se va a destacar, primero quita destacado de todas las otras
    if (!currentFeatured) {
      await supabase.from('pets').update({ is_featured: false }).neq('id', petId);
    }
    await supabase.from('pets').update({ is_featured: !currentFeatured }).eq('id', petId);
    await fetchPets();
  };

  const updatePetContactPublic = async (petId: number, value: boolean) => {
    await supabase.from('pets').update({ contact_public: value }).eq('id', petId);
    setSelectedPet(prev => prev?.id === petId ? { ...prev, contact_public: value } : prev);
    await fetchPets();
  };

  const updatePetLostStatus = async (petId: number, isLost: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('pets').update({ is_lost: isLost }).eq('id', petId);
      if (error) { Alert.alert('Error', error.message); return; }
      setSelectedPet((p) => (p ? { ...p, is_lost: isLost } : p));
      await fetchPets();
    } finally {
      setLoading(false);
    }
  };

  const openLostMap = async () => {
    if (!selectedPet) return;

    // Si ya tenía ubicación guardada, úsala como punto de partida
    if (selectedPet.lost_lat && selectedPet.lost_lng) {
      setLostPin({ lat: selectedPet.lost_lat, lng: selectedPet.lost_lng });
      setLostRadius(selectedPet.lost_radius_meters ?? 500);
      setScreen('LostPetMap');
      return;
    }

    setLostPin(null);
    setLostRadius(500);
    setScreen('LostPetMap');

    // Pedir permiso y animar el mapa una vez que esté montado
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    setLoading(true);
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setLostPin(coords);
      // Animar el mapa a la ubicación obtenida
      setTimeout(() => {
        mapRef.current?.animateToRegion({
          latitude: coords.lat,
          longitude: coords.lng,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        }, 600);
      }, 300);
    } catch {
      Alert.alert('Ubicación no disponible', 'Toca el mapa para marcar dónde se perdió tu mascota.');
    } finally {
      setLoading(false);
    }
  };

  const centerOnMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    setLoading(true);
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setLostPin(coords);
      mapRef.current?.animateToRegion({
        latitude: coords.lat,
        longitude: coords.lng,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }, 600);
    } finally {
      setLoading(false);
    }
  };

  const saveLostLocation = async () => {
    if (!selectedPet || !lostPin) {
      Alert.alert('Ubica a tu mascota', 'Toca el mapa para marcar dónde se perdió.');
      return;
    }
    setLoading(true);
    try {
      // Reverse geocoding para obtener la comuna
      let commune: string | null = null;
      try {
        const [geo] = await Location.reverseGeocodeAsync({ latitude: lostPin.lat, longitude: lostPin.lng });
        commune = geo?.district ?? geo?.subregion ?? geo?.city ?? null;
      } catch { /* si falla, guardamos sin comuna */ }

      const { error } = await supabase.from('pets').update({
        is_lost: true,
        lost_lat: lostPin.lat,
        lost_lng: lostPin.lng,
        lost_radius_meters: lostRadius,
        lost_commune: commune,
      }).eq('id', selectedPet.id);
      if (error) { Alert.alert('Error', error.message); return; }
      setSelectedPet((p) => p ? { ...p, is_lost: true, lost_lat: lostPin.lat, lost_lng: lostPin.lng, lost_radius_meters: lostRadius } : p);
      await fetchPets();
      Alert.alert('🚨 Alerta publicada', `Tu mascota está marcada como perdida${commune ? ` en ${commune}` : ''} y los usuarios podrán verla en el mapa.`);
      setScreen('PetDetail');
    } finally {
      setLoading(false);
    }
  };

  const savePetProfile = async () => {
    if (!selectedPet) return;

    const birthYear = petDraft.birth_year.trim() ? Number(petDraft.birth_year) : null;
    const weight = petDraft.weight_kg.trim() ? Number(petDraft.weight_kg) : null;

    if (birthYear != null && (!Number.isFinite(birthYear) || birthYear < 1990 || birthYear > 2035)) {
      Alert.alert('Validación', 'Año de nacimiento inválido');
      return;
    }
    if (weight != null && (!Number.isFinite(weight) || weight <= 0 || weight > 120)) {
      Alert.alert('Validación', 'Peso inválido');
      return;
    }

    if (petDraft.birth_date_text.trim() && !parseBirthDateText(petDraft.birth_date_text)) {
      Alert.alert('Validación', 'Fecha inválida. Usa formato dd/mm/yy');
      return;
    }

    const payload: Partial<Pet> = {
      color: normalizeStringOrNull(petDraft.color),
      birth_year: birthYear,
      sex: normalizeStringOrNull(petDraft.sex),
      weight_kg: weight,
      description: normalizeStringOrNull(petDraft.description),
      sterilized: petDraft.sterilized,
      chip_number: normalizeStringOrNull(petDraft.chip_number),
      blood_type: normalizeStringOrNull(petDraft.blood_type),
      insurance_name: normalizeStringOrNull(petDraft.insurance_name),
      insurance_policy: normalizeStringOrNull(petDraft.insurance_policy),

      birth_date_text: normalizeStringOrNull(petDraft.birth_date_text),
      contact_primary_name: normalizeStringOrNull(petDraft.contact_primary_name),
      owner_phone: normalizeStringOrNull(petDraft.owner_phone),
      contact_secondary_name: normalizeStringOrNull(petDraft.contact_secondary_name),
      contact_secondary_phone: normalizeStringOrNull(petDraft.contact_secondary_phone),
      owner_whatsapp: normalizeStringOrNull(petDraft.owner_whatsapp),
      public_notes: normalizeStringOrNull(petDraft.public_notes),

      allergies: normalizeStringOrNull(petDraft.allergies),
      medications: normalizeStringOrNull(petDraft.medications),
      conditions: normalizeStringOrNull(petDraft.conditions),

      vet_name: normalizeStringOrNull(petDraft.vet_name),
      vet_phone: normalizeStringOrNull(petDraft.vet_phone)
    };

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pets')
        .update(payload)
        .eq('id', selectedPet.id)
        .select(
          'id,owner_id,name,species,breed,is_lost,photo_url,color,birth_year,birth_date_text,sex,weight_kg,description,sterilized,chip_number,blood_type,insurance_name,insurance_policy,contact_primary_name,owner_phone,contact_secondary_name,contact_secondary_phone,owner_whatsapp,public_notes,allergies,medications,conditions,vet_name,vet_phone'
        )
        .single();

      if (error) {
        Alert.alert('Error guardando', error.message);
        return;
      }

      setSelectedPet(data as Pet);
      setIsEditingPetDetail(false);
      await fetchPets();
      Alert.alert('Guardado ✅', 'Perfil actualizado');
    } finally {
      setLoading(false);
    }
  };

  const pickAndUploadPetPhoto = async (petId: number) => {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert('Error', 'Usuario no autenticado');
      return;
    }

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos permiso para acceder a tu galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
      base64: true
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const b64 = asset.base64;

    if (!b64) {
      Alert.alert('Error', 'No se pudo leer la imagen (base64 vacío). Prueba otra foto.');
      return;
    }

    const bytes = Buffer.from(b64, 'base64');
    const uint8 = new Uint8Array(bytes);

    const path = `${user.id}/${petId}/main.jpg`;

    setLoading(true);
    try {
      const { error: upErr } = await supabase.storage.from('pet-photos').upload(path, uint8, {
        upsert: true,
        contentType: 'image/jpeg'
      });

      if (upErr) {
        Alert.alert('Error subiendo foto', upErr.message);
        return;
      }

      const { data: updatedRow, error: dbErr } = await supabase
        .from('pets')
        .update({ photo_url: path })
        .eq('id', petId)
        .select('id,photo_url')
        .single();

      if (dbErr) {
        Alert.alert('Error guardando foto', dbErr.message);
        return;
      }

      Alert.alert('Foto actualizada ✅');

      setSelectedPet((p) => (p ? { ...p, photo_url: updatedRow.photo_url } : p));
      await loadSelectedPetPhoto(updatedRow.photo_url ?? null);
      await fetchPets();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) {
          setScreen('Login');
          return;
        }

        if (data.session) {
          setUserId(data.session.user.id);
          setIsLoggedIn(true);
          await fetchPets();
          await fetchUpcomingVaccines();
          if (!mounted) return;
          setScreen('Home');
        } else {
          setScreen('Login');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      if (session) {
        setUserId(session.user.id);
        await fetchPets();
        await fetchUpcomingVaccines();
        if (!mounted) return;
        setScreen('Home');
      } else {
        setUserId(null);
        setPets([]);
        setSelectedPet(null);
        setPetPhotoSignedUrl(null);
        setScreen('Login');
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lookupTagCode = async (code: string) => {
    if (!code) { Alert.alert('Ingresa el código del tag'); return; }
    setLoading(true);
    const { data, error } = await supabase.rpc('get_pet_public_by_tag', { p_code: code });
    setLoading(false);
    if (error) { Alert.alert('Error', error.message); return; }
    if (!data || data.length === 0) {
      Alert.alert('No encontrado', 'Este tag no está registrado o no tiene una mascota vinculada.');
      return;
    }
    setFoundPet(data[0]);
    setScreen('FoundResult');
  };

  const handleFoundLookup = async () => {
    await lookupTagCode(foundCode.trim());
  };

  const readNfcTagForFound = async () => {
    if (!NfcManager) {
      Alert.alert('NFC no disponible', 'Requiere la app instalada desde TestFlight, no Expo Go.');
      return;
    }
    let sessionStarted = false;
    try {
      const supported = await NfcManager.isSupported();
      if (!supported) { Alert.alert('Sin NFC', 'Este dispositivo no tiene chip NFC.'); return; }
      await NfcManager.start();
      sessionStarted = true;
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Acerca el iPhone al tag NFC del collar'
      });
      const tag = await NfcManager.getTag();
      const ndefRecords = tag?.ndefMessage ?? [];
      let raw = '';
      for (const record of ndefRecords) {
        if (record.payload) {
          const payload = new Uint8Array(record.payload);
          // Los tags de ChipDog se graban como URI records
          raw = Ndef.uri?.decodePayload
            ? Ndef.uri.decodePayload(payload)
            : String.fromCharCode(...payload.slice(1));
          if (raw) break;
        }
      }
      const code = extractCodeFromUrl(raw);
      if (!code) { Alert.alert('Tag sin código', 'No se pudo leer el código del tag.'); return; }
      await lookupTagCode(code);
    } catch (e: any) {
      if (e?.message !== 'cancelled') Alert.alert('Error NFC', e?.message ?? 'No se pudo leer el tag.');
    } finally {
      if (sessionStarted) await NfcManager.cancelTechnologyRequest().catch(() => {});
    }
  };

  const handleLogin = async () => {
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      Alert.alert('Validación', parsed.error.errors[0]?.message ?? 'Datos inválidos');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data as { email: string; password: string });
    setLoading(false);

    if (error) {
      Alert.alert('Login falló', error.message);
      return;
    }

    await fetchPets();
    await fetchUpcomingVaccines();
    await registerPushToken();
    await loadUserName();
    setIsLoggedIn(true);
    setScreen('Home');
  };

  const loadUserName = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const name = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? null;
    setUserName(name);
    setUserId(user?.id ?? null);
    setUserEmail(user?.email ?? null);
  };

  const loadPetMembers = async (petId: number) => {
    const { data } = await supabase
      .from('pet_members')
      .select('*')
      .eq('pet_id', petId)
      .order('created_at', { ascending: true });
    setPetMembers((data as PetMember[]) ?? []);
  };

  const loadPendingInvitations = async () => {
    const { data } = await supabase.rpc('get_my_pending_invitations');
    setPendingInvitations((data as PetMemberInvitation[]) ?? []);
  };

  const sendCoOwnerInvite = async () => {
    if (!selectedPet) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Email inválido', 'Ingresa un email válido.');
      return;
    }
    setLoading(true);
    try {
      const { data: json, error: fnError } = await supabase.functions.invoke('invite-coowner', {
        body: { pet_id: selectedPet.id, invited_email: email },
      });
      if (fnError) {
        Alert.alert('Error', fnError.message ?? 'No se pudo enviar la invitación.');
        return;
      }
      setInviteEmail('');
      await loadPetMembers(selectedPet.id);
      const msg = json.has_account
        ? `Se envió la invitación a ${email}. Recibirá una notificación en la app.`
        : `Se envió un email a ${email} para que descargue ChipDog y acepte la invitación.`;
      Alert.alert('Invitación enviada ✅', msg, [
        { text: 'Volver', onPress: () => setScreen('PetMembers') }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const respondInvitation = async (memberId: number, accept: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('pet_members')
        .update({ status: accept ? 'accepted' : 'rejected', user_id: user.id, updated_at: new Date().toISOString() })
        .eq('id', memberId);
      if (error) { Alert.alert('Error', error.message); return; }
      await loadPendingInvitations();
      if (accept) {
        await fetchPets();
        Alert.alert('¡Bienvenido!', 'Ahora eres co-dueño de esta mascota. Aparecerá en tu lista.');
      }
    } finally {
      setLoading(false);
    }
  };

  const removeCoOwner = async (memberId: number) => {
    Alert.alert('Eliminar co-dueño', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          setLoading(true);
          try {
            const { error } = await supabase.from('pet_members').delete().eq('id', memberId);
            if (error) { Alert.alert('Error', error.message); return; }
            if (selectedPet) await loadPetMembers(selectedPet.id);
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  };

  const loadUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (!data) return;
    setUserProfile(data as UserProfile);
    setProfileDraft({
      first_name: data.first_name ?? '',
      last_name: data.last_name ?? '',
      phone: data.phone ?? '',
      rut: data.rut ?? '',
      sex: data.sex ?? '',
      birth_year: data.birth_year ?? 0,
      commune: data.commune ?? '',
    });
  };

  const saveUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (!profileDraft.first_name.trim() || !profileDraft.last_name.trim()) {
      Alert.alert('Validación', 'Nombre y apellido son requeridos.');
      return;
    }
    if (!profileDraft.phone.trim()) {
      Alert.alert('Validación', 'El teléfono es requerido.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          first_name: profileDraft.first_name.trim(),
          last_name: profileDraft.last_name.trim(),
          phone: profileDraft.phone.trim(),
          rut: profileDraft.rut.trim(),
          sex: profileDraft.sex,
          birth_year: profileDraft.birth_year,
          commune: profileDraft.commune.trim(),
        }, { onConflict: 'id' });
      if (error) { Alert.alert('Error guardando perfil', error.message); return; }
      await loadUserProfile();
      // Actualizar nombre en header
      setUserName(`${profileDraft.first_name.trim()} ${profileDraft.last_name.trim()}`);
      setIsEditingProfile(false);
      Alert.alert('Guardado ✅', 'Tu perfil fue actualizado.');
    } finally {
      setLoading(false);
    }
  };


  const handleRegisterStep1 = () => {
    const { firstName, lastName, email: regEmail, password: regPass, confirmPassword } = registerForm;
    if (!firstName.trim()) { Alert.alert('Campo requerido', 'Ingresa tu nombre.'); return; }
    if (!lastName.trim()) { Alert.alert('Campo requerido', 'Ingresa tu apellido.'); return; }
    if (!regEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) {
      Alert.alert('Email inválido', 'Ingresa un email válido.'); return;
    }
    if (regPass.length < 6) { Alert.alert('Contraseña muy corta', 'Debe tener al menos 6 caracteres.'); return; }
    if (regPass !== confirmPassword) { Alert.alert('Las contraseñas no coinciden', 'Verifica que ambas contraseñas sean iguales.'); return; }
    setRegisterStep(2);
  };

  const handleRegister = async () => {
    const { firstName, lastName, email: regEmail, password: regPass, phone, rut, sex, birthYear, commune } = registerForm;

    if (!phone.trim()) { Alert.alert('Campo requerido', 'Ingresa tu teléfono.'); return; }
    if (!rut.trim()) { Alert.alert('Campo requerido', 'Ingresa tu RUT.'); return; }
    if (!sex) { Alert.alert('Campo requerido', 'Selecciona tu sexo.'); return; }
    const year = parseInt(birthYear);
    if (!birthYear || isNaN(year) || year < 1920 || year > 2010) {
      Alert.alert('Año inválido', 'Ingresa un año de nacimiento válido.'); return;
    }
    if (!commune.trim()) { Alert.alert('Campo requerido', 'Ingresa tu comuna.'); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: regEmail.trim().toLowerCase(),
        password: regPass,
        options: { data: { full_name: `${firstName.trim()} ${lastName.trim()}` } },
      });

      if (error) { Alert.alert('Error al crear cuenta', error.message); return; }

      if (data.user) {
        const { error: profileError } = await supabase.from('user_profiles').insert({
          id: data.user.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          rut: rut.trim(),
          sex,
          birth_year: year,
          commune: commune.trim(),
        });
        if (profileError) console.log('Profile insert error:', profileError.message);
      }

      if (data.session) {
        await fetchPets();
        await fetchUpcomingVaccines();
        await registerPushToken();
        await loadUserName();
        setIsLoggedIn(true);
        setRegisterForm({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', phone: '', rut: '', sex: '', birthYear: '', commune: '' });
        setRegisterStep(1);
        setScreen('Home');
      } else {
        Alert.alert('Revisa tu correo 📬', `Te enviamos un email a ${regEmail.trim()} para confirmar tu cuenta.`,
          [{ text: 'Entendido', onPress: () => { setRegisterStep(1); setScreen('Login'); } }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);

    if (error) {
      Alert.alert('Error cerrando sesión', error.message);
      return;
    }

    setPets([]);
    setSelectedPet(null);
    setPetPhotoSignedUrl(null);
    setNearbyLostPets([]);
    setAllLostPets([]);
    setNearbyUserLoc(null);
    setUserName(null);
    setUserId(null);
    setUserEmail(null);
    setUserProfile(null);
    setProfileDraft({ first_name: '', last_name: '', phone: '', rut: '', sex: '', birth_year: 0, commune: '' });
    setPendingInvitations([]);
    setLostPetSignedUrls({});
    setIsLoggedIn(false);
    setEmail('');
    setPassword('');
    setScreen('Login');
  };

  const resetPetForm = () => {
    setPetForm({ name: '', species: 'Perro', breed: '', sex: '', description: '', weight_kg: '', sterilized: false, chip_number: '' });
    setPetBirthDate(null);
    setBirthDateText('');
    setPetFormStep(1);
    setBreedSearch('');
    setShowBreedDropdown(false);
    setShowSpeciesDropdown(false);
    setShowSexPetDropdown(false);
    setShowBirthCalendar(false);
    setCalendarMonthDate(new Date());
  };

  const handleCreatePet = async () => {
    if (!petForm.name.trim()) { Alert.alert('Campo requerido', 'El nombre es obligatorio.'); return; }
    if (!petForm.description.trim()) { Alert.alert('Campo requerido', 'La descripción física es obligatoria.'); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { Alert.alert('Error', 'Usuario no autenticado'); return; }

    const weight = petForm.weight_kg ? parseFloat(petForm.weight_kg) : null;

    setLoading(true);
    const { error } = await supabase.from('pets').insert({
      owner_id: user.id,
      name: petForm.name.trim(),
      species: petForm.species === 'Perro' ? 'dog' : 'cat',
      breed: petForm.breed || null,
      sex: petForm.sex || null,
      description: petForm.description.trim(),
      weight_kg: weight && !isNaN(weight) ? weight : null,
      sterilized: petForm.sterilized,
      chip_number: petForm.chip_number.trim() || null,
      birth_year: petBirthDate ? petBirthDate.getFullYear() : null,
      birth_date_text: petBirthDate ? formatBirthDate(petBirthDate) : null,
    });
    setLoading(false);

    if (error) { Alert.alert('No se pudo crear la mascota', error.message); return; }

    Alert.alert('🐾 ¡Mascota agregada!', `${petForm.name} ya está en tu perfil.`);
    resetPetForm();
    await fetchPets();
    setScreen('PetList');
  };

  const generateTagCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'CD-';
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const extractCodeFromUrl = (raw: string): string => {
    const match = raw.match(/\/tag\/([A-Z0-9-]+)/i);
    return match ? match[1].toUpperCase() : raw.trim().toUpperCase();
  };

  const saveLinkTagCode = async (code: string) => {
    if (!selectedPet) { Alert.alert('Error', 'No hay mascota seleccionada.'); return false; }
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from('tags').select('id, pet_id').eq('code', code).maybeSingle();

      if (!existing) {
        const { error } = await supabase.from('tags')
          .insert({ code, pet_id: selectedPet.id, status: 'linked' });
        if (error) throw error;
      } else if (!existing.pet_id || existing.pet_id === selectedPet.id) {
        const { error } = await supabase.from('tags')
          .update({ pet_id: selectedPet.id, status: 'linked' }).eq('code', code);
        if (error) throw error;
      } else {
        // Vinculado a otra mascota — bloqueo total
        Alert.alert(
          '🔒 Tag no disponible',
          `El tag ${code} ya está registrado con otra mascota y no puede ser reutilizado.\n\nCada tag físico pertenece de por vida a una sola mascota.`,
          [{ text: 'Entendido', style: 'cancel' }]
        );
        return false;
      }
      return true;
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'No se pudo vincular el tag.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const writeNfcTag = async () => {
    if (!NfcManager) {
      Alert.alert('NFC no disponible', 'Requiere la app instalada desde TestFlight, no Expo Go.');
      return;
    }
    const url = `https://chipdog.app/tag/${linkTagCode}`;
    setNfcStatus('scanning');
    setNfcError('');
    let sessionStarted = false;
    try {
      const supported = await NfcManager.isSupported();
      if (!supported) {
        setNfcStatus('error');
        setNfcError('Este dispositivo no tiene chip NFC.');
        return;
      }
      await NfcManager.start();
      sessionStarted = true;
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Acerca el iPhone al tag NFC de ChipDog'
      });
      const bytes = Ndef.encodeMessage([Ndef.uriRecord(url)]);
      await NfcManager.ndefHandler.writeNdefMessage(bytes);
      // Intentar bloquear el chip contra reescritura (funciona en Android; iOS no lo soporta)
      try { await NfcManager.ndefHandler.makeReadOnly(); } catch (_) {}
      await NfcManager.setAlertMessageIOS('Tag grabado ✅');
      // Guardar en Supabase
      const ok = await saveLinkTagCode(linkTagCode);
      if (ok) setNfcStatus('success');
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('user')) {
        setNfcStatus('idle');
      } else {
        setNfcStatus('error');
        setNfcError(msg || 'No se pudo escribir el tag NFC.');
      }
    } finally {
      if (sessionStarted) {
        await NfcManager.cancelTechnologyRequest().catch(() => {});
      }
    }
  };

  const handleLinkTag = async () => {
    // Compatibilidad con el flujo manual (TagCode input legacy)
    const parsed = linkTagSchema.safeParse({ code: tagCode });
    if (!parsed.success) { Alert.alert('Validación', parsed.error.errors[0]?.message ?? 'Código inválido'); return; }
    const ok = await saveLinkTagCode(parsed.data.code);
    if (ok) { setTagCode(''); setScreen('PetDetail'); }
  };

  // (Se mantienen por si los usas en FoundResult más adelante)
  const openWhatsApp = async (phone: string) => {
    const digits = phone.replace(/[^\d+]/g, '');
    if (!digits) return;
    const url = `https://wa.me/${digits.replace('+', '')}`;
    const can = await Linking.canOpenURL(url);
    if (!can) {
      Alert.alert('WhatsApp', 'No pude abrir WhatsApp en este dispositivo.');
      return;
    }
    Linking.openURL(url);
  };

  const openTel = async (phone: string) => {
    const digits = phone.replace(/[^\d+]/g, '');
    if (!digits) return;
    const url = `tel:${digits}`;
    const can = await Linking.canOpenURL(url);
    if (!can) {
      Alert.alert('Llamar', 'No pude abrir el dialer.');
      return;
    }
    Linking.openURL(url);
  };

  const loadVetHistory = async (petId: number) => {
    const { data, error } = await supabase
      .from('pet_vet_records')
      .select('id,visit_date,doctor_name,clinic_name,reason,symptoms,diagnosis,treatment,description,attachments,reference_photos,created_at')
      .eq('pet_id', petId)
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('Error cargando historial', error.message);
      return;
    }

    const mapped = ((data as any[]) ?? []).map((row) => ({
      id: String(row.id),
      date: row.visit_date ?? '',
      doctor: row.doctor_name ?? '',
      clinic: row.clinic_name ?? '',
      reason: row.reason ?? '',
      symptoms: Array.isArray(row.symptoms) ? row.symptoms : [],
      diagnosis: row.diagnosis ?? '',
      treatment: row.treatment ?? '',
      description: row.description ?? '',
      attachments: Array.isArray(row.attachments)
        ? row.attachments
            .map((item: any) => ({
              id: String(item?.id ?? `${row.id}-att`),
              kind: item?.kind === 'pdf' ? 'pdf' : 'photo',
              name: String(item?.name ?? 'Adjunto'),
              path: String(item?.path ?? ''),
              uri: undefined,
              mimeType: item?.mimeType ?? null
            }))
            .filter((item: VetAttachment) => item.path)
        : [],
      referencePhotos: Array.isArray(row.reference_photos) ? row.reference_photos : []
    })) as VetRecord[];


    const withSignedUrls = await Promise.all(
      mapped.map(async (record) => {
        const resolvedAttachments = await Promise.all(
          record.attachments.map(async (attachment) => {
            const { data: signedData, error: signedError } = await supabase.storage
              .from(vetAttachmentsBucket)
              .createSignedUrl(attachment.path, 60 * 60);

            if (signedError) {
              return { ...attachment, uri: undefined };
            }
            return { ...attachment, uri: signedData.signedUrl };
          })
        );

        return { ...record, attachments: resolvedAttachments };
      })
    );

    setVetHistory(withSignedUrls);
    setSelectedVetRecord((prev) => (prev ? withSignedUrls.find((item) => item.id === prev.id) ?? null : null));
    setEditingVetRecordId((prev) => (prev && !withSignedUrls.some((item) => item.id === prev) ? null : prev));
  };

  const resetVetForm = () => {
    setVetForm({ date: '', doctor: '', clinic: '', reason: '', diagnosis: '', treatment: '', description: '', attachments: [] });
    setSymptomText('');
    setEditingVetRecordId(null);
  };

  const uploadVetAttachment = async ({
    sourceUri,
    fileName,
    mimeType,
    kind
  }: {
    sourceUri: string;
    fileName: string;
    mimeType: string;
    kind: 'photo' | 'pdf';
  }) => {
    if (!selectedPet) throw new Error('No hay mascota seleccionada');

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) throw new Error('Usuario no autenticado');

    const cleanName = sanitizeFilename(fileName || `${kind}-${Date.now()}`);
    const path = `${user.id}/${selectedPet.id}/${Date.now()}-${cleanName}`;

    const response = await fetch(sourceUri);
    const bytes = await response.arrayBuffer();
    const uint8 = new Uint8Array(bytes);

    const { error: uploadError } = await supabase.storage.from(vetAttachmentsBucket).upload(path, uint8, {
      upsert: false,
      contentType: mimeType
    });

    if (uploadError) throw uploadError;

    const { data: signedData, error: signedError } = await supabase.storage
      .from(vetAttachmentsBucket)
      .createSignedUrl(path, 60 * 60);

    if (signedError) {
      return { path, uri: undefined };
    }

    return { path, uri: signedData.signedUrl };
  };

  const addPhotoAttachmentToForm = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos permiso para acceder a tu galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const fallback = `foto-${Date.now()}.jpg`;
    const name = asset.fileName?.trim() || fallback;

    try {
      const uploaded = await uploadVetAttachment({
        sourceUri: asset.uri,
        fileName: name,
        mimeType: asset.mimeType ?? 'image/jpeg',
        kind: 'photo'
      });

      setVetForm((prev) => ({
        ...prev,
        attachments: [
          ...prev.attachments,
          { id: `${Date.now()}-photo`, kind: 'photo', name, path: uploaded.path, uri: uploaded.uri, mimeType: asset.mimeType ?? 'image/jpeg' }
        ]
      }));
    } catch (error: any) {
      Alert.alert('Adjunto', error?.message ?? 'No se pudo subir la foto.');
    }
  };

  const addPdfAttachmentToForm = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf'],
      copyToCacheDirectory: true,
      multiple: false
    });

    if (result.canceled) return;

    const file = result.assets[0];
    try {
      const uploaded = await uploadVetAttachment({
        sourceUri: file.uri,
        fileName: file.name,
        mimeType: file.mimeType ?? 'application/pdf',
        kind: 'pdf'
      });

      setVetForm((prev) => ({
        ...prev,
        attachments: [
          ...prev.attachments,
          {
            id: `${Date.now()}-pdf`,
            kind: 'pdf',
            name: file.name,
            path: uploaded.path,
            uri: uploaded.uri,
            mimeType: file.mimeType ?? 'application/pdf'
          }
        ]
      }));
    } catch (error: any) {
      Alert.alert('Adjunto', error?.message ?? 'No se pudo subir el PDF.');
    }
  };

  const openAttachment = async (attachment: VetAttachment) => {
    try {
      let targetUrl = attachment.uri;
      if (!targetUrl) {
        const { data, error } = await supabase.storage.from(vetAttachmentsBucket).createSignedUrl(attachment.path, 60 * 60);
        if (error) {
          Alert.alert('Adjunto', error.message);
          return;
        }
        targetUrl = data.signedUrl;
      }

      await Linking.openURL(targetUrl);
    } catch (error: any) {
      Alert.alert('Adjunto', error?.message ?? 'No fue posible abrir el archivo.');
    }
  };

  const removeAttachmentFromForm = (attachmentId: string) => {
    setVetForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((item) => item.id !== attachmentId)
    }));
  };

  const startEditVetRecord = (record: VetRecord) => {
    setEditingVetRecordId(record.id);
    setVetForm({
      date: record.date,
      doctor: record.doctor,
      clinic: record.clinic,
      reason: record.reason,
      diagnosis: record.diagnosis,
      treatment: record.treatment,
      description: record.description,
      attachments: record.attachments
    });
    setSymptomText(record.symptoms.join(', '));
    setVetView('form');
  };

  const deleteVetRecord = async () => {
    if (!editingVetRecordId) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('pet_vet_records').delete().eq('id', editingVetRecordId);
      if (error) {
        Alert.alert('Error eliminando registro', error.message);
        return;
      }
      if (selectedPet) await loadVetHistory(selectedPet.id);
      resetVetForm();
      setSelectedVetRecord(null);
      setVetView('list');
      Alert.alert('Eliminado ✅', 'Registro eliminado correctamente.');
    } finally {
      setLoading(false);
    }
  };

  const saveVetRecord = async () => {
    if (!selectedPet) {
      Alert.alert('Error', 'No hay mascota seleccionada.');
      return;
    }

    const date = vetForm.date.trim();
    const reason = vetForm.reason.trim();

    if (!date || !reason) {
      Alert.alert('Validación', 'Completa al menos Fecha y Motivo para guardar el registro.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        pet_id: selectedPet.id,
        visit_date: date,
        doctor_name: vetForm.doctor.trim() || null,
        clinic_name: vetForm.clinic.trim() || null,
        reason,
        symptoms: symptomText.split(',').map(s => s.trim()).filter(Boolean),
        diagnosis: vetForm.diagnosis.trim() || null,
        treatment: vetForm.treatment.trim() || null,
        description: vetForm.description.trim() || null,
        attachments: vetForm.attachments.map((item) => ({ id: item.id, kind: item.kind, name: item.name, path: item.path, mimeType: item.mimeType ?? null })),
        reference_photos: []
      };

      const query = editingVetRecordId
        ? supabase.from('pet_vet_records').update(payload).eq('id', editingVetRecordId)
        : supabase.from('pet_vet_records').insert(payload);
      const { error } = await query;
      if (error) {
        Alert.alert('Error guardando historial', error.message);
        return;
      }

      await loadVetHistory(selectedPet.id);
      const wasEditing = !!editingVetRecordId;
      resetVetForm();
      setVetView('list');
      Alert.alert('Guardado ✅', wasEditing ? 'Registro actualizado.' : 'Registro clínico guardado en historial.');
    } finally {
      setLoading(false);
    }
  };

  const renderAttachmentChip = (item: VetAttachment) => (
    <TouchableOpacity key={item.id} style={styles.attachmentChip} onPress={() => openAttachment(item)}>
      <Text style={styles.attachmentChipText}>{item.kind === 'photo' ? '📷' : '📄'} {item.name}</Text>
    </TouchableOpacity>
  );

  const renderEditableAttachmentChip = (item: VetAttachment) => (
    <View key={item.id} style={styles.attachmentEditChip}>
      <TouchableOpacity style={{ flex: 1 }} onPress={() => openAttachment(item)}>
        <Text style={styles.attachmentChipText}>{item.kind === 'photo' ? '📷' : '📄'} {item.name}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.removeAttachmentBtn} onPress={() => removeAttachmentFromForm(item.id)}>
        <Text style={styles.removeAttachmentBtnText}>Eliminar</Text>
      </TouchableOpacity>
    </View>
  );

  useEffect(() => {
    if (screen !== 'PetVetHistory' || !selectedPet) return;
    loadVetHistory(selectedPet.id);
  }, [screen, selectedPet?.id]);

  // Reset vet state al salir de la pantalla o cambiar de mascota
  useEffect(() => {
    if (screen === 'PetVetHistory') return;
    setSelectedVetRecord(null);
    setVetView('list');
    resetVetForm();
  }, [screen, selectedPet?.id]);

  const fetchWeightHistory = async (petId: number) => {
    const { data } = await supabase
      .from('pet_weight_history')
      .select('*')
      .eq('pet_id', petId)
      .order('measured_at', { ascending: true });
    setWeightHistory((data as WeightEntry[]) ?? []);
  };

  const fetchFoodHistory = async (petId: number) => {
    const { data } = await supabase
      .from('pet_food_history')
      .select('*')
      .eq('pet_id', petId)
      .order('started_at', { ascending: false });
    setFoodHistory((data as FoodEntry[]) ?? []);
  };

  const saveWeightEntry = async (petId: number, weight_kg: number, measured_at: string, notes: string) => {
    const { error } = await supabase
      .from('pet_weight_history')
      .insert({ pet_id: petId, weight_kg, measured_at, notes: notes || null });
    if (error) { Alert.alert('Error', error.message); return; }
    // Sync weight_kg in pets table so Info tab and profile card stay current
    const { error: updateError } = await supabase.from('pets').update({ weight_kg }).eq('id', petId);
    if (updateError) { Alert.alert('Error actualizando peso', updateError.message); return; }
    await fetchWeightHistory(petId);
    setSelectedPet(prev => prev?.id === petId ? { ...prev, weight_kg } : prev);
    setPetDraft(prev => ({ ...prev, weight_kg: String(weight_kg) }));
    await fetchPets();
  };

  const deleteWeightEntry = async (id: number, petId: number) => {
    await supabase.from('pet_weight_history').delete().eq('id', id);
    await fetchWeightHistory(petId);
  };

  const saveFoodEntry = async (petId: number, food_brand: string, started_at: string, notes: string) => {
    const { error } = await supabase
      .from('pet_food_history')
      .insert({ pet_id: petId, food_brand, started_at, notes: notes || null });
    if (error) { Alert.alert('Error', error.message); return; }
    await fetchFoodHistory(petId);
  };

  const deleteFoodEntry = async (id: number, petId: number) => {
    await supabase.from('pet_food_history').delete().eq('id', id);
    await fetchFoodHistory(petId);
  };

  const fetchVaccines = async (petId: number) => {
    const { data, error } = await supabase
      .from('pet_vaccines')
      .select('*')
      .eq('pet_id', petId)
      .order('applied_date', { ascending: false });
    if (error) { Alert.alert('Error cargando vacunas', error.message); return; }
    setVaccines((data as Vaccine[]) ?? []);
  };

  const saveVaccine = async () => {
    if (!selectedPet) return;
    const name = vaccineForm.vaccine_name.trim();
    const date = vaccineForm.applied_date.trim();
    if (!name || !date) {
      Alert.alert('Validación', 'Nombre y fecha de aplicación son requeridos');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        pet_id: selectedPet.id,
        vaccine_name: name,
        applied_date: date,
        expiry_date: normalizeStringOrNull(vaccineForm.expiry_date),
        next_dose_date: normalizeStringOrNull(vaccineForm.next_dose_date),
        veterinarian: normalizeStringOrNull(vaccineForm.veterinarian),
        clinic: normalizeStringOrNull(vaccineForm.clinic),
        batch_number: normalizeStringOrNull(vaccineForm.batch_number),
        notes: normalizeStringOrNull(vaccineForm.notes)
      };
      const { error } = editingVaccineId
        ? await supabase.from('pet_vaccines').update(payload).eq('id', editingVaccineId)
        : await supabase.from('pet_vaccines').insert(payload);
      if (error) { Alert.alert('Error guardando vacuna', error.message); return; }
      resetVaccineForm();
      await fetchVaccines(selectedPet.id);
      Alert.alert(editingVaccineId ? 'Vacuna actualizada ✅' : 'Vacuna registrada ✅');
    } finally {
      setLoading(false);
    }
  };

  const deleteVaccine = async (id: number) => {
    if (!selectedPet) return;
    Alert.alert('Eliminar vacuna', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          if (loading) return;
          setLoading(true);
          try {
            const { error } = await supabase.from('pet_vaccines').delete().eq('id', id);
            if (error) { Alert.alert('Error', error.message); return; }
            await fetchVaccines(selectedPet.id);
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  };

  const resetVaccineForm = () => {
    setVaccineForm({ vaccine_name: '', applied_date: '', expiry_date: '', next_dose_date: '', veterinarian: '', clinic: '', batch_number: '', notes: '' });
    setShowVaccineForm(false);
    setEditingVaccineId(null);
  };

  const startEditVaccine = (v: Vaccine) => {
    setVaccineForm({
      vaccine_name: v.vaccine_name,
      applied_date: v.applied_date,
      expiry_date: v.expiry_date ?? '',
      next_dose_date: v.next_dose_date ?? '',
      veterinarian: v.veterinarian ?? '',
      clinic: v.clinic ?? '',
      batch_number: v.batch_number ?? '',
      notes: v.notes ?? ''
    });
    setEditingVaccineId(v.id);
    setShowVaccineForm(true);
  };

  const vaccineStatus = (v: Vaccine): { label: string; color: string } => {
    if (!v.expiry_date) return { label: 'Registrada', color: '#6b7280' };
    const parts = v.expiry_date.split('/');
    if (parts.length !== 3) return { label: 'Registrada', color: '#6b7280' };
    const [d, m, y] = parts.map(Number);
    if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) return { label: 'Registrada', color: '#6b7280' };
    // Soporta tanto dd/mm/yy (2 dígitos) como dd/mm/yyyy (4 dígitos)
    const fullYear = y < 100 ? 2000 + y : y;
    const expiry = new Date(fullYear, m - 1, d);
    if (isNaN(expiry.getTime())) return { label: 'Registrada', color: '#6b7280' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return { label: 'Vencida', color: '#dc2626' };
    if (diff <= 30) return { label: 'Vence pronto', color: '#f59e0b' };
    return { label: 'Vigente', color: '#16a34a' };
  };

  useEffect(() => {
    if (screen !== 'PetDetail' || !selectedPet) return;
    fetchVaccines(selectedPet.id);
    fetchWeightHistory(selectedPet.id);
    fetchFoodHistory(selectedPet.id);
  }, [screen, selectedPet?.id]);

  // LinkTag — generar código y resetear estado
  useEffect(() => {
    if (screen === 'LinkTag') {
      setLinkTagCode(generateTagCode());
      setLinkTagMode('choose');
      setNfcStatus('idle');
      setNfcError('');
    }
  }, [screen]);

  // Reset vaccine form al salir de la pantalla o cambiar de mascota
  useEffect(() => {
    if (screen === 'PetVaccines') return;
    setShowVaccineForm(false);
    setEditingVaccineId(null);
    setVaccineForm({ vaccine_name: '', applied_date: '', expiry_date: '', next_dose_date: '', veterinarian: '', clinic: '', batch_number: '', notes: '' });
  }, [screen, selectedPet?.id]);

  // Cargar todos los perdidos al llegar al Home (para el banner)
  useEffect(() => {
    if (screen === 'Home') {
      loadAllLostPets();
      loadPendingInvitations();
      loadUserProfile();
    }
  }, [screen]);

  // Cargar perfil al entrar a Profile
  useEffect(() => {
    if (screen === 'Profile') {
      loadUserProfile();
      loadPendingInvitations();
    }
  }, [screen]);

  // Cargar miembros al entrar a PetMembers
  useEffect(() => {
    if (screen === 'PetMembers' && selectedPet) loadPetMembers(selectedPet.id);
  }, [screen, selectedPet?.id]);

  // Signed URLs para lista de mascotas perdidas (solo las que no están en cache)
  useEffect(() => {
    if (screen !== 'LostPetList') return;
    const pending = allLostPets.filter(p => p.photo_url && !(p.id in lostPetSignedUrls));
    if (!pending.length) return;
    Promise.all(
      pending.map(async (p) => {
        const { data } = await supabase.storage.from('pet-photos').createSignedUrl(p.photo_url!, 60 * 60);
        return [p.id, data?.signedUrl ?? null] as const;
      })
    ).then(entries => setLostPetSignedUrls(prev => ({ ...prev, ...Object.fromEntries(entries) })));
  }, [screen, allLostPets.length]);

  // Cargar avistamientos al entrar al detalle
  useEffect(() => {
    if (screen === 'LostPetDetail' && selectedLostPet) {
      fetchSightings(selectedLostPet.id);
    } else {
      setSightings([]);
    }
  }, [screen, selectedLostPet?.id]);

  // Signed URL para foto de mascota perdida en detalle
  useEffect(() => {
    if (screen !== 'LostPetDetail' || !selectedLostPet?.photo_url) {
      setLostPetPhotoUrl(null);
      return;
    }
    // Reusar si ya la tenemos de la lista
    if (lostPetSignedUrls[selectedLostPet.id]) {
      setLostPetPhotoUrl(lostPetSignedUrls[selectedLostPet.id]);
      return;
    }
    supabase.storage
      .from('pet-photos')
      .createSignedUrl(selectedLostPet.photo_url, 60 * 60)
      .then(({ data }) => setLostPetPhotoUrl(data?.signedUrl ?? null));
  }, [screen, selectedLostPet?.id]);

  // Al entrar al NearbyMap: cargar todos los pines (sin filtro) + intentar ubicación
  useEffect(() => {
    if (screen !== 'NearbyMap') return;
    // 1. Cargar todos los perdidos sin esperar ubicación
    loadAllLostPets();
    // 2. Intentar obtener ubicación para centrar el mapa
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
      } catch { /* sin ubicación, el mapa queda centrado en Santiago */ }
    })();
  }, [screen]);

  const handleBack = () => {
    switch (screen) {
      case 'Register':      setRegisterStep(1); return setScreen('Login');
      case 'PetList':       return setScreen('Home');
      case 'NearbyMap':     return setScreen('Home');
      case 'LostPetList':   return setScreen('NearbyMap');
      case 'LostPetDetail': return setScreen('LostPetList');
      case 'AddPet':        resetPetForm(); return setScreen('PetList');
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
          if (editingVetRecordId) { setVetView('detail'); }
          else { setVetView('list'); resetVetForm(); }
          return;
        }
        if (vetView === 'detail') { setVetView('list'); setSelectedVetRecord(null); return; }
        return setScreen('PetDetail');
      case 'Profile':       setIsEditingProfile(false); return setScreen('Home');
      case 'InviteCoOwner': setInviteEmail(''); return setScreen('PetMembers');
      case 'PetMembers':    return setScreen('PetDetail');
      case 'FoundTag':      return setScreen(isLoggedIn ? 'Home' : 'Login');
      case 'FoundResult':   return setScreen('FoundTag');
      case 'ScanTag':       setQrScanned(false); return setScreen('FoundTag');
      default: break;
    }
  };

  const canGoBack = screen !== 'Login' && screen !== 'Home';

  // Ref para que el PanResponder (creado una sola vez) llame siempre
  // a la versión actualizada de handleBack sin closure stale
  const handleBackRef = useRef(handleBack);
  handleBackRef.current = handleBack;

  const swipePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gs) =>
        gs.dx > 10 && Math.abs(gs.dy) < 50,
      onPanResponderRelease: (_evt, gs) => {
        if (gs.dx > 50) handleBackRef.current();
      },
    })
  ).current;

  const renderScreen = () => {
    if (screen === 'Login') {
      return (
        <LoginScreen
          email={email} setEmail={setEmail}
          password={password} setPassword={setPassword}
          loading={loading}
          showPassword={showPassword} setShowPassword={setShowPassword}
          handleLogin={handleLogin}
          setScreen={setScreen}
        />
      );
    }

    if (screen === 'Register') {
      return (
        <RegisterScreen
          registerStep={registerStep} setRegisterStep={setRegisterStep}
          registerForm={registerForm} setRegisterForm={setRegisterForm}
          showPassword={showPassword} setShowPassword={setShowPassword}
          showConfirmPassword={showConfirmPassword} setShowConfirmPassword={setShowConfirmPassword}
          showSexDropdown={showSexDropdown} setShowSexDropdown={setShowSexDropdown}
          showRegisterCommuneDropdown={showRegisterCommuneDropdown} setShowRegisterCommuneDropdown={setShowRegisterCommuneDropdown}
          registerCommuneSearch={registerCommuneSearch} setRegisterCommuneSearch={setRegisterCommuneSearch}
          loading={loading}
          handleRegisterStep1={handleRegisterStep1}
          handleRegister={handleRegister}
          setScreen={setScreen}
        />
      );
    }

    if (screen === 'Profile') {
      return (
        <ProfileScreen
          loading={loading}
          profileDraft={profileDraft} setProfileDraft={setProfileDraft}
          isEditingProfile={isEditingProfile} setIsEditingProfile={setIsEditingProfile}
          showProfileSexDropdown={showProfileSexDropdown} setShowProfileSexDropdown={setShowProfileSexDropdown}
          showProfileCommuneDropdown={showProfileCommuneDropdown} setShowProfileCommuneDropdown={setShowProfileCommuneDropdown}
          communeSearch={communeSearch} setCommuneSearch={setCommuneSearch}
          pendingInvitations={pendingInvitations}
          respondInvitation={respondInvitation}
          saveUserProfile={saveUserProfile}
          handleLogout={handleLogout}
          pets={pets}
          userEmail={userEmail}
          setScreen={setScreen}
        />
      );
    }

    if (screen === 'PetMembers') {
      return (
        <PetMembersScreen
          petMembers={petMembers}
          selectedPet={selectedPet}
          loading={loading}
          removeCoOwner={removeCoOwner}
          setInviteEmail={setInviteEmail}
          setScreen={setScreen}
        />
      );
    }

    if (screen === 'InviteCoOwner') {
      return (
        <InviteCoOwnerScreen
          selectedPet={selectedPet}
          inviteEmail={inviteEmail}
          setInviteEmail={setInviteEmail}
          loading={loading}
          sendCoOwnerInvite={sendCoOwnerInvite}
        />
      );
    }

    if (screen === 'FoundTag') {
      return (
        <FoundTagScreen
          foundCode={foundCode} setFoundCode={setFoundCode}
          loading={loading} isLoggedIn={isLoggedIn}
          handleFoundLookup={handleFoundLookup}
          readNfcTagForFound={readNfcTagForFound}
          setQrScanned={setQrScanned}
          setScreen={setScreen}
        />
      );
    }

    if (screen === 'FoundResult') {
      return (
        <FoundResultScreen
          foundPet={foundPet}
          isLoggedIn={isLoggedIn}
          setScreen={setScreen}
        />
      );
    }

    if (screen === 'Home') {
      return (
        <HomeScreen
          pets={pets}
          petSignedUrls={petSignedUrls}
          userProfile={userProfile}
          userName={userName}
          upcomingVaccinesCount={upcomingVaccinesCount}
          pendingInvitations={pendingInvitations}
          handleLogout={handleLogout}
          loadPetDetail={loadPetDetail}
          setScreen={setScreen}
        />
      );
    }

    if (screen === 'PetList') {
      return (
        <PetListScreen
          pets={pets}
          petSignedUrls={petSignedUrls}
          loadPetDetail={loadPetDetail}
          togglePetFeatured={togglePetFeatured}
          setScreen={setScreen}
        />
      );
    }

    if (screen === 'AddPet') {
      return (
        <AddPetScreen
          petForm={petForm} setPetForm={setPetForm}
          petFormStep={petFormStep} setPetFormStep={setPetFormStep}
          petBirthDate={petBirthDate} setPetBirthDate={setPetBirthDate}
          birthDateText={birthDateText} setBirthDateText={setBirthDateText}
          calendarMonthDate={calendarMonthDate} setCalendarMonthDate={setCalendarMonthDate}
          showBirthCalendar={showBirthCalendar} setShowBirthCalendar={setShowBirthCalendar}
          showSpeciesDropdown={showSpeciesDropdown} setShowSpeciesDropdown={setShowSpeciesDropdown}
          showBreedDropdown={showBreedDropdown} setShowBreedDropdown={setShowBreedDropdown}
          showSexPetDropdown={showSexPetDropdown} setShowSexPetDropdown={setShowSexPetDropdown}
          breedSearch={breedSearch} setBreedSearch={setBreedSearch}
          loading={loading}
          handleCreatePet={handleCreatePet}
          setScreen={setScreen}
        />
      );
    }

    if (screen === 'PetDetail') {
      return (
        <PetDetailScreen
          selectedPet={selectedPet}
          petPhotoSignedUrl={petPhotoSignedUrl}
          userId={userId}
          loading={loading}
          setLoading={setLoading}
          setSelectedPet={setSelectedPet}
          pickAndUploadPetPhoto={pickAndUploadPetPhoto}
          openLostMap={openLostMap}
          updatePetLostStatus={updatePetLostStatus}
          updatePetContactPublic={updatePetContactPublic}
          fetchPets={fetchPets}
          petDraft={petDraft} setPetDraft={setPetDraft}
          showProfileBirthCalendar={showProfileBirthCalendar}
          setShowProfileBirthCalendar={setShowProfileBirthCalendar}
          profileBirthCalendarMonth={profileBirthCalendarMonth}
          setProfileBirthCalendarMonth={setProfileBirthCalendarMonth}
          savePetProfile={savePetProfile}
          vaccines={vaccines}
          showVaccineForm={showVaccineForm} setShowVaccineForm={setShowVaccineForm}
          editingVaccineId={editingVaccineId} setEditingVaccineId={setEditingVaccineId}
          vaccineForm={vaccineForm} setVaccineForm={setVaccineForm}
          saveVaccine={saveVaccine} deleteVaccine={deleteVaccine}
          resetVaccineForm={resetVaccineForm} startEditVaccine={startEditVaccine}
          vaccineStatus={vaccineStatus}
          vetView={vetView} setVetView={setVetView}
          vetHistory={vetHistory}
          selectedVetRecord={selectedVetRecord} setSelectedVetRecord={setSelectedVetRecord}
          vetForm={vetForm} setVetForm={setVetForm}
          symptomText={symptomText} setSymptomText={setSymptomText}
          editingVetRecordId={editingVetRecordId}
          saveVetRecord={saveVetRecord} deleteVetRecord={deleteVetRecord} resetVetForm={resetVetForm}
          addPhotoAttachmentToForm={addPhotoAttachmentToForm} addPdfAttachmentToForm={addPdfAttachmentToForm}
          renderEditableAttachmentChip={renderEditableAttachmentChip} renderAttachmentChip={renderAttachmentChip}
          linkTagCode={linkTagCode}
          linkTagMode={linkTagMode} setLinkTagMode={setLinkTagMode}
          nfcStatus={nfcStatus} setNfcStatus={setNfcStatus}
          nfcError={nfcError} setNfcError={setNfcError}
          writeNfcTag={writeNfcTag} saveLinkTagCode={saveLinkTagCode}
          weightHistory={weightHistory} foodHistory={foodHistory}
          saveWeightEntry={saveWeightEntry} deleteWeightEntry={deleteWeightEntry}
          saveFoodEntry={saveFoodEntry} deleteFoodEntry={deleteFoodEntry}
          setScreen={setScreen}
        />
      );
    }

    if (screen === 'LostPetMap') {
      return (
        <LostPetMapScreen
          lostPin={lostPin} setLostPin={setLostPin}
          lostRadius={lostRadius} setLostRadius={setLostRadius}
          selectedPet={selectedPet}
          loading={loading}
          saveLostLocation={saveLostLocation}
          setScreen={setScreen}
        />
      );
    }

    if (screen === 'NearbyMap') {
      return (
        <NearbyMapScreen
          allLostPets={allLostPets}
          nearbyMapRef={nearbyMapRef}
          setSelectedLostPet={setSelectedLostPet}
          setScreen={setScreen}
        />
      );
    }

    if (screen === 'LostPetList') {
      return (
        <LostPetListScreen
          allLostPets={allLostPets}
          lostListSpecies={lostListSpecies} setLostListSpecies={setLostListSpecies}
          lostListCommune={lostListCommune} setLostListCommune={setLostListCommune}
          lostPetSignedUrls={lostPetSignedUrls}
          setSelectedLostPet={setSelectedLostPet}
          setScreen={setScreen}
        />
      );
    }

    if (screen === 'LostPetDetail' && selectedLostPet) {
      return (
        <LostPetDetailScreen
          selectedLostPet={selectedLostPet}
          lostPetPhotoUrl={lostPetPhotoUrl}
          sightings={sightings}
          saveSighting={saveSighting}
          deleteSighting={deleteSighting}
          userId={userId}
          setScreen={setScreen}
        />
      );
    }

    // ── LinkTag ──
    if (screen === 'LinkTag') {
      return (
        <LinkTagScreen
          linkTagCode={linkTagCode}
          linkTagMode={linkTagMode} setLinkTagMode={setLinkTagMode}
          nfcStatus={nfcStatus} setNfcStatus={setNfcStatus}
          nfcError={nfcError} setNfcError={setNfcError}
          selectedPet={selectedPet}
          loading={loading}
          writeNfcTag={writeNfcTag}
          saveLinkTagCode={saveLinkTagCode}
          setScreen={setScreen}
        />
      );
    }

    // ── ScanTag (full-screen QR scanner) ──
    if (screen === 'ScanTag') {
      return (
        <ScanTagScreen
          cameraPermission={cameraPermission}
          requestCameraPermission={requestCameraPermission}
          qrScanned={qrScanned} setQrScanned={setQrScanned}
          onBarcodeScanned={(data) => {
            const code = extractCodeFromUrl(data);
            setFoundCode(code);
            lookupTagCode(code);
          }}
          setScreen={setScreen}
        />
      );
    }

    return null;
  };

  const isFullScreenMap = screen === 'ScanTag';
  const isFullScreen = isFullScreenMap || screen === 'NearbyMap' || screen === 'LostPetDetail' || screen === 'Login' || screen === 'Register' || screen === 'Home' || screen === 'PetList' || screen === 'PetDetail' || screen === 'Profile';

  return (
    <>
      {isFullScreen ? (
        /* Login, Register, NearbyMap, ScanTag — sin SafeAreaView para que el contenido llegue al borde superior */
        <View style={{ flex: 1, backgroundColor: C.bg }}>
          {renderScreen()}
          {/* Botón atrás flotante solo en pantallas de mapa/cámara */}
          {isFullScreenMap && <TouchableOpacity
            style={{ position: 'absolute', top: 54, left: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 4 }}
            onPress={handleBack} activeOpacity={0.85}>
            <Text style={{ fontSize: 22, color: C.primary, lineHeight: 26, marginTop: -2 }}>‹</Text>
            <Text style={{ fontSize: 14, color: C.primary, fontWeight: '700', marginLeft: 4 }}>Inicio</Text>
          </TouchableOpacity>}
        </View>
      ) : (
        <SafeAreaView style={styles.container}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 6 : 0}
          >
            {canGoBack ? (
              <View style={styles.navBar}>
                {/* Botón atrás */}
                <TouchableOpacity style={styles.navBackBtn} onPress={handleBack} activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.navBackArrow}>‹</Text>
                  <Text style={styles.navBackLabel}>Atrás</Text>
                </TouchableOpacity>

                {/* Título centrado */}
                <Text style={styles.navTitle} numberOfLines={1}>{title}</Text>

                {/* Acción derecha (Editar / Cancelar) */}
                {(screen === 'PetInfo' || screen === 'PetContact' || (screen === 'PetVetHistory' && vetView === 'detail')) ? (
                  <TouchableOpacity
                    style={styles.navActionBtn}
                    onPress={() => {
                      if (screen === 'PetVetHistory' && vetView === 'detail') {
                        if (selectedVetRecord) startEditVetRecord(selectedVetRecord);
                        return;
                      }
                      if (isEditingPetDetail) {
                        if (selectedPet) {
                          setPetDraft({
                            color: selectedPet.color ?? '',
                            birth_year: selectedPet.birth_year != null ? String(selectedPet.birth_year) : '',
                            birth_date_text: selectedPet.birth_date_text ?? '',
                            sex: selectedPet.sex ?? '',
                            weight_kg: selectedPet.weight_kg != null ? String(selectedPet.weight_kg) : '',
                            description: selectedPet.description ?? '',
                            sterilized: selectedPet.sterilized ?? false,
                            chip_number: selectedPet.chip_number ?? '',
                            blood_type: selectedPet.blood_type ?? '',
                            insurance_name: selectedPet.insurance_name ?? '',
                            insurance_policy: selectedPet.insurance_policy ?? '',
                            contact_primary_name: selectedPet.contact_primary_name ?? '',
                            owner_phone: selectedPet.owner_phone ?? '',
                            contact_secondary_name: selectedPet.contact_secondary_name ?? '',
                            contact_secondary_phone: selectedPet.contact_secondary_phone ?? '',
                            owner_whatsapp: selectedPet.owner_whatsapp ?? '',
                            public_notes: selectedPet.public_notes ?? '',
                            allergies: selectedPet.allergies ?? '',
                            medications: selectedPet.medications ?? '',
                            conditions: selectedPet.conditions ?? '',
                            vet_name: selectedPet.vet_name ?? '',
                            vet_phone: selectedPet.vet_phone ?? '',
                            food_brand: selectedPet.food_brand ?? '',
                            food_notes: selectedPet.food_notes ?? '',
                          });
                        }
                        setIsEditingPetDetail(false);
                      } else {
                        setIsEditingPetDetail(true);
                      }
                    }}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 12, right: 0 }}
                  >
                    <Text style={{ color: isEditingPetDetail ? C.danger : C.primary, fontWeight: '700', fontSize: 15 }}>
                      {isEditingPetDetail ? 'Cancelar' : 'Editar'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.navActionBtn} />
                )}
              </View>
            ) : null}

            <ScrollView
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            >
              {renderScreen()}
            </ScrollView>

            {loading && <ActivityIndicator style={styles.loader} />}

            {/* Swipe-back desde borde izquierdo */}
            {canGoBack && (
              <View
                pointerEvents="box-only"
                style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 30 }}
                {...swipePan.panHandlers}
              />
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      )}
    </>
  );
}

