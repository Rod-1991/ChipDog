import { create } from 'zustand';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Linking } from 'react-native';
import { supabase, vetAttachmentsBucket } from '../lib/supabase';
import { sanitizeFilename } from '../utils/helpers';
import type { VetRecord, VetAttachment } from '../types';

export interface VetFormState {
  date: string;
  doctor: string;
  clinic: string;
  reason: string;
  diagnosis: string;
  treatment: string;
  description: string;
  attachments: VetAttachment[];
}

export const EMPTY_VET_FORM: VetFormState = {
  date: '', doctor: '', clinic: '', reason: '', diagnosis: '', treatment: '', description: '', attachments: [],
};

interface VetStore {
  vetHistory: VetRecord[];
  selectedVetRecord: VetRecord | null;
  editingVetRecordId: string | null;
  vetView: 'list' | 'detail' | 'form';
  vetForm: VetFormState;
  symptomText: string;

  setVetView: (v: 'list' | 'detail' | 'form') => void;
  setSelectedVetRecord: (r: VetRecord | null) => void;
  setEditingVetRecordId: (id: string | null) => void;
  setVetForm: (form: VetFormState | ((prev: VetFormState) => VetFormState)) => void;
  setSymptomText: (text: string) => void;
  startEditVetRecord: (record: VetRecord) => void;
  resetVetForm: () => void;

  loadVetHistory: (petId: number) => Promise<void>;
  saveVetRecord: (petId: number) => Promise<boolean>;
  deleteVetRecord: (petId: number) => Promise<void>;

  uploadVetAttachment: (args: {
    selectedPetId: number;
    sourceUri: string;
    fileName: string;
    mimeType: string;
    kind: 'photo' | 'pdf';
  }) => Promise<{ path: string; uri: string | undefined }>;

  pickPhotoAttachment: (selectedPetId: number) => Promise<VetAttachment | null>;
  pickPdfAttachment: (selectedPetId: number) => Promise<VetAttachment | null>;
  openAttachment: (attachment: VetAttachment) => Promise<void>;

  resetVetView: () => void;
  clearVet: () => void;
}

export const useVetStore = create<VetStore>((set, get) => ({
  vetHistory: [],
  selectedVetRecord: null,
  editingVetRecordId: null,
  vetView: 'list',
  vetForm: EMPTY_VET_FORM,
  symptomText: '',

  setVetView: (vetView) => set({ vetView }),
  setSelectedVetRecord: (selectedVetRecord) => set({ selectedVetRecord }),
  setEditingVetRecordId: (editingVetRecordId) => set({ editingVetRecordId }),
  setVetForm: (form) => set((s) => ({ vetForm: typeof form === 'function' ? form(s.vetForm) : form })),
  setSymptomText: (symptomText) => set({ symptomText }),
  startEditVetRecord: (record) => set({
    editingVetRecordId: record.id,
    vetForm: {
      date: record.date, doctor: record.doctor, clinic: record.clinic,
      reason: record.reason, diagnosis: record.diagnosis, treatment: record.treatment,
      description: record.description, attachments: record.attachments,
    },
    symptomText: record.symptoms.join(', '),
    vetView: 'form',
  }),
  resetVetForm: () => set({ vetForm: EMPTY_VET_FORM, symptomText: '', editingVetRecordId: null }),

  loadVetHistory: async (petId) => {
    const { data, error } = await supabase
      .from('pet_vet_records')
      .select('id,visit_date,doctor_name,clinic_name,reason,symptoms,diagnosis,treatment,description,attachments,reference_photos,created_at')
      .eq('pet_id', petId)
      .order('created_at', { ascending: false });
    if (error) { Alert.alert('Error cargando historial', error.message); return; }

    const mapped = ((data as any[]) ?? []).map((row) => ({
      id: String(row.id),
      date: row.visit_date ?? '',
      doctor: row.doctor_name ?? '',
      clinic: row.clinic_name ?? '',
      reason: row.reason ?? '',
      symptoms: Array.isArray(row.symptoms) ? row.symptoms : [],
      diagnosis: row.diagnosis ?? '',
      treatment: row.treatment ?? '',
      description: row.description ?? '',
      attachments: Array.isArray(row.attachments)
        ? row.attachments
            .map((item: any) => ({
              id: String(item?.id ?? `${row.id}-att`),
              kind: item?.kind === 'pdf' ? 'pdf' : 'photo',
              name: String(item?.name ?? 'Adjunto'),
              path: String(item?.path ?? ''),
              uri: undefined,
              mimeType: item?.mimeType ?? null,
            }))
            .filter((item: VetAttachment) => item.path)
        : [],
      referencePhotos: Array.isArray(row.reference_photos) ? row.reference_photos : [],
    })) as VetRecord[];

    const withUrls = await Promise.all(
      mapped.map(async (record) => ({
        ...record,
        attachments: await Promise.all(
          record.attachments.map(async (att) => {
            const { data: sd } = await supabase.storage.from(vetAttachmentsBucket).createSignedUrl(att.path, 3600);
            return { ...att, uri: sd?.signedUrl };
          })
        ),
      }))
    );

    const prev = get().selectedVetRecord;
    set({
      vetHistory: withUrls,
      selectedVetRecord: prev ? withUrls.find((r) => r.id === prev.id) ?? null : null,
      editingVetRecordId: get().editingVetRecordId && !withUrls.some((r) => r.id === get().editingVetRecordId) ? null : get().editingVetRecordId,
    });
  },

  saveVetRecord: async (petId) => {
    const { vetForm: form, editingVetRecordId: editingId, symptomText } = get();
    const date = form.date.trim();
    const reason = form.reason.trim();
    if (!date || !reason) {
      Alert.alert('Validación', 'Completa al menos Fecha y Motivo para guardar el registro.');
      return false;
    }
    const payload = {
      pet_id: petId, visit_date: date,
      doctor_name: form.doctor.trim() || null, clinic_name: form.clinic.trim() || null,
      reason,
      symptoms: symptomText.split(',').map((s) => s.trim()).filter(Boolean),
      diagnosis: form.diagnosis.trim() || null, treatment: form.treatment.trim() || null,
      description: form.description.trim() || null,
      attachments: form.attachments.map((item) => ({
        id: item.id, kind: item.kind, name: item.name, path: item.path, mimeType: item.mimeType ?? null,
      })),
      reference_photos: [],
    };
    const query = editingId
      ? supabase.from('pet_vet_records').update(payload).eq('id', editingId)
      : supabase.from('pet_vet_records').insert(payload);
    const { error } = await query;
    if (error) { Alert.alert('Error guardando historial', error.message); return false; }
    await get().loadVetHistory(petId);
    Alert.alert('Guardado ✅', editingId ? 'Registro actualizado.' : 'Registro clínico guardado en historial.');
    get().resetVetForm();
    set({ vetView: 'list' });
    return true;
  },

  deleteVetRecord: async (petId) => {
    const { editingVetRecordId: id } = get();
    if (!id) return;
    const { error } = await supabase.from('pet_vet_records').delete().eq('id', id);
    if (error) { Alert.alert('Error eliminando registro', error.message); return; }
    await get().loadVetHistory(petId);
    set({ selectedVetRecord: null, editingVetRecordId: null, vetView: 'list' });
    Alert.alert('Eliminado ✅', 'Registro eliminado correctamente.');
  },

  uploadVetAttachment: async ({ selectedPetId, sourceUri, fileName, mimeType, kind }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');
    const cleanName = sanitizeFilename(fileName || `${kind}-${Date.now()}`);
    const path = `${user.id}/${selectedPetId}/${Date.now()}-${cleanName}`;
    const response = await fetch(sourceUri);
    const bytes = await response.arrayBuffer();
    const { error } = await supabase.storage.from(vetAttachmentsBucket).upload(path, new Uint8Array(bytes), { upsert: false, contentType: mimeType });
    if (error) throw error;
    const { data: sd } = await supabase.storage.from(vetAttachmentsBucket).createSignedUrl(path, 3600);
    return { path, uri: sd?.signedUrl };
  },

  pickPhotoAttachment: async (selectedPetId) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permiso requerido', 'Necesitamos permiso para acceder a tu galería.'); return null; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: false, quality: 0.8 });
    if (result.canceled) return null;
    const asset = result.assets[0];
    const name = asset.fileName?.trim() || `foto-${Date.now()}.jpg`;
    try {
      const uploaded = await get().uploadVetAttachment({ selectedPetId, sourceUri: asset.uri, fileName: name, mimeType: asset.mimeType ?? 'image/jpeg', kind: 'photo' });
      return { id: `${Date.now()}-photo`, kind: 'photo', name, path: uploaded.path, uri: uploaded.uri, mimeType: asset.mimeType ?? 'image/jpeg' };
    } catch (err: any) {
      Alert.alert('Adjunto', err?.message ?? 'No se pudo subir la foto.');
      return null;
    }
  },

  pickPdfAttachment: async (selectedPetId) => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf'], copyToCacheDirectory: true, multiple: false });
    if (result.canceled) return null;
    const file = result.assets[0];
    try {
      const uploaded = await get().uploadVetAttachment({ selectedPetId, sourceUri: file.uri, fileName: file.name, mimeType: file.mimeType ?? 'application/pdf', kind: 'pdf' });
      return { id: `${Date.now()}-pdf`, kind: 'pdf', name: file.name, path: uploaded.path, uri: uploaded.uri, mimeType: file.mimeType ?? 'application/pdf' };
    } catch (err: any) {
      Alert.alert('Adjunto', err?.message ?? 'No se pudo subir el PDF.');
      return null;
    }
  },

  openAttachment: async (attachment) => {
    try {
      let url = attachment.uri;
      if (!url) {
        const { data, error } = await supabase.storage.from(vetAttachmentsBucket).createSignedUrl(attachment.path, 3600);
        if (error) { Alert.alert('Adjunto', error.message); return; }
        url = data.signedUrl;
      }
      await Linking.openURL(url);
    } catch (err: any) {
      Alert.alert('Adjunto', err?.message ?? 'No fue posible abrir el archivo.');
    }
  },

  resetVetView: () => set({ vetView: 'list', selectedVetRecord: null, editingVetRecordId: null }),
  clearVet: () => set({ vetHistory: [], selectedVetRecord: null, editingVetRecordId: null, vetView: 'list' }),
}));
