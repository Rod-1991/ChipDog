import { create } from 'zustand';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { usePetsStore } from './pets';
import type { WeightEntry, FoodEntry, PetSighting } from '../types';

interface NutritionStore {
  weightHistory: WeightEntry[];
  foodHistory: FoodEntry[];
  sightings: PetSighting[];

  fetchWeightHistory: (petId: number) => Promise<void>;
  fetchFoodHistory: (petId: number) => Promise<void>;
  fetchSightings: (petId: number) => Promise<void>;

  saveWeightEntry: (petId: number, weight_kg: number, measured_at: string, notes: string) => Promise<void>;
  deleteWeightEntry: (id: number, petId: number) => Promise<void>;
  saveFoodEntry: (petId: number, food_brand: string, started_at: string, notes: string) => Promise<void>;
  deleteFoodEntry: (id: number, petId: number) => Promise<void>;
  saveSighting: (petId: number, reporterName: string, comment: string) => Promise<boolean>;
  deleteSighting: (id: number, petId: number) => Promise<void>;

  clearNutrition: () => void;
}

export const useNutritionStore = create<NutritionStore>((set, get) => ({
  weightHistory: [],
  foodHistory: [],
  sightings: [],

  fetchWeightHistory: async (petId) => {
    const { data } = await supabase.from('pet_weight_history').select('*').eq('pet_id', petId).order('measured_at', { ascending: true });
    set({ weightHistory: (data as WeightEntry[]) ?? [] });
  },

  fetchFoodHistory: async (petId) => {
    const { data } = await supabase.from('pet_food_history').select('*').eq('pet_id', petId).order('started_at', { ascending: false });
    set({ foodHistory: (data as FoodEntry[]) ?? [] });
  },

  fetchSightings: async (petId) => {
    const { data } = await supabase.from('pet_sightings').select('*').eq('pet_id', petId).order('created_at', { ascending: false });
    set({ sightings: (data as PetSighting[]) ?? [] });
  },

  saveWeightEntry: async (petId, weight_kg, measured_at, notes) => {
    const { error } = await supabase.from('pet_weight_history').insert({ pet_id: petId, weight_kg, measured_at, notes: notes || null });
    if (error) { Alert.alert('Error', error.message); return; }
    await supabase.from('pets').update({ weight_kg }).eq('id', petId);
    await get().fetchWeightHistory(petId);
    // Sync selectedPet and petDraft in pets store
    const petsStore = usePetsStore.getState();
    if (petsStore.selectedPet?.id === petId) {
      petsStore.setSelectedPet({ ...petsStore.selectedPet, weight_kg });
      petsStore.setPetDraft((prev) => ({ ...prev, weight_kg: String(weight_kg) }));
    }
    await petsStore.fetchPets();
  },

  deleteWeightEntry: async (id, petId) => {
    await supabase.from('pet_weight_history').delete().eq('id', id);
    await get().fetchWeightHistory(petId);
  },

  saveFoodEntry: async (petId, food_brand, started_at, notes) => {
    const { error } = await supabase.from('pet_food_history').insert({ pet_id: petId, food_brand, started_at, notes: notes || null });
    if (error) { Alert.alert('Error', error.message); return; }
    await get().fetchFoodHistory(petId);
  },

  deleteFoodEntry: async (id, petId) => {
    await supabase.from('pet_food_history').delete().eq('id', id);
    await get().fetchFoodHistory(petId);
  },

  saveSighting: async (petId, reporterName, comment) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('pet_sightings').insert({
      pet_id: petId, reporter_name: reporterName || 'Anónimo', comment, user_id: user?.id ?? null,
    });
    if (error) { Alert.alert('Error', error.message); return false; }
    await get().fetchSightings(petId);
    return true;
  },

  deleteSighting: async (id, petId) => {
    const { error } = await supabase.from('pet_sightings').delete().eq('id', id);
    if (error) { Alert.alert('Error', error.message); return; }
    await get().fetchSightings(petId);
  },

  clearNutrition: () => set({ weightHistory: [], foodHistory: [], sightings: [] }),
}));
