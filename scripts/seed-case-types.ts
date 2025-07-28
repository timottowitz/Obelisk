#!/usr/bin/env tsx

/**
 * Case Types Seeder Script
 * 
 * This script seeds default case types and folder templates for organizations.
 * Designed for site administrators to initialize or update case type configurations.
 * 
 * Usage:
 *   npm run seed:case-types                           # Seed all organizations
 *   npm run seed:case-types -- --org=org_12345       # Seed specific organization
 *   npm run seed:case-types -- --force               # Force seed even if data exists
 *   npm run seed:case-types -- --preview             # Preview what would be seeded
 *   npm run seed:case-types -- --help                # Show help
 */

import { config } from 'dotenv';
import pkg from 'pg';
import type { Client } from 'pg';
const { Client: PgClient } = pkg;
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config();

// Type definitions
interface FolderTemplate {
  name: string;
  path: string;
  parent_path?: string | null;
  sort_order: number;
  is_required?: boolean;
}

interface CaseTypeConfig {
  name: string;
  display_name: string;
  description: string;
  color: string;
  icon: string;
  folder_templates: FolderTemplate[];
}

interface Organization {
  id: string;
  name: string;
  schema_name: string;
}

interface SeederArgs {
  org: string | null;
  force: boolean;
  preview: boolean;
  help: boolean;
  config: string | null;
}

interface SeederStats {
  organizations: number;
  caseTypes: number;
  templates: number;
  errors: number;
}

interface OrgStats {
  caseTypes: number;
  templates: number;
  errors: number;
}

interface Config {
  databaseUrl: string | undefined;
}

// Configuration
const CONFIG: Config = {
  databaseUrl: process.env.DATABASE_URL,
};

// Default case types configuration
const DEFAULT_CASE_TYPES: CaseTypeConfig[] = [
  {
    name: 'general_legal',
    display_name: 'General Legal',
    description: 'General legal matters and consultations',
    color: '#3B82F6',
    icon: 'scale',
    folder_templates: [
      { name: 'Client Documents', path: '/client-documents', sort_order: 1 },
      { name: 'Correspondence', path: '/correspondence', sort_order: 2 },
      { name: 'Legal Research', path: '/legal-research', sort_order: 3 },
      { name: 'Billing', path: '/billing', sort_order: 4 },
    ],
  },
  {
    name: 'contract_review',
    display_name: 'Contract Review',
    description: 'Contract analysis and review cases',
    color: '#10B981',
    icon: 'document-text',
    folder_templates: [
      { name: 'Original Contracts', path: '/original-contracts', sort_order: 1 },
      { name: 'Redlined Versions', path: '/redlined-versions', sort_order: 2 },
      { name: 'Final Versions', path: '/final-versions', sort_order: 3 },
      { name: 'Supporting Documents', path: '/supporting-documents', sort_order: 4 },
    ],
  },
  {
    name: 'litigation',
    display_name: 'Litigation',
    description: 'Court cases and legal disputes',
    color: '#EF4444',
    icon: 'court-hammer',
    folder_templates: [
      { name: 'Pleadings', path: '/pleadings', sort_order: 1 },
      { name: 'Discovery', path: '/discovery', sort_order: 2 },
      { name: 'Evidence', path: '/evidence', sort_order: 3 },
      { name: 'Court Filings', path: '/court-filings', sort_order: 4 },
      { name: 'Witness Documents', path: '/witness-documents', sort_order: 5 },
      { name: 'Expert Reports', path: '/expert-reports', sort_order: 6 },
    ],
  },
  {
    name: 'corporate_law',
    display_name: 'Corporate Law',
    description: 'Business formation and corporate matters',
    color: '#8B5CF6',
    icon: 'building-office',
    folder_templates: [
      { name: 'Formation Documents', path: '/formation-documents', sort_order: 1 },
      { name: 'Board Resolutions', path: '/board-resolutions', sort_order: 2 },
      { name: 'Shareholder Agreements', path: '/shareholder-agreements', sort_order: 3 },
      { name: 'Compliance Documents', path: '/compliance-documents', sort_order: 4 },
      { name: 'Financial Records', path: '/financial-records', sort_order: 5 },
    ],
  },
  {
    name: 'real_estate',
    display_name: 'Real Estate',
    description: 'Property transactions and real estate law',
    color: '#F59E0B',
    icon: 'home',
    folder_templates: [
      { name: 'Purchase Agreements', path: '/purchase-agreements', sort_order: 1 },
      { name: 'Title Documents', path: '/title-documents', sort_order: 2 },
      { name: 'Inspections', path: '/inspections', sort_order: 3 },
      { name: 'Financing Documents', path: '/financing-documents', sort_order: 4 },
      { name: 'Closing Documents', path: '/closing-documents', sort_order: 5 },
    ],
  },
  {
    name: 'family_law',
    display_name: 'Family Law',
    description: 'Divorce, custody, and family legal matters',
    color: '#EC4899',
    icon: 'users',
    folder_templates: [
      { name: 'Divorce Proceedings', path: '/divorce-proceedings', sort_order: 1 },
      { name: 'Child Custody', path: '/child-custody', sort_order: 2 },
      { name: 'Financial Disclosure', path: '/financial-disclosure', sort_order: 3 },
      { name: 'Support Documents', path: '/support-documents', sort_order: 4 },
      { name: 'Mediation Records', path: '/mediation-records', sort_order: 5 },
    ],
  },
  {
    name: 'employment_law',
    display_name: 'Employment Law',
    description: 'Workplace disputes and employment issues',
    color: '#06B6D4',
    icon: 'briefcase',
    folder_templates: [
      { name: 'Employment Contracts', path: '/employment-contracts', sort_order: 1 },
      { name: 'HR Policies', path: '/hr-policies', sort_order: 2 },
      { name: 'Complaint Documentation', path: '/complaint-documentation', sort_order: 3 },
      { name: 'Investigation Records', path: '/investigation-records', sort_order: 4 },
      { name: 'Settlement Documents', path: '/settlement-documents', sort_order: 5 },
    ],
  },
  {
    name: 'intellectual_property',
    display_name: 'Intellectual Property',
    description: 'Patents, trademarks, and IP protection',
    color: '#7C3AED',
    icon: 'lightbulb',
    folder_templates: [
      { name: 'Patent Applications', path: '/patent-applications', sort_order: 1 },
      { name: 'Trademark Filings', path: '/trademark-filings', sort_order: 2 },
      { name: 'Copyright Documents', path: '/copyright-documents', sort_order: 3 },
      { name: 'Licensing Agreements', path: '/licensing-agreements', sort_order: 4 },
      { name: 'IP Research', path: '/ip-research', sort_order: 5 },
    ],
  },
  {
    name: 'criminal_defense',
    display_name: 'Criminal Defense',
    description: 'Criminal law and defense cases',
    color: '#DC2626',
    icon: 'shield-check',
    folder_templates: [
      { name: 'Case Files', path: '/case-files', sort_order: 1 },
      { name: 'Evidence', path: '/evidence', sort_order: 2 },
      { name: 'Witness Statements', path: '/witness-statements', sort_order: 3 },
      { name: 'Court Documents', path: '/court-documents', sort_order: 4 },
      { name: 'Investigation', path: '/investigation', sort_order: 5 },
    ],
  },
  {
    name: 'bankruptcy',
    display_name: 'Bankruptcy',
    description: 'Bankruptcy and debt restructuring cases',
    color: '#059669',
    icon: 'calculator',
    folder_templates: [
      { name: 'Petition Documents', path: '/petition-documents', sort_order: 1 },
      { name: 'Financial Statements', path: '/financial-statements', sort_order: 2 },
      { name: 'Asset Documentation', path: '/asset-documentation', sort_order: 3 },
      { name: 'Creditor Communications', path: '/creditor-communications', sort_order: 4 },
      { name: 'Court Orders', path: '/court-orders', sort_order: 5 },
    ],
  },
];

class CaseTypeSeeder {
  private client: Client;
  private args: SeederArgs;
  private stats: SeederStats;

  constructor() {
    this.client = new PgClient({
      connectionString: CONFIG.databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    this.args = this.parseArgs();
    this.stats = {
      organizations: 0,
      caseTypes: 0,
      templates: 0,
      errors: 0,
    };
  }

  private parseArgs(): SeederArgs {
    const args: SeederArgs = {
      org: null,
      force: false,
      preview: false,
      help: false,
      config: null,
    };

    process.argv.slice(2).forEach(arg => {
      if (arg.startsWith('--org=')) {
        args.org = arg.split('=')[1];
      } else if (arg === '--force') {
        args.force = true;
      } else if (arg === '--preview') {
        args.preview = true;
      } else if (arg === '--help') {
        args.help = true;
      } else if (arg.startsWith('--config=')) {
        args.config = arg.split('=')[1];
      }
    });

    return args;
  }

  private showHelp(): void {
    console.log(`
Case Types Seeder Script

USAGE:
  npm run seed:case-types [OPTIONS]

OPTIONS:
  --org=<schema_name>     Seed specific organization by schema name
  --force                 Force seed even if case types already exist
  --preview               Preview what would be seeded without making changes
  --config=<file>         Use custom case types configuration file
  --help                  Show this help message

EXAMPLES:
  npm run seed:case-types
  npm run seed:case-types -- --org=org_2ycgcrzpztj
  npm run seed:case-types -- --force
  npm run seed:case-types -- --preview
  npm run seed:case-types -- --config=./custom-case-types.json

ENVIRONMENT VARIABLES:
  DATABASE_URL              Required: PostgreSQL connection string

CONFIGURATION FILE FORMAT:
  JSON file with same structure as DEFAULT_CASE_TYPES array
    `);
  }

  private async init(): Promise<void> {
    if (this.args.help) {
      this.showHelp();
      process.exit(0);
    }

    // Validate environment
    if (!CONFIG.databaseUrl) {
      console.error('❌ Missing required environment variable: DATABASE_URL');
      process.exit(1);
    }

    // Connect to database
    await this.client.connect();
    console.log('🚀 Case Types Seeder initialized');
  }

  private async loadConfiguration(): Promise<CaseTypeConfig[]> {
    if (this.args.config) {
      try {
        const configPath = path.resolve(this.args.config);
        const configData = fs.readFileSync(configPath, 'utf8');
        const customConfig: CaseTypeConfig[] = JSON.parse(configData);
        console.log(`📄 Using custom configuration: ${configPath}`);
        return customConfig;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Failed to load configuration file: ${errorMessage}`);
        process.exit(1);
      }
    }
    return DEFAULT_CASE_TYPES;
  }

  private async getOrganizations(): Promise<Organization[]> {
    try {
      if (this.args.org) {
        // Get specific organization
        const result = await this.client.query(
          'SELECT id, name, schema_name FROM private.organizations WHERE schema_name = $1',
          [this.args.org]
        );

        if (result.rows.length === 0) {
          console.error(`❌ Organization not found: ${this.args.org}`);
          process.exit(1);
        }

        return result.rows as Organization[];
      } else {
        // Get all organizations
        const result = await this.client.query(
          'SELECT id, name, schema_name FROM private.organizations ORDER BY created_at'
        );

        return result.rows as Organization[];
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Database connection error:', errorMessage);
      process.exit(1);
    }
  }

  private async seedCaseTypesForOrg(organization: Organization, caseTypesConfig: CaseTypeConfig[]): Promise<void> {
    const schema = organization.schema_name.toLowerCase();
    console.log(`\n📁 Processing organization: ${organization.name} (${schema})`);

    const orgStats: OrgStats = { caseTypes: 0, templates: 0, errors: 0 };

    for (const caseTypeConfig of caseTypesConfig) {
      try {
        // Check if case type already exists
        const existingCaseTypeResult = await this.client.query(
          `SELECT id FROM ${schema}.case_types WHERE name = $1`,
          [caseTypeConfig.name]
        );

        let caseTypeId: string;

        if (existingCaseTypeResult.rows.length > 0) {
          if (!this.args.force) {
            console.log(`  ⏭️  ${caseTypeConfig.display_name} already exists, skipping...`);
            continue;
          }
          caseTypeId = existingCaseTypeResult.rows[0].id;
          console.log(`  🔄 ${caseTypeConfig.display_name} exists, forcing update...`);
        } else {
          // Create case type
          const newCaseTypeResult = await this.client.query(
            `INSERT INTO ${schema}.case_types (name, display_name, description, color, icon) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [
              caseTypeConfig.name,
              caseTypeConfig.display_name,
              caseTypeConfig.description,
              caseTypeConfig.color,
              caseTypeConfig.icon
            ]
          );

          caseTypeId = newCaseTypeResult.rows[0].id;
          orgStats.caseTypes++;
          console.log(`  ✅ Created case type: ${caseTypeConfig.display_name}`);
        }

        // Create/update folder templates
        for (const template of caseTypeConfig.folder_templates) {
          try {
            // Check if template already exists
            const existingTemplateResult = await this.client.query(
              `SELECT id FROM ${schema}.folder_templates WHERE case_type_id = $1 AND path = $2`,
              [caseTypeId, template.path]
            );

            if (existingTemplateResult.rows.length > 0) {
              if (!this.args.force) {
                continue;
              }
              // Update existing template
              await this.client.query(
                `UPDATE ${schema}.folder_templates 
                 SET name = $1, sort_order = $2, is_required = $3 
                 WHERE id = $4`,
                [
                  template.name,
                  template.sort_order,
                  template.is_required !== false,
                  existingTemplateResult.rows[0].id
                ]
              );
            } else {
              // Create new template
              await this.client.query(
                `INSERT INTO ${schema}.folder_templates 
                 (case_type_id, name, path, parent_path, sort_order, is_required) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                  caseTypeId,
                  template.name,
                  template.path,
                  template.parent_path || null,
                  template.sort_order,
                  template.is_required !== false
                ]
              );
              orgStats.templates++;
            }
          } catch (templateError) {
            const errorMessage = templateError instanceof Error ? templateError.message : 'Unknown error';
            console.error(`    ❌ Template ${template.name}:`, errorMessage);
            orgStats.errors++;
          }
        }

        console.log(`    📂 Created/updated ${caseTypeConfig.folder_templates.length} templates`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`  ❌ Error processing ${caseTypeConfig.name}:`, errorMessage);
        orgStats.errors++;
      }
    }

    console.log(`  📊 Org Summary: ${orgStats.caseTypes} case types, ${orgStats.templates} templates, ${orgStats.errors} errors`);
    
    // Update global stats
    this.stats.caseTypes += orgStats.caseTypes;
    this.stats.templates += orgStats.templates;
    this.stats.errors += orgStats.errors;
  }

  private async preview(organizations: Organization[], caseTypesConfig: CaseTypeConfig[]): Promise<void> {
    console.log('\n📋 PREVIEW MODE - No changes will be made\n');
    
    console.log('🏢 Organizations to process:');
    organizations.forEach(org => {
      console.log(`  • ${org.name} (${org.schema_name})`);
    });

    console.log('\n📦 Case types to seed:');
    caseTypesConfig.forEach(caseType => {
      console.log(`  • ${caseType.display_name} (${caseType.folder_templates.length} templates)`);
    });

    const totalTemplates = caseTypesConfig.reduce((sum, ct) => sum + ct.folder_templates.length, 0);
    
    console.log('\n📊 Summary:');
    console.log(`  Organizations: ${organizations.length}`);
    console.log(`  Case Types: ${caseTypesConfig.length}`);
    console.log(`  Total Templates: ${totalTemplates}`);
    console.log(`  Force Mode: ${this.args.force ? 'YES' : 'NO'}`);
  }

  public async run(): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.init();
      
      const caseTypesConfig = await this.loadConfiguration();
      const organizations = await this.getOrganizations();

      if (organizations.length === 0) {
        console.log('⚠️  No organizations found');
        return;
      }

      if (this.args.preview) {
        await this.preview(organizations, caseTypesConfig);
        return;
      }

      console.log(`\n🎯 Starting seeder for ${organizations.length} organization(s)`);
      console.log(`📦 Seeding ${caseTypesConfig.length} case types`);
      console.log(`🔄 Force mode: ${this.args.force ? 'ENABLED' : 'DISABLED'}`);

      this.stats.organizations = organizations.length;

      for (const org of organizations) {
        await this.seedCaseTypesForOrg(org, caseTypesConfig);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log('\n🎉 SEEDING COMPLETE!');
      console.log(`📊 Final Summary:`);
      console.log(`  Organizations: ${this.stats.organizations}`);
      console.log(`  Case Types Created: ${this.stats.caseTypes}`);
      console.log(`  Templates Created: ${this.stats.templates}`);
      console.log(`  Errors: ${this.stats.errors}`);
      console.log(`  Duration: ${duration}s`);

      if (this.stats.errors > 0) {
        process.exit(1);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : '';
      console.error('\n💥 Fatal error:', errorMessage);
      console.error(errorStack);
      process.exit(1);
    } finally {
      // Close database connection
      await this.client.end();
    }
  }
}

// Run the seeder
if (require.main === module) {
  const seeder = new CaseTypeSeeder();
  seeder.run().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export default CaseTypeSeeder;
