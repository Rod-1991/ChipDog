import { useEffect, useMemo, useRef, useState } from 'react';
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

type Screen = 'Login' | 'Home' | 'AddPet' | 'PetDetail' | 'LinkTag' | 'FoundTag' | 'FoundResult';

type Pet = {
  id: number;
  name: string;
  species: string;
  breed: string | null;
  is_lost: boolean;
  photo_url?: string | null;

  color?: string | null;
  birth_year?: number | null;
  sex?: string | null;
  weight_kg?: number | null;

  owner_phone?: string | null;
  owner_whatsapp?: string | null;
  public_notes?: string | null;

  allergies?: string | null;
  medications?: string | null;
  conditions?: string | null;

  vet_name?: string | null;
  vet_phone?: string | null;
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

type CardProps = { title: string; children: any };
const Card = ({ title, children }: CardProps) => (
  <View style={styles.card}>
    <Text style={styles.cardHeader}>{title}</Text>
    <View style={{ gap: 10 }}>{children}</View>
  </View>
);

const SPECIES_OPTIONS = ['Perro', 'Gato'] as const;

const formatBirthDate = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
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

export default function App() {
  const [screen, setScreen] = useState<Screen>('Login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [pets, setPets] = useState<Pet[]>([]);
  const [petSignedUrls, setPetSignedUrls] = useState<Record<number, string | null>>({});
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);

  const [petPhotoSignedUrl, setPetPhotoSignedUrl] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [petDraft, setPetDraft] = useState({
    color: '',
    birth_year: '',
    sex: '',
    weight_kg: '',
    owner_phone: '',
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

  const [qrTagCode, setQrTagCode] = useState('');
  const [nfcTagCode, setNfcTagCode] = useState('');
  const [scanHint, setScanHint] = useState<string | null>(null);

  const qrScannerInputRef = useRef<TextInput | null>(null);
  const nfcScannerInputRef = useRef<TextInput | null>(null);

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
          'id,name,species,breed,is_lost,photo_url,color,birth_year,sex,weight_kg,owner_phone,owner_whatsapp,public_notes,allergies,medications,conditions,vet_name,vet_phone'
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
      setIsEditing(false);

      setPetDraft({
        color: pet.color ?? '',
        birth_year: pet.birth_year ? String(pet.birth_year) : '',
        sex: pet.sex ?? '',
        weight_kg: pet.weight_kg != null ? String(pet.weight_kg) : '',
        owner_phone: pet.owner_phone ?? '',
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

    const payload: Partial<Pet> = {
      color: normalizeStringOrNull(petDraft.color),
      birth_year: birthYear,
      sex: normalizeStringOrNull(petDraft.sex),
      weight_kg: weight,

      owner_phone: normalizeStringOrNull(petDraft.owner_phone),
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
          'id,name,species,breed,is_lost,photo_url,color,birth_year,sex,weight_kg,owner_phone,owner_whatsapp,public_notes,allergies,medications,conditions,vet_name,vet_phone'
        )
        .single();

      if (error) {
        Alert.alert('Error guardando', error.message);
        return;
      }

      setSelectedPet(data as Pet);
      setIsEditing(false);
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
        setIsEditing(false);
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
    setIsEditing(false);
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

  const handleLinkTag = async (code: string, sourceLabel: 'QR' | 'NFC') => {
    if (!selectedPet) {
      Alert.alert('Selecciona una mascota primero');
      return;
    }

    const parsed = linkTagSchema.safeParse({ code });
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

    Alert.alert('Tag vinculado', `La placa quedó asociada vía lector ${sourceLabel}.`);

    if (sourceLabel === 'QR') {
      setQrTagCode('');
    } else {
      setNfcTagCode('');
    }

    setScanHint(null);
    setScreen('PetDetail');
  };

  const startScannerCapture = (sourceLabel: 'QR' | 'NFC') => {
    setScanHint(`Esperando lectura del lector ${sourceLabel}...`);

    if (sourceLabel === 'QR') {
      setQrTagCode('');
      qrScannerInputRef.current?.focus();
      return;
    }

    setNfcTagCode('');
    nfcScannerInputRef.current?.focus();
  };

  const registerScannedCode = (sourceLabel: 'QR' | 'NFC') => {
    const scannedCode = sourceLabel === 'QR' ? qrTagCode : nfcTagCode;
    void handleLinkTag(scannedCode, sourceLabel);
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
          <View style={styles.profileHeader}>
            <View style={styles.avatarWrap}>
              {petPhotoSignedUrl ? (
                <Image source={{ uri: petPhotoSignedUrl }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitials}>{initialsFromName(selectedPet.name)}</Text>
                </View>
              )}
            </View>

            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.profileName}>{selectedPet.name}</Text>
              <Text style={styles.profileSub}>
                {selectedPet.species}
                {selectedPet.breed ? ` · ${selectedPet.breed}` : ''}
              </Text>
              <View style={[styles.badge, badgeStyle, { alignSelf: 'flex-start' }]}>
                <Text style={[styles.badgeText, badgeTextStyle]}>{statusLabel}</Text>
              </View>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={() => pickAndUploadPetPhoto(selectedPet.id)}
              disabled={loading}
            >
              <Text style={styles.actionBtnPrimaryText}>{loading ? 'Subiendo...' : 'Cambiar foto'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGhost]} onPress={() => setIsEditing((v) => !v)}>
              <Text style={styles.actionBtnGhostText}>{isEditing ? 'Cancelar' : 'Editar'}</Text>
            </TouchableOpacity>
          </View>

          <Card title="Estado">
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600' }}>{selectedPet.is_lost ? 'Marcado como perdido' : 'En casa'}</Text>
                <Text style={{ color: '#64748b', marginTop: 2 }}>
                  {selectedPet.is_lost
                    ? 'Alguien que escanee el tag verá el contacto.'
                    : 'Si se pierde, actívalo para que te contacten.'}
                </Text>
              </View>
              <Switch
                value={selectedPet.is_lost}
                onValueChange={(v) => updatePetLostStatus(selectedPet.id, v)}
                disabled={loading}
              />
            </View>
          </Card>

          <Card title="Información">
            {isEditing ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Color (ej: Negro con blanco)"
                  value={petDraft.color}
                  onChangeText={(v) => setPetDraft((p) => ({ ...p, color: v }))}
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Año nac."
                    keyboardType="number-pad"
                    value={petDraft.birth_year}
                    onChangeText={(v) => setPetDraft((p) => ({ ...p, birth_year: v }))}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Sexo (M/H)"
                    value={petDraft.sex}
                    onChangeText={(v) => setPetDraft((p) => ({ ...p, sex: v }))}
                  />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Peso (kg)"
                  keyboardType="decimal-pad"
                  value={petDraft.weight_kg}
                  onChangeText={(v) => setPetDraft((p) => ({ ...p, weight_kg: v }))}
                />
              </>
            ) : (
              <>
                <InfoRow label="Color" value={selectedPet.color ?? null} />
                <InfoRow label="Año nac." value={selectedPet.birth_year ? String(selectedPet.birth_year) : null} />
                <InfoRow label="Sexo" value={selectedPet.sex ?? null} />
                <InfoRow label="Peso" value={selectedPet.weight_kg != null ? `${selectedPet.weight_kg} kg` : null} />
              </>
            )}
          </Card>

          <Card title="Salud">
            {isEditing ? (
              <>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  placeholder="Alergias (opcional)"
                  value={petDraft.allergies}
                  onChangeText={(v) => setPetDraft((p) => ({ ...p, allergies: v }))}
                  multiline
                />
                <TextInput
                  style={[styles.input, styles.multiline]}
                  placeholder="Medicamentos (opcional)"
                  value={petDraft.medications}
                  onChangeText={(v) => setPetDraft((p) => ({ ...p, medications: v }))}
                  multiline
                />
                <TextInput
                  style={[styles.input, styles.multiline]}
                  placeholder="Condiciones (opcional)"
                  value={petDraft.conditions}
                  onChangeText={(v) => setPetDraft((p) => ({ ...p, conditions: v }))}
                  multiline
                />
              </>
            ) : (
              <>
                <InfoRow label="Alergias" value={selectedPet.allergies ?? null} />
                <InfoRow label="Medicamentos" value={selectedPet.medications ?? null} />
                <InfoRow label="Condiciones" value={selectedPet.conditions ?? null} />
              </>
            )}
          </Card>

          {/* ✅ CONTACTO: sin botones en modo NO edición */}
          <Card title="Contacto">
            {isEditing ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Teléfono (ej: +569...)"
                  value={petDraft.owner_phone}
                  onChangeText={(v) => setPetDraft((p) => ({ ...p, owner_phone: v }))}
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  placeholder="WhatsApp (ej: +569...)"
                  value={petDraft.owner_whatsapp}
                  onChangeText={(v) => setPetDraft((p) => ({ ...p, owner_whatsapp: v }))}
                  autoCapitalize="none"
                />
              </>
            ) : (
              <>
                <InfoRow label="Teléfono" value={selectedPet.owner_phone ?? null} />
                <InfoRow label="WhatsApp" value={selectedPet.owner_whatsapp ?? null} />
              </>
            )}
          </Card>

          <Card title="Veterinario">
            {isEditing ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Nombre vet (opcional)"
                  value={petDraft.vet_name}
                  onChangeText={(v) => setPetDraft((p) => ({ ...p, vet_name: v }))}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Teléfono vet (opcional)"
                  value={petDraft.vet_phone}
                  onChangeText={(v) => setPetDraft((p) => ({ ...p, vet_phone: v }))}
                  autoCapitalize="none"
                />
              </>
            ) : (
              <>
                <InfoRow label="Nombre" value={selectedPet.vet_name ?? null} />
                <InfoRow label="Teléfono" value={selectedPet.vet_phone ?? null} />
              </>
            )}
          </Card>

          <Card title="Notas públicas (lo que ve quien encuentra)">
            {isEditing ? (
              <TextInput
                style={[styles.input, styles.multiline]}
                placeholder="Ej: No se deja tocar / necesita medicamento / muy miedoso..."
                value={petDraft.public_notes}
                onChangeText={(v) => setPetDraft((p) => ({ ...p, public_notes: v }))}
                multiline
              />
            ) : (
              <Text style={{ color: '#334155' }}>
                {selectedPet.public_notes?.trim() ? selectedPet.public_notes : '—'}
              </Text>
            )}
          </Card>

          {isEditing ? (
            <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={savePetProfile} disabled={loading}>
              <Text style={styles.saveBtnText}>{loading ? 'Guardando...' : 'Guardar cambios'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.actionBtn, styles.linkBtn]} onPress={() => setScreen('LinkTag')}>
              <Text style={styles.linkBtnText}>Vincular tag</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.actionBtn, styles.backBtn]} onPress={() => setScreen('Home')}>
            <Text style={styles.backBtnText}>Volver</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.form}>
        <Card title="Vinculación por lector QR">
          <Text style={styles.linkMethodText}>Presiona el botón para iniciar el escaneo del código QR y registrarlo.</Text>
          <TouchableOpacity style={[styles.actionBtn, styles.linkBtn]} onPress={() => startScannerCapture('QR')} disabled={loading}>
            <Text style={styles.linkBtnText}>{loading ? 'Vinculando...' : 'Escanear QR y registrar'}</Text>
          </TouchableOpacity>
          <TextInput
            ref={qrScannerInputRef}
            style={styles.scannerHiddenInput}
            value={qrTagCode}
            onChangeText={setQrTagCode}
            onSubmitEditing={() => registerScannedCode('QR')}
            autoCapitalize="characters"
            blurOnSubmit={false}
          />
        </Card>

        <Card title="Vinculación por lector NFC">
          <Text style={styles.linkMethodText}>Presiona el botón para iniciar el escaneo del chip NFC y registrarlo.</Text>
          <TouchableOpacity style={[styles.actionBtn, styles.linkBtn]} onPress={() => startScannerCapture('NFC')} disabled={loading}>
            <Text style={styles.linkBtnText}>{loading ? 'Vinculando...' : 'Escanear chip NFC y registrar'}</Text>
          </TouchableOpacity>
          <TextInput
            ref={nfcScannerInputRef}
            style={styles.scannerHiddenInput}
            value={nfcTagCode}
            onChangeText={setNfcTagCode}
            onSubmitEditing={() => registerScannedCode('NFC')}
            autoCapitalize="characters"
            blurOnSubmit={false}
          />
        </Card>

        {scanHint ? <Text style={styles.scanHint}>{scanHint}</Text> : null}

        <Button title="Cancelar" onPress={() => setScreen('PetDetail')} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {screen !== 'Home' ? <Text style={styles.title}>{title}</Text> : null}
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

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14
  },
  cardHeader: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 10 },

  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  rowLabel: { color: '#64748b', fontWeight: '700' },
  rowValue: { color: '#0f172a', fontWeight: '700', flexShrink: 1, textAlign: 'right' },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },

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

  linkMethodText: { color: '#334155', lineHeight: 20 },
  scanHint: { color: '#1e3a8a', fontWeight: '600' },
  scannerHiddenInput: {
    height: 0,
    width: 0,
    opacity: 0
  },

  detailName: { fontSize: 22, fontWeight: '700' }
});
