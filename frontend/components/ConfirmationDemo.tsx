import React, { useState } from 'react';
import { Confirmation } from './Confirmation';
import { BookingConfirmation } from '../src/types/appointment';

/**
 * Demo component to showcase the Confirmation component
 */
export const ConfirmationDemo: React.FC = () => {
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Sample booking confirmation data
  const sampleBooking: BookingConfirmation = {
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

  const handleReturnToChat = () => {
    setShowConfirmation(false);
    console.log('Returning to chat...');
  };

  const handleShowConfirmation = () => {
    setShowConfirmation(true);
  };

  if (showConfirmation) {
    return (
      <div className="min-h-screen dynamic-background flex items-center justify-center p-4">
        <Confirmation 
          booking={sampleBooking}
          onReturnToChat={handleReturnToChat}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen dynamic-background flex items-center justify-center p-4">
      <div className="glass-morphism-strong rounded-xl p-8 max-w-md mx-auto text-center">
        <h1 className="text-2xl font-bold text-white mb-4">
          Confirmation Component Demo
        </h1>
        <p className="text-white/80 mb-6">
          Click the button below to see the booking confirmation component in action.
        </p>
        <button
          onClick={handleShowConfirmation}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 button-enhanced focus-enhanced"
        >
          Show Confirmation
        </button>
      </div>
    </div>
  );
};

export default ConfirmationDemo;