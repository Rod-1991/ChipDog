import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import { C } from '../constants/colors';
import { autoFormatDate } from '../utils/helpers';
import Card from '../components/Card';
import InfoRow from '../components/InfoRow';
import type { VetAttachment, VetRecord } from '../types';

type VetForm = {
  date: string;
  doctor: string;
  clinic: string;
  reason: string;
  diagnosis: string;
  treatment: string;
  description: string;
  attachments: VetAttachment[];
};

type PetVetHistoryScreenProps = {
  vetView: 'list' | 'detail' | 'form';
  setVetView: (v: 'list' | 'detail' | 'form') => void;
  vetHistory: VetRecord[];
  selectedVetRecord: VetRecord | null;
  setSelectedVetRecord: (r: VetRecord | null) => void;
  vetForm: VetForm;
  setVetForm: (fn: (p: VetForm) => VetForm) => void;
  symptomText: string;
  setSymptomText: (v: string) => void;
  editingVetRecordId: string | null;
  loading: boolean;
  saveVetRecord: () => void;
  deleteVetRecord: () => void;
  resetVetForm: () => void;
  addPhotoAttachmentToForm: () => void;
  addPdfAttachmentToForm: () => void;
  renderEditableAttachmentChip: (att: VetAttachment) => React.ReactElement;
  renderAttachmentChip: (att: VetAttachment) => React.ReactElement;
};

export default function PetVetHistoryScreen({
  vetView, setVetView, vetHistory, selectedVetRecord, setSelectedVetRecord,
  vetForm, setVetForm, symptomText, setSymptomText, editingVetRecordId,
  loading, saveVetRecord, deleteVetRecord, resetVetForm,
  addPhotoAttachmentToForm, addPdfAttachmentToForm,
  renderEditableAttachmentChip, renderAttachmentChip,
}: PetVetHistoryScreenProps) {

  // ── VISTA FORMULARIO (nuevo / editar) ──
  if (vetView === 'form') {
    return (
      <View style={styles.form}>
        <Card title="🏥  Visita" accent={C.primary}>
          <Text style={styles.fieldLabel}>Fecha *</Text>
          <TextInput style={styles.input} placeholder="dd/mm/aaaa"
            placeholderTextColor={C.textMuted}
            value={vetForm.date}
            onChangeText={(v) => setVetForm((p) => ({ ...p, date: autoFormatDate(v) }))}
            keyboardType="number-pad" maxLength={10} />

          <Text style={styles.fieldLabel}>Motivo de la consulta *</Text>
          <TextInput style={styles.input} placeholder='Ej: "Control general", "Vómitos"'
            placeholderTextColor={C.textMuted}
            value={vetForm.reason}
            onChangeText={(v) => setVetForm((p) => ({ ...p, reason: v }))} />

          <Text style={styles.fieldLabel}>Veterinario</Text>
          <TextInput style={styles.input} placeholder="Dr. Nombre Apellido"
            placeholderTextColor={C.textMuted}
            value={vetForm.doctor}
            onChangeText={(v) => setVetForm((p) => ({ ...p, doctor: v }))} />

          <Text style={styles.fieldLabel}>Clínica</Text>
          <TextInput style={styles.input} placeholder="Nombre de la clínica"
            placeholderTextColor={C.textMuted}
            value={vetForm.clinic}
            onChangeText={(v) => setVetForm((p) => ({ ...p, clinic: v }))} />
        </Card>

        <Card title="🩺  Clínico" accent={C.success}>
          <Text style={styles.fieldLabel}>Síntomas</Text>
          <TextInput style={[styles.input, styles.multiline]} multiline
            placeholder="Ej: Vómitos, letargo, fiebre (separados por coma)"
            placeholderTextColor={C.textMuted}
            value={symptomText}
            onChangeText={setSymptomText} />

          <Text style={styles.fieldLabel}>Diagnóstico</Text>
          <TextInput style={[styles.input, styles.multiline]} multiline
            placeholder='Ej: "Gastroenteritis leve"'
            placeholderTextColor={C.textMuted}
            value={vetForm.diagnosis}
            onChangeText={(v) => setVetForm((p) => ({ ...p, diagnosis: v }))} />

          <Text style={styles.fieldLabel}>Tratamiento indicado</Text>
          <TextInput style={[styles.input, styles.multiline]} multiline
            placeholder="Indicaciones del veterinario"
            placeholderTextColor={C.textMuted}
            value={vetForm.treatment}
            onChangeText={(v) => setVetForm((p) => ({ ...p, treatment: v }))} />

          <Text style={styles.fieldLabel}>Resumen / notas adicionales</Text>
          <TextInput style={[styles.input, styles.multiline]} multiline
            placeholder="Cualquier detalle importante de la visita"
            placeholderTextColor={C.textMuted}
            value={vetForm.description}
            onChangeText={(v) => setVetForm((p) => ({ ...p, description: v }))} />
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

        <TouchableOpacity style={styles.btnPrimary} onPress={saveVetRecord} disabled={loading} activeOpacity={0.85}>
          <Text style={styles.btnPrimaryText}>{loading ? 'Guardando...' : (editingVetRecordId ? 'Guardar cambios' : 'Guardar registro')}</Text>
        </TouchableOpacity>

        {editingVetRecordId ? (
          <TouchableOpacity
            style={{ backgroundColor: C.dangerLight, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
            onPress={deleteVetRecord} disabled={loading} activeOpacity={0.85}>
            <Text style={{ color: C.danger, fontWeight: '700', fontSize: 15 }}>Eliminar registro</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  // ── VISTA DETALLE ──
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
            <>
              <Text style={[styles.rowLabel, { marginTop: 4 }]}>Resumen</Text>
              <Text style={{ color: C.text, lineHeight: 20 }}>{rec.description}</Text>
            </>
          ) : null}
        </Card>

        <Card title="📎  Adjuntos" accent={C.accent}>
          {rec.attachments.length ? (
            <View style={{ gap: 8 }}>{rec.attachments.map(renderAttachmentChip)}</View>
          ) : (
            <Text style={{ color: C.textMuted }}>Sin adjuntos</Text>
          )}
        </Card>
      </View>
    );
  }

  // ── VISTA LISTA ──
  return (
    <View style={styles.form}>
      <TouchableOpacity style={styles.addPetCta} onPress={() => { resetVetForm(); setVetView('form'); }} activeOpacity={0.85}>
        <Text style={styles.addPetCtaText}>+  Nuevo registro</Text>
      </TouchableOpacity>

      {vetHistory.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>🩺</Text>
          <Text style={styles.emptyStateTitle}>Sin registros todavía</Text>
          <Text style={styles.emptyStateHint}>Cada visita al veterinario quedará guardada aquí.</Text>
        </View>
      ) : (
        vetHistory.map((record) => (
          <TouchableOpacity key={record.id} style={styles.vetHistoryCard}
            onPress={() => { setSelectedVetRecord(record); setVetView('detail'); }}
            activeOpacity={0.85}>
            <View style={styles.vetHistoryDateBadge}>
              <Text style={styles.vetHistoryDateText}>{record.date}</Text>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.vetHistoryReason}>{record.reason}</Text>
              {(record.doctor || record.clinic) ? (
                <Text style={styles.vetHistoryMeta}>
                  {[record.doctor, record.clinic].filter(Boolean).join(' · ')}
                </Text>
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
        ))
      )}
    </View>
  );
}
