# Auditoría de funcionamiento (rápida)

Fecha: 2026-02-25

## Checks ejecutados

1. `npm run typecheck` ✅
   - Compila `@chipdog/shared` con `tsc -p tsconfig.json`.
   - Ejecuta `tsc --noEmit` en `@chipdog/mobile`.

## Hallazgos

### 1) Estado TypeScript: OK

El monorepo pasa typecheck en estado actual, por lo que no hay errores de tipos bloqueando build local.

### 2) Riesgo alto de incompatibilidad app ↔ schema SQL

En `apps/mobile/App.tsx` la app consulta/crea campos como:
- `owner_id`
- `photo_path`
- `sex`, `weight_kg`, `owner_phone`, `owner_whatsapp`, `public_notes`, `allergies`, `medications`, `conditions`, `vet_name`, `vet_phone`

Sin embargo, la migración SQL inicial en `supabase/migrations/202602230001_initial_schema.sql` define en `public.pets`:
- `owner_profile_id` (no `owner_id`)
- `photo_url` (no `photo_path`)
- No incluye varios campos extra usados por la app (`sex`, `weight_kg`, etc.).

Si sólo se aplica esa migración, múltiples queries/updates del cliente mobile pueden fallar en runtime por columnas inexistentes.

## Recomendaciones

1. Alinear contrato de datos entre app y DB:
   - O bien actualizar migraciones para reflejar el modelo actual de `App.tsx`.
   - O bien ajustar `App.tsx` al schema existente.
2. Agregar una migración incremental nueva (sin reescribir la inicial) para mantener trazabilidad.
3. Añadir un smoke test de queries críticas contra una DB local de Supabase para detectar estas divergencias en CI.
