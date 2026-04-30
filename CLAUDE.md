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
│   │   ├── App.tsx      # Lógica, estado y handlers (~2200 líneas tras refactor)
│   │   ├── screens/     # 21 pantallas extraídas como componentes separados
│   │   ├── components/  # Card, InfoRow
│   │   ├── constants/   # colors, breeds, comunas
│   │   ├── utils/       # helpers
│   │   ├── types/       # index.ts con todos los tipos
│   │   ├── lib/         # supabase.ts
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
- ✅ Registro de cuenta (email + contraseña) con 2 pasos implementado
- ✅ `user_profiles` tabla creada para guardar datos del perfil del dueño
- ✅ ScanTag screen — cámara QR para escanear tag desde FoundTag
- ✅ LostPetList — filtrable por especie y comuna
- ✅ LostPetDetail — ficha pública + contacto (llamar / WhatsApp)
- ✅ Home rediseñado — logo, cards con íconos, sin emojis sueltos, cerrar sesión discreto
- ✅ Mi Perfil — pantalla completa con vista y edición (nombre, teléfono, RUT, sexo, año, comuna)
- ✅ BD: política INSERT en tags corregida (vinculación de tags fallaba)
- ✅ BD: `get_nearby_lost_pets` ahora retorna todos los campos que usa LostPetDetail
- ✅ Bug fechas vacunas corregido (parser soporta dd/mm/yy y dd/mm/yyyy)
- ✅ Auto-formato de fechas en formularios (dd/mm/aaaa se inserta solo al escribir)
- ✅ Draft de vacunas y historial vet se resetea al cambiar de mascota
- ✅ Signed URLs de mascotas perdidas usan cache (no se regeneran en cada visita)
- ✅ NFC cleanup en finally (lector NFC siempre queda limpio)
- ✅ Refactor completo: App.tsx dividido en 21 pantallas separadas en screens/ (branch refactor/split-screens)
- ✅ Variables Supabase agregadas a eas.json (preview + production) — .env no llega a EAS
- ✅ NFC: makeReadOnly() agregado tras escribir (funciona en Android; iOS no soportado por CoreNFC — protección vía Supabase)
- ⏳ TestFlight link público pendiente de activar
- ⏳ Datos de prueba en BD a limpiar antes de lanzar (Max, Luna, Simba, Rocky, Nala, Milo)
- ⏳ Una mascota de prueba marcada como perdida — desmarcar antes de lanzar

## Pendientes / Ideas
- Co-propiedad de mascotas (branch separada: `pet_members` table, invitación por email) — diseñado, pendiente de implementar
- Certificado de vacunas exportable (PDF)
- Deploy web (apps/web) a Vercel
- Foto de perfil de usuario
- Filtro por radio desde ubicación en LostPetList

---

## Entorno de desarrollo (Mac — desde 2026-04-09)
Rodrigo migró de Windows a Mac. El entorno Mac parte desde cero.

**Herramientas instaladas (2026-04-09):**
- ✅ Xcode
- ✅ Homebrew 5.1.5
- ✅ Node 24 + npm 11 (vía nvm)
- ✅ EAS CLI
- ✅ Dependencias del monorepo (`npm install` en raíz)
- ✅ `eas login` — cuenta `rod.arriagada`
- ✅ `npx expo start` funciona — app corre en Expo Go

**Comandos frecuentes:**
```bash
# Instalar dependencias del monorepo
npm install   # desde la raíz

# Iniciar app en desarrollo
cd apps/mobile && npx expo start

# Build preview (ad hoc, para iPhone registrado)
cd apps/mobile && eas build --profile preview --platform ios

# Build production (TestFlight)
cd apps/mobile && eas build --profile production --platform ios

# Submit a App Store Connect
cd apps/mobile && eas submit --platform ios
```

---

## Notas técnicas importantes
- `App.tsx` contiene solo lógica/estado/handlers (~2200 líneas). Las 21 pantallas viven en `screens/`.
- Cada pantalla recibe todo su estado como props desde App(). No hay estado local en las pantallas.
- Swipe-back usa `PanResponder` con `useRef` + `handleBackRef.current` para evitar stale closure.
- `MapView.animateToRegion()` con `setTimeout(300ms)` para centrar mapa después de navegación.
- `NearbyMap` se renderiza fuera del `ScrollView` principal (usa `flex:1` para mapa full-screen).
- Supabase `DROP FUNCTION IF EXISTS` antes de `CREATE` cuando cambia el tipo de retorno.
- Componentes `InfoRow` y `Card` definidos FUERA de `App()` para evitar re-mounts al tipear (el teclado no se cierra).
- Fotos de mascotas: path en Storage es `{user_id}/{pet_id}/main.jpg`, se usan signed URLs (1h).
- La migración inicial usa schema multi-tenant antiguo. Las migraciones 202602250001 y 202603010001 alinearon la BD con el modelo actual (owner_id directo, sin organization_id en uso).
