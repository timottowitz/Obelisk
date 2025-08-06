#!/usr/bin/env tsx

/**
 * Task Categories Seeder Script
 *
 * This script seeds default task categories for organizations.
 * Task categories are used to organize and classify case tasks.
 *
 * Usage:
 *   npm run seed:task-categories                      # Seed all organizations
 *   npm run seed:task-categories -- --org=org_12345  # Seed specific organization
 *   npm run seed:task-categories -- --force          # Force seed even if data exists
 *   npm run seed:task-categories -- --preview        # Preview what would be seeded
 *   npm run seed:task-categories -- --help           # Show help
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
interface TaskCategory {
  name: string;
  description: string;
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
  categories: number;
  errors: number;
}

interface Config {
  databaseUrl: string | undefined;
}

// Configuration
const CONFIG: Config = {
  databaseUrl: process.env.DATABASE_URL,
};

// Default task categories configuration
export const DEFAULT_TASK_CATEGORIES: TaskCategory[] = [
    {
      name: "Discovery",
      description: "Discovery tasks",
    },
    {
      name: "Preparation",
      description: "Preparation tasks",
    },
    {
      name: "Filing",
      description: "Filing tasks",
    },
    {
      name: "Client Relations",
      description: "Client relations tasks",
    },
  ];

class TaskCategorySeeder {
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
      categories: 0,
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

    process.argv.slice(2).forEach((arg) => {
      if (arg.startsWith("--org=")) {
        args.org = arg.split("=")[1];
      } else if (arg === "--force") {
        args.force = true;
      } else if (arg === "--preview") {
        args.preview = true;
      } else if (arg === "--help") {
        args.help = true;
      } else if (arg.startsWith("--config=")) {
        args.config = arg.split("=")[1];
      }
    });

    return args;
  }

  private showHelp(): void {
    console.log(`
Task Categories Seeder Script

USAGE:
  npm run seed:task-categories [OPTIONS]

OPTIONS:
  --org=<schema_name>     Seed specific organization by schema name
  --force                 Force seed even if categories already exist
  --preview               Preview what would be seeded without making changes
  --config=<file>         Use custom task categories configuration file
  --help                  Show this help message

EXAMPLES:
  npm run seed:task-categories
  npm run seed:task-categories -- --org=org_2ycgcrzpztj
  npm run seed:task-categories -- --force
  npm run seed:task-categories -- --preview
  npm run seed:task-categories -- --config=./custom-categories.json

ENVIRONMENT VARIABLES:
  DATABASE_URL              Required: PostgreSQL connection string

CONFIGURATION FILE FORMAT:
  JSON file with array of objects containing:
    - name: Category name (required)
    - description: Category description (required)
    `);
  }

  private async init(): Promise<void> {
    if (this.args.help) {
      this.showHelp();
      process.exit(0);
    }

    // Validate environment
    if (!CONFIG.databaseUrl) {
      console.error("L Missing required environment variable: DATABASE_URL");
      process.exit(1);
    }

    // Connect to database
    await this.client.connect();
    console.log("=� Task Categories Seeder initialized");
  }

  private async loadConfiguration(): Promise<TaskCategory[]> {
    if (this.args.config) {
      try {
        const configPath = path.resolve(this.args.config);
        const configData = fs.readFileSync(configPath, "utf8");
        const customConfig: TaskCategory[] = JSON.parse(configData);
        console.log(`=� Using custom configuration: ${configPath}`);
        return customConfig;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`L Failed to load configuration file: ${errorMessage}`);
        process.exit(1);
      }
    }
    return DEFAULT_TASK_CATEGORIES;
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
          console.error(`L Organization not found: ${this.args.org}`);
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
      console.error("L Database connection error:", errorMessage);
      process.exit(1);
    }
  }

  private async seedCategoriesForOrg(
    organization: Organization,
    categoriesConfig: TaskCategory[]
  ): Promise<void> {
    const schema = organization.schema_name.toLowerCase();
    console.log(
      `\n=� Processing organization: ${organization.name} (${schema})`
    );

    let orgCategories = 0;
    let orgErrors = 0;

    // Check if table exists
    const tableExists = await this.client.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = $1 
        AND table_name = 'task_categories'
      )`,
      [schema]
    );

    if (!tableExists.rows[0].exists) {
      console.log(`  �  Table ${schema}.task_categories does not exist, skipping...`);
      return;
    }

    for (const category of categoriesConfig) {
      try {
        // Check if category already exists
        const existingResult = await this.client.query(
          `SELECT id FROM ${schema}.task_categories WHERE name = $1`,
          [category.name]
        );

        if (existingResult.rows.length > 0) {
          if (!this.args.force) {
            console.log(`  �  Category "${category.name}" already exists, skipping...`);
            continue;
          }
          
          // Update existing category
          await this.client.query(
            `UPDATE ${schema}.task_categories 
             SET description = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE name = $2`,
            [category.description, category.name]
          );
          console.log(`  = Updated category: ${category.name}`);
        } else {
          // Create new category
          await this.client.query(
            `INSERT INTO ${schema}.task_categories (name, description) 
             VALUES ($1, $2)`,
            [category.name, category.description]
          );
          orgCategories++;
          console.log(`   Created category: ${category.name}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`  L Error processing category "${category.name}":`, errorMessage);
        orgErrors++;
      }
    }

    console.log(
      `  =� Org Summary: ${orgCategories} categories created, ${orgErrors} errors`
    );

    // Update global stats
    this.stats.categories += orgCategories;
    this.stats.errors += orgErrors;
  }

  private async preview(
    organizations: Organization[],
    categoriesConfig: TaskCategory[]
  ): Promise<void> {
    console.log("\n=� PREVIEW MODE - No changes will be made\n");

    console.log("<� Organizations to process:");
    organizations.forEach((org) => {
      console.log(`  " ${org.name} (${org.schema_name})`);
    });

    console.log("\n=� Task categories to seed:");
    categoriesConfig.forEach((category) => {
      console.log(`  " ${category.name}`);
      console.log(`    ${category.description}`);
    });

    console.log("\n=� Summary:");
    console.log(`  Organizations: ${organizations.length}`);
    console.log(`  Categories: ${categoriesConfig.length}`);
    console.log(`  Force Mode: ${this.args.force ? "YES" : "NO"}`);
  }

  public async run(): Promise<void> {
    const startTime = Date.now();

    try {
      await this.init();

      const categoriesConfig = await this.loadConfiguration();
      const organizations = await this.getOrganizations();

      if (organizations.length === 0) {
        console.log("�  No organizations found");
        return;
      }

      if (this.args.preview) {
        await this.preview(organizations, categoriesConfig);
        return;
      }

      console.log(
        `\n<� Starting seeder for ${organizations.length} organization(s)`
      );
      console.log(`=� Seeding ${categoriesConfig.length} task categories`);
      console.log(`= Force mode: ${this.args.force ? "ENABLED" : "DISABLED"}`);

      this.stats.organizations = organizations.length;

      for (const org of organizations) {
        await this.seedCategoriesForOrg(org, categoriesConfig);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log("\n<� SEEDING COMPLETE!");
      console.log(`=� Final Summary:`);
      console.log(`  Organizations: ${this.stats.organizations}`);
      console.log(`  Categories Created: ${this.stats.categories}`);
      console.log(`  Errors: ${this.stats.errors}`);
      console.log(`  Duration: ${duration}s`);

      if (this.stats.errors > 0) {
        process.exit(1);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : "";
      console.error("\n=� Fatal error:", errorMessage);
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
  const seeder = new TaskCategorySeeder();
  seeder.run().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}

export default TaskCategorySeeder;