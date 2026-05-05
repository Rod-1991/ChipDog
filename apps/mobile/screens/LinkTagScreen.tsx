import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import { C } from '../constants/colors';
import Card from '../components/Card';
import { useAppStore } from '../store/app';
import { usePetsStore } from '../store/pets';

let NfcManager: any = null;
let NfcTech: any = null;
try {
  const nfc = require('react-native-nfc-manager');
  NfcManager = nfc.default;
  NfcTech = nfc.NfcTech;
} catch { /* Expo Go o dispositivo sin NFC */ }

export default function LinkTagScreen() {
  const { loading, setScreen } = useAppStore();
  const { selectedPet, linkTagByUid } = usePetsStore();

  const [nfcStatus, setNfcStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [nfcError, setNfcError] = useState('');

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
