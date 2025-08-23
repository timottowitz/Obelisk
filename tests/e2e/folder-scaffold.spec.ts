import { test, expect } from '@playwright/test';
import { createProjectFromTemplate } from '../../backend/lib/projects';

test('Litigation template spawns 17 folders', async ({ request }) => {
  const ctx = { orgId: 'org-test' };
  const projectId = await createProjectFromTemplate(
    process.env.LITIGATION_TEMPLATE_ID!,
    'Rodriguez v Ford',
    ctx
  );

  const res = await request.get(
    `/api/storage-list?org=${ctx.orgId}&project=${projectId}&prefix=Litigation/Rodriguez v Ford`
  );
  const json = await res.json();
  expect(json.prefixes.length).toBe(17);
});
