import { supabase } from '@/lib/supabase-client';

export async function createProjectFromTemplate(
  templateId: string,
  projectName: string,
  tenant: { orgId: string }
) {
  // 1. fetch template
  const { data: template, error } = await supabase
    .from('project_templates')
    .select('default_folders')
    .eq('template_id', templateId)
    .single();
  if (error) throw error;

  // 2. insert project row (returns project_id)
  const { data: proj } = await supabase.rpc('tenant.create_project_from_template', {
    p_template_id: templateId,
    p_project_name: projectName,
    p_org_id: tenant.orgId
  });
  const projectId = proj as string;

  // 3. build folder paths
  const placeholders = { Name: projectName } as Record<string, string>;
  const paths = template.default_folders.map((raw: string) =>
    raw.replace(/{{(\w+)}}/g, (_, k) => placeholders[k] ?? k)
  );

  // 4. fan-out empty ".keep" uploads
  await Promise.all(
    paths.map((p: string) =>
      supabase.storage
        .from('original-docs')
        .upload(`${tenant.orgId}/${projectId}/${p}/.keep`, new Blob(), {
          contentType: 'application/x.empty',
          upsert: false
        })
    )
  );

  return projectId;
}

