import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import ChatInterface from '../ChatInterface';
import { intentDetectionService } from '../../src/services/IntentDetectionService';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the intent detection service
jest.mock('../../src/services/IntentDetectionService', () => ({
  intentDetectionService: {
    detectBookingIntent: jest.fn(),
    getConfidenceScore: jest.fn(),
    analyzeIntent: jest.fn()
  }
}));

// Mock the AppointmentBookingModal component
jest.mock('../AppointmentBookingModal', () => {
  return function MockAppointmentBookingModal({ 
    isOpen, 
    onClose, 
    onComplete 
  }: { 
    isOpen: boolean; 
    onClose: () => void; 
    onComplete: (booking: any) => void; 
  }) {
    if (!isOpen) return null;
    
    return (
      <div data-testid="appointment-booking-modal">
        <h2>Appointment Booking Modal</h2>
        <button onClick={onClose} data-testid="modal-close">Close</button>
        <button 
          onClick={() => onComplete({
            name: 'John Doe',
            phone: '555-0123',
            email: 'john@example.com',
            selectedSlot: {
              id: 'slot-1',
              date: '2024-01-15',
              startTime: '10:00',
              endTime: '10:30',
              isAvailable: true
            },
            confirmationId: 'APT-123456'
          })}
          data-testid="complete-booking"
        >
          Complete Booking
        </button>
      </div>
    );
  };
});

// Mock VoiceAssistant component
jest.mock('../VoiceAssistant', () => {
  return function MockVoiceAssistant() {
    return <div data-testid="voice-assistant">Voice Assistant</div>;
  };
});

// Mock environment variables
process.env.NEXT_PUBLIC_FLASK_API_URL = 'http://localhost:5000';

// Mock scrollIntoView
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  value: jest.fn(),
  writable: true
});

describe('ChatInterface Intent Detection Integration', () => {
  const mockIntentDetectionService = intentDetectionService as jest.Mocked<typeof intentDetectionService>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock responses
    mockedAxios.post.mockResolvedValue({
      data: { response: 'This is a test response' }
    });
    
    mockIntentDetectionService.detectBookingIntent.mockReturnValue(false);
    mockIntentDetectionService.getConfidenceScore.mockReturnValue(0.0);
  });

  describe('Intent Detection in Message Handling', () => {
    it('should detect booking intent and trigger modal for "book an appointment"', async () => {
      const user = userEvent.setup();
      mockIntentDetectionService.detectBookingIntent.mockReturnValue(true);
      
      render(<ChatInterface />);
      
      const input = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByText('Send');
      
      await user.type(input, 'I want to book an appointment');
      await user.click(sendButton);
      
      // Verify intent detection was called
      expect(mockIntentDetectionService.detectBookingIntent).toHaveBeenCalledWith('I want to book an appointment');
      
      // Verify modal is opened
      await waitFor(() => {
        expect(screen.getByTestId('appointment-booking-modal')).toBeInTheDocument();
      });
      
      // Verify booking mode is activated
      expect(screen.getByText('Booking Mode Active')).toBeInTheDocument();
      expect(screen.getByText('📅')).toBeInTheDocument();
      
      // Verify normal API call was not made
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should detect booking intent and trigger modal for "talk to an agent"', async () => {
      const user = userEvent.setup();
      mockIntentDetectionService.detectBookingIntent.mockReturnValue(true);
      
      render(<ChatInterface />);
      
      const input = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByText('Send');
      
      await user.type(input, 'I want to talk to an agent');
      await user.click(sendButton);
      
      expect(mockIntentDetectionService.detectBookingIntent).toHaveBeenCalledWith('I want to talk to an agent');
      
      await waitFor(() => {
        expect(screen.getByTestId('appointment-booking-modal')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Booking Mode Active')).toBeInTheDocument();
    });

    it('should detect booking intent and trigger modal for "schedule a call"', async () => {
      const user = userEvent.setup();
      mockIntentDetectionService.detectBookingIntent.mockReturnValue(true);
      
      render(<ChatInterface />);
      
      const input = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByText('Send');
      
      await user.type(input, 'Can I schedule a call?');
      await user.click(sendButton);
      
      expect(mockIntentDetectionService.detectBookingIntent).toHaveBeenCalledWith('Can I schedule a call?');
      
      await waitFor(() => {
        expect(screen.getByTestId('appointment-booking-modal')).toBeInTheDocument();
      });
    });

    it('should not trigger booking modal for regular messages', async () => {
      const user = userEvent.setup();
      mockIntentDetectionService.detectBookingIntent.mockReturnValue(false);
      
      render(<ChatInterface />);
      
      const input = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByText('Send');
      
      await user.type(input, 'What is the weather today?');
      await user.click(sendButton);
      
      expect(mockIntentDetectionService.detectBookingIntent).toHaveBeenCalledWith('What is the weather today?');
      
      // Verify modal is not opened
      expect(screen.queryByTestId('appointment-booking-modal')).not.toBeInTheDocument();
      
      // Verify normal API call was made
      expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:5000', {
        prompt: 'What is the weather today?',
        user_id: 'user-id'
      });
      
      // Wait for response to complete and loading to finish
      await waitFor(() => {
        expect(screen.getByText('This is a test response')).toBeInTheDocument();
      });
      
      // Verify booking mode is not activated
      expect(screen.queryByText('Booking Mode Active')).not.toBeInTheDocument();
      expect(screen.getByText('Your AI Assistant')).toBeInTheDocument();
    });
  });

  describe('Chat State Preservation During Booking Flow', () => {
    it('should preserve chat messages when booking modal is opened', async () => {
      const user = userEvent.setup();
      
      render(<ChatInterface />);
      
      const input = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByText('Send');
      
      // Send a regular message first
      mockIntentDetectionService.detectBookingIntent.mockReturnValue(false);
      await user.type(input, 'Hello, how are you?');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
      });
      
      // Now send a booking intent message
      mockIntentDetectionService.detectBookingIntent.mockReturnValue(true);
      await user.type(input, 'I want to book an appointment');
      await user.click(sendButton);
      
      // Verify both messages are still visible
      expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
      expect(screen.getByText('I want to book an appointment')).toBeInTheDocument();
      
      // Verify modal is opened
      await waitFor(() => {
        expect(screen.getByTestId('appointment-booking-modal')).toBeInTheDocument();
      });
    });

    it('should preserve chat context after booking completion', async () => {
      const user = userEvent.setup();
      mockIntentDetectionService.detectBookingIntent.mockReturnValue(true);
      
      render(<ChatInterface />);
      
      const input = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByText('Send');
      
      // Send booking intent message
      await user.type(input, 'I want to book an appointment');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('appointment-booking-modal')).toBeInTheDocument();
      });
      
      // Complete the booking
      const completeButton = screen.getByTestId('complete-booking');
      await user.click(completeButton);
      
      // Verify modal is closed
      await waitFor(() => {
        expect(screen.queryByTestId('appointment-booking-modal')).not.toBeInTheDocument();
      });
      
      // Verify booking mode is deactivated
      expect(screen.queryByText('Booking Mode Active')).not.toBeInTheDocument();
      expect(screen.getByText('Your AI Assistant')).toBeInTheDocument();
      
      // Verify original message is still there
      expect(screen.getByText('I want to book an appointment')).toBeInTheDocument();
      
      // Verify confirmation message was added
      expect(screen.getByText(/Great! Your appointment has been booked for/)).toBeInTheDocument();
      expect(screen.getByText(/Confirmation ID: APT-123456/)).toBeInTheDocument();
    });

    it('should preserve chat context after booking cancellation', async () => {
      const user = userEvent.setup();
      mockIntentDetectionService.detectBookingIntent.mockReturnValue(true);
      
      render(<ChatInterface />);
      
      const input = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByText('Send');
      
      // Send booking intent message
      await user.type(input, 'I want to book an appointment');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('appointment-booking-modal')).toBeInTheDocument();
      });
      
      // Close the modal (cancel booking)
      const closeButton = screen.getByTestId('modal-close');
      await user.click(closeButton);
      
      // Verify modal is closed
      await waitFor(() => {
        expect(screen.queryByTestId('appointment-booking-modal')).not.toBeInTheDocument();
      });
      
      // Verify booking mode is deactivated
      expect(screen.queryByText('Booking Mode Active')).not.toBeInTheDocument();
      expect(screen.getByText('Your AI Assistant')).toBeInTheDocument();
      
      // Verify original message is still there
      expect(screen.getByText('I want to book an appointment')).toBeInTheDocument();
      
      // Verify no confirmation message was added
      expect(screen.queryByText(/Great! Your appointment has been booked/)).not.toBeInTheDocument();
    });
  });

  describe('Visual Indicators for Booking Mode', () => {
    it('should show booking mode indicators when modal is open', async () => {
      const user = userEvent.setup();
      mockIntentDetectionService.detectBookingIntent.mockReturnValue(true);
      
      render(<ChatInterface />);
      
      const input = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByText('Send');
      
      await user.type(input, 'I want to book an appointment');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('appointment-booking-modal')).toBeInTheDocument();
      });
      
      // Verify booking mode visual indicators
      expect(screen.getByText('Booking Mode Active')).toBeInTheDocument();
      expect(screen.getByText('📅')).toBeInTheDocument();
      expect(screen.getByText('Complete your booking to continue chatting')).toBeInTheDocument();
    });

    it('should hide booking mode indicators when modal is closed', async () => {
      const user = userEvent.setup();
      mockIntentDetectionService.detectBookingIntent.mockReturnValue(true);
      
      render(<ChatInterface />);
      
      const input = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByText('Send');
      
      await user.type(input, 'I want to book an appointment');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('appointment-booking-modal')).toBeInTheDocument();
      });
      
      // Close modal
      const closeButton = screen.getByTestId('modal-close');
      await user.click(closeButton);
      
      await waitFor(() => {
        expect(screen.queryByTestId('appointment-booking-modal')).not.toBeInTheDocument();
      });
      
      // Verify booking mode indicators are hidden
      expect(screen.queryByText('Booking Mode Active')).not.toBeInTheDocument();
      expect(screen.queryByText('📅')).not.toBeInTheDocument();
      expect(screen.queryByText('Complete your booking to continue chatting')).not.toBeInTheDocument();
      
      // Verify normal mode indicators are shown
      expect(screen.getByText('Your AI Assistant')).toBeInTheDocument();
      expect(screen.getByText('💬')).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty messages gracefully', async () => {
      const user = userEvent.setup();
      
      render(<ChatInterface />);
      
      const sendButton = screen.getByText('Send');
      
      // Try to send empty message
      await user.click(sendButton);
      
      // Verify intent detection was not called
      expect(mockIntentDetectionService.detectBookingIntent).not.toHaveBeenCalled();
      
      // Verify no modal is opened
      expect(screen.queryByTestId('appointment-booking-modal')).not.toBeInTheDocument();
    });

    it('should handle intent detection service errors gracefully', async () => {
      const user = userEvent.setup();
      mockIntentDetectionService.detectBookingIntent.mockImplementation(() => {
        throw new Error('Intent detection failed');
      });
      
      render(<ChatInterface />);
      
      const input = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByText('Send');
      
      await user.type(input, 'I want to book an appointment');
      
      // Should not crash when intent detection throws error
      await user.click(sendButton);
      
      // Should fall back to normal message processing
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalled();
      });
    });

    it('should handle multiple rapid booking intent messages', async () => {
      const user = userEvent.setup();
      mockIntentDetectionService.detectBookingIntent.mockReturnValue(true);
      
      render(<ChatInterface />);
      
      const input = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByText('Send');
      
      // Send first booking message
      await user.type(input, 'I want to book an appointment');
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('appointment-booking-modal')).toBeInTheDocument();
      });
      
      // Try to send another booking message while modal is open
      await user.type(input, 'book a call');
      await user.click(sendButton);
      
      // Should still only have one modal
      const modals = screen.getAllByTestId('appointment-booking-modal');
      expect(modals).toHaveLength(1);
    });
  });

  describe('Keyboard Interactions', () => {
    it('should trigger booking modal when Enter key is pressed with booking intent', async () => {
      const user = userEvent.setup();
      mockIntentDetectionService.detectBookingIntent.mockReturnValue(true);
      
      render(<ChatInterface />);
      
      const input = screen.getByPlaceholderText('Type your message...');
      
      await user.type(input, 'I want to book an appointment');
      await user.keyboard('{Enter}');
      
      expect(mockIntentDetectionService.detectBookingIntent).toHaveBeenCalledWith('I want to book an appointment');
      
      await waitFor(() => {
        expect(screen.getByTestId('appointment-booking-modal')).toBeInTheDocument();
      });
    });
  });
});