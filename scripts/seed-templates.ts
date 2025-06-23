import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SERVICE_ROLE_KEY!
);

// Folder is just a string alias
type Folder = string;
// Template has a name and an array of folder paths
interface Template {
  name: string;
  folders: Folder[];
}

const templates: Template[] = [
  {
    name: 'Litigation',
    folders: [
      'Litigation/{{Name}}/Administrative',
      'Litigation/{{Name}}/Correspondence',
      'Litigation/{{Name}}/Depo Prep',
      'Litigation/{{Name}}/Depositions',
      'Litigation/{{Name}}/Discovery',
      'Litigation/{{Name}}/Expenses',
      'Litigation/{{Name}}/Experts',
      'Litigation/{{Name}}/Insurance',
      'Litigation/{{Name}}/Investigation',
      'Litigation/{{Name}}/Litigation',
      'Litigation/{{Name}}/LOP and Liens',
      'Litigation/{{Name}}/Mediation',
      'Litigation/{{Name}}/Medical',
      'Litigation/{{Name}}/Photos',
      'Litigation/{{Name}}/Pleadings',
      'Litigation/{{Name}}/Settlement'
    ]
  },
  {
    name: 'IMVA',
    folders: [
      'IMVA/{{Name}}/Client Provided Docs',
      'IMVA/{{Name}}/Correspondence',
      'IMVA/{{Name}}/Demands',
      'IMVA/{{Name}}/Insurance',
      'IMVA/{{Name}}/Intake',
      'IMVA/{{Name}}/Medical',
      'IMVA/{{Name}}/Photos',
      'IMVA/{{Name}}/Settlement',
      'IMVA/{{Name}}/Work Product'
    ]
  },
  {
    name: 'Solar',
    folders: [
      'Solar/Solar - {{Name}}/Administrative',
      'Solar/Solar - {{Name}}/Arbitration',
      'Solar/Solar - {{Name}}/Banking Records',
      'Solar/Solar - {{Name}}/Bennett Legal Communications',
      'Solar/Solar - {{Name}}/E-Mails re Contracts',
      'Solar/Solar - {{Name}}/Financing Contracts',
      'Solar/Solar - {{Name}}/Installers or Subcontractors Docs',
      'Solar/Solar - {{Name}}/Insurance',
      'Solar/Solar - {{Name}}/Photos of Home and Panels',
      'Solar/Solar - {{Name}}/Post-Panel Electricity Bills',
      'Solar/Solar - {{Name}}/Pre-Panel Electricity Bills',
      'Solar/Solar - {{Name}}/Settlement',
      'Solar/Solar - {{Name}}/Solar Contracts',
      'Solar/Solar - {{Name}}/Text Messages re Contracts',
      'Solar/Solar - {{Name}}/UCC 1 Filings and Lien Notices'
    ]
  }
];

(async () => {
  for (const { name, folders } of templates) {
    const { error } = await supabase
      .from('project_templates')
      .update({ default_folders: folders })
      .eq('name', name);
    if (error) {
      console.error(`Failed to seed template ${name}:`, error.message);
    } else {
      console.log(`Seeded template ${name}`);
    }
  }
  console.log('✅  template folders seeded');
  process.exit(0);
})();
