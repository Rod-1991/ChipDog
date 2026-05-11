import { create } from 'zustand';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { normalizeStringOrNull } from '../utils/helpers';
import type { Vaccine } from '../types';

export interface VaccineForm {
  vaccine_name: string;
  applied_date: string;
  expiry_date: string;
  next_dose_date: string;
  veterinarian: string;
  clinic: string;
  batch_number: string;
  notes: string;
}

export const EMPTY_VACCINE_FORM: VaccineForm = {
  vaccine_name: '', applied_date: '', expiry_date: '', next_dose_date: '',
  veterinarian: '', clinic: '', batch_number: '', notes: '',
};

interface VaccinesStore {
  vaccines: Vaccine[];
  upcomingVaccinesCount: number;
  showVaccineForm: boolean;
  editingVaccineId: number | null;
  vaccineForm: VaccineForm;

  setShowVaccineForm: (v: boolean) => void;
  setEditingVaccineId: (id: number | null) => void;
  setVaccineForm: (form: VaccineForm | ((prev: VaccineForm) => VaccineForm)) => void;
  startEditVaccine: (v: Vaccine) => void;
  resetVaccineForm: () => void;

  fetchVaccines: (petId: number) => Promise<void>;
  fetchUpcomingVaccines: () => Promise<void>;
  saveVaccine: (petId: number) => Promise<boolean>;
  deleteVaccine: (id: number, petId: number) => Promise<void>;
  clearVaccines: () => void;
}

export const useVaccinesStore = create<VaccinesStore>((set, get) => ({
  vaccines: [],
  upcomingVaccinesCount: 0,
  showVaccineForm: false,
  editingVaccineId: null,
  vaccineForm: EMPTY_VACCINE_FORM,

  setShowVaccineForm: (showVaccineForm) => set({ showVaccineForm }),
  setEditingVaccineId: (editingVaccineId) => set({ editingVaccineId }),
  setVaccineForm: (form) => set((s) => ({ vaccineForm: typeof form === 'function' ? form(s.vaccineForm) : form })),
  startEditVaccine: (v) => set({
    vaccineForm: {
      vaccine_name: v.vaccine_name, applied_date: v.applied_date,
      expiry_date: v.expiry_date ?? '', next_dose_date: v.next_dose_date ?? '',
      veterinarian: v.veterinarian ?? '', clinic: v.clinic ?? '',
      batch_number: v.batch_number ?? '', notes: v.notes ?? '',
    },
    editingVaccineId: v.id,
    showVaccineForm: true,
  }),
  resetVaccineForm: () => set({ vaccineForm: EMPTY_VACCINE_FORM, showVaccineForm: false, editingVaccineId: null }),

  fetchVaccines: async (petId) => {
    const { data, error } = await supabase
      .from('pet_vaccines').select('*').eq('pet_id', petId).order('applied_date', { ascending: false });
    if (error) { Alert.alert('Error cargando vacunas', error.message); return; }
    set({ vaccines: (data as Vaccine[]) ?? [] });
  },

  fetchUpcomingVaccines: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    const petIds = (await supabase.from('pets').select('id').eq('owner_id', user.id)).data?.map((p: { id: number }) => p.id) ?? [];
    const { data } = await supabase
      .from('pet_vaccines').select('id, next_dose_date, expiry_date, pet_id').in('pet_id', petIds);
    if (!data) return;
    const today = new Date();
    const count = data.filter((v: { next_dose_date: string | null; expiry_date: string | null }) => {
      const d = v.next_dose_date ?? v.expiry_date;
      if (!d) return false;
      const date = new Date(d);
      return date >= today && date <= in30;
    }).length;
    set({ upcomingVaccinesCount: count });
  },

  saveVaccine: async (petId) => {
    const { vaccineForm: form, editingVaccineId: editingId } = get();
    const name = form.vaccine_name.trim();
    const date = form.applied_date.trim();
    if (!name || !date) {
      Alert.alert('Validación', 'Nombre y fecha de aplicación son requeridos');
      return false;
    }
    const payload = {
      pet_id: petId,
      vaccine_name: name, applied_date: date,
      expiry_date: normalizeStringOrNull(form.expiry_date),
      next_dose_date: normalizeStringOrNull(form.next_dose_date),
      veterinarian: normalizeStringOrNull(form.veterinarian),
      clinic: normalizeStringOrNull(form.clinic),
      batch_number: normalizeStringOrNull(form.batch_number),
      notes: normalizeStringOrNull(form.notes),
    };
    const query = editingId
      ? supabase.from('pet_vaccines').update(payload).eq('id', editingId)
      : supabase.from('pet_vaccines').insert(payload);
    const { error } = await query;
    if (error) { Alert.alert('Error guardando vacuna', error.message); return false; }
    const { data } = await supabase.from('pet_vaccines').select('*').eq('pet_id', petId).order('applied_date', { ascending: false });
    set({ vaccines: (data as Vaccine[]) ?? [] });
    Alert.alert(editingId ? 'Vacuna actualizada ✅' : 'Vacuna registrada ✅');
    get().resetVaccineForm();
    return true;
  },

  deleteVaccine: async (id, petId) => {
    Alert.alert('Eliminar vacuna', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('pet_vaccines').delete().eq('id', id);
          if (error) { Alert.alert('Error', error.message); return; }
          const { data } = await supabase.from('pet_vaccines').select('*').eq('pet_id', petId).order('applied_date', { ascending: false });
          set({ vaccines: (data as Vaccine[]) ?? [] });
        },
      },
    ]);
  },

  clearVaccines: () => set({ vaccines: [], upcomingVaccinesCount: 0 }),
}));
