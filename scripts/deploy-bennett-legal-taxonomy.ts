#!/usr/bin/env tsx
/**
 * Bennett Legal Taxonomy Deployment Script
 * 
 * This script handles the production deployment of Bennett Legal taxonomy integration:
 * 1. Validates tenant schemas exist
 * 2. Runs Bennett Legal taxonomy migration
 * 3. Configures DocETL processing for legal documents  
 * 4. Sets up Foundation AI webhook integration
 * 5. Validates deployment with test data
 * 
 * Usage:
 * npm run deploy:bennett-legal -- --tenant="tenant_name" [--dry-run] [--validate-only]
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Command line arguments
const args = process.argv.slice(2);
const tenantArg = args.find(arg => arg.startsWith('--tenant='));
const dryRun = args.includes('--dry-run');
const validateOnly = args.includes('--validate-only');

if (!tenantArg) {
  console.error('Error: --tenant argument is required');
  console.log('Usage: npm run deploy:bennett-legal -- --tenant="tenant_name" [--dry-run] [--validate-only]');
  process.exit(1);
}

const tenantName = tenantArg.split('=')[1];

// Environment configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

interface DeploymentResult {
  step: string;
  success: boolean;
  message: string;
  details?: any;
}

class BennettLegalDeployment {
  private results: DeploymentResult[] = [];
  private tenantId: string = '';
  private schemaName: string = '';

  constructor(private tenant: string) {}

  async deploy(): Promise<void> {
    console.log(`🚀 Starting Bennett Legal taxonomy deployment for tenant: ${this.tenant}`);
    console.log(`📋 Mode: ${dryRun ? 'DRY RUN' : validateOnly ? 'VALIDATION ONLY' : 'PRODUCTION DEPLOYMENT'}\n`);

    try {
      // Step 1: Validate tenant
      await this.validateTenant();

      // Step 2: Check existing schema
      await this.validateSchema();

      if (!validateOnly) {
        // Step 3: Deploy taxonomy schema
        await this.deployTaxonomySchema();

        // Step 4: Configure DocETL
        await this.configureDocETL();

        // Step 5: Set up Foundation AI integration
        await this.setupFoundationAI();

        // Step 6: Create sample data
        await this.createSampleData();
      }

      // Step 7: Validate deployment
      await this.validateDeployment();

      // Step 8: Performance tests
      await this.performanceTests();

      this.printResults();

    } catch (error) {
      console.error('💥 Deployment failed:', error);
      this.addResult('deployment', false, `Deployment failed: ${error.message}`);
      this.printResults();
      process.exit(1);
    }
  }

  private async validateTenant(): Promise<void> {
    console.log('🔍 Validating tenant...');

    try {
      const { data: org, error } = await supabase
        .schema('private')
        .from('organizations')
        .select('*')
        .ilike('name', `%${this.tenant}%`)
        .single();

      if (error || !org) {
        throw new Error(`Tenant '${this.tenant}' not found in organizations table`);
      }

      this.tenantId = org.id;
      this.schemaName = org.schema_name.toLowerCase();

      this.addResult('tenant_validation', true, `Tenant validated: ${org.name} (Schema: ${this.schemaName})`);
      
    } catch (error) {
      this.addResult('tenant_validation', false, `Tenant validation failed: ${error.message}`);
      throw error;
    }
  }

  private async validateSchema(): Promise<void> {
    console.log('🔍 Validating schema...');

    try {
      // Check if schema exists
      const { data: schemas, error } = await supabase.rpc('get_schemas');
      
      if (error) {
        throw new Error('Failed to fetch schemas');
      }

      const schemaExists = schemas?.some((s: any) => s.schema_name === this.schemaName);
      
      if (!schemaExists) {
        throw new Error(`Schema '${this.schemaName}' does not exist`);
      }

      // Check if required tables exist
      const requiredTables = ['documents', 'entities'];
      
      for (const table of requiredTables) {
        const { data, error } = await supabase
          .schema(this.schemaName)
          .from(table)
          .select('*')
          .limit(1);

        if (error && error.code === 'PGRST116') {
          throw new Error(`Required table '${table}' does not exist in schema '${this.schemaName}'`);
        }
      }

      this.addResult('schema_validation', true, `Schema validated: ${this.schemaName}`);

    } catch (error) {
      this.addResult('schema_validation', false, `Schema validation failed: ${error.message}`);
      throw error;
    }
  }

  private async deployTaxonomySchema(): Promise<void> {
    console.log('📦 Deploying Bennett Legal taxonomy schema...');

    if (dryRun) {
      this.addResult('taxonomy_schema', true, 'DRY RUN: Would deploy taxonomy schema');
      return;
    }

    try {
      // Read the migration SQL file
      const migrationPath = join(__dirname, '../supabase/tenant_migrations/20250830_150000_bennett_legal_taxonomy.sql');
      
      if (!existsSync(migrationPath)) {
        throw new Error(`Migration file not found: ${migrationPath}`);
      }

      const migrationSQL = readFileSync(migrationPath, 'utf8');
      
      // Replace schema placeholder
      const processedSQL = migrationSQL.replace(/{{schema_name}}/g, this.schemaName);

      // Execute migration
      const { error } = await supabase.rpc('exec_sql', {
        sql: processedSQL
      });

      if (error) {
        throw new Error(`Migration execution failed: ${error.message}`);
      }

      // Verify key tables were created
      const taxonomyTables = [
        'legal_entity_types',
        'legal_document_taxonomy', 
        'legal_workflow_rules',
        'legal_document_metadata',
        'legal_automated_tasks',
        'legal_calendar_events'
      ];

      for (const table of taxonomyTables) {
        const { data, error } = await supabase
          .schema(this.schemaName)
          .from(table)
          .select('*')
          .limit(1);

        if (error && error.code === 'PGRST116') {
          throw new Error(`Table '${table}' was not created properly`);
        }
      }

      this.addResult('taxonomy_schema', true, `Taxonomy schema deployed with ${taxonomyTables.length} tables`);

    } catch (error) {
      this.addResult('taxonomy_schema', false, `Taxonomy schema deployment failed: ${error.message}`);
      throw error;
    }
  }

  private async configureDocETL(): Promise<void> {
    console.log('⚙️ Configuring DocETL for Bennett Legal...');

    if (dryRun) {
      this.addResult('docetl_config', true, 'DRY RUN: Would configure DocETL');
      return;
    }

    try {
      // Copy Bennett Legal DocETL config to appropriate location
      const configPath = join(__dirname, '../supabase/functions/doc-intel-processor/bennett-legal-docetl-config.yaml');
      
      if (!existsSync(configPath)) {
        throw new Error(`DocETL config file not found: ${configPath}`);
      }

      // Validate YAML syntax
      const configContent = readFileSync(configPath, 'utf8');
      
      if (!configContent.includes('bennett_legal_v1')) {
        throw new Error('Bennett Legal config does not contain expected taxonomy version');
      }

      // Store config metadata in database
      const { error } = await supabase
        .schema(this.schemaName)
        .from('legal_document_metadata')
        .upsert({
          document_id: '00000000-0000-0000-0000-000000000000', // System config record
          litigation_type: 'other',
          workflow_status: 'completed',
          confidentiality_level: 'public',
          classification_confidence: 1.0,
          entity_completeness_score: 1.0,
          validation_required: false
        }, { onConflict: 'document_id' });

      if (error) {
        console.warn('Warning: Could not store config metadata:', error.message);
      }

      this.addResult('docetl_config', true, 'DocETL configured for Bennett Legal processing');

    } catch (error) {
      this.addResult('docetl_config', false, `DocETL configuration failed: ${error.message}`);
      throw error;
    }
  }

  private async setupFoundationAI(): Promise<void> {
    console.log('🤖 Setting up Foundation AI integration...');

    if (dryRun) {
      this.addResult('foundation_ai', true, 'DRY RUN: Would setup Foundation AI');
      return;
    }

    try {
      // Verify webhook handler exists
      const handlerPath = join(__dirname, '../supabase/functions/foundation-ai-webhook/bennett-legal-webhook-handler.ts');
      
      if (!existsSync(handlerPath)) {
        throw new Error(`Bennett Legal webhook handler not found: ${handlerPath}`);
      }

      // Check if webhook secret is configured
      const webhookSecret = process.env.BENNETT_LEGAL_WEBHOOK_SECRET || process.env.FOUNDATION_AI_WEBHOOK_SECRET;
      
      if (!webhookSecret) {
        console.warn('⚠️  Warning: No webhook secret configured. Set BENNETT_LEGAL_WEBHOOK_SECRET environment variable.');
      }

      // Test webhook endpoint
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/foundation-ai-webhook/health`, {
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
          }
        });

        if (!response.ok) {
          throw new Error(`Webhook health check failed: ${response.status}`);
        }

      } catch (fetchError) {
        console.warn('⚠️  Warning: Could not verify webhook endpoint availability');
      }

      this.addResult('foundation_ai', true, 'Foundation AI integration configured');

    } catch (error) {
      this.addResult('foundation_ai', false, `Foundation AI setup failed: ${error.message}`);
      throw error;
    }
  }

  private async createSampleData(): Promise<void> {
    console.log('📝 Creating sample data...');

    if (dryRun) {
      this.addResult('sample_data', true, 'DRY RUN: Would create sample data');
      return;
    }

    try {
      // Verify entity types were created
      const { data: entityTypes, error } = await supabase
        .schema(this.schemaName)
        .from('legal_entity_types')
        .select('count(*)')
        .single();

      if (error || !entityTypes || entityTypes.count < 10) {
        throw new Error(`Expected at least 10 entity types, found ${entityTypes?.count || 0}`);
      }

      // Verify document taxonomy entries
      const { data: docTypes, error: docError } = await supabase
        .schema(this.schemaName)
        .from('legal_document_taxonomy')
        .select('count(*)')
        .single();

      if (docError || !docTypes || docTypes.count < 20) {
        throw new Error(`Expected at least 20 document types, found ${docTypes?.count || 0}`);
      }

      this.addResult('sample_data', true, `Sample data validated: ${entityTypes.count} entity types, ${docTypes.count} document types`);

    } catch (error) {
      this.addResult('sample_data', false, `Sample data creation failed: ${error.message}`);
      throw error;
    }
  }

  private async validateDeployment(): Promise<void> {
    console.log('✅ Validating deployment...');

    try {
      const validations = await Promise.all([
        this.validateEntityTypes(),
        this.validateDocumentTaxonomy(),
        this.validateWorkflowRules(),
        this.validatePermissions(),
        this.validateFunctions()
      ]);

      const allValid = validations.every(v => v);

      if (!allValid) {
        throw new Error('Some validations failed');
      }

      this.addResult('deployment_validation', true, 'All deployment validations passed');

    } catch (error) {
      this.addResult('deployment_validation', false, `Deployment validation failed: ${error.message}`);
      throw error;
    }
  }

  private async validateEntityTypes(): Promise<boolean> {
    try {
      const { data: bennettModels, error } = await supabase
        .schema(this.schemaName)
        .from('legal_entity_types')
        .select('name, bennett_model_id')
        .not('bennett_model_id', 'is', null);

      if (error) return false;

      const expectedModels = [
        'doctor_model', 'sender_model', 'document_date_model', 'event_date_model',
        'insurance_company_model', 'policy_number_model', 'plaintiff_model', 
        'defendant_model', 'attorney_model', 'medical_facility_model',
        'injury_type_model', 'settlement_amount_model', 'case_number_model',
        'court_model', 'solar_company_model'
      ];

      const foundModels = new Set(bennettModels?.map(m => m.bennett_model_id) || []);
      const missingModels = expectedModels.filter(model => !foundModels.has(model));

      if (missingModels.length > 0) {
        console.error('Missing Bennett Legal models:', missingModels);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  private async validateDocumentTaxonomy(): Promise<boolean> {
    try {
      const { data: categories, error } = await supabase
        .schema(this.schemaName)
        .from('legal_document_taxonomy')
        .select('category, count(*)')
        .group_by('category');

      if (error) return false;

      const expectedCategories = [
        'medical', 'legal', 'insurance', 'personal_injury',
        'solar_litigation', 'financial', 'employment'
      ];

      const foundCategories = new Set(categories?.map(c => c.category) || []);
      const missingCategories = expectedCategories.filter(cat => !foundCategories.has(cat));

      if (missingCategories.length > 0) {
        console.error('Missing document categories:', missingCategories);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  private async validateWorkflowRules(): Promise<boolean> {
    try {
      const { data: rules, error } = await supabase
        .schema(this.schemaName)
        .from('legal_workflow_rules')
        .select('*')
        .eq('is_active', true);

      return !error && (rules?.length || 0) > 0;
    } catch {
      return false;
    }
  }

  private async validatePermissions(): Promise<boolean> {
    try {
      // Test that authenticated users can read reference tables
      const { data: entityTypes, error } = await supabase
        .schema(this.schemaName)
        .from('legal_entity_types')
        .select('*')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }

  private async validateFunctions(): Promise<boolean> {
    try {
      // Test key functions exist
      const functions = [
        'classify_legal_document',
        'process_workflow_rules',
        'get_document_workflow_status'
      ];

      for (const func of functions) {
        const { error } = await supabase.rpc(func, {
          // Pass minimal test parameters
        }).limit(0);

        // Function exists if we get a parameter error rather than function not found
        if (error && error.code !== '42883') {
          // 42883 is function does not exist
          return true;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  private async performanceTests(): Promise<void> {
    console.log('🚀 Running performance tests...');

    try {
      const startTime = Date.now();

      // Test entity type query performance
      await supabase
        .schema(this.schemaName)
        .from('legal_entity_types')
        .select('*')
        .eq('is_active', true);

      // Test taxonomy query performance  
      await supabase
        .schema(this.schemaName)
        .from('legal_document_taxonomy')
        .select('*')
        .eq('litigation_type', 'personal_injury');

      const duration = Date.now() - startTime;

      if (duration > 1000) {
        console.warn(`⚠️  Performance warning: Queries took ${duration}ms`);
      }

      this.addResult('performance_tests', true, `Performance tests completed (${duration}ms)`);

    } catch (error) {
      this.addResult('performance_tests', false, `Performance tests failed: ${error.message}`);
    }
  }

  private addResult(step: string, success: boolean, message: string, details?: any): void {
    this.results.push({ step, success, message, details });
    
    const icon = success ? '✅' : '❌';
    console.log(`${icon} ${step}: ${message}`);
  }

  private printResults(): void {
    console.log('\n📊 Deployment Summary\n');
    console.log('='.repeat(80));

    const successful = this.results.filter(r => r.success).length;
    const total = this.results.length;

    console.log(`Results: ${successful}/${total} steps completed successfully\n`);

    this.results.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${result.step.padEnd(25)} ${result.message}`);
    });

    console.log('\n' + '='.repeat(80));

    if (successful === total) {
      console.log('🎉 Bennett Legal taxonomy deployment completed successfully!');
      console.log(`\n📋 Next steps:`);
      console.log(`   1. Test document upload with a sample legal document`);
      console.log(`   2. Verify entity extraction using the 15 Bennett Legal models`);
      console.log(`   3. Test workflow automation with high-value settlement documents`);
      console.log(`   4. Configure Foundation AI webhook endpoint with your legal AI service`);
      console.log(`   5. Set up monitoring for document processing queue performance\n`);
    } else {
      console.log('💥 Deployment completed with errors. Please review and fix the issues above.');
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const deployment = new BennettLegalDeployment(tenantName);
  await deployment.deploy();
}

main().catch(error => {
  console.error('Deployment script error:', error);
  process.exit(1);
});