import { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { styles } from '../../styles';
import { C } from '../../constants/colors';
import Card from '../../components/Card';
import InfoRow from '../../components/InfoRow';
import type { FoodEntry, Pet, WeightEntry } from '../../types';
import type { PetDraft } from './PetInfoTab';

type Props = {
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  petDraft: PetDraft;
  setPetDraft: (fn: (p: PetDraft) => PetDraft) => void;
  loading: boolean;
  savePetProfile: () => void;
  selectedPet: Pet;
  weightHistory: WeightEntry[];
  foodHistory: FoodEntry[];
  saveWeightEntry: (petId: number, weight_kg: number, measured_at: string, notes: string) => Promise<void>;
  deleteWeightEntry: (id: number, petId: number) => Promise<void>;
  saveFoodEntry: (petId: number, food_brand: string, started_at: string, notes: string) => Promise<void>;
  deleteFoodEntry: (id: number, petId: number) => Promise<void>;
};

type SubTab = 'resumen' | 'peso' | 'comida';

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'peso',    label: 'Peso' },
  { key: 'comida',  label: 'Comida' },
];

// ── Mini SVG weight chart ─────────────────────────────────────────────────────
function WeightChart({ entries }: { entries: WeightEntry[] }) {
  const sorted = [...entries].sort((a, b) => a.measured_at.localeCompare(b.measured_at));
  if (sorted.length < 2) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
        <Text style={{ color: C.textMuted, fontSize: 12 }}>
          Agrega al menos 2 registros para ver el gráfico
        </Text>
      </View>
    );
  }

  const W = 300;
  const H = 140;
  const PAD = { top: 16, right: 16, bottom: 28, left: 36 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const weights = sorted.map(e => e.weight_kg);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  const scaleX = (i: number) => PAD.left + (i / (sorted.length - 1)) * chartW;
  const scaleY = (w: number) => PAD.top + chartH - ((w - minW) / range) * chartH;

  // Build SVG polyline path
  const pts = sorted.map((e, i) => `${scaleX(i)},${scaleY(e.weight_kg)}`);
  const d = 'M ' + pts.join(' L ');

  // Area fill
  const areaD = `M ${scaleX(0)},${PAD.top + chartH} L ${pts.join(' L ')} L ${scaleX(sorted.length - 1)},${PAD.top + chartH} Z`;

  // Y axis labels (3 levels)
  const yLabels = [minW, (minW + maxW) / 2, maxW].map(v => Math.round(v * 10) / 10);

  // X axis: show first, middle, last date (deduplicated)
  const xIndices = [...new Set([0, Math.floor((sorted.length - 1) / 2), sorted.length - 1])];
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <View style={{ alignItems: 'center', marginVertical: 8 }}>
      <Svg width={W} height={H}>
        {/* Grid lines */}
        {yLabels.map((_, idx) => {
          const y = scaleY(yLabels[idx]);
          return <Line key={`grid-${idx}`} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
            stroke={C.border} strokeWidth={1} />;
        })}
        {/* Y labels */}
        {yLabels.map((val, idx) => (
          <SvgText key={`ylabel-${idx}`} x={PAD.left - 4} y={scaleY(val) + 4}
            fontSize={9} fill={C.textMuted} textAnchor="end">{val}</SvgText>
        ))}
        {/* Area fill */}
        <Path d={areaD} fill={C.primary} fillOpacity={0.12} />
        {/* Line */}
        <Path d={d} fill="none" stroke={C.primary} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {/* Dots */}
        {sorted.map((e, i) => (
          <Circle key={`dot-${i}`} cx={scaleX(i)} cy={scaleY(e.weight_kg)}
            r={4} fill={C.primary} />
        ))}
        {/* X labels */}
        {xIndices.map(i => (
          <SvgText key={`xlabel-${i}`} x={scaleX(i)} y={H - 4}
            fontSize={9} fill={C.textMuted} textAnchor="middle">
            {fmtDate(sorted[i].measured_at)}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

// ── Helper: today as YYYY-MM-DD ───────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function PetNutricionTab({
  isEditing, setIsEditing, petDraft, setPetDraft, loading, savePetProfile,
  selectedPet, weightHistory, foodHistory,
  saveWeightEntry, deleteWeightEntry, saveFoodEntry, deleteFoodEntry,
}: Props) {
  const [subTab, setSubTab] = useState<SubTab>('resumen');

  // Weight form
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [wKg, setWKg] = useState('');
  const [wDate, setWDate] = useState(todayISO());
  const [wNotes, setWNotes] = useState('');
  const [savingW, setSavingW] = useState(false);

  // Food form
  const [showFoodForm, setShowFoodForm] = useState(false);
  const [fBrand, setFBrand] = useState('');
  const [fDate, setFDate] = useState(todayISO());
  const [fNotes, setFNotes] = useState('');
  const [savingF, setSavingF] = useState(false);

  const handleSaveWeight = async () => {
    if (!wKg || isNaN(parseFloat(wKg))) { Alert.alert('Ingresa un peso válido'); return; }
    setSavingW(true);
    try {
      await saveWeightEntry(selectedPet.id, parseFloat(wKg), wDate, wNotes);
      setWKg(''); setWDate(todayISO()); setWNotes('');
      setShowWeightForm(false);
    } finally { setSavingW(false); }
  };

  const handleSaveFood = async () => {
    if (!fBrand.trim()) { Alert.alert('Ingresa una marca/alimento'); return; }
    setSavingF(true);
    try {
      await saveFoodEntry(selectedPet.id, fBrand, fDate, fNotes);
      setFBrand(''); setFDate(todayISO()); setFNotes('');
      setShowFoodForm(false);
    } finally { setSavingF(false); }
  };

  const sorted = [...weightHistory].sort((a, b) => a.measured_at.localeCompare(b.measured_at));
  const latestWeight = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  const latestFood = foodHistory.length > 0
    ? [...foodHistory].sort((a, b) => b.started_at.localeCompare(a.started_at))[0]
    : null;

  const fmtDate = (iso: string) => {
    const d = new Date(iso + 'T12:00:00');
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  return (
    <View style={styles.form}>
      {/* Sub-tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: C.white, borderRadius: 12,
        padding: 3, borderWidth: 1, borderColor: C.border, marginBottom: 12 }}>
        {SUB_TABS.map(t => (
          <TouchableOpacity key={t.key} activeOpacity={0.8}
            style={{ flex: 1, paddingVertical: 7, borderRadius: 9, alignItems: 'center',
              backgroundColor: subTab === t.key ? C.primary : 'transparent' }}
            onPress={() => setSubTab(t.key)}>
            <Text style={{ fontSize: 11, fontWeight: '800',
              color: subTab === t.key ? C.white : C.textMuted }}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── RESUMEN ── */}
      {subTab === 'resumen' && (
        <>
          <Card title="🍖  Alimentación actual" accent={C.accent}>
            <InfoRow label="Marca / alimento" value={latestFood?.food_brand ?? petDraft.food_brand} />
            {latestFood && (
              <InfoRow label="Desde" value={fmtDate(latestFood.started_at)} />
            )}
            <Text style={[styles.rowLabel, { marginTop: 8 }]}>Notas</Text>
            <Text style={{ color: petDraft.food_notes ? C.text : C.textMuted, lineHeight: 20, marginTop: 4 }}>
              {petDraft.food_notes || '—'}
            </Text>
          </Card>

          <Card title="⚖️  Peso actual" accent={C.primary}>
            {latestWeight ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 32, fontWeight: '900', color: C.primary }}>
                  {latestWeight.weight_kg} kg
                </Text>
                <Text style={{ fontSize: 12, color: C.textMuted }}>
                  {fmtDate(latestWeight.measured_at)}
                </Text>
              </View>
            ) : (
              <Text style={{ color: C.textMuted, fontSize: 13 }}>Sin registros de peso aún</Text>
            )}
            {sorted.length >= 2 && (() => {
              const prev = sorted[sorted.length - 2];
              const diff = latestWeight!.weight_kg - prev.weight_kg;
              const sign = diff > 0 ? '+' : '';
              const color = diff > 0 ? C.warning : diff < 0 ? C.success : C.textMuted;
              return (
                <Text style={{ fontSize: 12, color, fontWeight: '700', marginTop: 6 }}>
                  {sign}{Math.round(diff * 100) / 100} kg vs medición anterior
                </Text>
              );
            })()}
          </Card>

          {!isEditing && (
            <TouchableOpacity style={[styles.btnPrimary, { marginBottom: 8 }]}
              onPress={() => setIsEditing(true)} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>✏️  Editar notas de alimentación</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* ── PESO ── */}
      {subTab === 'peso' && (
        <>
          <Card title="📈  Historial de peso" accent={C.primary}>
            {sorted.length === 0 ? (
              <Text style={{ color: C.textMuted, fontSize: 13 }}>Sin registros de peso aún.</Text>
            ) : (
              <>
                <WeightChart entries={sorted} />
                <View style={{ gap: 8, marginTop: 8 }}>
                  {[...sorted].reverse().map(e => (
                    <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center',
                      backgroundColor: C.surface, borderRadius: 12, padding: 10,
                      borderWidth: 1, borderColor: C.border }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: C.dark }}>{e.weight_kg} kg</Text>
                        <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{fmtDate(e.measured_at)}</Text>
                        {e.notes && <Text style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>{e.notes}</Text>}
                      </View>
                      <TouchableOpacity onPress={() => Alert.alert(
                        'Eliminar registro', `¿Eliminar ${e.weight_kg} kg del ${fmtDate(e.measured_at)}?`,
                        [{ text: 'Cancelar', style: 'cancel' },
                         { text: 'Eliminar', style: 'destructive', onPress: () => deleteWeightEntry(e.id, selectedPet.id) }]
                      )} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={{ color: C.danger, fontSize: 18, fontWeight: '700' }}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </>
            )}
          </Card>

          {showWeightForm ? (
            <Card title="➕  Nuevo registro de peso" accent={C.primary}>
              <Text style={styles.fieldLabel}>Peso (kg)</Text>
              <TextInput style={styles.input} keyboardType="decimal-pad" placeholder="Ej: 8.5"
                placeholderTextColor={C.textMuted} value={wKg} onChangeText={setWKg} />
              <Text style={styles.fieldLabel}>Fecha</Text>
              <TextInput style={styles.input} placeholder="AAAA-MM-DD"
                placeholderTextColor={C.textMuted} value={wDate} onChangeText={setWDate} />
              <Text style={styles.fieldLabel}>Notas (opcional)</Text>
              <TextInput style={styles.input} placeholder="Ej: Peso post-cirugía"
                placeholderTextColor={C.textMuted} value={wNotes} onChangeText={setWNotes} />
              <TouchableOpacity style={[styles.btnPrimary, { marginTop: 8 }]}
                onPress={handleSaveWeight} disabled={savingW} activeOpacity={0.85}>
                <Text style={styles.btnPrimaryText}>{savingW ? 'Guardando...' : 'Guardar peso'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnGhost} onPress={() => setShowWeightForm(false)} activeOpacity={0.85}>
                <Text style={styles.btnGhostText}>Cancelar</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            <TouchableOpacity style={styles.btnPrimary} onPress={() => setShowWeightForm(true)} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>➕  Registrar peso</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* ── COMIDA ── */}
      {subTab === 'comida' && (
        <>
          <Card title="🍖  Historial de alimentación" accent={C.accent}>
            {foodHistory.length === 0 ? (
              <Text style={{ color: C.textMuted, fontSize: 13 }}>Sin registros de comida aún.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {[...foodHistory]
                  .sort((a, b) => b.started_at.localeCompare(a.started_at))
                  .map((e, idx) => (
                    <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center',
                      backgroundColor: idx === 0 ? C.primaryLight : C.surface,
                      borderRadius: 12, padding: 10,
                      borderWidth: 1, borderColor: idx === 0 ? C.primary : C.border }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '900', color: C.dark }}>{e.food_brand}</Text>
                        <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>Desde {fmtDate(e.started_at)}</Text>
                        {e.notes && <Text style={{ fontSize: 11, color: C.textLight, marginTop: 2 }}>{e.notes}</Text>}
                      </View>
                      {idx === 0 && (
                        <Text style={{ fontSize: 10, fontWeight: '800', color: C.primaryDark,
                          backgroundColor: C.primaryLight, borderRadius: 8,
                          paddingHorizontal: 8, paddingVertical: 2, marginRight: 8 }}>ACTUAL</Text>
                      )}
                      <TouchableOpacity onPress={() => Alert.alert(
                        'Eliminar registro', `¿Eliminar "${e.food_brand}"?`,
                        [{ text: 'Cancelar', style: 'cancel' },
                         { text: 'Eliminar', style: 'destructive', onPress: () => deleteFoodEntry(e.id, selectedPet.id) }]
                      )} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={{ color: C.danger, fontSize: 18, fontWeight: '700' }}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
              </View>
            )}
          </Card>

          {showFoodForm ? (
            <Card title="➕  Nuevo alimento" accent={C.accent}>
              <Text style={styles.fieldLabel}>Marca / alimento</Text>
              <TextInput style={styles.input} placeholder='Ej: "Masterdog Senior"'
                placeholderTextColor={C.textMuted} value={fBrand} onChangeText={setFBrand} />
              <Text style={styles.fieldLabel}>Fecha de inicio</Text>
              <TextInput style={styles.input} placeholder="AAAA-MM-DD"
                placeholderTextColor={C.textMuted} value={fDate} onChangeText={setFDate} />
              <Text style={styles.fieldLabel}>Notas (opcional)</Text>
              <TextInput style={[styles.input, styles.multiline]} multiline
                placeholder='Ej: "2 tazas diarias"'
                placeholderTextColor={C.textMuted} value={fNotes} onChangeText={setFNotes} />
              <TouchableOpacity style={[styles.btnPrimary, { marginTop: 8 }]}
                onPress={handleSaveFood} disabled={savingF} activeOpacity={0.85}>
                <Text style={styles.btnPrimaryText}>{savingF ? 'Guardando...' : 'Guardar alimento'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnGhost} onPress={() => setShowFoodForm(false)} activeOpacity={0.85}>
                <Text style={styles.btnGhostText}>Cancelar</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            <TouchableOpacity style={styles.btnPrimary} onPress={() => setShowFoodForm(true)} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>➕  Cambiar alimento</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Editar notas (modo edición legacy) */}
      {isEditing && (
        <Card title="🍖  Notas de alimentación" accent={C.accent}>
          <Text style={styles.fieldLabel}>Marca / alimento</Text>
          <TextInput style={styles.input} placeholder='Ej: "Masterdog Senior"'
            placeholderTextColor={C.textMuted} value={petDraft.food_brand}
            onChangeText={(v) => setPetDraft(p => ({ ...p, food_brand: v }))} />
          <Text style={styles.fieldLabel}>Notas de alimentación</Text>
          <TextInput style={[styles.input, styles.multiline]} multiline
            placeholder='Ej: "2 tazas diarias, sin snacks extras"'
            placeholderTextColor={C.textMuted} value={petDraft.food_notes}
            onChangeText={(v) => setPetDraft(p => ({ ...p, food_notes: v }))} />
          <TouchableOpacity style={[styles.btnPrimary, { marginTop: 8 }]}
            onPress={savePetProfile} disabled={loading} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>{loading ? 'Guardando...' : 'Guardar notas'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnGhost} onPress={() => setIsEditing(false)} activeOpacity={0.85}>
            <Text style={styles.btnGhostText}>Cancelar</Text>
          </TouchableOpacity>
        </Card>
      )}
    </View>
  );
}
