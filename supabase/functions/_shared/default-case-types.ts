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
      name: "solar",
      display_name: "Solar",
      description: "Solar matters and consultations",
      color: "#3B82F6",
      icon: "sun",
      folder_templates: [
        {
          name: "Expenses",
          path: "/expenses",
          sort_order: 1,
        },
        {
          name: "Insurance",
          path: "/insurance",
          sort_order: 2,
        },
        {
          name: "Roof Expert Report",
          path: "/roof-expert-report",
          sort_order: 3,
        },
        {
          name: "Solar Expert Report",
          path: "/solar-expert-report",
          sort_order: 4,
        },
        {
          name: "UCC1 Filings and Lien Notices",
          path: "/ucc1-filings-and-lien-notices",
          sort_order: 5,
        },
        {
          name: "Solar Contracts",
          path: "/solar-contracts",
          sort_order: 6,
        },
        {
          name: "Settlement",
          path: "/settlement",
          sort_order: 7,
        },
        {
          name: "Pre-Panel Electricity Bills",
          path: "/pre-panel-electricity-bills",
          sort_order: 8,
        },
        {
          name: "Post-Panel Electricity Bills",
          path: "/post-panel-electricity-bills",
          sort_order: 9,
        },
        {
          name: "Photos of Home and Panels",
          path: "/photos-of-home-and-panels",
          sort_order: 10,
        },
        {
          name: "Installers or Subcontractors Docs",
          path: "/installers-or-subcontractors-docs",
          sort_order: 11,
        },
        {
          name: "Financing Contracts",
          path: "/financing-contracts",
          sort_order: 12,
        },
        {
          name: "Emails re Contracts",
          path: "/emails-re-contracts",
          sort_order: 13,
        },
        {
          name: "Bennett Legal Communications",
          path: "/bennett-legal-communications",
          sort_order: 14,
        },
        {
          name: "Banking Records",
          path: "/banking-records",
          sort_order: 15,
        },
        {
          name: "Arbitration",
          path: "/arbitration",
          sort_order: 16,
        },
        {
          name: "Administrative",
          path: "/administrative",
          sort_order: 17,
        },
      ],
    },
    {
      name: "litigation",
      display_name: "Litigation",
      description: "Court cases and legal disputes",
      color: "#EF4444",
      icon: "court-hammer",
      folder_templates: [
        {
          name: "Pleadings",
          path: "/pleadings",
          sort_order: 1,
        },
        {
          name: "Discovery",
          path: "/discovery",
          sort_order: 2,
        },
        {
          name: "Evidence",
          path: "/evidence",
          sort_order: 3,
        },
        {
          name: "Court Filings",
          path: "/court-filings",
          sort_order: 4,
        },
        {
          name: "Witness Documents",
          path: "/witness-documents",
          sort_order: 5,
        },
        {
          name: "Expert Reports",
          path: "/expert-reports",
          sort_order: 6,
        },
      ],
    },
    {
      name: "IMVA",
      display_name: "IMVA",
      description: "IMVA matters and consultations",
      color: "#10B981",
      icon: "building",
      folder_templates: [
        {
          name: "Medicals",
          path: "/medicals",
          sort_order: 1,
        },
        {
          name: "Mediation",
          path: "/mediation",
          sort_order: 2,
        },
        {
          name: "Pleadings",
          path: "/pleadings",
          sort_order: 3,
        },
        {
          name: "Lop and Liens",
          path: "/lop-and-liens",
          sort_order: 4,
        },
        {
          name: "Investigation",
          path: "/investigation",
          sort_order: 5,
        },
        {
          name: "Experts",
          path: "/experts",
          sort_order: 6,
        },
        {
          name: "Expenses",
          path: "/expenses",
          sort_order: 7,
        },
        {
          name: "Discovery",
          path: "/discovery",
          sort_order: 8,
        },
        {
          name: "Depositions",
          path: "/depositions",
          sort_order: 9,
        },
        {
          name: "Depo Prep",
          path: "/depo-prep",
          sort_order: 10,
        },
        {
          name: "Correspondence",
          path: "/correspondence",
          sort_order: 11,
        },
        {
          name: "Administrative",
          path: "/administrative",
          sort_order: 12,
        },
      ],
    },
  ];
  
  // Function to seed case types for a specific schema
  export async function seedCaseTypes(
    supabase: any,
    schema: string
  ): Promise<void> {
    console.log(`Seeding case types for schema: ${schema}`);
  
    for (const caseTypeConfig of DEFAULT_CASE_TYPES) {
      try {
        // Check if case type already exists
        const { data: existingCaseType } = await supabase
          .schema(schema)
          .from("case_types")
          .select("id")
          .eq("name", caseTypeConfig.name)
          .single();
  
        let caseTypeId: string;
  
        if (existingCaseType) {
          console.log(
            `Case type ${caseTypeConfig.name} already exists, skipping...`
          );
          caseTypeId = existingCaseType.id;
        } else {
          // Create case type
          const { data: newCaseType, error: caseTypeError } = await supabase
            .schema(schema)
            .from("case_types")
            .insert({
              name: caseTypeConfig.name,
              display_name: caseTypeConfig.display_name,
              description: caseTypeConfig.description,
              color: caseTypeConfig.color,
              icon: caseTypeConfig.icon,
            })
            .select("id")
            .single();
  
          if (caseTypeError) {
            console.error(
              `Failed to create case type ${caseTypeConfig.name}:`,
              caseTypeError
            );
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
              .from("folder_templates")
              .select("id")
              .eq("case_type_id", caseTypeId)
              .eq("path", template.path)
              .single();
  
            if (existingTemplate) {
              console.log(
                `Template ${template.name} already exists for ${caseTypeConfig.name}, skipping...`
              );
              continue;
            }
  
            // Create template
            const { error: templateError } = await supabase
              .schema(schema)
              .from("folder_templates")
              .insert({
                case_type_id: caseTypeId,
                name: template.name,
                path: template.path,
                parent_path: template.parent_path || null,
                sort_order: template.sort_order,
                is_required: template.is_required !== false,
              });
  
            if (templateError) {
              console.error(
                `Failed to create template ${template.name}:`,
                templateError
              );
            } else {
              console.log(`  Created template: ${template.name}`);
            }
          } catch (error) {
            console.error(`Error creating template ${template.name}:`, error);
          }
        }
      } catch (error) {
        console.error(
          `Error processing case type ${caseTypeConfig.name}:`,
          error
        );
      }
    }
  
    console.log(`Finished seeding case types for schema: ${schema}`);
  }
  