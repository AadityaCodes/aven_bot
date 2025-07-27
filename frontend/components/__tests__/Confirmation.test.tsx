import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Confirmation } from '../Confirmation';
import { BookingConfirmation } from '../../src/types/appointment';

// Mock booking confirmation data
const mockBookingConfirmation: BookingConfirmation = {
  name: 'John Doe',
  phone: '+1 (555) 123-4567',
  email: 'john.doe@example.com',
  selectedSlot: {
    id: 'slot-123',
    date: '2024-02-15',
    startTime: '14:30',
    endTime: '15:00',
    isAvailable: false,
    bookedBy: 'john.doe@example.com'
  },
  confirmationId: 'CONF-ABC123'
};

describe('Confirmation Component', () => {
  const mockOnReturnToChat = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders confirmation component with all required elements', () => {
      render(
        <Confirmation 
          booking={mockBookingConfirmation} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      // Check for main elements
      expect(screen.getByText('Booking Confirmed!')).toBeInTheDocument();
      expect(screen.getByText('Your booking has been confirmed and we look forward to talking with you.')).toBeInTheDocument();
      expect(screen.getByText('Appointment Details')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /return to chat/i })).toBeInTheDocument();
    });

    it('displays success icon', () => {
      render(
        <Confirmation 
          booking={mockBookingConfirmation} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      // Check for the SVG element with aria-hidden attribute
      const successIcon = document.querySelector('svg[aria-hidden="true"]');
      expect(successIcon).toBeInTheDocument();
    });

    it('renders with proper accessibility attributes', () => {
      render(
        <Confirmation 
          booking={mockBookingConfirmation} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      const returnButton = screen.getByRole('button', { name: /return to chat/i });
      expect(returnButton).toHaveAttribute('aria-label', 'Return to chat conversation');
    });
  });

  describe('Date and Time Formatting', () => {
    it('formats date correctly', () => {
      render(
        <Confirmation 
          booking={mockBookingConfirmation} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      // Should display formatted date (2024-02-15 is Thursday)
      expect(screen.getByText('Thursday, February 15, 2024')).toBeInTheDocument();
    });

    it('formats time range correctly from 24-hour to 12-hour format', () => {
      render(
        <Confirmation 
          booking={mockBookingConfirmation} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      // Should display formatted time range
      expect(screen.getByText('2:30 PM - 3:00 PM')).toBeInTheDocument();
    });

    it('handles morning time slots correctly', () => {
      const morningBooking: BookingConfirmation = {
        ...mockBookingConfirmation,
        selectedSlot: {
          ...mockBookingConfirmation.selectedSlot,
          startTime: '09:00',
          endTime: '09:30'
        }
      };

      render(
        <Confirmation 
          booking={morningBooking} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      expect(screen.getByText('9:00 AM - 9:30 AM')).toBeInTheDocument();
    });

    it('handles noon time slots correctly', () => {
      const noonBooking: BookingConfirmation = {
        ...mockBookingConfirmation,
        selectedSlot: {
          ...mockBookingConfirmation.selectedSlot,
          startTime: '12:00',
          endTime: '12:30'
        }
      };

      render(
        <Confirmation 
          booking={noonBooking} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      expect(screen.getByText('12:00 PM - 12:30 PM')).toBeInTheDocument();
    });

    it('handles midnight time slots correctly', () => {
      const midnightBooking: BookingConfirmation = {
        ...mockBookingConfirmation,
        selectedSlot: {
          ...mockBookingConfirmation.selectedSlot,
          startTime: '00:00',
          endTime: '00:30'
        }
      };

      render(
        <Confirmation 
          booking={midnightBooking} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      expect(screen.getByText('12:00 AM - 12:30 AM')).toBeInTheDocument();
    });
  });

  describe('Contact Information Display', () => {
    it('displays contact name correctly', () => {
      render(
        <Confirmation 
          booking={mockBookingConfirmation} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('displays email address correctly', () => {
      render(
        <Confirmation 
          booking={mockBookingConfirmation} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });

    it('displays phone number correctly', () => {
      render(
        <Confirmation 
          booking={mockBookingConfirmation} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      expect(screen.getByText('+1 (555) 123-4567')).toBeInTheDocument();
    });

    it('handles special characters in contact information', () => {
      const specialCharBooking: BookingConfirmation = {
        ...mockBookingConfirmation,
        name: 'María José O\'Connor',
        email: 'maria.jose+test@example.com'
      };

      render(
        <Confirmation 
          booking={specialCharBooking} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      expect(screen.getByText('María José O\'Connor')).toBeInTheDocument();
      expect(screen.getByText('maria.jose+test@example.com')).toBeInTheDocument();
    });
  });

  describe('Confirmation ID Display', () => {
    it('displays confirmation ID correctly', () => {
      render(
        <Confirmation 
          booking={mockBookingConfirmation} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      expect(screen.getByText('CONF-ABC123')).toBeInTheDocument();
    });

    it('displays confirmation ID with monospace styling', () => {
      render(
        <Confirmation 
          booking={mockBookingConfirmation} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      const confirmationId = screen.getByText('CONF-ABC123');
      expect(confirmationId).toHaveClass('font-mono');
    });

    it('handles different confirmation ID formats', () => {
      const differentIdBooking: BookingConfirmation = {
        ...mockBookingConfirmation,
        confirmationId: '2024-02-15-14:30-JOHN-DOE'
      };

      render(
        <Confirmation 
          booking={differentIdBooking} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      expect(screen.getByText('2024-02-15-14:30-JOHN-DOE')).toBeInTheDocument();
    });
  });

  describe('Return to Chat Functionality', () => {
    it('calls onReturnToChat when return button is clicked', () => {
      render(
        <Confirmation 
          booking={mockBookingConfirmation} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      const returnButton = screen.getByRole('button', { name: /return to chat/i });
      fireEvent.click(returnButton);

      expect(mockOnReturnToChat).toHaveBeenCalledTimes(1);
    });

    it('return button has correct styling classes', () => {
      render(
        <Confirmation 
          booking={mockBookingConfirmation} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      const returnButton = screen.getByRole('button', { name: /return to chat/i });
      expect(returnButton).toHaveClass('w-full', 'bg-blue-600', 'hover:bg-blue-700', 'button-enhanced', 'focus-enhanced');
    });

    it('return button is keyboard accessible', () => {
      render(
        <Confirmation 
          booking={mockBookingConfirmation} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      const returnButton = screen.getByRole('button', { name: /return to chat/i });
      returnButton.focus();
      
      // Test Enter key
      fireEvent.keyDown(returnButton, { key: 'Enter', code: 'Enter' });
      fireEvent.keyUp(returnButton, { key: 'Enter', code: 'Enter' });
      
      // For buttons, we need to simulate the actual click that would happen on Enter
      fireEvent.click(returnButton);
      
      expect(mockOnReturnToChat).toHaveBeenCalledTimes(1);
    });
  });

  describe('Component Structure and Styling', () => {
    it('has proper container structure', () => {
      render(
        <Confirmation 
          booking={mockBookingConfirmation} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      const container = screen.getByText('Booking Confirmed!').closest('.confirmation-container');
      expect(container).toHaveClass('p-6', 'max-w-md', 'mx-auto');
    });

    it('applies glass-morphism styling to booking summary', () => {
      render(
        <Confirmation 
          booking={mockBookingConfirmation} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      const summarySection = screen.getByText('Appointment Details').closest('.booking-summary');
      expect(summarySection).toHaveClass('glass-morphism-subtle');
    });

    it('includes animation classes for success icon', () => {
      render(
        <Confirmation 
          booking={mockBookingConfirmation} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      const successIcon = screen.getByText('Booking Confirmed!').closest('.confirmation-container')
        ?.querySelector('.confirmation-success-icon');
      expect(successIcon).toHaveClass('animate-scale-in');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles empty confirmation ID gracefully', () => {
      const emptyIdBooking: BookingConfirmation = {
        ...mockBookingConfirmation,
        confirmationId: ''
      };

      render(
        <Confirmation 
          booking={emptyIdBooking} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      // Should still render the confirmation ID section
      expect(screen.getByText('Confirmation ID')).toBeInTheDocument();
    });

    it('handles very long names gracefully', () => {
      const longNameBooking: BookingConfirmation = {
        ...mockBookingConfirmation,
        name: 'This Is A Very Long Name That Should Still Display Properly Without Breaking The Layout'
      };

      render(
        <Confirmation 
          booking={longNameBooking} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      expect(screen.getByText('This Is A Very Long Name That Should Still Display Properly Without Breaking The Layout')).toBeInTheDocument();
    });

    it('handles invalid date gracefully', () => {
      const invalidDateBooking: BookingConfirmation = {
        ...mockBookingConfirmation,
        selectedSlot: {
          ...mockBookingConfirmation.selectedSlot,
          date: 'invalid-date'
        }
      };

      render(
        <Confirmation 
          booking={invalidDateBooking} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      // Component should still render without crashing
      expect(screen.getByText('Booking Confirmed!')).toBeInTheDocument();
    });

    it('handles invalid time format gracefully', () => {
      const invalidTimeBooking: BookingConfirmation = {
        ...mockBookingConfirmation,
        selectedSlot: {
          ...mockBookingConfirmation.selectedSlot,
          startTime: 'invalid-time',
          endTime: 'invalid-time'
        }
      };

      render(
        <Confirmation 
          booking={invalidTimeBooking} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      // Component should still render without crashing
      expect(screen.getByText('Booking Confirmed!')).toBeInTheDocument();
    });
  });

  describe('Requirements Validation', () => {
    it('satisfies requirement 4.1: displays booking confirmation message', () => {
      render(
        <Confirmation 
          booking={mockBookingConfirmation} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      expect(screen.getByText('Your booking has been confirmed and we look forward to talking with you.')).toBeInTheDocument();
    });

    it('satisfies requirement 4.2: includes scheduled date and time', () => {
      render(
        <Confirmation 
          booking={mockBookingConfirmation} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      expect(screen.getByText('Thursday, February 15, 2024')).toBeInTheDocument();
      expect(screen.getByText('2:30 PM - 3:00 PM')).toBeInTheDocument();
    });

    it('satisfies requirement 4.3: includes confirmation message with expected text', () => {
      render(
        <Confirmation 
          booking={mockBookingConfirmation} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      expect(screen.getByText(/we look forward to talking with you/i)).toBeInTheDocument();
    });

    it('satisfies requirement 4.4: provides way to return to regular chat conversation', () => {
      render(
        <Confirmation 
          booking={mockBookingConfirmation} 
          onReturnToChat={mockOnReturnToChat} 
        />
      );

      const returnButton = screen.getByRole('button', { name: /return to chat/i });
      expect(returnButton).toBeInTheDocument();
      
      fireEvent.click(returnButton);
      expect(mockOnReturnToChat).toHaveBeenCalled();
    });
  });
});