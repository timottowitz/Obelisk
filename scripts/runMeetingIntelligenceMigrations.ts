#!/usr/bin/env tsx
/**
 * Meeting Intelligence Migration Runner
 * Applies the meeting intelligence schema extensions to all existing tenant schemas
 * Maintains full backward compatibility with existing legal SaaS functionality
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
import pkg from 'pg';
const { Client } = pkg;

// Load environment variables
config();

interface TenantSchema {
  schema_name: string;
  organization_id: string;
  organization_name: string;
}

interface MigrationResult {
  schema: string;
  success: boolean;
  error?: string;
  tablesCreated: number;
  indexesCreated: number;
}

class MeetingIntelligenceMigrationRunner {
  private client: Client;
  private migrationSQL: string;

  constructor() {
    this.client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Load the migration SQL file
    const migrationPath = join(process.cwd(), 'supabase/tenant_migrations/20250723_200000_meeting_intelligence_extension.sql');
    this.migrationSQL = readFileSync(migrationPath, 'utf8');
  }

  /**
   * Run migrations on all tenant schemas
   */
  async runMigrations(): Promise<void> {
    console.log('🚀 Starting Meeting Intelligence Migration Runner');
    console.log('===================================================');

    try {
      await this.client.connect();
      console.log('✅ Connected to database');

      // Get all tenant schemas
      const tenantSchemas = await this.getTenantSchemas();
      console.log(`📊 Found ${tenantSchemas.length} tenant schemas to migrate`);

      if (tenantSchemas.length === 0) {
        console.log('⚠️  No tenant schemas found. Nothing to migrate.');
        return;
      }

      // Run migrations for each schema
      const results: MigrationResult[] = [];
      
      for (const schema of tenantSchemas) {
        console.log(`\n🔄 Migrating schema: ${schema.schema_name} (${schema.organization_name})`);
        const result = await this.migrateSchema(schema);
        results.push(result);
        
        if (result.success) {
          console.log(`✅ Successfully migrated ${schema.schema_name}`);
          console.log(`   - Tables created: ${result.tablesCreated}`);
          console.log(`   - Indexes created: ${result.indexesCreated}`);
        } else {
          console.log(`❌ Failed to migrate ${schema.schema_name}: ${result.error}`);
        }
      }

      // Summary
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      console.log('\n📋 Migration Summary');
      console.log('===================');
      console.log(`✅ Successful: ${successful}`);
      console.log(`❌ Failed: ${failed}`);
      console.log(`📊 Total: ${results.length}`);

      if (failed > 0) {
        console.log('\n❌ Failed Schemas:');
        results.filter(r => !r.success).forEach(r => {
          console.log(`   - ${r.schema}: ${r.error}`);
        });
      }

      console.log('\n🎉 Meeting Intelligence Migration Complete!');

    } catch (error) {
      console.error('💥 Migration runner failed:', error);
      throw error;
    } finally {
      await this.client.end();
    }
  }

  /**
   * Get all tenant schemas from the database
   */
  private async getTenantSchemas(): Promise<TenantSchema[]> {
    const query = `
      SELECT 
        o.schema_name,
        o.id as organization_id,
        o.name as organization_name
      FROM private.organizations o
      WHERE o.schema_name IS NOT NULL
        AND o.schema_name != ''
      ORDER BY o.created_at ASC
    `;

    const result = await this.client.query(query);
    return result.rows;
  }

  /**
   * Migrate a single schema
   */
  private async migrateSchema(schema: TenantSchema): Promise<MigrationResult> {
    const transaction = await this.client.query('BEGIN');
    
    try {
      // Replace {{schema}} placeholder with actual schema name
      const schemaSQL = this.migrationSQL.replace(/\{\{schema\}\}/g, schema.schema_name);
      
      // Execute the migration
      await this.client.query(schemaSQL);
      
      // Count what was created (for reporting)
      const tablesCreated = await this.countTablesCreated(schema.schema_name);
      const indexesCreated = await this.countIndexesCreated(schema.schema_name);
      
      await this.client.query('COMMIT');
      
      return {
        schema: schema.schema_name,
        success: true,
        tablesCreated,
        indexesCreated
      };

    } catch (error) {
      await this.client.query('ROLLBACK');
      
      // Check if error is due to tables already existing (not actually an error)
      if (error.message.includes('already exists')) {
        console.log(`   ℹ️  Schema ${schema.schema_name} already has meeting intelligence tables`);
        return {
          schema: schema.schema_name,
          success: true,
          tablesCreated: 0,
          indexesCreated: 0
        };
      }
      
      return {
        schema: schema.schema_name,
        success: false,
        error: error.message,
        tablesCreated: 0,
        indexesCreated: 0
      };
    }
  }

  /**
   * Count meeting intelligence tables created
   */
  private async countTablesCreated(schemaName: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = $1 
        AND table_name IN (
          'meeting_participants',
          'meeting_action_items', 
          'meeting_decisions',
          'meeting_topics'
        )
    `;
    
    const result = await this.client.query(query, [schemaName]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Count indexes created
   */
  private async countIndexesCreated(schemaName: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM pg_indexes 
      WHERE schemaname = $1 
        AND indexname LIKE 'idx_meeting_%'
    `;
    
    const result = await this.client.query(query, [schemaName]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Validate migration success
   */
  async validateMigration(): Promise<void> {
    console.log('\n🔍 Validating migration...');
    
    const tenantSchemas = await this.getTenantSchemas();
    
    for (const schema of tenantSchemas) {
      // Check if call_recordings table has new columns
      const columnsQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = $1 
          AND table_name = 'call_recordings'
          AND column_name IN ('meeting_type', 'participant_count', 'speakers_metadata')
      `;
      
      const columns = await this.client.query(columnsQuery, [schema.schema_name]);
      
      if (columns.rows.length < 3) {
        console.log(`⚠️  Schema ${schema.schema_name} missing some call_recordings columns`);
      }
      
      // Check if new tables exist
      const tablesQuery = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = $1
          AND table_name IN ('meeting_participants', 'meeting_action_items', 'meeting_decisions', 'meeting_topics')
      `;
      
      const tables = await this.client.query(tablesQuery, [schema.schema_name]);
      
      if (tables.rows.length < 4) {
        console.log(`⚠️  Schema ${schema.schema_name} missing some meeting intelligence tables`);
      } else {
        console.log(`✅ Schema ${schema.schema_name} migration validated`);
      }
    }
    
    console.log('✅ Migration validation complete');
  }

  /**
   * Rollback migrations (emergency use only)
   */
  async rollbackMigrations(): Promise<void> {
    console.log('🔄 Rolling back meeting intelligence migrations...');
    console.log('⚠️  WARNING: This will remove all meeting intelligence data!');
    
    const tenantSchemas = await this.getTenantSchemas();
    
    for (const schema of tenantSchemas) {
      try {
        // Drop new tables
        await this.client.query(`DROP TABLE IF EXISTS ${schema.schema_name}.meeting_topics CASCADE`);
        await this.client.query(`DROP TABLE IF EXISTS ${schema.schema_name}.meeting_decisions CASCADE`);
        await this.client.query(`DROP TABLE IF EXISTS ${schema.schema_name}.meeting_action_items CASCADE`);
        await this.client.query(`DROP TABLE IF EXISTS ${schema.schema_name}.meeting_participants CASCADE`);
        
        // Remove new columns from call_recordings
        await this.client.query(`ALTER TABLE ${schema.schema_name}.call_recordings DROP COLUMN IF EXISTS meeting_type`);
        await this.client.query(`ALTER TABLE ${schema.schema_name}.call_recordings DROP COLUMN IF EXISTS participant_count`);
        await this.client.query(`ALTER TABLE ${schema.schema_name}.call_recordings DROP COLUMN IF EXISTS agenda_text`);
        await this.client.query(`ALTER TABLE ${schema.schema_name}.call_recordings DROP COLUMN IF EXISTS speakers_metadata`);
        await this.client.query(`ALTER TABLE ${schema.schema_name}.call_recordings DROP COLUMN IF EXISTS meeting_duration_minutes`);
        await this.client.query(`ALTER TABLE ${schema.schema_name}.call_recordings DROP COLUMN IF EXISTS scheduled_start_time`);
        
        console.log(`✅ Rolled back ${schema.schema_name}`);
        
      } catch (error) {
        console.log(`❌ Failed to rollback ${schema.schema_name}: ${error.message}`);
      }
    }
    
    console.log('✅ Rollback complete');
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'migrate';
  
  const runner = new MeetingIntelligenceMigrationRunner();
  
  try {
    switch (command) {
      case 'migrate':
        await runner.runMigrations();
        break;
        
      case 'validate':
        await runner.validateMigration();
        break;
        
      case 'rollback':
        console.log('⚠️  Are you sure you want to rollback? This will remove all meeting intelligence data!');
        console.log('⚠️  To confirm, run: npm run meeting-intelligence:rollback-confirm');
        break;
        
      case 'rollback-confirm':
        await runner.rollbackMigrations();
        break;
        
      default:
        console.log('Usage: npm run meeting-intelligence:migrate [migrate|validate|rollback]');
        console.log('');
        console.log('Commands:');
        console.log('  migrate  - Run meeting intelligence migrations on all tenant schemas');
        console.log('  validate - Validate that migrations were applied successfully');
        console.log('  rollback - Remove meeting intelligence features (DESTRUCTIVE)');
        break;
    }
    
  } catch (error) {
    console.error('💥 Command failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}

export { MeetingIntelligenceMigrationRunner };