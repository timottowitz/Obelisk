import { faker } from '@faker-js/faker';
import type { CaseSearchResult, EmailAssignment } from '@/components/email/CaseAssignmentModal';
import type { EmailSuggestion } from '@/hooks/useEmailSuggestions';
import type { ZeroMailMessage } from '@/lib/zero-mail-driver';

// Mock case data generator
const generateMockCase = (id?: string): CaseSearchResult => ({
  id: id || faker.string.uuid(),
  caseNumber: `CASE-${faker.string.numeric(6)}`,
  title: faker.company.catchPhrase(),
  clientName: faker.person.fullName(),
  status: faker.helpers.arrayElement(['active', 'pending', 'closed', 'archived']),
  lastActivity: faker.date.recent({ days: 30 }),
  assignedAttorneys: [faker.person.fullName(), faker.person.fullName()],
  relevanceScore: faker.number.float({ min: 0.1, max: 1.0, fractionDigits: 2 }),
  matchedFields: faker.helpers.arrayElements(['caseNumber', 'title', 'clientName']),
  suggestionReason: faker.helpers.arrayElement(['content-analysis', 'recent-assignment', 'pattern-match']),
});

// Mock email data generator
const generateMockEmail = (id?: string): ZeroMailMessage => ({
  id: id || faker.string.uuid(),
  subject: faker.lorem.sentence(),
  from: {
    name: faker.person.fullName(),
    address: faker.internet.email(),
  },
  to: [{
    name: faker.person.fullName(),
    address: faker.internet.email(),
  }],
  cc: [],
  bcc: [],
  body: faker.lorem.paragraphs(3),
  receivedAt: faker.date.recent({ days: 7 }).toISOString(),
  createdAt: faker.date.recent({ days: 7 }).toISOString(),
  updatedAt: faker.date.recent({ days: 7 }).toISOString(),
  isRead: faker.datatype.boolean(),
  hasAttachments: faker.datatype.boolean(),
  importance: faker.helpers.arrayElement(['low', 'normal', 'high']),
  conversationId: faker.string.uuid(),
  threadId: faker.string.uuid(),
  folderId: 'inbox',
  categories: [],
  flag: {
    flagStatus: 'notFlagged',
    startDateTime: null,
    dueDateTime: null,
  },
  internetMessageId: faker.internet.email(),
  attachments: [],
});

// Mock suggestion data generator
const generateMockSuggestion = (rank: number = 1): EmailSuggestion => ({
  id: faker.string.uuid(),
  caseId: faker.string.uuid(),
  caseNumber: `CASE-${faker.string.numeric(6)}`,
  caseTitle: faker.company.catchPhrase(),
  clientName: faker.person.fullName(),
  caseStatus: faker.helpers.arrayElement(['active', 'pending', 'closed']),
  confidenceScore: faker.number.int({ min: 60, max: 95 }),
  explanation: faker.lorem.sentence(),
  matchReasons: faker.helpers.arrayElements([
    'Client email domain match',
    'Similar case subject matter',
    'Recent communication history',
    'Attorney assignment pattern',
    'Document content similarity',
  ]),
  rank,
  createdAt: faker.date.recent({ days: 1 }).toISOString(),
  analysisData: {
    emailKeywords: faker.helpers.arrayElements([
      'contract', 'dispute', 'settlement', 'litigation', 'agreement'
    ]),
    caseKeywords: faker.helpers.arrayElements([
      'contract', 'dispute', 'settlement', 'litigation', 'agreement'
    ]),
    clientDomainMatch: faker.datatype.boolean(),
    contentSimilarity: faker.number.float({ min: 0.1, max: 1.0, fractionDigits: 2 }),
  },
});

// Mock email assignment data
const generateMockAssignment = (emailId: string, caseId: string): EmailAssignment => ({
  id: faker.string.uuid(),
  emailId,
  caseId,
  assignedBy: faker.string.uuid(),
  assignedDate: new Date(),
  storageLocation: `gs://test-bucket/emails/${emailId}`,
  status: 'completed',
});

// Pre-generated test data
export const testData = {
  // Mock cases for different test scenarios
  mockCases: Array.from({ length: 20 }, () => generateMockCase()),
  
  // Mock emails for various test scenarios
  mockEmails: Array.from({ length: 15 }, () => generateMockEmail()),
  
  // Mock suggestions with different confidence scores
  mockSuggestions: [
    generateMockSuggestion(1),
    generateMockSuggestion(2),
    generateMockSuggestion(3),
  ],
  
  // Mock email analysis result
  mockEmailAnalysis: {
    keywords: ['contract', 'dispute', 'litigation'],
    entities: ['Acme Corp', 'John Doe', 'Contract Agreement'],
    sentiment: 'neutral',
    urgency: 'medium',
    category: 'legal',
    clientDomain: 'acmecorp.com',
    hasLegalTerms: true,
  },

  // Specific test cases
  specificTestCases: {
    // High confidence case with perfect match
    highConfidenceCase: generateMockCase('high-confidence-case'),
    
    // Low confidence case
    lowConfidenceCase: generateMockCase('low-confidence-case'),
    
    // Email with attachments
    emailWithAttachments: {
      ...generateMockEmail('email-with-attachments'),
      hasAttachments: true,
      attachments: [
        {
          id: 'attachment-1',
          name: 'contract.pdf',
          contentType: 'application/pdf',
          size: 1024000,
        },
        {
          id: 'attachment-2', 
          name: 'evidence.docx',
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: 512000,
        },
      ],
    },
    
    // Email without subject
    emailNoSubject: {
      ...generateMockEmail('email-no-subject'),
      subject: '',
    },
    
    // Urgent email
    urgentEmail: {
      ...generateMockEmail('urgent-email'),
      importance: 'high',
      subject: 'URGENT: Court filing deadline today',
    },
    
    // Email from known client domain
    clientEmail: {
      ...generateMockEmail('client-email'),
      from: {
        name: 'Jane Smith',
        address: 'jane.smith@acmecorp.com',
      },
    },
  },
};

// Factory functions for generating test data in tests
export const testDataFactory = {
  case: generateMockCase,
  email: generateMockEmail,
  suggestion: generateMockSuggestion,
  assignment: generateMockAssignment,
  
  // Bulk data generation
  cases: (count: number) => Array.from({ length: count }, () => generateMockCase()),
  emails: (count: number) => Array.from({ length: count }, () => generateMockEmail()),
  suggestions: (count: number) => Array.from({ length: count }, (_, i) => generateMockSuggestion(i + 1)),
  
  // Specific scenarios
  bulkAssignmentScenario: (emailCount: number) => ({
    emails: Array.from({ length: emailCount }, () => generateMockEmail()),
    targetCase: generateMockCase(),
    expectedJobId: `bulk-job-${Date.now()}`,
  }),
  
  searchScenario: (query: string, resultCount: number = 5) => ({
    query,
    results: Array.from({ length: resultCount }, () => generateMockCase()),
    totalCount: resultCount * 2, // Simulate more results available
  }),
};

// Test utilities for creating specific data states
export const testScenarios = {
  // Empty states
  noCases: () => [],
  noEmails: () => [],
  noSuggestions: () => [],
  
  // Error states
  networkError: () => new Error('Network request failed'),
  authError: () => new Error('Authentication required'),
  validationError: () => new Error('Invalid request parameters'),
  
  // Loading states (for component testing)
  loadingState: {
    isLoading: true,
    data: null,
    error: null,
  },
  
  // Success states
  successState: (data: any) => ({
    isLoading: false,
    data,
    error: null,
  }),
  
  // Error states
  errorState: (error: string) => ({
    isLoading: false,
    data: null,
    error,
  }),
};