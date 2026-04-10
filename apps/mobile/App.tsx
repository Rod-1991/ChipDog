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
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Switch,
  Linking
} from 'react-native';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';
import { addPetSchema, linkTagSchema, loginSchema } from '@chipdog/shared';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Buffer } from 'buffer';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import MapView, { Circle, Marker } from 'react-native-maps';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';

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

type Screen =
  | 'Login'
  | 'Register'
  | 'Home'
  | 'PetList'
  | 'NearbyMap'
  | 'LostPetList'
  | 'LostPetDetail'
  | 'AddPet'
  | 'PetDetail'
  | 'PetInfo'
  | 'PetContact'
  | 'PetVetHistory'
  | 'PetVaccines'
  | 'LinkTag'
  | 'FoundTag'
  | 'FoundResult'
  | 'LostPetMap'
  | 'ScanTag'
  | 'Profile';

type UserProfile = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  rut: string;
  sex: string;
  birth_year: number;
  commune: string;
};

type Pet = {
  id: number;
  name: string;
  species: string;
  breed: string | null;
  is_lost: boolean;
  photo_url?: string | null;

  color?: string | null;
  birth_year?: number | null;
  birth_date_text?: string | null;
  sex?: string | null;
  weight_kg?: number | null;

  contact_primary_name?: string | null;
  owner_phone?: string | null;
  contact_secondary_name?: string | null;
  contact_secondary_phone?: string | null;
  owner_whatsapp?: string | null;
  public_notes?: string | null;

  allergies?: string | null;
  medications?: string | null;
  conditions?: string | null;

  vet_name?: string | null;
  vet_phone?: string | null;

  description?: string | null;
  sterilized?: boolean | null;
  chip_number?: string | null;
  blood_type?: string | null;
  insurance_name?: string | null;
  insurance_policy?: string | null;

  lost_lat?: number | null;
  lost_lng?: number | null;
  lost_radius_meters?: number | null;
};

type VetAttachment = {
  id: string;
  kind: 'photo' | 'pdf';
  name: string;
  path: string;
  uri?: string;
  mimeType?: string | null;
};

type FoundPet = {
  public_name: string;
  species: string;
  breed: string | null;
  color: string | null;
  public_notes: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  photo_url: string | null;
  is_lost: boolean;
  owner_name: string | null;
};

type Vaccine = {
  id: number;
  pet_id: number;
  vaccine_name: string;
  applied_date: string;
  expiry_date: string | null;
  next_dose_date: string | null;
  veterinarian: string | null;
  clinic: string | null;
  batch_number: string | null;
  notes: string | null;
  created_at: string;
};

type LostPetPin = {
  id: number;
  name: string;
  species: string;
  breed: string | null;
  color: string | null;
  photo_url: string | null;
  lost_lat: number;
  lost_lng: number;
  lost_radius_meters: number | null;
  lost_commune: string | null;
  public_notes: string | null;
  contact_primary_name: string | null;
  owner_phone: string | null;
  owner_whatsapp: string | null;
};

type NearbyLostPet = LostPetPin & { distance_m: number };

type VetRecord = {
  id: string;
  date: string;
  doctor: string;
  clinic: string;
  reason: string;
  symptoms: string[];
  diagnosis: string;
  treatment: string;
  description: string;
  attachments: VetAttachment[];
  referencePhotos: string[];
};

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY en app.config.ts');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const vetAttachmentsBucket = 'pet-vet-attachments';

// ─── Design System ────────────────────────────────────────────────────────────
const C = {
  primary:       '#6C47FF',
  primaryLight:  '#EDE9FE',
  primaryDark:   '#4C1D95',
  accent:        '#FF6B6B',
  accentLight:   '#FFF1F2',
  success:       '#059669',
  successLight:  '#ECFDF5',
  warning:       '#F59E0B',
  warningLight:  '#FFFBEB',
  danger:        '#EF4444',
  dangerLight:   '#FEF2F2',
  dark:          '#1E1B4B',
  text:          '#374151',
  textLight:     '#6B7280',
  textMuted:     '#9CA3AF',
  border:        '#E5E7EB',
  surface:       '#F9FAFB',
  bg:            '#F5F3FF',
  white:         '#FFFFFF',
};
// ─────────────────────────────────────────────────────────────────────────────

const autoFormatDate = (v: string): string => {
  let clean = v.replace(/[^\d]/g, '');
  if (clean.length > 2) clean = clean.slice(0, 2) + '/' + clean.slice(2);
  if (clean.length > 5) clean = clean.slice(0, 5) + '/' + clean.slice(5);
  if (clean.length > 10) clean = clean.slice(0, 10);
  return clean;
};

const normalizeStringOrNull = (v: string) => {
  const t = (v ?? '').trim();
  return t.length ? t : null;
};

const sanitizeFilename = (name: string) =>
  name
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();

const initialsFromName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  return (first + second).toUpperCase() || '?';
};

// ✅ FUERA de App() para evitar re-mounts al tipear (teclado no se cierra)
type InfoRowProps = { label: string; value?: string | null };
const InfoRow = ({ label, value }: InfoRowProps) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value?.trim?.() ? value : '—'}</Text>
  </View>
);

type CardProps = { title?: string; accent?: string; children: any };
const Card = ({ title, accent, children }: CardProps) => (
  <View style={styles.card}>
    {title ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {accent ? <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: accent }} /> : null}
        <Text style={styles.cardHeader}>{title}</Text>
      </View>
    ) : null}
    <View style={{ gap: 10 }}>{children}</View>
  </View>
);

const SPECIES_OPTIONS = ['Perro', 'Gato'] as const;

const DOG_BREEDS = [
  'Mestizo',
  'Affenpinscher','Akita','Alaskan Malamute','American Bully','American Pit Bull Terrier',
  'American Staffordshire Terrier','Basenji','Basset Hound','Beagle','Bedlington Terrier',
  'Bichón Frisé','Bloodhound','Border Collie','Border Terrier','Bóxer',
  'Boyero de Berna','Boyero de Flandes','Braco Alemán','Braco Húngaro','Bull Terrier',
  'Bulldog Americano','Bulldog Francés','Bulldog Inglés','Bullmastiff',
  'Cairn Terrier','Cane Corso','Cavalier King Charles Spaniel','Chihuahua',
  'Chow Chow','Clumber Spaniel','Cocker Spaniel Americano','Cocker Spaniel Inglés',
  'Collie','Corgi Galés','Dachshund','Dálmata','Dobermann','Dogo Argentino',
  'Dogo de Burdeos','English Springer Spaniel','Esquimal Americano',
  'Fila Brasileño','Fox Terrier','Galgo','Golden Retriever','Gran Danés',
  'Greyhound','Griffón de Bruselas','Husky Siberiano','Irish Setter',
  'Jack Russell Terrier','Labrador Retriever','Lagotto Romagnolo',
  'Leonberger','Lhasa Apso','Lobero Irlandés','Mallorquín','Maltés',
  'Maremano','Mastín Español','Mastín Napolitano','Mastín Tibetano',
  'Miniature Pinscher','Mudi','Pastor Alemán','Pastor Australiano',
  'Pastor Belga Malinois','Pastor Belga Tervueren','Pastor de Shetland',
  'Pastor Inglés','Pequinés','Perro de Agua Español','Perro de Montaña de los Pirineos',
  'Perro sin Pelo del Perú','Pinscher','Pointer','Pomerania','Poodle',
  'Pug','Rhodesian Ridgeback','Rottweiler','Rough Collie','Saluki',
  'Samoyedo','San Bernardo','Schnauzer Gigante','Schnauzer Mediano','Schnauzer Miniatura',
  'Scottish Terrier','Shar Pei','Shiba Inu','Shih Tzu','Spitz Alemán',
  'Staffordshire Bull Terrier','Teckel','Terranova','Vizsla',
  'Weimaraner','Welsh Terrier','West Highland White Terrier','Whippet',
  'Yorkshire Terrier',
];

const CAT_BREEDS = [
  'Mestizo',
  'Abisinio','American Shorthair','Angora Turco','Azul Ruso',
  'Bengalí','Birmano','Bombay','British Longhair','British Shorthair',
  'Burmés','Chartreux','Cornish Rex','Devon Rex','Esfinge (Sphynx)',
  'Exótico de Pelo Corto','Himalayo','Maine Coon','Manx',
  'Mau Egipcio','Noruego del Bosque','Ocicat','Persa',
  'Ragdoll','Savannah','Scottich Fold','Siamés',
  'Siberiano','Singapura','Somalí','Tonkinés',
];

const formatBirthDate = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
};

const formatBirthDateShort = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

const buildCalendarDays = (date: Date) => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const days = [] as Array<number | null>;

  for (let i = 0; i < firstWeekday; i += 1) days.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) days.push(d);
  return days;
};

const parseBirthDateText = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const rawYear = Number(match[3]);
  const year = 2000 + rawYear;
  const asDate = new Date(year, month - 1, day);

  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    !Number.isFinite(year) ||
    asDate.getFullYear() !== year ||
    asDate.getMonth() !== month - 1 ||
    asDate.getDate() !== day
  ) {
    return null;
  }

  return asDate;
};

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

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileDraft, setProfileDraft] = useState<Omit<UserProfile, 'id'>>({
    first_name: '', last_name: '', phone: '', rut: '', sex: '', birth_year: 0, commune: ''
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showProfileSexDropdown, setShowProfileSexDropdown] = useState(false);

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
      case 'Profile':      return 'Mi Perfil';
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
      .select('id,name,species,breed,is_lost,photo_url')
      .eq('owner_id', user.id)
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
          'id,name,species,breed,is_lost,photo_url,color,birth_year,birth_date_text,sex,weight_kg,description,sterilized,chip_number,blood_type,insurance_name,insurance_policy,contact_primary_name,owner_phone,contact_secondary_name,contact_secondary_phone,owner_whatsapp,public_notes,allergies,medications,conditions,vet_name,vet_phone'
        )
        .eq('id', petId)
        .eq('owner_id', user.id)
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
          'id,name,species,breed,is_lost,photo_url,color,birth_year,birth_date_text,sex,weight_kg,description,sterilized,chip_number,blood_type,insurance_name,insurance_policy,contact_primary_name,owner_phone,contact_secondary_name,contact_secondary_phone,owner_whatsapp,public_notes,allergies,medications,conditions,vet_name,vet_phone'
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
        await fetchPets();
        if (!mounted) return;
        setScreen('Home');
      } else {
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

  const handleLogin = async () => {
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      Alert.alert('Validación', parsed.error.errors[0]?.message ?? 'Datos inválidos');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
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
        .update({
          first_name: profileDraft.first_name.trim(),
          last_name: profileDraft.last_name.trim(),
          phone: profileDraft.phone.trim(),
          rut: profileDraft.rut.trim(),
          sex: profileDraft.sex,
          birth_year: profileDraft.birth_year,
          commune: profileDraft.commune.trim(),
        })
        .eq('id', user.id);
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
    if (!birthYear || isNaN(year) || year < 1920 || year > 2006) {
      Alert.alert('Año inválido', 'Ingresa un año de nacimiento válido (entre 1920 y 2006).'); return;
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
        // Vinculado a otra mascota — preguntar
        await new Promise<void>((resolve) => {
          Alert.alert(
            'Tag en uso',
            `Este tag ya está vinculado a otra mascota. ¿Reasignarlo a ${selectedPet.name}?`,
            [
              { text: 'Cancelar', style: 'cancel', onPress: () => resolve() },
              { text: 'Reasignar', style: 'destructive', onPress: async () => {
                const { error } = await supabase.from('tags')
                  .update({ pet_id: selectedPet.id, status: 'linked' }).eq('code', code);
                if (error) Alert.alert('Error', error.message);
                else { setScreen('PetDetail'); }
                resolve();
              }}
            ]
          );
        });
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
    if (screen === 'Home') loadAllLostPets();
  }, [screen]);

  // Cargar perfil al entrar a Profile
  useEffect(() => {
    if (screen === 'Profile') loadUserProfile();
  }, [screen]);

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
        <View style={styles.loginWrap}>
          {/* Brand */}
          <View style={styles.loginBrand}>
            <Text style={styles.loginEmoji}>🐾</Text>
            <Text style={styles.loginTitle}>ChipDog</Text>
            <Text style={styles.loginSubtitle}>El hogar digital de tus mascotas</Text>
          </View>

          {/* Form */}
          <View style={styles.loginForm}>
            <View style={styles.loginInputWrap}>
              <Text style={styles.loginInputLabel}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={styles.loginInput}
                placeholder="tu@email.com"
                placeholderTextColor={C.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>
            <View style={styles.loginInputWrap}>
              <Text style={styles.loginInputLabel}>Contraseña</Text>
              <View style={styles.loginPasswordRow}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  style={[styles.loginInput, { flex: 1, marginBottom: 0 }]}
                  placeholder="••••••••"
                  placeholderTextColor={C.textMuted}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity style={styles.passwordEyeBtn} onPress={() => setShowPassword(v => !v)}>
                  <Text style={styles.passwordEyeText}>{showPassword ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>{loading ? 'Ingresando...' : 'Ingresar'}</Text>
            </TouchableOpacity>

            <View style={styles.loginDivider}>
              <View style={styles.loginDividerLine} />
              <Text style={styles.loginDividerText}>¿No tienes cuenta?</Text>
              <View style={styles.loginDividerLine} />
            </View>

            <TouchableOpacity style={styles.btnOutline} onPress={() => setScreen('Register')} activeOpacity={0.85}>
              <Text style={styles.btnOutlineText}>Crear cuenta gratis</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 8 }} onPress={() => setScreen('FoundTag')} activeOpacity={0.85}>
              <Text style={{ color: C.textLight, fontWeight: '600', fontSize: 14 }}>🔍  Encontré una mascota</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (screen === 'Register') {
      const SEX_OPTIONS = ['Masculino', 'Femenino', 'Prefiero no decir'];
      return (
        <View style={styles.loginWrap}>
          {/* Brand + paso */}
          <View style={styles.loginBrand}>
            <Text style={styles.loginEmoji}>🐾</Text>
            <Text style={styles.loginTitle}>{registerStep === 1 ? 'Crear cuenta' : 'Tu perfil'}</Text>
            <Text style={styles.loginSubtitle}>{registerStep === 1 ? 'Paso 1 de 2 — Acceso' : 'Paso 2 de 2 — Datos personales'}</Text>
            {/* Barra de progreso */}
            <View style={styles.registerProgressBar}>
              <View style={[styles.registerProgressFill, { width: registerStep === 1 ? '50%' : '100%' }]} />
            </View>
          </View>

          {registerStep === 1 ? (
            <View style={styles.loginForm}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.loginInputWrap, { flex: 1 }]}>
                  <Text style={styles.loginInputLabel}>Nombre</Text>
                  <TextInput value={registerForm.firstName} onChangeText={(v) => setRegisterForm(p => ({ ...p, firstName: v }))}
                    style={styles.loginInput} placeholder="Rodrigo" placeholderTextColor={C.textMuted} autoCorrect={false} />
                </View>
                <View style={[styles.loginInputWrap, { flex: 1 }]}>
                  <Text style={styles.loginInputLabel}>Apellido</Text>
                  <TextInput value={registerForm.lastName} onChangeText={(v) => setRegisterForm(p => ({ ...p, lastName: v }))}
                    style={styles.loginInput} placeholder="Arriagada" placeholderTextColor={C.textMuted} autoCorrect={false} />
                </View>
              </View>

              <View style={styles.loginInputWrap}>
                <Text style={styles.loginInputLabel}>Email</Text>
                <TextInput value={registerForm.email} onChangeText={(v) => setRegisterForm(p => ({ ...p, email: v }))}
                  style={styles.loginInput} placeholder="tu@email.com" placeholderTextColor={C.textMuted}
                  autoCapitalize="none" keyboardType="email-address" autoCorrect={false} />
              </View>

              <View style={styles.loginInputWrap}>
                <Text style={styles.loginInputLabel}>Contraseña</Text>
                <View style={styles.loginPasswordRow}>
                  <TextInput value={registerForm.password} onChangeText={(v) => setRegisterForm(p => ({ ...p, password: v }))}
                    style={[styles.loginInput, { flex: 1, marginBottom: 0 }]} placeholder="Mínimo 6 caracteres"
                    placeholderTextColor={C.textMuted} secureTextEntry={!showPassword} />
                  <TouchableOpacity style={styles.passwordEyeBtn} onPress={() => setShowPassword(v => !v)}>
                    <Text style={styles.passwordEyeText}>{showPassword ? '🙈' : '👁'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.loginInputWrap}>
                <Text style={styles.loginInputLabel}>Confirmar contraseña</Text>
                <View style={styles.loginPasswordRow}>
                  <TextInput value={registerForm.confirmPassword} onChangeText={(v) => setRegisterForm(p => ({ ...p, confirmPassword: v }))}
                    style={[styles.loginInput, { flex: 1, marginBottom: 0 }]} placeholder="Repite tu contraseña"
                    placeholderTextColor={C.textMuted} secureTextEntry={!showConfirmPassword} />
                  <TouchableOpacity style={styles.passwordEyeBtn} onPress={() => setShowConfirmPassword(v => !v)}>
                    <Text style={styles.passwordEyeText}>{showConfirmPassword ? '🙈' : '👁'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.btnPrimary} onPress={handleRegisterStep1} activeOpacity={0.85}>
                <Text style={styles.btnPrimaryText}>Continuar →</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 8 }} onPress={() => setScreen('Login')} activeOpacity={0.85}>
                <Text style={{ color: C.textLight, fontWeight: '600', fontSize: 14 }}>¿Ya tienes cuenta? Inicia sesión</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.loginForm}>
              <View style={styles.loginInputWrap}>
                <Text style={styles.loginInputLabel}>Teléfono</Text>
                <TextInput value={registerForm.phone} onChangeText={(v) => setRegisterForm(p => ({ ...p, phone: v }))}
                  style={styles.loginInput} placeholder="+56 9 1234 5678" placeholderTextColor={C.textMuted}
                  keyboardType="phone-pad" />
              </View>

              <View style={styles.loginInputWrap}>
                <Text style={styles.loginInputLabel}>RUT</Text>
                <TextInput
                  value={registerForm.rut}
                  onChangeText={(v) => setRegisterForm(p => ({ ...p, rut: formatRut(v) }))}
                  style={styles.loginInput} placeholder="12.345.678-9" placeholderTextColor={C.textMuted}
                  autoCapitalize="characters" autoCorrect={false} maxLength={12} />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.loginInputWrap, { flex: 1 }]}>
                  <Text style={styles.loginInputLabel}>Año de nacimiento</Text>
                  <TextInput value={registerForm.birthYear} onChangeText={(v) => setRegisterForm(p => ({ ...p, birthYear: v }))}
                    style={styles.loginInput} placeholder="1991" placeholderTextColor={C.textMuted}
                    keyboardType="number-pad" maxLength={4} />
                </View>
                <View style={[styles.loginInputWrap, { flex: 1 }]}>
                  <Text style={styles.loginInputLabel}>Sexo</Text>
                  <TouchableOpacity
                    style={[styles.loginInput, styles.selectInput]}
                    onPress={() => setShowSexDropdown(v => !v)}
                    activeOpacity={0.9}
                  >
                    <Text style={[styles.selectInputText, !registerForm.sex && { color: C.textMuted }]}>
                      {registerForm.sex || 'Seleccionar'}
                    </Text>
                    <Text style={styles.selectChevron}>{showSexDropdown ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                  {showSexDropdown && (
                    <View style={styles.selectMenu}>
                      {SEX_OPTIONS.map(opt => (
                        <TouchableOpacity key={opt} style={[styles.selectOption, registerForm.sex === opt && styles.selectOptionActive]}
                          onPress={() => { setRegisterForm(p => ({ ...p, sex: opt })); setShowSexDropdown(false); }}>
                          <Text style={[styles.selectOptionText, registerForm.sex === opt && styles.selectOptionTextActive]}>{opt}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.loginInputWrap}>
                <Text style={styles.loginInputLabel}>Comuna</Text>
                <TextInput value={registerForm.commune} onChangeText={(v) => setRegisterForm(p => ({ ...p, commune: v }))}
                  style={styles.loginInput} placeholder="Ej: Las Condes" placeholderTextColor={C.textMuted} />
              </View>

              <TouchableOpacity style={styles.btnPrimary} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
                <Text style={styles.btnPrimaryText}>{loading ? 'Creando cuenta...' : 'Crear mi cuenta'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 8 }} onPress={() => setRegisterStep(1)} activeOpacity={0.85}>
                <Text style={{ color: C.textLight, fontWeight: '600', fontSize: 14 }}>← Volver al paso anterior</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }

    if (screen === 'Profile') {
      const SEX_OPTIONS = ['Masculino', 'Femenino', 'Prefiero no decir'];
      return (
        <View style={styles.form}>
          {loading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* Avatar iniciales */}
              <View style={styles.profileHero}>
                <View style={styles.profileAvatarLarge}>
                  <Text style={styles.profileAvatarLargeText}>
                    {profileDraft.first_name?.[0]?.toUpperCase() ?? ''}{profileDraft.last_name?.[0]?.toUpperCase() ?? ''}
                  </Text>
                </View>
                {!isEditingProfile && (
                  <Text style={styles.profileHeroName}>
                    {profileDraft.first_name} {profileDraft.last_name}
                  </Text>
                )}
                {!isEditingProfile && profileDraft.commune ? (
                  <Text style={styles.profileHeroMeta}>{profileDraft.commune}</Text>
                ) : null}
              </View>

              {isEditingProfile ? (
                <>
                  <Card title="Datos personales" accent={C.primary}>
                    <Text style={styles.fieldLabel}>Nombre</Text>
                    <TextInput style={styles.input} value={profileDraft.first_name}
                      onChangeText={(v) => setProfileDraft(p => ({ ...p, first_name: v }))}
                      placeholder="Nombre" placeholderTextColor={C.textMuted} autoCorrect={false} />

                    <Text style={styles.fieldLabel}>Apellido</Text>
                    <TextInput style={styles.input} value={profileDraft.last_name}
                      onChangeText={(v) => setProfileDraft(p => ({ ...p, last_name: v }))}
                      placeholder="Apellido" placeholderTextColor={C.textMuted} autoCorrect={false} />

                    <Text style={styles.fieldLabel}>Teléfono</Text>
                    <TextInput style={styles.input} value={profileDraft.phone}
                      onChangeText={(v) => setProfileDraft(p => ({ ...p, phone: v }))}
                      placeholder="+56 9 1234 5678" placeholderTextColor={C.textMuted}
                      keyboardType="phone-pad" />

                    <Text style={styles.fieldLabel}>RUT</Text>
                    <TextInput style={styles.input} value={profileDraft.rut}
                      onChangeText={(v) => setProfileDraft(p => ({ ...p, rut: formatRut(v) }))}
                      placeholder="12.345.678-9" placeholderTextColor={C.textMuted}
                      autoCapitalize="characters" autoCorrect={false} maxLength={12} />

                    <Text style={styles.fieldLabel}>Sexo</Text>
                    <TouchableOpacity style={[styles.input, styles.selectInput]}
                      onPress={() => setShowProfileSexDropdown(v => !v)} activeOpacity={0.9}>
                      <Text style={[styles.selectInputText, !profileDraft.sex && { color: C.textMuted }]}>
                        {profileDraft.sex || 'Seleccionar'}
                      </Text>
                      <Text style={styles.selectChevron}>{showProfileSexDropdown ? '▲' : '▼'}</Text>
                    </TouchableOpacity>
                    {showProfileSexDropdown && (
                      <View style={styles.selectMenu}>
                        {SEX_OPTIONS.map(opt => (
                          <TouchableOpacity key={opt}
                            style={[styles.selectOption, profileDraft.sex === opt && styles.selectOptionActive]}
                            onPress={() => { setProfileDraft(p => ({ ...p, sex: opt })); setShowProfileSexDropdown(false); }}>
                            <Text style={[styles.selectOptionText, profileDraft.sex === opt && styles.selectOptionTextActive]}>{opt}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    <Text style={styles.fieldLabel}>Año de nacimiento</Text>
                    <TextInput style={styles.input} value={profileDraft.birth_year ? String(profileDraft.birth_year) : ''}
                      onChangeText={(v) => setProfileDraft(p => ({ ...p, birth_year: parseInt(v) || 0 }))}
                      placeholder="1991" placeholderTextColor={C.textMuted}
                      keyboardType="number-pad" maxLength={4} />

                    <Text style={styles.fieldLabel}>Comuna</Text>
                    <TextInput style={styles.input} value={profileDraft.commune}
                      onChangeText={(v) => setProfileDraft(p => ({ ...p, commune: v }))}
                      placeholder="Ej: Las Condes" placeholderTextColor={C.textMuted} />
                  </Card>

                  <TouchableOpacity style={styles.btnPrimary} onPress={saveUserProfile} disabled={loading} activeOpacity={0.85}>
                    <Text style={styles.btnPrimaryText}>{loading ? 'Guardando...' : 'Guardar cambios'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 8 }}
                    onPress={() => { setIsEditingProfile(false); setShowProfileSexDropdown(false); }} activeOpacity={0.7}>
                    <Text style={{ color: C.textLight, fontWeight: '600', fontSize: 14 }}>Cancelar</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Card title="Datos personales" accent={C.primary}>
                    <InfoRow label="Nombre" value={`${profileDraft.first_name} ${profileDraft.last_name}`} />
                    <InfoRow label="Teléfono" value={profileDraft.phone} />
                    <InfoRow label="RUT" value={profileDraft.rut} />
                    <InfoRow label="Sexo" value={profileDraft.sex} />
                    <InfoRow label="Año nacimiento" value={profileDraft.birth_year ? String(profileDraft.birth_year) : null} />
                    <InfoRow label="Comuna" value={profileDraft.commune} />
                  </Card>

                  <TouchableOpacity style={styles.btnPrimary} onPress={() => setIsEditingProfile(true)} activeOpacity={0.85}>
                    <Text style={styles.btnPrimaryText}>Editar perfil</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
                    <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </View>
      );
    }

    if (screen === 'FoundTag') {
      return (
        <View style={styles.foundWrap}>
          <Text style={styles.foundEmoji}>🐕</Text>
          <Text style={styles.foundTitle}>¿Encontraste a alguien?</Text>
          <Text style={styles.foundSubtitle}>Escanea el QR del collar o ingresa el código manualmente</Text>

          {/* Botón escanear QR */}
          <TouchableOpacity
            style={[styles.btnPrimary, { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 16, width: '100%' }]}
            onPress={() => { setQrScanned(false); setScreen('ScanTag'); }} activeOpacity={0.85}>
            <Text style={{ fontSize: 22 }}>📷</Text>
            <Text style={[styles.btnPrimaryText, { fontSize: 16 }]}>Escanear QR del collar</Text>
          </TouchableOpacity>

          {/* Divisor */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', marginVertical: 4 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
            <Text style={{ color: C.textMuted, fontSize: 13, fontWeight: '600' }}>o ingresa el código</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
          </View>

          <TextInput
            style={[styles.input, { width: '100%' }]}
            placeholder="Ej: CD-A3F9K"
            placeholderTextColor={C.textMuted}
            value={foundCode}
            onChangeText={setFoundCode}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={[styles.btnPrimary, { width: '100%', backgroundColor: C.dark }]} onPress={handleFoundLookup} disabled={loading} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>{loading ? 'Buscando...' : 'Buscar mascota'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnGhost} onPress={() => setScreen('Login')} activeOpacity={0.85}>
            <Text style={styles.btnGhostText}>Volver</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (screen === 'FoundResult') {
      return (
        <View style={styles.foundWrap}>
          {foundPet ? (
            <>
              <Text style={styles.foundEmoji}>
                {foundPet.is_lost ? '🚨' : '🐾'}
              </Text>
              {foundPet.is_lost && (
                <View style={styles.lostAlertBanner}>
                  <Text style={styles.lostAlertText}>Esta mascota está reportada como PERDIDA</Text>
                </View>
              )}
              <Text style={styles.foundPetName}>{foundPet.public_name}</Text>
              <Card>
                <InfoRow label="Especie"  value={foundPet.species} />
                {foundPet.breed ? <InfoRow label="Raza"   value={foundPet.breed} /> : null}
                {foundPet.color ? <InfoRow label="Color"  value={foundPet.color} /> : null}
                {foundPet.owner_name ? <InfoRow label="Dueño" value={foundPet.owner_name} /> : null}
              </Card>
              {foundPet.public_notes ? (
                <Card title="Indicaciones" accent={C.warning}>
                  <Text style={{ color: C.text, lineHeight: 20 }}>{foundPet.public_notes}</Text>
                </Card>
              ) : null}
              {foundPet.contact_phone ? (
                <TouchableOpacity style={styles.btnPrimary} onPress={() => Linking.openURL(`tel:${foundPet.contact_phone}`)} activeOpacity={0.85}>
                  <Text style={styles.btnPrimaryText}>📞  Llamar al dueño</Text>
                </TouchableOpacity>
              ) : null}
              {foundPet.contact_whatsapp ? (
                <TouchableOpacity
                  style={[styles.btnPrimary, { backgroundColor: '#25D366' }]}
                  onPress={() => Linking.openURL(`https://wa.me/${foundPet.contact_whatsapp!.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, encontré a ${foundPet.public_name} 🐾`)}`)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.btnPrimaryText}>💬  WhatsApp</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : (
            <Text style={{ color: C.textLight, textAlign: 'center' }}>No hay datos disponibles.</Text>
          )}
          <TouchableOpacity style={styles.btnGhost} onPress={() => setScreen('FoundTag')} activeOpacity={0.85}>
            <Text style={styles.btnGhostText}>Buscar otro tag</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnGhost} onPress={() => setScreen('Login')} activeOpacity={0.85}>
            <Text style={styles.btnGhostText}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (screen === 'Home') {
      const lostCount = allLostPets.length;
      const firstName = userName
        ? userName.split(' ')[0].charAt(0).toUpperCase() + userName.split(' ')[0].slice(1).toLowerCase()
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

          {/* Switch perdido */}
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

          <TouchableOpacity style={styles.btnPrimary} onPress={() => setScreen('LinkTag')} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>🏷️  Vincular tag NFC / QR</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnGhost} onPress={() => setScreen('Home')} activeOpacity={0.85}>
            <Text style={styles.btnGhostText}>← Volver a mis mascotas</Text>
          </TouchableOpacity>
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
              <InfoRow label="WhatsApp" value={petDraft.owner_whatsapp} />
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
              placeholder="Ej: Rodrigo Arriagada"
              placeholderTextColor={C.textMuted}
              value={petDraft.contact_primary_name}
              onChangeText={(v) => setPetDraft((p) => ({ ...p, contact_primary_name: v }))}
            />
            <Text style={styles.fieldLabel}>Teléfono</Text>
            <TextInput
              style={styles.input}
              placeholder="+56 9 1234 5678"
              placeholderTextColor={C.textMuted}
              value={petDraft.owner_phone}
              onChangeText={(v) => setPetDraft((p) => ({ ...p, owner_phone: v }))}
              keyboardType="phone-pad"
            />
            <Text style={styles.fieldLabel}>WhatsApp (número con código país)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 56912345678"
              placeholderTextColor={C.textMuted}
              value={petDraft.owner_whatsapp}
              onChangeText={(v) => setPetDraft((p) => ({ ...p, owner_whatsapp: v }))}
              keyboardType="phone-pad"
            />
          </Card>

          {/* ── Contacto secundario ── */}
          <Card title="👤  Contacto secundario" accent={C.accent}>
            <Text style={styles.fieldLabel}>Nombre</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Carolina Poehls"
              placeholderTextColor={C.textMuted}
              value={petDraft.contact_secondary_name}
              onChangeText={(v) => setPetDraft((p) => ({ ...p, contact_secondary_name: v }))}
            />
            <Text style={styles.fieldLabel}>Teléfono</Text>
            <TextInput
              style={styles.input}
              placeholder="+56 9 8765 4321"
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
              placeholder="+56 2 1234 5678"
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
              placeholder='Ej: "Es asustadizo, no lo persigan. Llamen a Rodrigo."'
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
      const waNumber = pet.owner_whatsapp?.replace(/\D/g, '');
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
          {waNumber && (
            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: '#25D366' }]}
              onPress={() => Linking.openURL(`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hola, vi el reporte de ${pet.name} en ChipDog 🐾`)}`)}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>💬  WhatsApp</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.btnGhost} onPress={() => setScreen('LostPetList')} activeOpacity={0.85}>
            <Text style={styles.btnGhostText}>Volver a la lista</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // ── LinkTag ──
    if (screen === 'LinkTag') {
      const tagUrl = `https://chipdog.app/tag/${linkTagCode}`;

      // ── Vista: elegir método ──
      if (linkTagMode === 'choose') {
        return (
          <View style={styles.form}>
            <Card title="🏷️  Nuevo tag" accent={C.primary}>
              <Text style={{ color: C.textLight, fontSize: 13, lineHeight: 19 }}>
                Se generará un código único para {selectedPet?.name ?? 'tu mascota'}. Elige cómo quieres grabarlo en el tag físico.
              </Text>
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <Text style={{ fontSize: 13, color: C.textMuted, fontWeight: '600', marginBottom: 6 }}>CÓDIGO GENERADO</Text>
                <Text style={{ fontSize: 32, fontWeight: '900', color: C.primary, letterSpacing: 2 }}>{linkTagCode}</Text>
                <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{tagUrl}</Text>
              </View>
            </Card>

            <TouchableOpacity style={[styles.btnPrimary, { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 18 }]}
              onPress={() => setLinkTagMode('nfc')} activeOpacity={0.85}>
              <Text style={{ fontSize: 24 }}>📡</Text>
              <View>
                <Text style={[styles.btnPrimaryText, { fontSize: 17 }]}>Escribir tag NFC</Text>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, textAlign: 'center' }}>Acerca el iPhone al tag</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btnPrimary, { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 18, backgroundColor: C.dark }]}
              onPress={() => setLinkTagMode('qr')} activeOpacity={0.85}>
              <Text style={{ fontSize: 24 }}>📱</Text>
              <View>
                <Text style={[styles.btnPrimaryText, { fontSize: 17 }]}>Generar código QR</Text>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, textAlign: 'center' }}>Para imprimir o compartir</Text>
              </View>
            </TouchableOpacity>
          </View>
        );
      }

      // ── Vista: NFC ──
      if (linkTagMode === 'nfc') {
        return (
          <View style={styles.form}>
            <TouchableOpacity style={styles.inlineBackBtn} onPress={() => { setNfcStatus('idle'); setNfcError(''); setLinkTagMode('choose'); }} activeOpacity={0.7}>
              <Text style={styles.inlineBackArrow}>‹</Text>
              <Text style={styles.inlineBackLabel}>Cambiar método</Text>
            </TouchableOpacity>

            <Card title="📡  Escribir tag NFC" accent={C.primary}>
              <Text style={{ color: C.textMuted, fontSize: 13 }}>Código: <Text style={{ fontWeight: '800', color: C.dark }}>{linkTagCode}</Text></Text>

              {/* Estado visual */}
              <View style={{ alignItems: 'center', paddingVertical: 24, gap: 12 }}>
                {nfcStatus === 'idle' && <Text style={{ fontSize: 60 }}>📡</Text>}
                {nfcStatus === 'scanning' && <Text style={{ fontSize: 60 }}>⏳</Text>}
                {nfcStatus === 'success' && <Text style={{ fontSize: 60 }}>✅</Text>}
                {nfcStatus === 'error' && <Text style={{ fontSize: 60 }}>❌</Text>}

                <Text style={{ fontSize: 17, fontWeight: '700', color: C.dark, textAlign: 'center' }}>
                  {nfcStatus === 'idle' && 'Listo para escribir'}
                  {nfcStatus === 'scanning' && 'Acerca el iPhone al tag NFC...'}
                  {nfcStatus === 'success' && '¡Tag grabado correctamente!'}
                  {nfcStatus === 'error' && 'Error al escribir el tag'}
                </Text>

                {nfcStatus === 'error' && nfcError ? (
                  <Text style={{ color: C.danger, fontSize: 13, textAlign: 'center' }}>{nfcError}</Text>
                ) : null}

                {nfcStatus === 'success' ? (
                  <Text style={{ color: C.textLight, fontSize: 13, textAlign: 'center' }}>
                    El tag está vinculado a {selectedPet?.name}
                  </Text>
                ) : null}
              </View>

              {(nfcStatus === 'idle' || nfcStatus === 'error') && (
                <TouchableOpacity style={styles.btnPrimary} onPress={writeNfcTag} activeOpacity={0.85}>
                  <Text style={styles.btnPrimaryText}>
                    {nfcStatus === 'error' ? 'Reintentar' : 'Iniciar sesión NFC'}
                  </Text>
                </TouchableOpacity>
              )}

              {nfcStatus === 'success' && (
                <TouchableOpacity style={styles.btnPrimary} onPress={() => setScreen('PetDetail')} activeOpacity={0.85}>
                  <Text style={styles.btnPrimaryText}>Volver al perfil</Text>
                </TouchableOpacity>
              )}
            </Card>
          </View>
        );
      }

      // ── Vista: QR ──
      if (linkTagMode === 'qr') {
        return (
          <View style={styles.form}>
            <TouchableOpacity style={styles.inlineBackBtn} onPress={() => setLinkTagMode('choose')} activeOpacity={0.7}>
              <Text style={styles.inlineBackArrow}>‹</Text>
              <Text style={styles.inlineBackLabel}>Cambiar método</Text>
            </TouchableOpacity>

            <Card title="📱  Código QR" accent={C.dark}>
              <Text style={{ color: C.textMuted, fontSize: 13 }}>
                Código: <Text style={{ fontWeight: '800', color: C.dark }}>{linkTagCode}</Text>
              </Text>
              <View style={{ alignItems: 'center', paddingVertical: 20, gap: 14 }}>
                <View style={{ padding: 16, backgroundColor: C.white, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3 }}>
                  <QRCode value={tagUrl} size={200} color={C.dark} backgroundColor={C.white} />
                </View>
                <Text style={{ fontSize: 12, color: C.textMuted, textAlign: 'center', maxWidth: 260 }}>{tagUrl}</Text>
              </View>
              <Text style={{ fontSize: 13, color: C.textLight, lineHeight: 19, textAlign: 'center' }}>
                Toma una captura de pantalla para imprimir este QR o compártelo directamente.{'\n'}Luego toca "Vincular" para guardarlo en el perfil de {selectedPet?.name}.
              </Text>
            </Card>

            <TouchableOpacity style={styles.btnPrimary} onPress={async () => {
              const ok = await saveLinkTagCode(linkTagCode);
              if (ok) Alert.alert('Tag vinculado ✅', `Código ${linkTagCode} vinculado a ${selectedPet?.name}.`, [
                { text: 'Volver al perfil', onPress: () => setScreen('PetDetail') }
              ]);
            }} disabled={loading} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>{loading ? 'Vinculando...' : `Vincular QR a ${selectedPet?.name ?? 'mascota'}`}</Text>
            </TouchableOpacity>
          </View>
        );
      }

      return null;
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
            keyboardDismissMode="on-drag"
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

const styles = StyleSheet.create({

  // ─── Layout ────────────────────────────────────────────────────────────────
  container: { flex: 1, backgroundColor: C.bg },
  scroll:    { padding: 16, paddingBottom: 36 },
  title:     { fontSize: 22, fontWeight: '800', color: C.dark, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },

  // ─── NavBar ────────────────────────────────────────────────────────────────
  navBar:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 6, paddingBottom: 6, backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  navBackBtn:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, minWidth: 70 },
  navBackArrow:   { fontSize: 28, color: C.primary, lineHeight: 32, marginTop: -2 },
  navBackLabel:   { fontSize: 15, color: C.primary, fontWeight: '600', marginLeft: 2 },
  navTitle:       { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: C.dark },
  navActionBtn:   { minWidth: 70, alignItems: 'flex-end', paddingHorizontal: 8, paddingVertical: 6 },
  inlineBackBtn:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 4, alignSelf: 'flex-start' },
  inlineBackArrow:{ fontSize: 26, color: C.primary, lineHeight: 30, marginTop: -1 },
  inlineBackLabel:{ fontSize: 15, color: C.primary, fontWeight: '600', marginLeft: 2 },
  form:      { gap: 14 },
  loader:    { marginBottom: 24 },

  // ─── Input ─────────────────────────────────────────────────────────────────
  input: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: C.white,
    color: C.dark,
    fontSize: 15,
    fontWeight: '500',
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },

  // ─── Card ──────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 16,
    shadowColor: C.primary,
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: { fontSize: 13, fontWeight: '800', color: C.dark, textTransform: 'uppercase', letterSpacing: 0.5 },

  // ─── Login / Register ──────────────────────────────────────────────────────
  loginWrap: { flex: 1, justifyContent: 'center', gap: 32, paddingTop: 16 },
  loginBrand: { alignItems: 'center', gap: 6 },
  loginEmoji: { fontSize: 56 },
  loginTitle: { fontSize: 36, fontWeight: '900', color: C.dark, letterSpacing: -1 },
  loginSubtitle: { fontSize: 15, color: C.textLight, fontWeight: '500' },
  loginForm: { gap: 14 },
  loginInputWrap: { gap: 6 },
  loginInputLabel: { fontSize: 13, fontWeight: '700', color: C.text, marginLeft: 2 },
  loginInput: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: C.white,
    color: C.dark,
    fontSize: 15,
    fontWeight: '500',
  },
  loginPasswordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    backgroundColor: C.white,
    paddingRight: 8,
  },
  passwordEyeBtn: { padding: 10 },
  passwordEyeText: { fontSize: 18 },
  registerProgressBar: { width: '100%', height: 4, backgroundColor: C.border, borderRadius: 2, marginTop: 12 },
  registerProgressFill: { height: 4, backgroundColor: C.primary, borderRadius: 2 },
  loginDivider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loginDividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  loginDividerText: { color: C.textMuted, fontSize: 13, fontWeight: '600' },
  btnOutline: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.primary,
    backgroundColor: C.white,
  },
  btnOutlineText: { color: C.primary, fontWeight: '800', fontSize: 15, letterSpacing: 0.2 },

  // ─── Found Pet ─────────────────────────────────────────────────────────────
  foundWrap: { gap: 14, paddingTop: 8 },
  foundEmoji: { fontSize: 52, textAlign: 'center' },
  foundTitle: { fontSize: 24, fontWeight: '900', color: C.dark, textAlign: 'center' },
  foundSubtitle: { fontSize: 14, color: C.textLight, textAlign: 'center', lineHeight: 20 },
  foundPetName: { fontSize: 28, fontWeight: '900', color: C.dark, textAlign: 'center' },
  lostAlertBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: C.warning,
  },
  lostAlertText: { color: '#92400E', fontWeight: '700', fontSize: 13 },

  // ─── Home ──────────────────────────────────────────────────────────────────
  homeHeader: {
    borderRadius: 22,
    padding: 22,
    backgroundColor: C.dark,
    marginBottom: 2,
    shadowColor: C.dark,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  homeHeaderEyebrow: { color: C.primaryLight, fontWeight: '700', fontSize: 13, marginBottom: 6 },
  homeHeaderTitle: { color: C.white, fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  homeHeaderSubtitle: { color: '#94A3B8', marginTop: 6, fontSize: 13, lineHeight: 18 },

  addPetCta: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  addPetCtaText: { color: C.white, fontWeight: '900', fontSize: 16, letterSpacing: 0.2 },

  // Pet card en Home
  petCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: C.primary,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  petCardPhotoWrap: { position: 'relative' },
  petCardPhoto: { width: 72, height: 72, borderRadius: 999 },
  petCardLostDot: {
    position: 'absolute', top: 2, right: 2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: C.danger,
    borderWidth: 2, borderColor: C.white,
  },
  petCardName:  { fontSize: 17, fontWeight: '800', color: C.dark },
  petCardBreed: { fontSize: 13, color: C.textLight, fontWeight: '500', marginTop: 2 },
  petCardArrow: { fontSize: 22, color: C.textMuted, fontWeight: '300' },

  emptyState: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  emptyStateEmoji: { fontSize: 52 },
  emptyStateTitle: { fontSize: 18, fontWeight: '800', color: C.dark },
  emptyStateHint: { fontSize: 14, color: C.textLight, textAlign: 'center', lineHeight: 20, maxWidth: 260 },

  logoutBtn: { marginTop: 4, paddingVertical: 12, alignItems: 'center' },
  logoutBtnText: { color: C.textLight, fontWeight: '600', fontSize: 14 },
  logoutWrap: { marginTop: 8, marginBottom: 14 },

  // ─── PetDetail Hero ────────────────────────────────────────────────────────
  petHero: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: C.white,
    borderRadius: 24,
    shadowColor: C.primary,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 3,
    gap: 6,
  },
  petHeroAvatarWrap: { position: 'relative' },
  petHeroAvatar: { width: 110, height: 110, borderRadius: 999 },
  petHeroCameraBtn: {
    position: 'absolute', bottom: 2, right: 2,
    backgroundColor: C.white,
    borderRadius: 14,
    width: 28, height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  petHeroName:  { fontSize: 26, fontWeight: '900', color: C.dark, marginTop: 4 },
  petHeroBreed: { fontSize: 14, color: C.textLight, fontWeight: '500' },

  // Nav grid 2x2
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  navGridCard: {
    width: '47.5%',
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 16,
    gap: 6,
    borderTopWidth: 3,
    shadowColor: C.primary,
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  navGridIcon:  { fontSize: 26 },
  navGridTitle: { fontSize: 15, fontWeight: '800', color: C.dark },
  navGridHint:  { fontSize: 12, color: C.textLight, fontWeight: '500' },

  // Keep legacy nav card keys (used nowhere now but safe to keep)
  navCard:      { backgroundColor: C.white, borderRadius: 16, padding: 14, gap: 4 },
  navCardTitle: { fontSize: 17, fontWeight: '800', color: C.dark },
  navCardHint:  { color: C.textLight, fontWeight: '600' },

  // ─── Buttons ───────────────────────────────────────────────────────────────
  btnPrimary: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 3,
  },
  btnPrimaryText: { color: C.white, fontWeight: '800', fontSize: 15, letterSpacing: 0.2 },

  btnGhost: {
    backgroundColor: C.white,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: C.border,
  },
  btnGhostText: { color: C.dark, fontWeight: '700', fontSize: 15 },

  // Legacy action buttons (still used in vet/vaccine screens)
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimary:     { backgroundColor: C.dark },
  actionBtnPrimaryText: { color: C.white, fontWeight: '900' },
  actionBtnGhost:       { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border },
  actionBtnGhostText:   { color: C.dark, fontWeight: '900' },

  saveBtn:     { backgroundColor: C.success },
  saveBtnText: { color: C.white, fontWeight: '900', fontSize: 15 },

  deleteBtn:     { backgroundColor: C.danger },
  deleteBtnText: { color: C.white, fontWeight: '900', fontSize: 15 },

  linkBtn:     { backgroundColor: C.primary },
  linkBtnText: { color: C.white, fontWeight: '900', fontSize: 15 },

  backBtn:     { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border },
  backBtnText: { color: C.dark, fontWeight: '900' },

  // ─── Badges ────────────────────────────────────────────────────────────────
  badge:         { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badgeText:     { fontSize: 12, fontWeight: '700' },
  badgeOk:       { backgroundColor: C.successLight },
  badgeDanger:   { backgroundColor: C.dangerLight },
  badgeTextOk:   { color: C.success },
  badgeTextDanger: { color: C.danger },

  // ─── Data rows ─────────────────────────────────────────────────────────────
  row:      { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 4 },
  rowLabel: { color: C.textLight, fontWeight: '600', fontSize: 14 },
  rowValue: { color: C.dark, fontWeight: '700', fontSize: 14, flexShrink: 1, textAlign: 'right' },

  switchRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchLabel: { flex: 1, color: C.text, fontWeight: '700', fontSize: 15 },

  // ─── Select / Dropdown ─────────────────────────────────────────────────────
  selectInput:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectInputText:    { color: C.dark, fontWeight: '600', fontSize: 15 },
  selectChevron:      { color: C.textLight, fontWeight: '800' },
  selectMenu:         { marginTop: 6, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, overflow: 'hidden' },
  selectOption:       { paddingVertical: 13, paddingHorizontal: 14 },
  selectOptionActive: { backgroundColor: C.primaryLight },
  selectOptionText:       { color: C.dark, fontWeight: '600' },
  selectOptionTextActive: { color: C.primary, fontWeight: '700' },

  // ─── Calendar ──────────────────────────────────────────────────────────────
  calendarCard:          { marginTop: 8, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 16, padding: 12 },
  calendarHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  calendarArrowBtn:      { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface },
  calendarArrowText:     { fontSize: 18, color: C.dark, fontWeight: '700' },
  calendarMonthTitle:    { color: C.dark, fontWeight: '800', textTransform: 'capitalize' },
  calendarWeekRow:       { flexDirection: 'row', marginBottom: 6 },
  calendarWeekDay:       { flex: 1, textAlign: 'center', color: C.textLight, fontWeight: '700', fontSize: 12 },
  calendarGrid:          { flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 },
  calendarDayBtn:        { width: '14.285%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  calendarDayBtnDisabled:  { opacity: 0 },
  calendarDayBtnSelected:  { backgroundColor: C.primary },
  calendarDayText:         { color: C.dark, fontWeight: '600' },
  calendarDayTextSelected: { color: C.white, fontWeight: '800' },
  calendarInlineBtn:     { paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  calendarInlineBtnText: { color: C.dark, fontWeight: '700' },

  // ─── Mi Perfil ─────────────────────────────────────────────────────────────
  profileHero: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  profileAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  profileAvatarLargeText: {
    fontSize: 30,
    fontWeight: '800',
    color: C.primary,
  },
  profileHeroName: {
    fontSize: 22,
    fontWeight: '800',
    color: C.dark,
    letterSpacing: -0.3,
  },
  profileHeroMeta: {
    fontSize: 13,
    color: C.textLight,
    fontWeight: '500',
  },

  // ─── Profile (legacy, still used in some places) ───────────────────────────
  homePetImageWrap: { width: 72, height: 72, borderRadius: 999, overflow: 'hidden', backgroundColor: C.surface },
  homePetImage:     { width: 72, height: 72, borderRadius: 999 },
  profileHeader:         { backgroundColor: C.white, borderRadius: 20, padding: 16, flexDirection: 'row', gap: 14, alignItems: 'center' },
  profileHeaderCompact:  { backgroundColor: C.white, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarWrap:        { width: 92, height: 92, borderRadius: 999, overflow: 'hidden' },
  avatar:            { width: 92, height: 92, borderRadius: 999 },
  avatarPlaceholder: { backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
  avatarInitials:    { color: C.white, fontSize: 26, fontWeight: '800', letterSpacing: 1 },
  profileName:       { fontSize: 22, fontWeight: '800', color: C.dark },
  profileSub:        { color: C.textLight, fontSize: 14, fontWeight: '600' },
  changePhotoHint:   { color: C.primary, fontSize: 12, fontWeight: '600' },

  // ─── Form fields ───────────────────────────────────────────────────────────
  fieldLabel:       { color: C.text, fontWeight: '700', marginBottom: 4, fontSize: 13 },
  labeledInlineRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  leftTitleBox:     { width: 130, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, backgroundColor: C.surface, justifyContent: 'center', paddingHorizontal: 10 },
  leftTitleText:    { color: C.text, fontWeight: '800', fontSize: 13 },
  inlineValueInput: { flex: 1, marginBottom: 0 },
  sectionBlockTitle:{ color: C.text, fontWeight: '800', marginTop: 2 },
  largeBlockInput:  { minHeight: 96 },

  // ─── Reference photos ──────────────────────────────────────────────────────
  referencePhotosRow: { flexDirection: 'row', gap: 10 },
  referencePhotoBox:  { flex: 1, minHeight: 84, borderWidth: 1.5, borderColor: C.border, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface },
  referencePhotoText: { color: C.textLight, fontWeight: '700', fontSize: 13 },

  // ─── Symptoms ──────────────────────────────────────────────────────────────
  symptomInputRow:  { flexDirection: 'row', gap: 8, alignItems: 'center' },
  symptomInput:     { flex: 1 },
  symptomChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  symptomChip:      { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.primaryLight },
  symptomChipText:  { color: C.primary, fontWeight: '700', fontSize: 13 },

  // ─── Attachments ───────────────────────────────────────────────────────────
  attachmentBtnsRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  smallInlineBtn:        { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  smallInlineBtnText:    { color: C.dark, fontWeight: '800', fontSize: 13 },
  attachmentChip:        { borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: C.surface },
  attachmentChipText:    { color: C.text, fontWeight: '700', fontSize: 13 },
  attachmentEditChip:    { borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center', gap: 8 },
  removeAttachmentBtn:   { backgroundColor: C.dangerLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  removeAttachmentBtnText: { color: C.danger, fontWeight: '800', fontSize: 12 },

  // ─── Vet history ───────────────────────────────────────────────────────────
  vetHistoryCard:     { backgroundColor: C.white, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: C.primary, shadowOpacity: 0.06, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 2 },
  vetHistoryDateBadge:{ backgroundColor: C.primaryLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 72 },
  vetHistoryDateText: { color: C.primary, fontWeight: '700', fontSize: 12 },
  vetHistoryReason:   { color: C.dark, fontWeight: '800', fontSize: 15 },
  vetHistoryMeta:     { color: C.textLight, fontSize: 12, fontWeight: '500' },
  historyDetailBox:   { borderRadius: 12, backgroundColor: C.surface, padding: 12 },
  historyDetailText:  { color: C.dark, fontWeight: '700', fontSize: 14 },

  // ─── Vaccines ──────────────────────────────────────────────────────────────
  vaccineCard:        { backgroundColor: C.white, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: C.primary, shadowOpacity: 0.06, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 2, overflow: 'hidden' },
  vaccineStatusBar:   { width: 4, alignSelf: 'stretch', borderRadius: 4, minHeight: 40 },
  vaccineCardName:    { fontSize: 15, fontWeight: '800', color: C.dark, flex: 1 },
  vaccineBadge:       { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  vaccineBadgeText:   { fontSize: 11, fontWeight: '700' },
  vaccineCardDate:    { fontSize: 13, color: C.textLight, fontWeight: '500' },
  vaccineCardMeta:    { fontSize: 12, color: C.textMuted, fontWeight: '500' },

  // ─── Misc ──────────────────────────────────────────────────────────────────
  listCard:    { backgroundColor: C.white, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: C.primary, shadowOpacity: 0.06, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 2 },
  cardTitle:   { fontSize: 17, fontWeight: '800', color: C.dark },
  cardSubtitle:{ color: C.textLight, fontSize: 14, marginTop: 2, fontWeight: '500' },
  importantNote: { color: '#92400E', fontWeight: '700', fontSize: 13 },
  detailName:  { fontSize: 24, fontWeight: '800', color: C.dark },

  // ─── Lost Pet Map ──────────────────────────────────────────────────────────
  lostMapTip: {
    backgroundColor: C.primaryLight,
    borderRadius: 14,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
  },
  lostMapTipText: { color: C.primaryDark, fontWeight: '600', fontSize: 13, lineHeight: 18 },
  lostMapWrap: {
    height: 320,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: C.dark,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  lostRadiusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  lostRadiusBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    backgroundColor: C.white,
  },
  lostRadiusBtnActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  lostRadiusBtnText: { fontWeight: '700', fontSize: 13, color: C.textLight },
  lostRadiusBtnTextActive: { color: C.white },

  // ─── Dashboard Home ────────────────────────────────────────────────────────
  homeTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  homeTopBarLogo: {
    fontSize: 20,
    fontWeight: '900',
    color: C.primary,
    letterSpacing: -0.5,
  },
  homeAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: C.primary,
  },
  homeGreeting: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 4,
  },
  homeGreetingName: {
    fontSize: 28,
    fontWeight: '900',
    color: C.dark,
    letterSpacing: -0.5,
  },
  homeGreetingMeta: {
    fontSize: 14,
    color: C.textLight,
    fontWeight: '500',
  },
  homeLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 8,
  },
  homeLogoImg: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  homeLogoTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: C.dark,
    letterSpacing: -0.5,
  },
  homeLogoSub: {
    fontSize: 13,
    color: C.textLight,
    fontWeight: '500',
    marginTop: 1,
  },
  dashCardIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashCardIconEmoji: {
    fontSize: 22,
  },
  nearbyAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: C.warning,
    gap: 4,
  },
  nearbyAlertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.warning,
    marginRight: 6,
  },
  nearbyAlertTitle: { flex: 1, color: '#92400E', fontWeight: '700', fontSize: 13 },
  nearbyAlertArrow: { color: '#B45309', fontWeight: '800', fontSize: 18 },

  dashCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  dashCardAccent: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  dashCardArrow: { fontSize: 22, color: C.textMuted, fontWeight: '300' },

  dashRow: { flexDirection: 'row', gap: 12 },

  dashCardFull: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderTopWidth: 3,
    shadowColor: C.primary,
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  dashCardHalf: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 16,
    gap: 4,
    borderTopWidth: 3,
    shadowColor: C.primary,
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  dashCardIcon:  { fontSize: 28 },
  dashCardTitle: { fontSize: 15, fontWeight: '800', color: C.dark },
  dashCardHint:  { fontSize: 12, color: C.textLight, fontWeight: '500' },

  // ─── Filtros ───────────────────────────────────────────────────────────────
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.white,
  },
  filterChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  filterChipText:       { fontSize: 13, fontWeight: '700', color: C.textLight },
  filterChipTextActive: { color: C.white },
});
