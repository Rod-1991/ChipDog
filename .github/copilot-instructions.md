# AI Coding Agent Instructions for ChipDog

## Project Overview

ChipDog is a **monorepo for a lost pet identification system** using:
- **Mobile app** (Expo + React Native + TypeScript)
- **Shared validation** (Zod schemas)
- **Supabase backend** (PostgreSQL + Auth + RLS policies)

Core feature: Register pets with tags (QR codes), link tags to pets, and scan tags to identify lost pets.

## Monorepo Structure & Workspaces

Uses **npm workspaces** (not yarn). Install at root level; commands target specific workspaces:

```bash
npm install                                    # Root install
npm run -w @chipdog/mobile start              # Start mobile app
npm run typecheck                             # Type-check all workspaces
npm run -w @chipdog/mobile typecheck          # Type-check only mobile
npm run -w @chipdog/shared build              # Build shared package
```

**Key workspace names:**
- `@chipdog/mobile` → `apps/mobile/`
- `@chipdog/shared` → `packages/shared/`

## Architecture & Data Flow

### Shared Package (`packages/shared/`)
Contains **Zod validation schemas** that define all data contracts:
- `loginSchema`: Email + password (6+ chars)
- `addPetSchema`: Pet registration (name, species, breed, color, birth_year, photo_url)
- `linkTagSchema`: Tag linking (code validation)

**Pattern:** Always use these schemas in mobile app. Add new schemas here when adding features.

### Supabase Schema & RLS
**Multi-tenant architecture** via organizations:
- `organizations` → `profiles` (owner_profile_id, role: owner|municipal_admin|staff)
- `pets` → linked to organization + profile
- `tags` → QR codes (status: available|linked|disabled)
- `scans` → GPS coordinates + user agent

**Critical RLS functions** in `supabase/migrations/202602230001_initial_schema.sql`:
- `current_org_id()` → returns user's organization (used in all policies)
- `is_municipal_admin()` → role-based access control

**Pattern:** New queries must respect `organization_id` filtering. Always assume row-level security is enforced.

### Mobile App Architecture
Single monolithic `App.tsx` component (1000+ lines) managing:
- **Screen states:** Login → Home → AddPet → PetDetail → LinkTag → FoundTag → FoundResult
- **State management:** useState for current screen, pets, selected pet, form inputs
- **Supabase client:** `lib/supabase.ts` exports singleton client

**Data model extension:** Pet type includes:
- Core fields: id, name, species, breed, photo_path, is_lost
- Contact info: owner_name, owner_phone, owner_whatsapp, contact2_* (alternate contact)
- Medical: allergies, health conditions
- Other: color, birth_year, sex, weight_kg, public_notes

## Environment Configuration

**Expo requires EXPO_PUBLIC_ prefix** for client-side environment variables:

```bash
# apps/mobile/.env
EXPO_PUBLIC_SUPABASE_URL=https://...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

**Entry point:** `apps/mobile/app.config.ts` reads `.env` via `dotenv/config` and passes to Expo `extra` config.

**Initialization:** `lib/supabase.ts` validates these env vars exist, throws error if missing.

## Developer Workflows

### Running the Mobile App
```bash
npm run -w @chipdog/mobile start    # Start dev server, choose platform (Android/iOS/web)
```
The app runs React Native code with hot reload. Use Expo Go app on phone to scan QR code.

### Type Checking
```bash
npm run typecheck                   # Must run shared build first (in script)
```
Sets `strict: true` in mobile tsconfig. Shared package is included via `../../packages/shared/src/**/*.ts`.

### Database Migrations
```bash
# Local testing
supabase start                      # Start local Supabase instance
supabase db reset                   # Reset local DB with migrations

# Production push
supabase db push                    # Apply migrations to remote project
```

Migrations live in `supabase/migrations/`. One file per version: `202602230001_initial_schema.sql`.

## Project-Specific Patterns

### Validation Pattern
Always validate user input with schemas before DB operations:

```typescript
import { addPetSchema } from '@chipdog/shared';

const result = addPetSchema.safeParse(formData);
if (!result.success) {
  Alert.alert('Error', result.error.message);
  return;
}
// Use result.data for DB insert
```

### Supabase Query Pattern
Use organization_id from current user profile:

```typescript
const { data, error } = await supabase
  .from('pets')
  .select('*')
  .eq('organization_id', user_org_id);
```

### Image Handling
Mobile app uses:
- `expo-image-picker` for image selection
- `expo-file-system` for local file operations
- Upload images to Supabase Storage (not yet implemented; use /lib pattern)

### Language & UI
- **Spanish**: App is in Spanish (schema messages, alerts, labels)
- **React Native only**: No web UI framework; all UI is native components (View, Text, TouchableOpacity, etc.)

## Common Gotchas

1. **Workspace dependency:** Mobile imports `@chipdog/shared` — shared package must be built before typechecking mobile.
2. **Supabase RLS:** Queries fail silently if row-level security policies deny access. Check policies, not just SQL syntax.
3. **Environment variables:** Expo requires `EXPO_PUBLIC_` prefix. Regular `.env` vars won't be available in runtime.
4. **Monolithic App.tsx:** Screen logic is in one file. Keep screen rendering logic in conditional blocks; extract helper functions as needed.
5. **TypeScript paths:** Mobile tsconfig includes shared package manually; no path aliases configured.

## When Adding Features

1. **New data model?** → Add migration to `supabase/migrations/` + RLS policies
2. **New validation?** → Add schema to `packages/shared/src/index.ts`
3. **New screen?** → Add to `type Screen` union + conditional render in App.tsx
4. **Supabase query?** → Ensure it filters by `organization_id` for multi-tenant safety
5. **Environment config?** → Use `EXPO_PUBLIC_` prefix; update `.env.example`

## Key Files Reference

| Purpose | Path |
|---------|------|
| Validation schemas | `packages/shared/src/index.ts` |
| Mobile app entry | `apps/mobile/App.tsx` |
| Supabase client | `apps/mobile/lib/supabase.ts` |
| Schema + RLS | `supabase/migrations/202602230001_initial_schema.sql` |
| Env config | `apps/mobile/app.config.ts` |
| Root scripts | `package.json` |
