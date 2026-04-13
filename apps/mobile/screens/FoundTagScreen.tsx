import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../styles';
import { C } from '../constants/colors';
import type { Screen } from '../types';

type FoundTagScreenProps = {
  foundCode: string;
  setFoundCode: (v: string) => void;
  loading: boolean;
  isLoggedIn: boolean;
  handleFoundLookup: () => void;
  readNfcTagForFound: () => void;
  setQrScanned: (v: boolean) => void;
  setScreen: (s: Screen) => void;
};

export default function FoundTagScreen({
  foundCode, setFoundCode, loading, isLoggedIn,
  handleFoundLookup, readNfcTagForFound, setQrScanned, setScreen,
}: FoundTagScreenProps) {
  return (
    <View style={styles.foundWrap}>
      <Text style={styles.foundEmoji}>🐕</Text>
      <Text style={styles.foundTitle}>¿Encontraste a alguien?</Text>
      <Text style={styles.foundSubtitle}>Escanea el tag NFC, el QR del collar o ingresa el código</Text>

      {/* Botón NFC */}
      <TouchableOpacity
        style={[styles.btnPrimary, { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 16, width: '100%' }]}
        onPress={readNfcTagForFound} activeOpacity={0.85}>
        <Text style={{ fontSize: 22 }}>📡</Text>
        <Text style={[styles.btnPrimaryText, { fontSize: 16 }]}>Acercar al tag NFC</Text>
      </TouchableOpacity>

      {/* Botón escanear QR */}
      <TouchableOpacity
        style={[styles.btnPrimary, { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 16, width: '100%', backgroundColor: C.dark }]}
        onPress={() => { setQrScanned(false); setScreen('ScanTag'); }} activeOpacity={0.85}>
        <Text style={{ fontSize: 22 }}>📷</Text>
        <Text style={[styles.btnPrimaryText, { fontSize: 16 }]}>Escanear QR del collar</Text>
      </TouchableOpacity>

      {/* Divisor */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', marginVertical: 4 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
        <Text style={{ color: C.textMuted, fontSize: 13, fontWeight: '600' }}>o ingresa el código</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
      </View>

      <TextInput
        style={[styles.input, { width: '100%' }]}
        placeholder="Ej: CD-A3F9K"
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
