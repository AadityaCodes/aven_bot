import React from 'react';
import { BookingConfirmation } from '../src/types/appointment';

interface ConfirmationProps {
  booking: BookingConfirmation;
  onReturnToChat: () => void;
}

/**
 * Confirmation component displays booking details and provides return to chat functionality
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export const Confirmation: React.FC<ConfirmationProps> = ({
  booking,
  onReturnToChat
}) => {
  // Format date for display
  const formatDate = (dateString: string): string => {
    // Parse the date string as UTC to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format time for display (convert from 24-hour to 12-hour format)
  const formatTime = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Format time range for display
  const formatTimeRange = (): string => {
    const startTime = formatTime(booking.selectedSlot.startTime);
    const endTime = formatTime(booking.selectedSlot.endTime);
    return `${startTime} - ${endTime}`;
  };

  return (
    <div className="confirmation-container p-6 max-w-md mx-auto">
      {/* Success Icon */}
      <div className="confirmation-icon-container flex justify-center mb-6">
        <div className="confirmation-success-icon w-16 h-16 bg-green-500 rounded-full flex items-center justify-center animate-scale-in">
          <svg 
            className="w-8 h-8 text-white" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 13l4 4L19 7" 
            />
          </svg>
        </div>
      </div>

      {/* Confirmation Header */}
      <div className="confirmation-header text-center mb-6">
        <h2 className="confirmation-title text-2xl font-bold text-white mb-2">
          Booking Confirmed!
        </h2>
        <p className="confirmation-message text-white/90 text-base leading-relaxed">
          Your booking has been confirmed and we look forward to talking with you.
        </p>
      </div>

      {/* Booking Details */}
      <div className="booking-summary glass-morphism-subtle rounded-lg p-4 mb-6 space-y-4">
        <h3 className="summary-title text-lg font-semibold text-white mb-3">
          Appointment Details
        </h3>
        
        {/* Date and Time */}
        <div className="detail-row flex items-start gap-3">
          <div className="detail-icon w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
              />
            </svg>
          </div>
          <div className="detail-content">
            <div className="detail-label text-white/70 text-sm">Date & Time</div>
            <div className="detail-value text-white font-medium">
              {formatDate(booking.selectedSlot.date)}
            </div>
            <div className="detail-value text-white font-medium">
              {formatTimeRange()}
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="detail-row flex items-start gap-3">
          <div className="detail-icon w-5 h-5 text-green-400 mt-0.5 flex-shrink-0">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
              />
            </svg>
          </div>
          <div className="detail-content">
            <div className="detail-label text-white/70 text-sm">Contact</div>
            <div className="detail-value text-white font-medium">{booking.name}</div>
            <div className="detail-value text-white/90 text-sm">{booking.email}</div>
            <div className="detail-value text-white/90 text-sm">{booking.phone}</div>
          </div>
        </div>

        {/* Confirmation ID */}
        <div className="detail-row flex items-start gap-3">
          <div className="detail-icon w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
              />
            </svg>
          </div>
          <div className="detail-content">
            <div className="detail-label text-white/70 text-sm">Confirmation ID</div>
            <div className="detail-value text-white font-mono text-sm bg-white/10 px-2 py-1 rounded">
              {booking.confirmationId}
            </div>
          </div>
        </div>
      </div>

      {/* Return to Chat Button */}
      <div className="confirmation-actions">
        <button
          onClick={onReturnToChat}
          className="return-to-chat-btn w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 button-enhanced focus-enhanced"
          aria-label="Return to chat conversation"
        >
          Return to Chat
        </button>
      </div>
    </div>
  );
};

export default Confirmation;