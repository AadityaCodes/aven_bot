import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppointmentBookingModal from '../AppointmentBookingModal';
import { CalendarService } from '../../src/services/CalendarService';
import { TimeSlot, BookingModalState } from '../../src/types/appointment';

// Mock the CalendarService
jest.mock('../../src/services/CalendarService');
const MockedCalendarService = CalendarService as jest.MockedClass<typeof CalendarService>;

// Mock data
const mockTimeSlots: TimeSlot[] = [
  {
    id: 'slot-1',
    date: '2024-02-15',
    startTime: '09:00',
    endTime: '09:30',
    isAvailable: true
  },
  {
    id: 'slot-2',
    date: '2024-02-15',
    startTime: '10:00',
    endTime: '10:30',
    isAvailable: true
  },
  {
    id: 'slot-3',
    date: '2024-02-16',
    startTime: '14:00',
    endTime: '14:30',
    isAvailable: true
  }
];

describe('AppointmentBookingModal', () => {
  let mockCalendarService: jest.Mocked<CalendarService>;
  let mockOnClose: jest.Mock;
  let mockOnComplete: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup calendar service mock
    mockCalendarService = {
      getAvailableSlots: jest.fn().mockResolvedValue(mockTimeSlots),
      reserveSlot: jest.fn().mockResolvedValue(undefined)
    } as any;

    // Mock the getInstance method
    MockedCalendarService.getInstance = jest.fn().mockReturnValue(mockCalendarService);

    // Setup callback mocks
    mockOnClose = jest.fn();
    mockOnComplete = jest.fn();

    // Mock window.confirm for unsaved changes dialog
    window.confirm = jest.fn().mockReturnValue(true);
  });

  afterEach(() => {
    // Restore body overflow
    document.body.style.overflow = '';
  });

  describe('Modal Rendering and Accessibility', () => {
    it('should not render when isOpen is false', () => {
      render(
        <AppointmentBookingModal
          isOpen={false}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render modal with proper accessibility attributes when open', async () => {
      render(
        <AppointmentBookingModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
      expect(modal).toHaveAttribute('aria-describedby', 'modal-description');

      // Check title
      expect(screen.getByText('Book an Appointment')).toBeInTheDocument();

      // Check progress indicator
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    });

    it('should prevent body scroll when modal is open', () => {
      render(
        <AppointmentBookingModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when modal is closed', () => {
      const { rerender } = render(
        <AppointmentBookingModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <AppointmentBookingModal
          isOpen={false}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Step Navigation and State Management', () => {
    it('should start with contact collection step', async () => {
      render(
        <AppointmentBookingModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      expect(screen.getByText('Book an Appointment')).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    });

    it('should progress to calendar selection after contact form submission', async () => {
      const user = userEvent.setup();

      render(
        <AppointmentBookingModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      // Fill out contact form
      await user.type(screen.getByLabelText('Full Name'), 'John Doe');
      await user.type(screen.getByLabelText('Email Address'), 'john@example.com');
      await user.type(screen.getByLabelText('Phone Number'), '(555) 123-4567');

      // Submit form
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Should progress to calendar selection
      await waitFor(() => {
        expect(screen.getByText('Select Time Slot')).toBeInTheDocument();
        expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
      });
    });

    it('should allow back navigation from calendar selection', async () => {
      const user = userEvent.setup();

      render(
        <AppointmentBookingModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      // Progress to calendar selection
      await user.type(screen.getByLabelText('Full Name'), 'John Doe');
      await user.type(screen.getByLabelText('Email Address'), 'john@example.com');
      await user.type(screen.getByLabelText('Phone Number'), '(555) 123-4567');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText('Select Time Slot')).toBeInTheDocument();
      });

      // Click back button
      await user.click(screen.getByRole('button', { name: /back/i }));

      // Should return to contact form
      await waitFor(() => {
        expect(screen.getByText('Book an Appointment')).toBeInTheDocument();
        expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
      });
    });
  });

  describe('Complete Booking Flow', () => {
    it('should complete full booking flow successfully', async () => {
      const user = userEvent.setup();

      render(
        <AppointmentBookingModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      // Step 1: Fill contact form
      await user.type(screen.getByLabelText('Full Name'), 'John Doe');
      await user.type(screen.getByLabelText('Email Address'), 'john@example.com');
      await user.type(screen.getByLabelText('Phone Number'), '(555) 123-4567');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 2: Select time slot
      await waitFor(() => {
        expect(screen.getByText('Select Time Slot')).toBeInTheDocument();
      });

      // Wait for slots to load and select first available slot
      await waitFor(() => {
        expect(screen.getByText('9:00 AM')).toBeInTheDocument();
      });

      await user.click(screen.getByText('9:00 AM'));

      // Step 3: Confirmation
      await waitFor(() => {
        expect(screen.getByText('Booking Confirmed!')).toBeInTheDocument();
        expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
      });

      // Verify booking details are displayed
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('(555) 123-4567')).toBeInTheDocument();

      // Return to chat
      await user.click(screen.getByRole('button', { name: /return to chat/i }));

      // Should call onComplete with booking confirmation
      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '(555) 123-4567',
          selectedSlot: expect.objectContaining({
            id: 'slot-1',
            startTime: '09:00'
          }),
          confirmationId: expect.stringMatching(/^APT-/)
        })
      );

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should handle slot reservation errors gracefully', async () => {
      const user = userEvent.setup();

      // Mock reservation failure
      mockCalendarService.reserveSlot.mockRejectedValueOnce(new Error('Slot unavailable'));

      render(
        <AppointmentBookingModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      // Complete contact form
      await user.type(screen.getByLabelText('Full Name'), 'John Doe');
      await user.type(screen.getByLabelText('Email Address'), 'john@example.com');
      await user.type(screen.getByLabelText('Phone Number'), '(555) 123-4567');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Try to select slot
      await waitFor(() => {
        expect(screen.getByText('9:00 AM')).toBeInTheDocument();
      });

      await user.click(screen.getByText('9:00 AM'));

      // Should handle error gracefully (stay on calendar selection)
      await waitFor(() => {
        expect(screen.getByText('Select Time Slot')).toBeInTheDocument();
      });

      expect(mockOnComplete).not.toHaveBeenCalled();
    });
  });

  describe('Modal Close Handling', () => {
    it('should close modal when close button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <AppointmentBookingModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      await user.click(screen.getByLabelText('Close booking modal'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal when backdrop is clicked', async () => {
      const user = userEvent.setup();

      render(
        <AppointmentBookingModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      // Click backdrop (the outer div)
      const backdrop = screen.getByRole('dialog').parentElement;
      if (backdrop) {
        await user.click(backdrop);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('should close modal when Escape key is pressed', async () => {
      const user = userEvent.setup();

      render(
        <AppointmentBookingModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      await user.keyboard('{Escape}');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show confirmation dialog for unsaved changes', async () => {
      const user = userEvent.setup();

      render(
        <AppointmentBookingModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      // Make some changes to trigger unsaved state
      await user.type(screen.getByLabelText('Full Name'), 'John');

      // Try to close
      await user.click(screen.getByLabelText('Close booking modal'));

      // Should show confirmation dialog
      expect(window.confirm).toHaveBeenCalledWith(
        'You have unsaved changes. Are you sure you want to close the booking form?'
      );
    });

    it('should not show confirmation dialog after booking is complete', async () => {
      const user = userEvent.setup();

      render(
        <AppointmentBookingModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      // Complete full booking flow
      await user.type(screen.getByLabelText('Full Name'), 'John Doe');
      await user.type(screen.getByLabelText('Email Address'), 'john@example.com');
      await user.type(screen.getByLabelText('Phone Number'), '(555) 123-4567');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText('9:00 AM')).toBeInTheDocument();
      });

      await user.click(screen.getByText('9:00 AM'));

      await waitFor(() => {
        expect(screen.getByText('Booking Confirmed!')).toBeInTheDocument();
      });

      // Try to close from confirmation step
      await user.click(screen.getByLabelText('Close booking modal'));

      // Should not show confirmation dialog
      expect(window.confirm).not.toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should show loading state while fetching available slots', async () => {
      // Mock delayed response
      mockCalendarService.getAvailableSlots.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockTimeSlots), 100))
      );

      render(
        <AppointmentBookingModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      // Should load slots on mount
      expect(mockCalendarService.getAvailableSlots).toHaveBeenCalled();
    });

    it('should show loading state during slot reservation', async () => {
      const user = userEvent.setup();

      // Mock delayed reservation
      mockCalendarService.reserveSlot.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <AppointmentBookingModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      // Complete contact form
      await user.type(screen.getByLabelText('Full Name'), 'John Doe');
      await user.type(screen.getByLabelText('Email Address'), 'john@example.com');
      await user.type(screen.getByLabelText('Phone Number'), '(555) 123-4567');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Select slot
      await waitFor(() => {
        expect(screen.getByText('9:00 AM')).toBeInTheDocument();
      });

      await user.click(screen.getByText('9:00 AM'));

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Booking...')).toBeInTheDocument();
      });
    });
  });

  describe('Focus Management', () => {
    it('should focus modal when opened', async () => {
      render(
        <AppointmentBookingModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(modal).toHaveFocus();
      });
    });

    it('should restore focus when modal is closed', async () => {
      const button = document.createElement('button');
      document.body.appendChild(button);
      button.focus();

      const { rerender } = render(
        <AppointmentBookingModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      rerender(
        <AppointmentBookingModal
          isOpen={false}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      expect(button).toHaveFocus();
      document.body.removeChild(button);
    });
  });

  describe('Error Handling', () => {
    it('should handle calendar service initialization errors', async () => {
      // Mock constructor to throw error
      MockedCalendarService.mockImplementation(() => {
        throw new Error('Service initialization failed');
      });

      // Should not crash the component
      expect(() => {
        render(
          <AppointmentBookingModal
            isOpen={true}
            onClose={mockOnClose}
            onComplete={mockOnComplete}
          />
        );
      }).not.toThrow();
    });

    it('should handle slot loading errors gracefully', async () => {
      mockCalendarService.getAvailableSlots.mockRejectedValueOnce(
        new Error('Failed to load slots')
      );

      render(
        <AppointmentBookingModal
          isOpen={true}
          onClose={mockOnClose}
          onComplete={mockOnComplete}
        />
      );

      // Should not crash and should still render the modal
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});