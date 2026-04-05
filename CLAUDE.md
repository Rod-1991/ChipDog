# ChipDog v2 — Contexto del proyecto

## Qué es ChipDog
App de tenencia responsable de mascotas para Chile. Los dueños registran sus mascotas con perfil completo, historial veterinario, vacunas y tag NFC/QR. Si la mascota se pierde, se publica una alerta en el mapa visible para todos los usuarios.

Orientada a jóvenes dog-lovers chilenos. Diseño moderno y cercano.

**Modelo de negocio:**
- B2C: dueños de mascotas
- B2B: municipalidades (compran tags para distribuir, acceden a datos de salud animal)

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Mobile | React Native + Expo SDK 54 |
| Web pública (tag scan) | Vite (apps/web) |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions, pg_net) |
| Monorepo | npm workspaces |
| Build iOS | EAS Build (Expo) |

**Supabase project ID:** `kcowhlsfbuixvdjhrikl`
**EAS project ID:** `f824aecc-b54f-49e8-85a7-68feb3e64b25`
**Bundle ID iOS:** `com.chipdog.app`
**Apple Developer team:** `68R3W3JXX9` (Rodrigo Arriagada, Individual)

---

## Estructura del monorepo

```
chipdog-v2/
├── apps/
│   ├── mobile/          # React Native (Expo)
│   │   ├── App.tsx      # App entera (~3000 líneas, un solo archivo)
│   │   ├── app.config.ts
│   │   └── eas.json
│   └── web/             # Vite — página pública de tag scan
│       └── src/App.jsx
└── packages/
    └── shared/          # Schemas Zod compartidos (loginSchema, addPetSchema, linkTagSchema)
        └── src/index.ts # main apunta acá (no a dist/) para que EAS lo resuelva
```

---

## Design system (archivo App.tsx, objeto `C`)

```typescript
const C = {
  primary:      '#6C47FF',  // púrpura principal
  primaryLight: '#EDE9FE',
  primaryDark:  '#4C1D95',
  accent:       '#FF6B6B',  // rojo/coral para alertas
  success:      '#059669',
  warning:      '#F59E0B',
  danger:       '#EF4444',
  dark:         '#1E1B4B',
  text:         '#374151',
  textLight:    '#6B7280',
  textMuted:    '#9CA3AF',
  border:       '#E5E7EB',
  surface:      '#F9FAFB',
  bg:           '#F5F3FF',
  white:        '#FFFFFF',
}
```

---

## Pantallas implementadas (type Screen)

```
Login → Register
Login → Home (dashboard)
  ├── PetList → AddPet
  │           → PetDetail → PetInfo
  │                       → PetContact
  │                       → PetVetHistory
  │                       → PetVaccines
  │                       → LinkTag
  │                       → LostPetMap (marcar mascota perdida)
  ├── NearbyMap (mapa full-screen de perdidos)
  │     └── LostPetList (lista filtrable por especie y comuna)
  │           └── LostPetDetail (ficha pública + contacto)
  └── FoundTag → FoundResult (escanear tag sin cuenta)
```

---

## Base de datos Supabase (tablas principales)

- `pets` — mascotas. Campos clave: `owner_id`, `is_lost`, `lost_lat`, `lost_lng`, `lost_radius_meters`, `lost_commune`, `photo_url` (path en Storage)
- `tags` — tags NFC/QR. Campos: `code`, `pet_id`, `status`
- `pet_vet_records` — historial veterinario con adjuntos en Storage (`pet-vet-attachments`)
- `pet_vaccines` — vacunas con `applied_date`, `expiry_date`, `next_dose_date`
- `user_push_tokens` — tokens Expo para push notifications

**RPCs públicos:**
- `get_pet_public_by_tag(p_code)` — info pública al escanear tag
- `get_all_lost_pets()` — todos los perdidos para el mapa (sin filtro de radio)
- `get_nearby_lost_pets(p_lat, p_lng, p_radius_km)` — perdidos con distancia

**Storage buckets:**
- `pet-photos` — fotos de mascotas (privado, signed URLs)
- `pet-vet-attachments` — adjuntos del historial vet (privado)

---

## Push notifications
- Edge Function Supabase: `notify-tag-scan`
- Trigger pg_net en tabla `tags` al actualizarse `last_scanned_at`
- Usa Expo Push API para enviar la notificación al dueño

---

## EAS Build
- **Preview** (ad hoc): para instalar directo en iPhone registrado
- **Production**: para App Store Connect + TestFlight
- Fix crítico: `packages/shared/package.json` → `"main": "src/index.ts"` (no `dist/`)
- Variables de entorno: hardcodeadas como fallback en `app.config.ts` (anon key es pública)

---

## Estado actual (Abril 2026)
- ✅ App funcional en iPhone vía EAS preview build
- ✅ TestFlight production build subido a App Store Connect (procesando)
- ✅ Registro de cuenta (email + contraseña) implementado
- ⏳ TestFlight link público pendiente de activar
- ⏳ Datos de prueba en BD a limpiar antes de lanzar (Max, Luna, Simba, Rocky, Nala, Milo)
- ⏳ Cara marcada como perdida (dato de prueba, desmarcar antes de lanzar)

## Pendientes / Ideas
- Certificado de vacunas exportable (PDF)
- Deploy web (apps/web) a Vercel
- Perfil de usuario (nombre, foto)
- Filtro por radio desde ubicación en LostPetList

---

## Notas técnicas importantes
- `App.tsx` es un solo archivo monolítico (~3000 líneas). No fragmentar hasta que sea necesario.
- Swipe-back usa `PanResponder` con `useRef` + `handleBackRef.current` para evitar stale closure.
- `MapView.animateToRegion()` con `setTimeout(300ms)` para centrar mapa después de navegación.
- `NearbyMap` se renderiza fuera del `ScrollView` principal (usa `flex:1` para mapa full-screen).
- Supabase `DROP FUNCTION IF EXISTS` antes de `CREATE` cuando cambia el tipo de retorno.
