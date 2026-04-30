import { Alert, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { styles } from '../styles';
import { C } from '../constants/colors';
import Card from '../components/Card';
import type { Pet, Screen } from '../types';

type LinkTagScreenProps = {
  linkTagCode: string;
  linkTagMode: 'choose' | 'nfc' | 'qr';
  setLinkTagMode: (m: 'choose' | 'nfc' | 'qr') => void;
  nfcStatus: 'idle' | 'scanning' | 'success' | 'error';
  setNfcStatus: (s: 'idle' | 'scanning' | 'success' | 'error') => void;
  nfcError: string;
  setNfcError: (v: string) => void;
  selectedPet: Pet | null;
  loading: boolean;
  writeNfcTag: () => void;
  saveLinkTagCode: (code: string) => Promise<boolean>;
  setScreen: (s: Screen) => void;
};

export default function LinkTagScreen({
  linkTagCode, linkTagMode, setLinkTagMode, nfcStatus, setNfcStatus, nfcError, setNfcError,
  selectedPet, loading, writeNfcTag, saveLinkTagCode, setScreen,
}: LinkTagScreenProps) {
  const tagUrl = `https://chipdog.app/tag/${linkTagCode}`;

  // ── Vista: elegir método ──
  if (linkTagMode === 'choose') {
    return (
      <View style={styles.form}>
        <Card title="🏷️  Nuevo tag" accent={C.primary}>
          <Text style={{ color: C.textLight, fontSize: 13, lineHeight: 19 }}>
            Se generará un código único para {selectedPet?.name ?? 'tu mascota'}. Elige cómo quieres grabarlo en el tag físico.
          </Text>
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Text style={{ fontSize: 13, color: C.textMuted, fontWeight: '600', marginBottom: 6 }}>CÓDIGO GENERADO</Text>
            <Text style={{ fontSize: 32, fontWeight: '900', color: C.primary, letterSpacing: 2 }}>{linkTagCode}</Text>
            <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{tagUrl}</Text>
          </View>
        </Card>

        <TouchableOpacity style={[styles.btnPrimary, { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 18 }]}
          onPress={() => setLinkTagMode('nfc')} activeOpacity={0.85}>
          <Text style={{ fontSize: 24 }}>📡</Text>
          <View>
            <Text style={[styles.btnPrimaryText, { fontSize: 17 }]}>Escribir tag NFC</Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, textAlign: 'center' }}>Acerca el iPhone al tag</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btnPrimary, { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 18, backgroundColor: C.dark }]}
          onPress={() => setLinkTagMode('qr')} activeOpacity={0.85}>
          <Text style={{ fontSize: 24 }}>📱</Text>
          <View>
            <Text style={[styles.btnPrimaryText, { fontSize: 17 }]}>Generar código QR</Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, textAlign: 'center' }}>Para imprimir o compartir</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Vista: NFC ──
  if (linkTagMode === 'nfc') {
    return (
      <View style={styles.form}>
        <TouchableOpacity style={styles.inlineBackBtn} onPress={() => { setNfcStatus('idle'); setNfcError(''); setLinkTagMode('choose'); }} activeOpacity={0.7}>
          <Text style={styles.inlineBackArrow}>‹</Text>
          <Text style={styles.inlineBackLabel}>Cambiar método</Text>
        </TouchableOpacity>

        <Card title="📡  Escribir tag NFC" accent={C.primary}>
          <Text style={{ color: C.textMuted, fontSize: 13 }}>Código: <Text style={{ fontWeight: '800', color: C.dark }}>{linkTagCode}</Text></Text>

          {/* Estado visual */}
          <View style={{ alignItems: 'center', paddingVertical: 24, gap: 12 }}>
            {nfcStatus === 'idle' && <Text style={{ fontSize: 60 }}>📡</Text>}
            {nfcStatus === 'scanning' && <Text style={{ fontSize: 60 }}>⏳</Text>}
            {nfcStatus === 'success' && <Text style={{ fontSize: 60 }}>✅</Text>}
            {nfcStatus === 'error' && <Text style={{ fontSize: 60 }}>❌</Text>}

            <Text style={{ fontSize: 17, fontWeight: '700', color: C.dark, textAlign: 'center' }}>
              {nfcStatus === 'idle' && 'Listo para escribir'}
              {nfcStatus === 'scanning' && 'Acerca el iPhone al tag NFC...'}
              {nfcStatus === 'success' && '¡Tag grabado correctamente!'}
              {nfcStatus === 'error' && 'Error al escribir el tag'}
            </Text>

            {nfcStatus === 'error' && nfcError ? (
              <Text style={{ color: C.danger, fontSize: 13, textAlign: 'center' }}>{nfcError}</Text>
            ) : null}

            {nfcStatus === 'success' ? (
              <Text style={{ color: C.textLight, fontSize: 13, textAlign: 'center' }}>
                El tag está vinculado a {selectedPet?.name}
              </Text>
            ) : null}
          </View>

          {(nfcStatus === 'idle' || nfcStatus === 'error') && (
            <TouchableOpacity style={styles.btnPrimary} onPress={writeNfcTag} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>
                {nfcStatus === 'error' ? 'Reintentar' : 'Iniciar sesión NFC'}
              </Text>
            </TouchableOpacity>
          )}

          {nfcStatus === 'success' && (
            <TouchableOpacity style={styles.btnPrimary} onPress={() => setScreen('PetDetail')} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>Volver al perfil</Text>
            </TouchableOpacity>
          )}
        </Card>
      </View>
    );
  }

  // ── Vista: QR ──
  if (linkTagMode === 'qr') {
    return (
      <View style={styles.form}>
        <TouchableOpacity style={styles.inlineBackBtn} onPress={() => setLinkTagMode('choose')} activeOpacity={0.7}>
          <Text style={styles.inlineBackArrow}>‹</Text>
          <Text style={styles.inlineBackLabel}>Cambiar método</Text>
        </TouchableOpacity>

        <Card title="📱  Código QR" accent={C.dark}>
          <Text style={{ color: C.textMuted, fontSize: 13 }}>
            Código: <Text style={{ fontWeight: '800', color: C.dark }}>{linkTagCode}</Text>
          </Text>
          <View style={{ alignItems: 'center', paddingVertical: 20, gap: 14 }}>
            <View style={{ padding: 16, backgroundColor: C.white, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3 }}>
              <QRCode value={tagUrl} size={200} color={C.dark} backgroundColor={C.white} />
            </View>
            <Text style={{ fontSize: 12, color: C.textMuted, textAlign: 'center', maxWidth: 260 }}>{tagUrl}</Text>
          </View>
          <Text style={{ fontSize: 13, color: C.textLight, lineHeight: 19, textAlign: 'center' }}>
            Toma una captura de pantalla para imprimir este QR o compártelo directamente.{'\n'}Luego toca "Vincular" para guardarlo en el perfil de {selectedPet?.name}.
          </Text>
        </Card>

        <TouchableOpacity style={styles.btnPrimary} onPress={async () => {
          const ok = await saveLinkTagCode(linkTagCode);
          if (ok) Alert.alert('Tag vinculado ✅', `Código ${linkTagCode} vinculado a ${selectedPet?.name}.`, [
            { text: 'Volver al perfil', onPress: () => setScreen('PetDetail') }
          ]);
        }} disabled={loading} activeOpacity={0.85}>
          <Text style={styles.btnPrimaryText}>{loading ? 'Vinculando...' : `Vincular QR a ${selectedPet?.name ?? 'mascota'}`}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}
