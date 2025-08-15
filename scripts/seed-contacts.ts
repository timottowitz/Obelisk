#!/usr/bin/env tsx

/**
 * Contacts Seeder Script
 *
 * This script seeds contacts for organizations.
 * Designed for site administrators to initialize or update contacts.
 *
 * Usage:
 *   npm run seed:contacts                           # Seed all organizations
 *   npm run seed:contacts -- --org=org_12345       # Seed specific organization
 *   npm run seed:contacts -- --force               # Force seed even if data exists
 *   npm run seed:contacts -- --preview             # Preview what would be seeded
 *   npm run seed:contacts -- --helpme                # Show help
 */

import { config } from "dotenv";
import pkg from "pg";
import { contacts } from "./contacts.ts";
import type { Client } from "pg";
const { Client: PgClient } = pkg;
import * as fs from "fs";
import * as path from "path";

// Load environment variables
config();

interface Config {
  databaseUrl: string | undefined;
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
  contacts: number;
  errors: number;
}

const CONFIG: Config = {
  databaseUrl: process.env.DATABASE_URL,
};

interface Contact {
  id: number;
  firstName: string;
  middleName: string;
  lastName: string;
  abbreviatedName: string | null;
  fullname: string;
  prefix: string;
  suffix: string;
  fullnameExtended: string;
  isIndividual: boolean;
  isDeceased: boolean;
  deathDate: string | null;
  birthDate: string | null;
  ageInYears: number | null;
  lastChanged: string;
  isArchived: boolean;
  isProtected: boolean;
  score: number;
  addresses: {
    id: number;
    notes: string | null;
    phoneLabel: {
      name: string;
      icon: string;
    } | null;
    number: string;
    rawNumber: string;
    numberTokens: string;
  }[];
  emails: {
    id: number;
    notes: string | null;
    emailDomain: string;
  }[];
  phones: {
    id: number;
    notes: string | null;
    phoneLabel: {
      name: string;
      icon: string;
    } | null;
    number: string;
    rawNumber: string;
    numberTokens: string;
  }[];
  personTypes: {
    id: number;
    name: string;
  }[];
  tagsV2: string[];
  hashtags: string[];
  flattenedHashtags: string[];
  groupByFirst: string;
  sortByFirst: string;
  groupByLast: string;
  sortByLast: string;
  pictureUrl: string;
  company: string;
  department?: string;
  jobTitle?: string;
  orgID: number;
  orgName: string;
  teamIDs: string[];
  pictureKey: string;
}

class ContactsSeeder {
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
      contacts: 0,
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
    Contacts Seeder Script
    
    USAGE:
      npm run seed:contacts [OPTIONS]

    OPTIONS:
      --org=<schema_name>     Seed specific organization by schema name
      --force                 Force seed even if contacts already exist
      --preview               Preview what would be seeded without making changes
      --help                  Show this help message

    EXAMPLES:
      npm run seed:contacts
      npm run seed:contacts -- --org=org_12345
      npm run seed:contacts -- --force
      npm run seed:contacts -- --preview

    ENVIRONMENT VARIABLES:
      DATABASE_URL              Required: PostgreSQL connection string

    CONFIGURATION FILE FORMAT:
      JSON file with same structure as contacts array

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
    console.log("🚀 Contacts Seeder initialized");
  }

  private async loadConfiguration(): Promise<Contact[]> {
    if (this.args.config) {
      try {
        const configPath = path.resolve(this.args.config);
        const configData = fs.readFileSync(configPath, "utf8");
        const customConfig: Contact[] = JSON.parse(configData);
        console.log(`📄 Using custom configuration: ${configPath}`);
        return customConfig;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`❌ Failed to load configuration file: ${errorMessage}`);
        process.exit(1);
      }
    }
    return contacts as unknown as Contact[];
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

  private async preview(
    organizations: Organization[],
    contacts: Contact[]
  ): Promise<void> {
    console.log("\n📋 PREVIEW MODE - No changes will be made\n");

    console.log("🏢 Organizations to process:");
    organizations.forEach((org) => {
      console.log(`  • ${org.name} (${org.schema_name})`);
    });

    console.log("\n📦 Contacts to seed:");
  }

  private async seedContactsForOrg(
    organization: Organization,
    contacts: Contact[]
  ): Promise<void> {
    const schema = organization.schema_name.toLowerCase();
    console.log(
      `\n📁 Processing organization: ${organization.name} (${schema})`
    );

    try {
      for (const contact of contacts as unknown as Contact[]) {
        const contactTypeIds: string[] = [];

        // Get contact types
        for (const personType of contact.personTypes) {
          const caseTypeResult = await this.client.query(
            `SELECT id FROM public.contact_types WHERE name = $1`,
            [personType.name]
          );
          contactTypeIds.push(caseTypeResult.rows[0].id);
        }
        console.log(`Seeding contact ${contact.firstName}`);
        await this.client.query(
          `INSERT INTO ${schema}.contacts (first_name, middle_name, last_name, abbreviation_name, full_name, prefix, suffix, fullname_extended, is_individual, is_deceased, death_date, birth_date, age_in_years, last_changed, is_archived, is_protected, score, addresses, emails, phones, contact_type_ids, tags_v2, hashtags, flattened_hash_tags, group_by_first, sort_by_first, group_by_last, sort_by_last, picture_url, company, department, job_title, org_id, org_name, team_ids, picture_key) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36)`,
          [
            contact.firstName,
            contact.middleName,
            contact.lastName,
            contact.abbreviatedName,
            contact.fullname,
            contact.prefix,
            contact.suffix,
            contact.fullnameExtended,
            contact.isIndividual,
            contact.isDeceased,
            contact.deathDate,
            contact.birthDate,
            contact.ageInYears,
            contact.lastChanged,
            contact.isArchived,
            contact.isProtected,
            contact.score,
            JSON.stringify(contact.addresses),
            JSON.stringify(contact.emails),
            JSON.stringify(contact.phones),
            contactTypeIds,
            contact.tagsV2,
            contact.hashtags,
            contact.flattenedHashtags,
            contact.groupByFirst,
            contact.sortByFirst,
            contact.groupByLast,
            contact.sortByLast,
            contact.pictureUrl,
            contact.company,
            contact.department,
            contact.jobTitle,
            contact.orgID,
            contact.orgName,
            contact.teamIDs,
            contact.pictureKey,
          ]
        );
        console.log(`Contact ${contact.firstName} seeded`);
      }
    } catch (error) {
      console.error("Error seeding contacts:", error);
    }
  }

  public async run(): Promise<void> {
    const startTime = Date.now();

    try {
      await this.init();

      const contactsConfig = await this.loadConfiguration();
      const organizations = await this.getOrganizations();

      if (organizations.length === 0) {
        console.log("⚠️  No organizations found");
        return;
      }

      if (this.args.preview) {
        await this.preview(organizations, contactsConfig);
        return;
      }

      console.log(
        `\n🎯 Starting seeder for ${organizations.length} organization(s)`
      );
      console.log(`📦 Seeding ${contactsConfig.length} contacts`);
      console.log(`🔄 Force mode: ${this.args.force ? "ENABLED" : "DISABLED"}`);

      this.stats.organizations = organizations.length;

      for (const org of organizations) {
        await this.seedContactsForOrg(org, contactsConfig);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log("\n🎉 SEEDING COMPLETE!");
      console.log(`📊 Final Summary:`);
      console.log(`  Organizations: ${this.stats.organizations}`);
      console.log(`  Contacts: ${this.stats.contacts}`);
      console.log(`  Errors: ${this.stats.errors}`);
      console.log(`  Time: ${duration} seconds`);
    } catch (error) {
      console.error("❌ Seeding failed:", error);
      process.exit(1);
    } finally {
      // Close database connection
      await this.client.end();
    }
  }
}

if (require.main === module) {
  const seeder = new ContactsSeeder();
  seeder.run().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}
