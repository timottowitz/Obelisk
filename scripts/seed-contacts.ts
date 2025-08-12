import { config } from "dotenv";
import pkg from "pg";
import { contacts } from "./contacts.ts";
import type { Client } from "pg";
const { Client: PgClient } = pkg;

// Load environment variables
config();

interface Config {
  databaseUrl: string | undefined;
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

  constructor() {
    this.client = new PgClient({
      connectionString: CONFIG.databaseUrl,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
    });
  }

  public async seedContacts() {
    await this.client.connect();
    console.log("Connected to database");
    try {
      for (const contact of contacts as unknown as Contact[]) {
        const contactTypeIds: string[] = [];
        for (const personType of contact.personTypes) {
          const caseTypeResult = await this.client.query(
            `SELECT id FROM public.contact_types WHERE name = $1`,
            [personType.name]
          );
          contactTypeIds.push(caseTypeResult.rows[0].id);
        }
        console.log(`Seeding contact ${contact.firstName}`);
        await this.client.query(
          `INSERT INTO public.contacts (first_name, middle_name, last_name, abbreviation_name, full_name, prefix, suffix, fullname_extended, is_individual, is_deceased, death_date, birth_date, age_in_years, last_changed, is_archived, is_protected, score, addresses, emails, phones, contact_type_ids, tags_v2, hashtags, flattened_hash_tags, group_by_first, sort_by_first, group_by_last, sort_by_last, picture_url, company, department, job_title, org_id, org_name, team_ids, picture_key) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36)`,
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
    } finally {
      await this.client.end();
    }
  }
}

if (require.main === module) {
  const seeder = new ContactsSeeder();
  seeder.seedContacts().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}
