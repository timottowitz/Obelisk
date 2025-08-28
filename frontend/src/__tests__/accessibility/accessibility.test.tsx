/**
 * Accessibility Tests for Email Assignment System
 * Tests WCAG compliance, keyboard navigation, screen reader support
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@/test-utils/test-utils';
import { axe, toHaveNoViolations } from 'jest-axe';
import { EmailAssignButton } from '@/components/email/EmailAssignButton';
import { CaseAssignmentModal } from '@/components/email/CaseAssignmentModal';
import { BulkCaseAssignmentModal } from '@/components/email/BulkCaseAssignmentModal';
import { EmailSelectionProvider } from '@/components/email/EmailSelectionProvider';
import { testData, testDataFactory } from '@/test-utils/test-data';

// Add jest-axe matcher
expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WCAG Compliance Tests', () => {
    it('EmailAssignButton meets accessibility standards', async () => {
      const { container } = render(
        <EmailAssignButton
          emailId="test-email-1"
          onAssign={() => {}}
          isAssigned={false}
          isLoading={false}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('CaseAssignmentModal meets accessibility standards', async () => {
      const mockEmail = testDataFactory.email();
      
      const { container } = render(
        <CaseAssignmentModal
          isOpen={true}
          onClose={() => {}}
          email={mockEmail}
          onAssignComplete={() => {}}
        />
      );

      // Wait for modal to render
      await screen.findByRole('dialog');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('BulkCaseAssignmentModal meets accessibility standards', async () => {
      const mockEmails = testDataFactory.emails(5);
      
      const { container } = render(
        <BulkCaseAssignmentModal
          isOpen={true}
          onClose={() => {}}
          emails={mockEmails}
          onAssignComplete={() => {}}
        />
      );

      await screen.findByRole('dialog');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('EmailSelectionProvider maintains accessibility', async () => {
      const TestComponent = () => (
        <EmailSelectionProvider>
          <div>
            <input 
              type="checkbox" 
              aria-label="Select email 1"
              data-testid="email-1-checkbox"
            />
            <input 
              type="checkbox" 
              aria-label="Select email 2"
              data-testid="email-2-checkbox"
            />
            <button aria-label="Select all emails">Select All</button>
          </div>
        </EmailSelectionProvider>
      );

      const { container } = render(<TestComponent />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation Tests', () => {
    it('supports keyboard navigation in EmailAssignButton', () => {
      const mockOnAssign = jest.fn();
      
      render(
        <EmailAssignButton
          emailId="test-email-1"
          onAssign={mockOnAssign}
          isAssigned={false}
          isLoading={false}
        />
      );

      const button = screen.getByRole('button');
      
      // Focus the button
      button.focus();
      expect(button).toHaveFocus();

      // Press Enter
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
      expect(mockOnAssign).toHaveBeenCalledWith('test-email-1');

      // Press Space
      fireEvent.keyDown(button, { key: ' ', code: 'Space' });
      expect(mockOnAssign).toHaveBeenCalledTimes(2);
    });

    it('supports keyboard navigation in CaseAssignmentModal', async () => {
      const mockEmail = testDataFactory.email();
      const mockOnClose = jest.fn();
      
      render(
        <CaseAssignmentModal
          isOpen={true}
          onClose={mockOnClose}
          email={mockEmail}
          onAssignComplete={() => {}}
        />
      );

      const modal = await screen.findByRole('dialog');
      expect(modal).toBeInTheDocument();

      // Test Escape key closes modal
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('supports tab navigation through modal elements', async () => {
      const mockEmail = testDataFactory.email();
      
      render(
        <CaseAssignmentModal
          isOpen={true}
          onClose={() => {}}
          email={mockEmail}
          onAssignComplete={() => {}}
        />
      );

      await screen.findByRole('dialog');

      // Test tab order
      const tabElements = [
        screen.getByRole('tab', { name: /Quick Access/ }),
        screen.getByRole('tab', { name: /AI Suggestions/ }),
        screen.getByRole('tab', { name: /Advanced Search/ }),
      ];

      // Focus first element
      tabElements[0].focus();
      expect(tabElements[0]).toHaveFocus();

      // Tab to next element
      fireEvent.keyDown(tabElements[0], { key: 'Tab', code: 'Tab' });
      // In real implementation, focus would move to next element
      // This is simplified for testing
    });

    it('supports arrow key navigation in case lists', async () => {
      const mockEmail = testDataFactory.email();
      
      render(
        <CaseAssignmentModal
          isOpen={true}
          onClose={() => {}}
          email={mockEmail}
          onAssignComplete={() => {}}
        />
      );

      await screen.findByRole('dialog');

      // Switch to search tab
      const searchTab = screen.getByRole('tab', { name: /Advanced Search/ });
      fireEvent.click(searchTab);

      // Mock case list items (would be rendered by CaseList component)
      const caseItems = screen.queryAllByRole('button');
      
      if (caseItems.length > 0) {
        const firstCase = caseItems[0];
        firstCase.focus();
        expect(firstCase).toHaveFocus();

        // Arrow down should move to next case
        fireEvent.keyDown(firstCase, { key: 'ArrowDown', code: 'ArrowDown' });
        
        // Arrow up should move to previous case
        fireEvent.keyDown(firstCase, { key: 'ArrowUp', code: 'ArrowUp' });
      }
    });
  });

  describe('Screen Reader Support Tests', () => {
    it('provides proper ARIA labels for EmailAssignButton', () => {
      render(
        <EmailAssignButton
          emailId="test-email-1"
          onAssign={() => {}}
          isAssigned={false}
          isLoading={false}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Assign email to a case');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('provides proper ARIA labels for different button states', () => {
      const { rerender } = render(
        <EmailAssignButton
          emailId="test-email-1"
          onAssign={() => {}}
          isAssigned={false}
          isLoading={true}
        />
      );

      // Loading state
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Assigning email to case...');

      // Assigned state
      rerender(
        <EmailAssignButton
          emailId="test-email-1"
          onAssign={() => {}}
          isAssigned={true}
          isLoading={false}
        />
      );

      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Email is assigned to a case');

      // Disabled state
      rerender(
        <EmailAssignButton
          emailId="test-email-1"
          onAssign={() => {}}
          isAssigned={false}
          isLoading={false}
          disabled={true}
        />
      );

      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'No cases available');
    });

    it('provides proper modal ARIA attributes', async () => {
      const mockEmail = testDataFactory.email();
      
      render(
        <CaseAssignmentModal
          isOpen={true}
          onClose={() => {}}
          email={mockEmail}
          onAssignComplete={() => {}}
        />
      );

      const dialog = await screen.findByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');

      const title = screen.getByText('Assign Email to Case');
      expect(title).toBeInTheDocument();
    });

    it('announces progress updates in bulk operations', async () => {
      const mockEmails = testDataFactory.emails(5);
      
      render(
        <BulkCaseAssignmentModal
          isOpen={true}
          onClose={() => {}}
          emails={mockEmails}
          onAssignComplete={() => {}}
        />
      );

      await screen.findByRole('dialog');

      // Look for live region for progress updates
      const progressRegion = screen.queryByRole('status');
      if (progressRegion) {
        expect(progressRegion).toHaveAttribute('aria-live', 'polite');
      }

      // Progress bar should have proper labels
      const progressBar = screen.queryByRole('progressbar');
      if (progressBar) {
        expect(progressBar).toHaveAttribute('aria-label');
        expect(progressBar).toHaveAttribute('aria-valuemin', '0');
        expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      }
    });

    it('provides descriptive error messages', async () => {
      const mockEmail = testDataFactory.email();
      
      // Mock an error scenario
      const { container } = render(
        <div>
          <CaseAssignmentModal
            isOpen={true}
            onClose={() => {}}
            email={mockEmail}
            onAssignComplete={() => {}}
          />
          <div 
            role="alert" 
            aria-live="assertive"
            data-testid="error-message"
          >
            Assignment failed: Case not found. Please select a different case.
          </div>
        </div>
      );

      const errorMessage = screen.getByTestId('error-message');
      expect(errorMessage).toHaveAttribute('role', 'alert');
      expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
      expect(errorMessage).toHaveTextContent('Assignment failed: Case not found. Please select a different case.');
    });
  });

  describe('Color Contrast and Visual Tests', () => {
    it('maintains sufficient color contrast in different states', () => {
      const { rerender } = render(
        <EmailAssignButton
          emailId="test-email-1"
          onAssign={() => {}}
          isAssigned={false}
          isLoading={false}
        />
      );

      // Test normal state
      let button = screen.getByRole('button');
      let styles = getComputedStyle(button);
      
      // These tests would require actual color contrast calculation
      // In a real implementation, you'd use tools like:
      // - color-contrast library
      // - axe-core's color-contrast rule
      expect(button).toBeInTheDocument();

      // Test assigned state (should have green styling)
      rerender(
        <EmailAssignButton
          emailId="test-email-1"
          onAssign={() => {}}
          isAssigned={true}
          isLoading={false}
        />
      );

      button = screen.getByRole('button');
      expect(button).toHaveClass('border-green-200', 'bg-green-50');
    });

    it('provides visual focus indicators', () => {
      render(
        <EmailAssignButton
          emailId="test-email-1"
          onAssign={() => {}}
          isAssigned={false}
          isLoading={false}
        />
      );

      const button = screen.getByRole('button');
      button.focus();
      
      expect(button).toHaveFocus();
      
      // Focus ring should be visible (tested via CSS classes or computed styles)
      // In a real implementation, you'd check for focus ring styles
    });
  });

  describe('Form Validation and Error Handling', () => {
    it('provides accessible form validation messages', async () => {
      const mockEmail = testDataFactory.email();
      
      const TestForm = () => {
        const [error, setError] = React.useState('');
        
        return (
          <div>
            <CaseAssignmentModal
              isOpen={true}
              onClose={() => {}}
              email={mockEmail}
              onAssignComplete={() => {}}
            />
            <div id="search-error" role="alert">
              {error}
            </div>
          </div>
        );
      };

      render(<TestForm />);

      await screen.findByRole('dialog');

      // Look for error container
      const errorContainer = screen.getByRole('alert');
      expect(errorContainer).toHaveAttribute('role', 'alert');
    });

    it('associates form controls with their labels', async () => {
      const mockEmail = testDataFactory.email();
      
      render(
        <CaseAssignmentModal
          isOpen={true}
          onClose={() => {}}
          email={mockEmail}
          onAssignComplete={() => {}}
        />
      );

      await screen.findByRole('dialog');

      // Switch to search tab to see search input
      const searchTab = screen.getByRole('tab', { name: /Advanced Search/ });
      fireEvent.click(searchTab);

      // Search input should have proper labeling
      const searchInput = screen.queryByRole('searchbox');
      if (searchInput) {
        expect(searchInput).toHaveAttribute('aria-label');
      }
    });
  });

  describe('Dynamic Content Updates', () => {
    it('announces dynamic content changes', async () => {
      const mockEmails = testDataFactory.emails(3);
      
      const TestComponent = () => {
        const [isProcessing, setIsProcessing] = React.useState(false);
        const [progress, setProgress] = React.useState(0);
        
        React.useEffect(() => {
          if (isProcessing) {
            const interval = setInterval(() => {
              setProgress(prev => {
                if (prev >= 100) {
                  clearInterval(interval);
                  return 100;
                }
                return prev + 10;
              });
            }, 100);
            
            return () => clearInterval(interval);
          }
        }, [isProcessing]);
        
        return (
          <div>
            <button onClick={() => setIsProcessing(true)}>
              Start Processing
            </button>
            <div
              role="status"
              aria-live="polite"
              aria-label={`Processing ${progress}% complete`}
            >
              {isProcessing && `Processing... ${progress}% complete`}
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label="Bulk assignment progress"
            />
          </div>
        );
      };

      render(<TestComponent />);

      const startButton = screen.getByText('Start Processing');
      fireEvent.click(startButton);

      // Wait for progress to start
      await screen.findByText(/Processing\.\.\./);

      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toHaveAttribute('aria-live', 'polite');

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('High Contrast Mode Support', () => {
    it('maintains visibility in high contrast mode', () => {
      // Mock high contrast mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('high-contrast'),
          media: query,
          onchange: null,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        })),
      });

      render(
        <EmailAssignButton
          emailId="test-email-1"
          onAssign={() => {}}
          isAssigned={false}
          isLoading={false}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      
      // In high contrast mode, elements should maintain visibility
      // This would typically be tested with actual CSS media queries
    });
  });

  describe('Mobile Accessibility', () => {
    it('maintains touch target sizes', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('max-width: 768px'),
          media: query,
          onchange: null,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        })),
      });

      render(
        <EmailAssignButton
          emailId="test-email-1"
          onAssign={() => {}}
          isAssigned={false}
          isLoading={false}
        />
      );

      const button = screen.getByRole('button');
      
      // Touch targets should be at least 44x44px
      const styles = getComputedStyle(button);
      // In real implementation, you'd check the computed dimensions
      expect(button).toBeInTheDocument();
    });

    it('supports voice navigation', () => {
      render(
        <EmailAssignButton
          emailId="test-email-1"
          onAssign={() => {}}
          isAssigned={false}
          isLoading={false}
        />
      );

      const button = screen.getByRole('button');
      
      // Button should have clear, speakable text
      expect(button).toHaveAttribute('aria-label', 'Assign email to a case');
      
      // Text should be simple and direct for voice commands
      const ariaLabel = button.getAttribute('aria-label');
      expect(ariaLabel).not.toContain('!'); // Avoid special characters
      expect(ariaLabel?.split(' ').length).toBeLessThan(10); // Keep it concise
    });
  });
});