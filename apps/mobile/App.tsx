import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  SafeAreaView,
  ScrollView,
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
import { Buffer } from 'buffer';

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

const normalizeStringOrNull = (v: string) => {
  const t = (v ?? '').trim();
  return t.length ? t : null;
};

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

type CardProps = { title?: string; children: any };
const Card = ({ title, children }: CardProps) => (
  <View style={styles.card}>
    {title ? <Text style={styles.cardHeader}>{title}</Text> : null}
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
  const [foundPet, setFoundPet] = useState<any | null>(null);

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

  const [vetHistory, setVetHistory] = useState<VetRecord[]>([]);
  const [showNewVetRecord, setShowNewVetRecord] = useState(false);
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
      Alert.alert('No encontrado', 'Este tag no está vinculado o la mascota no está marcada como perdida.');
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

    setVetForm((prev) => ({
      ...prev,
      attachments: [...prev.attachments, { id: `${Date.now()}-photo`, kind: 'photo', name }]
    }));
  };

  const addPdfAttachmentToForm = () => {
    const defaultName = `orden-medica-${Date.now()}.pdf`;
    setVetForm((prev) => ({
      ...prev,
      attachments: [...prev.attachments, { id: `${Date.now()}-pdf`, kind: 'pdf', name: defaultName }]
    }));
  };

  const saveVetRecord = () => {
    const date = vetForm.date.trim();
    const reason = vetForm.reason.trim();

    if (!date || !reason) {
      Alert.alert('Validación', 'Completa al menos Fecha y Motivo para guardar el registro.');
      return;
    }

    const newRecord: VetRecord = {
      id: `${Date.now()}`,
      date,
      doctor: vetForm.doctor.trim(),
      clinic: vetForm.clinic.trim(),
      reason,
      symptoms: vetForm.symptoms,
      diagnosis: vetForm.diagnosis.trim(),
      treatment: vetForm.treatment.trim(),
      description: vetForm.description.trim(),
      attachments: vetForm.attachments,
      referencePhotos: ['Referencia clínica 1', 'Referencia clínica 2']
    };

    setVetHistory((prev) => [newRecord, ...prev]);
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
    Alert.alert('Guardado ✅', 'Registro clínico guardado en historial.');
  };

  const renderAttachmentChip = (item: VetAttachment) => (
    <View key={item.id} style={styles.attachmentChip}>
      <Text style={styles.attachmentChipText}>{item.kind === 'photo' ? '📷' : '📄'} {item.name}</Text>
    </View>
  );

  const renderScreen = () => {
    if (screen === 'Login') {
      return (
        <View style={styles.form}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            placeholder="Contraseña"
            secureTextEntry
          />
          <Button title={loading ? 'Ingresando...' : 'Ingresar'} onPress={handleLogin} disabled={loading} />
          <Button title="Encontré una mascota (escaneo tag)" onPress={() => setScreen('FoundTag')} />
        </View>
      );
    }

    if (screen === 'FoundTag') {
      return (
        <View style={styles.form}>
          <Text style={{ fontWeight: '600' }}>Ingresa el código del tag</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 1234"
            value={foundCode}
            onChangeText={setFoundCode}
            autoCapitalize="characters"
          />
          <Button title={loading ? 'Buscando...' : 'Buscar'} onPress={handleFoundLookup} disabled={loading} />
          <Button title="Volver" onPress={() => setScreen('Login')} />
        </View>
      );
    }

    if (screen === 'FoundResult') {
      return (
        <View style={styles.form}>
          {foundPet ? (
            <>
              <Text style={styles.detailName}>{foundPet.public_name}</Text>
              <Text>Especie: {foundPet.species}</Text>
              <Text>Raza: {foundPet.breed ?? 'N/D'}</Text>
              <Text>Color: {foundPet.color ?? 'N/D'}</Text>

              {foundPet.public_notes ? <Text>Info: {foundPet.public_notes}</Text> : null}
              {foundPet.contact_phone ? <Text>Tel: {foundPet.contact_phone}</Text> : null}
              {foundPet.contact_whatsapp ? <Text>WhatsApp: {foundPet.contact_whatsapp}</Text> : null}
            </>
          ) : (
            <Text>No hay datos.</Text>
          )}

          <Button title="Buscar otro tag" onPress={() => setScreen('FoundTag')} />
          <Button title="Volver" onPress={() => setScreen('Login')} />
        </View>
      );
    }

    if (screen === 'Home') {
      return (
        <View style={styles.form}>
          <View style={styles.homeHeader}>
            <Text style={styles.homeHeaderEyebrow}>Donde Está Mi Mascota</Text>
            <Text style={styles.homeHeaderTitle}>Mis mascotas</Text>
            <Text style={styles.homeHeaderSubtitle}>Gestiona sus perfiles y revisa su estado en segundos.</Text>
          </View>

          <TouchableOpacity style={styles.addPetCta} onPress={() => setScreen('AddPet')}>
            <Text style={styles.addPetCtaText}>+ Agregar Mascota</Text>
          </TouchableOpacity>
          
          {pets.map((pet) => (
            <TouchableOpacity
              key={pet.id}
              onPress={async () => {
                await loadPetDetail(pet.id);
                setScreen('PetDetail');
              }}
              style={styles.listCard}
            >
              <View style={styles.homePetImageWrap}>
                {petSignedUrls[pet.id] ? (
                  <Image source={{ uri: petSignedUrls[pet.id] ?? undefined }} style={styles.homePetImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.homePetImage, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarInitials}>{initialsFromName(pet.name)}</Text>
                  </View>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{pet.name}</Text>
                <Text style={styles.cardSubtitle}>
                  {pet.species}
                  {pet.breed ? ` · ${pet.breed}` : ''}
                </Text>
              </View>

              <View style={[styles.badge, pet.is_lost ? styles.badgeDanger : styles.badgeOk]}>
                <Text style={[styles.badgeText, pet.is_lost ? styles.badgeTextDanger : styles.badgeTextOk]}>
                  {pet.is_lost ? 'Perdido' : 'En casa'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          <View style={styles.logoutWrap}>
            <Button title="Cerrar sesión" onPress={handleLogout} />
          </View>
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
        <View style={{ gap: 14 }}>
          <View style={styles.profileHeaderCompact}>
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={() => pickAndUploadPetPhoto(selectedPet.id)}
              disabled={loading}
              activeOpacity={0.85}
            >
              {petPhotoSignedUrl ? (
                <Image source={{ uri: petPhotoSignedUrl }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitials}>{initialsFromName(selectedPet.name)}</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.profileName}>{selectedPet.name}</Text>
              <Text style={styles.profileSub}>
                {selectedPet.species}
                {selectedPet.breed ? ` · ${selectedPet.breed}` : ''}
              </Text>
              <Text style={styles.changePhotoHint}>{loading ? 'Subiendo...' : 'Toca para cambiar foto'}</Text>
              <View style={[styles.badge, badgeStyle, { alignSelf: 'flex-start' }]}>
                <Text style={[styles.badgeText, badgeTextStyle]}>{statusLabel}</Text>
              </View>
            </View>
          </View>

          <Card title="Estado">
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Activar si se pierde</Text>
              <Switch
                value={selectedPet.is_lost}
                onValueChange={(v) => updatePetLostStatus(selectedPet.id, v)}
                disabled={loading}
              />
            </View>
          </Card>

          <TouchableOpacity style={styles.navCard} onPress={() => setScreen('PetVetHistory')}>
            <Text style={styles.navCardTitle}>Historial Veterinario</Text>
            <Text style={styles.navCardHint}>Abrir historial clínico y controles</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navCard} onPress={() => setScreen('PetVaccines')}>
            <Text style={styles.navCardTitle}>Vacunas</Text>
            <Text style={styles.navCardHint}>Abrir cartilla y próximas dosis</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navCard} onPress={() => setScreen('PetInfo')}>
            <Text style={styles.navCardTitle}>Información</Text>
            <Text style={styles.navCardHint}>Color, nacimiento, sexo, peso y salud</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navCard} onPress={() => setScreen('PetContact')}>
            <Text style={styles.navCardTitle}>Contacto</Text>
            <Text style={styles.navCardHint}>Visible para quien escanea la mascota</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.linkBtn]} onPress={() => setScreen('LinkTag')}>
            <Text style={styles.linkBtnText}>Vincular tag</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.backBtn]} onPress={() => setScreen('Home')}>
            <Text style={styles.backBtnText}>Volver</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (screen === 'PetVetHistory') {
      return (
        <View style={styles.form}>
          <TouchableOpacity style={[styles.actionBtn, styles.linkBtn]} onPress={() => setShowNewVetRecord((v) => !v)}>
            <Text style={styles.linkBtnText}>{showNewVetRecord ? 'Cancelar nuevo registro' : 'Nuevo Registro'}</Text>
          </TouchableOpacity>

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
              <View style={{ gap: 8 }}>{vetForm.attachments.map(renderAttachmentChip)}</View>

              <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={saveVetRecord}>
                <Text style={styles.saveBtnText}>Guardar</Text>
              </TouchableOpacity>
            </Card>
          ) : null}

          <View style={{ gap: 10 }}>
            {vetHistory.map((record) => (
              <View key={record.id} style={styles.historyItemCard}>
                <Text style={styles.historyItemDate}>{record.date}</Text>
                <Text style={styles.historyItemReason}>{record.reason}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={[styles.actionBtn, styles.backBtn]} onPress={() => setScreen('PetDetail')}>
            <Text style={styles.backBtnText}>Volver al perfil</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (screen === 'PetVaccines') {
      return (
        <View style={styles.form}>
          <Card title="Vacunas">
            <Text style={{ color: '#334155' }}>
              Aquí verás y gestionarás las vacunas aplicadas, próximas dosis y recordatorios.
            </Text>
          </Card>
          <TouchableOpacity style={[styles.actionBtn, styles.backBtn]} onPress={() => setScreen('PetDetail')}>
            <Text style={styles.backBtnText}>Volver al perfil</Text>
          </TouchableOpacity>
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
      {screen !== 'Home' && screen !== 'PetDetail' ? <Text style={styles.title}>{title}</Text> : null}
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {renderScreen()}
      </ScrollView>
      {loading && <ActivityIndicator style={styles.loader} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 16, paddingBottom: 28 },
  title: { fontSize: 24, fontWeight: '700', paddingHorizontal: 16, paddingTop: 16 },

  form: { gap: 12 },

  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
    color: '#0f172a'
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },

  loader: { marginBottom: 24 },

  listCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 124
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  cardSubtitle: { color: '#475569', fontSize: 15, marginTop: 2 },

  homeHeader: {
    borderRadius: 18,
    padding: 18,
    backgroundColor: '#0f172a',
    marginBottom: 4
  },
  homeHeaderEyebrow: { color: '#93c5fd', fontWeight: '700', marginBottom: 6 },
  homeHeaderTitle: { color: '#fff', fontSize: 28, fontWeight: '800' },
  homeHeaderSubtitle: { color: '#cbd5e1', marginTop: 6, fontSize: 14 },
  addPetCta: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 10,
    elevation: 2
  },
  addPetCtaText: { color: '#fff', fontWeight: '900', fontSize: 17 },

  selectInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectInputText: { color: '#0f172a', fontWeight: '600' },
  selectChevron: { color: '#475569', fontWeight: '800' },
  selectMenu: {
    marginTop: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    overflow: 'hidden'
  },
  selectOption: { paddingVertical: 12, paddingHorizontal: 12 },
  selectOptionActive: { backgroundColor: '#eff6ff' },
  selectOptionText: { color: '#0f172a', fontWeight: '600' },
  selectOptionTextActive: { color: '#1d4ed8' },

  calendarCard: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    padding: 10
  },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  calendarArrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9'
  },
  calendarArrowText: { fontSize: 18, color: '#0f172a', fontWeight: '700' },
  calendarMonthTitle: { color: '#0f172a', fontWeight: '800', textTransform: 'capitalize' },
  calendarWeekRow: { flexDirection: 'row', marginBottom: 6 },
  calendarWeekDay: { flex: 1, textAlign: 'center', color: '#64748b', fontWeight: '700' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 },
  calendarDayBtn: {
    width: '14.285%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8
  },
  calendarDayBtnDisabled: { opacity: 0 },
  calendarDayBtnSelected: { backgroundColor: '#2563eb' },
  calendarDayText: { color: '#0f172a', fontWeight: '600' },
  calendarDayTextSelected: { color: '#fff', fontWeight: '800' },

  homePetImageWrap: {
    width: 90,
    height: 90,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0'
  },
  homePetImage: {
    width: 90,
    height: 90,
    borderRadius: 18
  },
  logoutWrap: { marginTop: 8, marginBottom: 14 },

  profileHeader: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center'
  },
  profileHeaderCompact: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  avatarWrap: {
    width: 92,
    height: 92,
    borderRadius: 18,
    overflow: 'hidden'
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 18
  },
  avatarPlaceholder: {
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarInitials: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: 1 },
  profileName: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  profileSub: { color: '#475569', fontSize: 14, fontWeight: '600' },
  changePhotoHint: { color: '#2563eb', fontSize: 13, fontWeight: '700' },


  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14
  },
  cardHeader: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 10 },

  fieldLabel: { color: '#334155', fontWeight: '700', marginBottom: 4 },

  labeledInlineRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  leftTitleBox: {
    width: 130,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    paddingHorizontal: 10
  },
  leftTitleText: { color: '#334155', fontWeight: '800', fontSize: 13 },
  inlineValueInput: { flex: 1, marginBottom: 0 },
  sectionBlockTitle: { color: '#334155', fontWeight: '800', marginTop: 2 },
  largeBlockInput: { minHeight: 96 },

  calendarInlineBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff'
  },
  calendarInlineBtnText: { color: '#0f172a', fontWeight: '700' },

  referencePhotosRow: { flexDirection: 'row', gap: 10 },
  referencePhotoBox: {
    flex: 1,
    minHeight: 84,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc'
  },
  referencePhotoText: { color: '#64748b', fontWeight: '700' },

  symptomInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  symptomInput: { flex: 1 },
  symptomChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  symptomChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#e2e8f0'
  },
  symptomChipText: { color: '#0f172a', fontWeight: '700' },

  attachmentBtnsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  smallInlineBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff'
  },
  smallInlineBtnText: { color: '#0f172a', fontWeight: '800' },
  attachmentChip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f8fafc'
  },
  attachmentChipText: { color: '#334155', fontWeight: '700' },

  historyItemCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12
  },
  historyItemDate: { color: '#64748b', fontWeight: '700' },
  historyItemReason: { color: '#0f172a', fontWeight: '800', fontSize: 16, marginTop: 2 },

  navCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 4
  },
  navCardTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  navCardHint: { color: '#64748b', fontWeight: '600' },

  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  rowLabel: { color: '#64748b', fontWeight: '700' },
  rowValue: { color: '#0f172a', fontWeight: '700', flexShrink: 1, textAlign: 'right' },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchLabel: { color: '#334155', fontWeight: '700' },


  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: '900' },
  badgeOk: { backgroundColor: '#ecfeff', borderColor: '#06b6d4' },
  badgeDanger: { backgroundColor: '#fff1f2', borderColor: '#fb7185' },
  badgeTextOk: { color: '#0e7490' },
  badgeTextDanger: { color: '#be123c' },

  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionBtnPrimary: { backgroundColor: '#0f172a' },
  actionBtnPrimaryText: { color: '#fff', fontWeight: '900' },
  actionBtnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1' },
  actionBtnGhostText: { color: '#0f172a', fontWeight: '900' },

  saveBtn: { backgroundColor: '#16a34a' },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },

  linkBtn: { backgroundColor: '#2563eb' },
  linkBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },

  backBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  backBtnText: { color: '#0f172a', fontWeight: '900' },

  importantNote: { color: '#b45309', fontWeight: '700' },

  detailName: { fontSize: 22, fontWeight: '700' }
});
