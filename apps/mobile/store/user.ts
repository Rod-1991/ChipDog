import { create } from 'zustand';
import { Alert } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from '../lib/supabase';
import { loginSchema } from '@chipdog/shared';
import type { UserProfile } from '../types';

interface UserStore {
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userProfile: UserProfile | null;

  setUserId: (id: string | null) => void;
  setUserName: (name: string | null) => void;

  loadUserName: () => Promise<void>;
  loadUserProfile: () => Promise<void>;
  saveUserProfile: (draft: Omit<UserProfile, 'id'>) => Promise<boolean>;
  registerPushToken: () => Promise<void>;
  clearUser: () => void;
}

export const useUserStore = create<UserStore>((set, get) => ({
  userId: null,
  userName: null,
  userEmail: null,
  userProfile: null,

  setUserId: (userId) => set({ userId }),
  setUserName: (userName) => set({ userName }),

  loadUserName: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const name = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? null;
    set({ userName: name, userId: user.id, userEmail: user.email ?? null });
  },

  loadUserProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('user_profiles').select('*').eq('id', user.id).single();
    if (!data) return;
    set({ userProfile: data as UserProfile });
  },

  saveUserProfile: async (draft) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    if (!draft.first_name.trim() || !draft.last_name.trim()) {
      Alert.alert('Validación', 'Nombre y apellido son requeridos.'); return false;
    }
    if (!draft.phone.trim()) {
      Alert.alert('Validación', 'El teléfono es requerido.'); return false;
    }
    const { error } = await supabase.from('user_profiles').upsert({
      id: user.id,
      first_name: draft.first_name.trim(), last_name: draft.last_name.trim(),
      phone: draft.phone.trim(), rut: draft.rut.trim(), sex: draft.sex,
      birth_year: draft.birth_year, commune: draft.commune.trim(),
    }, { onConflict: 'id' });
    if (error) { Alert.alert('Error guardando perfil', error.message); return false; }
    await get().loadUserProfile();
    set({ userName: `${draft.first_name.trim()} ${draft.last_name.trim()}` });
    Alert.alert('Guardado ✅', 'Tu perfil fue actualizado.');
    return true;
  },

  registerPushToken: async () => {
    if (!Device.isDevice) return;
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('user_push_tokens')
      .upsert({ user_id: user.id, token, updated_at: new Date().toISOString() });
  },

  clearUser: () => set({ userId: null, userName: null, userEmail: null, userProfile: null }),
}));
