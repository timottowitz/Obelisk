import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@/test-utils/test-utils';
import { server } from '@/test-utils/mocks/server';
import { http, HttpResponse } from 'msw';
import { CaseAssignmentModal } from '../CaseAssignmentModal';
import { testData } from '@/test-utils/test-data';

// Mock the child components to focus on modal logic
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

jest.mock('../SuggestedCases', () => ({
  SuggestedCases: ({ onCaseSelect }: any) => (
    <div data-testid="suggested-cases">
      {testData.mockSuggestions.map((suggestion) => (
        <button
          key={suggestion.id}
          data-testid={`suggestion-${suggestion.id}`}
          onClick={() => onCaseSelect(suggestion)}
        >
          {suggestion.caseNumber} - Confidence: {suggestion.confidenceScore}%
        </button>
      ))}
    </div>
  ),
}));

jest.mock('../QuickCaseAccess', () => ({
  QuickCaseAccess: ({ onCaseSelect }: any) => (
    <div data-testid="quick-case-access">
      {testData.mockCases.slice(0, 3).map((case_) => (
        <button
          key={case_.id}
          data-testid={`quick-case-${case_.id}`}
          onClick={() => onCaseSelect(case_)}
        >
          {case_.caseNumber}
        </button>
      ))}
    </div>
  ),
}));

jest.mock('../CaseSearchFilters', () => ({
  CaseSearchFilters: ({ onFiltersChange }: any) => (
    <div data-testid="case-search-filters">
      <button
        data-testid="apply-filters"
        onClick={() => onFiltersChange({ status: 'active' })}
      >
        Apply Filters
      </button>
    </div>
  ),
}));

const mockEmail = testData.specificTestCases.clientEmail;
const mockCase = testData.mockCases[0];

describe('CaseAssignmentModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    email: mockEmail,
    onAssignComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Modal rendering', () => {
    it('renders modal when open', () => {
      render(<CaseAssignmentModal {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Assign Email to Case')).toBeInTheDocument();
    });

    it('does not render modal when closed', () => {
      render(<CaseAssignmentModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not render modal when email is null', () => {
      render(<CaseAssignmentModal {...defaultProps} email={null} />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders email preview information', () => {
      render(<CaseAssignmentModal {...defaultProps} />);
      
      expect(screen.getByText('Email to Assign')).toBeInTheDocument();
      expect(screen.getByText(mockEmail.subject)).toBeInTheDocument();
      expect(screen.getByText(mockEmail.from.name)).toBeInTheDocument();
    });
  });

  describe('Search step', () => {
    it('renders default tab layout', () => {
      render(<CaseAssignmentModal {...defaultProps} />);
      
      expect(screen.getByRole('tab', { name: /Quick Access/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /AI Suggestions/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Advanced Search/ })).toBeInTheDocument();
    });

    it('shows AI suggestions by default', () => {
      render(<CaseAssignmentModal {...defaultProps} />);
      
      expect(screen.getByTestId('suggested-cases')).toBeInTheDocument();
    });

    it('switches to advanced search tab', () => {
      render(<CaseAssignmentModal {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('tab', { name: /Advanced Search/ }));
      
      expect(screen.getByTestId('case-search-input')).toBeInTheDocument();
      expect(screen.getByTestId('case-list')).toBeInTheDocument();
    });

    it('switches to quick access tab', () => {
      render(<CaseAssignmentModal {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('tab', { name: /Quick Access/ }));
      
      expect(screen.getByTestId('quick-case-access')).toBeInTheDocument();
    });

    it('handles case search', () => {
      render(<CaseAssignmentModal {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('tab', { name: /Advanced Search/ }));
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test query' } });
      
      expect(screen.getByTestId('case-list')).toBeInTheDocument();
    });

    it('displays search errors', () => {
      render(<CaseAssignmentModal {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('tab', { name: /Advanced Search/ }));
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'error' } });
      
      expect(screen.getByText('Search error')).toBeInTheDocument();
    });
  });

  describe('Case selection', () => {
    it('selects case from search results', () => {
      render(<CaseAssignmentModal {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('tab', { name: /Advanced Search/ }));
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      const firstCase = screen.getByTestId(`case-${testData.mockCases[0].id}`);
      fireEvent.click(firstCase);
      
      // Should transition to confirmation step
      expect(screen.getByText('Confirm Assignment')).toBeInTheDocument();
    });

    it('selects case from AI suggestions', () => {
      render(<CaseAssignmentModal {...defaultProps} />);
      
      const firstSuggestion = screen.getByTestId(`suggestion-${testData.mockSuggestions[0].id}`);
      fireEvent.click(firstSuggestion);
      
      expect(screen.getByText('Confirm Assignment')).toBeInTheDocument();
      expect(screen.getByText('AI Suggested')).toBeInTheDocument();
    });

    it('selects case from quick access', () => {
      render(<CaseAssignmentModal {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('tab', { name: /Quick Access/ }));
      
      const firstQuickCase = screen.getByTestId(`quick-case-${testData.mockCases[0].id}`);
      fireEvent.click(firstQuickCase);
      
      expect(screen.getByText('Confirm Assignment')).toBeInTheDocument();
      expect(screen.getByText('Quick Access')).toBeInTheDocument();
    });
  });

  describe('Confirmation step', () => {
    beforeEach(async () => {
      render(<CaseAssignmentModal {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('tab', { name: /Advanced Search/ }));
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      const firstCase = screen.getByTestId(`case-${testData.mockCases[0].id}`);
      fireEvent.click(firstCase);
    });

    it('displays confirmation step with email and case details', () => {
      expect(screen.getByText('Confirm Assignment')).toBeInTheDocument();
      expect(screen.getByText('Please review the assignment details before confirming.')).toBeInTheDocument();
      
      // Email details
      expect(screen.getByText(mockEmail.subject)).toBeInTheDocument();
      expect(screen.getByText(mockEmail.from.name)).toBeInTheDocument();
      
      // Case details
      expect(screen.getByText(testData.mockCases[0].caseNumber)).toBeInTheDocument();
      expect(screen.getByText(testData.mockCases[0].title)).toBeInTheDocument();
    });

    it('allows going back to search', () => {
      const backButton = screen.getByRole('button', { name: /Back to Search/ });
      fireEvent.click(backButton);
      
      expect(screen.getByText('Assign Email to Case')).toBeInTheDocument();
      expect(screen.getByTestId('suggested-cases')).toBeInTheDocument();
    });

    it('confirms assignment', async () => {
      const confirmButton = screen.getByRole('button', { name: /Assign Email/ });
      fireEvent.click(confirmButton);
      
      // Should show processing step
      expect(screen.getByText('Assigning Email to Case')).toBeInTheDocument();
      expect(screen.getByText('Processing email content and attachments...')).toBeInTheDocument();
      
      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText('Assignment Complete!')).toBeInTheDocument();
      });
      
      // Should call completion callback
      expect(defaultProps.onAssignComplete).toHaveBeenCalled();
    });
  });

  describe('Processing step', () => {
    beforeEach(async () => {
      render(<CaseAssignmentModal {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('tab', { name: /Advanced Search/ }));
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      const firstCase = screen.getByTestId(`case-${testData.mockCases[0].id}`);
      fireEvent.click(firstCase);
      
      const confirmButton = screen.getByRole('button', { name: /Assign Email/ });
      fireEvent.click(confirmButton);
    });

    it('displays processing step', () => {
      expect(screen.getByText('Assigning Email...')).toBeInTheDocument();
      expect(screen.getByText('Assigning Email to Case')).toBeInTheDocument();
      expect(screen.getByText('Processing email content and attachments...')).toBeInTheDocument();
      
      // Should show loading spinner
      expect(screen.getByRole('button', { name: /Assigning Email/ })).toBeDisabled();
    });
  });

  describe('Completion step', () => {
    beforeEach(async () => {
      render(<CaseAssignmentModal {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('tab', { name: /Advanced Search/ }));
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      const firstCase = screen.getByTestId(`case-${testData.mockCases[0].id}`);
      fireEvent.click(firstCase);
      
      const confirmButton = screen.getByRole('button', { name: /Assign Email/ });
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(screen.getByText('Assignment Complete!')).toBeInTheDocument();
      });
    });

    it('displays completion step', () => {
      expect(screen.getByText('Assignment Complete!')).toBeInTheDocument();
      expect(screen.getByText(/Email has been successfully assigned/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Done/ })).toBeInTheDocument();
    });

    it('closes modal when Done is clicked', () => {
      const doneButton = screen.getByRole('button', { name: /Done/ });
      fireEvent.click(doneButton);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      // Mock assignment failure
      server.use(
        http.post('/api/emails/:emailId/assign', () => {
          return HttpResponse.json(
            { error: 'Assignment failed' },
            { status: 500 }
          );
        })
      );
    });

    it('handles assignment errors', async () => {
      render(<CaseAssignmentModal {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('tab', { name: /Advanced Search/ }));
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      const firstCase = screen.getByTestId(`case-${testData.mockCases[0].id}`);
      fireEvent.click(firstCase);
      
      const confirmButton = screen.getByRole('button', { name: /Assign Email/ });
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(screen.getByText('Assignment Failed')).toBeInTheDocument();
        expect(screen.getByText('Assignment failed')).toBeInTheDocument();
      });
      
      // Should show retry and back buttons
      expect(screen.getByRole('button', { name: /Retry Assignment/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Back to Search/ })).toBeInTheDocument();
    });

    it('allows retrying failed assignment', async () => {
      render(<CaseAssignmentModal {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('tab', { name: /Advanced Search/ }));
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      const firstCase = screen.getByTestId(`case-${testData.mockCases[0].id}`);
      fireEvent.click(firstCase);
      
      const confirmButton = screen.getByRole('button', { name: /Assign Email/ });
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(screen.getByText('Assignment Failed')).toBeInTheDocument();
      });
      
      // Click retry
      const retryButton = screen.getByRole('button', { name: /Retry Assignment/ });
      fireEvent.click(retryButton);
      
      // Should return to processing
      expect(screen.getByText('Assigning Email to Case')).toBeInTheDocument();
    });

    it('allows going back from error state', async () => {
      render(<CaseAssignmentModal {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('tab', { name: /Advanced Search/ }));
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      const firstCase = screen.getByTestId(`case-${testData.mockCases[0].id}`);
      fireEvent.click(firstCase);
      
      const confirmButton = screen.getByRole('button', { name: /Assign Email/ });
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(screen.getByText('Assignment Failed')).toBeInTheDocument();
      });
      
      // Click back to search
      const backButton = screen.getByRole('button', { name: /Back to Search/ });
      fireEvent.click(backButton);
      
      // Should return to search step
      expect(screen.getByText('Assign Email to Case')).toBeInTheDocument();
    });
  });

  describe('Keyboard navigation', () => {
    it('closes modal on Escape key', () => {
      render(<CaseAssignmentModal {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('does not close modal on Escape during processing', async () => {
      render(<CaseAssignmentModal {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('tab', { name: /Advanced Search/ }));
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      const firstCase = screen.getByTestId(`case-${testData.mockCases[0].id}`);
      fireEvent.click(firstCase);
      
      const confirmButton = screen.getByRole('button', { name: /Assign Email/ });
      fireEvent.click(confirmButton);
      
      // Try to close during processing
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Advanced filters', () => {
    it('toggles advanced filters', () => {
      render(<CaseAssignmentModal {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('tab', { name: /Advanced Search/ }));
      
      const filtersButton = screen.getByRole('button', { name: /Filters/ });
      fireEvent.click(filtersButton);
      
      expect(screen.getByTestId('case-search-filters')).toBeInTheDocument();
    });

    it('applies filters', () => {
      render(<CaseAssignmentModal {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('tab', { name: /Advanced Search/ }));
      
      const filtersButton = screen.getByRole('button', { name: /Filters/ });
      fireEvent.click(filtersButton);
      
      const applyFiltersButton = screen.getByTestId('apply-filters');
      fireEvent.click(applyFiltersButton);
      
      // Filters should be applied (implementation depends on how filters are used)
      expect(screen.getByTestId('case-search-filters')).toBeInTheDocument();
    });
  });

  describe('Modal variants and states', () => {
    it('handles email with attachments', () => {
      const emailWithAttachments = testData.specificTestCases.emailWithAttachments;
      
      render(<CaseAssignmentModal {...defaultProps} email={emailWithAttachments} />);
      
      expect(screen.getByText('Has Attachments')).toBeInTheDocument();
    });

    it('handles email without subject', () => {
      const emailNoSubject = testData.specificTestCases.emailNoSubject;
      
      render(<CaseAssignmentModal {...defaultProps} email={emailNoSubject} />);
      
      expect(screen.getByText('(No Subject)')).toBeInTheDocument();
    });

    it('auto-closes after successful assignment', async () => {
      jest.useFakeTimers();
      
      render(<CaseAssignmentModal {...defaultProps} />);
      
      fireEvent.click(screen.getByRole('tab', { name: /Advanced Search/ }));
      
      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      const firstCase = screen.getByTestId(`case-${testData.mockCases[0].id}`);
      fireEvent.click(firstCase);
      
      const confirmButton = screen.getByRole('button', { name: /Assign Email/ });
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(screen.getByText('Assignment Complete!')).toBeInTheDocument();
      });
      
      // Fast-forward time
      jest.advanceTimersByTime(2000);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });
});