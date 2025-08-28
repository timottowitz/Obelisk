import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test-utils/test-utils';
import { server } from '@/test-utils/mocks/server';
import { http, HttpResponse } from 'msw';
import { BulkCaseAssignmentModal } from '../BulkCaseAssignmentModal';
import { testData } from '@/test-utils/test-data';

// Mock the child components
jest.mock('../CaseSearchInput', () => ({
  CaseSearchInput: ({ onSearch, onError }: any) => (
    <div data-testid="case-search-input">
      <input
        data-testid="search-input"
        onChange={(e) => {
          if (e.target.value === 'error') {
            onError('Search error');
          } else {
            onSearch(e.target.value, testData.mockCases);
          }
        }}
      />
    </div>
  ),
}));

jest.mock('../CaseList', () => ({
  CaseList: ({ cases, onCaseSelect }: any) => (
    <div data-testid="case-list">
      {cases.map((case_: any) => (
        <button
          key={case_.id}
          data-testid={`case-${case_.id}`}
          onClick={() => onCaseSelect(case_)}
        >
          {case_.caseNumber} - {case_.title}
        </button>
      ))}
    </div>
  ),
}));

// Mock useJobStatus hook
jest.mock('@/hooks/useJobStatus', () => ({
  useJobStatus: jest.fn(() => ({
    status: 'pending',
    progress: 0,
    error: null,
    startJob: jest.fn(),
    cancelJob: jest.fn(),
  })),
}));

const mockEmails = testData.mockEmails.slice(0, 5);
const mockCase = testData.mockCases[0];

describe('BulkCaseAssignmentModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    emails: mockEmails,
    onAssignComplete: jest.fn(),
    onRetry: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up successful bulk assignment response
    server.use(
      http.post('/api/emails/bulk-assign', async ({ request }) => {
        const body = await request.json() as { emailIds: string[]; caseId: string };
        return HttpResponse.json({
          jobId: `bulk-job-${Date.now()}`,
          status: 'started',
          totalEmails: body.emailIds.length,
          processedCount: 0,
          failedCount: 0,
          estimatedCompletion: new Date(Date.now() + 30000).toISOString(),
        });
      })
    );
  });

  describe('Modal rendering', () => {
    it('renders modal when open', () => {
      render(<BulkCaseAssignmentModal {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Bulk Assign Emails to Case')).toBeInTheDocument();
    });

    it('does not render modal when closed', () => {
      render(<BulkCaseAssignmentModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('displays email count and summary', () => {
      render(<BulkCaseAssignmentModal {...defaultProps} />);
      
      expect(screen.getByText(`${mockEmails.length} emails selected`)).toBeInTheDocument();
      expect(screen.getByText('Select a case to assign all emails')).toBeInTheDocument();
    });

    it('shows email list in summary', () => {
      render(<BulkCaseAssignmentModal {...defaultProps} />);
      
      // Should show preview of selected emails
      mockEmails.forEach(email => {
        expect(screen.getByText(email.subject)).toBeInTheDocument();
      });
    });
  });

  describe('Case selection step', () => {
    it('renders case search interface', () => {
      render(<BulkCaseAssignmentModal {...defaultProps} />);
      
      expect(screen.getByTestId('case-search-input')).toBeInTheDocument();
      expect(screen.getByTestId('case-list')).toBeInTheDocument();
    });

    it('handles case search', () => {
      render(<BulkCaseAssignmentModal {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test query' } });
      
      expect(screen.getByTestId('case-list')).toBeInTheDocument();
    });

    it('selects a case', () => {
      render(<BulkCaseAssignmentModal {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      const firstCase = screen.getByTestId(`case-${testData.mockCases[0].id}`);
      fireEvent.click(firstCase);
      
      // Should show selected case and enable assignment
      expect(screen.getByText('Selected Case')).toBeInTheDocument();
      expect(screen.getByText(testData.mockCases[0].caseNumber)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Start Bulk Assignment/ })).toBeEnabled();
    });

    it('displays search errors', () => {
      render(<BulkCaseAssignmentModal {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'error' } });
      
      expect(screen.getByText('Search error')).toBeInTheDocument();
    });
  });

  describe('Bulk assignment process', () => {
    beforeEach(async () => {
      render(<BulkCaseAssignmentModal {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      const firstCase = screen.getByTestId(`case-${testData.mockCases[0].id}`);
      fireEvent.click(firstCase);
    });

    it('starts bulk assignment process', async () => {
      const assignButton = screen.getByRole('button', { name: /Start Bulk Assignment/ });
      fireEvent.click(assignButton);
      
      // Should show processing state
      expect(screen.getByText('Processing Assignments...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('shows progress during assignment', async () => {
      const assignButton = screen.getByRole('button', { name: /Start Bulk Assignment/ });
      fireEvent.click(assignButton);
      
      // Should show progress information
      expect(screen.getByText('Processing Assignments...')).toBeInTheDocument();
      expect(screen.getByText(/Assigning \d+ emails/)).toBeInTheDocument();
    });

    it('handles assignment completion', async () => {
      const assignButton = screen.getByRole('button', { name: /Start Bulk Assignment/ });
      fireEvent.click(assignButton);
      
      // Mock job completion
      const mockJobStatus = require('@/hooks/useJobStatus').useJobStatus;
      mockJobStatus.mockReturnValue({
        status: 'completed',
        progress: 100,
        error: null,
        data: {
          successes: mockEmails.map(email => ({
            emailId: email.id,
            email,
            success: true,
            timestamp: new Date().toISOString(),
          })),
          failures: [],
        },
      });
      
      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText('Assignment Complete')).toBeInTheDocument();
      });
      
      expect(screen.getByText(`${mockEmails.length} emails assigned successfully`)).toBeInTheDocument();
      expect(defaultProps.onAssignComplete).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      // Mock bulk assignment failure
      server.use(
        http.post('/api/emails/bulk-assign', () => {
          return HttpResponse.json(
            { error: 'Bulk assignment failed' },
            { status: 500 }
          );
        })
      );
    });

    it('handles assignment errors', async () => {
      render(<BulkCaseAssignmentModal {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      const firstCase = screen.getByTestId(`case-${testData.mockCases[0].id}`);
      fireEvent.click(firstCase);
      
      const assignButton = screen.getByRole('button', { name: /Start Bulk Assignment/ });
      fireEvent.click(assignButton);
      
      await waitFor(() => {
        expect(screen.getByText('Assignment Failed')).toBeInTheDocument();
      });
      
      expect(screen.getByText(/Failed to start bulk assignment/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Try Again/ })).toBeInTheDocument();
    });

    it('handles partial failures', async () => {
      render(<BulkCaseAssignmentModal {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      const firstCase = screen.getByTestId(`case-${testData.mockCases[0].id}`);
      fireEvent.click(firstCase);
      
      const assignButton = screen.getByRole('button', { name: /Start Bulk Assignment/ });
      fireEvent.click(assignButton);
      
      // Mock partial failure
      const mockJobStatus = require('@/hooks/useJobStatus').useJobStatus;
      mockJobStatus.mockReturnValue({
        status: 'completed',
        progress: 100,
        error: null,
        data: {
          successes: mockEmails.slice(0, 3).map(email => ({
            emailId: email.id,
            email,
            success: true,
            timestamp: new Date().toISOString(),
          })),
          failures: mockEmails.slice(3).map(email => ({
            emailId: email.id,
            email,
            success: false,
            error: 'Assignment failed',
            timestamp: new Date().toISOString(),
          })),
        },
      });
      
      await waitFor(() => {
        expect(screen.getByText('Assignment Completed with Errors')).toBeInTheDocument();
      });
      
      expect(screen.getByText('3 emails assigned successfully')).toBeInTheDocument();
      expect(screen.getByText('2 emails failed to assign')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry Failed/ })).toBeInTheDocument();
    });

    it('allows retrying failed assignments', async () => {
      render(<BulkCaseAssignmentModal {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      const firstCase = screen.getByTestId(`case-${testData.mockCases[0].id}`);
      fireEvent.click(firstCase);
      
      const assignButton = screen.getByRole('button', { name: /Start Bulk Assignment/ });
      fireEvent.click(assignButton);
      
      await waitFor(() => {
        expect(screen.getByText('Assignment Failed')).toBeInTheDocument();
      });
      
      const retryButton = screen.getByRole('button', { name: /Try Again/ });
      fireEvent.click(retryButton);
      
      // Should restart the process
      expect(screen.getByText('Processing Assignments...')).toBeInTheDocument();
    });
  });

  describe('Progress tracking', () => {
    it('shows real-time progress updates', async () => {
      render(<BulkCaseAssignmentModal {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      const firstCase = screen.getByTestId(`case-${testData.mockCases[0].id}`);
      fireEvent.click(firstCase);
      
      const assignButton = screen.getByRole('button', { name: /Start Bulk Assignment/ });
      fireEvent.click(assignButton);
      
      // Mock progressive updates
      const mockJobStatus = require('@/hooks/useJobStatus').useJobStatus;
      
      // First update - 20% complete
      mockJobStatus.mockReturnValue({
        status: 'in_progress',
        progress: 20,
        error: null,
        data: {
          processed: 1,
          total: 5,
          currentEmail: mockEmails[0].subject,
        },
      });
      
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '20');
      expect(screen.getByText('1 of 5 emails processed')).toBeInTheDocument();
    });

    it('displays current email being processed', async () => {
      render(<BulkCaseAssignmentModal {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      const firstCase = screen.getByTestId(`case-${testData.mockCases[0].id}`);
      fireEvent.click(firstCase);
      
      const assignButton = screen.getByRole('button', { name: /Start Bulk Assignment/ });
      fireEvent.click(assignButton);
      
      const mockJobStatus = require('@/hooks/useJobStatus').useJobStatus;
      mockJobStatus.mockReturnValue({
        status: 'in_progress',
        progress: 40,
        error: null,
        data: {
          currentEmail: mockEmails[1].subject,
        },
      });
      
      expect(screen.getByText(`Currently processing: ${mockEmails[1].subject}`)).toBeInTheDocument();
    });

    it('shows time estimates', async () => {
      render(<BulkCaseAssignmentModal {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      const firstCase = screen.getByTestId(`case-${testData.mockCases[0].id}`);
      fireEvent.click(firstCase);
      
      const assignButton = screen.getByRole('button', { name: /Start Bulk Assignment/ });
      fireEvent.click(assignButton);
      
      const mockJobStatus = require('@/hooks/useJobStatus').useJobStatus;
      mockJobStatus.mockReturnValue({
        status: 'in_progress',
        progress: 50,
        error: null,
        data: {
          estimatedCompletion: new Date(Date.now() + 30000).toISOString(),
        },
      });
      
      expect(screen.getByText(/Estimated completion:/)).toBeInTheDocument();
    });
  });

  describe('Results display', () => {
    it('shows detailed results after completion', async () => {
      render(<BulkCaseAssignmentModal {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      const firstCase = screen.getByTestId(`case-${testData.mockCases[0].id}`);
      fireEvent.click(firstCase);
      
      const assignButton = screen.getByRole('button', { name: /Start Bulk Assignment/ });
      fireEvent.click(assignButton);
      
      const mockJobStatus = require('@/hooks/useJobStatus').useJobStatus;
      mockJobStatus.mockReturnValue({
        status: 'completed',
        progress: 100,
        error: null,
        data: {
          successes: mockEmails.map(email => ({
            emailId: email.id,
            email,
            success: true,
            timestamp: new Date().toISOString(),
          })),
          failures: [],
        },
      });
      
      await waitFor(() => {
        expect(screen.getByText('Assignment Complete')).toBeInTheDocument();
      });
      
      // Should show success tab
      expect(screen.getByRole('tab', { name: /Successful/ })).toBeInTheDocument();
      
      // Should list successful assignments
      mockEmails.forEach(email => {
        expect(screen.getByText(email.subject)).toBeInTheDocument();
      });
    });

    it('shows failed assignments in separate tab', async () => {
      render(<BulkCaseAssignmentModal {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      const firstCase = screen.getByTestId(`case-${testData.mockCases[0].id}`);
      fireEvent.click(firstCase);
      
      const assignButton = screen.getByRole('button', { name: /Start Bulk Assignment/ });
      fireEvent.click(assignButton);
      
      const mockJobStatus = require('@/hooks/useJobStatus').useJobStatus;
      const failedEmails = mockEmails.slice(0, 2);
      const successfulEmails = mockEmails.slice(2);
      
      mockJobStatus.mockReturnValue({
        status: 'completed',
        progress: 100,
        error: null,
        data: {
          successes: successfulEmails.map(email => ({
            emailId: email.id,
            email,
            success: true,
            timestamp: new Date().toISOString(),
          })),
          failures: failedEmails.map(email => ({
            emailId: email.id,
            email,
            success: false,
            error: 'Assignment failed',
            timestamp: new Date().toISOString(),
          })),
        },
      });
      
      await waitFor(() => {
        expect(screen.getByText('Assignment Completed with Errors')).toBeInTheDocument();
      });
      
      // Click on failed tab
      fireEvent.click(screen.getByRole('tab', { name: /Failed/ }));
      
      // Should show failed assignments
      failedEmails.forEach(email => {
        expect(screen.getByText(email.subject)).toBeInTheDocument();
      });
    });
  });

  describe('Modal controls', () => {
    it('closes modal', () => {
      render(<BulkCaseAssignmentModal {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /Cancel/ });
      fireEvent.click(closeButton);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('prevents closing during assignment', async () => {
      render(<BulkCaseAssignmentModal {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      const firstCase = screen.getByTestId(`case-${testData.mockCases[0].id}`);
      fireEvent.click(firstCase);
      
      const assignButton = screen.getByRole('button', { name: /Start Bulk Assignment/ });
      fireEvent.click(assignButton);
      
      // Cancel button should be disabled during processing
      const cancelButton = screen.getByRole('button', { name: /Cancel/ });
      expect(cancelButton).toBeDisabled();
    });

    it('allows closing after completion', async () => {
      render(<BulkCaseAssignmentModal {...defaultProps} />);
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      const firstCase = screen.getByTestId(`case-${testData.mockCases[0].id}`);
      fireEvent.click(firstCase);
      
      const assignButton = screen.getByRole('button', { name: /Start Bulk Assignment/ });
      fireEvent.click(assignButton);
      
      const mockJobStatus = require('@/hooks/useJobStatus').useJobStatus;
      mockJobStatus.mockReturnValue({
        status: 'completed',
        progress: 100,
        error: null,
        data: {
          successes: mockEmails.map(email => ({
            emailId: email.id,
            email,
            success: true,
            timestamp: new Date().toISOString(),
          })),
          failures: [],
        },
      });
      
      await waitFor(() => {
        expect(screen.getByText('Assignment Complete')).toBeInTheDocument();
      });
      
      const doneButton = screen.getByRole('button', { name: /Done/ });
      fireEvent.click(doneButton);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('handles empty email list', () => {
      render(<BulkCaseAssignmentModal {...defaultProps} emails={[]} />);
      
      expect(screen.getByText('0 emails selected')).toBeInTheDocument();
      expect(screen.getByText('No emails to assign')).toBeInTheDocument();
    });

    it('handles single email', () => {
      render(<BulkCaseAssignmentModal {...defaultProps} emails={[mockEmails[0]]} />);
      
      expect(screen.getByText('1 email selected')).toBeInTheDocument();
      expect(screen.getByText(mockEmails[0].subject)).toBeInTheDocument();
    });

    it('handles large email lists', () => {
      const largeEmailList = Array.from({ length: 100 }, (_, i) => ({
        ...mockEmails[0],
        id: `email-${i}`,
        subject: `Test Email ${i}`,
      }));
      
      render(<BulkCaseAssignmentModal {...defaultProps} emails={largeEmailList} />);
      
      expect(screen.getByText('100 emails selected')).toBeInTheDocument();
      // Should show scroll area for large lists
      expect(screen.getByText('Show all emails')).toBeInTheDocument();
    });
  });
});