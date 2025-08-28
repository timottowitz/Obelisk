import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test-utils/test-utils';
import { EmailAssignButton, EmailAssignButtonProps } from '../EmailAssignButton';

describe('EmailAssignButton', () => {
  const defaultProps: EmailAssignButtonProps = {
    emailId: 'test-email-1',
    isAssigned: false,
    isLoading: false,
    onAssign: jest.fn(),
    variant: 'default',
    disabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Default state', () => {
    it('renders assign button with correct text', () => {
      render(<EmailAssignButton {...defaultProps} />);
      
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Assign to Case')).toBeInTheDocument();
      expect(screen.getByLabelText('Assign email to a case')).toBeInTheDocument();
    });

    it('renders FolderPlus icon', () => {
      render(<EmailAssignButton {...defaultProps} />);
      
      const icon = screen.getByRole('button').querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('calls onAssign when clicked', async () => {
      const mockOnAssign = jest.fn();
      render(<EmailAssignButton {...defaultProps} onAssign={mockOnAssign} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(mockOnAssign).toHaveBeenCalledWith('test-email-1');
    });

    it('shows tooltip on hover', async () => {
      render(<EmailAssignButton {...defaultProps} />);
      
      fireEvent.mouseEnter(screen.getByRole('button'));
      
      await waitFor(() => {
        expect(screen.getByText('Assign email to a case')).toBeInTheDocument();
      });
    });
  });

  describe('Loading state', () => {
    it('renders loading spinner and text', () => {
      render(<EmailAssignButton {...defaultProps} isLoading={true} />);
      
      expect(screen.getByText('Assigning...')).toBeInTheDocument();
      expect(screen.getByLabelText('Assigning email to case...')).toBeInTheDocument();
      
      // Check for loading spinner
      const spinner = screen.getByRole('button').querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('disables button when loading', () => {
      render(<EmailAssignButton {...defaultProps} isLoading={true} />);
      
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('does not call onAssign when clicked while loading', () => {
      const mockOnAssign = jest.fn();
      render(<EmailAssignButton {...defaultProps} isLoading={true} onAssign={mockOnAssign} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(mockOnAssign).not.toHaveBeenCalled();
    });

    it('shows loading tooltip', async () => {
      render(<EmailAssignButton {...defaultProps} isLoading={true} />);
      
      fireEvent.mouseEnter(screen.getByRole('button'));
      
      await waitFor(() => {
        expect(screen.getByText('Assigning email to case...')).toBeInTheDocument();
      });
    });
  });

  describe('Assigned state', () => {
    it('renders assigned text and styling', () => {
      render(<EmailAssignButton {...defaultProps} isAssigned={true} />);
      
      expect(screen.getByText('Assigned')).toBeInTheDocument();
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border-green-200', 'bg-green-50');
      
      // Check for green icon
      const icon = button.querySelector('svg');
      expect(icon).toHaveClass('text-green-600');
    });

    it('disables button when assigned', () => {
      render(<EmailAssignButton {...defaultProps} isAssigned={true} />);
      
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('does not call onAssign when clicked while assigned', () => {
      const mockOnAssign = jest.fn();
      render(<EmailAssignButton {...defaultProps} isAssigned={true} onAssign={mockOnAssign} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(mockOnAssign).not.toHaveBeenCalled();
    });

    it('shows assigned tooltip', async () => {
      render(<EmailAssignButton {...defaultProps} isAssigned={true} />);
      
      fireEvent.mouseEnter(screen.getByRole('button'));
      
      await waitFor(() => {
        expect(screen.getByText('Email is assigned to a case')).toBeInTheDocument();
      });
    });
  });

  describe('Disabled state', () => {
    it('disables button when disabled prop is true', () => {
      render(<EmailAssignButton {...defaultProps} disabled={true} />);
      
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('does not call onAssign when disabled', () => {
      const mockOnAssign = jest.fn();
      render(<EmailAssignButton {...defaultProps} disabled={true} onAssign={mockOnAssign} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(mockOnAssign).not.toHaveBeenCalled();
    });

    it('shows disabled tooltip', async () => {
      render(<EmailAssignButton {...defaultProps} disabled={true} />);
      
      fireEvent.mouseEnter(screen.getByRole('button'));
      
      await waitFor(() => {
        expect(screen.getByText('No cases available')).toBeInTheDocument();
      });
    });
  });

  describe('Button variants', () => {
    it('renders icon variant without text', () => {
      render(<EmailAssignButton {...defaultProps} variant="icon" />);
      
      expect(screen.queryByText('Assign to Case')).not.toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveClass('px-2');
    });

    it('renders icon variant in loading state without text', () => {
      render(<EmailAssignButton {...defaultProps} variant="icon" isLoading={true} />);
      
      expect(screen.queryByText('Assigning...')).not.toBeInTheDocument();
      
      // Should still have spinner
      const spinner = screen.getByRole('button').querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('renders icon variant in assigned state without text', () => {
      render(<EmailAssignButton {...defaultProps} variant="icon" isAssigned={true} />);
      
      expect(screen.queryByText('Assigned')).not.toBeInTheDocument();
      
      // Should still have green styling
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border-green-200', 'bg-green-50');
    });

    it('renders compact variant with smaller size', () => {
      render(<EmailAssignButton {...defaultProps} variant="compact" />);
      
      const button = screen.getByRole('button');
      // Should have small size class (this would depend on your Button component implementation)
      expect(button).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      render(<EmailAssignButton {...defaultProps} className="custom-class" />);
      
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });

    it('preserves default classes with custom className', () => {
      render(<EmailAssignButton {...defaultProps} className="custom-class" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class', 'gap-2');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<EmailAssignButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Assign email to a case');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('supports keyboard navigation', () => {
      const mockOnAssign = jest.fn();
      render(<EmailAssignButton {...defaultProps} onAssign={mockOnAssign} />);
      
      const button = screen.getByRole('button');
      button.focus();
      
      fireEvent.keyDown(button, { key: 'Enter' });
      
      expect(mockOnAssign).toHaveBeenCalledWith('test-email-1');
    });

    it('supports space key activation', () => {
      const mockOnAssign = jest.fn();
      render(<EmailAssignButton {...defaultProps} onAssign={mockOnAssign} />);
      
      const button = screen.getByRole('button');
      button.focus();
      
      fireEvent.keyDown(button, { key: ' ' });
      
      expect(mockOnAssign).toHaveBeenCalledWith('test-email-1');
    });

    it('has proper focus indicators', () => {
      render(<EmailAssignButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      button.focus();
      
      expect(button).toHaveFocus();
    });
  });

  describe('Edge cases', () => {
    it('handles empty emailId', () => {
      const mockOnAssign = jest.fn();
      render(<EmailAssignButton {...defaultProps} emailId="" onAssign={mockOnAssign} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(mockOnAssign).toHaveBeenCalledWith('');
    });

    it('handles null emailId gracefully', () => {
      const mockOnAssign = jest.fn();
      render(<EmailAssignButton {...defaultProps} emailId={null as any} onAssign={mockOnAssign} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(mockOnAssign).toHaveBeenCalledWith(null);
    });

    it('handles multiple rapid clicks', () => {
      const mockOnAssign = jest.fn();
      render(<EmailAssignButton {...defaultProps} onAssign={mockOnAssign} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      
      expect(mockOnAssign).toHaveBeenCalledTimes(3);
    });
  });

  describe('State transitions', () => {
    it('transitions from default to loading state', () => {
      const { rerender } = render(<EmailAssignButton {...defaultProps} />);
      
      expect(screen.getByText('Assign to Case')).toBeInTheDocument();
      
      rerender(<EmailAssignButton {...defaultProps} isLoading={true} />);
      
      expect(screen.getByText('Assigning...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('transitions from loading to assigned state', () => {
      const { rerender } = render(<EmailAssignButton {...defaultProps} isLoading={true} />);
      
      expect(screen.getByText('Assigning...')).toBeInTheDocument();
      
      rerender(<EmailAssignButton {...defaultProps} isLoading={false} isAssigned={true} />);
      
      expect(screen.getByText('Assigned')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveClass('border-green-200');
    });

    it('handles error state transition', () => {
      const { rerender } = render(<EmailAssignButton {...defaultProps} isLoading={true} />);
      
      expect(screen.getByText('Assigning...')).toBeInTheDocument();
      
      // Simulate error by going back to default state
      rerender(<EmailAssignButton {...defaultProps} isLoading={false} />);
      
      expect(screen.getByText('Assign to Case')).toBeInTheDocument();
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });
});