export interface TaskCategory {
  name: string;
  description: string;
}

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

export async function seedTaskCategories(supabase: any, schema: string) {
  for (const category of DEFAULT_TASK_CATEGORIES) {
    try {
      // Check if task category already exists
      const { data: existingTaskCategory } = await supabase
        .schema(schema)
        .from("task_categories")
        .select("id")
        .eq("name", category.name)
        .single();

      if (existingTaskCategory) {
        console.log(
          `Task category ${category.name} already exists, skipping...`
        );
      } else {
        const { data: newTaskCategory, error } = await supabase
          .from(schema)
          .insert({
            name: category.name,
            description: category.description,
          });
        if (error) {
          console.error("Error seeding task categories", error);
        }
        console.log(`Created task category: ${newTaskCategory.name}`);
      }
    } catch (error) {
      console.error("Error seeding task categories", error);
    }

    console.log(`Finished seeding task categories for schema: ${schema}`);
  }
}
