import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { LostPetPin, NearbyLostPet } from '../types';

interface LostPetsStore {
  allLostPets: LostPetPin[];
  nearbyLostPets: NearbyLostPet[];
  nearbyUserLoc: { lat: number; lng: number } | null;
  selectedLostPet: LostPetPin | null;
  lostPetSignedUrls: Record<number, string | null>;

  setSelectedLostPet: (pet: LostPetPin | null) => void;
  setNearbyUserLoc: (loc: { lat: number; lng: number } | null) => void;
  setNearbyLostPets: (pets: NearbyLostPet[]) => void;

  loadAllLostPets: () => Promise<void>;
  loadLostPetSignedUrls: (pets: LostPetPin[]) => Promise<void>;
  clearLostPets: () => void;
}

export const useLostPetsStore = create<LostPetsStore>((set, get) => ({
  allLostPets: [],
  nearbyLostPets: [],
  nearbyUserLoc: null,
  selectedLostPet: null,
  lostPetSignedUrls: {},

  setSelectedLostPet: (selectedLostPet) => set({ selectedLostPet }),
  setNearbyUserLoc: (nearbyUserLoc) => set({ nearbyUserLoc }),
  setNearbyLostPets: (nearbyLostPets) => set({ nearbyLostPets }),

  loadAllLostPets: async () => {
    try {
      const { data } = await supabase.rpc('get_all_lost_pets');
      const pets = (data as LostPetPin[]) ?? [];
      set({ allLostPets: pets });
      // Pre-load signed URLs for pets with photos
      await get().loadLostPetSignedUrls(pets);
    } catch { /* silent */ }
  },

  loadLostPetSignedUrls: async (pets) => {
    const { lostPetSignedUrls } = get();
    const pending = pets.filter((p) => p.photo_url && !(p.id in lostPetSignedUrls));
    if (!pending.length) return;
    const entries = await Promise.all(
      pending.map(async (p) => {
        const { data } = await supabase.storage.from('pet-photos').createSignedUrl(p.photo_url!, 3600);
        return [p.id, data?.signedUrl ?? null] as const;
      })
    );
    set({ lostPetSignedUrls: { ...lostPetSignedUrls, ...Object.fromEntries(entries) } });
  },

  clearLostPets: () => set({ allLostPets: [], nearbyLostPets: [], nearbyUserLoc: null, selectedLostPet: null, lostPetSignedUrls: {} }),
}));
