import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  PanResponder,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Switch,
  Linking
} from 'react-native';
import { addPetSchema, linkTagSchema, loginSchema } from '@chipdog/shared';
import { supabase, vetAttachmentsBucket } from './lib/supabase';
import { C } from './constants/colors';
import { SPECIES_OPTIONS, DOG_BREEDS, CAT_BREEDS } from './constants/breeds';
import {
  autoFormatDate, normalizeStringOrNull, sanitizeFilename, initialsFromName,
  formatBirthDate, formatBirthDateShort, buildCalendarDays, parseBirthDateText,
  extractCodeFromUrl, generateTagCode,
} from './utils/helpers';
import type {
  Screen, Pet, PetMember, PetMemberInvitation, UserProfile,
  FoundPet, Vaccine, LostPetPin, NearbyLostPet, VetRecord, VetAttachment,
} from './types';
import { styles } from './styles';
import InfoRow from './components/InfoRow';
import Card from './components/Card';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import FoundTagScreen from './screens/FoundTagScreen';
import FoundResultScreen from './screens/FoundResultScreen';
import LinkTagScreen from './screens/LinkTagScreen';
import ProfileScreen from './screens/ProfileScreen';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Buffer } from 'buffer';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import MapView, { Circle, Marker } from 'react-native-maps';
import { CameraView, useCameraPermissions } from 'expo-camera';

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
    vet_phone: ''
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
      .select('id,owner_id,name,species,breed,is_lost,photo_url')
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('Error listando mascotas', error.message);
      return;
    }

    const nextPets = (data as Pet[]) ?? [];
    setPets(nextPets);
    await loadHomePetPhotos(nextPets);
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
        vet_phone: pet.vet_phone ?? ''
      });

      await loadSelectedPetPhoto(pet.photo_url ?? null);
    } finally {
      setLoading(false);
    }
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

  const formatRut = (value: string) => {
    const clean = value.replace(/[^0-9kK]/g, '').toUpperCase();
    if (clean.length <= 1) return clean;
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);
    const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formatted}-${dv}`;
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
      species: petForm.species,
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
    if (screen !== 'PetVaccines' || !selectedPet) return;
    fetchVaccines(selectedPet.id);
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
        />
      );
    }

    if (screen === 'PetMembers') {
      const accepted = petMembers.filter(m => m.status === 'accepted');
      const pending  = petMembers.filter(m => m.status === 'pending');
      return (
        <View style={styles.form}>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => { setInviteEmail(''); setScreen('InviteCoOwner'); }} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>+ Invitar co-dueño</Text>
          </TouchableOpacity>

          {accepted.length > 0 && (
            <Card title="Co-dueños activos" accent={C.success}>
              {accepted.map(m => (
                <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.dashCardIconWrap, { backgroundColor: C.successLight }]}>
                    <Text style={{ fontSize: 18 }}>👤</Text>
                  </View>
                  <Text style={{ flex: 1, color: C.text, fontWeight: '600', fontSize: 14 }}>{m.invited_email}</Text>
                  <TouchableOpacity onPress={() => removeCoOwner(m.id)} activeOpacity={0.7}>
                    <Text style={{ color: C.danger, fontWeight: '700', fontSize: 13 }}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </Card>
          )}

          {pending.length > 0 && (
            <Card title="Invitaciones pendientes" accent={C.warning}>
              {pending.map(m => (
                <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.dashCardIconWrap, { backgroundColor: C.warningLight }]}>
                    <Text style={{ fontSize: 18 }}>⏳</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontWeight: '600', fontSize: 14 }}>{m.invited_email}</Text>
                    <Text style={{ color: C.textMuted, fontSize: 12 }}>Pendiente de aceptar</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeCoOwner(m.id)} activeOpacity={0.7}>
                    <Text style={{ color: C.danger, fontWeight: '700', fontSize: 13 }}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </Card>
          )}

          {petMembers.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>👥</Text>
              <Text style={styles.emptyStateTitle}>Sin co-dueños</Text>
              <Text style={styles.emptyStateHint}>Invita a alguien para compartir el cuidado de {selectedPet?.name}.</Text>
            </View>
          )}
        </View>
      );
    }

    if (screen === 'InviteCoOwner') {
      return (
        <View style={styles.form}>
          <Card title={`Invitar co-dueño para ${selectedPet?.name}`} accent={C.primary}>
            <Text style={{ color: C.textLight, fontSize: 13, lineHeight: 18 }}>
              El co-dueño podrá ver y editar el perfil, vacunas e historial veterinario de {selectedPet?.name}.
              Recibirá un email con la invitación.
            </Text>
          </Card>

          <Card>
            <Text style={styles.fieldLabel}>Email del co-dueño</Text>
            <TextInput
              style={styles.input}
              placeholder="correo@ejemplo.com"
              placeholderTextColor={C.textMuted}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
          </Card>

          <TouchableOpacity style={styles.btnPrimary} onPress={sendCoOwnerInvite} disabled={loading} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>{loading ? 'Enviando...' : 'Enviar invitación'}</Text>
          </TouchableOpacity>
        </View>
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
      const lostCount = allLostPets.length;
      const rawFirst = userProfile?.first_name || userName?.split(' ')[0] || null;
      const firstName = rawFirst
        ? rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1).toLowerCase()
        : null;
      return (
        <View style={styles.form}>
          {/* Logo + nombre */}
          <View style={styles.homeLogoRow}>
            <Image source={require('./assets/icon.png')} style={styles.homeLogoImg} resizeMode="contain" />
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

    if (screen === 'PetList') {
      return (
        <View style={styles.form}>
          {/* Header */}
          <View style={styles.homeHeader}>
            <TouchableOpacity style={styles.inlineBackBtn} onPress={() => setScreen('Home')} activeOpacity={0.7}>
              <Text style={styles.inlineBackArrow}>‹</Text>
              <Text style={styles.inlineBackLabel}>Inicio</Text>
            </TouchableOpacity>
            <Text style={styles.homeHeaderTitle}>Mis Mascotas</Text>
            <Text style={styles.homeHeaderSubtitle}>Todo sobre tu mascota, siempre contigo.</Text>
          </View>

          {/* CTA agregar */}
          <TouchableOpacity style={styles.addPetCta} onPress={() => setScreen('AddPet')} activeOpacity={0.85}>
            <Text style={styles.addPetCtaText}>+  Agregar mascota</Text>
          </TouchableOpacity>

          {/* Lista de mascotas */}
          {pets.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>🐶</Text>
              <Text style={styles.emptyStateTitle}>Aún no tienes mascotas</Text>
              <Text style={styles.emptyStateHint}>Agrega a tu peludo y empieza a cuidarlo como se merece.</Text>
            </View>
          ) : (
            pets.map((pet) => (
              <TouchableOpacity
                key={pet.id}
                onPress={async () => {
                  await loadPetDetail(pet.id);
                  setScreen('PetDetail');
                }}
                style={styles.petCard}
                activeOpacity={0.85}
              >
                <View style={styles.petCardPhotoWrap}>
                  {petSignedUrls[pet.id] ? (
                    <Image source={{ uri: petSignedUrls[pet.id] ?? undefined }} style={styles.petCardPhoto} resizeMode="cover" />
                  ) : (
                    <View style={[styles.petCardPhoto, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarInitials}>{initialsFromName(pet.name)}</Text>
                    </View>
                  )}
                  {pet.is_lost && <View style={styles.petCardLostDot} />}
                </View>

                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.petCardName}>{pet.name}</Text>
                  <Text style={styles.petCardBreed}>
                    {pet.species}{pet.breed ? ` · ${pet.breed}` : ''}
                  </Text>
                  <View style={[styles.badge, pet.is_lost ? styles.badgeDanger : styles.badgeOk, { alignSelf: 'flex-start', marginTop: 2 }]}>
                    <Text style={[styles.badgeText, pet.is_lost ? styles.badgeTextDanger : styles.badgeTextOk]}>
                      {pet.is_lost ? '🚨 Perdido' : '🏠 En casa'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.petCardArrow}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      );
    }

    if (screen === 'AddPet') {
      const breedList = petForm.species === 'Perro' ? DOG_BREEDS : CAT_BREEDS;
      const filteredBreeds = breedSearch.trim()
        ? breedList.filter(b => b.toLowerCase().includes(breedSearch.toLowerCase()))
        : breedList.slice(0, 8);
      const monthDays = buildCalendarDays(calendarMonthDate);
      const monthTitle = calendarMonthDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
      const SEX_PET_OPTIONS = ['Macho', 'Hembra'];

      return (
        <View style={styles.form}>
          {/* Barra de progreso */}
          <View style={styles.registerProgressBar}>
            <View style={[styles.registerProgressFill, { width: petFormStep === 1 ? '50%' : '100%' }]} />
          </View>
          <Text style={{ color: C.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
            {petFormStep === 1 ? 'Paso 1 de 2 — Identidad' : 'Paso 2 de 2 — Más datos'}
          </Text>

          {petFormStep === 1 ? (
            <>
              {/* Nombre */}
              <TextInput
                style={styles.input}
                placeholder="Nombre de tu mascota"
                placeholderTextColor={C.textMuted}
                value={petForm.name}
                onChangeText={(v) => setPetForm((p) => ({ ...p, name: v }))}
              />

              {/* Especie */}
              <View>
                <TouchableOpacity style={[styles.input, styles.selectInput]} onPress={() => { setShowSpeciesDropdown(v => !v); setShowBreedDropdown(false); }} activeOpacity={0.9}>
                  <Text style={styles.selectInputText}>{petForm.species === 'Perro' ? '🐶 Perro' : '🐱 Gato'}</Text>
                  <Text style={styles.selectChevron}>{showSpeciesDropdown ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {showSpeciesDropdown && (
                  <View style={styles.selectMenu}>
                    {SPECIES_OPTIONS.map(opt => (
                      <TouchableOpacity key={opt} style={[styles.selectOption, petForm.species === opt && styles.selectOptionActive]}
                        onPress={() => { setPetForm(p => ({ ...p, species: opt, breed: '' })); setBreedSearch(''); setShowSpeciesDropdown(false); }}>
                        <Text style={[styles.selectOptionText, petForm.species === opt && styles.selectOptionTextActive]}>
                          {opt === 'Perro' ? '🐶 Perro' : '🐱 Gato'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Sexo */}
              <View>
                <TouchableOpacity style={[styles.input, styles.selectInput]} onPress={() => { setShowSexPetDropdown(v => !v); setShowBreedDropdown(false); }} activeOpacity={0.9}>
                  <Text style={[styles.selectInputText, !petForm.sex && { color: C.textMuted }]}>{petForm.sex || 'Sexo'}</Text>
                  <Text style={styles.selectChevron}>{showSexPetDropdown ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {showSexPetDropdown && (
                  <View style={styles.selectMenu}>
                    {SEX_PET_OPTIONS.map(opt => (
                      <TouchableOpacity key={opt} style={[styles.selectOption, petForm.sex === opt && styles.selectOptionActive]}
                        onPress={() => { setPetForm(p => ({ ...p, sex: opt })); setShowSexPetDropdown(false); }}>
                        <Text style={[styles.selectOptionText, petForm.sex === opt && styles.selectOptionTextActive]}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Raza con autocomplete */}
              <View>
                <View style={[styles.input, styles.selectInput, { paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' }]}>
                  <TextInput
                    style={{ flex: 1, paddingVertical: 13, paddingHorizontal: 14, fontSize: 15, color: C.dark, fontWeight: '500' }}
                    placeholder="Buscar raza (ej: border, persa...)"
                    placeholderTextColor={C.textMuted}
                    value={breedSearch || petForm.breed}
                    onChangeText={(v) => { setBreedSearch(v); setPetForm(p => ({ ...p, breed: '' })); setShowBreedDropdown(true); }}
                    onFocus={() => setShowBreedDropdown(true)}
                  />
                  {petForm.breed ? (
                    <TouchableOpacity onPress={() => { setPetForm(p => ({ ...p, breed: '' })); setBreedSearch(''); setShowBreedDropdown(true); }} style={{ paddingHorizontal: 12 }}>
                      <Text style={{ color: C.textMuted, fontSize: 18 }}>✕</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                {showBreedDropdown && (
                  <View style={[styles.selectMenu, { maxHeight: 220 }]}>
                    {/* Mestizo siempre primero y destacado */}
                    {!breedSearch && (
                      <TouchableOpacity style={[styles.selectOption, { backgroundColor: C.primaryLight }]}
                        onPress={() => { setPetForm(p => ({ ...p, breed: 'Mestizo' })); setBreedSearch(''); setShowBreedDropdown(false); }}>
                        <Text style={[styles.selectOptionText, { color: C.primary, fontWeight: '800' }]}>⭐ Mestizo</Text>
                      </TouchableOpacity>
                    )}
                    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 180 }}>
                      {filteredBreeds.filter(b => b !== 'Mestizo').map(b => (
                        <TouchableOpacity key={b} style={[styles.selectOption, petForm.breed === b && styles.selectOptionActive]}
                          onPress={() => { setPetForm(p => ({ ...p, breed: b })); setBreedSearch(''); setShowBreedDropdown(false); }}>
                          <Text style={[styles.selectOptionText, petForm.breed === b && styles.selectOptionTextActive]}>{b}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Fecha de nacimiento */}
              <View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="dd/mm/aaaa (opcional)"
                    placeholderTextColor={C.textMuted}
                    value={birthDateText}
                    onChangeText={(v) => {
                      // Solo dígitos y barras
                      let clean = v.replace(/[^\d]/g, '');
                      // Auto-formato dd/mm/aaaa
                      if (clean.length > 2) clean = clean.slice(0, 2) + '/' + clean.slice(2);
                      if (clean.length > 5) clean = clean.slice(0, 5) + '/' + clean.slice(5);
                      if (clean.length > 10) clean = clean.slice(0, 10);
                      setBirthDateText(clean);
                      // Parsear cuando esté completo
                      const match = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                      if (match) {
                        const d = parseInt(match[1]), m = parseInt(match[2]), y = parseInt(match[3]);
                        const date = new Date(y, m - 1, d);
                        if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
                          setPetBirthDate(date);
                          setCalendarMonthDate(date);
                        } else {
                          setPetBirthDate(null);
                        }
                      } else {
                        setPetBirthDate(null);
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                  <TouchableOpacity style={[styles.input, { paddingHorizontal: 14 }]} onPress={() => { setShowBirthCalendar(v => !v); setShowBreedDropdown(false); }}>
                    <Text style={{ fontSize: 20 }}>{showBirthCalendar ? '▲' : '📅'}</Text>
                  </TouchableOpacity>
                </View>
                {showBirthCalendar && (
                  <View style={styles.calendarCard}>
                    <View style={styles.calendarHeader}>
                      <TouchableOpacity style={styles.calendarArrowBtn} onPress={() => setCalendarMonthDate(c => new Date(c.getFullYear(), c.getMonth() - 1, 1))}>
                        <Text style={styles.calendarArrowText}>‹</Text>
                      </TouchableOpacity>
                      <Text style={styles.calendarMonthTitle}>{monthTitle}</Text>
                      <TouchableOpacity style={styles.calendarArrowBtn} onPress={() => setCalendarMonthDate(c => new Date(c.getFullYear(), c.getMonth() + 1, 1))}>
                        <Text style={styles.calendarArrowText}>›</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.calendarWeekRow}>
                      {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <Text key={d} style={styles.calendarWeekDay}>{d}</Text>)}
                    </View>
                    <View style={styles.calendarGrid}>
                      {monthDays.map((day, idx) => {
                        const isSelected = day != null && petBirthDate != null &&
                          petBirthDate.getFullYear() === calendarMonthDate.getFullYear() &&
                          petBirthDate.getMonth() === calendarMonthDate.getMonth() &&
                          petBirthDate.getDate() === day;
                        return (
                          <TouchableOpacity key={`${day ?? 'e'}-${idx}`} disabled={day == null}
                            style={[styles.calendarDayBtn, day == null && styles.calendarDayBtnDisabled, isSelected && styles.calendarDayBtnSelected]}
                            onPress={() => { if (!day) return; const d = new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth(), day); setPetBirthDate(d); setBirthDateText(formatBirthDate(d)); setShowBirthCalendar(false); }}>
                            <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected]}>{day ?? ''}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.btnPrimary} onPress={() => {
                if (!petForm.name.trim()) { Alert.alert('Campo requerido', 'El nombre es obligatorio.'); return; }
                setPetFormStep(2); setShowBreedDropdown(false);
              }} activeOpacity={0.85}>
                <Text style={styles.btnPrimaryText}>Continuar →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Descripción física */}
              <View>
                <Text style={styles.fieldLabel}>Descripción física *</Text>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  placeholder='Ej: "Blanco con manchas café en el lomo, orejas negras"'
                  placeholderTextColor={C.textMuted}
                  value={petForm.description}
                  onChangeText={(v) => setPetForm(p => ({ ...p, description: v }))}
                  multiline
                />
              </View>

              {/* Peso */}
              <View>
                <Text style={styles.fieldLabel}>Peso aproximado (kg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 8.5"
                  placeholderTextColor={C.textMuted}
                  value={petForm.weight_kg}
                  onChangeText={(v) => setPetForm(p => ({ ...p, weight_kg: v }))}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Esterilizado */}
              <View style={[styles.card, { paddingVertical: 14 }]}>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>✂️  Esterilizado/a</Text>
                  <Switch
                    value={petForm.sterilized}
                    onValueChange={(v) => setPetForm(p => ({ ...p, sterilized: v }))}
                    trackColor={{ false: C.border, true: C.primary }}
                    thumbColor={C.white}
                  />
                </View>
              </View>

              {/* Número de chip */}
              <View>
                <Text style={styles.fieldLabel}>Número de chip / microchip</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 985112345678901"
                  placeholderTextColor={C.textMuted}
                  value={petForm.chip_number}
                  onChangeText={(v) => setPetForm(p => ({ ...p, chip_number: v }))}
                  keyboardType="number-pad"
                />
                <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 4, marginLeft: 2 }}>
                  El número está en el certificado de vacunas o lo entrega el veterinario.
                </Text>
              </View>

              <TouchableOpacity style={styles.btnPrimary} onPress={handleCreatePet} disabled={loading} activeOpacity={0.85}>
                <Text style={styles.btnPrimaryText}>{loading ? 'Guardando...' : '🐾 Agregar mascota'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 8 }} onPress={() => setPetFormStep(1)} activeOpacity={0.85}>
                <Text style={{ color: C.textLight, fontWeight: '600', fontSize: 14 }}>← Volver al paso anterior</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      );
    }

    if (screen === 'PetDetail') {
      if (!selectedPet) {
        return (
          <View style={styles.form}>
            <Text>No hay mascota seleccionada.</Text>
            <Button title="Volver" onPress={() => setScreen('PetList')} />
          </View>
        );
      }

      const statusLabel = selectedPet.is_lost ? 'Perdido' : 'En casa';
      const badgeStyle = selectedPet.is_lost ? styles.badgeDanger : styles.badgeOk;
      const badgeTextStyle = selectedPet.is_lost ? styles.badgeTextDanger : styles.badgeTextOk;

      return (
        <View style={{ gap: 16 }}>
          {/* Botón atrás */}
          <TouchableOpacity style={styles.inlineBackBtn} onPress={() => setScreen('PetList')} activeOpacity={0.7}>
            <Text style={styles.inlineBackArrow}>‹</Text>
            <Text style={styles.inlineBackLabel}>Mis Mascotas</Text>
          </TouchableOpacity>

          {/* Hero */}
          <View style={styles.petHero}>
            <TouchableOpacity
              style={styles.petHeroAvatarWrap}
              onPress={() => pickAndUploadPetPhoto(selectedPet.id)}
              disabled={loading}
              activeOpacity={0.85}
            >
              {petPhotoSignedUrl ? (
                <Image source={{ uri: petPhotoSignedUrl }} style={styles.petHeroAvatar} resizeMode="cover" />
              ) : (
                <View style={[styles.petHeroAvatar, styles.avatarPlaceholder]}>
                  <Text style={[styles.avatarInitials, { fontSize: 36 }]}>{initialsFromName(selectedPet.name)}</Text>
                </View>
              )}
              <View style={styles.petHeroCameraBtn}>
                <Text style={{ fontSize: 14 }}>📷</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.petHeroName}>{selectedPet.name}</Text>
            <Text style={styles.petHeroBreed}>
              {selectedPet.species}{selectedPet.breed ? ` · ${selectedPet.breed}` : ''}
            </Text>
            <View style={[styles.badge, badgeStyle, { alignSelf: 'center', marginTop: 6 }]}>
              <Text style={[styles.badgeText, badgeTextStyle]}>{selectedPet.is_lost ? '🚨 Perdido' : '🏠 En casa'}</Text>
            </View>
          </View>

          {/* Switch perdido — solo dueño */}
          {(!selectedPet.owner_id || !userId || selectedPet.owner_id === userId) && (
          <Card>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>🚨  Activar modo perdido</Text>
              <Switch
                value={selectedPet.is_lost}
                onValueChange={(v) => v ? openLostMap() : updatePetLostStatus(selectedPet.id, false)}
                disabled={loading}
                trackColor={{ false: C.border, true: C.danger }}
                thumbColor={C.white}
              />
            </View>
            {selectedPet.is_lost && (
              <TouchableOpacity onPress={openLostMap} style={{ marginTop: 8 }}>
                <Text style={{ color: C.primary, fontWeight: '700', fontSize: 13 }}>
                  📍 Editar ubicación y radio
                </Text>
              </TouchableOpacity>
            )}
          </Card>
          )}

          {/* Nav grid 2x2 */}
          <View style={styles.navGrid}>
            <TouchableOpacity style={[styles.navGridCard, { borderTopColor: C.primary }]} onPress={() => setScreen('PetVetHistory')} activeOpacity={0.85}>
              <Text style={styles.navGridIcon}>🏥</Text>
              <Text style={styles.navGridTitle}>Historial Vet</Text>
              <Text style={styles.navGridHint}>Visitas y controles</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.navGridCard, { borderTopColor: C.success }]} onPress={() => setScreen('PetVaccines')} activeOpacity={0.85}>
              <Text style={styles.navGridIcon}>💉</Text>
              <Text style={styles.navGridTitle}>Vacunas</Text>
              <Text style={styles.navGridHint}>Cartilla al día</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.navGridCard, { borderTopColor: C.warning }]} onPress={() => { setIsEditingPetDetail(false); setScreen('PetInfo'); }} activeOpacity={0.85}>
              <Text style={styles.navGridIcon}>ℹ️</Text>
              <Text style={styles.navGridTitle}>Información</Text>
              <Text style={styles.navGridHint}>Perfil completo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.navGridCard, { borderTopColor: C.accent }]} onPress={() => { setIsEditingPetDetail(false); setScreen('PetContact'); }} activeOpacity={0.85}>
              <Text style={styles.navGridIcon}>📞</Text>
              <Text style={styles.navGridTitle}>Contacto</Text>
              <Text style={styles.navGridHint}>Dueño y emergencias</Text>
            </TouchableOpacity>
          </View>

          {(!selectedPet?.owner_id || !userId || selectedPet.owner_id === userId) && (
            <TouchableOpacity style={styles.btnPrimary} onPress={() => setScreen('LinkTag')} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>🏷️  Vincular tag NFC / QR</Text>
            </TouchableOpacity>
          )}

          {(!selectedPet?.owner_id || !userId || selectedPet.owner_id === userId) && (
            <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: C.dark }]} onPress={() => setScreen('PetMembers')} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>👥  Co-dueños</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.btnGhost} onPress={() => setScreen('Home')} activeOpacity={0.85}>
            <Text style={styles.btnGhostText}>← Volver a mis mascotas</Text>
          </TouchableOpacity>

          {selectedPet?.owner_id === userId && (
            <TouchableOpacity
              style={{ alignItems: 'center', paddingVertical: 10 }}
              onPress={() => {
                Alert.alert(
                  'Eliminar mascota',
                  `¿Estás seguro que quieres eliminar a ${selectedPet.name}? Esta acción no se puede deshacer.`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Eliminar', style: 'destructive', onPress: async () => {
                      setLoading(true);
                      try {
                        const { error } = await supabase.from('pets').delete().eq('id', selectedPet.id);
                        if (error) { Alert.alert('Error', error.message); return; }
                        setSelectedPet(null);
                        await fetchPets();
                        setScreen('Home');
                      } finally { setLoading(false); }
                    }}
                  ]
                );
              }}
              activeOpacity={0.7}>
              <Text style={{ color: C.danger, fontWeight: '600', fontSize: 14 }}>Eliminar mascota</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (screen === 'PetVetHistory') {

      // ── VISTA FORMULARIO (nuevo / editar) ──
      if (vetView === 'form') {
        return (
          <View style={styles.form}>
            <Card title="🏥  Visita" accent={C.primary}>
              <Text style={styles.fieldLabel}>Fecha *</Text>
              <TextInput style={styles.input} placeholder="dd/mm/aaaa"
                placeholderTextColor={C.textMuted}
                value={vetForm.date}
                onChangeText={(v) => setVetForm((p) => ({ ...p, date: autoFormatDate(v) }))}
                keyboardType="number-pad" maxLength={10} />

              <Text style={styles.fieldLabel}>Motivo de la consulta *</Text>
              <TextInput style={styles.input} placeholder='Ej: "Control general", "Vómitos"'
                placeholderTextColor={C.textMuted}
                value={vetForm.reason}
                onChangeText={(v) => setVetForm((p) => ({ ...p, reason: v }))} />

              <Text style={styles.fieldLabel}>Veterinario</Text>
              <TextInput style={styles.input} placeholder="Dr. Nombre Apellido"
                placeholderTextColor={C.textMuted}
                value={vetForm.doctor}
                onChangeText={(v) => setVetForm((p) => ({ ...p, doctor: v }))} />

              <Text style={styles.fieldLabel}>Clínica</Text>
              <TextInput style={styles.input} placeholder="Nombre de la clínica"
                placeholderTextColor={C.textMuted}
                value={vetForm.clinic}
                onChangeText={(v) => setVetForm((p) => ({ ...p, clinic: v }))} />
            </Card>

            <Card title="🩺  Clínico" accent={C.success}>
              <Text style={styles.fieldLabel}>Síntomas</Text>
              <TextInput style={[styles.input, styles.multiline]} multiline
                placeholder="Ej: Vómitos, letargo, fiebre (separados por coma)"
                placeholderTextColor={C.textMuted}
                value={symptomText}
                onChangeText={setSymptomText} />

              <Text style={styles.fieldLabel}>Diagnóstico</Text>
              <TextInput style={[styles.input, styles.multiline]} multiline
                placeholder='Ej: "Gastroenteritis leve"'
                placeholderTextColor={C.textMuted}
                value={vetForm.diagnosis}
                onChangeText={(v) => setVetForm((p) => ({ ...p, diagnosis: v }))} />

              <Text style={styles.fieldLabel}>Tratamiento indicado</Text>
              <TextInput style={[styles.input, styles.multiline]} multiline
                placeholder="Indicaciones del veterinario"
                placeholderTextColor={C.textMuted}
                value={vetForm.treatment}
                onChangeText={(v) => setVetForm((p) => ({ ...p, treatment: v }))} />

              <Text style={styles.fieldLabel}>Resumen / notas adicionales</Text>
              <TextInput style={[styles.input, styles.multiline]} multiline
                placeholder="Cualquier detalle importante de la visita"
                placeholderTextColor={C.textMuted}
                value={vetForm.description}
                onChangeText={(v) => setVetForm((p) => ({ ...p, description: v }))} />
            </Card>

            <Card title="📎  Adjuntos" accent={C.accent}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[styles.btnPrimary, { flex: 1, paddingVertical: 10 }]} onPress={addPhotoAttachmentToForm} activeOpacity={0.85}>
                  <Text style={styles.btnPrimaryText}>📷  Foto</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnPrimary, { flex: 1, paddingVertical: 10, backgroundColor: C.dark }]} onPress={addPdfAttachmentToForm} activeOpacity={0.85}>
                  <Text style={styles.btnPrimaryText}>📄  PDF</Text>
                </TouchableOpacity>
              </View>
              {vetForm.attachments.length > 0 && (
                <View style={{ gap: 8, marginTop: 4 }}>{vetForm.attachments.map(renderEditableAttachmentChip)}</View>
              )}
            </Card>

            <TouchableOpacity style={styles.btnPrimary} onPress={saveVetRecord} disabled={loading} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>{loading ? 'Guardando...' : (editingVetRecordId ? 'Guardar cambios' : 'Guardar registro')}</Text>
            </TouchableOpacity>

            {editingVetRecordId ? (
              <TouchableOpacity
                style={{ backgroundColor: C.dangerLight, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
                onPress={deleteVetRecord} disabled={loading} activeOpacity={0.85}>
                <Text style={{ color: C.danger, fontWeight: '700', fontSize: 15 }}>Eliminar registro</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        );
      }

      // ── VISTA DETALLE ──
      if (vetView === 'detail' && selectedVetRecord) {
        const rec = selectedVetRecord;
        return (
          <View style={styles.form}>
            <Card title="🏥  Visita" accent={C.primary}>
              <InfoRow label="Fecha" value={rec.date} />
              <InfoRow label="Motivo" value={rec.reason} />
              <InfoRow label="Veterinario" value={rec.doctor} />
              <InfoRow label="Clínica" value={rec.clinic} />
            </Card>

            <Card title="🩺  Clínico" accent={C.success}>
              <InfoRow label="Síntomas" value={rec.symptoms.length ? rec.symptoms.join(', ') : null} />
              <InfoRow label="Diagnóstico" value={rec.diagnosis} />
              <InfoRow label="Tratamiento" value={rec.treatment} />
              {rec.description ? (
                <>
                  <Text style={[styles.rowLabel, { marginTop: 4 }]}>Resumen</Text>
                  <Text style={{ color: C.text, lineHeight: 20 }}>{rec.description}</Text>
                </>
              ) : null}
            </Card>

            <Card title="📎  Adjuntos" accent={C.accent}>
              {rec.attachments.length ? (
                <View style={{ gap: 8 }}>{rec.attachments.map(renderAttachmentChip)}</View>
              ) : (
                <Text style={{ color: C.textMuted }}>Sin adjuntos</Text>
              )}
            </Card>
          </View>
        );
      }

      // ── VISTA LISTA ──
      return (
        <View style={styles.form}>
          <TouchableOpacity style={styles.addPetCta} onPress={() => { resetVetForm(); setVetView('form'); }} activeOpacity={0.85}>
            <Text style={styles.addPetCtaText}>+  Nuevo registro</Text>
          </TouchableOpacity>

          {vetHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>🩺</Text>
              <Text style={styles.emptyStateTitle}>Sin registros todavía</Text>
              <Text style={styles.emptyStateHint}>Cada visita al veterinario quedará guardada aquí.</Text>
            </View>
          ) : (
            vetHistory.map((record) => (
              <TouchableOpacity key={record.id} style={styles.vetHistoryCard}
                onPress={() => { setSelectedVetRecord(record); setVetView('detail'); }}
                activeOpacity={0.85}>
                <View style={styles.vetHistoryDateBadge}>
                  <Text style={styles.vetHistoryDateText}>{record.date}</Text>
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.vetHistoryReason}>{record.reason}</Text>
                  {(record.doctor || record.clinic) ? (
                    <Text style={styles.vetHistoryMeta}>
                      {[record.doctor, record.clinic].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                  {record.symptoms.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {record.symptoms.slice(0, 3).map(s => (
                        <View key={s} style={{ backgroundColor: C.successLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 11, color: C.success, fontWeight: '600' }}>{s}</Text>
                        </View>
                      ))}
                      {record.symptoms.length > 3 && (
                        <View style={{ backgroundColor: C.surface, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 11, color: C.textMuted, fontWeight: '600' }}>+{record.symptoms.length - 3}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
                <Text style={styles.petCardArrow}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      );
    }

    if (screen === 'PetVaccines') {

      // ── FORMULARIO (nueva / editar) ──
      if (showVaccineForm) {
        return (
          <View style={styles.form}>
            <Card title="💉  Vacuna" accent={C.primary}>
              <Text style={styles.fieldLabel}>Nombre de la vacuna *</Text>
              <TextInput style={styles.input} placeholder='Ej: "Antirrábica", "Polivalente"'
                placeholderTextColor={C.textMuted}
                value={vaccineForm.vaccine_name}
                onChangeText={(v) => setVaccineForm((p) => ({ ...p, vaccine_name: v }))} />

              <Text style={styles.fieldLabel}>Fecha de aplicación *</Text>
              <TextInput style={styles.input} placeholder="dd/mm/aaaa"
                placeholderTextColor={C.textMuted}
                value={vaccineForm.applied_date}
                onChangeText={(v) => setVaccineForm((p) => ({ ...p, applied_date: autoFormatDate(v) }))}
                keyboardType="number-pad" maxLength={10} />
            </Card>

            <Card title="📅  Fechas de control" accent={C.success}>
              <Text style={styles.fieldLabel}>Fecha de vencimiento</Text>
              <TextInput style={styles.input} placeholder="dd/mm/aaaa"
                placeholderTextColor={C.textMuted}
                value={vaccineForm.expiry_date}
                onChangeText={(v) => setVaccineForm((p) => ({ ...p, expiry_date: autoFormatDate(v) }))}
                keyboardType="number-pad" maxLength={10} />

              <Text style={styles.fieldLabel}>Próxima dosis</Text>
              <TextInput style={styles.input} placeholder="dd/mm/aaaa"
                placeholderTextColor={C.textMuted}
                value={vaccineForm.next_dose_date}
                onChangeText={(v) => setVaccineForm((p) => ({ ...p, next_dose_date: autoFormatDate(v) }))}
                keyboardType="number-pad" maxLength={10} />
            </Card>

            <Card title="🏥  Clínica" accent={C.accent}>
              <Text style={styles.fieldLabel}>Veterinario</Text>
              <TextInput style={styles.input} placeholder="Dr. Nombre Apellido"
                placeholderTextColor={C.textMuted}
                value={vaccineForm.veterinarian}
                onChangeText={(v) => setVaccineForm((p) => ({ ...p, veterinarian: v }))} />

              <Text style={styles.fieldLabel}>Clínica</Text>
              <TextInput style={styles.input} placeholder="Nombre de la clínica"
                placeholderTextColor={C.textMuted}
                value={vaccineForm.clinic}
                onChangeText={(v) => setVaccineForm((p) => ({ ...p, clinic: v }))} />

              <Text style={styles.fieldLabel}>N° de lote</Text>
              <TextInput style={styles.input} placeholder="Ej: AB1234"
                placeholderTextColor={C.textMuted}
                value={vaccineForm.batch_number}
                onChangeText={(v) => setVaccineForm((p) => ({ ...p, batch_number: v }))} />
            </Card>

            <Card title="📝  Notas" accent={C.warning}>
              <TextInput style={[styles.input, styles.multiline]} multiline
                placeholder="Observaciones adicionales"
                placeholderTextColor={C.textMuted}
                value={vaccineForm.notes}
                onChangeText={(v) => setVaccineForm((p) => ({ ...p, notes: v }))} />
            </Card>

            <TouchableOpacity style={styles.btnPrimary} onPress={saveVaccine} disabled={loading} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>{loading ? 'Guardando...' : (editingVaccineId ? 'Guardar cambios' : 'Registrar vacuna')}</Text>
            </TouchableOpacity>

            {editingVaccineId ? (
              <TouchableOpacity
                style={{ backgroundColor: C.dangerLight, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
                onPress={() => deleteVaccine(editingVaccineId)} disabled={loading} activeOpacity={0.85}>
                <Text style={{ color: C.danger, fontWeight: '700', fontSize: 15 }}>Eliminar vacuna</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        );
      }

      // ── LISTA ──
      return (
        <View style={styles.form}>
          <TouchableOpacity style={styles.addPetCta}
            onPress={() => { resetVaccineForm(); setShowVaccineForm(true); setEditingVaccineId(null); }}
            activeOpacity={0.85}>
            <Text style={styles.addPetCtaText}>+  Registrar vacuna</Text>
          </TouchableOpacity>

          {vaccines.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>💉</Text>
              <Text style={styles.emptyStateTitle}>Sin vacunas registradas</Text>
              <Text style={styles.emptyStateHint}>Registra las vacunas de {selectedPet?.name ?? 'tu mascota'} para mantenerlas al día.</Text>
            </View>
          ) : (
            vaccines.map((v) => {
              const status = vaccineStatus(v);
              return (
                <TouchableOpacity key={v.id} style={styles.vaccineCard}
                  onPress={() => startEditVaccine(v)} activeOpacity={0.85}>
                  {/* Barra de color estado */}
                  <View style={[styles.vaccineStatusBar, { backgroundColor: status.color }]} />
                  <View style={{ flex: 1, gap: 5 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={styles.vaccineCardName}>{v.vaccine_name}</Text>
                      <View style={[styles.vaccineBadge, { backgroundColor: status.color + '22' }]}>
                        <Text style={[styles.vaccineBadgeText, { color: status.color }]}>{status.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.vaccineCardDate}>Aplicada: {v.applied_date}</Text>
                    {v.expiry_date ? <Text style={styles.vaccineCardDate}>Vence: {v.expiry_date}</Text> : null}
                    {v.next_dose_date ? <Text style={styles.vaccineCardDate}>Próxima dosis: {v.next_dose_date}</Text> : null}
                    {(v.veterinarian || v.clinic) ? (
                      <Text style={styles.vaccineCardMeta}>{[v.veterinarian, v.clinic].filter(Boolean).join(' · ')}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.petCardArrow}>›</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      );
    }

    if (screen === 'PetInfo') {
      if (!selectedPet) return null;
      const SEX_PET_INFO = ['Macho', 'Hembra'];
      const BLOOD_TYPES = ['DEA 1.1+', 'DEA 1.1-', 'DEA 1.2+', 'DEA 1.2-', 'No sé'];

      if (!isEditingPetDetail) {
        // ── Vista de solo lectura ──
        return (
          <View style={styles.form}>
            <Card title="📋  Identidad" accent={C.primary}>
              <InfoRow label="Sexo" value={petDraft.sex} />
              <InfoRow label="Fecha de nacimiento" value={petDraft.birth_date_text} />
              <InfoRow label="Peso" value={petDraft.weight_kg ? `${petDraft.weight_kg} kg` : null} />
              <InfoRow label="Esterilizado/a" value={petDraft.sterilized ? 'Sí' : 'No'} />
              <InfoRow label="N° de chip / microchip" value={petDraft.chip_number} />
            </Card>

            <Card title="🐾  Descripción física" accent={C.accent}>
              <Text style={{ color: petDraft.description ? C.text : C.textMuted, lineHeight: 20 }}>
                {petDraft.description || '—'}
              </Text>
            </Card>

            <Card title="🩺  Salud" accent={C.success}>
              <InfoRow label="Alergias" value={petDraft.allergies} />
              <InfoRow label="Medicamentos" value={petDraft.medications} />
              <InfoRow label="Condiciones" value={petDraft.conditions} />
              <InfoRow label="Grupo sanguíneo" value={petDraft.blood_type} />
            </Card>

            <Card title="🛡️  Seguro veterinario" accent={C.warning}>
              <InfoRow label="Seguro" value={petDraft.insurance_name} />
              <InfoRow label="N° de póliza" value={petDraft.insurance_policy} />
            </Card>
          </View>
        );
      }

      // ── Vista de edición ──
      return (
        <View style={styles.form}>

          {/* ── Identidad ── */}
          <Card title="📋  Identidad" accent={C.primary}>
            <Text style={styles.fieldLabel}>Sexo</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {SEX_PET_INFO.map(opt => (
                <TouchableOpacity key={opt}
                  style={[styles.filterChip, { flex: 1, alignItems: 'center' }, petDraft.sex === opt && styles.filterChipActive]}
                  onPress={() => setPetDraft(p => ({ ...p, sex: opt }))}>
                  <Text style={[styles.filterChipText, petDraft.sex === opt && styles.filterChipTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Fecha de nacimiento</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="dd/mm/aaaa"
                placeholderTextColor={C.textMuted}
                value={petDraft.birth_date_text}
                keyboardType="number-pad"
                maxLength={10}
                onChangeText={(v) => {
                  let clean = v.replace(/[^\d]/g, '');
                  if (clean.length > 2) clean = clean.slice(0, 2) + '/' + clean.slice(2);
                  if (clean.length > 5) clean = clean.slice(0, 5) + '/' + clean.slice(5);
                  if (clean.length > 10) clean = clean.slice(0, 10);
                  setPetDraft(p => ({ ...p, birth_date_text: clean }));
                }}
              />
              <TouchableOpacity style={[styles.input, { paddingHorizontal: 14 }]} onPress={() => setShowProfileBirthCalendar(v => !v)}>
                <Text style={{ fontSize: 20 }}>{showProfileBirthCalendar ? '▲' : '📅'}</Text>
              </TouchableOpacity>
            </View>
            {showProfileBirthCalendar && (
              <View style={styles.calendarCard}>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity style={styles.calendarArrowBtn} onPress={() => setProfileBirthCalendarMonth(p => new Date(p.getFullYear(), p.getMonth() - 1, 1))}>
                    <Text style={styles.calendarArrowText}>‹</Text>
                  </TouchableOpacity>
                  <Text style={styles.calendarMonthTitle}>{profileBirthCalendarMonth.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</Text>
                  <TouchableOpacity style={styles.calendarArrowBtn} onPress={() => setProfileBirthCalendarMonth(p => new Date(p.getFullYear(), p.getMonth() + 1, 1))}>
                    <Text style={styles.calendarArrowText}>›</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.calendarWeekRow}>
                  {['L','M','X','J','V','S','D'].map(d => <Text key={d} style={styles.calendarWeekDay}>{d}</Text>)}
                </View>
                <View style={styles.calendarGrid}>
                  {buildCalendarDays(profileBirthCalendarMonth).map((day, idx) => {
                    const selectedDate = parseBirthDateText(petDraft.birth_date_text);
                    const isSelected = selectedDate != null && selectedDate.getFullYear() === profileBirthCalendarMonth.getFullYear() && selectedDate.getMonth() === profileBirthCalendarMonth.getMonth() && selectedDate.getDate() === day;
                    return (
                      <TouchableOpacity key={`pd-${idx}`} disabled={!day}
                        style={[styles.calendarDayBtn, !day && styles.calendarDayBtnDisabled, isSelected && styles.calendarDayBtnSelected]}
                        onPress={() => { if (!day) return; const d = new Date(profileBirthCalendarMonth.getFullYear(), profileBirthCalendarMonth.getMonth(), day); setPetDraft(p => ({ ...p, birth_date_text: formatBirthDateShort(d) })); setShowProfileBirthCalendar(false); }}>
                        <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected]}>{day ?? ''}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <Text style={styles.fieldLabel}>Peso (kg)</Text>
            <TextInput style={styles.input} placeholder="Ej: 8.5" placeholderTextColor={C.textMuted}
              value={petDraft.weight_kg} onChangeText={(v) => setPetDraft(p => ({ ...p, weight_kg: v }))}
              keyboardType="decimal-pad" />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>✂️  Esterilizado/a</Text>
              <Switch value={petDraft.sterilized} onValueChange={(v) => setPetDraft(p => ({ ...p, sterilized: v }))}
                trackColor={{ false: C.border, true: C.primary }} thumbColor={C.white} />
            </View>

            <Text style={styles.fieldLabel}>Número de chip / microchip</Text>
            <TextInput style={styles.input} placeholder="Ej: 985112345678901" placeholderTextColor={C.textMuted}
              value={petDraft.chip_number} onChangeText={(v) => setPetDraft(p => ({ ...p, chip_number: v }))}
              keyboardType="number-pad" />
          </Card>

          {/* ── Descripción física ── */}
          <Card title="🐾  Descripción física" accent={C.accent}>
            <TextInput style={[styles.input, styles.multiline]} multiline
              placeholder='Ej: "Blanco con manchas café en el lomo, orejas negras"'
              placeholderTextColor={C.textMuted}
              value={petDraft.description}
              onChangeText={(v) => setPetDraft(p => ({ ...p, description: v }))} />
          </Card>

          {/* ── Salud ── */}
          <Card title="🩺  Salud" accent={C.success}>
            <Text style={styles.fieldLabel}>Alergias</Text>
            <TextInput style={[styles.input, styles.multiline]} multiline
              placeholder="Ej: Polen, ciertos antibióticos"
              placeholderTextColor={C.textMuted}
              value={petDraft.allergies}
              onChangeText={(v) => setPetDraft(p => ({ ...p, allergies: v }))} />

            <Text style={styles.fieldLabel}>Medicamentos actuales</Text>
            <TextInput style={[styles.input, styles.multiline]} multiline
              placeholder="Ej: Frontline mensual, Nexgard"
              placeholderTextColor={C.textMuted}
              value={petDraft.medications}
              onChangeText={(v) => setPetDraft(p => ({ ...p, medications: v }))} />

            <Text style={styles.fieldLabel}>Condiciones / enfermedades</Text>
            <TextInput style={[styles.input, styles.multiline]} multiline
              placeholder="Ej: Displasia de cadera leve"
              placeholderTextColor={C.textMuted}
              value={petDraft.conditions}
              onChangeText={(v) => setPetDraft(p => ({ ...p, conditions: v }))} />

            <Text style={styles.fieldLabel}>Grupo sanguíneo</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {BLOOD_TYPES.map(bt => (
                <TouchableOpacity key={bt}
                  style={[styles.filterChip, petDraft.blood_type === bt && styles.filterChipActive]}
                  onPress={() => setPetDraft(p => ({ ...p, blood_type: bt }))}>
                  <Text style={[styles.filterChipText, petDraft.blood_type === bt && styles.filterChipTextActive]}>{bt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* ── Seguro veterinario ── */}
          <Card title="🛡️  Seguro veterinario" accent={C.warning}>
            <Text style={styles.fieldLabel}>Nombre del seguro</Text>
            <TextInput style={styles.input} placeholder="Ej: Mapfre Mascotas, BCI Seguros"
              placeholderTextColor={C.textMuted}
              value={petDraft.insurance_name}
              onChangeText={(v) => setPetDraft(p => ({ ...p, insurance_name: v }))} />

            <Text style={styles.fieldLabel}>Número de póliza</Text>
            <TextInput style={styles.input} placeholder="Ej: 1234567-8"
              placeholderTextColor={C.textMuted}
              value={petDraft.insurance_policy}
              onChangeText={(v) => setPetDraft(p => ({ ...p, insurance_policy: v }))} />
          </Card>

          <TouchableOpacity style={styles.btnPrimary} onPress={savePetProfile} disabled={loading} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>{loading ? 'Guardando...' : 'Guardar información'}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (screen === 'PetContact') {
      // Aviso público (siempre visible)
      const publicBanner = (
        <View style={{ backgroundColor: C.warningLight, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 4 }}>
          <Text style={{ fontSize: 20 }}>👁</Text>
          <Text style={{ flex: 1, color: C.warning, fontWeight: '600', fontSize: 13, lineHeight: 19 }}>
            Esta información es pública: aparece cuando alguien escanea el tag de {selectedPet?.name ?? 'tu mascota'}.
          </Text>
        </View>
      );

      if (!isEditingPetDetail) {
        // ── Vista de solo lectura ──
        return (
          <View style={styles.form}>
            {publicBanner}
            <Card title="📞  Contacto principal" accent={C.primary}>
              <InfoRow label="Nombre" value={petDraft.contact_primary_name} />
              <InfoRow label="Teléfono" value={petDraft.owner_phone} />
            </Card>

            <Card title="👤  Contacto secundario" accent={C.accent}>
              <InfoRow label="Nombre" value={petDraft.contact_secondary_name} />
              <InfoRow label="Teléfono" value={petDraft.contact_secondary_phone} />
            </Card>

            <Card title="🩺  Veterinario de cabecera" accent={C.success}>
              <InfoRow label="Nombre / clínica" value={petDraft.vet_name} />
              <InfoRow label="Teléfono" value={petDraft.vet_phone} />
            </Card>

            <Card title="💬  Mensaje al que escanea" accent={C.primaryLight}>
              <Text style={{ color: petDraft.public_notes ? C.text : C.textMuted, lineHeight: 20 }}>
                {petDraft.public_notes || '—'}
              </Text>
            </Card>
          </View>
        );
      }

      // ── Vista de edición ──
      return (
        <View style={styles.form}>
          {publicBanner}

          {/* ── Contacto principal ── */}
          <Card title="📞  Contacto principal" accent={C.primary}>
            <Text style={styles.fieldLabel}>Nombre</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Nombre Apellido"
              placeholderTextColor={C.textMuted}
              value={petDraft.contact_primary_name}
              onChangeText={(v) => setPetDraft((p) => ({ ...p, contact_primary_name: v }))}
            />
            <Text style={styles.fieldLabel}>Teléfono</Text>
            <TextInput
              style={styles.input}
              placeholder="+56912345678"
              placeholderTextColor={C.textMuted}
              value={petDraft.owner_phone}
              onChangeText={(v) => setPetDraft((p) => ({ ...p, owner_phone: v }))}
              keyboardType="phone-pad"
            />
          </Card>

          {/* ── Contacto secundario ── */}
          <Card title="👤  Contacto secundario" accent={C.accent}>
            <Text style={styles.fieldLabel}>Nombre</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: María González"
              placeholderTextColor={C.textMuted}
              value={petDraft.contact_secondary_name}
              onChangeText={(v) => setPetDraft((p) => ({ ...p, contact_secondary_name: v }))}
            />
            <Text style={styles.fieldLabel}>Teléfono</Text>
            <TextInput
              style={styles.input}
              placeholder="+56912345678"
              placeholderTextColor={C.textMuted}
              value={petDraft.contact_secondary_phone}
              onChangeText={(v) => setPetDraft((p) => ({ ...p, contact_secondary_phone: v }))}
              keyboardType="phone-pad"
            />
          </Card>

          {/* ── Veterinario ── */}
          <Card title="🩺  Veterinario de cabecera" accent={C.success}>
            <Text style={styles.fieldLabel}>Nombre del veterinario / clínica</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Dr. Martínez — ClínicaVet Las Condes"
              placeholderTextColor={C.textMuted}
              value={petDraft.vet_name}
              onChangeText={(v) => setPetDraft((p) => ({ ...p, vet_name: v }))}
            />
            <Text style={styles.fieldLabel}>Teléfono</Text>
            <TextInput
              style={styles.input}
              placeholder="+56912345678"
              placeholderTextColor={C.textMuted}
              value={petDraft.vet_phone}
              onChangeText={(v) => setPetDraft((p) => ({ ...p, vet_phone: v }))}
              keyboardType="phone-pad"
            />
          </Card>

          {/* ── Mensaje al que escanea ── */}
          <Card title="💬  Mensaje al que escanea" accent={C.primaryLight}>
            <Text style={[styles.fieldLabel, { marginBottom: 4 }]}>
              Notas visibles al escanear el tag (indicaciones, carácter de la mascota, etc.)
            </Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              multiline
              placeholder='Ej: "Es asustadizo, no lo persigan. Llamen al dueño."'
              placeholderTextColor={C.textMuted}
              value={petDraft.public_notes}
              onChangeText={(v) => setPetDraft((p) => ({ ...p, public_notes: v }))}
            />
          </Card>

          <TouchableOpacity style={styles.btnPrimary} onPress={savePetProfile} disabled={loading} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>{loading ? 'Guardando...' : 'Guardar contacto'}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (screen === 'LostPetMap') {
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

    if (screen === 'NearbyMap') {
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

    if (screen === 'LostPetList') {
      const communes = ['Todas', ...Array.from(new Set(allLostPets.map(p => p.lost_commune).filter(Boolean) as string[])).sort()];
      const speciesOptions: Array<'Todos' | 'Perro' | 'Gato'> = ['Todos', 'Perro', 'Gato'];

      const filtered = allLostPets.filter(p => {
        if (lostListSpecies !== 'Todos' && p.species !== lostListSpecies) return false;
        if (lostListCommune !== 'Todas' && p.lost_commune !== lostListCommune) return false;
        return true;
      });

      return (
        <View style={styles.form}>
          {/* Filtro especie */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {speciesOptions.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.filterChip, lostListSpecies === s && styles.filterChipActive]}
                onPress={() => setLostListSpecies(s)}
                activeOpacity={0.85}
              >
                <Text style={[styles.filterChipText, lostListSpecies === s && styles.filterChipTextActive]}>
                  {s === 'Todos' ? '🐾 Todos' : s === 'Perro' ? '🐶 Perros' : '🐱 Gatos'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Filtro comuna */}
          {communes.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, paddingHorizontal: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingRight: 8 }}>
                {communes.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.filterChip, lostListCommune === c && styles.filterChipActive]}
                    onPress={() => setLostListCommune(c)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.filterChipText, lostListCommune === c && styles.filterChipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          <Text style={{ color: C.textLight, fontSize: 13, fontWeight: '600' }}>
            {filtered.length} mascota{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
          </Text>

          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>🎉</Text>
              <Text style={styles.emptyStateTitle}>Sin resultados</Text>
              <Text style={styles.emptyStateHint}>Prueba cambiando los filtros.</Text>
            </View>
          ) : (
            filtered.map(pet => (
              <TouchableOpacity
                key={pet.id}
                style={styles.petCard}
                activeOpacity={0.85}
                onPress={() => { setSelectedLostPet(pet); setScreen('LostPetDetail'); }}
              >
                <View style={styles.petCardPhotoWrap}>
                  {lostPetSignedUrls[pet.id] ? (
                    <Image source={{ uri: lostPetSignedUrls[pet.id]! }} style={styles.petCardPhoto} resizeMode="cover" />
                  ) : (
                    <View style={[styles.petCardPhoto, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarInitials}>{initialsFromName(pet.name)}</Text>
                    </View>
                  )}
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.petCardName}>{pet.name}</Text>
                  <Text style={styles.petCardBreed}>{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</Text>
                  {pet.lost_commune && <Text style={{ fontSize: 12, color: C.textLight, fontWeight: '600' }}>📍 {pet.lost_commune}</Text>}
                </View>
                <Text style={styles.petCardArrow}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      );
    }

    if (screen === 'LostPetDetail' && selectedLostPet) {
      const pet = selectedLostPet;
      return (
        <View style={styles.form}>
          {/* Hero */}
          <View style={styles.petHero}>
            {lostPetPhotoUrl ? (
              <Image source={{ uri: lostPetPhotoUrl }} style={styles.petHeroAvatar} resizeMode="cover" />
            ) : (
              <View style={[styles.petHeroAvatar, styles.avatarPlaceholder]}>
                <Text style={[styles.avatarInitials, { fontSize: 32 }]}>{initialsFromName(pet.name)}</Text>
              </View>
            )}
            <Text style={styles.petHeroName}>{pet.name}</Text>
            <Text style={styles.petHeroBreed}>{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</Text>
            <View style={[styles.badge, styles.badgeDanger, { marginTop: 4 }]}>
              <Text style={[styles.badgeText, styles.badgeTextDanger]}>🚨 Perdido</Text>
            </View>
          </View>

          <Card>
            {pet.color      && <InfoRow label="Color"   value={pet.color} />}
            {pet.lost_commune && <InfoRow label="Comuna" value={pet.lost_commune} />}
            {pet.contact_primary_name && <InfoRow label="Dueño" value={pet.contact_primary_name} />}
          </Card>

          {pet.public_notes && (
            <Card title="Indicaciones" accent={C.warning}>
              <Text style={{ color: C.text, lineHeight: 20 }}>{pet.public_notes}</Text>
            </Card>
          )}

          {pet.owner_phone && (
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => Linking.openURL(`tel:${pet.owner_phone}`)}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>📞  Llamar al dueño</Text>
            </TouchableOpacity>
          )}


          <TouchableOpacity style={styles.btnGhost} onPress={() => setScreen('LostPetList')} activeOpacity={0.85}>
            <Text style={styles.btnGhostText}>Volver a la lista</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnGhost, { marginTop: 4 }]} onPress={() => setScreen('NearbyMap')} activeOpacity={0.85}>
            <Text style={styles.btnGhostText}>Volver al mapa</Text>
          </TouchableOpacity>
        </View>
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
      if (!cameraPermission?.granted) {
        return (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32, backgroundColor: C.dark }}>
            <Text style={{ fontSize: 48 }}>📷</Text>
            <Text style={{ color: C.white, fontSize: 17, fontWeight: '700', textAlign: 'center' }}>ChipDog necesita acceso a la cámara</Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center' }}>Para escanear el QR del tag de la mascota.</Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={requestCameraPermission} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>Permitir acceso</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setScreen('FoundTag')} activeOpacity={0.7}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        );
      }
      return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={qrScanned ? undefined : ({ data }) => {
              setQrScanned(true);
              const code = extractCodeFromUrl(data);
              setFoundCode(code);
              lookupTagCode(code);
            }}
          />
          {/* Marco guía */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
            <View style={{ width: 240, height: 240, borderRadius: 20, borderWidth: 3, borderColor: C.primary, backgroundColor: 'transparent' }} />
            <Text style={{ color: C.white, marginTop: 20, fontSize: 15, fontWeight: '600', textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }}>
              Apunta al QR del tag
            </Text>
          </View>
          {/* Botón cancelar */}
          <TouchableOpacity
            style={{ position: 'absolute', top: 20, left: 20, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            onPress={() => { setQrScanned(false); setScreen('FoundTag'); }} activeOpacity={0.85}>
            <Text style={{ color: C.white, fontSize: 20, lineHeight: 24 }}>‹</Text>
            <Text style={{ color: C.white, fontWeight: '700', fontSize: 14 }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  const isFullScreenMap = screen === 'NearbyMap' || screen === 'ScanTag';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 6 : 0}
      >
        {canGoBack && !isFullScreenMap ? (
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

        {isFullScreenMap ? (
          <View style={{ flex: 1 }}>
            {renderScreen()}
            {/* Botón atrás flotante sobre el mapa */}
            <TouchableOpacity
              style={{ position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 4 }}
              onPress={handleBack} activeOpacity={0.85}>
              <Text style={{ fontSize: 22, color: C.primary, lineHeight: 26, marginTop: -2 }}>‹</Text>
              <Text style={{ fontSize: 14, color: C.primary, fontWeight: '700', marginLeft: 4 }}>Inicio</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {renderScreen()}
          </ScrollView>
        )}

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
  );
}

