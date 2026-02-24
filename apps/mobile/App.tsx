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
  View
} from 'react-native';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';
import { addPetSchema, linkTagSchema, loginSchema } from '@chipdog/shared';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';

type Screen = 'Login' | 'Home' | 'AddPet' | 'PetDetail' | 'LinkTag' | 'FoundTag' | 'FoundResult';

type Pet = {
  id: number;
  name: string;
  species: string;
  breed: string | null;
  is_lost: boolean;
  photo_path?: string | null;
};

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY en app.config.ts');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const base64ToArrayBuffer = (base64: string) => {
  const buf = Buffer.from(base64, 'base64');
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
};

// ✅ Evita errores de tipos (cacheDirectory / EncodingType) usando fallback
const CACHE_DIR = (FileSystem as any).cacheDirectory ?? (FileSystem as any).documentDirectory ?? '';

export default function App() {
  const [screen, setScreen] = useState<Screen>('Login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);

  // Found flow
  const [foundCode, setFoundCode] = useState('');
  const [foundPet, setFoundPet] = useState<any | null>(null);

  const [petForm, setPetForm] = useState({
    name: '',
    species: '',
    breed: '',
    color: '',
    birth_year: '',
    photo_url: ''
  });
  const [tagCode, setTagCode] = useState('');

  const title = useMemo(() => {
    switch (screen) {
      case 'Login':
        return 'Login';
      case 'Home':
        return 'Mis mascotas';
      case 'AddPet':
        return 'Agregar mascota';
      case 'PetDetail':
        return selectedPet ? `Detalle: ${selectedPet.name}` : 'Detalle';
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
      .select('id,name,species,breed,is_lost,photo_path')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('Error listando mascotas', error.message);
      return;
    }

    setPets((data as Pet[]) ?? []);
  };

  // ✅ Subir foto a Supabase Storage y guardar photo_path en pets
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
    quality: 0.8,
    base64: true // ✅ CLAVE: trae la imagen en base64
  });

  if (result.canceled) return;

  const asset = result.assets[0];
  const b64 = asset.base64;

  if (!b64) {
    Alert.alert('Error', 'No se pudo leer la imagen (base64 vacío). Prueba otra foto.');
    return;
  }

  // ✅ convertir base64 -> bytes (Uint8Array)
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

    const { error: dbErr } = await supabase.from('pets').update({ photo_path: path }).eq('id', petId);
    if (dbErr) {
      Alert.alert('Error guardando foto', dbErr.message);
      return;
    }

    Alert.alert('Foto actualizada ✅');
    await fetchPets();
  } finally {
    setLoading(false);
  }
};

  // ✅ 1) Al iniciar: revisa si hay sesión y navega automáticamente
  // ✅ 2) Se suscribe a cambios de auth (login/logout)
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
        setScreen('Login');
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Public "Found tag" lookup (RPC)
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
    setEmail('');
    setPassword('');
    setScreen('Login');
  };

  const handleCreatePet = async () => {
    const parsed = addPetSchema.safeParse({
      ...petForm,
      birth_year: petForm.birth_year || undefined
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
    setPetForm({ name: '', species: '', breed: '', color: '', birth_year: '', photo_url: '' });
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
          <Button title="Cerrar sesión" onPress={handleLogout} />
          <Button title="Nueva mascota" onPress={() => setScreen('AddPet')} />
          <Button title="Refrescar" onPress={fetchPets} />

          {pets.map((pet) => (
            <TouchableOpacity
              key={pet.id}
              onPress={() => {
                setSelectedPet(pet);
                setScreen('PetDetail');
              }}
              style={styles.card}
            >
              <Text style={styles.cardTitle}>{pet.name}</Text>
              <Text>
                {pet.species}
                {pet.breed ? ` · ${pet.breed}` : ''}
              </Text>
              <Text>{pet.is_lost ? 'Perdido' : 'En casa'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (screen === 'AddPet') {
      return (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Nombre"
            value={petForm.name}
            onChangeText={(v) => setPetForm((p) => ({ ...p, name: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Especie"
            value={petForm.species}
            onChangeText={(v) => setPetForm((p) => ({ ...p, species: v }))}
          />
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
          <TextInput
            style={styles.input}
            placeholder="Año nacimiento"
            keyboardType="number-pad"
            value={petForm.birth_year}
            onChangeText={(v) => setPetForm((p) => ({ ...p, birth_year: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder="URL foto"
            value={petForm.photo_url}
            onChangeText={(v) => setPetForm((p) => ({ ...p, photo_url: v }))}
            autoCapitalize="none"
          />
          <Button title={loading ? 'Guardando...' : 'Guardar mascota'} onPress={handleCreatePet} disabled={loading} />
          <Button title="Volver" onPress={() => setScreen('Home')} />
        </View>
      );
    }

    if (screen === 'PetDetail') {
      return (
        <View style={styles.form}>
          {selectedPet ? (
            <>
              <Text style={styles.detailName}>{selectedPet.name}</Text>
              <Text>Especie: {selectedPet.species}</Text>
              <Text>Raza: {selectedPet.breed ?? 'N/D'}</Text>

              <Button title="Vincular tag" onPress={() => setScreen('LinkTag')} />
              <Button
                title={loading ? 'Subiendo...' : 'Subir foto'}
                onPress={() => pickAndUploadPetPhoto(selectedPet.id)}
                disabled={loading}
              />
            </>
          ) : (
            <Text>No hay mascota seleccionada.</Text>
          )}
          <Button title="Volver" onPress={() => setScreen('Home')} />
        </View>
      );
    }

    // LinkTag (default)
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
      <Text style={styles.title}>{title}</Text>
      <ScrollView contentContainerStyle={styles.scroll}>{renderScreen()}</ScrollView>
      {loading && <ActivityIndicator style={styles.loader} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 16 },
  title: { fontSize: 24, fontWeight: '700', paddingHorizontal: 16, paddingTop: 16 },
  form: { gap: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff'
  },
  card: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff'
  },
  cardTitle: { fontSize: 18, fontWeight: '600' },
  detailName: { fontSize: 22, fontWeight: '700' },
  loader: { marginBottom: 24 }
});