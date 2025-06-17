// findTenantSchemas.ts
// Usage: npx ts-node scripts/findTenantSchemas.ts
// Requires: npm install pg dotenv @types/node

import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function findTenantSchemas() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query(`
      SELECT schema_name FROM public.organizations ORDER BY id;
    `);
    if (rows.length === 0) {
      console.log('No organizations found.');
    } else {
      console.log('Expected tenant schemas:');
      for (const row of rows) {
        console.log(row.schema_name);
      }
    }
  } finally {
    await client.end();
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  findTenantSchemas().catch(err => {
    console.error('Error finding tenant schemas:', err);
    process.exit(1);
  });
} 