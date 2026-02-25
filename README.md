# chipdog monorepo

Monorepo para ChipDog con app mobile en Expo, paquete compartido de validaciones y migraciones/policies para Supabase.

## Estructura

- `apps/mobile`: app Expo + TypeScript.
- `packages/shared`: esquemas y tipos compartidos con Zod.
- `supabase/`: migraciones SQL (Postgres + Auth + RLS).

## Requisitos

- Node.js 20+
- npm 10+
- Supabase CLI (opcional, para correr migraciones localmente)

## Instalación

```bash
npm install
```

## Variables de entorno mobile

Copia el ejemplo y define tus claves:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Variables requeridas:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

> `apps/mobile/app.config.ts` expone estas variables en `extra` para que la app las use en runtime.

## Aplicar migraciones de Supabase

Inicializa Supabase (si aún no existe):

```bash
supabase init
```

Aplica migraciones en entorno local:

```bash
supabase db reset
```

O en proyecto remoto:

```bash
supabase db push
```

## Ejecutar la app

Mobile (Expo Go / simulador):

```bash
npm run -w @chipdog/mobile start
```

Web (Expo Web):

```bash
npm run web
```

## Flujo implementado

1. Login (`Login`).
2. Listado de mascotas (`Home`).
3. Alta de mascota (`AddPet`).
4. Detalle de mascota (`PetDetail`).
5. Vinculación de tag (`LinkTag`).

## Comandos de prueba sugeridos

```bash
npm run typecheck
npm run -w @chipdog/mobile start
npm run web
```
