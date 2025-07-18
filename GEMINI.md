
# Code Agent Guidelines

This document provides a set of guidelines for the code agent to follow when working on this project. These guidelines are intended to ensure consistency, maintainability, and high-quality code throughout the codebase.

## Project Overview

This project is a full-stack application with a React-based frontend and a Node.js backend. The backend is built with Supabase, a backend-as-a-service platform that provides a database, authentication, and serverless functions. The frontend is a Next.js application that uses the Supabase client library to interact with the backend.

## Tech Stack

*   **Frontend:**
    *   Next.js
    *   React
    *   TypeScript
    *   Tailwind CSS
    *   Supabase Client
*   **Backend:**
    *   Node.js
    *   Supabase
    *   PostgreSQL
    *   Hono (for serverless functions)

## Architecture

### Architectural Overview: Schema-per-Tenant Multi-tenancy

The project uses a **schema-per-tenant** multi-tenant architecture on Supabase. This is a robust and common pattern for providing strong data isolation between different customers (tenants). In this model, each tenant (an "Organization" in your project) gets its own dedicated database schema, which is a logical copy of a master template.

This means that while all tenants reside within the same physical database, their data is completely separate. A query running in `tenant_A`'s schema cannot see data in `tenant_B`'s schema, preventing data leakage.

---

### Core Components of the Architecture

1.  **Shared `private` Schema:** This central schema holds the master list of all tenants.
    *   **`private.organizations` table:** Stores information about each tenant, including their Clerk Organization ID, name, and most importantly, the `schema_name` that is dedicated to them. This is the "directory" of all tenants.
    *   **`private.users` table:** Stores a global list of all users across all organizations.
    *   **`private.organization_members` table:** A mapping table that links users to the organizations they belong to, defining their roles and permissions.

2.  **Tenant-Specific Schemas (e.g., `org_2ycgcrzpztj...`):**
    *   When a new organization is created, a new schema is created in the database. The name of this schema is typically the Clerk Organization ID to ensure uniqueness.
    *   Each of these schemas contains the same set of tables (`call_recordings`, `storage_files`, `recording_shares`, etc.) that are specific to that tenant's data.

3.  **Clerk for Authentication and Webhooks:**
    *   **Authentication:** Clerk handles user sign-up, sign-in, and organization management.
    *   **Webhooks:** The project relies on Clerk webhooks to automate tenant provisioning. The `supabase/functions/clerk-webhook/index.ts` function is the entry point for this.

4.  **Tenant Migration Management:**
    *   **`supabase/tenant_migrations/`:** This directory contains the SQL template files for a single tenant's schema. When a new tenant is created, these migration files are executed against their new, empty schema.
    *   **`scripts/uploadTenantMigrationsToDb.ts`:** This utility script uploads the tenant migration files into a central table in the database. This is a clever approach that allows the serverless webhook function to access migration scripts without needing direct filesystem access.
    *   **`runTenantMigrations` function (in `clerk-webhook`):** This function orchestrates the migration process for a new tenant. It reads the migration files from the central table and applies them sequentially to the new tenant's schema.

5.  **API Gateway & Edge Functions:**
    *   **`_shared/index.ts` (Middleware):** This is the key to the runtime data isolation. The `extractUserAndOrgId` middleware runs before your main API logic. It inspects the incoming request for a header (likely `X-Org-Id`), validates that the user belongs to that organization, and then dynamically sets the database search path for the duration of that request.
    *   **Edge Functions (e.g., `call-recordings`):** The actual business logic. When code in this function executes `supabase.from('call_recordings').select()`, the middleware has already ensured that this query is running securely within the correct tenant's schema.

---

### Lifecycle of a Tenant

Here is the step-by-step flow from a new organization being created to it being ready to use:

1.  **Organization Creation:** A user signs up and creates a new organization through the frontend UI, which interacts with Clerk.
2.  **Webhook Trigger:** Clerk automatically sends an `organization.created` event to your Supabase project.
3.  **Webhook Reception:** The `supabase/functions/clerk-webhook/index.ts` edge function receives this event.
4.  **Tenant Provisioning:**
    *   The function adds a new entry to the `private.organizations` table.
    *   It then executes a `CREATE SCHEMA org_...` command to create the new, isolated schema for the tenant.
5.  **Schema Migration:**
    *   The webhook function calls the `runTenantMigrations` logic.
    *   This logic fetches the migration scripts (which were previously uploaded by `scripts/uploadTenantMigrationsToDb.ts`) and executes them one by one against the new schema.
6.  **Tenant Ready:** The organization is now fully provisioned and ready to use. Its schema contains all the necessary tables, empty and waiting for data.

### Runtime API Request Flow

1.  **Frontend Request:** A logged-in user performs an action (e.g., loads their dashboard). The frontend code (`config/api.ts`) prepares a request to a Supabase Edge Function. It attaches the user's authentication token and the current `organization_id` as an `X-Org-Id` header.
2.  **Middleware Execution:** The Edge Function's middleware (`extractUserAndOrgId`) runs first. It validates the token and the `X-Org-Id` header.
3.  **Schema Scoping:** The middleware uses the `organization_id` to look up the `schema_name` in the `private.organizations` table. It then instructs the Supabase client instance to use this specific schema for all subsequent database operations in this request.
4.  **Scoped Query:** The main function logic in `call-recordings/index.ts` runs. Its query to the `call_recordings` table is automatically and securely scoped to the correct tenant's schema.
5.  **Isolated Response:** The function returns data only from that tenant's schema, which is then sent back to the user's browser.

This architecture provides a clean, scalable, and secure way to manage data for multiple tenants within a single Supabase project.

## Development Workflow

1.  **Set up the environment:**
    *   Install Node.js and npm.
    *   Install the Supabase CLI.
    *   Run `npm install` to install the project dependencies.
2.  **Start the development server:**
    *   Run `npm run dev` to start the frontend and backend development servers.
3.  **Make changes:**
    *   Follow the coding style and conventions outlined in this document.
    *   Write tests for new features and bug fixes.
4.  **Run tests:**
    *   Run `npm test` to run the project's tests.
5.  **Commit changes:**
    *   Use conventional commit messages to describe your changes.
6.  **Push changes:**
    *   Push your changes to the `main` branch to trigger the CI/CD pipeline.

## Coding Style and Conventions

*   **Formatting:**
    *   Use Prettier to format your code. The project includes a `.prettierrc` file with the recommended settings.
*   **Naming:**
    *   Use camelCase for variables and functions.
    *   Use PascalCase for components and classes.
    *   Use kebab-case for files and folders.
*   **Typing:**
    *   Use TypeScript for all new code.
    *   Use the `any` type as a last resort.
*   **Comments:**
    *   Write comments to explain complex logic.
    *   Do not write comments that simply restate the code.


## CI/CD

The project uses GitHub Actions for CI/CD. The CI/CD pipeline is triggered when changes are pushed to the `main` branch. The pipeline builds the project, runs the tests, and deploys the application to Supabase.
