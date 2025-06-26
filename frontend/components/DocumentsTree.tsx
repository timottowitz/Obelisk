// DocumentsTree component snippet from "Codex Task 5". Lists folders and files
// while excluding '.keep' placeholders so empty folders are shown in the UI.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function listDocuments(basePath: string) {
  // list docs including prefixes
  const { data, error } = await supabase.storage
    .from('original-docs')
    .list(basePath, {
      limit: 1000,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' }
    });

  if (error) throw error;

  const folders = data?.prefixes?.filter((p: string) => !p.endsWith('/.keep')) ?? [];
  const files   = data?.items?.filter((f) => f.name !== '.keep') ?? [];

  return { folders, files };
}
