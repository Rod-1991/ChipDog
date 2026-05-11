import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../../styles';
import { C } from '../../constants/colors';
import { autoFormatDate } from '../../utils/helpers';
import Card from '../../components/Card';
import InfoRow from '../../components/InfoRow';
import type { Vaccine, VetRecord, VetAttachment } from '../../types';
import { useAppStore } from '../../store/app';
import { usePetsStore } from '../../store/pets';
import { useVaccinesStore } from '../../store/vaccines';
import { useVetStore } from '../../store/vet';

type SubTab = 'vacunas' | 'historial';

function vaccineStatus(v: Vaccine): { color: string; label: string } {
  const today = new Date();
  const ref = v.next_dose_date ?? v.expiry_date;
  if (!ref) return { color: C.success, label: 'Al día' };
  const d = new Date(ref);
  if (d < today) return { color: C.danger, label: 'Vencida' };
  const diffDays = Math.floor((d.getTime() - today.getTime()) / 86400000);
  if (diffDays <= 30) return { color: C.warning, label: 'Próxima' };
  return { color: C.success, label: 'Al día' };
}

export default function PetSaludTab() {
  const loading = useAppStore((s) => s.loading);
  const { selectedPet } = usePetsStore();
  const {
    vaccines, showVaccineForm, setShowVaccineForm, editingVaccineId, setEditingVaccineId,
    vaccineForm, setVaccineForm, saveVaccine, deleteVaccine, resetVaccineForm, startEditVaccine,
  } = useVaccinesStore();
  const {
    vetView, setVetView, vetHistory, selectedVetRecord, setSelectedVetRecord,
    vetForm, setVetForm, symptomText, setSymptomText, editingVetRecordId,
    saveVetRecord, deleteVetRecord, resetVetForm,
    pickPhotoAttachment, pickPdfAttachment, openAttachment,
  } = useVetStore();

  const [subTab, setSubTab] = React.useState<SubTab>('vacunas');

  if (!selectedPet) return null;

  const addPhotoAttachmentToForm = async () => {
    const att = await pickPhotoAttachment(selectedPet.id);
    if (att) setVetForm(p => ({ ...p, attachments: [...p.attachments, att] }));
  };

  const addPdfAttachmentToForm = async () => {
    const att = await pickPdfAttachment(selectedPet.id);
    if (att) setVetForm(p => ({ ...p, attachments: [...p.attachments, att] }));
  };

  const renderAttachmentChip = (att: VetAttachment): React.ReactElement => (
    <TouchableOpacity key={att.path}
      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface,
        borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.border, gap: 8 }}
      onPress={() => openAttachment(att)} activeOpacity={0.8}>
      <Text style={{ fontSize: 18 }}>{att.kind === 'pdf' ? '📄' : '🖼️'}</Text>
      <Text style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: '600' }} numberOfLines={1}>{att.name}</Text>
      <Text style={{ fontSize: 12, color: C.primary, fontWeight: '700' }}>Ver</Text>
    </TouchableOpacity>
  );

  const renderEditableAttachmentChip = (att: VetAttachment): React.ReactElement => (
    <View key={att.path}
      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface,
        borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.border, gap: 8 }}>
      <Text style={{ fontSize: 18 }}>{att.kind === 'pdf' ? '📄' : '🖼️'}</Text>
      <Text style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: '600' }} numberOfLines={1}>{att.name}</Text>
      <TouchableOpacity onPress={() => setVetForm(p => ({ ...p, attachments: p.attachments.filter(a => a.path !== att.path) }))}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={{ color: C.danger, fontSize: 18, fontWeight: '700' }}>×</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Formulario vacuna ──
  if (showVaccineForm) {
    return (
      <View style={styles.form}>
        <Card title="💉  Vacuna" accent={C.primary}>
          <Text style={styles.fieldLabel}>Nombre *</Text>
          <TextInput style={styles.input} placeholder='"Antirrábica", "Polivalente"'
            placeholderTextColor={C.textMuted} value={vaccineForm.vaccine_name}
            onChangeText={(v) => setVaccineForm(p => ({ ...p, vaccine_name: v }))} />
          <Text style={styles.fieldLabel}>Fecha de aplicación *</Text>
          <TextInput style={styles.input} placeholder="dd/mm/aaaa" placeholderTextColor={C.textMuted}
            value={vaccineForm.applied_date} keyboardType="number-pad" maxLength={10}
            onChangeText={(v) => setVaccineForm(p => ({ ...p, applied_date: autoFormatDate(v) }))} />
        </Card>
        <Card title="📅  Fechas de control" accent={C.success}>
          <Text style={styles.fieldLabel}>Fecha de vencimiento</Text>
          <TextInput style={styles.input} placeholder="dd/mm/aaaa" placeholderTextColor={C.textMuted}
            value={vaccineForm.expiry_date} keyboardType="number-pad" maxLength={10}
            onChangeText={(v) => setVaccineForm(p => ({ ...p, expiry_date: autoFormatDate(v) }))} />
          <Text style={styles.fieldLabel}>Próxima dosis</Text>
          <TextInput style={styles.input} placeholder="dd/mm/aaaa" placeholderTextColor={C.textMuted}
            value={vaccineForm.next_dose_date} keyboardType="number-pad" maxLength={10}
            onChangeText={(v) => setVaccineForm(p => ({ ...p, next_dose_date: autoFormatDate(v) }))} />
        </Card>
        <Card title="🏥  Clínica" accent={C.accent}>
          <Text style={styles.fieldLabel}>Veterinario</Text>
          <TextInput style={styles.input} placeholder="Dr. Nombre Apellido" placeholderTextColor={C.textMuted}
            value={vaccineForm.veterinarian} onChangeText={(v) => setVaccineForm(p => ({ ...p, veterinarian: v }))} />
          <Text style={styles.fieldLabel}>Clínica</Text>
          <TextInput style={styles.input} placeholder="Nombre de la clínica" placeholderTextColor={C.textMuted}
            value={vaccineForm.clinic} onChangeText={(v) => setVaccineForm(p => ({ ...p, clinic: v }))} />
          <Text style={styles.fieldLabel}>N° de lote</Text>
          <TextInput style={styles.input} placeholder="Ej: AB1234" placeholderTextColor={C.textMuted}
            value={vaccineForm.batch_number} onChangeText={(v) => setVaccineForm(p => ({ ...p, batch_number: v }))} />
        </Card>
        <Card title="📝  Notas" accent={C.warning}>
          <TextInput style={[styles.input, styles.multiline]} multiline placeholder="Observaciones"
            placeholderTextColor={C.textMuted} value={vaccineForm.notes}
            onChangeText={(v) => setVaccineForm(p => ({ ...p, notes: v }))} />
        </Card>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => saveVaccine(selectedPet.id)} disabled={loading} activeOpacity={0.85}>
          <Text style={styles.btnPrimaryText}>{loading ? 'Guardando...' : editingVaccineId ? 'Guardar cambios' : 'Registrar vacuna'}</Text>
        </TouchableOpacity>
        {editingVaccineId ? (
          <TouchableOpacity style={{ backgroundColor: C.dangerLight, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
            onPress={() => deleteVaccine(editingVaccineId, selectedPet.id)} disabled={loading} activeOpacity={0.85}>
            <Text style={{ color: C.danger, fontWeight: '700', fontSize: 15 }}>Eliminar vacuna</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.btnGhost} onPress={() => { resetVaccineForm(); setShowVaccineForm(false); }} activeOpacity={0.85}>
          <Text style={styles.btnGhostText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Formulario visita vet ──
  if (vetView === 'form') {
    return (
      <View style={styles.form}>
        <Card title="🏥  Visita" accent={C.primary}>
          <Text style={styles.fieldLabel}>Fecha *</Text>
          <TextInput style={styles.input} placeholder="dd/mm/aaaa" placeholderTextColor={C.textMuted}
            value={vetForm.date} keyboardType="number-pad" maxLength={10}
            onChangeText={(v) => setVetForm(p => ({ ...p, date: autoFormatDate(v) }))} />
          <Text style={styles.fieldLabel}>Motivo *</Text>
          <TextInput style={styles.input} placeholder='"Control general", "Vómitos"' placeholderTextColor={C.textMuted}
            value={vetForm.reason} onChangeText={(v) => setVetForm(p => ({ ...p, reason: v }))} />
          <Text style={styles.fieldLabel}>Veterinario</Text>
          <TextInput style={styles.input} placeholder="Dr. Nombre Apellido" placeholderTextColor={C.textMuted}
            value={vetForm.doctor} onChangeText={(v) => setVetForm(p => ({ ...p, doctor: v }))} />
          <Text style={styles.fieldLabel}>Clínica</Text>
          <TextInput style={styles.input} placeholder="Nombre de la clínica" placeholderTextColor={C.textMuted}
            value={vetForm.clinic} onChangeText={(v) => setVetForm(p => ({ ...p, clinic: v }))} />
        </Card>
        <Card title="🩺  Clínico" accent={C.success}>
          <Text style={styles.fieldLabel}>Síntomas</Text>
          <TextInput style={[styles.input, styles.multiline]} multiline placeholder="Ej: Vómitos, letargo (separados por coma)"
            placeholderTextColor={C.textMuted} value={symptomText} onChangeText={setSymptomText} />
          <Text style={styles.fieldLabel}>Diagnóstico</Text>
          <TextInput style={[styles.input, styles.multiline]} multiline placeholder='"Gastroenteritis leve"'
            placeholderTextColor={C.textMuted} value={vetForm.diagnosis}
            onChangeText={(v) => setVetForm(p => ({ ...p, diagnosis: v }))} />
          <Text style={styles.fieldLabel}>Tratamiento</Text>
          <TextInput style={[styles.input, styles.multiline]} multiline placeholder="Indicaciones del veterinario"
            placeholderTextColor={C.textMuted} value={vetForm.treatment}
            onChangeText={(v) => setVetForm(p => ({ ...p, treatment: v }))} />
          <Text style={styles.fieldLabel}>Notas adicionales</Text>
          <TextInput style={[styles.input, styles.multiline]} multiline placeholder="Cualquier detalle importante"
            placeholderTextColor={C.textMuted} value={vetForm.description}
            onChangeText={(v) => setVetForm(p => ({ ...p, description: v }))} />
        </Card>
        <Card title="📎  Adjuntos" accent={C.accent}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={[styles.btnPrimary, { flex: 1, paddingVertical: 10 }]} onPress={addPhotoAttachmentToForm} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>📷  Foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnPrimary, { flex: 1, paddingVertical: 10, backgroundColor: C.dark }]} onPress={addPdfAttachmentToForm} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>📄  PDF</Text>
            </TouchableOpacity>
          </View>
          {vetForm.attachments.length > 0 && (
            <View style={{ gap: 8, marginTop: 4 }}>{vetForm.attachments.map(renderEditableAttachmentChip)}</View>
          )}
        </Card>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => saveVetRecord(selectedPet.id)} disabled={loading} activeOpacity={0.85}>
          <Text style={styles.btnPrimaryText}>{loading ? 'Guardando...' : editingVetRecordId ? 'Guardar cambios' : 'Guardar registro'}</Text>
        </TouchableOpacity>
        {editingVetRecordId ? (
          <TouchableOpacity style={{ backgroundColor: C.dangerLight, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
            onPress={() => deleteVetRecord(selectedPet.id)} disabled={loading} activeOpacity={0.85}>
            <Text style={{ color: C.danger, fontWeight: '700', fontSize: 15 }}>Eliminar registro</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.btnGhost} onPress={() => { resetVetForm(); setVetView('list'); }} activeOpacity={0.85}>
          <Text style={styles.btnGhostText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Detalle visita vet ──
  if (vetView === 'detail' && selectedVetRecord) {
    const rec = selectedVetRecord;
    return (
      <View style={styles.form}>
        <Card title="🏥  Visita" accent={C.primary}>
          <InfoRow label="Fecha" value={rec.date} />
          <InfoRow label="Motivo" value={rec.reason} />
          <InfoRow label="Veterinario" value={rec.doctor} />
          <InfoRow label="Clínica" value={rec.clinic} />
        </Card>
        <Card title="🩺  Clínico" accent={C.success}>
          <InfoRow label="Síntomas" value={rec.symptoms.length ? rec.symptoms.join(', ') : null} />
          <InfoRow label="Diagnóstico" value={rec.diagnosis} />
          <InfoRow label="Tratamiento" value={rec.treatment} />
          {rec.description ? (
            <><Text style={[styles.rowLabel, { marginTop: 4 }]}>Resumen</Text>
            <Text style={{ color: C.text, lineHeight: 20 }}>{rec.description}</Text></>
          ) : null}
        </Card>
        <Card title="📎  Adjuntos" accent={C.accent}>
          {rec.attachments.length ? (
            <View style={{ gap: 8 }}>{rec.attachments.map(renderAttachmentChip)}</View>
          ) : <Text style={{ color: C.textMuted }}>Sin adjuntos</Text>}
        </Card>
        <TouchableOpacity style={styles.btnGhost} onPress={() => { setSelectedVetRecord(null); setVetView('list'); }} activeOpacity={0.85}>
          <Text style={styles.btnGhostText}>← Volver al historial</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Vista principal con sub-tabs ──
  return (
    <View style={styles.form}>
      <View style={{ flexDirection: 'row', backgroundColor: C.white, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: C.border, marginBottom: 14 }}>
        {(['vacunas', 'historial'] as SubTab[]).map(t => (
          <TouchableOpacity key={t} style={{ flex: 1, paddingVertical: 7, borderRadius: 10, alignItems: 'center',
            backgroundColor: subTab === t ? C.primaryDark : 'transparent' }}
            onPress={() => setSubTab(t)} activeOpacity={0.8}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: subTab === t ? C.white : C.textMuted }}>
              {t === 'vacunas' ? '💉 Vacunas' : '🏥 Historial'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {subTab === 'vacunas' && (
        <>
          <TouchableOpacity style={styles.addPetCta}
            onPress={() => { resetVaccineForm(); setShowVaccineForm(true); setEditingVaccineId(null); }}
            activeOpacity={0.85}>
            <Text style={styles.addPetCtaText}>+  Registrar vacuna</Text>
          </TouchableOpacity>
          {vaccines.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>💉</Text>
              <Text style={styles.emptyStateTitle}>Sin vacunas registradas</Text>
              <Text style={styles.emptyStateHint}>Registra las vacunas de {selectedPet.name} para mantenerlas al día.</Text>
            </View>
          ) : vaccines.map(v => {
            const status = vaccineStatus(v);
            return (
              <TouchableOpacity key={v.id} style={styles.vaccineCard} onPress={() => startEditVaccine(v)} activeOpacity={0.85}>
                <View style={[styles.vaccineStatusBar, { backgroundColor: status.color }]} />
                <View style={{ flex: 1, gap: 5 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.vaccineCardName}>{v.vaccine_name}</Text>
                    <View style={[styles.vaccineBadge, { backgroundColor: status.color + '22' }]}>
                      <Text style={[styles.vaccineBadgeText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.vaccineCardDate}>Aplicada: {v.applied_date}</Text>
                  {v.expiry_date ? <Text style={styles.vaccineCardDate}>Vence: {v.expiry_date}</Text> : null}
                  {v.next_dose_date ? <Text style={styles.vaccineCardDate}>Próxima dosis: {v.next_dose_date}</Text> : null}
                  {(v.veterinarian || v.clinic) ? (
                    <Text style={styles.vaccineCardMeta}>{[v.veterinarian, v.clinic].filter(Boolean).join(' · ')}</Text>
                  ) : null}
                </View>
                <Text style={styles.petCardArrow}>›</Text>
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {subTab === 'historial' && (
        <>
          <TouchableOpacity style={styles.addPetCta} onPress={() => { resetVetForm(); setVetView('form'); }} activeOpacity={0.85}>
            <Text style={styles.addPetCtaText}>+  Nuevo registro</Text>
          </TouchableOpacity>
          {vetHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>🩺</Text>
              <Text style={styles.emptyStateTitle}>Sin registros todavía</Text>
              <Text style={styles.emptyStateHint}>Cada visita al veterinario quedará guardada aquí.</Text>
            </View>
          ) : vetHistory.map(record => (
            <TouchableOpacity key={record.id} style={styles.vetHistoryCard}
              onPress={() => { setSelectedVetRecord(record); setVetView('detail'); }} activeOpacity={0.85}>
              <View style={styles.vetHistoryDateBadge}>
                <Text style={styles.vetHistoryDateText}>{record.date}</Text>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.vetHistoryReason}>{record.reason}</Text>
                {(record.doctor || record.clinic) ? (
                  <Text style={styles.vetHistoryMeta}>{[record.doctor, record.clinic].filter(Boolean).join(' · ')}</Text>
                ) : null}
                {record.symptoms.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {record.symptoms.slice(0, 3).map(s => (
                      <View key={s} style={{ backgroundColor: C.successLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 11, color: C.success, fontWeight: '600' }}>{s}</Text>
                      </View>
                    ))}
                    {record.symptoms.length > 3 && (
                      <View style={{ backgroundColor: C.surface, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 11, color: C.textMuted, fontWeight: '600' }}>+{record.symptoms.length - 3}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
              <Text style={styles.petCardArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </>
      )}
    </View>
  );
}
