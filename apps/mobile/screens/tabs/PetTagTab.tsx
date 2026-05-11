import { useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../../styles';
import { C } from '../../constants/colors';
import Card from '../../components/Card';
import { useAppStore } from '../../store/app';
import { usePetsStore } from '../../store/pets';

let NfcManager: any = null;
let NfcTech: any = null;
try {
  const nfc = require('react-native-nfc-manager');
  NfcManager = nfc.default;
  NfcTech = nfc.NfcTech;
} catch { /* Expo Go o dispositivo sin NFC */ }

export default function PetTagTab() {
  const loading = useAppStore((s) => s.loading);
  const { selectedPet, petTags, linkTagByUid, unlinkTag, fetchPetTags } = usePetsStore();

  const [nfcStatus, setNfcStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [nfcError, setNfcError] = useState('');

  if (!selectedPet) return null;

  const readNfcTagForLink = async () => {
    setNfcStatus('scanning');
    setNfcError('');
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      const id = tag?.id;
      if (!id) throw new Error('No se pudo leer el UID del tag');
      const uid = (id as number[]).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      const ok = await linkTagByUid(uid);
      if (ok) {
        setNfcStatus('success');
      } else {
        setNfcStatus('error');
        setNfcError('No se pudo vincular el tag.');
      }
    } catch (e: any) {
      setNfcStatus('error');
      setNfcError(e.message ?? 'Error al leer el tag NFC');
    } finally {
      try { await NfcManager.cancelTechnologyRequest(); } catch {}
    }
  };

  const handleUnlink = (tagId: number, code: string) => {
    Alert.alert(
      'Desvincular tag',
      `¿Desvincular el tag ${code} de ${selectedPet.name}? Puedes volver a vincularlo después.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Desvincular', style: 'destructive', onPress: () => unlinkTag(tagId) },
      ]
    );
  };

  return (
    <View style={styles.form}>
      <Card title="📡  Tags vinculados" accent={C.primary}>
        {petTags.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 16, gap: 8 }}>
            <Text style={{ fontSize: 36 }}>🏷️</Text>
            <Text style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
              {selectedPet.name} aún no tiene un tag vinculado.{'\n'}
              Acerca un tag NFC para registrarlo.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {petTags.map((tag, i) => (
              <View key={tag.id} style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: C.surface, borderRadius: 12,
                padding: 12, borderWidth: 1, borderColor: C.border,
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: C.primary,
                    textTransform: 'uppercase', letterSpacing: 0.5 }}>Tag {i + 1}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.dark,
                    marginTop: 2, letterSpacing: 0.5 }}>{tag.code}</Text>
                </View>
                <View style={{ backgroundColor: '#D1FAE5', borderRadius: 8,
                  paddingHorizontal: 10, paddingVertical: 4, marginRight: 10 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: C.success }}>Activo</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleUnlink(tag.id, tag.code)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}>
                  <Text style={{ color: C.danger, fontSize: 20, fontWeight: '700', lineHeight: 22 }}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card title="➕  Vincular nuevo tag" accent={C.dark}>
        <Text style={{ color: C.textLight, fontSize: 13, lineHeight: 19, marginBottom: 16 }}>
          Acerca el iPhone al tag NFC del collar. El identificador del chip
          quedará registrado de forma permanente en ChipDog.
        </Text>

        <View style={{ alignItems: 'center', paddingVertical: 12, gap: 10 }}>
          {nfcStatus === 'idle'     && <Text style={{ fontSize: 48 }}>📡</Text>}
          {nfcStatus === 'scanning' && <Text style={{ fontSize: 48 }}>⏳</Text>}
          {nfcStatus === 'success'  && <Text style={{ fontSize: 48 }}>✅</Text>}
          {nfcStatus === 'error'    && <Text style={{ fontSize: 48 }}>❌</Text>}

          {nfcStatus === 'scanning' && (
            <Text style={{ color: C.primary, fontWeight: '700', fontSize: 14 }}>
              Leyendo tag...
            </Text>
          )}
          {nfcStatus === 'success' && (
            <Text style={{ color: C.success, fontWeight: '800', fontSize: 14 }}>
              ¡Tag vinculado correctamente!
            </Text>
          )}
          {nfcStatus === 'error' && nfcError ? (
            <Text style={{ color: C.danger, fontSize: 13, textAlign: 'center' }}>{nfcError}</Text>
          ) : null}
        </View>

        {(nfcStatus === 'idle' || nfcStatus === 'error') && (
          <TouchableOpacity
            style={[styles.btnPrimary, { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 16 }]}
            onPress={() => { setNfcStatus('idle'); setNfcError(''); readNfcTagForLink(); }}
            disabled={loading} activeOpacity={0.85}>
            <Text style={{ fontSize: 20 }}>📡</Text>
            <Text style={[styles.btnPrimaryText, { fontSize: 16 }]}>
              {nfcStatus === 'error' ? 'Reintentar' : 'Acercar tag NFC'}
            </Text>
          </TouchableOpacity>
        )}

        {nfcStatus === 'success' && (
          <TouchableOpacity
            style={styles.btnGhost}
            onPress={() => { setNfcStatus('idle'); setNfcError(''); fetchPetTags(selectedPet.id); }}
            activeOpacity={0.85}>
            <Text style={styles.btnGhostText}>Vincular otro tag</Text>
          </TouchableOpacity>
        )}
      </Card>
    </View>
  );
}
