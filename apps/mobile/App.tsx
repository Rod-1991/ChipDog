import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  Pressable,
  RefreshControl,
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

type Screen = 'Login' | 'Home' | 'AddPet' | 'PetDetail' | 'LinkTag' | 'FoundTag' | 'FoundResult';

type Pet = {
  id: number;
  name: string;
  species: string;
  breed: string | null;
  is_lost: boolean;
  photo_path?: string | null;
};

type FoundPet = {
  public_name: string | null;
  species: string | null;
  breed: string | null;
  color: string | null;
  photo_url: string | null;
  public_notes: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
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
  const [refreshing, setRefreshing] = useState(false);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [petListPhotoUrls, setPetListPhotoUrls] = useState<Record<number, string>>({});
  const [petListPhotoPaths, setPetListPhotoPaths] = useState<Record<number, string | null>>({});

  const [petForm, setPetForm] = useState({
    name: '',
    species: '',
    breed: '',
    color: '',
    birth_year: '',
    photo_url: ''
  });
  const [tagCode, setTagCode] = useState('');
  const [foundCode, setFoundCode] = useState('');
  const [foundPet, setFoundPet] = useState<FoundPet | null>(null);

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
        return 'Resultado de búsqueda';
    }
  }, [screen, selectedPet]);

  const hydratePetListPhotos = async (petList: Pet[], forceIds: number[] = []) => {
    const forceSet = new Set(forceIds);
    const nextUrls: Record<number, string> = {};
    const nextPaths: Record<number, string | null> = {};

    for (const pet of petList) {
      const nextPath = pet.photo_path ?? null;
      const cachedPath = petListPhotoPaths[pet.id] ?? null;
      const hasCachedUrl = !!petListPhotoUrls[pet.id];
      const shouldForce = forceSet.has(pet.id);

      if (!nextPath) {
        nextPaths[pet.id] = null;
        continue;
      }

      if (!shouldForce && hasCachedUrl && cachedPath === nextPath) {
        nextPaths[pet.id] = nextPath;
        continue;
      }

      const { data, error } = await supabase.storage.from('pet-photos').createSignedUrl(nextPath, 3600);
      if (error || !data?.signedUrl) {
        continue;
      }

      nextUrls[pet.id] = data.signedUrl;
      nextPaths[pet.id] = nextPath;
    }

    if (Object.keys(nextUrls).length > 0) {
      setPetListPhotoUrls((prev) => ({ ...prev, ...nextUrls }));
    }

    if (Object.keys(nextPaths).length > 0) {
      setPetListPhotoPaths((prev) => ({ ...prev, ...nextPaths }));
      setPetListPhotoUrls((prev) => {
        const cleaned = { ...prev };
        for (const [petId, path] of Object.entries(nextPaths)) {
          if (!path) {
            delete cleaned[Number(petId)];
          }
        }
        return cleaned;
      });
    }
  };

  const fetchPets = async (options?: { forcePhotoIds?: number[] }) => {
    const { data, error } = await supabase.from('pets').select('id,name,species,breed,is_lost,photo_path').order('created_at', { ascending: false });
    if (error) {
      Alert.alert('Error listando mascotas', error.message);
      return;
    }

    const nextPets = (data as Pet[]) ?? [];
    setPets(nextPets);
    await hydratePetListPhotos(nextPets, options?.forcePhotoIds ?? []);
  };

  const handlePullToRefresh = async () => {
    setRefreshing(true);
    await fetchPets();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('No se pudo cerrar sesión', error.message);
      return;
    }
    setSelectedPet(null);
    setPets([]);
    setScreen('Login');
  };

  const handleOpenPetDetail = (pet: Pet) => {
    setSelectedPet(pet);
    setScreen('PetDetail');
  };

  const handleBackToHome = async () => {
    await fetchPets(selectedPet ? { forcePhotoIds: [selectedPet.id] } : undefined);
    setScreen('Home');
  };

  const getPetInitials = (name: string) => {
    const clean = name.trim();
    if (!clean) return 'PD';
    const parts = clean.split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
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
    const { error } = await supabase.from('pets').insert(parsed.data);
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
    const { error } = await supabase.from('tags').update({ pet_id: selectedPet.id, status: 'linked' }).eq('code', parsed.data.code).is('pet_id', null);
    setLoading(false);

    if (error) {
      Alert.alert('Error vinculando tag', error.message);
      return;
    }

    Alert.alert('Tag vinculado');
    setTagCode('');
    setScreen('PetDetail');
  };

  const handleFoundLookup = async () => {
    const code = foundCode.trim().toUpperCase();
    if (code.length < 3) {
      Alert.alert('Validación', 'Ingresa un código válido');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.rpc('get_pet_public_by_tag', { p_code: code });
    setLoading(false);

    if (error) {
      Alert.alert('Error consultando tag', error.message);
      return;
    }

    const pet = (data as FoundPet[] | null)?.[0] ?? null;
    if (!pet) {
      Alert.alert('Sin resultados', 'No encontrado o no está perdido');
      return;
    }

    setFoundPet(pet);
    setScreen('FoundResult');
  };

  const renderHome = () => {
    return (
      <View style={styles.homeContainer}>
        <View style={styles.homeHeaderRow}>
          <View>
            <Text style={styles.homeTitle}>Mis mascotas</Text>
            <Text style={styles.homeSubtitle}>Tu lista de mascotas</Text>
          </View>
          <Pressable style={styles.logoutTinyBtn} onPress={handleLogout}>
            <Text style={styles.logoutTinyBtnText}>Salir</Text>
          </Pressable>
        </View>

        {pets.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateTitle}>Aún no tienes mascotas</Text>
            <Text style={styles.emptyStateSubtitle}>Crea tu primera mascota para comenzar.</Text>
            <Pressable style={styles.primaryButton} onPress={() => setScreen('AddPet')}>
              <Text style={styles.primaryButtonText}>Agregar mascota</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.petList}>
            {pets.map((pet) => {
              const imageUrl = petListPhotoUrls[pet.id];
              return (
                <TouchableOpacity key={pet.id} onPress={() => handleOpenPetDetail(pet)} style={styles.homeCard}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.petThumb} />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Text style={styles.thumbPlaceholderText}>{getPetInitials(pet.name)}</Text>
                    </View>
                  )}

                  <View style={styles.homeCardBody}>
                    <Text style={styles.homeCardTitle}>{pet.name}</Text>
                    <Text style={styles.homeCardSubtitle}>{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</Text>
                  </View>

                  <View style={[styles.statusBadge, pet.is_lost ? styles.statusLost : styles.statusSafe]}>
                    <Text style={[styles.statusBadgeText, pet.is_lost ? styles.statusLostText : styles.statusSafeText]}>
                      {pet.is_lost ? 'Perdido' : 'En casa'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {pets.length > 0 && (
          <Pressable style={styles.primaryButton} onPress={() => setScreen('AddPet')}>
            <Text style={styles.primaryButtonText}>Agregar mascota</Text>
          </Pressable>
        )}
      </View>
    );
  };

  const renderScreen = () => {
    if (screen === 'Login') {
      return (
        <View style={styles.form}>
          <TextInput value={email} onChangeText={setEmail} style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" />
          <TextInput value={password} onChangeText={setPassword} style={styles.input} placeholder="Contraseña" secureTextEntry />
          <Button title={loading ? 'Ingresando...' : 'Ingresar'} onPress={handleLogin} disabled={loading} />
          <Button title="Encontré una mascota (escaneo tag)" onPress={() => setScreen('FoundTag')} />
        </View>
      );
    }

    if (screen === 'FoundTag') {
      return (
        <View style={styles.form}>
          <TextInput
            value={foundCode}
            onChangeText={setFoundCode}
            style={styles.input}
            placeholder="Código del tag"
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
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{foundPet.public_name ?? 'Mascota reportada'}</Text>
              <Text>Especie: {foundPet.species ?? 'N/D'}</Text>
              <Text>Raza: {foundPet.breed ?? 'N/D'}</Text>
              <Text>Color: {foundPet.color ?? 'N/D'}</Text>
              {foundPet.photo_url ? <Text>Foto: {foundPet.photo_url}</Text> : <Text>Foto: N/D</Text>}
              <Text>Notas: {foundPet.public_notes ?? 'Sin notas públicas'}</Text>
              <Text>Teléfono: {foundPet.contact_phone ?? 'N/D'}</Text>
              <Text>WhatsApp: {foundPet.contact_whatsapp ?? 'N/D'}</Text>
            </View>
          ) : (
            <Text>No se encontraron datos públicos.</Text>
          )}
          <Button title="Buscar otro tag" onPress={() => setScreen('FoundTag')} />
          <Button title="Volver" onPress={() => setScreen('Login')} />
        </View>
      );
    }

    if (screen === 'Home') {
      return renderHome();
    }

    if (screen === 'AddPet') {
      return (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Nombre" value={petForm.name} onChangeText={(v) => setPetForm((p) => ({ ...p, name: v }))} />
          <TextInput style={styles.input} placeholder="Especie" value={petForm.species} onChangeText={(v) => setPetForm((p) => ({ ...p, species: v }))} />
          <TextInput style={styles.input} placeholder="Raza" value={petForm.breed} onChangeText={(v) => setPetForm((p) => ({ ...p, breed: v }))} />
          <TextInput style={styles.input} placeholder="Color" value={petForm.color} onChangeText={(v) => setPetForm((p) => ({ ...p, color: v }))} />
          <TextInput style={styles.input} placeholder="Año nacimiento" keyboardType="number-pad" value={petForm.birth_year} onChangeText={(v) => setPetForm((p) => ({ ...p, birth_year: v }))} />
          <TextInput style={styles.input} placeholder="URL foto" value={petForm.photo_url} onChangeText={(v) => setPetForm((p) => ({ ...p, photo_url: v }))} autoCapitalize="none" />
          <Button title={loading ? 'Guardando...' : 'Guardar mascota'} onPress={handleCreatePet} disabled={loading} />
          <Button title="Volver" onPress={handleBackToHome} />
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
          <Button title="Volver" onPress={handleBackToHome} />
        </View>
      );
    }

    return (
      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Código tag" value={tagCode} onChangeText={setTagCode} autoCapitalize="characters" />
        <Button title={loading ? 'Vinculando...' : 'Confirmar vínculo'} onPress={handleLinkTag} disabled={loading} />
        <Button title="Cancelar" onPress={() => setScreen('PetDetail')} />
      </View>
    );
  };

  const showDefaultTitle = screen !== 'Home';

  return (
    <SafeAreaView style={styles.container}>
      {showDefaultTitle && <Text style={styles.title}>{title}</Text>}
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={screen === 'Home' ? <RefreshControl refreshing={refreshing} onRefresh={handlePullToRefresh} /> : undefined}
      >
        {renderScreen()}
      </ScrollView>
      {loading && <ActivityIndicator style={styles.loader} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 16, paddingBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a', paddingHorizontal: 16, paddingTop: 16 },
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
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff'
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a' },
  detailName: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  loader: { marginBottom: 24 },

  homeContainer: { gap: 16 },
  homeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
  homeTitle: { fontSize: 32, fontWeight: '800', color: '#0f172a' },
  homeSubtitle: { marginTop: 4, fontSize: 14, color: '#64748b' },
  logoutTinyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#e2e8f0'
  },
  logoutTinyBtnText: { color: '#334155', fontSize: 12, fontWeight: '600' },

  petList: { gap: 12 },
  homeCard: {
    minHeight: 98,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  petThumb: {
    width: 68,
    height: 68,
    borderRadius: 14,
    backgroundColor: '#e2e8f0'
  },
  thumbPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center'
  },
  thumbPlaceholderText: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700'
  },
  homeCardBody: { flex: 1, gap: 4 },
  homeCardTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  homeCardSubtitle: { fontSize: 14, color: '#475569' },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1
  },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  statusSafe: { backgroundColor: '#ccfbf1', borderColor: '#5eead4' },
  statusSafeText: { color: '#0f766e' },
  statusLost: { backgroundColor: '#ffe4e6', borderColor: '#fda4af' },
  statusLostText: { color: '#be123c' },

  primaryButton: {
    marginTop: 4,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  emptyStateCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
    gap: 10
  },
  emptyStateTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  emptyStateSubtitle: { fontSize: 14, color: '#64748b' }
});
