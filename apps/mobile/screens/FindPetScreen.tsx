import { useState } from 'react';
import { ActivityIndicator, Image, Linking, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { C } from '../constants/colors';
import { styles } from '../styles';
import { useRecognitionStore, COLOR_OPTIONS, SIZE_OPTIONS } from '../store/recognition';
import { DOG_BREEDS, CAT_BREEDS } from '../constants/breeds';
import type { FindPetResult } from '../types';

const ALL_BREEDS = Array.from(new Set([...DOG_BREEDS, ...CAT_BREEDS])).sort();

function formatLostSince(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  const now = new Date();
  const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Perdido hoy';
  if (days === 1) return 'Perdido ayer';
  if (days < 30) return `Perdido hace ${days} días`;
  return `Perdido el ${date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}`;
}

function ResultCard({ result, photoUrl, onContact, dimmed = false }: {
  result: FindPetResult;
  photoUrl: string | null;
  onContact: () => void;
  dimmed?: boolean;
}) {
  const hasMatch = result.has_content_match;
  const lostSince = formatLostSince(result.lost_since);
  const hasWhatsApp = !!result.owner_whatsapp;
  const hasContact = !!(result.owner_phone || result.owner_whatsapp);

  return (
    <View style={{
      backgroundColor: dimmed ? C.surface : C.white,
      borderRadius: 18, padding: 14,
      borderWidth: 1.5, borderColor: hasMatch ? C.primary : C.border,
      marginBottom: 10, flexDirection: 'row', gap: 12, alignItems: 'center',
      opacity: dimmed ? 0.55 : 1,
    }}>
      {/* Foto */}
      <View style={{
        width: 68, height: 68, borderRadius: 14,
        backgroundColor: C.primaryLight, overflow: 'hidden',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {photoUrl
          ? <Image source={{ uri: photoUrl }} style={{ width: 68, height: 68 }} resizeMode="cover" />
          : <Text style={{ fontSize: 34 }}>{result.species === 'dog' ? '🐶' : result.species === 'cat' ? '🐱' : '🐾'}</Text>}
      </View>

      {/* Info */}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 16, fontWeight: '900', color: C.dark }} numberOfLines={1}>
          {result.pet_name}
        </Text>
        {result.breed && (
          <Text style={{ fontSize: 12, color: C.textMuted, fontWeight: '600' }} numberOfLines={1}>
            {result.species === 'dog' ? '🐶' : result.species === 'cat' ? '🐱' : ''} {result.breed}
          </Text>
        )}
        <View style={{ flexDirection: 'row', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
          {hasMatch && (
            <View style={{ backgroundColor: C.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: C.primaryDark }}>Coincide</Text>
            </View>
          )}
          {lostSince && (
            <View style={{ backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400E' }}>{lostSince}</Text>
            </View>
          )}
          {result.distance_km != null && (
            <View style={{ backgroundColor: C.surface, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted }}>
                {result.distance_km < 1
                  ? `${Math.round(result.distance_km * 1000)} m`
                  : `${result.distance_km.toFixed(1)} km`}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Botón contacto */}
      {hasContact && (
        <TouchableOpacity
          onPress={onContact}
          style={{
            borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, flexShrink: 0,
            backgroundColor: hasWhatsApp ? '#25D366' : C.primaryDark,
          }}
          activeOpacity={0.8}>
          <Text style={{ color: C.white, fontSize: 11, fontWeight: '800' }}>
            {hasWhatsApp ? 'WhatsApp' : 'Llamar'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Step 1: foto ──────────────────────────────────────────────────────────────
function StepPhoto() {
  const {
    findPhotoUri, findLoading, aiAnalyzing, aiSuggestion, findLat, findSpecies,
    pickFindPhoto, searchLostPets, setFindSpecies,
  } = useRecognitionStore();

  const isSearching = findLoading || aiAnalyzing;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 40 }}>
        <Text style={{ fontSize: 26, fontWeight: '900', color: C.dark, textAlign: 'center' }}>
          ¿Encontraste{'\n'}una mascota?
        </Text>
        <Text style={{ fontSize: 14, color: C.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 24, lineHeight: 20 }}>
          Saca una foto y la IA busca al dueño{'\n'}entre las mascotas perdidas.
        </Text>

        {/* Selector de especie */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            ¿Qué encontraste?
          </Text>
          <Text style={{ fontSize: 11, color: C.textMuted, fontStyle: 'italic' }}>opcional</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
          {(['dog', 'cat'] as const).map((sp) => {
            const selected = findSpecies === sp;
            return (
              <TouchableOpacity
                key={sp}
                onPress={() => setFindSpecies(selected ? null : sp)}
                activeOpacity={0.8}
                style={{
                  flex: 1, paddingVertical: 14, borderRadius: 18, alignItems: 'center', gap: 4,
                  backgroundColor: selected ? C.primaryDark : C.white,
                  borderWidth: 2, borderColor: selected ? C.primaryDark : C.border,
                }}>
                <Text style={{ fontSize: 32 }}>{sp === 'dog' ? '🐶' : '🐱'}</Text>
                <Text style={{ fontSize: 14, fontWeight: '900', color: selected ? C.white : C.dark }}>
                  {sp === 'dog' ? 'Perro' : 'Gato'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Zona de foto */}
        {findPhotoUri ? (
          <View style={{ height: 240, borderRadius: 24, overflow: 'hidden', backgroundColor: C.primaryLight }}>
            <Image source={{ uri: findPhotoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            {isSearching && (
              <View style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(108,71,255,0.65)',
                alignItems: 'center', justifyContent: 'center', gap: 12,
              }}>
                <ActivityIndicator size="large" color={C.white} />
                <Text style={{ color: C.white, fontWeight: '800', fontSize: 15 }}>
                  {aiAnalyzing ? 'Analizando con IA...' : 'Buscando mascotas...'}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <TouchableOpacity
              onPress={() => pickFindPhoto('camera')}
              style={{
                height: 130, borderRadius: 22, backgroundColor: C.primaryDark,
                alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
              activeOpacity={0.85}>
              <Text style={{ fontSize: 38 }}>📸</Text>
              <Text style={{ fontSize: 16, fontWeight: '900', color: C.white }}>Sacar foto ahora</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '600' }}>Abre la cámara directo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => pickFindPhoto('library')}
              style={{
                height: 90, borderRadius: 22,
                backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border,
                alignItems: 'center', justifyContent: 'center', gap: 6, flexDirection: 'row',
              }}
              activeOpacity={0.85}>
              <Text style={{ fontSize: 24 }}>🖼️</Text>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: C.dark }}>Elegir de la galería</Text>
                <Text style={{ fontSize: 12, color: C.textMuted, fontWeight: '600' }}>Ya tengo una foto guardada</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Estado post-foto */}
        {findPhotoUri && !isSearching && (
          <View style={{ marginTop: 14, gap: 10 }}>
            {/* Lo que detectó la IA */}
            {aiSuggestion ? (
              <View style={{ backgroundColor: C.primaryLight, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 22 }}>🤖</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: C.primaryDark, marginBottom: 4 }}>
                    IA detectó{aiSuggestion.confidence === 'alta' ? ' con alta confianza' : aiSuggestion.confidence === 'baja' ? ' (baja confianza)' : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                    {aiSuggestion.breed && (
                      <View style={{ backgroundColor: C.white, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: C.primary }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: C.primaryDark }}>{aiSuggestion.breed}</Text>
                      </View>
                    )}
                    {aiSuggestion.colors.map(c => (
                      <View key={c} style={{ backgroundColor: C.white, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: C.border }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: C.text, textTransform: 'capitalize' }}>{c}</Text>
                      </View>
                    ))}
                    {aiSuggestion.size && (
                      <View style={{ backgroundColor: C.white, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: C.border }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: C.text }}>{aiSuggestion.size}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ) : (
              <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 18 }}>⚠️</Text>
                <Text style={{ fontSize: 12, color: C.textMuted, fontWeight: '600', flex: 1 }}>
                  No se pudo analizar la foto — se buscó por especie y zona.
                </Text>
              </View>
            )}

            {/* GPS */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: findLat ? C.success : C.warning }} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: findLat ? C.success : C.warning }}>
                {findLat ? 'Búsqueda en 20 km de tu ubicación' : 'Sin GPS — buscó en toda Chile'}
              </Text>
            </View>

            {/* Cambiar foto */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
              <TouchableOpacity onPress={() => pickFindPhoto('camera')} activeOpacity={0.7}
                style={{ flex: 1, backgroundColor: C.primaryLight, borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}>
                <Text style={{ color: C.primaryDark, fontWeight: '800', fontSize: 13 }}>📸 Cámara</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => pickFindPhoto('library')} activeOpacity={0.7}
                style={{ flex: 1, backgroundColor: C.white, borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border }}>
                <Text style={{ color: C.dark, fontWeight: '800', fontSize: 13 }}>🖼️ Galería</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Búsqueda sin foto */}
        {!findPhotoUri && (
          <TouchableOpacity
            style={{ marginTop: 20, alignItems: 'center' }}
            onPress={searchLostPets}
            activeOpacity={0.7}>
            <Text style={{ color: C.textMuted, fontSize: 13, fontWeight: '600' }}>
              Buscar sin foto — ver todos los perdidos
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// ── Step 3: resultados ────────────────────────────────────────────────────────
function StepResults() {
  const {
    findResults, findResultPhotos, findLoading,
    findPhotoUri, findSpecies, findBreed, findColors, findSize, findLat, findLng, aiSuggestion,
    setFindSpecies, setFindBreed, toggleFindColor, setFindSize,
    searchLostPets, resetFind,
  } = useRecognitionStore();

  const [showRefine, setShowRefine] = useState(false);
  const [breedSearch, setBreedSearch] = useState('');
  const [showBreedDropdown, setShowBreedDropdown] = useState(false);

  const filteredBreeds = breedSearch.trim()
    ? ALL_BREEDS.filter(b => b.toLowerCase().includes(breedSearch.toLowerCase()))
    : ALL_BREEDS.slice(0, 8);

  const handleContact = (result: FindPetResult) => {
    const phone = result.owner_whatsapp ?? result.owner_phone;
    if (!phone) return;
    const clean = phone.replace(/\D/g, '');
    if (result.owner_whatsapp) Linking.openURL(`whatsapp://send?phone=${clean}`);
    else Linking.openURL(`tel:${clean}`);
  };

  const hasFilters = !!(findPhotoUri || findBreed || findColors.length > 0 || findSize);
  const matches = hasFilters ? findResults.filter(r => r.has_content_match) : [];
  const others  = hasFilters ? findResults.filter(r => !r.has_content_match) : findResults;

  const speciesLabel = findSpecies === 'dog' ? 'perros' : findSpecies === 'cat' ? 'gatos' : 'mascotas';
  const locationLabel = findLat && findLng ? 'en 20 km' : 'en toda Chile';
  const breedLabel = aiSuggestion?.breed ? ` · ${aiSuggestion.breed}` : '';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: C.dark }}>
              {matches.length > 0
                ? `${matches.length} coincidencia${matches.length > 1 ? 's' : ''}`
                : `${findResults.length} ${speciesLabel} perdido${findResults.length !== 1 ? 's' : ''}`}
            </Text>
            <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
              {locationLabel}{breedLabel}
            </Text>
          </View>
          <TouchableOpacity
            onPress={resetFind}
            style={{ backgroundColor: C.primaryLight, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 }}
            activeOpacity={0.7}>
            <Text style={{ color: C.primaryDark, fontWeight: '800', fontSize: 12 }}>Nueva búsqueda</Text>
          </TouchableOpacity>
        </View>

        {/* Sin resultados */}
        {findResults.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Text style={{ fontSize: 52 }}>🔍</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: C.dark, marginTop: 12 }}>
              Sin coincidencias
            </Text>
            <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 19 }}>
              No hay {speciesLabel} perdidos registrados{'\n'}con esas características.
            </Text>
          </View>
        )}

        {/* Coincidencias */}
        {matches.length > 0 && (
          <>
            <SectionLabel label="Posibles coincidencias" color={C.primaryDark} />
            {matches.map(r => (
              <ResultCard key={r.pet_id} result={r}
                photoUrl={findResultPhotos[r.pet_id] ?? null}
                onContact={() => handleContact(r)} />
            ))}
          </>
        )}

        {/* Otros */}
        {others.length > 0 && (
          <>
            <SectionLabel
              label={matches.length > 0 ? `Otros ${speciesLabel} perdidos` : `${speciesLabel.charAt(0).toUpperCase() + speciesLabel.slice(1)} perdidos`}
              color={C.textMuted}
              topMargin={matches.length > 0 ? 14 : 0}
            />
            {others.map(r => (
              <ResultCard key={r.pet_id} result={r}
                photoUrl={findResultPhotos[r.pet_id] ?? null}
                onContact={() => handleContact(r)}
                dimmed={matches.length > 0} />
            ))}
          </>
        )}

        {/* Refinar búsqueda — acordeón */}
        {findResults.length > 0 && (
          <TouchableOpacity
            onPress={() => setShowRefine(v => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20, marginBottom: 4 }}
            activeOpacity={0.7}>
            <Text style={{ fontSize: 13, color: C.primary, fontWeight: '700' }}>
              {showRefine ? 'Ocultar filtros' : 'Refinar búsqueda'}
            </Text>
            <Text style={{ color: C.primary, fontSize: 16 }}>{showRefine ? '▲' : '▼'}</Text>
          </TouchableOpacity>
        )}

        {showRefine && (
          <View style={{ backgroundColor: C.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border, marginTop: 8 }}>

            {/* Especie */}
            <Text style={{ fontSize: 11, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Especie</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {(['dog', 'cat'] as const).map(sp => {
                const sel = findSpecies === sp;
                return (
                  <TouchableOpacity key={sp} onPress={() => setFindSpecies(sel ? null : sp)} activeOpacity={0.8}
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
                      backgroundColor: sel ? C.primaryDark : C.surface,
                      borderWidth: 1.5, borderColor: sel ? C.primaryDark : C.border }}>
                    <Text style={{ fontSize: 18 }}>{sp === 'dog' ? '🐶' : '🐱'}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: sel ? C.white : C.text }}>
                      {sp === 'dog' ? 'Perro' : 'Gato'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Raza */}
            <Text style={{ fontSize: 11, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Raza</Text>
            <View style={{ marginBottom: 16 }}>
              <View style={[styles.input, styles.selectInput, { paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' }]}>
                <TextInput
                  style={{ flex: 1, paddingVertical: 11, paddingHorizontal: 14, fontSize: 14, color: C.dark }}
                  placeholder="Buscar raza..."
                  placeholderTextColor={C.textMuted}
                  value={breedSearch || findBreed}
                  onChangeText={(v) => { setBreedSearch(v); setFindBreed(''); setShowBreedDropdown(true); }}
                  onFocus={() => setShowBreedDropdown(true)}
                  returnKeyType="done"
                  onSubmitEditing={() => setShowBreedDropdown(false)}
                />
                {findBreed ? (
                  <TouchableOpacity onPress={() => { setFindBreed(''); setBreedSearch(''); setShowBreedDropdown(true); }} style={{ paddingHorizontal: 12 }}>
                    <Text style={{ color: C.textMuted, fontSize: 18 }}>✕</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              {showBreedDropdown && (
                <View style={[styles.selectMenu, { maxHeight: 200 }]}>
                  {!breedSearch && (
                    <TouchableOpacity style={[styles.selectOption, { backgroundColor: C.primaryLight }]}
                      onPress={() => { setFindBreed('Mestizo'); setBreedSearch(''); setShowBreedDropdown(false); }}>
                      <Text style={[styles.selectOptionText, { color: C.primary, fontWeight: '800' }]}>⭐ Mestizo</Text>
                    </TouchableOpacity>
                  )}
                  <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 160 }}>
                    {filteredBreeds.filter(b => b !== 'Mestizo').map(b => (
                      <TouchableOpacity key={b} style={[styles.selectOption, findBreed === b && styles.selectOptionActive]}
                        onPress={() => { setFindBreed(b); setBreedSearch(''); setShowBreedDropdown(false); }}>
                        <Text style={[styles.selectOptionText, findBreed === b && styles.selectOptionTextActive]}>{b}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Colores */}
            <Text style={{ fontSize: 11, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Color</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
              {COLOR_OPTIONS.map(color => (
                <TouchableOpacity key={color} onPress={() => toggleFindColor(color)} activeOpacity={0.7}
                  style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
                    backgroundColor: findColors.includes(color) ? C.primaryDark : C.surface,
                    borderWidth: 1.5, borderColor: findColors.includes(color) ? C.primaryDark : C.border }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', textTransform: 'capitalize',
                    color: findColors.includes(color) ? C.white : C.text }}>{color}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tamaño */}
            <Text style={{ fontSize: 11, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Tamaño</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
              {SIZE_OPTIONS.map(size => (
                <TouchableOpacity key={size} onPress={() => setFindSize(findSize === size ? null : size)} activeOpacity={0.7}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                    backgroundColor: findSize === size ? C.primaryDark : C.surface,
                    borderWidth: 1.5, borderColor: findSize === size ? C.primaryDark : C.border }}>
                  <Text style={{ fontSize: 16, marginBottom: 2 }}>
                    {size === 'pequeño' ? '🐩' : size === 'mediano' ? '🐕' : '🦮'}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '800', textTransform: 'capitalize',
                    color: findSize === size ? C.white : C.text }}>{size}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.btnPrimary, findLoading && { opacity: 0.6 }]}
              onPress={() => { setShowBreedDropdown(false); searchLostPets(); }}
              disabled={findLoading} activeOpacity={0.85}>
              {findLoading
                ? <ActivityIndicator color={C.white} />
                : <Text style={styles.btnPrimaryText}>Actualizar resultados</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SectionLabel({ label, color, topMargin = 0 }: { label: string; color: string; topMargin?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: topMargin, marginBottom: 10 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
      <Text style={{ fontSize: 11, fontWeight: '800', color, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
    </View>
  );
}

export default function FindPetScreen() {
  const { findStep } = useRecognitionStore();
  return findStep === 1 ? <StepPhoto /> : <StepResults />;
}
