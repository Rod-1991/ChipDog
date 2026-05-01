import { useState } from 'react';
import { Alert, Image, Linking, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { C } from '../constants/colors';
import { styles } from '../styles';
import type { LostPetPin, PetSighting, Screen } from '../types';

type Props = {
  selectedLostPet: LostPetPin;
  lostPetPhotoUrl: string | null;
  sightings: PetSighting[];
  saveSighting: (petId: number, reporterName: string, comment: string) => Promise<boolean>;
  deleteSighting: (id: number, petId: number) => Promise<void>;
  userId: string | null;
  setScreen: (s: Screen) => void;
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return 'Hace menos de 1 hora';
  if (diffH < 24) return `Hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Ayer';
  if (diffD < 7) return `Hace ${diffD} días`;
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

export default function LostPetDetailScreen({
  selectedLostPet, lostPetPhotoUrl, sightings, saveSighting, deleteSighting, userId, setScreen,
}: Props) {
  const pet = selectedLostPet;

  const [showForm, setShowForm] = useState(false);
  const [reporterName, setReporterName] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!comment.trim()) { Alert.alert('Escribe un comentario'); return; }
    setSaving(true);
    try {
      const ok = await saveSighting(pet.id, reporterName, comment);
      if (ok) {
        setReporterName('');
        setComment('');
        setShowForm(false);
      }
    } finally { setSaving(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Foto / Hero con header encima */}
        <View style={{ height: 260 }}>
          {lostPetPhotoUrl ? (
            <Image source={{ uri: lostPetPhotoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 90 }}>{pet.species === 'cat' ? '🐈' : '🐕'}</Text>
            </View>
          )}
          {/* Header teal encima de la foto */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0,
            paddingTop: 56, paddingBottom: 12, paddingHorizontal: 16,
            backgroundColor: 'rgba(7,137,122,0.85)',
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => setScreen('NearbyMap')} activeOpacity={0.8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 20, color: '#fff', lineHeight: 24 }}>‹</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '800' }}>Mapa</Text>
            </TouchableOpacity>
            <View style={{ backgroundColor: '#FF4757', borderRadius: 12,
              paddingHorizontal: 12, paddingVertical: 5 }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>🚨 Perdido</Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: -20 }}>
          {/* Name card */}
          <View style={{ backgroundColor: C.white, borderRadius: 22, padding: 16,
            borderWidth: 1, borderColor: C.border, marginBottom: 12 }}>
            <Text style={{ fontSize: 24, fontWeight: '900', color: C.dark }}>{pet.name}</Text>
            <Text style={{ fontSize: 13, color: C.textMuted, fontWeight: '700', marginTop: 2 }}>
              {pet.species === 'cat' ? 'Gato' : 'Perro'}{pet.breed ? ` · ${pet.breed}` : ''}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
              {pet.color && (
                <View style={{ backgroundColor: C.primaryLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: C.primaryDark }}>{pet.color}</Text>
                </View>
              )}
              {pet.lost_commune && (
                <View style={{ backgroundColor: '#FFE8E8', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#FF4757' }}>{pet.lost_commune}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Notas públicas */}
          {pet.public_notes && (
            <View style={{ backgroundColor: '#FFF8E1', borderRadius: 16, padding: 14,
              borderWidth: 1, borderColor: '#FFECB3', marginBottom: 12 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#7A4500',
                textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Indicaciones del dueño</Text>
              <Text style={{ color: '#7A4500', lineHeight: 20, fontSize: 13 }}>{pet.public_notes}</Text>
            </View>
          )}

          {/* Contacto — solo si el dueño lo activó */}
          {pet.contact_public && (pet.owner_phone || pet.owner_whatsapp) && (
            <View style={{ gap: 8, marginBottom: 12 }}>
              {pet.owner_phone && (
                <TouchableOpacity
                  style={{ backgroundColor: C.primaryDark, borderRadius: 16,
                    paddingVertical: 14, alignItems: 'center' }}
                  onPress={() => Linking.openURL(`tel:${pet.owner_phone}`)}
                  activeOpacity={0.85}>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>📞  Llamar al dueño</Text>
                </TouchableOpacity>
              )}
              {pet.owner_whatsapp && (
                <TouchableOpacity
                  style={{ backgroundColor: '#25D366', borderRadius: 16,
                    paddingVertical: 14, alignItems: 'center' }}
                  onPress={() => Linking.openURL(`whatsapp://send?phone=${pet.owner_whatsapp}`)}
                  activeOpacity={0.85}>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>💬  WhatsApp</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── AVISTAMIENTOS ── */}
          <View style={{ backgroundColor: C.white, borderRadius: 22,
            borderWidth: 1, borderColor: C.border, marginBottom: 12, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10,
              borderBottomWidth: 1, borderBottomColor: C.border }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: C.primary,
                textTransform: 'uppercase', letterSpacing: 1 }}>
                Avistamientos {sightings.length > 0 ? `(${sightings.length})` : ''}
              </Text>
              {!showForm && (
                <TouchableOpacity onPress={() => setShowForm(true)} activeOpacity={0.8}
                  style={{ backgroundColor: C.primaryLight, borderRadius: 10,
                    paddingHorizontal: 12, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: C.primaryDark }}>+ Lo vi</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Formulario */}
            {showForm && (
              <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: C.border, gap: 8 }}>
                <TextInput style={styles.input} placeholder="Tu nombre (opcional)"
                  placeholderTextColor={C.textMuted} value={reporterName}
                  onChangeText={setReporterName} />
                <TextInput style={[styles.input, styles.multiline]} multiline
                  placeholder="¿Dónde lo viste? ¿Cómo estaba? Cualquier dato ayuda..."
                  placeholderTextColor={C.textMuted} value={comment}
                  onChangeText={setComment} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={[styles.btnPrimary, { flex: 1, paddingVertical: 10 }]}
                    onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                    <Text style={styles.btnPrimaryText}>{saving ? 'Enviando...' : 'Enviar'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btnGhost, { flex: 1, paddingVertical: 10 }]}
                    onPress={() => { setShowForm(false); setComment(''); setReporterName(''); }}
                    activeOpacity={0.7}>
                    <Text style={styles.btnGhostText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Lista de avistamientos */}
            {sightings.length === 0 && !showForm ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 28 }}>👀</Text>
                <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 6, textAlign: 'center' }}>
                  Nadie lo ha reportado aún.{'\n'}¿Lo viste? ¡Avisa!
                </Text>
              </View>
            ) : (
              <View style={{ padding: 14, gap: 10 }}>
                {sightings.map(s => (
                  <View key={s.id} style={{ backgroundColor: C.surface, borderRadius: 14,
                    padding: 12, borderWidth: 1, borderColor: C.border }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: C.dark }}>
                          {s.reporter_name || 'Anónimo'}
                        </Text>
                        <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>
                          {fmtDate(s.created_at)}
                        </Text>
                      </View>
                      {/* Solo el autor del avistamiento puede eliminarlo */}
                      {userId && userId === s.user_id && (
                        <TouchableOpacity onPress={() => Alert.alert(
                          'Eliminar avistamiento', '¿Eliminar este reporte?',
                          [{ text: 'Cancelar', style: 'cancel' },
                           { text: 'Eliminar', style: 'destructive',
                             onPress: () => deleteSighting(s.id, pet.id) }]
                        )} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Text style={{ color: C.danger, fontSize: 18, fontWeight: '700' }}>×</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={{ color: C.text, fontSize: 13, lineHeight: 19, marginTop: 6 }}>
                      {s.comment}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Volver */}
          <TouchableOpacity style={[styles.btnGhost, { marginBottom: 6 }]}
            onPress={() => setScreen('LostPetList')} activeOpacity={0.85}>
            <Text style={styles.btnGhostText}>← Ver lista</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnGhost}
            onPress={() => setScreen('NearbyMap')} activeOpacity={0.85}>
            <Text style={styles.btnGhostText}>← Volver al mapa</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
