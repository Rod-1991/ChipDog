import { create } from 'zustand';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Buffer } from 'buffer';
import { supabase } from '../lib/supabase';
import type { RecognitionPhoto, FindPetResult } from '../types';

export const COLOR_OPTIONS = ['negro', 'blanco', 'café', 'dorado', 'gris', 'atigrado', 'manchado'];
export const SIZE_OPTIONS = ['pequeño', 'mediano', 'grande'] as const;

const EDGE_FN_URL = 'https://kcowhlsfbuixvdjhrikl.supabase.co/functions/v1/analyze-pet-photo';

export type AiSuggestion = {
  species: 'dog' | 'cat' | null;
  breed: string | null;
  colors: string[];
  size: 'pequeño' | 'mediano' | 'grande' | null;
  confidence: 'alta' | 'media' | 'baja';
};

interface RecognitionStore {
  // Fotos de reconocimiento de la mascota seleccionada
  recognitionPhotos: RecognitionPhoto[];
  loadingPhotos: boolean;

  // Búsqueda (pantalla FindPet)
  findStep: 1 | 3;           // paso 2 ya no existe en el flujo principal
  findPhotoUri: string | null;
  findLat: number | null;
  findLng: number | null;
  findSpecies: string | null;
  findBreed: string;
  findColors: string[];
  findSize: 'pequeño' | 'mediano' | 'grande' | null;
  findResults: FindPetResult[];
  findLoading: boolean;
  findResultPhotos: Record<number, string | null>;
  aiAnalyzing: boolean;
  aiSuggestion: AiSuggestion | null;

  // Actions — fotos de mascota
  fetchRecognitionPhotos: (petId: number) => Promise<void>;
  addRecognitionPhoto: (petId: number, ownerId: string) => Promise<void>;
  updateRecognitionPhoto: (photoId: number, data: Partial<Pick<RecognitionPhoto, 'photo_breed' | 'photo_colors' | 'photo_size' | 'photo_markings'>>) => Promise<void>;
  deleteRecognitionPhoto: (photoId: number, storageUrl: string) => Promise<void>;

  // Actions — búsqueda
  setFindStep: (step: 1 | 3) => void;
  setFindSpecies: (species: 'dog' | 'cat' | null) => void;
  setFindBreed: (v: string) => void;
  toggleFindColor: (color: string) => void;
  setFindSize: (size: 'pequeño' | 'mediano' | 'grande' | null) => void;
  pickFindPhoto: (source: 'camera' | 'library') => Promise<void>;
  searchLostPets: () => Promise<void>;      // búsqueda manual (refinar)
  resetFind: () => void;
  loadFindResultPhotos: (results: FindPetResult[]) => Promise<void>;
}

export const useRecognitionStore = create<RecognitionStore>((set, get) => ({
  recognitionPhotos: [],
  loadingPhotos: false,

  findStep: 1,
  findPhotoUri: null,
  findLat: null,
  findLng: null,
  findSpecies: null,
  findBreed: '',
  findColors: [],
  findSize: null,
  findResults: [],
  findLoading: false,
  findResultPhotos: {},
  aiAnalyzing: false,
  aiSuggestion: null,

  fetchRecognitionPhotos: async (petId) => {
    set({ loadingPhotos: true });
    try {
      const { data, error } = await supabase
        .from('pet_recognition_photos')
        .select('*')
        .eq('pet_id', petId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      set({ recognitionPhotos: (data as RecognitionPhoto[]) ?? [] });
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'No se pudieron cargar las fotos.');
    } finally {
      set({ loadingPhotos: false });
    }
  },

  addRecognitionPhoto: async (petId, ownerId) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true, quality: 0.8, base64: true,
    });
    if (result.canceled || !result.assets[0].base64) return;

    set({ loadingPhotos: true });
    try {
      const asset = result.assets[0];
      const path = `${ownerId}/${petId}/recognition_${Date.now()}.jpg`;
      const bytes = new Uint8Array(Buffer.from(asset.base64!, 'base64'));
      const { error: upErr } = await supabase.storage
        .from('pet-photos').upload(path, bytes, { upsert: false, contentType: 'image/jpeg' });
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase.from('pet_recognition_photos').insert({
        pet_id: petId, storage_url: path,
      });
      if (dbErr) throw dbErr;
      await get().fetchRecognitionPhotos(petId);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'No se pudo subir la foto.');
    } finally {
      set({ loadingPhotos: false });
    }
  },

  updateRecognitionPhoto: async (photoId, data) => {
    const { error } = await supabase.from('pet_recognition_photos').update(data).eq('id', photoId);
    if (error) { Alert.alert('Error', error.message); return; }
    set((s) => ({
      recognitionPhotos: s.recognitionPhotos.map((p) =>
        p.id === photoId ? { ...p, ...data } : p
      ),
    }));
  },

  deleteRecognitionPhoto: async (photoId, storageUrl) => {
    await supabase.storage.from('pet-photos').remove([storageUrl]);
    const { error } = await supabase.from('pet_recognition_photos').delete().eq('id', photoId);
    if (error) { Alert.alert('Error', error.message); return; }
    set((s) => ({ recognitionPhotos: s.recognitionPhotos.filter((p) => p.id !== photoId) }));
  },

  setFindStep: (findStep) => set({ findStep }),
  setFindSpecies: (findSpecies) => set({ findSpecies }),
  setFindBreed: (findBreed) => set({ findBreed }),
  toggleFindColor: (color) => set((s) => ({
    findColors: s.findColors.includes(color)
      ? s.findColors.filter((c) => c !== color)
      : [...s.findColors, color],
  })),
  setFindSize: (findSize) => set({ findSize }),

  pickFindPhoto: async (source) => {
    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara.'); return; }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: true, quality: 0.7, base64: true,
      });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.'); return; }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true, quality: 0.7, base64: true,
      });
    }
    if (result.canceled) return;

    const asset = result.assets[0];
    // Preserve user-selected species before clearing state
    const userSpecies = get().findSpecies;
    set({ findPhotoUri: asset.uri, aiSuggestion: null, aiAnalyzing: true, findLoading: true });

    // GPS + IA en paralelo, luego busca automáticamente
    let detectedBreed = '';
    let detectedColors: string[] = [];
    let detectedSize: 'pequeño' | 'mediano' | 'grande' | null = null;
    let detectedConfidence: AiSuggestion['confidence'] = 'baja';

    await Promise.all([
      // GPS
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') return;
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          set({ findLat: loc.coords.latitude, findLng: loc.coords.longitude });
        } catch { /* sin GPS */ }
      })(),

      // IA
      (async () => {
        try {
          if (!asset.base64) return;
          const res = await fetch(EDGE_FN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_base64: asset.base64, media_type: 'image/jpeg' }),
          });
          if (!res.ok) return;
          const json = await res.json();
          if (json.breed || json.colors?.length || json.species) {
            // User-selected species takes priority over AI detection
            const aiSpecies: 'dog' | 'cat' | null = json.species === 'perro' ? 'dog' : json.species === 'gato' ? 'cat' : null;
            const finalSpecies = userSpecies ?? aiSpecies;
            detectedBreed = json.breed ?? '';
            detectedColors = (json.colors ?? []).filter((c: string) => COLOR_OPTIONS.includes(c));
            detectedSize = SIZE_OPTIONS.includes(json.size) ? json.size : null;
            detectedConfidence = json.confidence ?? 'baja';
            set({
              findSpecies: finalSpecies,
              findBreed: detectedBreed,
              findColors: detectedColors,
              findSize: detectedSize,
              aiSuggestion: { species: finalSpecies, breed: detectedBreed || null, colors: detectedColors, size: detectedSize, confidence: detectedConfidence },
              aiAnalyzing: false,
            });
          }
        } catch { /* IA falló */ }
        finally {
          set({ aiAnalyzing: false });
        }
      })(),
    ]);

    // Buscar con la especie conocida (usuario o IA) + lo que detectó la IA
    const { findLat, findLng, findSpecies: finalSpecies } = get();
    try {
      const { data, error } = await supabase.rpc('search_lost_pets', {
        p_lat: findLat ?? null,
        p_lng: findLng ?? null,
        p_radius_km: findLat && findLng ? 20 : null,
        p_species: finalSpecies ?? null,
        p_breed: detectedBreed.trim() || null,
        p_colors: detectedColors.length > 0 ? detectedColors : null,
        p_size: detectedSize ?? null,
      });
      if (error) throw error;
      const results = (data as FindPetResult[]) ?? [];
      set({ findResults: results, findStep: 3 });
      await get().loadFindResultPhotos(results);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'No se pudo realizar la búsqueda.');
    } finally {
      set({ findLoading: false });
    }
  },

  searchLostPets: async () => {
    const { findLat, findLng, findSpecies, findBreed, findColors, findSize } = get();
    set({ findLoading: true });
    try {
      const { data, error } = await supabase.rpc('search_lost_pets', {
        p_lat: findLat ?? null,
        p_lng: findLng ?? null,
        p_radius_km: findLat && findLng ? 20 : null,
        p_species: findSpecies ?? null,
        p_breed: findBreed.trim() || null,
        p_colors: findColors.length > 0 ? findColors : null,
        p_size: findSize ?? null,
      });
      if (error) throw error;
      const results = (data as FindPetResult[]) ?? [];
      set({ findResults: results, findStep: 3 });
      await get().loadFindResultPhotos(results);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'No se pudo realizar la búsqueda.');
    } finally {
      set({ findLoading: false });
    }
  },

  loadFindResultPhotos: async (results) => {
    const entries = await Promise.all(
      results.map(async (r) => {
        if (!r.photo_url) return [r.pet_id, null] as const;
        const { data } = await supabase.storage.from('pet-photos').createSignedUrl(r.photo_url, 3600);
        return [r.pet_id, data?.signedUrl ?? null] as const;
      })
    );
    set({ findResultPhotos: Object.fromEntries(entries) });
  },

  resetFind: () => set({
    findStep: 1, findPhotoUri: null, findLat: null, findLng: null,
    findSpecies: null, findBreed: '', findColors: [], findSize: null,
    findResults: [], findResultPhotos: {},
    aiSuggestion: null, aiAnalyzing: false, findLoading: false,
  }),
}));
