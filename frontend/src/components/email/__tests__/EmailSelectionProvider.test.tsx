import React from 'react';
import { render, screen, fireEvent, act } from '@/test-utils/test-utils';
import { 
  EmailSelectionProvider, 
  useEmailSelection, 
  useEmailSelectionKeyboard 
} from '../EmailSelectionProvider';
import { testData } from '@/test-utils/test-data';

// Test component that uses the selection context
const TestComponent = () => {
  const { state, actions } = useEmailSelection();
  const { handleKeyDown } = useEmailSelectionKeyboard();
  const mockEmails = testData.mockEmails.slice(0, 5);
  
  return (
    <div>
      <div data-testid="selection-count">{state.selectedEmails.size}</div>
      <div data-testid="selection-mode">{state.selectionMode.toString()}</div>
      <div data-testid="select-all-checked">{state.isSelectAllChecked.toString()}</div>
      <div data-testid="total-count">{state.totalEmailsCount}</div>
      
      <button 
        data-testid="toggle-email-0"
        onClick={() => actions.toggleEmail(mockEmails[0].id, 0)}
      >
        Toggle Email 0
      </button>
      
      <button 
        data-testid="select-email-1"
        onClick={() => actions.selectEmail(mockEmails[1].id, 1)}
      >
        Select Email 1
      </button>
      
      <button 
        data-testid="deselect-email-0"
        onClick={() => actions.deselectEmail(mockEmails[0].id)}
      >
        Deselect Email 0
      </button>
      
      <button 
        data-testid="select-range"
        onClick={() => actions.selectRange(0, 2, mockEmails)}
      >
        Select Range 0-2
      </button>
      
      <button 
        data-testid="select-all"
        onClick={() => actions.selectAll(mockEmails)}
      >
        Select All
      </button>
      
      <button 
        data-testid="deselect-all"
        onClick={() => actions.deselectAll()}
      >
        Deselect All
      </button>
      
      <button 
        data-testid="set-total-count"
        onClick={() => actions.setTotalCount(mockEmails.length)}
      >
        Set Total Count
      </button>
      
      <div data-testid="selected-emails">
        {actions.getSelectedEmails(mockEmails).map(email => (
          <div key={email.id} data-testid={`selected-${email.id}`}>
            {email.id}
          </div>
        ))}
      </div>
      
      <div data-testid="has-selection">{actions.hasSelection().toString()}</div>
      
      <div data-testid="is-selected-0">{actions.isSelected(mockEmails[0].id).toString()}</div>
      
      <input
        data-testid="keyboard-input"
        onKeyDown={(e) => {
          const handled = handleKeyDown(
            e.nativeEvent, 
            mockEmails[0].id, 
            0, 
            mockEmails
          );
          if (handled) {
            e.preventDefault();
          }
        }}
      />
    </div>
  );
};

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('EmailSelectionProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('Provider initialization', () => {
    it('renders children correctly', () => {
      render(
        <EmailSelectionProvider>
          <div data-testid="child">Child content</div>
        </EmailSelectionProvider>
      );
      
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('initializes with default state', () => {
      render(
        <EmailSelectionProvider>
          <TestComponent />
        </EmailSelectionProvider>
      );
      
      expect(screen.getByTestId('selection-count')).toHaveTextContent('0');
      expect(screen.getByTestId('selection-mode')).toHaveTextContent('false');
      expect(screen.getByTestId('select-all-checked')).toHaveTextContent('false');
      expect(screen.getByTestId('total-count')).toHaveTextContent('0');
      expect(screen.getByTestId('has-selection')).toHaveTextContent('false');
    });

    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useEmailSelection must be used within an EmailSelectionProvider');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Email selection actions', () => {
    beforeEach(() => {
      render(
        <EmailSelectionProvider>
          <TestComponent />
        </EmailSelectionProvider>
      );
    });

    it('toggles email selection', () => {
      fireEvent.click(screen.getByTestId('toggle-email-0'));
      
      expect(screen.getByTestId('selection-count')).toHaveTextContent('1');
      expect(screen.getByTestId('selection-mode')).toHaveTextContent('true');
      expect(screen.getByTestId('is-selected-0')).toHaveTextContent('true');
      expect(screen.getByTestId('has-selection')).toHaveTextContent('true');
      
      // Toggle again to deselect
      fireEvent.click(screen.getByTestId('toggle-email-0'));
      
      expect(screen.getByTestId('selection-count')).toHaveTextContent('0');
      expect(screen.getByTestId('selection-mode')).toHaveTextContent('false');
      expect(screen.getByTestId('is-selected-0')).toHaveTextContent('false');
    });

    it('selects email', () => {
      fireEvent.click(screen.getByTestId('select-email-1'));
      
      expect(screen.getByTestId('selection-count')).toHaveTextContent('1');
      expect(screen.getByTestId('selection-mode')).toHaveTextContent('true');
      expect(screen.getByTestId('has-selection')).toHaveTextContent('true');
    });

    it('deselects specific email', () => {
      // First select an email
      fireEvent.click(screen.getByTestId('toggle-email-0'));
      expect(screen.getByTestId('selection-count')).toHaveTextContent('1');
      
      // Then deselect it
      fireEvent.click(screen.getByTestId('deselect-email-0'));
      expect(screen.getByTestId('selection-count')).toHaveTextContent('0');
      expect(screen.getByTestId('selection-mode')).toHaveTextContent('false');
    });

    it('selects range of emails', () => {
      fireEvent.click(screen.getByTestId('select-range'));
      
      expect(screen.getByTestId('selection-count')).toHaveTextContent('3');
      expect(screen.getByTestId('selection-mode')).toHaveTextContent('true');
      
      // Check that the selected emails are rendered
      const selectedEmails = screen.getByTestId('selected-emails');
      expect(selectedEmails.children).toHaveLength(3);
    });

    it('selects all emails', () => {
      // Set total count first
      fireEvent.click(screen.getByTestId('set-total-count'));
      
      fireEvent.click(screen.getByTestId('select-all'));
      
      expect(screen.getByTestId('selection-count')).toHaveTextContent('5');
      expect(screen.getByTestId('selection-mode')).toHaveTextContent('true');
      expect(screen.getByTestId('select-all-checked')).toHaveTextContent('true');
    });

    it('deselects all emails', () => {
      // First select some emails
      fireEvent.click(screen.getByTestId('select-all'));
      expect(screen.getByTestId('selection-count')).toHaveTextContent('5');
      
      // Then deselect all
      fireEvent.click(screen.getByTestId('deselect-all'));
      
      expect(screen.getByTestId('selection-count')).toHaveTextContent('0');
      expect(screen.getByTestId('selection-mode')).toHaveTextContent('false');
      expect(screen.getByTestId('select-all-checked')).toHaveTextContent('false');
      expect(screen.getByTestId('has-selection')).toHaveTextContent('false');
    });

    it('updates total count correctly', () => {
      fireEvent.click(screen.getByTestId('set-total-count'));
      expect(screen.getByTestId('total-count')).toHaveTextContent('5');
    });

    it('updates select-all state when total count changes', () => {
      // Select all first, then set count
      fireEvent.click(screen.getByTestId('select-all'));
      fireEvent.click(screen.getByTestId('set-total-count'));
      
      expect(screen.getByTestId('select-all-checked')).toHaveTextContent('true');
    });
  });

  describe('Keyboard shortcuts', () => {
    beforeEach(() => {
      render(
        <EmailSelectionProvider>
          <TestComponent />
        </EmailSelectionProvider>
      );
    });

    it('handles Escape key to deselect all', () => {
      // First select some emails
      fireEvent.click(screen.getByTestId('toggle-email-0'));
      expect(screen.getByTestId('selection-count')).toHaveTextContent('1');
      
      // Press Escape
      const input = screen.getByTestId('keyboard-input');
      fireEvent.keyDown(input, { key: 'Escape' });
      
      expect(screen.getByTestId('selection-count')).toHaveTextContent('0');
      expect(screen.getByTestId('selection-mode')).toHaveTextContent('false');
    });

    it('handles Ctrl+A to select all', () => {
      fireEvent.click(screen.getByTestId('set-total-count'));
      
      const input = screen.getByTestId('keyboard-input');
      fireEvent.keyDown(input, { key: 'a', ctrlKey: true });
      
      expect(screen.getByTestId('selection-count')).toHaveTextContent('5');
      expect(screen.getByTestId('selection-mode')).toHaveTextContent('true');
    });

    it('handles Cmd+A to select all on Mac', () => {
      fireEvent.click(screen.getByTestId('set-total-count'));
      
      const input = screen.getByTestId('keyboard-input');
      fireEvent.keyDown(input, { key: 'a', metaKey: true });
      
      expect(screen.getByTestId('selection-count')).toHaveTextContent('5');
    });

    it('handles Space to toggle selection', () => {
      const input = screen.getByTestId('keyboard-input');
      fireEvent.keyDown(input, { key: ' ' });
      
      expect(screen.getByTestId('selection-count')).toHaveTextContent('1');
      expect(screen.getByTestId('is-selected-0')).toHaveTextContent('true');
      
      // Press space again to deselect
      fireEvent.keyDown(input, { key: ' ' });
      
      expect(screen.getByTestId('selection-count')).toHaveTextContent('0');
    });

    it('returns false for unhandled keys', () => {
      const { handleKeyDown } = useEmailSelectionKeyboard();
      const mockEvent = new KeyboardEvent('keydown', { key: 'x' });
      
      const handled = handleKeyDown(mockEvent, 'test-id', 0, testData.mockEmails);
      expect(handled).toBe(false);
    });
  });

  describe('Local storage persistence', () => {
    it('loads persisted selection on mount', () => {
      const persistedSelection = ['email-1', 'email-2'];
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(persistedSelection));
      
      render(
        <EmailSelectionProvider>
          <TestComponent />
        </EmailSelectionProvider>
      );
      
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('email-selection');
      expect(screen.getByTestId('selection-count')).toHaveTextContent('2');
    });

    it('handles invalid persisted data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      render(
        <EmailSelectionProvider>
          <TestComponent />
        </EmailSelectionProvider>
      );
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load persisted email selection:',
        expect.any(Error)
      );
      expect(screen.getByTestId('selection-count')).toHaveTextContent('0');
      
      consoleSpy.mockRestore();
    });

    it('saves selection changes to localStorage', async () => {
      render(
        <EmailSelectionProvider>
          <TestComponent />
        </EmailSelectionProvider>
      );
      
      await act(async () => {
        fireEvent.click(screen.getByTestId('toggle-email-0'));
      });
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'email-selection',
        expect.stringContaining(testData.mockEmails[0].id)
      );
    });

    it('uses custom storage key', () => {
      render(
        <EmailSelectionProvider storageKey="custom-key">
          <TestComponent />
        </EmailSelectionProvider>
      );
      
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('custom-key');
    });

    it('disables persistence when persistSelection is false', () => {
      render(
        <EmailSelectionProvider persistSelection={false}>
          <TestComponent />
        </EmailSelectionProvider>
      );
      
      expect(mockLocalStorage.getItem).not.toHaveBeenCalled();
      
      fireEvent.click(screen.getByTestId('toggle-email-0'));
      
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('handles localStorage errors gracefully', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      render(
        <EmailSelectionProvider>
          <TestComponent />
        </EmailSelectionProvider>
      );
      
      await act(async () => {
        fireEvent.click(screen.getByTestId('toggle-email-0'));
      });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to persist email selection:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Selection state management', () => {
    beforeEach(() => {
      render(
        <EmailSelectionProvider>
          <TestComponent />
        </EmailSelectionProvider>
      );
    });

    it('maintains consistent state during multiple operations', () => {
      // Set total count
      fireEvent.click(screen.getByTestId('set-total-count'));
      
      // Select some emails
      fireEvent.click(screen.getByTestId('toggle-email-0'));
      fireEvent.click(screen.getByTestId('select-email-1'));
      
      expect(screen.getByTestId('selection-count')).toHaveTextContent('2');
      expect(screen.getByTestId('selection-mode')).toHaveTextContent('true');
      expect(screen.getByTestId('select-all-checked')).toHaveTextContent('false');
      
      // Select all
      fireEvent.click(screen.getByTestId('select-all'));
      
      expect(screen.getByTestId('selection-count')).toHaveTextContent('5');
      expect(screen.getByTestId('select-all-checked')).toHaveTextContent('true');
      
      // Deselect one
      fireEvent.click(screen.getByTestId('deselect-email-0'));
      
      expect(screen.getByTestId('selection-count')).toHaveTextContent('4');
      expect(screen.getByTestId('select-all-checked')).toHaveTextContent('false');
    });

    it('correctly updates select-all state', () => {
      // Set total count to 1 for easier testing
      const { rerender } = render(
        <EmailSelectionProvider>
          <TestComponent />
        </EmailSelectionProvider>
      );
      
      // Simulate total count of 1
      act(() => {
        fireEvent.click(screen.getByTestId('set-total-count'));
      });
      
      // Mock only 1 email for this test
      const TestComponentWithOneEmail = () => {
        const { state, actions } = useEmailSelection();
        const mockEmail = testData.mockEmails[0];
        
        React.useEffect(() => {
          actions.setTotalCount(1);
        }, [actions]);
        
        return (
          <div>
            <div data-testid="selection-count">{state.selectedEmails.size}</div>
            <div data-testid="select-all-checked">{state.isSelectAllChecked.toString()}</div>
            <button 
              data-testid="toggle-email"
              onClick={() => actions.toggleEmail(mockEmail.id, 0)}
            >
              Toggle Email
            </button>
          </div>
        );
      };
      
      rerender(
        <EmailSelectionProvider>
          <TestComponentWithOneEmail />
        </EmailSelectionProvider>
      );
      
      // Initially not selected
      expect(screen.getByTestId('select-all-checked')).toHaveTextContent('false');
      
      // Select the single email
      fireEvent.click(screen.getByTestId('toggle-email'));
      
      // Should now show select-all as checked
      expect(screen.getByTestId('select-all-checked')).toHaveTextContent('true');
    });
  });

  describe('Helper functions', () => {
    beforeEach(() => {
      render(
        <EmailSelectionProvider>
          <TestComponent />
        </EmailSelectionProvider>
      );
    });

    it('correctly identifies selected emails', () => {
      fireEvent.click(screen.getByTestId('toggle-email-0'));
      
      expect(screen.getByTestId('is-selected-0')).toHaveTextContent('true');
    });

    it('returns correct selection count', () => {
      fireEvent.click(screen.getByTestId('select-range'));
      
      expect(screen.getByTestId('selection-count')).toHaveTextContent('3');
    });

    it('correctly reports has selection state', () => {
      expect(screen.getByTestId('has-selection')).toHaveTextContent('false');
      
      fireEvent.click(screen.getByTestId('toggle-email-0'));
      
      expect(screen.getByTestId('has-selection')).toHaveTextContent('true');
    });

    it('returns selected emails correctly', () => {
      fireEvent.click(screen.getByTestId('select-range'));
      
      const selectedEmails = screen.getByTestId('selected-emails');
      expect(selectedEmails.children).toHaveLength(3);
    });
  });
});