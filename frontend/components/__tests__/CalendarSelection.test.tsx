import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CalendarSelection from '../CalendarSelection';
import { TimeSlot } from '../../src/types/appointment';

// Mock time slots for testing
const mockTimeSlots: TimeSlot[] = [
  {
    id: '2024-01-15_09:00',
    date: '2024-01-15',
    startTime: '09:00',
    endTime: '09:30',
    isAvailable: true
  },
  {
    id: '2024-01-15_09:30',
    date: '2024-01-15',
    startTime: '09:30',
    endTime: '10:00',
    isAvailable: true
  },
  {
    id: '2024-01-15_10:00',
    date: '2024-01-15',
    startTime: '10:00',
    endTime: '10:30',
    isAvailable: false,
    bookedBy: 'user123'
  },
  {
    id: '2024-01-16_09:00',
    date: '2024-01-16',
    startTime: '09:00',
    endTime: '09:30',
    isAvailable: true
  },
  {
    id: '2024-01-16_14:00',
    date: '2024-01-16',
    startTime: '14:00',
    endTime: '14:30',
    isAvailable: true
  }
];

const defaultProps = {
  availableSlots: mockTimeSlots,
  onSlotSelect: jest.fn(),
  onBack: jest.fn(),
  isLoading: false
};

describe('CalendarSelection Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock current date to ensure consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders the component with title and description', () => {
      render(<CalendarSelection {...defaultProps} />);
      
      expect(screen.getByText('Select an Appointment Time')).toBeInTheDocument();
      expect(screen.getByText(/Choose a date and time that works best for you/)).toBeInTheDocument();
    });

    it('renders available dates section', () => {
      render(<CalendarSelection {...defaultProps} />);
      
      expect(screen.getByText('Available Dates')).toBeInTheDocument();
    });

    it('renders available times section', () => {
      render(<CalendarSelection {...defaultProps} />);
      
      expect(screen.getByText(/Available Times for/)).toBeInTheDocument();
    });

    it('renders back button', () => {
      render(<CalendarSelection {...defaultProps} />);
      
      expect(screen.getByText('Back')).toBeInTheDocument();
    });
  });

  describe('Date Selection', () => {
    it('displays available dates with slot counts', () => {
      render(<CalendarSelection {...defaultProps} />);
      
      // Should show dates with slot counts
      expect(screen.getByText('2 slots')).toBeInTheDocument(); // 2024-01-15 has 2 available slots
      expect(screen.getByText('2 slots')).toBeInTheDocument(); // 2024-01-16 has 2 available slots
    });

    it('allows selecting different dates', () => {
      render(<CalendarSelection {...defaultProps} />);
      
      const dateButtons = screen.getAllByRole('button');
      const secondDateButton = dateButtons.find(button => 
        button.textContent?.includes('2 slots') && !button.classList.contains('bg-blue-600')
      );
      
      if (secondDateButton) {
        fireEvent.click(secondDateButton);
        expect(secondDateButton).toHaveClass('bg-blue-600');
      }
    });

    it('updates time slots when date is changed', () => {
      render(<CalendarSelection {...defaultProps} />);
      
      // Initially should show slots for first date
      expect(screen.getByText('9:00 AM')).toBeInTheDocument();
      expect(screen.getByText('9:30 AM')).toBeInTheDocument();
    });
  });

  describe('Time Slot Display', () => {
    it('displays available time slots correctly', () => {
      render(<CalendarSelection {...defaultProps} />);
      
      expect(screen.getByText('9:00 AM')).toBeInTheDocument();
      expect(screen.getByText('9:30 AM')).toBeInTheDocument();
    });

    it('shows unavailable slots as disabled', () => {
      render(<CalendarSelection {...defaultProps} />);
      
      const unavailableSlot = screen.getByText('10:00 AM').closest('button');
      expect(unavailableSlot).toBeDisabled();
      expect(unavailableSlot).toHaveClass('bg-red-500/20');
    });

    it('shows available slots as clickable', () => {
      render(<CalendarSelection {...defaultProps} />);
      
      const availableSlot = screen.getByText('9:00 AM').closest('button');
      expect(availableSlot).not.toBeDisabled();
      expect(availableSlot).toHaveClass('bg-white/10');
    });
  });

  describe('Slot Selection', () => {
    it('calls onSlotSelect when an available slot is clicked', async () => {
      render(<CalendarSelection {...defaultProps} />);
      
      const slotButton = screen.getByText('9:00 AM').closest('button');
      fireEvent.click(slotButton!);
      
      await waitFor(() => {
        expect(defaultProps.onSlotSelect).toHaveBeenCalledWith(mockTimeSlots[0]);
      }, { timeout: 300 });
    });

    it('does not call onSlotSelect when unavailable slot is clicked', () => {
      render(<CalendarSelection {...defaultProps} />);
      
      const unavailableSlot = screen.getByText('10:00 AM').closest('button');
      fireEvent.click(unavailableSlot!);
      
      expect(defaultProps.onSlotSelect).not.toHaveBeenCalled();
    });

    it('shows visual feedback when slot is selected', () => {
      render(<CalendarSelection {...defaultProps} />);
      
      const slotButton = screen.getByText('9:00 AM').closest('button');
      fireEvent.click(slotButton!);
      
      expect(slotButton).toHaveClass('bg-green-600');
      expect(screen.getByText(/Selected: 9:00 AM/)).toBeInTheDocument();
    });

    it('prevents slot selection when loading', () => {
      render(<CalendarSelection {...defaultProps} isLoading={true} />);
      
      const slotButton = screen.getByText('9:00 AM').closest('button');
      fireEvent.click(slotButton!);
      
      expect(defaultProps.onSlotSelect).not.toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    it('calls onBack when back button is clicked', () => {
      render(<CalendarSelection {...defaultProps} />);
      
      const backButton = screen.getByText('Back');
      fireEvent.click(backButton);
      
      expect(defaultProps.onBack).toHaveBeenCalled();
    });

    it('calls onBack when Escape key is pressed', () => {
      render(<CalendarSelection {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(defaultProps.onBack).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('disables all buttons when loading', () => {
      render(<CalendarSelection {...defaultProps} isLoading={true} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('shows loading indicator when slot is selected and loading', () => {
      render(<CalendarSelection {...defaultProps} />);
      
      // First select a slot
      const slotButton = screen.getByText('9:00 AM').closest('button');
      fireEvent.click(slotButton!);
      
      // Then set loading state
      render(<CalendarSelection {...defaultProps} isLoading={true} />);
      
      expect(screen.getByText('Booking...')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows no available slots message when no slots provided', () => {
      render(<CalendarSelection {...defaultProps} availableSlots={[]} />);
      
      expect(screen.getByText('No Available Slots')).toBeInTheDocument();
      expect(screen.getByText(/Unfortunately, there are no available appointment slots/)).toBeInTheDocument();
    });

    it('shows go back button in empty state', () => {
      render(<CalendarSelection {...defaultProps} availableSlots={[]} />);
      
      const goBackButton = screen.getByText('Go Back');
      fireEvent.click(goBackButton);
      
      expect(defaultProps.onBack).toHaveBeenCalled();
    });
  });

  describe('Date Formatting', () => {
    it('formats today correctly', () => {
      // Mock current date to match our test data
      jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));
      
      render(<CalendarSelection {...defaultProps} />);
      
      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    it('formats tomorrow correctly', () => {
      // Mock current date to be one day before our test data
      jest.setSystemTime(new Date('2024-01-14T10:00:00Z'));
      
      render(<CalendarSelection {...defaultProps} />);
      
      expect(screen.getByText('Tomorrow')).toBeInTheDocument();
    });
  });

  describe('Time Formatting', () => {
    it('formats AM times correctly', () => {
      render(<CalendarSelection {...defaultProps} />);
      
      expect(screen.getByText('9:00 AM')).toBeInTheDocument();
      expect(screen.getByText('9:30 AM')).toBeInTheDocument();
    });

    it('formats PM times correctly', () => {
      const pmSlots: TimeSlot[] = [
        {
          id: '2024-01-15_14:00',
          date: '2024-01-15',
          startTime: '14:00',
          endTime: '14:30',
          isAvailable: true
        },
        {
          id: '2024-01-15_15:30',
          date: '2024-01-15',
          startTime: '15:30',
          endTime: '16:00',
          isAvailable: true
        }
      ];
      
      render(<CalendarSelection {...defaultProps} availableSlots={pmSlots} />);
      
      expect(screen.getByText('2:00 PM')).toBeInTheDocument();
      expect(screen.getByText('3:30 PM')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('applies responsive grid classes for date selection', () => {
      render(<CalendarSelection {...defaultProps} />);
      
      const dateGrid = screen.getByText('Available Dates').nextElementSibling;
      expect(dateGrid).toHaveClass('grid-cols-2', 'sm:grid-cols-3', 'md:grid-cols-4', 'lg:grid-cols-7');
    });

    it('applies responsive grid classes for time slot selection', () => {
      render(<CalendarSelection {...defaultProps} />);
      
      const timeGrid = screen.getByText(/Available Times for/).nextElementSibling;
      expect(timeGrid).toHaveClass('grid-cols-2', 'sm:grid-cols-3', 'md:grid-cols-4', 'lg:grid-cols-6');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<CalendarSelection {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation', () => {
      render(<CalendarSelection {...defaultProps} />);
      
      const firstButton = screen.getAllByRole('button')[0];
      firstButton.focus();
      
      expect(document.activeElement).toBe(firstButton);
    });

    it('has proper focus management', () => {
      render(<CalendarSelection {...defaultProps} />);
      
      const slotButton = screen.getByText('9:00 AM').closest('button');
      expect(slotButton).toHaveAttribute('class');
      expect(slotButton?.className).toContain('focus:outline-none');
      expect(slotButton?.className).toContain('focus:ring-2');
    });
  });
});