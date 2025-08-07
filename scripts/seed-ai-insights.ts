#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TENANT_SCHEMA = process.env.TENANT_SCHEMA || 'org_demo';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  db: { schema: TENANT_SCHEMA }
});

// Sample AI reasoning templates
const AI_REASONING_TEMPLATES = [
  'Extracted from document analysis: Client mentioned {action} regarding {subject} with deadline of {date}.',
  'Based on transcript analysis at {timestamp}, speaker emphasized importance of {action} for {subject}.',
  'Email thread indicates urgent need for {action}. Multiple stakeholders mentioned this task.',
  'Chat conversation revealed upcoming {subject} requiring {action} by {date}.',
  'Meeting notes suggest {action} as critical next step for {subject} completion.',
];

// Sample extracted entities
const ENTITY_TYPES = ['person', 'organization', 'date', 'deadline', 'location', 'document', 'amount'];

// Sample source references
const SOURCE_REFERENCES = [
  'DOC-2024-001-contract-review.pdf',
  'TRANSCRIPT-2024-03-15-client-meeting.txt',
  'EMAIL-thread-re-discovery-deadline',
  'CHAT-2024-03-10-team-discussion',
  'MEETING-NOTES-2024-03-12-strategy-session',
];

interface SeedConfig {
  caseId?: string;
  projectId?: string;
  count: number;
  status?: 'pending' | 'accepted' | 'rejected';
}

async function generateAIInsight(config: SeedConfig) {
  const priority = faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']);
  const sourceType = faker.helpers.arrayElement(['document', 'transcript', 'email', 'chat', 'manual']);
  const confidence = faker.number.float({ min: 0.5, max: 1, precision: 0.01 });
  
  // Generate task content based on legal context
  const taskTypes = [
    { title: 'Review {document}', desc: 'Conduct thorough review of {document} for {purpose}' },
    { title: 'File {motion} motion', desc: 'Prepare and file {motion} motion with court by deadline' },
    { title: 'Schedule deposition for {person}', desc: 'Coordinate and schedule deposition of {person}' },
    { title: 'Draft {agreement} agreement', desc: 'Prepare initial draft of {agreement} agreement for client review' },
    { title: 'Research {topic} precedents', desc: 'Research case law and precedents related to {topic}' },
    { title: 'Client meeting - {subject}', desc: 'Prepare for and conduct client meeting regarding {subject}' },
    { title: 'Respond to {party} discovery request', desc: 'Compile and respond to discovery request from {party}' },
    { title: 'Update {document} exhibit list', desc: 'Update and organize exhibit list for {document}' },
  ];

  const taskTemplate = faker.helpers.arrayElement(taskTypes);
  const variables = {
    document: faker.helpers.arrayElement(['Purchase Agreement', 'Settlement Terms', 'Discovery Request', 'Motion to Compel']),
    motion: faker.helpers.arrayElement(['Summary Judgment', 'Dismissal', 'Protective Order', 'Continuance']),
    person: faker.person.fullName(),
    agreement: faker.helpers.arrayElement(['Non-Disclosure', 'Settlement', 'Employment', 'License']),
    topic: faker.helpers.arrayElement(['Liability', 'Damages', 'Jurisdiction', 'Statute of Limitations']),
    subject: faker.helpers.arrayElement(['Case Strategy', 'Settlement Options', 'Discovery Plan', 'Trial Preparation']),
    party: faker.company.name(),
    purpose: faker.helpers.arrayElement(['compliance', 'risk assessment', 'accuracy', 'completeness']),
    action: faker.helpers.arrayElement(['review', 'draft', 'file', 'schedule', 'prepare']),
    date: faker.date.future().toISOString().split('T')[0],
    timestamp: faker.date.recent().toLocaleTimeString(),
  };

  // Replace variables in templates
  const title = taskTemplate.title.replace(/{(\w+)}/g, (_, key) => variables[key] || key);
  const description = taskTemplate.desc.replace(/{(\w+)}/g, (_, key) => variables[key] || key);
  const reasoning = faker.helpers.arrayElement(AI_REASONING_TEMPLATES)
    .replace(/{(\w+)}/g, (_, key) => variables[key] || key);

  // Generate extracted entities
  const entityCount = faker.number.int({ min: 1, max: 5 });
  const extractedEntities = Array.from({ length: entityCount }, () => ({
    type: faker.helpers.arrayElement(ENTITY_TYPES),
    value: faker.helpers.arrayElement([
      faker.person.fullName(),
      faker.company.name(),
      faker.date.future().toLocaleDateString(),
      faker.location.city(),
      `$${faker.number.int({ min: 1000, max: 100000 })}`,
    ]),
    confidence: faker.number.float({ min: 0.7, max: 1, precision: 0.01 }),
    context: faker.lorem.sentence(),
  }));

  // Determine due date based on priority
  let dueDate: Date | null = null;
  if (priority === 'urgent') {
    dueDate = faker.date.soon({ days: 3 });
  } else if (priority === 'high') {
    dueDate = faker.date.soon({ days: 7 });
  } else if (priority === 'medium') {
    dueDate = faker.date.soon({ days: 14 });
  } else {
    dueDate = faker.date.future({ years: 0.25 });
  }

  return {
    case_id: config.caseId || null,
    project_id: config.projectId || null,
    suggested_title: title,
    suggested_description: description,
    suggested_priority: priority,
    suggested_due_date: dueDate?.toISOString() || null,
    suggested_assignee_id: null, // Would need actual user IDs
    confidence_score: confidence,
    extracted_entities: extractedEntities,
    ai_reasoning: reasoning,
    source_type: sourceType,
    source_reference: faker.helpers.arrayElement(SOURCE_REFERENCES),
    status: config.status || 'pending',
    created_at: faker.date.recent({ days: 7 }).toISOString(),
  };
}

async function seedAIInsights(config: SeedConfig) {
  console.log(`Seeding ${config.count} AI insights...`);
  
  const insights = [];
  for (let i = 0; i < config.count; i++) {
    insights.push(await generateAIInsight(config));
  }

  const { data, error } = await supabase
    .from('ai_task_insights')
    .insert(insights)
    .select();

  if (error) {
    console.error('Error seeding AI insights:', error);
    return;
  }

  console.log(`Successfully seeded ${data.length} AI insights`);
  return data;
}

async function main() {
  try {
    // Get cases and projects for context
    const { data: cases } = await supabase
      .from('cases')
      .select('id, case_number, title')
      .limit(5);

    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .limit(5);

    if (!cases?.length && !projects?.length) {
      console.log('No cases or projects found. Seeding standalone insights...');
      await seedAIInsights({ count: 10, status: 'pending' });
      return;
    }

    // Seed insights for cases
    if (cases?.length) {
      for (const caseItem of cases.slice(0, 3)) {
        console.log(`Seeding insights for case: ${caseItem.case_number}`);
        await seedAIInsights({
          caseId: caseItem.id,
          count: faker.number.int({ min: 3, max: 7 }),
          status: 'pending'
        });
        
        // Add some historical (accepted/rejected) insights
        await seedAIInsights({
          caseId: caseItem.id,
          count: faker.number.int({ min: 1, max: 3 }),
          status: 'accepted'
        });
        
        await seedAIInsights({
          caseId: caseItem.id,
          count: faker.number.int({ min: 1, max: 2 }),
          status: 'rejected'
        });
      }
    }

    // Seed insights for projects
    if (projects?.length) {
      for (const project of projects.slice(0, 2)) {
        console.log(`Seeding insights for project: ${project.name}`);
        await seedAIInsights({
          projectId: project.id,
          count: faker.number.int({ min: 2, max: 5 }),
          status: 'pending'
        });
      }
    }

    console.log('AI insights seeding completed successfully!');
    
    // Show summary
    const { count } = await supabase
      .from('ai_task_insights')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\nTotal AI insights in database: ${count}`);
    
    const { data: stats } = await supabase
      .from('ai_task_insights')
      .select('status');
    
    if (stats) {
      const statusCounts = stats.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('Status breakdown:', statusCounts);
    }

  } catch (error) {
    console.error('Error in seeding process:', error);
    process.exit(1);
  }
}

// Run the seeder
if (require.main === module) {
  main().then(() => process.exit(0));
}

export { seedAIInsights, generateAIInsight };