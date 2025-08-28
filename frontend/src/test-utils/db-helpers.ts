import { faker } from '@faker-js/faker';

// Mock database helpers for testing
export interface TestDatabase {
  cases: any[];
  emails: any[];
  assignments: any[];
  jobs: any[];
  users: any[];
  organizations: any[];
}

// In-memory test database
let testDb: TestDatabase = {
  cases: [],
  emails: [],
  assignments: [],
  jobs: [],
  users: [],
  organizations: [],
};

export const dbHelpers = {
  // Database setup and teardown
  async setup(): Promise<void> {
    // Reset database to clean state
    testDb = {
      cases: [],
      emails: [],
      assignments: [],
      jobs: [],
      users: [],
      organizations: [],
    };
    
    // Seed with basic test data
    await this.seedTestData();
  },

  async teardown(): Promise<void> {
    // Clean up test database
    testDb = {
      cases: [],
      emails: [],
      assignments: [],
      jobs: [],
      users: [],
      organizations: [],
    };
  },

  async seedTestData(): Promise<void> {
    // Create test organization
    const testOrg = {
      id: 'test-org-1',
      name: 'Test Organization',
      domain: 'testorg.com',
      settings: {
        emailIntegration: true,
        aiSuggestions: true,
      },
    };
    testDb.organizations.push(testOrg);

    // Create test users
    const testUsers = [
      {
        id: 'test-user-1',
        email: 'admin@testorg.com',
        name: 'Test Admin',
        role: 'admin',
        organizationId: testOrg.id,
      },
      {
        id: 'test-user-2', 
        email: 'lawyer@testorg.com',
        name: 'Test Lawyer',
        role: 'lawyer',
        organizationId: testOrg.id,
      },
    ];
    testDb.users.push(...testUsers);

    // Create test cases
    const testCases = Array.from({ length: 10 }, () => ({
      id: faker.string.uuid(),
      caseNumber: `CASE-${faker.string.numeric(6)}`,
      title: faker.company.catchPhrase(),
      clientName: faker.person.fullName(),
      status: faker.helpers.arrayElement(['active', 'pending', 'closed']),
      organizationId: testOrg.id,
      assignedAttorneys: [testUsers[1].id],
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    }));
    testDb.cases.push(...testCases);

    // Create test emails
    const testEmails = Array.from({ length: 15 }, () => ({
      id: faker.string.uuid(),
      subject: faker.lorem.sentence(),
      from: faker.internet.email(),
      to: [faker.internet.email()],
      body: faker.lorem.paragraphs(2),
      receivedAt: faker.date.recent(),
      organizationId: testOrg.id,
      hasAttachments: faker.datatype.boolean(),
      isAssigned: false,
    }));
    testDb.emails.push(...testEmails);
  },

  // Data access methods
  getOrganization(id: string) {
    return testDb.organizations.find(org => org.id === id);
  },

  getUser(id: string) {
    return testDb.users.find(user => user.id === id);
  },

  getCases(organizationId: string, filters?: any) {
    let cases = testDb.cases.filter(c => c.organizationId === organizationId);
    
    if (filters?.status) {
      cases = cases.filter(c => c.status === filters.status);
    }
    
    if (filters?.clientName) {
      cases = cases.filter(c => 
        c.clientName.toLowerCase().includes(filters.clientName.toLowerCase())
      );
    }
    
    return cases;
  },

  getEmails(organizationId: string, filters?: any) {
    let emails = testDb.emails.filter(e => e.organizationId === organizationId);
    
    if (filters?.isAssigned !== undefined) {
      emails = emails.filter(e => e.isAssigned === filters.isAssigned);
    }
    
    return emails;
  },

  // Data manipulation methods
  async createCase(caseData: any) {
    const newCase = {
      id: faker.string.uuid(),
      ...caseData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    testDb.cases.push(newCase);
    return newCase;
  },

  async createEmail(emailData: any) {
    const newEmail = {
      id: faker.string.uuid(),
      ...emailData,
      receivedAt: new Date(),
      isAssigned: false,
    };
    testDb.emails.push(newEmail);
    return newEmail;
  },

  async createAssignment(assignmentData: any) {
    const assignment = {
      id: faker.string.uuid(),
      ...assignmentData,
      assignedDate: new Date(),
      status: 'completed',
    };
    testDb.assignments.push(assignment);
    
    // Update email as assigned
    const email = testDb.emails.find(e => e.id === assignment.emailId);
    if (email) {
      email.isAssigned = true;
      email.caseId = assignment.caseId;
    }
    
    return assignment;
  },

  async createJob(jobData: any) {
    const job = {
      id: faker.string.uuid(),
      ...jobData,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'pending',
      progress: 0,
    };
    testDb.jobs.push(job);
    return job;
  },

  async updateJob(jobId: string, updates: any) {
    const job = testDb.jobs.find(j => j.id === jobId);
    if (job) {
      Object.assign(job, updates, { updatedAt: new Date() });
    }
    return job;
  },

  // Search helpers
  searchCases(organizationId: string, query: string, filters?: any) {
    let cases = testDb.cases.filter(c => c.organizationId === organizationId);
    
    if (query) {
      const searchTerm = query.toLowerCase();
      cases = cases.filter(c => 
        c.caseNumber.toLowerCase().includes(searchTerm) ||
        c.title.toLowerCase().includes(searchTerm) ||
        c.clientName.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply additional filters
    if (filters) {
      if (filters.status) {
        cases = cases.filter(c => c.status === filters.status);
      }
      if (filters.attorney) {
        cases = cases.filter(c => c.assignedAttorneys.includes(filters.attorney));
      }
    }
    
    return cases;
  },

  // Bulk operations
  async bulkAssignEmails(emailIds: string[], caseId: string, userId: string) {
    const assignments = [];
    
    for (const emailId of emailIds) {
      const assignment = await this.createAssignment({
        emailId,
        caseId,
        assignedBy: userId,
      });
      assignments.push(assignment);
    }
    
    return assignments;
  },

  // Transaction helpers (mock)
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    // In a real implementation, this would handle database transactions
    // For testing, we just execute the callback
    return callback();
  },

  // Test data generators
  generateTestCase(overrides: any = {}) {
    return {
      id: faker.string.uuid(),
      caseNumber: `CASE-${faker.string.numeric(6)}`,
      title: faker.company.catchPhrase(),
      clientName: faker.person.fullName(),
      status: 'active',
      organizationId: 'test-org-1',
      assignedAttorneys: ['test-user-2'],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  },

  generateTestEmail(overrides: any = {}) {
    return {
      id: faker.string.uuid(),
      subject: faker.lorem.sentence(),
      from: faker.internet.email(),
      to: [faker.internet.email()],
      body: faker.lorem.paragraphs(2),
      receivedAt: new Date(),
      organizationId: 'test-org-1',
      hasAttachments: false,
      isAssigned: false,
      ...overrides,
    };
  },

  // Assertion helpers
  async expectCaseExists(caseId: string) {
    const caseExists = testDb.cases.some(c => c.id === caseId);
    if (!caseExists) {
      throw new Error(`Expected case ${caseId} to exist in test database`);
    }
  },

  async expectEmailAssigned(emailId: string, caseId?: string) {
    const email = testDb.emails.find(e => e.id === emailId);
    if (!email) {
      throw new Error(`Email ${emailId} not found in test database`);
    }
    if (!email.isAssigned) {
      throw new Error(`Expected email ${emailId} to be assigned`);
    }
    if (caseId && email.caseId !== caseId) {
      throw new Error(`Expected email ${emailId} to be assigned to case ${caseId}, but was assigned to ${email.caseId}`);
    }
  },

  async expectJobStatus(jobId: string, expectedStatus: string) {
    const job = testDb.jobs.find(j => j.id === jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in test database`);
    }
    if (job.status !== expectedStatus) {
      throw new Error(`Expected job ${jobId} to have status ${expectedStatus}, but was ${job.status}`);
    }
  },
};