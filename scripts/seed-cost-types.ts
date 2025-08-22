#!/usr/bin/env tsx

/**
 * Cost Types Seeder Script
 *
 * This script seeds default cost types for organizations.
 * These are the predefined cost categories used in expense forms.
 * Designed for site administrators to initialize or update cost type configurations.
 *
 * Usage:
 *   npm run seed:cost-types                           # Seed all organizations
 *   npm run seed:cost-types -- --org=org_12345       # Seed specific organization
 *   npm run seed:cost-types -- --force               # Force seed even if data exists
 *   npm run seed:cost-types -- --preview             # Preview what would be seeded
 *   npm run seed:cost-types -- --help                # Show help
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
interface CostType {
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
  costTypes: number;
  errors: number;
}

interface OrgStats {
  costTypes: number;
  errors: number;
}

interface Config {
  databaseUrl: string | undefined;
}

// Configuration
const CONFIG: Config = {
  databaseUrl: process.env.DATABASE_URL,
};

// Default cost types configuration (matching the invoice modal defaults)
export const DEFAULT_COST_TYPES: CostType[] = [
  { name: "Arbitrator's Fees" },
  { name: "Attorney's Fees" },
  { name: "Certified Crash Report" },
  { name: "Court Filing Fee" },
  { name: "Demand Letter Drafting" },
  { name: "Deposition Transcript" },
  { name: "Expert Fee" },
  { name: "Flight" },
  { name: "Focus Group/Mock Trial" },
  { name: "Gas" },
  { name: "Hotel" },
  { name: "Investigation" },
  { name: "Mailing Service" },
  { name: "Meal" },
  { name: "Mediator Fees" },
  { name: "Medical Record" },
  { name: "Medical Report" },
  { name: "Notary" },
  { name: "Open Records" },
  { name: "Phone Conferencing" },
  { name: "Postage" },
  { name: "Service of Process" },
  { name: "Taxi/Uber" }
];

class CostTypeSeeder {
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
      costTypes: 0,
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
Cost Types Seeder Script

USAGE:
  npm run seed:cost-types [OPTIONS]

OPTIONS:
  --org=<schema_name>     Seed specific organization by schema name
  --force                 Force seed even if cost types already exist
  --preview               Preview what would be seeded without making changes
  --config=<file>         Use custom cost types configuration file
  --help                  Show this help message

EXAMPLES:
  npm run seed:cost-types
  npm run seed:cost-types -- --org=org_2ycgcrzpztj
  npm run seed:cost-types -- --force
  npm run seed:cost-types -- --preview
  npm run seed:cost-types -- --config=./custom-cost-types.json

ENVIRONMENT VARIABLES:
  DATABASE_URL              Required: PostgreSQL connection string

CONFIGURATION FILE FORMAT:
  JSON file with same structure as DEFAULT_COST_TYPES array
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
    console.log("🚀 Cost Types Seeder initialized");
  }

  private async loadConfiguration(): Promise<CostType[]> {
    if (this.args.config) {
      try {
        const configPath = path.resolve(this.args.config);
        const configData = fs.readFileSync(configPath, "utf8");
        const customConfig: CostType[] = JSON.parse(configData);
        console.log(`📄 Using custom configuration: ${configPath}`);
        return customConfig;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`❌ Failed to load configuration file: ${errorMessage}`);
        process.exit(1);
      }
    }
    return DEFAULT_COST_TYPES;
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

  private async seedCostTypesForOrg(
    organization: Organization,
    costTypesConfig: CostType[]
  ): Promise<void> {
    const schema = organization.schema_name.toLowerCase();
    console.log(
      `\n💸 Processing organization: ${organization.name} (${schema})`
    );

    const orgStats: OrgStats = { costTypes: 0, errors: 0 };

    // Optional: Clear existing data if force mode
    if (this.args.force) {
      await this.client.query(`DELETE FROM ${schema}.cost_types`);
      console.log("  🗑️  Cleared existing cost types");
    }

    for (const costType of costTypesConfig) {
      try {
        // Check if cost type already exists
        const existingCostTypeResult = await this.client.query(
          `SELECT id FROM ${schema}.cost_types WHERE name = $1`,
          [costType.name]
        );

        if (existingCostTypeResult.rows.length > 0) {
          if (!this.args.force) {
            console.log(
              `  ⏭️  ${costType.name} already exists, skipping...`
            );
            continue;
          }
        } else {
          // Create new cost type
          await this.client.query(
            `INSERT INTO ${schema}.cost_types (name) 
             VALUES ($1)`,
            [costType.name]
          );
          orgStats.costTypes++;
          console.log(`  ✅ Created cost type: ${costType.name}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(
          `  ❌ Error processing ${costType.name}:`,
          errorMessage
        );
        orgStats.errors++;
      }
    }

    console.log(
      `  📊 Org Summary: ${orgStats.costTypes} cost types created, ${orgStats.errors} errors`
    );

    // Update global stats
    this.stats.costTypes += orgStats.costTypes;
    this.stats.errors += orgStats.errors;
  }

  private async preview(
    organizations: Organization[],
    costTypesConfig: CostType[]
  ): Promise<void> {
    console.log("\n📋 PREVIEW MODE - No changes will be made\n");

    console.log("🏢 Organizations to process:");
    organizations.forEach((org) => {
      console.log(`  • ${org.name} (${org.schema_name})`);
    });

    console.log("\n💸 Cost types to seed:");
    costTypesConfig.forEach((costType) => {
      console.log(`  • ${costType.name}`);
    });

    console.log("\n📊 Summary:");
    console.log(`  Organizations: ${organizations.length}`);
    console.log(`  Cost Types: ${costTypesConfig.length}`);
    console.log(`  Force Mode: ${this.args.force ? "YES" : "NO"}`);
  }

  public async run(): Promise<void> {
    const startTime = Date.now();

    try {
      await this.init();

      const costTypesConfig = await this.loadConfiguration();
      const organizations = await this.getOrganizations();

      if (organizations.length === 0) {
        console.log("⚠️  No organizations found");
        return;
      }

      if (this.args.preview) {
        await this.preview(organizations, costTypesConfig);
        return;
      }

      console.log(
        `\n🎯 Starting seeder for ${organizations.length} organization(s)`
      );
      console.log(`💸 Seeding ${costTypesConfig.length} cost types`);
      console.log(`🔄 Force mode: ${this.args.force ? "ENABLED" : "DISABLED"}`);

      this.stats.organizations = organizations.length;

      for (const org of organizations) {
        await this.seedCostTypesForOrg(org, costTypesConfig);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log("\n🎉 SEEDING COMPLETE!");
      console.log(`📊 Final Summary:`);
      console.log(`  Organizations: ${this.stats.organizations}`);
      console.log(`  Cost Types Created: ${this.stats.costTypes}`);
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
  const seeder = new CostTypeSeeder();
  seeder.run().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}

export default CostTypeSeeder;
