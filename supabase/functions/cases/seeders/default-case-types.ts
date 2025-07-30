// Default case types and folder templates configuration
export interface FolderTemplate {
  name: string;
  path: string;
  parent_path?: string;
  sort_order: number;
  is_required?: boolean;
}

export interface CaseTypeConfig {
  name: string;
  display_name: string;
  description: string;
  color: string;
  icon: string;
  folder_templates: FolderTemplate[];
}

export const DEFAULT_CASE_TYPES: CaseTypeConfig[] = [
  {
    name: 'general_legal',
    display_name: 'General Legal',
    description: 'General legal matters and consultations',
    color: '#3B82F6',
    icon: 'scale',
    folder_templates: [
      {
        name: 'Client Documents',
        path: '/client-documents',
        sort_order: 1,
      },
      {
        name: 'Correspondence',
        path: '/correspondence',
        sort_order: 2,
      },
      {
        name: 'Legal Research',
        path: '/legal-research',
        sort_order: 3,
      },
      {
        name: 'Billing',
        path: '/billing',
        sort_order: 4,
      },
    ],
  },
  {
    name: 'contract_review',
    display_name: 'Contract Review',
    description: 'Contract analysis and review cases',
    color: '#10B981',
    icon: 'document-text',
    folder_templates: [
      {
        name: 'Original Contracts',
        path: '/original-contracts',
        sort_order: 1,
      },
      {
        name: 'Redlined Versions',
        path: '/redlined-versions',
        sort_order: 2,
      },
      {
        name: 'Final Versions',
        path: '/final-versions',
        sort_order: 3,
      },
      {
        name: 'Supporting Documents',
        path: '/supporting-documents',
        sort_order: 4,
      },
    ],
  },
  {
    name: 'litigation',
    display_name: 'Litigation',
    description: 'Court cases and legal disputes',
    color: '#EF4444',
    icon: 'court-hammer',
    folder_templates: [
      {
        name: 'Pleadings',
        path: '/pleadings',
        sort_order: 1,
      },
      {
        name: 'Discovery',
        path: '/discovery',
        sort_order: 2,
      },
      {
        name: 'Evidence',
        path: '/evidence',
        sort_order: 3,
      },
      {
        name: 'Court Filings',
        path: '/court-filings',
        sort_order: 4,
      },
      {
        name: 'Witness Documents',
        path: '/witness-documents',
        sort_order: 5,
      },
      {
        name: 'Expert Reports',
        path: '/expert-reports',
        sort_order: 6,
      },
    ],
  },
  {
    name: 'corporate_law',
    display_name: 'Corporate Law',
    description: 'Business formation and corporate matters',
    color: '#8B5CF6',
    icon: 'building-office',
    folder_templates: [
      {
        name: 'Formation Documents',
        path: '/formation-documents',
        sort_order: 1,
      },
      {
        name: 'Board Resolutions',
        path: '/board-resolutions',
        sort_order: 2,
      },
      {
        name: 'Shareholder Agreements',
        path: '/shareholder-agreements',
        sort_order: 3,
      },
      {
        name: 'Compliance Documents',
        path: '/compliance-documents',
        sort_order: 4,
      },
      {
        name: 'Financial Records',
        path: '/financial-records',
        sort_order: 5,
      },
    ],
  },
  {
    name: 'real_estate',
    display_name: 'Real Estate',
    description: 'Property transactions and real estate law',
    color: '#F59E0B',
    icon: 'home',
    folder_templates: [
      {
        name: 'Purchase Agreements',
        path: '/purchase-agreements',
        sort_order: 1,
      },
      {
        name: 'Title Documents',
        path: '/title-documents',
        sort_order: 2,
      },
      {
        name: 'Inspections',
        path: '/inspections',
        sort_order: 3,
      },
      {
        name: 'Financing Documents',
        path: '/financing-documents',
        sort_order: 4,
      },
      {
        name: 'Closing Documents',
        path: '/closing-documents',
        sort_order: 5,
      },
    ],
  },
  {
    name: 'family_law',
    display_name: 'Family Law',
    description: 'Divorce, custody, and family legal matters',
    color: '#EC4899',
    icon: 'users',
    folder_templates: [
      {
        name: 'Divorce Proceedings',
        path: '/divorce-proceedings',
        sort_order: 1,
      },
      {
        name: 'Child Custody',
        path: '/child-custody',
        sort_order: 2,
      },
      {
        name: 'Financial Disclosure',
        path: '/financial-disclosure',
        sort_order: 3,
      },
      {
        name: 'Support Documents',
        path: '/support-documents',
        sort_order: 4,
      },
      {
        name: 'Mediation Records',
        path: '/mediation-records',
        sort_order: 5,
      },
    ],
  },
  {
    name: 'employment_law',
    display_name: 'Employment Law',
    description: 'Workplace disputes and employment issues',
    color: '#06B6D4',
    icon: 'briefcase',
    folder_templates: [
      {
        name: 'Employment Contracts',
        path: '/employment-contracts',
        sort_order: 1,
      },
      {
        name: 'HR Policies',
        path: '/hr-policies',
        sort_order: 2,
      },
      {
        name: 'Complaint Documentation',
        path: '/complaint-documentation',
        sort_order: 3,
      },
      {
        name: 'Investigation Records',
        path: '/investigation-records',
        sort_order: 4,
      },
      {
        name: 'Settlement Documents',
        path: '/settlement-documents',
        sort_order: 5,
      },
    ],
  },
  {
    name: 'intellectual_property',
    display_name: 'Intellectual Property',
    description: 'Patents, trademarks, and IP protection',
    color: '#7C3AED',
    icon: 'lightbulb',
    folder_templates: [
      {
        name: 'Patent Applications',
        path: '/patent-applications',
        sort_order: 1,
      },
      {
        name: 'Trademark Filings',
        path: '/trademark-filings',
        sort_order: 2,
      },
      {
        name: 'Copyright Documents',
        path: '/copyright-documents',
        sort_order: 3,
      },
      {
        name: 'Licensing Agreements',
        path: '/licensing-agreements',
        sort_order: 4,
      },
      {
        name: 'IP Research',
        path: '/ip-research',
        sort_order: 5,
      },
    ],
  },
  {
    name: 'criminal_defense',
    display_name: 'Criminal Defense',
    description: 'Criminal law and defense cases',
    color: '#DC2626',
    icon: 'shield-check',
    folder_templates: [
      {
        name: 'Case Files',
        path: '/case-files',
        sort_order: 1,
      },
      {
        name: 'Evidence',
        path: '/evidence',
        sort_order: 2,
      },
      {
        name: 'Witness Statements',
        path: '/witness-statements',
        sort_order: 3,
      },
      {
        name: 'Court Documents',
        path: '/court-documents',
        sort_order: 4,
      },
      {
        name: 'Investigation',
        path: '/investigation',
        sort_order: 5,
      },
    ],
  },
  {
    name: 'bankruptcy',
    display_name: 'Bankruptcy',
    description: 'Bankruptcy and debt restructuring cases',
    color: '#059669',
    icon: 'calculator',
    folder_templates: [
      {
        name: 'Petition Documents',
        path: '/petition-documents',
        sort_order: 1,
      },
      {
        name: 'Financial Statements',
        path: '/financial-statements',
        sort_order: 2,
      },
      {
        name: 'Asset Documentation',
        path: '/asset-documentation',
        sort_order: 3,
      },
      {
        name: 'Creditor Communications',
        path: '/creditor-communications',
        sort_order: 4,
      },
      {
        name: 'Court Orders',
        path: '/court-orders',
        sort_order: 5,
      },
    ],
  },
];

// Function to seed case types for a specific schema
export async function seedCaseTypes(supabase: any, schema: string): Promise<void> {
  console.log(`Seeding case types for schema: ${schema}`);
  
  for (const caseTypeConfig of DEFAULT_CASE_TYPES) {
    try {
      // Check if case type already exists
      const { data: existingCaseType } = await supabase
        .schema(schema)
        .from('case_types')
        .select('id')
        .eq('name', caseTypeConfig.name)
        .single();

      let caseTypeId: string;

      if (existingCaseType) {
        console.log(`Case type ${caseTypeConfig.name} already exists, skipping...`);
        caseTypeId = existingCaseType.id;
      } else {
        // Create case type
        const { data: newCaseType, error: caseTypeError } = await supabase
          .schema(schema)
          .from('case_types')
          .insert({
            name: caseTypeConfig.name,
            display_name: caseTypeConfig.display_name,
            description: caseTypeConfig.description,
            color: caseTypeConfig.color,
            icon: caseTypeConfig.icon,
          })
          .select('id')
          .single();

        if (caseTypeError) {
          console.error(`Failed to create case type ${caseTypeConfig.name}:`, caseTypeError);
          continue;
        }

        caseTypeId = newCaseType.id;
        console.log(`Created case type: ${caseTypeConfig.display_name}`);
      }

      // Create folder templates
      for (const template of caseTypeConfig.folder_templates) {
        try {
          // Check if template already exists
          const { data: existingTemplate } = await supabase
            .schema(schema)
            .from('folder_templates')
            .select('id')
            .eq('case_type_id', caseTypeId)
            .eq('path', template.path)
            .single();

          if (existingTemplate) {
            console.log(`Template ${template.name} already exists for ${caseTypeConfig.name}, skipping...`);
            continue;
          }

          // Create template
          const { error: templateError } = await supabase
            .schema(schema)
            .from('folder_templates')
            .insert({
              case_type_id: caseTypeId,
              name: template.name,
              path: template.path,
              parent_path: template.parent_path || null,
              sort_order: template.sort_order,
              is_required: template.is_required !== false,
            });

          if (templateError) {
            console.error(`Failed to create template ${template.name}:`, templateError);
          } else {
            console.log(`  Created template: ${template.name}`);
          }
        } catch (error) {
          console.error(`Error creating template ${template.name}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error processing case type ${caseTypeConfig.name}:`, error);
    }
  }

  console.log(`Finished seeding case types for schema: ${schema}`);
}