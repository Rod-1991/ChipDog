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

type Screen = 'Login' | 'Home' | 'AddPet' | 'PetDetail' | 'LinkTag';

type Pet = {
  id: number;
  name: string;
  species: string;
  breed: string | null;
  is_lost: boolean;
};

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY en app.config.ts');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [screen, setScreen] = useState<Screen>('Login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);

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
    }
  }, [screen, selectedPet]);

const fetchPets = async () => {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data, error } = await supabase
    .from('pets')
    .select('id,name,species,breed,is_lost')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    Alert.alert('Error listando mascotas', error.message);
    return;
  }

  setPets((data as Pet[]) ?? []);
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
          // Si falla la lectura de sesión, cae a Login
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

    // El listener también lo haría, pero lo dejamos para respuesta inmediata
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

    setLoading(true);
    const {
  data: { user }
} = await supabase.auth.getUser();

if (!user) {
  Alert.alert('Error', 'Usuario no autenticado');
  return;
}

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
            </>
          ) : (
            <Text>No hay mascota seleccionada.</Text>
          )}
          <Button title="Volver" onPress={() => setScreen('Home')} />
        </View>
      );
    }

    // LinkTag
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