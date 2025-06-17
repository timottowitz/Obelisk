# Multitenant Legal SaaS Application

This project is a schema-per-tenant Legal SaaS platform built with Supabase, Clerk, and Next.js. It supports secure onboarding and isolation for law firms and legal professionals.

## Prerequisites
- Node.js (v18+ recommended)
- npm
- Supabase project (with database, storage, and Edge Functions enabled)
- Clerk account (for authentication and webhooks)

## Environment Variables
Create a `.env` file in the project root with the following:

```
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
DATABASE_URL=your-supabase-database-connection-string
CLERK_WEBHOOK_SECRET=your-clerk-webhook-signing-secret
```

## Database Migrations
1. **Run public and private schema migrations:**
   ```bash
   supabase db push
   # or use the Supabase SQL editor to apply migrations in supabase/migrations/
   ```
2. **Upload tenant migration files to the database:**
   ```bash
   npx ts-node scripts/uploadTenantMigrationsToDb.ts
   ```
   This will insert all SQL files from `supabase/tenant_migrations/` into the `public.tenant_migration_files` table.

## Grant Permissions
Ensure the `service_role` and `authenticator` roles have access to the `private` schema. This is handled by the migration:
```
supabase/migrations/20250609_203000_grant-permissions-private.sql
```

## Running the Supabase Edge Function
1. Deploy the Edge Function to Supabase:
   ```bash
   supabase functions deploy clerk-webhook
   supabase functions serve clerk-webhook
   ```
2. Set the webhook endpoint in Clerk to your deployed Edge Function URL.

## Clerk Webhook Integration
- Configure Clerk to send organization and user events to your Edge Function endpoint.
- The Edge Function will:
  - Insert new organizations and users into the database
  - Run tenant migrations for new organizations
  - Track applied migrations per tenant

## Onboarding a New Tenant
1. Clerk sends an `organization.created` event to the webhook.
2. The Edge Function creates the org in the DB and runs all pending tenant migrations for the new schema.

## Upgrading Tenant Schemas
- Add new migration SQL files to `supabase/tenant_migrations/`.
- Run the upload script to insert them into the DB:
  ```bash
  npx ts-node scripts/uploadTenantMigrationsToDb.ts
  ```
- The next time a tenant is onboarded, or you run the migration runner, new migrations will be applied.

## Development
- Frontend code is in the `frontend/` directory (Next.js/React).
- Edge Functions are in `supabase/functions/`.
- Database migrations are in `supabase/migrations/` and `supabase/tenant_migrations/`.
- Scripts for migration and automation are in `scripts/`.

## Troubleshooting
- Ensure all environment variables are set.
- Check Supabase logs for Edge Function errors.
- Make sure the `private` schema grants are applied.
- Use the SQL editor to inspect the `tenant_migration_files` and `schema_migrations` tables.

## License
MIT 