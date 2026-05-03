import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import { C } from '../constants/colors';
import Card from '../components/Card';
import type { Pet, Screen } from '../types';

type LinkTagScreenProps = {
  nfcStatus: 'idle' | 'scanning' | 'success' | 'error';
  setNfcStatus: (s: 'idle' | 'scanning' | 'success' | 'error') => void;
  nfcError: string;
  setNfcError: (v: string) => void;
  selectedPet: Pet | null;
  loading: boolean;
  readNfcTagForLink: () => void;
  setScreen: (s: Screen) => void;
};

export default function LinkTagScreen({
  nfcStatus, setNfcStatus, nfcError, setNfcError,
  selectedPet, loading, readNfcTagForLink, setScreen,
}: LinkTagScreenProps) {
  return (
    <View style={styles.form}>
      <Card title="🏷️  Vincular tag NFC" accent={C.primary}>
        <Text style={{ color: C.textLight, fontSize: 13, lineHeight: 19, marginBottom: 16 }}>
          Acerca el iPhone al tag NFC del collar de {selectedPet?.name ?? 'tu mascota'}.
          El identificador único del chip quedará registrado en ChipDog.
        </Text>

        <View style={{ alignItems: 'center', paddingVertical: 24, gap: 12 }}>
          {nfcStatus === 'idle'     && <Text style={{ fontSize: 60 }}>📡</Text>}
          {nfcStatus === 'scanning' && <Text style={{ fontSize: 60 }}>⏳</Text>}
          {nfcStatus === 'success'  && <Text style={{ fontSize: 60 }}>✅</Text>}
          {nfcStatus === 'error'    && <Text style={{ fontSize: 60 }}>❌</Text>}

          <Text style={{ fontSize: 17, fontWeight: '700', color: C.dark, textAlign: 'center' }}>
            {nfcStatus === 'idle'     && 'Listo para vincular'}
            {nfcStatus === 'scanning' && 'Leyendo tag...'}
            {nfcStatus === 'success'  && `¡Tag vinculado a ${selectedPet?.name}!`}
            {nfcStatus === 'error'    && 'Error al leer el tag'}
          </Text>

          {nfcStatus === 'error' && nfcError ? (
            <Text style={{ color: C.danger, fontSize: 13, textAlign: 'center' }}>{nfcError}</Text>
          ) : null}

          {nfcStatus === 'success' && (
            <Text style={{ color: C.textMuted, fontSize: 13, textAlign: 'center' }}>
              Ya puedes cerrar esta pantalla.
            </Text>
          )}
        </View>

        {(nfcStatus === 'idle' || nfcStatus === 'error') && (
          <TouchableOpacity style={styles.btnPrimary} onPress={readNfcTagForLink}
            disabled={loading} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>
              {nfcStatus === 'error' ? '🔄  Reintentar' : '📡  Acercar tag NFC'}
            </Text>
          </TouchableOpacity>
        )}

        {nfcStatus === 'success' && (
          <TouchableOpacity style={styles.btnPrimary} onPress={() => setScreen('PetDetail')} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>Volver al perfil</Text>
          </TouchableOpacity>
        )}
      </Card>

      <TouchableOpacity style={styles.btnGhost}
        onPress={() => { setNfcStatus('idle'); setNfcError(''); setScreen('PetDetail'); }}
        activeOpacity={0.85}>
        <Text style={styles.btnGhostText}>← Volver</Text>
      </TouchableOpacity>
    </View>
  );
}
