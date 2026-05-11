import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { styles } from '../styles';
import { C } from '../constants/colors';
import { useAppStore } from '../store/app';
import { usePetsStore } from '../store/pets';

export default function ScanTagScreen() {
  const setScreen = useAppStore((s) => s.setScreen);
  const { lookupTagCode } = usePetsStore();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [qrScanned, setQrScanned] = useState(false);

  const onBarcodeScanned = async (data: string) => {
    setQrScanned(true);
    await lookupTagCode(data);
    setScreen('FoundResult');
  };

  if (!cameraPermission?.granted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32, backgroundColor: C.dark }}>
        <Text style={{ fontSize: 48 }}>📷</Text>
        <Text style={{ color: C.white, fontSize: 17, fontWeight: '700', textAlign: 'center' }}>ChipDog necesita acceso a la cámara</Text>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center' }}>Para escanear el QR del tag de la mascota.</Text>
        <TouchableOpacity style={styles.btnPrimary} onPress={requestCameraPermission} activeOpacity={0.85}>
          <Text style={styles.btnPrimaryText}>Permitir acceso</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setScreen('FoundTag')} activeOpacity={0.7}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={qrScanned ? undefined : ({ data }) => onBarcodeScanned(data)}
      />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
        <View style={{ width: 240, height: 240, borderRadius: 20, borderWidth: 3, borderColor: C.primary, backgroundColor: 'transparent' }} />
        <Text style={{ color: C.white, marginTop: 20, fontSize: 15, fontWeight: '600', textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }}>
          Apunta al QR del tag
        </Text>
      </View>
      <TouchableOpacity
        style={{ position: 'absolute', top: 20, left: 20, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}
        onPress={() => { setQrScanned(false); setScreen('FoundTag'); }} activeOpacity={0.85}>
        <Text style={{ color: C.white, fontSize: 20, lineHeight: 24 }}>‹</Text>
        <Text style={{ color: C.white, fontWeight: '700', fontSize: 14 }}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}
