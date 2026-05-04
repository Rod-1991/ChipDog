import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../../styles';
import { C } from '../../constants/colors';
import Card from '../../components/Card';
import type { Pet } from '../../types';

type Props = {
  selectedPet: Pet;
  petTags: { id: number; code: string }[];
  nfcStatus: 'idle' | 'scanning' | 'success' | 'error';
  setNfcStatus: (s: 'idle' | 'scanning' | 'success' | 'error') => void;
  nfcError: string;
  setNfcError: (v: string) => void;
  loading: boolean;
  readNfcTagForLink: () => void;
  unlinkTag: (tagId: number) => Promise<void>;
  fetchPetTags: (petId: number) => Promise<void>;
};

export default function PetTagTab({
  selectedPet, petTags, nfcStatus, setNfcStatus, nfcError, setNfcError,
  loading, readNfcTagForLink, unlinkTag, fetchPetTags,
}: Props) {

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

      {/* Tags vinculados */}
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

      {/* Vincular nuevo tag */}
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
