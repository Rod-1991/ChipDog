import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../../constants/colors';
import { styles } from '../../styles';
import Card from '../../components/Card';
import { supabase } from '../../lib/supabase';
import { usePetsStore } from '../../store/pets';
import { useUserStore } from '../../store/user';
import { useRecognitionStore } from '../../store/recognition';

function PhotoCard({ storageUrl, onDelete }: { storageUrl: string; onDelete: () => void }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.storage.from('pet-photos').createSignedUrl(storageUrl, 3600).then(({ data }) => {
      if (data?.signedUrl) setSignedUrl(data.signedUrl);
    });
  }, [storageUrl]);

  return (
    <View style={{
      width: 98, height: 98, borderRadius: 14,
      overflow: 'hidden', backgroundColor: C.primaryLight,
      borderWidth: 1, borderColor: C.border,
    }}>
      {signedUrl ? (
        <Image source={{ uri: signedUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="small" color={C.primary} />
        </View>
      )}
      <TouchableOpacity
        onPress={onDelete}
        style={{
          position: 'absolute', top: 5, right: 5,
          width: 22, height: 22, borderRadius: 11,
          backgroundColor: 'rgba(0,0,0,0.55)',
          alignItems: 'center', justifyContent: 'center',
        }}
        activeOpacity={0.8}>
        <Text style={{ color: C.white, fontSize: 13, fontWeight: '900', lineHeight: 16 }}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function PetRecognitionTab() {
  const { selectedPet } = usePetsStore();
  const userId = useUserStore((s) => s.userId);
  const {
    recognitionPhotos, loadingPhotos,
    fetchRecognitionPhotos, addRecognitionPhoto, deleteRecognitionPhoto,
  } = useRecognitionStore();

  useEffect(() => {
    if (selectedPet) fetchRecognitionPhotos(selectedPet.id);
  }, [selectedPet?.id]);

  if (!selectedPet) return null;

  const MAX_PHOTOS = 5;
  const canAdd = recognitionPhotos.length < MAX_PHOTOS;

  const handleDelete = (photoId: number, storageUrl: string) => {
    Alert.alert(
      'Eliminar foto',
      '¿Eliminar esta foto de reconocimiento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteRecognitionPhoto(photoId, storageUrl) },
      ]
    );
  };

  return (
    <View style={styles.form}>
      <Card title="📸  Fotos de reconocimiento" accent={C.primary}>
        <Text style={{ color: C.textLight, fontSize: 13, lineHeight: 19, marginBottom: 16 }}>
          Sube hasta {MAX_PHOTOS} fotos de {selectedPet.name} desde distintos ángulos.
          Estas fotos ayudan a identificarla si se pierde.
        </Text>

        {loadingPhotos ? (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <ActivityIndicator color={C.primary} />
          </View>
        ) : (
          <>
            {recognitionPhotos.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                {recognitionPhotos.map((photo) => (
                  <PhotoCard
                    key={photo.id}
                    storageUrl={photo.storage_url}
                    onDelete={() => handleDelete(photo.id, photo.storage_url)}
                  />
                ))}
              </View>
            )}

            {recognitionPhotos.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
                <Text style={{ fontSize: 40 }}>📷</Text>
                <Text style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
                  Aún no hay fotos de reconocimiento.{'\n'}
                  Agrega al menos una para que{'\n'}sea más fácil identificar a {selectedPet.name}.
                </Text>
              </View>
            )}

            {canAdd && (
              <TouchableOpacity
                style={[styles.btnPrimary, { flexDirection: 'row', justifyContent: 'center', gap: 8 }]}
                onPress={() => userId && addRecognitionPhoto(selectedPet.id, userId)}
                disabled={loadingPhotos}
                activeOpacity={0.85}>
                <Text style={{ fontSize: 18 }}>📷</Text>
                <Text style={styles.btnPrimaryText}>
                  Agregar foto ({recognitionPhotos.length}/{MAX_PHOTOS})
                </Text>
              </TouchableOpacity>
            )}

            {!canAdd && (
              <View style={{ backgroundColor: C.primaryLight, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: C.primaryDark }}>
                  Límite de {MAX_PHOTOS} fotos alcanzado
                </Text>
              </View>
            )}
          </>
        )}
      </Card>

      <Card title="💡  ¿Para qué sirve?" accent={C.textMuted}>
        <View style={{ gap: 10 }}>
          {[
            { icon: '🔍', text: 'Alguien que encuentre tu mascota puede buscarla por foto y te contactamos.' },
            { icon: '📍', text: 'Las fotos se usan junto con la ubicación GPS para encontrar mascotas cercanas.' },
            { icon: '🏆', text: 'Más fotos desde distintos ángulos = mejor identificación.' },
          ].map((tip, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 16 }}>{tip.icon}</Text>
              <Text style={{ flex: 1, fontSize: 13, color: C.textLight, lineHeight: 18 }}>{tip.text}</Text>
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}
