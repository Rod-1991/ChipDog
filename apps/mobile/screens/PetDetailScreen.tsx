import React, { useState } from 'react';
import { Alert, Image, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { C } from '../constants/colors';
import { styles } from '../styles';
import type { Pet, Screen, Vaccine, VetRecord, VetAttachment, WeightEntry, FoodEntry } from '../types';
import type { PetDraft } from './tabs/PetInfoTab';
import PetInfoTab from './tabs/PetInfoTab';
import PetContactTab from './tabs/PetContactTab';
import PetSaludTab from './tabs/PetSaludTab';
import PetNutricionTab from './tabs/PetNutricionTab';
import PetTagTab from './tabs/PetTagTab';

type Tab = 'info' | 'contacto' | 'salud' | 'nutricion' | 'tag';

const TAB_LABELS: { key: Tab; label: string }[] = [
  { key: 'info',      label: 'Info' },
  { key: 'contacto',  label: 'Contacto' },
  { key: 'salud',     label: 'Salud' },
  { key: 'nutricion', label: 'Nutrición' },
  { key: 'tag',       label: 'Tag' },
];

type VaccineForm = {
  vaccine_name: string; applied_date: string; expiry_date: string;
  next_dose_date: string; veterinarian: string; clinic: string;
  batch_number: string; notes: string;
};
type VetForm = {
  date: string; doctor: string; clinic: string; reason: string;
  diagnosis: string; treatment: string; description: string; attachments: VetAttachment[];
};
type VaccineStatusResult = { color: string; label: string };

type Props = {
  selectedPet: Pet | null;
  petPhotoSignedUrl: string | null;
  userId: string | null;
  loading: boolean;
  setLoading: (v: boolean) => void;
  setSelectedPet: (pet: Pet | null) => void;
  pickAndUploadPetPhoto: (petId: number) => void;
  openLostMap: () => void;
  updatePetLostStatus: (petId: number, isLost: boolean) => void;
  fetchPets: () => Promise<void>;
  petDraft: PetDraft;
  setPetDraft: (fn: (p: PetDraft) => PetDraft) => void;
  showProfileBirthCalendar: boolean;
  setShowProfileBirthCalendar: (fn: (v: boolean) => boolean) => void;
  profileBirthCalendarMonth: Date;
  setProfileBirthCalendarMonth: (fn: (p: Date) => Date) => void;
  savePetProfile: () => void;
  vaccines: Vaccine[];
  showVaccineForm: boolean; setShowVaccineForm: (v: boolean) => void;
  editingVaccineId: number | null; setEditingVaccineId: (id: number | null) => void;
  vaccineForm: VaccineForm; setVaccineForm: (fn: (p: VaccineForm) => VaccineForm) => void;
  saveVaccine: () => void; deleteVaccine: (id: number) => void;
  resetVaccineForm: () => void; startEditVaccine: (v: Vaccine) => void;
  vaccineStatus: (v: Vaccine) => VaccineStatusResult;
  vetView: 'list' | 'detail' | 'form'; setVetView: (v: 'list' | 'detail' | 'form') => void;
  vetHistory: VetRecord[];
  selectedVetRecord: VetRecord | null; setSelectedVetRecord: (r: VetRecord | null) => void;
  vetForm: VetForm; setVetForm: (fn: (p: VetForm) => VetForm) => void;
  symptomText: string; setSymptomText: (v: string) => void;
  editingVetRecordId: string | null;
  saveVetRecord: () => void; deleteVetRecord: () => void; resetVetForm: () => void;
  addPhotoAttachmentToForm: () => void; addPdfAttachmentToForm: () => void;
  renderEditableAttachmentChip: (att: VetAttachment) => React.ReactElement;
  renderAttachmentChip: (att: VetAttachment) => React.ReactElement;
  linkTagCode: string;
  linkTagMode: 'choose' | 'nfc' | 'qr'; setLinkTagMode: (m: 'choose' | 'nfc' | 'qr') => void;
  nfcStatus: 'idle' | 'scanning' | 'success' | 'error'; setNfcStatus: (s: 'idle' | 'scanning' | 'success' | 'error') => void;
  nfcError: string; setNfcError: (v: string) => void;
  writeNfcTag: () => void; saveLinkTagCode: (code: string) => Promise<boolean>;
  weightHistory: WeightEntry[];
  foodHistory: FoodEntry[];
  saveWeightEntry: (petId: number, weight_kg: number, measured_at: string, notes: string) => Promise<void>;
  deleteWeightEntry: (id: number, petId: number) => Promise<void>;
  saveFoodEntry: (petId: number, food_brand: string, started_at: string, notes: string) => Promise<void>;
  deleteFoodEntry: (id: number, petId: number) => Promise<void>;
  setScreen: (s: Screen) => void;
};

function profilePct(pet: Pet, draft: PetDraft): number {
  const fields = [
    pet.photo_url, draft.sex, draft.birth_date_text, draft.weight_kg,
    pet.breed, draft.color, draft.chip_number,
    draft.contact_primary_name, draft.owner_phone,
  ];
  return Math.round(fields.filter(Boolean).length / fields.length * 100);
}

export default function PetDetailScreen({
  selectedPet, petPhotoSignedUrl, userId, loading, setLoading, setSelectedPet,
  pickAndUploadPetPhoto, openLostMap, updatePetLostStatus, fetchPets,
  petDraft, setPetDraft, showProfileBirthCalendar, setShowProfileBirthCalendar,
  profileBirthCalendarMonth, setProfileBirthCalendarMonth, savePetProfile,
  vaccines, showVaccineForm, setShowVaccineForm, editingVaccineId, setEditingVaccineId,
  vaccineForm, setVaccineForm, saveVaccine, deleteVaccine, resetVaccineForm, startEditVaccine, vaccineStatus,
  vetView, setVetView, vetHistory, selectedVetRecord, setSelectedVetRecord,
  vetForm, setVetForm, symptomText, setSymptomText, editingVetRecordId,
  saveVetRecord, deleteVetRecord, resetVetForm,
  addPhotoAttachmentToForm, addPdfAttachmentToForm,
  renderEditableAttachmentChip, renderAttachmentChip,
  linkTagCode, linkTagMode, setLinkTagMode, nfcStatus, setNfcStatus, nfcError, setNfcError,
  writeNfcTag, saveLinkTagCode,
  weightHistory, foodHistory, saveWeightEntry, deleteWeightEntry, saveFoodEntry, deleteFoodEntry,
  setScreen,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [isEditing, setIsEditing] = useState(false);

  // Títulos para el header de pantalla completa
  const fullScreenTitles: Record<Tab, string> = {
    info: 'Editar información',
    contacto: 'Editar contacto',
    salud: 'Editar salud',
    nutricion: 'Editar nutrición',
    tag: 'Tag',
  };

  // ¿Estamos en modo formulario/edición a pantalla completa?
  const isFullForm =
    isEditing ||
    showVaccineForm ||
    vetView === 'form' ||
    vetView === 'detail';

  if (!selectedPet) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.textMuted }}>No hay mascota seleccionada.</Text>
        <TouchableOpacity onPress={() => setScreen('PetList')} style={{ marginTop: 12 }}>
          <Text style={{ color: C.primary, fontWeight: '700' }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOwner = !selectedPet.owner_id || !userId || selectedPet.owner_id === userId;
  const pct = profilePct(selectedPet, petDraft);
  const pctColor = pct >= 80 ? C.success : pct >= 40 ? C.warning : C.danger;

  // Vacuna próxima en 30 días
  const today = new Date();
  const in30 = new Date(); in30.setDate(today.getDate() + 30);
  const upcomingVaccine = vaccines.find(v => {
    const d = v.next_dose_date ?? v.expiry_date;
    if (!d) return false;
    const date = new Date(d);
    return date >= today && date <= in30;
  });

  // ── MODO PANTALLA COMPLETA (edición / formulario) ──
  if (isFullForm) {
    const title = showVaccineForm
      ? (editingVaccineId ? 'Editar vacuna' : 'Nueva vacuna')
      : vetView === 'form'
        ? (editingVetRecordId ? 'Editar visita' : 'Nueva visita')
        : vetView === 'detail'
          ? 'Detalle visita'
          : fullScreenTitles[activeTab];

    const handleBack = () => {
      if (showVaccineForm) { resetVaccineForm(); setShowVaccineForm(false); return; }
      if (vetView === 'form') { resetVetForm(); setVetView('list'); return; }
      if (vetView === 'detail') { setSelectedVetRecord(null); setVetView('list'); return; }
      setIsEditing(false);
    };

    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {/* Header pantalla completa */}
        <View style={{
          backgroundColor: C.primaryDark,
          paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
          flexDirection: 'row', alignItems: 'center', gap: 12,
        }}>
          <TouchableOpacity onPress={handleBack} activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ fontSize: 22, color: C.white, lineHeight: 26 }}>‹</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '900', color: C.white, flex: 1 }}>{title}</Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '700' }}>{selectedPet.name}</Text>
        </View>

        <ScrollView
          key={`fullform-${activeTab}-${showVaccineForm}-${vetView}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {activeTab === 'info' && (
            <PetInfoTab selectedPet={selectedPet} isEditing={isEditing} setIsEditing={setIsEditing}
              petDraft={petDraft} setPetDraft={setPetDraft}
              showBirthCalendar={showProfileBirthCalendar} setShowBirthCalendar={setShowProfileBirthCalendar}
              birthCalendarMonth={profileBirthCalendarMonth} setBirthCalendarMonth={setProfileBirthCalendarMonth}
              loading={loading} savePetProfile={savePetProfile} />
          )}
          {activeTab === 'contacto' && (
            <PetContactTab selectedPet={selectedPet} isEditing={isEditing} setIsEditing={setIsEditing}
              petDraft={petDraft} setPetDraft={setPetDraft}
              loading={loading} savePetProfile={savePetProfile} />
          )}
          {activeTab === 'salud' && (
            <PetSaludTab selectedPet={selectedPet}
              vaccines={vaccines} showVaccineForm={showVaccineForm} setShowVaccineForm={setShowVaccineForm}
              editingVaccineId={editingVaccineId} setEditingVaccineId={setEditingVaccineId}
              vaccineForm={vaccineForm} setVaccineForm={setVaccineForm}
              saveVaccine={saveVaccine} deleteVaccine={deleteVaccine}
              resetVaccineForm={resetVaccineForm} startEditVaccine={startEditVaccine} vaccineStatus={vaccineStatus}
              vetView={vetView} setVetView={setVetView} vetHistory={vetHistory}
              selectedVetRecord={selectedVetRecord} setSelectedVetRecord={setSelectedVetRecord}
              vetForm={vetForm} setVetForm={setVetForm}
              symptomText={symptomText} setSymptomText={setSymptomText} editingVetRecordId={editingVetRecordId}
              saveVetRecord={saveVetRecord} deleteVetRecord={deleteVetRecord} resetVetForm={resetVetForm}
              addPhotoAttachmentToForm={addPhotoAttachmentToForm} addPdfAttachmentToForm={addPdfAttachmentToForm}
              renderEditableAttachmentChip={renderEditableAttachmentChip} renderAttachmentChip={renderAttachmentChip}
              loading={loading} />
          )}
          {activeTab === 'nutricion' && (
            <PetNutricionTab isEditing={isEditing} setIsEditing={setIsEditing}
              petDraft={petDraft} setPetDraft={setPetDraft}
              loading={loading} savePetProfile={savePetProfile}
              selectedPet={selectedPet}
              weightHistory={weightHistory} foodHistory={foodHistory}
              saveWeightEntry={saveWeightEntry} deleteWeightEntry={deleteWeightEntry}
              saveFoodEntry={saveFoodEntry} deleteFoodEntry={deleteFoodEntry} />
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>

      {/* ── BLOQUE FIJO: foto + name card + tabs ── */}
      <View>
        {/* Foto cover full-width */}
        <TouchableOpacity
          onPress={() => pickAndUploadPetPhoto(selectedPet.id)}
          disabled={loading}
          activeOpacity={0.92}
          style={{ height: 220, backgroundColor: C.primaryLight }}
        >
          {petPhotoSignedUrl ? (
            <Image source={{ uri: petPhotoSignedUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 80 }}>
                {selectedPet.species === 'dog' ? '🐕' : selectedPet.species === 'cat' ? '🐈' : '🐾'}
              </Text>
            </View>
          )}
          {/* Overlay botón cámara */}
          <View style={{
            position: 'absolute', bottom: 12, right: 14,
            backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 20,
            paddingHorizontal: 12, paddingVertical: 6,
            flexDirection: 'row', alignItems: 'center', gap: 6,
          }}>
            <Text style={{ fontSize: 14 }}>📷</Text>
            <Text style={{ color: C.white, fontSize: 11, fontWeight: '800' }}>Cambiar foto</Text>
          </View>
          {/* Padding top para status bar */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 56, backgroundColor: 'rgba(0,0,0,0.25)' }} />
        </TouchableOpacity>

        {/* Name card */}
        <View style={{ paddingHorizontal: 14, marginTop: -20 }}>
          <View style={{
            backgroundColor: C.white, borderRadius: 22,
            padding: 16, paddingHorizontal: 18,
            borderWidth: 1, borderColor: C.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 24, fontWeight: '900', color: C.dark }}>{selectedPet.name}</Text>
                <Text style={{ fontSize: 12, color: C.textMuted, fontWeight: '700', marginTop: 2 }}>
                  {selectedPet.breed ?? (selectedPet.species === 'dog' ? 'Perro' : selectedPet.species === 'cat' ? 'Gato' : 'Mascota')}
                  {petDraft.sex ? ` · ${petDraft.sex}` : ''}
                </Text>
              </View>
              {/* % perfil */}
              <View style={{ alignItems: 'center', gap: 2 }}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: pctColor }}>{pct}%</Text>
                <Text style={{ fontSize: 9, fontWeight: '800', color: C.textMuted }}>PERFIL</Text>
              </View>
            </View>

            {/* Tags */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
              {petDraft.birth_year ? (
                <View style={{ backgroundColor: C.primaryLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: C.primaryDark }}>
                    {new Date().getFullYear() - parseInt(petDraft.birth_year)} años
                  </Text>
                </View>
              ) : null}
              {petDraft.weight_kg ? (
                <View style={{ backgroundColor: C.primaryLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: C.primaryDark }}>{petDraft.weight_kg} kg</Text>
                </View>
              ) : null}
              <View style={{
                backgroundColor: selectedPet.is_lost ? '#FFF0E6' : C.primaryLight,
                borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4,
              }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: selectedPet.is_lost ? '#7A3A10' : C.primaryDark }}>
                  {selectedPet.is_lost ? '⚠ Perdida' : '🏠 En casa'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Alertas y switch perdido */}
        <View style={{ paddingHorizontal: 16, paddingTop: 10, gap: 8 }}>
          {upcomingVaccine && (
            <View style={{ backgroundColor: '#FFF8E1', borderRadius: 14, padding: 11, paddingHorizontal: 14,
              flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#FFECB3' }}>
              <Text style={{ fontSize: 18 }}>⚠️</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#7A4500', flex: 1 }}>
                {upcomingVaccine.vaccine_name} vence pronto
              </Text>
            </View>
          )}
          {isOwner && (
            <View style={{ backgroundColor: C.white, borderRadius: 16, padding: 14,
              borderWidth: 1, borderColor: C.border }}>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>🚨  Modo perdido</Text>
                <Switch
                  value={selectedPet.is_lost}
                  onValueChange={(v) => v ? openLostMap() : updatePetLostStatus(selectedPet.id, false)}
                  disabled={loading}
                  trackColor={{ false: C.border, true: C.danger }}
                  thumbColor={C.white}
                />
              </View>
              {selectedPet.is_lost && (
                <TouchableOpacity onPress={openLostMap} style={{ marginTop: 8 }}>
                  <Text style={{ color: C.primary, fontWeight: '700', fontSize: 13 }}>📍 Editar ubicación y radio</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Tabs fijos */}
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}>
          <View style={{ flexDirection: 'row', backgroundColor: C.white, borderRadius: 14,
            padding: 4, borderWidth: 1, borderColor: C.border }}>
            {TAB_LABELS.map(t => (
              <TouchableOpacity
                key={t.key}
                style={{
                  flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
                  backgroundColor: activeTab === t.key ? C.primaryDark : 'transparent',
                }}
                onPress={() => { setActiveTab(t.key); setIsEditing(false); }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: activeTab === t.key ? C.white : C.textMuted }}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* ── CONTENIDO DEL TAB (scrolleable) ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'info' && (
          <PetInfoTab
            selectedPet={selectedPet}
            isEditing={isEditing} setIsEditing={setIsEditing}
            petDraft={petDraft} setPetDraft={setPetDraft}
            showBirthCalendar={showProfileBirthCalendar} setShowBirthCalendar={setShowProfileBirthCalendar}
            birthCalendarMonth={profileBirthCalendarMonth} setBirthCalendarMonth={setProfileBirthCalendarMonth}
            loading={loading} savePetProfile={savePetProfile}
          />
        )}
        {activeTab === 'contacto' && (
          <PetContactTab
            selectedPet={selectedPet}
            isEditing={isEditing} setIsEditing={setIsEditing}
            petDraft={petDraft} setPetDraft={setPetDraft}
            loading={loading} savePetProfile={savePetProfile}
          />
        )}
        {activeTab === 'salud' && (
          <PetSaludTab
            selectedPet={selectedPet}
            vaccines={vaccines}
            showVaccineForm={showVaccineForm} setShowVaccineForm={setShowVaccineForm}
            editingVaccineId={editingVaccineId} setEditingVaccineId={setEditingVaccineId}
            vaccineForm={vaccineForm} setVaccineForm={setVaccineForm}
            saveVaccine={saveVaccine} deleteVaccine={deleteVaccine}
            resetVaccineForm={resetVaccineForm} startEditVaccine={startEditVaccine}
            vaccineStatus={vaccineStatus}
            vetView={vetView} setVetView={setVetView}
            vetHistory={vetHistory}
            selectedVetRecord={selectedVetRecord} setSelectedVetRecord={setSelectedVetRecord}
            vetForm={vetForm} setVetForm={setVetForm}
            symptomText={symptomText} setSymptomText={setSymptomText}
            editingVetRecordId={editingVetRecordId}
            saveVetRecord={saveVetRecord} deleteVetRecord={deleteVetRecord} resetVetForm={resetVetForm}
            addPhotoAttachmentToForm={addPhotoAttachmentToForm} addPdfAttachmentToForm={addPdfAttachmentToForm}
            renderEditableAttachmentChip={renderEditableAttachmentChip} renderAttachmentChip={renderAttachmentChip}
            loading={loading}
          />
        )}
        {activeTab === 'nutricion' && (
          <PetNutricionTab
            isEditing={isEditing} setIsEditing={setIsEditing}
            petDraft={petDraft} setPetDraft={setPetDraft}
            loading={loading} savePetProfile={savePetProfile}
            selectedPet={selectedPet}
            weightHistory={weightHistory} foodHistory={foodHistory}
            saveWeightEntry={saveWeightEntry} deleteWeightEntry={deleteWeightEntry}
            saveFoodEntry={saveFoodEntry} deleteFoodEntry={deleteFoodEntry}
          />
        )}
        {activeTab === 'tag' && (
          <>
            {isOwner ? (
              <>
                <PetTagTab
                  selectedPet={selectedPet}
                  linkTagCode={linkTagCode} linkTagMode={linkTagMode} setLinkTagMode={setLinkTagMode}
                  nfcStatus={nfcStatus} setNfcStatus={setNfcStatus} nfcError={nfcError} setNfcError={setNfcError}
                  loading={loading} writeNfcTag={writeNfcTag} saveLinkTagCode={saveLinkTagCode}
                />
                {/* Co-dueños solo en tab Tag */}
                <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
                  <TouchableOpacity
                    style={{ backgroundColor: C.dark, borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}
                    onPress={() => setScreen('PetMembers')} activeOpacity={0.85}>
                    <Text style={{ color: C.white, fontWeight: '800', fontSize: 15 }}>👥  Co-dueños</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 32 }}>
                <Text style={{ fontSize: 40 }}>🏷️</Text>
                <Text style={{ color: C.textMuted, fontWeight: '600', marginTop: 8, textAlign: 'center' }}>
                  Solo el dueño puede gestionar el tag.
                </Text>
              </View>
            )}
          </>
        )}

        {/* Eliminar mascota */}
        {selectedPet.owner_id === userId && (
          <TouchableOpacity
            style={{ alignItems: 'center', paddingVertical: 20, marginTop: 4 }}
            onPress={() => {
              Alert.alert(
                'Eliminar mascota',
                `¿Estás seguro que quieres eliminar a ${selectedPet.name}? Esta acción no se puede deshacer.`,
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Eliminar', style: 'destructive', onPress: async () => {
                    setLoading(true);
                    try {
                      const { error } = await supabase.from('pets').delete().eq('id', selectedPet.id);
                      if (error) { Alert.alert('Error', error.message); return; }
                      setSelectedPet(null);
                      await fetchPets();
                      setScreen('PetList');
                    } finally { setLoading(false); }
                  }}
                ]
              );
            }}
            activeOpacity={0.7}>
            <Text style={{ color: C.danger, fontWeight: '600', fontSize: 14 }}>Eliminar mascota</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Navbar fija */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border,
        flexDirection: 'row', justifyContent: 'space-around',
        paddingVertical: 10, paddingBottom: 24,
      }}>
        {[
          { icon: '🏠', label: 'Inicio', target: 'Home' as Screen },
          { icon: '🐾', label: 'Mascotas', target: 'PetList' as Screen },
          { icon: '🗺️', label: 'Mapa', target: 'NearbyMap' as Screen },
          { icon: '👤', label: 'Perfil', target: 'Profile' as Screen },
        ].map(tab => (
          <TouchableOpacity key={tab.label} style={{ alignItems: 'center', gap: 3 }}
            activeOpacity={0.7} onPress={() => setScreen(tab.target)}>
            <Text style={{ fontSize: 20 }}>{tab.icon}</Text>
            <Text style={{ fontSize: 9, fontWeight: '800', color: C.textMuted }}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
