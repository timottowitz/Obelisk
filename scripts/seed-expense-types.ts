#!/usr/bin/env tsx

/**
 * Expense Types Seeder Script
 *
 * This script seeds default expense types (cost types) for organizations.
 * Designed for site administrators to initialize or update expense type configurations.
 *
 * Usage:
 *   npm run seed:expense-types                           # Seed all organizations
 *   npm run seed:expense-types -- --org=org_12345       # Seed specific organization
 *   npm run seed:expense-types -- --force               # Force seed even if data exists
 *   npm run seed:expense-types -- --preview             # Preview what would be seeded
 *   npm run seed:expense-types -- --help                # Show help
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
interface ExpenseType {
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
  expenseTypes: number;
  errors: number;
}

interface OrgStats {
  expenseTypes: number;
  errors: number;
}

interface Config {
  databaseUrl: string | undefined;
}

// Configuration
const CONFIG: Config = {
  databaseUrl: process.env.DATABASE_URL,
};

// Default expense types configuration
export const DEFAULT_EXPENSE_TYPES: ExpenseType[] = [
  { name: "Bill" },
  { name: "Check" },
  { name: "Credit Card" },
  { name: "Soft Costs" },
];

class ExpenseTypeSeeder {
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
      expenseTypes: 0,
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
Expense Types Seeder Script

USAGE:
  npm run seed:expense-types [OPTIONS]

OPTIONS:
  --org=<schema_name>     Seed specific organization by schema name
  --force                 Force seed even if expense types already exist
  --preview               Preview what would be seeded without making changes
  --config=<file>         Use custom expense types configuration file
  --help                  Show this help message

EXAMPLES:
  npm run seed:expense-types
  npm run seed:expense-types -- --org=org_2ycgcrzpztj
  npm run seed:expense-types -- --force
  npm run seed:expense-types -- --preview
  npm run seed:expense-types -- --config=./custom-expense-types.json

ENVIRONMENT VARIABLES:
  DATABASE_URL              Required: PostgreSQL connection string

CONFIGURATION FILE FORMAT:
  JSON file with same structure as DEFAULT_EXPENSE_TYPES array
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
    console.log("🚀 Expense Types Seeder initialized");
  }

  private async loadConfiguration(): Promise<ExpenseType[]> {
    if (this.args.config) {
      try {
        const configPath = path.resolve(this.args.config);
        const configData = fs.readFileSync(configPath, "utf8");
        const customConfig: ExpenseType[] = JSON.parse(configData);
        console.log(`📄 Using custom configuration: ${configPath}`);
        return customConfig;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`❌ Failed to load configuration file: ${errorMessage}`);
        process.exit(1);
      }
    }
    return DEFAULT_EXPENSE_TYPES;
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

  private async seedExpenseTypesForOrg(
    organization: Organization,
    expenseTypesConfig: ExpenseType[]
  ): Promise<void> {
    const schema = organization.schema_name.toLowerCase();
    console.log(
      `\n💰 Processing organization: ${organization.name} (${schema})`
    );

    const orgStats: OrgStats = { expenseTypes: 0, errors: 0 };

    // Optional: Clear existing data if force mode
    if (this.args.force) {
      await this.client.query(`DELETE FROM ${schema}.expense_types`);
      console.log("  🗑️  Cleared existing expense types");
    }

    for (const expenseTypeConfig of expenseTypesConfig) {
      try {
        // Check if expense type already exists
        const existingExpenseTypeResult = await this.client.query(
          `SELECT id FROM ${schema}.expense_types WHERE name = $1`,
          [expenseTypeConfig.name]
        );

        if (existingExpenseTypeResult.rows.length > 0) {
          if (!this.args.force) {
            console.log(
              `  ⏭️  ${expenseTypeConfig.name} already exists, skipping...`
            );
            continue;
          }
        } else {
          // Create new expense type
          await this.client.query(
            `INSERT INTO ${schema}.expense_types (name) 
             VALUES ($1)`,
            [expenseTypeConfig.name]
          );
          orgStats.expenseTypes++;
          console.log(`  ✅ Created expense type: ${expenseTypeConfig.name}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(
          `  ❌ Error processing ${expenseTypeConfig.name}:`,
          errorMessage
        );
        orgStats.errors++;
      }
    }

    console.log(
      `  📊 Org Summary: ${orgStats.expenseTypes} expense types created, ${orgStats.errors} errors`
    );

    // Update global stats
    this.stats.expenseTypes += orgStats.expenseTypes;
    this.stats.errors += orgStats.errors;
  }

  private async preview(
    organizations: Organization[],
    expenseTypesConfig: ExpenseType[]
  ): Promise<void> {
    console.log("\n📋 PREVIEW MODE - No changes will be made\n");

    console.log("🏢 Organizations to process:");
    organizations.forEach((org) => {
      console.log(`  • ${org.name} (${org.schema_name})`);
    });

    console.log("\n💰 Expense types to seed:");
    expenseTypesConfig.forEach((expenseType) => {
      console.log(`  • ${expenseType.name}`);
    });

    console.log("\n📊 Summary:");
    console.log(`  Organizations: ${organizations.length}`);
    console.log(`  Expense Types: ${expenseTypesConfig.length}`);
    console.log(`  Force Mode: ${this.args.force ? "YES" : "NO"}`);
  }

  public async run(): Promise<void> {
    const startTime = Date.now();

    try {
      await this.init();

      const expenseTypesConfig = await this.loadConfiguration();
      const organizations = await this.getOrganizations();

      if (organizations.length === 0) {
        console.log("⚠️  No organizations found");
        return;
      }

      if (this.args.preview) {
        await this.preview(organizations, expenseTypesConfig);
        return;
      }

      console.log(
        `\n🎯 Starting seeder for ${organizations.length} organization(s)`
      );
      console.log(`💰 Seeding ${expenseTypesConfig.length} expense types`);
      console.log(`🔄 Force mode: ${this.args.force ? "ENABLED" : "DISABLED"}`);

      this.stats.organizations = organizations.length;

      for (const org of organizations) {
        await this.seedExpenseTypesForOrg(org, expenseTypesConfig);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log("\n🎉 SEEDING COMPLETE!");
      console.log(`📊 Final Summary:`);
      console.log(`  Organizations: ${this.stats.organizations}`);
      console.log(`  Expense Types Created: ${this.stats.expenseTypes}`);
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
  const seeder = new ExpenseTypeSeeder();
  seeder.run().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}

export default ExpenseTypeSeeder;
