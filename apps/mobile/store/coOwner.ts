import { create } from 'zustand';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { usePetsStore } from './pets';
import type { PetMember, PetMemberInvitation } from '../types';

interface CoOwnerStore {
  petMembers: PetMember[];
  pendingInvitations: PetMemberInvitation[];

  loadPetMembers: (petId: number) => Promise<void>;
  loadPendingInvitations: () => Promise<void>;
  sendCoOwnerInvite: (petId: number, email: string) => Promise<boolean>;
  respondInvitation: (memberId: number, accept: boolean) => Promise<void>;
  removeCoOwner: (memberId: number, petId: number) => Promise<void>;
  clearCoOwner: () => void;
}

export const useCoOwnerStore = create<CoOwnerStore>((set, get) => ({
  petMembers: [],
  pendingInvitations: [],

  loadPetMembers: async (petId) => {
    const { data } = await supabase.from('pet_members').select('*').eq('pet_id', petId).order('created_at', { ascending: true });
    set({ petMembers: (data as PetMember[]) ?? [] });
  },

  loadPendingInvitations: async () => {
    const { data } = await supabase.rpc('get_my_pending_invitations');
    set({ pendingInvitations: (data as PetMemberInvitation[]) ?? [] });
  },

  sendCoOwnerInvite: async (petId, email) => {
    const { data: json, error } = await supabase.functions.invoke('invite-coowner', {
      body: { pet_id: petId, invited_email: email },
    });
    if (error) { Alert.alert('Error', error.message ?? 'No se pudo enviar la invitación.'); return false; }
    await get().loadPetMembers(petId);
    const msg = json.has_account
      ? `Se envió la invitación a ${email}. Recibirá una notificación en la app.`
      : `Se envió un email a ${email} para que descargue ChipDog y acepte la invitación.`;
    Alert.alert('Invitación enviada ✅', msg);
    return true;
  },

  respondInvitation: async (memberId, accept) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from('pet_members')
      .update({ status: accept ? 'accepted' : 'rejected', user_id: user.id, updated_at: new Date().toISOString() })
      .eq('id', memberId);
    if (error) { Alert.alert('Error', error.message); return; }
    await get().loadPendingInvitations();
    if (accept) {
      await usePetsStore.getState().fetchPets();
      Alert.alert('¡Bienvenido!', 'Ahora eres co-dueño de esta mascota. Aparecerá en tu lista.');
    }
  },

  removeCoOwner: async (memberId, petId) => {
    Alert.alert('Eliminar co-dueño', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('pet_members').delete().eq('id', memberId);
          if (error) { Alert.alert('Error', error.message); return; }
          await get().loadPetMembers(petId);
        },
      },
    ]);
  },

  clearCoOwner: () => set({ petMembers: [], pendingInvitations: [] }),
}));
