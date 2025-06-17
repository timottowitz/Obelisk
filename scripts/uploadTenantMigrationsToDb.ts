// scripts/uploadTenantMigrationsToDb.ts
// Usage: npx ts-node scripts/uploadTenantMigrationsToDb.ts
// Requires: npm install pg dotenv @types/node

import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const MIGRATIONS_DIR = path.join(__dirname, '../supabase/tenant_migrations');
const DATABASE_URL = process.env.DATABASE_URL!;

function getVersionFromFilename(filename: string): string {
  // Assumes filename like 20250609_201500_tenant_schema_template.sql
  return filename.split('_').slice(0, 2).join('_');
}

async function uploadMigrations() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
    for (const file of files) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');
      const version = getVersionFromFilename(file);
      await client.query(
        `INSERT INTO public.tenant_migration_files (filename, version, sql)
         VALUES ($1, $2, $3)
         ON CONFLICT (filename) DO UPDATE SET version = $2, sql = $3, created_at = now()`,
        [file, version, sqlContent]
      );
      console.log(`Uploaded ${file}`);
    }
    console.log('All migration files uploaded to DB.');
  } finally {
    await client.end();
  }
}

uploadMigrations().catch(err => {
  console.error('Upload error:', err);
  process.exit(1);
}); 