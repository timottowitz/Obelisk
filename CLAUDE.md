# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a schema-per-tenant multi-tenant Legal SaaS platform using:
- **Frontend**: Next.js 15.3 with React 19, TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Edge Functions with Deno/Hono)
- **Auth**: Clerk for authentication and organization management
- **Storage**: Google Cloud Storage (recently migrated from Azure)

### Multi-Tenancy Architecture

Each organization gets its own PostgreSQL schema with complete data isolation:
- `private` schema: Contains global tables (organizations, users, organization_members)
- Tenant schemas (e.g., `org_2ycgcrzpztj...`): Contains tenant-specific tables (call_recordings, storage_files, etc.)

Key flows:
1. **Tenant Provisioning**: Clerk webhook → Edge Function → Create schema → Run migrations
2. **API Requests**: Frontend includes `X-Org-Id` header → Middleware validates → Sets schema search path → Query runs in tenant schema

## Essential Commands

```bash
# Frontend development (from root directory)
npm run dev          # Start Next.js dev server with turbopack
npm run build        # Build production frontend
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues and format code

# Database migrations
npm run upload-migrations  # Upload tenant migration files to DB
npm run migrate           # Run migrations for all tenants

# Supabase Edge Functions
supabase functions serve clerk-webhook --env-file .env
supabase functions deploy clerk-webhook
```

## Project Structure

```
/
├── frontend/              # Next.js application
│   ├── src/
│   │   ├── app/          # App router pages
│   │   ├── components/   # Reusable components
│   │   ├── features/     # Feature-specific components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities
│   │   ├── services/     # API client services
│   │   └── types/        # TypeScript types
│   └── package.json      # Frontend dependencies
├── supabase/
│   ├── functions/        # Edge Functions (Deno)
│   │   ├── _shared/      # Shared middleware and utilities
│   │   ├── clerk-webhook/
│   │   ├── call-recordings/
│   │   └── storage/
│   ├── migrations/       # Public/private schema migrations
│   └── tenant_migrations/ # Tenant schema template migrations
└── scripts/              # Database migration scripts
```

## Key Implementation Details

### API Middleware (`supabase/functions/_shared/index.ts`)
The `extractUserAndOrgId` middleware:
1. Validates auth token from Clerk
2. Checks `X-Org-Id` header
3. Verifies user belongs to organization
4. Sets PostgreSQL search path to tenant schema
5. All subsequent queries run in isolated tenant context

### Frontend API Configuration (`frontend/src/config/api.ts`)
- Automatically includes auth token and organization ID in requests
- Points to Supabase Edge Functions
- Handles error responses

### Storage System
- Files stored in Google Cloud Storage (migrated from Azure)
- Metadata in `storage_files` and `storage_folders` tables
- Support for file sharing via `recording_shares` table

## Code Style

- **TypeScript**: Strict mode enabled, avoid `any` type
- **React**: Functional components with hooks
- **Formatting**: Prettier with 2 spaces, single quotes, no trailing commas
- **File naming**: kebab-case for files, PascalCase for components
- **Imports**: Use `@/*` alias for src directory

## Testing Approach

Currently no automated tests configured. When implementing tests:
- Check for test scripts in package.json
- Look for jest/vitest configuration
- Follow existing test patterns if any

## Environment Variables

Required in `.env`:
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
CLERK_WEBHOOK_SECRET=
```

Frontend also requires Clerk public keys - check `frontend/env.example.txt`

## Database Migration Flow

1. Add new migration to `supabase/tenant_migrations/`
2. Run `npm run upload-migrations` to store in DB
3. Run `npm run migrate` to apply to all existing tenants
4. New tenants automatically get all migrations on creation

## Common Tasks

### Adding a new API endpoint
1. Create Edge Function in `supabase/functions/[name]/index.ts`
2. Use shared middleware for auth/org validation
3. Add service client in `frontend/src/services/`
4. Add TypeScript types in `frontend/src/types/`

### Modifying tenant schema
1. Create migration file in `supabase/tenant_migrations/`
2. Follow naming convention: `YYYYMMDD_HHMMSS_description.sql`
3. Upload and run migrations
4. Update relevant TypeScript types

### UI Components
- Use existing shadcn/ui components from `frontend/src/components/ui/`
- Follow established patterns in `frontend/src/features/`
- Maintain consistent styling with Tailwind classes