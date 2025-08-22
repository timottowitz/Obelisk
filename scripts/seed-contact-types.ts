#!/usr/bin/env tsx

/**
 * Contact Types Seeder Script
 *
 * This script seeds default contact types for organizations.
 * Designed for site administrators to initialize or update contact type configurations.
 *
 * Usage:
 *   npm run seed:contact-types                           # Seed all organizations
 *   npm run seed:contact-types -- --org=org_12345       # Seed specific organization
 *   npm run seed:contact-types -- --force               # Force seed even if data exists
 *   npm run seed:contact-types -- --preview             # Preview what would be seeded
 *   npm run seed:contact-types -- --help                # Show help
 */

import { config } from "dotenv";
import pkg from "pg";
import type { Client } from "pg";
const { Client: PgClient } = pkg;
import * as fs from "fs";
import * as path from "path";

// Load environment variables
config();

// Type definitions
interface ContactType {
  name: string;
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
  contactTypes: number;
  errors: number;
}

interface OrgStats {
  contactTypes: number;
  errors: number;
}

interface Config {
  databaseUrl: string | undefined;
}

// Configuration
const CONFIG: Config = {
  databaseUrl: process.env.DATABASE_URL,
};

// Default contact types configuration
export const DEFAULT_CONTACT_TYPES: ContactType[] = [
  { name: "Adjuster" },
  { name: "Attorney" },
  { name: "Business" },
  { name: "Client" },
  { name: "Court" },
  { name: "Defendant" },
  { name: "Emergency Department" },
  { name: "Expert" },
  { name: "Firm" },
  { name: "Insurance Company" },
  { name: "Involved Party" },
  { name: "Judge" },
  { name: "Mediator" },
  { name: "Medical Provider" },
  { name: "Person" },
  { name: "Plantiff" },
  { name: "PNC" },
  { name: "Staff" },
];

class ContactTypeSeeder {
  private client: Client;
  private args: SeederArgs;
  private stats: SeederStats;

  constructor() {
    this.client = new PgClient({
      connectionString: CONFIG.databaseUrl,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
    });
    this.args = this.parseArgs();
    this.stats = {
      organizations: 0,
      contactTypes: 0,
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

    if (process.env.npm_config_org) {
      args.org = process.env.npm_config_org;
    } else if (process.env.npm_config_force) {
      args.force = true;
    } else if (process.env.npm_config_preview) {
      args.preview = true;
    } else if (process.env.npm_config_helpme) {
      args.help = true;
    } else if (process.env.npm_config_config) {
      args.config = process.env.npm_config_config;
    }
    return args;
  }

  private showHelp(): void {
    console.log(`
Contact Types Seeder Script

USAGE:
  npm run seed:contact-types [OPTIONS]

OPTIONS:
  --org=<schema_name>     Seed specific organization by schema name
  --force                 Force seed even if contact types already exist
  --preview               Preview what would be seeded without making changes
  --config=<file>         Use custom contact types configuration file
  --help                  Show this help message

EXAMPLES:
  npm run seed:contact-types
  npm run seed:contact-types -- --org=org_2ycgcrzpztj
  npm run seed:contact-types -- --force
  npm run seed:contact-types -- --preview
  npm run seed:contact-types -- --config=./custom-contact-types.json

ENVIRONMENT VARIABLES:
  DATABASE_URL              Required: PostgreSQL connection string

CONFIGURATION FILE FORMAT:
  JSON file with same structure as DEFAULT_CONTACT_TYPES array
    `);
  }

  private async init(): Promise<void> {
    if (this.args.help) {
      this.showHelp();
      process.exit(0);
    }

    // Validate environment
    if (!CONFIG.databaseUrl) {
      console.error("❌ Missing required environment variable: DATABASE_URL");
      process.exit(1);
    }

    // Connect to database
    await this.client.connect();
    console.log("🚀 Contact Types Seeder initialized");
  }

  private async loadConfiguration(): Promise<ContactType[]> {
    if (this.args.config) {
      try {
        const configPath = path.resolve(this.args.config);
        const configData = fs.readFileSync(configPath, "utf8");
        const customConfig: ContactType[] = JSON.parse(configData);
        console.log(`📄 Using custom configuration: ${configPath}`);
        return customConfig;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`❌ Failed to load configuration file: ${errorMessage}`);
        process.exit(1);
      }
    }
    return DEFAULT_CONTACT_TYPES;
  }

  private async getOrganizations(): Promise<Organization[]> {
    try {
      if (this.args.org) {
        // Get specific organization
        const result = await this.client.query(
          "SELECT id, name, schema_name FROM private.organizations WHERE schema_name = $1",
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
          "SELECT id, name, schema_name FROM private.organizations ORDER BY created_at"
        );

        return result.rows as Organization[];
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("❌ Database connection error:", errorMessage);
      process.exit(1);
    }
  }

  private async seedContactTypesForOrg(
    organization: Organization,
    contactTypesConfig: ContactType[]
  ): Promise<void> {
    const schema = organization.schema_name.toLowerCase();
    console.log(
      `\n👥 Processing organization: ${organization.name} (${schema})`
    );

    const orgStats: OrgStats = { contactTypes: 0, errors: 0 };

    // Optional: Clear existing data if force mode
    if (this.args.force) {
      await this.client.query(`DELETE FROM ${schema}.contact_types`);
      console.log("  🗑️  Cleared existing contact types");
    }

    for (const contactType of contactTypesConfig) {
      try {
        // Check if contact type already exists
        const existingContactTypeResult = await this.client.query(
          `SELECT id FROM ${schema}.contact_types WHERE name = $1`,
          [contactType.name]
        );

        if (existingContactTypeResult.rows.length > 0) {
          if (!this.args.force) {
            console.log(
              `  ⏭️  ${contactType.name} already exists, skipping...`
            );
            continue;
          }
        } else {
          // Create new contact type
          await this.client.query(
            `INSERT INTO ${schema}.contact_types (name) 
             VALUES ($1)`,
            [contactType.name]
          );
          orgStats.contactTypes++;
          console.log(`  ✅ Created contact type: ${contactType.name}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(
          `  ❌ Error processing ${contactType.name}:`,
          errorMessage
        );
        orgStats.errors++;
      }
    }

    console.log(
      `  📊 Org Summary: ${orgStats.contactTypes} contact types created, ${orgStats.errors} errors`
    );

    // Update global stats
    this.stats.contactTypes += orgStats.contactTypes;
    this.stats.errors += orgStats.errors;
  }

  private async preview(
    organizations: Organization[],
    contactTypesConfig: ContactType[]
  ): Promise<void> {
    console.log("\n📋 PREVIEW MODE - No changes will be made\n");

    console.log("🏢 Organizations to process:");
    organizations.forEach((org) => {
      console.log(`  • ${org.name} (${org.schema_name})`);
    });

    console.log("\n👥 Contact types to seed:");
    contactTypesConfig.forEach((contactType) => {
      console.log(`  • ${contactType.name}`);
    });

    console.log("\n📊 Summary:");
    console.log(`  Organizations: ${organizations.length}`);
    console.log(`  Contact Types: ${contactTypesConfig.length}`);
    console.log(`  Force Mode: ${this.args.force ? "YES" : "NO"}`);
  }

  public async run(): Promise<void> {
    const startTime = Date.now();

    try {
      await this.init();

      const contactTypesConfig = await this.loadConfiguration();
      const organizations = await this.getOrganizations();

      if (organizations.length === 0) {
        console.log("⚠️  No organizations found");
        return;
      }

      if (this.args.preview) {
        await this.preview(organizations, contactTypesConfig);
        return;
      }

      console.log(
        `\n🎯 Starting seeder for ${organizations.length} organization(s)`
      );
      console.log(`👥 Seeding ${contactTypesConfig.length} contact types`);
      console.log(`🔄 Force mode: ${this.args.force ? "ENABLED" : "DISABLED"}`);

      this.stats.organizations = organizations.length;

      for (const org of organizations) {
        await this.seedContactTypesForOrg(org, contactTypesConfig);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log("\n🎉 SEEDING COMPLETE!");
      console.log(`📊 Final Summary:`);
      console.log(`  Organizations: ${this.stats.organizations}`);
      console.log(`  Contact Types Created: ${this.stats.contactTypes}`);
      console.log(`  Errors: ${this.stats.errors}`);
      console.log(`  Duration: ${duration}s`);

      if (this.stats.errors > 0) {
        process.exit(1);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : "";
      console.error("\n💥 Fatal error:", errorMessage);
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
  const seeder = new ContactTypeSeeder();
  seeder.run().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}

export default ContactTypeSeeder;
