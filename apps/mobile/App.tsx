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
  | 'Home'
  | 'AddPet'
  | 'PetDetail'
  | 'PetInfo'
  | 'PetContact'
  | 'PetVetHistory'
  | 'PetVaccines'
  | 'LinkTag'
  | 'FoundTag'
  | 'FoundResult';

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
    species: 'Perro',
    breed: '',
    color: ''
  });
  const [petBirthDate, setPetBirthDate] = useState<Date | null>(null);
  const [showSpeciesDropdown, setShowSpeciesDropdown] = useState(false);
  const [showBirthCalendar, setShowBirthCalendar] = useState(false);
  const [calendarMonthDate, setCalendarMonthDate] = useState(() => new Date());
  const [showProfileBirthCalendar, setShowProfileBirthCalendar] = useState(false);
  const [profileBirthCalendarMonth, setProfileBirthCalendarMonth] = useState(() => new Date());

  const [tagCode, setTagCode] = useState('');

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

  const [vetHistory, setVetHistory] = useState<VetRecord[]>([]);
  const [showNewVetRecord, setShowNewVetRecord] = useState(false);
  const [selectedVetRecord, setSelectedVetRecord] = useState<VetRecord | null>(null);
  const [editingVetRecordId, setEditingVetRecordId] = useState<string | null>(null);
  const [symptomInput, setSymptomInput] = useState('');
  const [vetForm, setVetForm] = useState({
    date: '',
    doctor: '',
    clinic: '',
    reason: '',
    symptoms: [] as string[],
    diagnosis: '',
    treatment: '',
    description: '',
    attachments: [] as VetAttachment[]
  });

  const title = useMemo(() => {
    switch (screen) {
      case 'Login':
        return 'Login';
      case 'Home':
        return 'Mis mascotas';
      case 'AddPet':
        return 'Agregar mascota';
      case 'PetDetail':
        return selectedPet ? selectedPet.name : 'Perfil';
      case 'PetInfo':
        return 'Información';
      case 'PetContact':
        return 'Contacto';
      case 'PetVetHistory':
        return 'Historial Veterinario';
      case 'PetVaccines':
        return 'Vacunas';
      case 'LinkTag':
        return 'Vincular tag';
      case 'FoundTag':
        return 'Encontré una mascota';
      case 'FoundResult':
        return 'Mascota encontrada';
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
          'id,name,species,breed,is_lost,photo_url,color,birth_year,birth_date_text,sex,weight_kg,contact_primary_name,owner_phone,contact_secondary_name,contact_secondary_phone,owner_whatsapp,public_notes,allergies,medications,conditions,vet_name,vet_phone'
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
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }
      setSelectedPet((p) => (p ? { ...p, is_lost: isLost } : p));
      await fetchPets();
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
          'id,name,species,breed,is_lost,photo_url,color,birth_year,birth_date_text,sex,weight_kg,contact_primary_name,owner_phone,contact_secondary_name,contact_secondary_phone,owner_whatsapp,public_notes,allergies,medications,conditions,vet_name,vet_phone'
        )
        .single();

      if (error) {
        Alert.alert('Error guardando', error.message);
        return;
      }

      setSelectedPet(data as Pet);
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

  const handleFoundLookup = async () => {
    const code = foundCode.trim();
    if (!code) {
      Alert.alert('Ingresa el código del tag');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.rpc('get_pet_public_by_tag', { p_code: code });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    if (!data || data.length === 0) {
      Alert.alert('No encontrado', 'Este tag no está registrado o no tiene una mascota vinculada.');
      return;
    }

    setFoundPet(data[0]);
    setScreen('FoundResult');
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
    setScreen('Home');
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
    setEmail('');
    setPassword('');
    setScreen('Login');
  };

  const handleCreatePet = async () => {
    const parsed = addPetSchema.safeParse({
      ...petForm,
      birth_year: petBirthDate ? petBirthDate.getFullYear() : undefined,
      photo_url: undefined
    });

    if (!parsed.success) {
      Alert.alert('Validación', parsed.error.errors[0]?.message ?? 'Datos inválidos');
      return;
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert('Error', 'Usuario no autenticado');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('pets').insert({
      ...parsed.data,
      owner_id: user.id
    });
    setLoading(false);

    if (error) {
      Alert.alert('No se pudo crear la mascota', error.message);
      return;
    }

    Alert.alert('Mascota creada');
    setPetForm({ name: '', species: 'Perro', breed: '', color: '' });
    setPetBirthDate(null);
    setShowSpeciesDropdown(false);
    setShowBirthCalendar(false);
    setCalendarMonthDate(new Date());
    await fetchPets();
    setScreen('Home');
  };

  const handleLinkTag = async () => {
    if (!selectedPet) {
      Alert.alert('Selecciona una mascota primero');
      return;
    }

    const parsed = linkTagSchema.safeParse({ code: tagCode });
    if (!parsed.success) {
      Alert.alert('Validación', parsed.error.errors[0]?.message ?? 'Código inválido');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('tags')
      .update({ pet_id: selectedPet.id, status: 'linked' })
      .eq('code', parsed.data.code)
      .is('pet_id', null);
    setLoading(false);

    if (error) {
      Alert.alert('Error vinculando tag', error.message);
      return;
    }

    Alert.alert('Tag vinculado');
    setTagCode('');
    setScreen('PetDetail');
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

  const addSymptomToForm = () => {
    const value = symptomInput.trim();
    if (!value) return;
    if (vetForm.symptoms.some((s) => s.toLowerCase() === value.toLowerCase())) {
      setSymptomInput('');
      return;
    }
    setVetForm((prev) => ({ ...prev, symptoms: [...prev.symptoms, value] }));
    setSymptomInput('');
  };

  const removeSymptomFromForm = (symptom: string) => {
    setVetForm((prev) => ({ ...prev, symptoms: prev.symptoms.filter((item) => item !== symptom) }));
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
    setSelectedVetRecord(null);
    setEditingVetRecordId(record.id);
    setShowNewVetRecord(true);
    setVetForm({
      date: record.date,
      doctor: record.doctor,
      clinic: record.clinic,
      reason: record.reason,
      symptoms: record.symptoms,
      diagnosis: record.diagnosis,
      treatment: record.treatment,
      description: record.description,
      attachments: record.attachments
    });
    setSymptomInput('');
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
      setShowNewVetRecord(false);
      setEditingVetRecordId(null);
      setSelectedVetRecord(null);
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
        symptoms: vetForm.symptoms,
        diagnosis: vetForm.diagnosis.trim() || null,
        treatment: vetForm.treatment.trim() || null,
        description: vetForm.description.trim() || null,
        attachments: vetForm.attachments.map((item) => ({ id: item.id, kind: item.kind, name: item.name, path: item.path, mimeType: item.mimeType ?? null })),
        reference_photos: ['Referencia clínica 1', 'Referencia clínica 2']
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
      setVetForm({
        date: '',
        doctor: '',
        clinic: '',
        reason: '',
        symptoms: [],
        diagnosis: '',
        treatment: '',
        description: '',
        attachments: []
      });
      setSymptomInput('');
      setShowNewVetRecord(false);
      setEditingVetRecordId(null);
      Alert.alert('Guardado ✅', editingVetRecordId ? 'Registro actualizado.' : 'Registro clínico guardado en historial.');
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
    setEditingVetRecordId(null);
    setShowNewVetRecord(false);
    setVetForm({ date: '', doctor: '', clinic: '', reason: '', symptoms: [], diagnosis: '', treatment: '', description: '', attachments: [] });
    setSymptomInput('');
  }, [screen]);

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
    const expiry = new Date(y < 100 ? 2000 + y : y, m - 1, d);
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

  // Reset vaccine form al salir de la pantalla
  useEffect(() => {
    if (screen === 'PetVaccines') return;
    setShowVaccineForm(false);
    setEditingVaccineId(null);
    setVaccineForm({ vaccine_name: '', applied_date: '', expiry_date: '', next_dose_date: '', veterinarian: '', clinic: '', batch_number: '', notes: '' });
  }, [screen]);

  const handleBack = () => {
    switch (screen) {
      case 'AddPet':        return setScreen('Home');
      case 'PetDetail':     return setScreen('Home');
      case 'PetInfo':
      case 'PetContact':
      case 'PetVetHistory':
      case 'PetVaccines':
      case 'LinkTag':       return setScreen('PetDetail');
      case 'FoundTag':      return setScreen('Login');
      case 'FoundResult':   return setScreen('FoundTag');
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
          <View style={styles.loginBrand}>
            <Text style={styles.loginEmoji}>🐾</Text>
            <Text style={styles.loginTitle}>ChipDog</Text>
            <Text style={styles.loginSubtitle}>El hogar digital de tu peludo</Text>
          </View>

          <View style={styles.loginForm}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor={C.textMuted}
              secureTextEntry
            />
            <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>{loading ? 'Ingresando...' : 'Ingresar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnGhost} onPress={() => setScreen('FoundTag')} activeOpacity={0.85}>
              <Text style={styles.btnGhostText}>🔍  Encontré una mascota</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (screen === 'FoundTag') {
      return (
        <View style={styles.foundWrap}>
          <Text style={styles.foundEmoji}>🐕</Text>
          <Text style={styles.foundTitle}>¿Encontraste a alguien?</Text>
          <Text style={styles.foundSubtitle}>Ingresa el código del tag del collar para ver su información</Text>
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder="Ej: ABC-1234"
            placeholderTextColor={C.textMuted}
            value={foundCode}
            onChangeText={setFoundCode}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.btnPrimary} onPress={handleFoundLookup} disabled={loading} activeOpacity={0.85}>
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
      return (
        <View style={styles.form}>
          {/* Header */}
          <View style={styles.homeHeader}>
            <Text style={styles.homeHeaderEyebrow}>🐾  ChipDog</Text>
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

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (screen === 'AddPet') {
      const monthDays = buildCalendarDays(calendarMonthDate);
      const monthTitle = calendarMonthDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

      return (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Nombre"
            value={petForm.name}
            onChangeText={(v) => setPetForm((p) => ({ ...p, name: v }))}
          />
          <View>
            <TouchableOpacity
              style={[styles.input, styles.selectInput]}
              onPress={() => setShowSpeciesDropdown((v) => !v)}
              activeOpacity={0.9}
            >
              <Text style={styles.selectInputText}>{petForm.species}</Text>
              <Text style={styles.selectChevron}>{showSpeciesDropdown ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {showSpeciesDropdown ? (
              <View style={styles.selectMenu}>
                {SPECIES_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.selectOption, petForm.species === option && styles.selectOptionActive]}
                    onPress={() => {
                      setPetForm((p) => ({ ...p, species: option }));
                      setShowSpeciesDropdown(false);
                    }}
                  >
                    <Text style={[styles.selectOptionText, petForm.species === option && styles.selectOptionTextActive]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Raza"
            value={petForm.breed}
            onChangeText={(v) => setPetForm((p) => ({ ...p, breed: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Color"
            value={petForm.color}
            onChangeText={(v) => setPetForm((p) => ({ ...p, color: v }))}
          />
          <View>
            <TouchableOpacity style={[styles.input, styles.selectInput]} onPress={() => setShowBirthCalendar((v) => !v)}>
              <Text style={styles.selectInputText}>{petBirthDate ? formatBirthDate(petBirthDate) : 'Fecha de nacimiento'}</Text>
              <Text style={styles.selectChevron}>{showBirthCalendar ? '▲' : '📅'}</Text>
            </TouchableOpacity>

            {showBirthCalendar ? (
              <View style={styles.calendarCard}>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity
                    style={styles.calendarArrowBtn}
                    onPress={() =>
                      setCalendarMonthDate(
                        (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
                      )
                    }
                  >
                    <Text style={styles.calendarArrowText}>‹</Text>
                  </TouchableOpacity>

                  <Text style={styles.calendarMonthTitle}>{monthTitle}</Text>

                  <TouchableOpacity
                    style={styles.calendarArrowBtn}
                    onPress={() =>
                      setCalendarMonthDate(
                        (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
                      )
                    }
                  >
                    <Text style={styles.calendarArrowText}>›</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.calendarWeekRow}>
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
                    <Text key={d} style={styles.calendarWeekDay}>
                      {d}
                    </Text>
                  ))}
                </View>

                <View style={styles.calendarGrid}>
                  {monthDays.map((day, idx) => {
                    const isSelected =
                      day != null &&
                      petBirthDate != null &&
                      petBirthDate.getFullYear() === calendarMonthDate.getFullYear() &&
                      petBirthDate.getMonth() === calendarMonthDate.getMonth() &&
                      petBirthDate.getDate() === day;

                    return (
                      <TouchableOpacity
                        key={`${day ?? 'empty'}-${idx}`}
                        disabled={day == null}
                        style={[styles.calendarDayBtn, day == null && styles.calendarDayBtnDisabled, isSelected && styles.calendarDayBtnSelected]}
                        onPress={() => {
                          if (!day) return;
                          setPetBirthDate(new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth(), day));
                          setShowBirthCalendar(false);
                        }}
                      >
                        <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected]}>{day ?? ''}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </View>

          <Button title={loading ? 'Guardando...' : 'Guardar mascota'} onPress={handleCreatePet} disabled={loading} />
          <Button title="Volver" onPress={() => setScreen('Home')} />
        </View>
      );
    }

    if (screen === 'PetDetail') {
      if (!selectedPet) {
        return (
          <View style={styles.form}>
            <Text>No hay mascota seleccionada.</Text>
            <Button title="Volver" onPress={() => setScreen('Home')} />
          </View>
        );
      }

      const statusLabel = selectedPet.is_lost ? 'Perdido' : 'En casa';
      const badgeStyle = selectedPet.is_lost ? styles.badgeDanger : styles.badgeOk;
      const badgeTextStyle = selectedPet.is_lost ? styles.badgeTextDanger : styles.badgeTextOk;

      return (
        <View style={{ gap: 16 }}>
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
                onValueChange={(v) => updatePetLostStatus(selectedPet.id, v)}
                disabled={loading}
                trackColor={{ false: C.border, true: C.danger }}
                thumbColor={C.white}
              />
            </View>
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

            <TouchableOpacity style={[styles.navGridCard, { borderTopColor: C.warning }]} onPress={() => setScreen('PetInfo')} activeOpacity={0.85}>
              <Text style={styles.navGridIcon}>ℹ️</Text>
              <Text style={styles.navGridTitle}>Información</Text>
              <Text style={styles.navGridHint}>Perfil completo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.navGridCard, { borderTopColor: C.accent }]} onPress={() => setScreen('PetContact')} activeOpacity={0.85}>
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
      return (
        <View style={styles.form}>
          {!selectedVetRecord ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.linkBtn]}
              onPress={() => {
                setSelectedVetRecord(null);
                if (showNewVetRecord) {
                  setShowNewVetRecord(false);
                  setEditingVetRecordId(null);
                } else {
                  setShowNewVetRecord(true);
                }
              }}
            >
              <Text style={styles.linkBtnText}>
                {showNewVetRecord ? (editingVetRecordId ? 'Cancelar edición' : 'Cancelar nuevo registro') : 'Nuevo Registro'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {showNewVetRecord ? (
            <Card title="Detalle Clínico">
              <Text style={styles.fieldLabel}>Fecha</Text>
              <TextInput
                style={styles.input}
                placeholder="dd/mm/yy"
                value={vetForm.date}
                onChangeText={(v) => setVetForm((p) => ({ ...p, date: v }))}
              />

              <Text style={styles.fieldLabel}>Doctor</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre del doctor"
                value={vetForm.doctor}
                onChangeText={(v) => setVetForm((p) => ({ ...p, doctor: v }))}
              />

              <Text style={styles.fieldLabel}>Clínica Veterinaria</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre de la veterinaria"
                value={vetForm.clinic}
                onChangeText={(v) => setVetForm((p) => ({ ...p, clinic: v }))}
              />

              <Text style={styles.fieldLabel}>2 fotos de referencia</Text>
              <View style={styles.referencePhotosRow}>
                <View style={styles.referencePhotoBox}><Text style={styles.referencePhotoText}>Foto referencia 1</Text></View>
                <View style={styles.referencePhotoBox}><Text style={styles.referencePhotoText}>Foto referencia 2</Text></View>
              </View>

              <Text style={styles.fieldLabel}>Motivo</Text>
              <TextInput
                style={styles.input}
                placeholder='Ej: "Control General"'
                value={vetForm.reason}
                onChangeText={(v) => setVetForm((p) => ({ ...p, reason: v }))}
              />

              <Text style={styles.fieldLabel}>Síntomas</Text>
              <View style={styles.symptomInputRow}>
                <TextInput
                  style={[styles.input, styles.symptomInput]}
                  placeholder="Ej: Vómitos"
                  value={symptomInput}
                  onChangeText={setSymptomInput}
                />
                <TouchableOpacity style={styles.smallInlineBtn} onPress={addSymptomToForm}>
                  <Text style={styles.smallInlineBtnText}>Agregar</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.symptomChipsWrap}>
                {vetForm.symptoms.map((symptom) => (
                  <TouchableOpacity key={symptom} style={styles.symptomChip} onPress={() => removeSymptomFromForm(symptom)}>
                    <Text style={styles.symptomChipText}>{symptom} ✕</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Diagnóstico</Text>
              <TextInput
                style={styles.input}
                placeholder='Ej: "Intoxicación"'
                value={vetForm.diagnosis}
                onChangeText={(v) => setVetForm((p) => ({ ...p, diagnosis: v }))}
              />

              <Text style={styles.fieldLabel}>Tratamiento</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                placeholder="Indicaciones de tratamiento"
                value={vetForm.treatment}
                onChangeText={(v) => setVetForm((p) => ({ ...p, treatment: v }))}
                multiline
              />

              <Text style={styles.fieldLabel}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                placeholder="Descripción de la situación"
                value={vetForm.description}
                onChangeText={(v) => setVetForm((p) => ({ ...p, description: v }))}
                multiline
              />

              <Text style={styles.fieldLabel}>Adjuntos</Text>
              <View style={styles.attachmentBtnsRow}>
                <TouchableOpacity style={styles.smallInlineBtn} onPress={addPhotoAttachmentToForm}>
                  <Text style={styles.smallInlineBtnText}>Adjuntar foto</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.smallInlineBtn} onPress={addPdfAttachmentToForm}>
                  <Text style={styles.smallInlineBtnText}>Adjuntar PDF</Text>
                </TouchableOpacity>
              </View>
              <View style={{ gap: 8 }}>{vetForm.attachments.map(renderEditableAttachmentChip)}</View>

              <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={saveVetRecord}>
                <Text style={styles.saveBtnText}>{editingVetRecordId ? 'Guardar registro' : 'Guardar'}</Text>
              </TouchableOpacity>
              {editingVetRecordId ? (
                <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={deleteVetRecord}>
                  <Text style={styles.deleteBtnText}>Eliminar registro</Text>
                </TouchableOpacity>
              ) : null}
            </Card>
          ) : null}

          {!showNewVetRecord && selectedVetRecord ? (
            <Card title="Detalle de visita">
              <Text style={styles.historyItemReason}>{selectedVetRecord.reason}</Text>
              <Text style={styles.historyItemDate}>
                {selectedVetRecord.date}
                {selectedVetRecord.clinic ? ` · ${selectedVetRecord.clinic}` : ''}
                {selectedVetRecord.doctor ? ` · ${selectedVetRecord.doctor}` : ''}
              </Text>
              <Text style={styles.fieldLabel}>Síntomas</Text>
              <View style={styles.symptomChipsWrap}>
                {selectedVetRecord.symptoms.length ? (
                  selectedVetRecord.symptoms.map((symptom) => (
                    <View key={symptom} style={styles.symptomChip}>
                      <Text style={styles.symptomChipText}>{symptom}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.historyEmptyText}>—</Text>
                )}
              </View>
              <Text style={styles.fieldLabel}>Diagnóstico</Text>
              <View style={styles.historyDetailBox}><Text style={styles.historyDetailText}>{selectedVetRecord.diagnosis || '—'}</Text></View>
              <Text style={styles.fieldLabel}>Tratamiento</Text>
              <View style={styles.historyDetailBox}><Text style={styles.historyDetailText}>{selectedVetRecord.treatment || '—'}</Text></View>
              <Text style={styles.fieldLabel}>Descripción</Text>
              <View style={styles.historyDetailBox}><Text style={styles.historyDetailText}>{selectedVetRecord.description || '—'}</Text></View>
              <Text style={styles.fieldLabel}>Adjuntos</Text>
              <View style={{ gap: 8 }}>
                {selectedVetRecord.attachments.length ? (
                  selectedVetRecord.attachments.map(renderAttachmentChip)
                ) : (
                  <Text style={styles.historyEmptyText}>Sin adjuntos</Text>
                )}
              </View>
              <TouchableOpacity style={[styles.actionBtn, styles.linkBtn]} onPress={() => startEditVetRecord(selectedVetRecord)}>
                <Text style={styles.linkBtnText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.backBtn]} onPress={() => setSelectedVetRecord(null)}>
                <Text style={styles.backBtnText}>Volver al listado</Text>
              </TouchableOpacity>
            </Card>
          ) : !showNewVetRecord ? (
            <View style={{ gap: 10 }}>
              {vetHistory.map((record) => (
                <TouchableOpacity key={record.id} style={styles.historyItemCard} onPress={() => setSelectedVetRecord(record)}>
                  <Text style={styles.historyItemDate}>{record.date}</Text>
                  <Text style={styles.historyItemReason}>{record.reason}</Text>
                </TouchableOpacity>
              ))}
              {!vetHistory.length ? <Text style={styles.historyEmptyText}>Aún no hay registros guardados.</Text> : null}
            </View>
          ) : null}

          <TouchableOpacity style={[styles.actionBtn, styles.backBtn]} onPress={() => setScreen('PetDetail')}>
            <Text style={styles.backBtnText}>Volver al perfil</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (screen === 'PetVaccines') {
      return (
        <View style={styles.form}>
          {/* Formulario nueva / editar vacuna */}
          {showVaccineForm ? (
            <Card title={editingVaccineId ? 'Editar vacuna' : 'Nueva vacuna'}>
              <TextInput
                style={styles.input}
                placeholder="Nombre de la vacuna *"
                value={vaccineForm.vaccine_name}
                onChangeText={(v) => setVaccineForm((p) => ({ ...p, vaccine_name: v }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Fecha aplicación (dd/mm/aaaa) *"
                value={vaccineForm.applied_date}
                onChangeText={(v) => setVaccineForm((p) => ({ ...p, applied_date: v }))}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Fecha vencimiento (dd/mm/aaaa)"
                value={vaccineForm.expiry_date}
                onChangeText={(v) => setVaccineForm((p) => ({ ...p, expiry_date: v }))}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Próxima dosis (dd/mm/aaaa)"
                value={vaccineForm.next_dose_date}
                onChangeText={(v) => setVaccineForm((p) => ({ ...p, next_dose_date: v }))}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Veterinario"
                value={vaccineForm.veterinarian}
                onChangeText={(v) => setVaccineForm((p) => ({ ...p, veterinarian: v }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Clínica"
                value={vaccineForm.clinic}
                onChangeText={(v) => setVaccineForm((p) => ({ ...p, clinic: v }))}
              />
              <TextInput
                style={styles.input}
                placeholder="N° Lote"
                value={vaccineForm.batch_number}
                onChangeText={(v) => setVaccineForm((p) => ({ ...p, batch_number: v }))}
              />
              <TextInput
                style={[styles.input, { minHeight: 60 }]}
                placeholder="Notas"
                value={vaccineForm.notes}
                onChangeText={(v) => setVaccineForm((p) => ({ ...p, notes: v }))}
                multiline
              />
              <TouchableOpacity
                style={[styles.actionBtn, styles.linkBtn]}
                onPress={saveVaccine}
                disabled={loading}
              >
                <Text style={styles.linkBtnText}>{loading ? 'Guardando...' : 'Guardar vacuna'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.backBtn]} onPress={resetVaccineForm}>
                <Text style={styles.backBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.linkBtn]}
                onPress={() => { setShowVaccineForm(true); setEditingVaccineId(null); }}
              >
                <Text style={styles.linkBtnText}>+ Registrar vacuna</Text>
              </TouchableOpacity>

              {vaccines.length === 0 ? (
                <Card>
                  <Text style={{ color: '#94a3b8', textAlign: 'center' }}>
                    Aún no hay vacunas registradas
                  </Text>
                </Card>
              ) : (
                vaccines.map((v) => {
                  const status = vaccineStatus(v);
                  return (
                    <Card key={v.id}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontWeight: '700', fontSize: 15, color: '#0f172a', flex: 1 }}>
                          {v.vaccine_name}
                        </Text>
                        <View style={{ backgroundColor: status.color, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>{status.label}</Text>
                        </View>
                      </View>
                      <InfoRow label="Aplicada" value={v.applied_date} />
                      {v.expiry_date ? <InfoRow label="Vence" value={v.expiry_date} /> : null}
                      {v.next_dose_date ? <InfoRow label="Próxima dosis" value={v.next_dose_date} /> : null}
                      {v.veterinarian ? <InfoRow label="Veterinario" value={v.veterinarian} /> : null}
                      {v.clinic ? <InfoRow label="Clínica" value={v.clinic} /> : null}
                      {v.batch_number ? <InfoRow label="N° Lote" value={v.batch_number} /> : null}
                      {v.notes ? <InfoRow label="Notas" value={v.notes} /> : null}
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.linkBtn, { flex: 1, marginTop: 0 }]}
                          onPress={() => startEditVaccine(v)}
                        >
                          <Text style={styles.linkBtnText}>Editar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, { flex: 1, marginTop: 0, backgroundColor: '#fee2e2', borderRadius: 10 }]}
                          onPress={() => deleteVaccine(v.id)}
                        >
                          <Text style={{ color: '#dc2626', fontWeight: '600', textAlign: 'center' }}>Eliminar</Text>
                        </TouchableOpacity>
                      </View>
                    </Card>
                  );
                })
              )}

              <TouchableOpacity style={[styles.actionBtn, styles.backBtn]} onPress={() => setScreen('PetDetail')}>
                <Text style={styles.backBtnText}>Volver al perfil</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      );
    }

    if (screen === 'PetInfo') {
      if (!selectedPet) return null;

      const birthDateValue = petDraft.birth_date_text.trim()
        ? petDraft.birth_date_text
        : selectedPet.birth_date_text ?? null;

      return (
        <View style={styles.form}>
          <Card>
            <View style={styles.labeledInlineRow}>
              <View style={styles.leftTitleBox}>
                <Text style={styles.leftTitleText}>Descripción</Text>
              </View>
              <TextInput
                style={[styles.input, styles.inlineValueInput]}
                placeholder='Ej: "Café con machas blancas"'
                value={petDraft.color}
                onChangeText={(v) => setPetDraft((p) => ({ ...p, color: v }))}
              />
            </View>

            <View style={styles.labeledInlineRow}>
              <View style={styles.leftTitleBox}>
                <Text style={styles.leftTitleText}>Fecha de nacimiento</Text>
              </View>
              <TextInput
                style={[styles.input, styles.inlineValueInput]}
                placeholder={birthDateValue ?? 'dd/mm/yy'}
                value={petDraft.birth_date_text}
                keyboardType="number-pad"
                maxLength={8}
                onChangeText={(v) => {
                  const digits = v.replace(/\D/g, '').slice(0, 6);
                  const part1 = digits.slice(0, 2);
                  const part2 = digits.slice(2, 4);
                  const part3 = digits.slice(4, 6);
                  const next = [part1, part2, part3].filter(Boolean).join('/');
                  setPetDraft((p) => ({ ...p, birth_date_text: next }));
                }}
              />
            </View>

            <TouchableOpacity
              style={styles.calendarInlineBtn}
              onPress={() => setShowProfileBirthCalendar((v) => !v)}
              activeOpacity={0.8}
            >
              <Text style={styles.calendarInlineBtnText}>{showProfileBirthCalendar ? 'Cerrar calendario' : 'Abrir calendario'}</Text>
            </TouchableOpacity>

            {showProfileBirthCalendar ? (
              <View style={styles.calendarCard}>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity
                    style={styles.calendarArrowBtn}
                    onPress={() =>
                      setProfileBirthCalendarMonth(
                        (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                      )
                    }
                  >
                    <Text style={styles.calendarArrowText}>‹</Text>
                  </TouchableOpacity>
                  <Text style={styles.calendarMonthTitle}>
                    {profileBirthCalendarMonth.toLocaleDateString('es-CL', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </Text>
                  <TouchableOpacity
                    style={styles.calendarArrowBtn}
                    onPress={() =>
                      setProfileBirthCalendarMonth(
                        (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                      )
                    }
                  >
                    <Text style={styles.calendarArrowText}>›</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.calendarWeekRow}>
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
                    <Text key={day} style={styles.calendarWeekDay}>
                      {day}
                    </Text>
                  ))}
                </View>

                <View style={styles.calendarGrid}>
                  {buildCalendarDays(profileBirthCalendarMonth).map((day, idx) => {
                    if (!day) {
                      return <View key={`profile-empty-${idx}`} style={[styles.calendarDayBtn, styles.calendarDayBtnDisabled]} />;
                    }

                    const selectedDate = parseBirthDateText(petDraft.birth_date_text);
                    const isSelected =
                      selectedDate != null &&
                      selectedDate.getFullYear() === profileBirthCalendarMonth.getFullYear() &&
                      selectedDate.getMonth() === profileBirthCalendarMonth.getMonth() &&
                      selectedDate.getDate() === day;

                    return (
                      <TouchableOpacity
                        key={`profile-day-${idx}`}
                        style={[styles.calendarDayBtn, isSelected && styles.calendarDayBtnSelected]}
                        onPress={() => {
                          const chosen = new Date(
                            profileBirthCalendarMonth.getFullYear(),
                            profileBirthCalendarMonth.getMonth(),
                            day
                          );
                          setPetDraft((p) => ({ ...p, birth_date_text: formatBirthDateShort(chosen) }));
                          setProfileBirthCalendarMonth(chosen);
                        }}
                      >
                        <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected]}>{day}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <Text style={styles.sectionBlockTitle}>Alergias</Text>
            <TextInput
              style={[styles.input, styles.multiline, styles.largeBlockInput]}
              placeholder="Alergias"
              value={petDraft.allergies}
              onChangeText={(v) => setPetDraft((p) => ({ ...p, allergies: v }))}
              multiline
            />

            <Text style={styles.sectionBlockTitle}>Medicamentos</Text>
            <TextInput
              style={[styles.input, styles.multiline, styles.largeBlockInput]}
              placeholder="Medicamentos"
              value={petDraft.medications}
              onChangeText={(v) => setPetDraft((p) => ({ ...p, medications: v }))}
              multiline
            />

            <Text style={styles.sectionBlockTitle}>Condiciones</Text>
            <TextInput
              style={[styles.input, styles.multiline, styles.largeBlockInput]}
              placeholder="Condiciones"
              value={petDraft.conditions}
              onChangeText={(v) => setPetDraft((p) => ({ ...p, conditions: v }))}
              multiline
            />

            <Text style={styles.sectionBlockTitle}>Veterinario</Text>
            <TextInput
              style={[styles.input, styles.largeBlockInput]}
              placeholder="Veterinario"
              value={petDraft.vet_name}
              onChangeText={(v) => setPetDraft((p) => ({ ...p, vet_name: v }))}
            />

            <Text style={styles.sectionBlockTitle}>Otros</Text>
            <TextInput
              style={[styles.input, styles.multiline, styles.largeBlockInput]}
              placeholder="Otros"
              value={petDraft.public_notes}
              onChangeText={(v) => setPetDraft((p) => ({ ...p, public_notes: v }))}
              multiline
            />
          </Card>

          <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={savePetProfile} disabled={loading}>
            <Text style={styles.saveBtnText}>{loading ? 'Guardando...' : 'Guardar información'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.backBtn]} onPress={() => setScreen('PetDetail')}>
            <Text style={styles.backBtnText}>Volver al perfil</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (screen === 'PetContact') {
      return (
        <View style={styles.form}>
          <Card title="Contacto (editable)">
            <Text style={styles.importantNote}>
              Importante: esta información será visible para personas externas que escaneen el tag de la mascota.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Contacto 1 (nombre)"
              value={petDraft.contact_primary_name}
              onChangeText={(v) => setPetDraft((p) => ({ ...p, contact_primary_name: v }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Teléfono contacto 1"
              value={petDraft.owner_phone}
              onChangeText={(v) => setPetDraft((p) => ({ ...p, owner_phone: v }))}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Contacto 2 (nombre)"
              value={petDraft.contact_secondary_name}
              onChangeText={(v) => setPetDraft((p) => ({ ...p, contact_secondary_name: v }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Teléfono contacto 2"
              value={petDraft.contact_secondary_phone}
              onChangeText={(v) => setPetDraft((p) => ({ ...p, contact_secondary_phone: v }))}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Contacto veterinario"
              value={petDraft.vet_name}
              onChangeText={(v) => setPetDraft((p) => ({ ...p, vet_name: v }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Teléfono veterinario"
              value={petDraft.vet_phone}
              onChangeText={(v) => setPetDraft((p) => ({ ...p, vet_phone: v }))}
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder='Notas adicionales (ej: "No se deja tocar, es tímido")'
              value={petDraft.public_notes}
              onChangeText={(v) => setPetDraft((p) => ({ ...p, public_notes: v }))}
              multiline
            />
          </Card>

          <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={savePetProfile} disabled={loading}>
            <Text style={styles.saveBtnText}>{loading ? 'Guardando...' : 'Guardar contacto'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.backBtn]} onPress={() => setScreen('PetDetail')}>
            <Text style={styles.backBtnText}>Volver al perfil</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Código tag"
          value={tagCode}
          onChangeText={setTagCode}
          autoCapitalize="characters"
        />
        <Button title={loading ? 'Vinculando...' : 'Confirmar vínculo'} onPress={handleLinkTag} disabled={loading} />
        <Button title="Cancelar" onPress={() => setScreen('PetDetail')} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 6 : 0}
      >
        {screen !== 'Home' && screen !== 'PetDetail' && screen !== 'Login' && screen !== 'FoundTag' && screen !== 'FoundResult' ? (
          <Text style={styles.title}>{title}</Text>
        ) : null}
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
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
  );
}

const styles = StyleSheet.create({

  // ─── Layout ────────────────────────────────────────────────────────────────
  container: { flex: 1, backgroundColor: C.bg },
  scroll:    { padding: 16, paddingBottom: 36 },
  title:     { fontSize: 22, fontWeight: '800', color: C.dark, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
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

  // ─── Login ─────────────────────────────────────────────────────────────────
  loginWrap: { flex: 1, justifyContent: 'center', gap: 32, paddingTop: 16 },
  loginBrand: { alignItems: 'center', gap: 6 },
  loginEmoji: { fontSize: 56 },
  loginTitle: { fontSize: 36, fontWeight: '900', color: C.dark, letterSpacing: -1 },
  loginSubtitle: { fontSize: 15, color: C.textLight, fontWeight: '500' },
  loginForm: { gap: 12 },

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
  historyItemCard:   { backgroundColor: C.white, borderRadius: 16, padding: 14, shadowColor: C.primary, shadowOpacity: 0.05, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 2 },
  historyItemDate:   { color: C.textLight, fontWeight: '600', fontSize: 12 },
  historyItemReason: { color: C.dark, fontWeight: '800', fontSize: 16, marginTop: 3 },
  historyDetailBox:  { borderRadius: 12, backgroundColor: C.surface, padding: 12 },
  historyDetailText: { color: C.dark, fontWeight: '700', fontSize: 14 },
  historyEmptyText:  { color: C.textLight, fontWeight: '600', textAlign: 'center' },

  // ─── Misc ──────────────────────────────────────────────────────────────────
  listCard:    { backgroundColor: C.white, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: C.primary, shadowOpacity: 0.06, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 2 },
  cardTitle:   { fontSize: 17, fontWeight: '800', color: C.dark },
  cardSubtitle:{ color: C.textLight, fontSize: 14, marginTop: 2, fontWeight: '500' },
  importantNote: { color: '#92400E', fontWeight: '700', fontSize: 13 },
  detailName:  { fontSize: 24, fontWeight: '800', color: C.dark },
});
