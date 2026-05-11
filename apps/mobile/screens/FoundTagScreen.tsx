import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import { C } from '../constants/colors';
import { useAppStore } from '../store/app';
import { usePetsStore } from '../store/pets';

let NfcManager: any = null;
let NfcTech: any = null;
try {
  const nfc = require('react-native-nfc-manager');
  NfcManager = nfc.default;
  NfcTech = nfc.NfcTech;
} catch { /* Expo Go o dispositivo sin NFC */ }

export default function FoundTagScreen() {
  const { loading, isLoggedIn, setScreen } = useAppStore();
  const { lookupTagCode } = usePetsStore();

  const [foundCode, setFoundCode] = useState('');
  const [qrScanned, setQrScanned] = useState(false);

  const handleFoundLookup = async () => {
    if (!foundCode.trim()) return;
    const found = await lookupTagCode(foundCode.trim());
    if (found) setScreen('FoundResult');
  };

  const readNfcTagForFound = async () => {
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      const id = tag?.id;
      if (!id) return;
      const uid = (id as number[]).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      const found = await lookupTagCode(uid);
      if (found) setScreen('FoundResult');
    } catch { /* usuario canceló o error NFC */ } finally {
      try { await NfcManager.cancelTechnologyRequest(); } catch {}
    }
  };

  return (
    <View style={styles.foundWrap}>
      <Text style={styles.foundEmoji}>🐕</Text>
      <Text style={styles.foundTitle}>¿Encontraste a alguien?</Text>
      <Text style={styles.foundSubtitle}>Escanea el tag NFC, el QR del collar o ingresa el código / N° de chip RFID</Text>

      <TouchableOpacity
        style={[styles.btnPrimary, { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 16, width: '100%' }]}
        onPress={readNfcTagForFound} activeOpacity={0.85}>
        <Text style={{ fontSize: 22 }}>📡</Text>
        <Text style={[styles.btnPrimaryText, { fontSize: 16 }]}>Acercar al tag NFC</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btnPrimary, { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 16, width: '100%', backgroundColor: C.dark }]}
        onPress={() => { setQrScanned(false); setScreen('ScanTag'); }} activeOpacity={0.85}>
        <Text style={{ fontSize: 22 }}>📷</Text>
        <Text style={[styles.btnPrimaryText, { fontSize: 16 }]}>Escanear QR del collar</Text>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', marginVertical: 4 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
        <Text style={{ color: C.textMuted, fontSize: 13, fontWeight: '600' }}>o ingresa el código / chip RFID</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
      </View>

      <TextInput
        style={[styles.input, { width: '100%' }]}
        placeholder="Código tag o N° chip RFID"
        placeholderTextColor={C.textMuted}
        value={foundCode}
        onChangeText={setFoundCode}
        autoCapitalize="characters"
      />
      <TouchableOpacity style={[styles.btnPrimary, { width: '100%', backgroundColor: C.dark }]} onPress={handleFoundLookup} disabled={loading} activeOpacity={0.85}>
        <Text style={styles.btnPrimaryText}>{loading ? 'Buscando...' : 'Buscar mascota'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnGhost} onPress={() => setScreen(isLoggedIn ? 'Home' : 'Login')} activeOpacity={0.85}>
        <Text style={styles.btnGhostText}>Volver</Text>
      </TouchableOpacity>
    </View>
  );
}
