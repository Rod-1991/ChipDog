import { Alert, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { styles } from '../../styles';
import { C } from '../../constants/colors';
import Card from '../../components/Card';
import type { Pet } from '../../types';

type Props = {
  selectedPet: Pet;
  linkTagCode: string;
  linkTagMode: 'choose' | 'nfc' | 'qr';
  setLinkTagMode: (m: 'choose' | 'nfc' | 'qr') => void;
  nfcStatus: 'idle' | 'scanning' | 'success' | 'error';
  setNfcStatus: (s: 'idle' | 'scanning' | 'success' | 'error') => void;
  nfcError: string;
  setNfcError: (v: string) => void;
  loading: boolean;
  writeNfcTag: () => void;
  saveLinkTagCode: (code: string) => Promise<boolean>;
};

export default function PetTagTab({
  selectedPet, linkTagCode, linkTagMode, setLinkTagMode,
  nfcStatus, setNfcStatus, nfcError, setNfcError,
  loading, writeNfcTag, saveLinkTagCode,
}: Props) {
  const tagUrl = `https://chipdog.app/tag/${linkTagCode}`;

  if (linkTagMode === 'nfc') {
    return (
      <View style={styles.form}>
        <Card title="📡  Escribir tag NFC" accent={C.primary}>
          <Text style={{ color: C.textLight, fontSize: 13, lineHeight: 19, marginBottom: 12 }}>
            Acerca el iPhone al tag NFC cuando estés listo.
          </Text>
          {nfcStatus === 'idle' && (
            <TouchableOpacity style={styles.btnPrimary} onPress={writeNfcTag} disabled={loading} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>📡  Escribir ahora</Text>
            </TouchableOpacity>
          )}
          {nfcStatus === 'scanning' && (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={{ fontSize: 48 }}>📡</Text>
              <Text style={{ color: C.primary, fontWeight: '700', marginTop: 8 }}>Esperando tag...</Text>
            </View>
          )}
          {nfcStatus === 'success' && (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={{ fontSize: 48 }}>✅</Text>
              <Text style={{ color: C.success, fontWeight: '800', fontSize: 17, marginTop: 8 }}>¡Tag grabado!</Text>
            </View>
          )}
          {nfcStatus === 'error' && (
            <View style={{ backgroundColor: C.dangerLight, borderRadius: 12, padding: 14 }}>
              <Text style={{ color: C.danger, fontWeight: '700' }}>Error: {nfcError}</Text>
            </View>
          )}
        </Card>
        <TouchableOpacity style={styles.btnGhost} onPress={() => { setLinkTagMode('choose'); setNfcStatus('idle'); setNfcError(''); }} activeOpacity={0.85}>
          <Text style={styles.btnGhostText}>← Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (linkTagMode === 'qr') {
    return (
      <View style={styles.form}>
        <Card title="📷  Código QR" accent={C.primary}>
          <Text style={{ color: C.textLight, fontSize: 13, lineHeight: 19, marginBottom: 16 }}>
            Imprime o descarga este QR y pégalo en el collar de {selectedPet.name}.
          </Text>
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <QRCode value={tagUrl} size={180} />
            <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 12, textAlign: 'center' }}>{tagUrl}</Text>
          </View>
        </Card>
        <TouchableOpacity style={styles.btnPrimary}
          onPress={async () => {
            const ok = await saveLinkTagCode(linkTagCode);
            if (ok) Alert.alert('✅ Tag vinculado', `El tag QR está listo para ${selectedPet.name}.`);
          }}
          disabled={loading} activeOpacity={0.85}>
          <Text style={styles.btnPrimaryText}>{loading ? 'Guardando...' : 'Confirmar y guardar'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnGhost} onPress={() => setLinkTagMode('choose')} activeOpacity={0.85}>
          <Text style={styles.btnGhostText}>← Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Elegir método ──
  return (
    <View style={styles.form}>
      <Card title="🏷️  Nuevo tag" accent={C.primary}>
        <Text style={{ color: C.textLight, fontSize: 13, lineHeight: 19 }}>
          Se generará un código único para {selectedPet.name}. Elige cómo grabarlo en el tag físico.
        </Text>
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <Text style={{ fontSize: 13, color: C.textMuted, fontWeight: '600', marginBottom: 6 }}>CÓDIGO GENERADO</Text>
          <Text style={{ fontSize: 32, fontWeight: '900', color: C.primary, letterSpacing: 2 }}>{linkTagCode}</Text>
          <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{tagUrl}</Text>
        </View>
      </Card>
      <TouchableOpacity
        style={[styles.btnPrimary, { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 18 }]}
        onPress={() => setLinkTagMode('nfc')} activeOpacity={0.85}>
        <Text style={{ fontSize: 24 }}>📡</Text>
        <View>
          <Text style={[styles.btnPrimaryText, { fontSize: 17 }]}>Escribir tag NFC</Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, textAlign: 'center' }}>Acerca el iPhone al tag</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btnPrimary, { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 18, backgroundColor: C.dark }]}
        onPress={() => setLinkTagMode('qr')} activeOpacity={0.85}>
        <Text style={{ fontSize: 24 }}>📷</Text>
        <View>
          <Text style={[styles.btnPrimaryText, { fontSize: 17 }]}>Generar código QR</Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, textAlign: 'center' }}>Imprimible y descargable</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}
