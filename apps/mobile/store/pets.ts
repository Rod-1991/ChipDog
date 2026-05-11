import { create } from 'zustand';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Buffer } from 'buffer';
import { supabase } from '../lib/supabase';
import { normalizeStringOrNull, parseBirthDateText, formatBirthDate } from '../utils/helpers';
import type { Pet, FoundPet, VetAttachment } from '../types';

export interface PetDraft {
  color: string;
  birth_year: string;
  birth_date_text: string;
  sex: string;
  weight_kg: string;
  description: string;
  sterilized: boolean;
  chip_number: string;
  blood_type: string;
  insurance_name: string;
  insurance_policy: string;
  contact_primary_name: string;
  owner_phone: string;
  contact_secondary_name: string;
  contact_secondary_phone: string;
  owner_whatsapp: string;
  public_notes: string;
  allergies: string;
  medications: string;
  conditions: string;
  vet_name: string;
  vet_phone: string;
  food_brand: string;
  food_notes: string;
}

const EMPTY_DRAFT: PetDraft = {
  color: '', birth_year: '', birth_date_text: '', sex: '', weight_kg: '',
  description: '', sterilized: false, chip_number: '', blood_type: '',
  insurance_name: '', insurance_policy: '', contact_primary_name: '',
  owner_phone: '', contact_secondary_name: '', contact_secondary_phone: '',
  owner_whatsapp: '', public_notes: '', allergies: '', medications: '',
  conditions: '', vet_name: '', vet_phone: '', food_brand: '', food_notes: '',
};

interface PetsStore {
  pets: Pet[];
  selectedPet: Pet | null;
  petSignedUrls: Record<number, string | null>;
  petPhotoSignedUrl: string | null;
  petTags: { id: number; code: string }[];
  petDraft: PetDraft;
  isEditingPetDetail: boolean;
  foundPet: FoundPet | null;

  setPets: (pets: Pet[]) => void;
  setSelectedPet: (pet: Pet | null) => void;
  setPetDraft: (draft: PetDraft | ((prev: PetDraft) => PetDraft)) => void;
  setIsEditingPetDetail: (v: boolean) => void;
  setFoundPet: (pet: FoundPet | null) => void;

  fetchPets: () => Promise<void>;
  loadPetDetail: (petId: number) => Promise<void>;
  loadHomePetPhotos: (petsToResolve: Pet[]) => Promise<void>;
  loadSelectedPetPhoto: (photoPath?: string | null) => Promise<void>;

  savePetProfile: () => Promise<void>;
  pickAndUploadPetPhoto: (petId: number) => Promise<void>;
  togglePetFeatured: (petId: number, currentFeatured: boolean) => Promise<void>;
  updatePetContactPublic: (petId: number, value: boolean) => Promise<void>;
  updatePetLostStatus: (petId: number, isLost: boolean) => Promise<void>;

  fetchPetTags: (petId: number) => Promise<void>;
  linkTagByUid: (uid: string) => Promise<boolean>;
  unlinkTag: (tagId: number) => Promise<void>;

  lookupTagCode: (code: string) => Promise<boolean>;

  handleCreatePet: (form: {
    name: string; species: 'Perro' | 'Gato'; breed: string; sex: string;
    description: string; weight_kg: string; sterilized: boolean; chip_number: string;
  }, birthDate: Date | null) => Promise<boolean>;

  clearPets: () => void;
}

export const usePetsStore = create<PetsStore>((set, get) => ({
  pets: [],
  selectedPet: null,
  petSignedUrls: {},
  petPhotoSignedUrl: null,
  petTags: [],
  petDraft: EMPTY_DRAFT,
  isEditingPetDetail: false,
  foundPet: null,

  setPets: (pets) => set({ pets }),
  setSelectedPet: (selectedPet) => set({ selectedPet }),
  setPetDraft: (draft) => set((s) => ({
    petDraft: typeof draft === 'function' ? draft(s.petDraft) : draft,
  })),
  setIsEditingPetDetail: (isEditingPetDetail) => set({ isEditingPetDetail }),
  setFoundPet: (foundPet) => set({ foundPet }),

  fetchPets: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('pets')
      .select('id,owner_id,name,species,breed,is_lost,is_featured,photo_url,birth_year,weight_kg,color,chip_number')
      .order('created_at', { ascending: false });
    if (error) { Alert.alert('Error listando mascotas', error.message); return; }
    const next = (data as Pet[]) ?? [];
    set({ pets: next });
    await get().loadHomePetPhotos(next);
  },

  loadHomePetPhotos: async (petsToResolve) => {
    if (!petsToResolve.length) { set({ petSignedUrls: {} }); return; }
    const entries = await Promise.all(
      petsToResolve.map(async (pet) => {
        if (!pet.photo_url) return [pet.id, null] as const;
        const { data } = await supabase.storage.from('pet-photos').createSignedUrl(pet.photo_url, 3600);
        return [pet.id, data?.signedUrl ?? null] as const;
      })
    );
    set({ petSignedUrls: Object.fromEntries(entries) });
  },

  loadSelectedPetPhoto: async (photoPath) => {
    if (!photoPath) { set({ petPhotoSignedUrl: null }); return; }
    const { data } = await supabase.storage.from('pet-photos').createSignedUrl(photoPath, 3600);
    set({ petPhotoSignedUrl: data?.signedUrl ?? null });
  },

  loadPetDetail: async (petId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('pets')
      .select('id,owner_id,name,species,breed,is_lost,photo_url,color,birth_year,birth_date_text,sex,weight_kg,description,sterilized,chip_number,blood_type,insurance_name,insurance_policy,contact_primary_name,owner_phone,contact_secondary_name,contact_secondary_phone,owner_whatsapp,public_notes,allergies,medications,conditions,vet_name,vet_phone')
      .eq('id', petId)
      .single();
    if (error) { Alert.alert('Error cargando perfil', error.message); return; }
    const pet = data as Pet;
    set({
      selectedPet: pet,
      petDraft: {
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
      },
    });
    await get().loadSelectedPetPhoto(pet.photo_url ?? null);
  },

  savePetProfile: async () => {
    const { selectedPet, petDraft, fetchPets } = get();
    if (!selectedPet) return;
    const birthYear = petDraft.birth_year.trim() ? Number(petDraft.birth_year) : null;
    const weight = petDraft.weight_kg.trim() ? Number(petDraft.weight_kg) : null;
    if (birthYear != null && (!Number.isFinite(birthYear) || birthYear < 1990 || birthYear > 2035)) {
      Alert.alert('Validación', 'Año de nacimiento inválido'); return;
    }
    if (weight != null && (!Number.isFinite(weight) || weight <= 0 || weight > 120)) {
      Alert.alert('Validación', 'Peso inválido'); return;
    }
    if (petDraft.birth_date_text.trim() && !parseBirthDateText(petDraft.birth_date_text)) {
      Alert.alert('Validación', 'Fecha inválida. Usa formato dd/mm/yy'); return;
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
      vet_phone: normalizeStringOrNull(petDraft.vet_phone),
    };
    const { data, error } = await supabase
      .from('pets').update(payload).eq('id', selectedPet.id)
      .select('id,owner_id,name,species,breed,is_lost,photo_url,color,birth_year,birth_date_text,sex,weight_kg,description,sterilized,chip_number,blood_type,insurance_name,insurance_policy,contact_primary_name,owner_phone,contact_secondary_name,contact_secondary_phone,owner_whatsapp,public_notes,allergies,medications,conditions,vet_name,vet_phone')
      .single();
    if (error) { Alert.alert('Error guardando', error.message); return; }
    set({ selectedPet: data as Pet, isEditingPetDetail: false });
    await fetchPets();
    Alert.alert('Guardado ✅', 'Perfil actualizado');
  },

  pickAndUploadPetPhoto: async (petId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { Alert.alert('Error', 'Usuario no autenticado'); return; }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permiso requerido', 'Necesitamos permiso para acceder a tu galería.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.85, base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset.base64) { Alert.alert('Error', 'No se pudo leer la imagen. Prueba otra foto.'); return; }
    const bytes = Buffer.from(asset.base64, 'base64');
    const path = `${user.id}/${petId}/main.jpg`;
    const { error: upErr } = await supabase.storage.from('pet-photos').upload(path, new Uint8Array(bytes), { upsert: true, contentType: 'image/jpeg' });
    if (upErr) { Alert.alert('Error subiendo foto', upErr.message); return; }
    const { data: updatedRow, error: dbErr } = await supabase
      .from('pets').update({ photo_url: path }).eq('id', petId).select('id,photo_url').single();
    if (dbErr) { Alert.alert('Error guardando foto', dbErr.message); return; }
    Alert.alert('Foto actualizada ✅');
    set((s) => ({ selectedPet: s.selectedPet ? { ...s.selectedPet, photo_url: updatedRow.photo_url } : s.selectedPet }));
    await get().loadSelectedPetPhoto(updatedRow.photo_url ?? null);
    await get().fetchPets();
  },

  togglePetFeatured: async (petId, currentFeatured) => {
    if (!currentFeatured) await supabase.from('pets').update({ is_featured: false }).neq('id', petId);
    await supabase.from('pets').update({ is_featured: !currentFeatured }).eq('id', petId);
    await get().fetchPets();
  },

  updatePetContactPublic: async (petId, value) => {
    await supabase.from('pets').update({ contact_public: value }).eq('id', petId);
    set((s) => ({ selectedPet: s.selectedPet?.id === petId ? { ...s.selectedPet, contact_public: value } : s.selectedPet }));
    await get().fetchPets();
  },

  updatePetLostStatus: async (petId, isLost) => {
    const { error } = await supabase.from('pets').update({ is_lost: isLost }).eq('id', petId);
    if (error) { Alert.alert('Error', error.message); return; }
    set((s) => ({ selectedPet: s.selectedPet ? { ...s.selectedPet, is_lost: isLost } : s.selectedPet }));
    await get().fetchPets();
  },

  fetchPetTags: async (petId) => {
    const { data } = await supabase.from('tags').select('id, code').eq('pet_id', petId).eq('status', 'linked');
    set({ petTags: data ?? [] });
  },

  linkTagByUid: async (uid) => {
    const { selectedPet } = get();
    if (!selectedPet) { Alert.alert('Error', 'No hay mascota seleccionada.'); return false; }
    if (!uid?.trim()) { Alert.alert('Error', 'No se pudo leer el UID del tag.'); return false; }
    try {
      const { data: existing } = await supabase.from('tags').select('id, pet_id').eq('code', uid).maybeSingle();
      if (existing && existing.pet_id && existing.pet_id !== selectedPet.id) {
        Alert.alert('🔒 Tag no disponible', 'Este tag ya está vinculado a otra mascota.');
        return false;
      }
      const query = existing
        ? supabase.from('tags').update({ pet_id: selectedPet.id, status: 'linked' }).eq('id', existing.id)
        : supabase.from('tags').insert({ code: uid, pet_id: selectedPet.id, status: 'linked' });
      const { error } = await query;
      if (error) throw error;
      await get().fetchPetTags(selectedPet.id);
      return true;
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'No se pudo vincular el tag.');
      return false;
    }
  },

  unlinkTag: async (tagId) => {
    const { selectedPet } = get();
    if (!selectedPet) return;
    const { error } = await supabase.from('tags').delete().eq('id', tagId);
    if (error) { Alert.alert('Error', error.message ?? 'No se pudo desvincular el tag.'); return; }
    await get().fetchPetTags(selectedPet.id);
  },

  lookupTagCode: async (code) => {
    if (!code) { Alert.alert('Ingresa el código o número de chip'); return false; }
    try {
      const { data: tagData, error: tagError } = await supabase.rpc('get_pet_public_by_tag', { p_code: code });
      if (tagError) throw tagError;
      if (tagData?.length > 0) { set({ foundPet: tagData[0] }); return true; }
      const { data: chipData, error: chipError } = await supabase.rpc('get_pet_public_by_chip', { p_chip: code });
      if (chipError) throw chipError;
      if (chipData?.length > 0) { set({ foundPet: chipData[0] }); return true; }
      Alert.alert('No encontrado', 'No hay ninguna mascota registrada con ese tag o número de chip.');
      return false;
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Error al buscar la mascota.');
      return false;
    }
  },

  handleCreatePet: async (form, birthDate) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { Alert.alert('Error', 'Usuario no autenticado'); return false; }
    const weight = form.weight_kg ? parseFloat(form.weight_kg) : null;
    const { error } = await supabase.from('pets').insert({
      owner_id: user.id,
      name: form.name.trim(),
      species: form.species === 'Perro' ? 'dog' : 'cat',
      breed: form.breed || null,
      sex: form.sex || null,
      description: form.description.trim(),
      weight_kg: weight && !isNaN(weight) ? weight : null,
      sterilized: form.sterilized,
      chip_number: form.chip_number.trim() || null,
      birth_year: birthDate ? birthDate.getFullYear() : null,
      birth_date_text: birthDate ? formatBirthDate(birthDate) : null,
    });
    if (error) { Alert.alert('No se pudo crear la mascota', error.message); return false; }
    Alert.alert('🐾 ¡Mascota agregada!', `${form.name} ya está en tu perfil.`);
    await get().fetchPets();
    return true;
  },

  clearPets: () => set({
    pets: [], selectedPet: null, petSignedUrls: {}, petPhotoSignedUrl: null,
    petTags: [], foundPet: null,
  }),
}));
