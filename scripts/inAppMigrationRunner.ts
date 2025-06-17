// inAppMigrationRunner.ts
// Usage: npx ts-node scripts/inAppMigrationRunner.ts [schema_name|all-tenants]
// Requires: npm install pg dotenv @types/node

import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const TENANT_MIGRATIONS_DIR = path.join(__dirname, '../supabase/tenant_migrations');
const MIGRATION_TABLE = 'private.schema_migrations';

async function ensureMigrationTable(client: Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      id serial PRIMARY KEY,
      schema_name text NOT NULL,
      migration_filename text NOT NULL,
      applied_at timestamp NOT NULL DEFAULT now(),
      UNIQUE(schema_name, migration_filename)
    );
  `);
}

async function getAppliedMigrations(client: Client, schemaName: string) {
  const { rows } = await client.query(
    `SELECT migration_filename FROM ${MIGRATION_TABLE} WHERE schema_name = $1`,
    [schemaName]
  );
  return new Set(rows.map((r) => r.migration_filename));
}

async function applyMigration(client: Client, schemaName: string, filename: string, sql: string) {
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(
      `INSERT INTO ${MIGRATION_TABLE} (schema_name, migration_filename) VALUES ($1, $2)`,
      [schemaName, filename]
    );
    await client.query('COMMIT');
    console.log(`Applied migration: ${filename} for schema: ${schemaName}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`Failed migration: ${filename} for schema: ${schemaName}`);
    throw err;
  }
}

function getMigrationsDir(schemaName: string): string {
  return schemaName === 'public' ? TENANT_MIGRATIONS_DIR : TENANT_MIGRATIONS_DIR;
}

async function runMigrations(schemaName: string, client?: Client) {
  let localClient = client;
  if (!localClient) {
    localClient = new Client({ connectionString: process.env.DATABASE_URL });
    await localClient.connect();
  }
  try {
    await ensureMigrationTable(localClient);
    const applied = await getAppliedMigrations(localClient, schemaName);
    const migrationsDir = getMigrationsDir(schemaName);
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    for (const file of files) {
      if (applied.has(file)) continue;
      let sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      if (schemaName !== 'public') {
        sql = sql.replace(/\{\{schema_name\}\}/g, schemaName);
      }
      await applyMigration(localClient, schemaName, file, sql);
    }
    console.log(`All migrations applied for schema: ${schemaName}`);
  } finally {
    if (!client) await localClient.end();
  }
}

async function runForAllTenants() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query('SELECT schema_name FROM private.organizations ORDER BY id;');
    if (rows.length === 0) {
      console.log('No organizations found.');
      return;
    }
    for (const row of rows) {
      const schemaName = row.schema_name;
      console.log(`\n--- Running migrations for tenant schema: ${schemaName} ---`);
      await runMigrations(schemaName, client);
    }
    console.log('\nAll tenant migrations complete.'); 
  } finally {
    await client.end();
  }
}

// Main entrypoint
if (typeof require !== 'undefined' && require.main === module) {
  const arg = process.argv[2];
  if (arg === 'all-tenants') {
    runForAllTenants().catch(err => {
      console.error('Migration runner error:', err);
      process.exit(1);
    });
  } else {
    const schemaName = arg || 'public';
    runMigrations(schemaName).catch(err => {
      console.error('Migration runner error:', err);
      process.exit(1);
    });
  }
} 