'use client';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ContactInfo, TimeSlot, BookingConfirmation, BookingModalState } from '../src/types/appointment';
import { CalendarService } from '../src/services/CalendarService';
import ContactForm from './ContactForm';
import CalendarSelection from './CalendarSelection';
import Confirmation from './Confirmation';

interface AppointmentBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (booking: BookingConfirmation) => void;
}

interface BookingState {
  contactInfo: ContactInfo | null;
  selectedSlot: TimeSlot | null;
  confirmation: BookingConfirmation | null;
}

const AppointmentBookingModal: React.FC<AppointmentBookingModalProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState<BookingModalState>(BookingModalState.CONTACT_COLLECTION);
  const [bookingState, setBookingState] = useState<BookingState>({
    contactInfo: null,
    selectedSlot: null,
    confirmation: null
  });
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Refs for focus management
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Initialize calendar service
  const calendarService = CalendarService.getInstance();

  // Handle modal open/close effects
  useEffect(() => {
    if (isOpen) {
      // Store previous focus
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Focus modal after a brief delay
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.focus();
        }
      }, 100);

      // Load available slots
      loadAvailableSlots();
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      
      // Restore previous focus
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }

      // Reset state when modal closes
      resetModalState();
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Load available time slots
  const loadAvailableSlots = useCallback(async () => {
    try {
      setIsLoading(true);
      const slots = await calendarService.getAvailableSlots();
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Failed to load available slots:', error);
      // Handle error - could show error message
    } finally {
      setIsLoading(false);
    }
  }, [calendarService]);

  // Reset modal state
  const resetModalState = useCallback(() => {
    setCurrentStep(BookingModalState.CONTACT_COLLECTION);
    setBookingState({
      contactInfo: null,
      selectedSlot: null,
      confirmation: null
    });
    setHasUnsavedChanges(false);
  }, []);

  // Handle contact form submission
  const handleContactSubmit = useCallback((contactInfo: ContactInfo) => {
    setBookingState(prev => ({ ...prev, contactInfo }));
    setCurrentStep(BookingModalState.CALENDAR_SELECTION);
    setHasUnsavedChanges(true);
  }, []);

  // Handle time slot selection
  const handleSlotSelect = useCallback(async (slot: TimeSlot) => {
    if (!bookingState.contactInfo) return;

    try {
      setIsLoading(true);
      
      // Create booking confirmation
      const confirmation: BookingConfirmation = {
        name: bookingState.contactInfo.name,
        phone: bookingState.contactInfo.phone,
        email: bookingState.contactInfo.email,
        selectedSlot: slot,
        confirmationId: `APT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      };

      // Reserve the slot (simulate API call)
      await calendarService.reserveSlot(slot.id);

      setBookingState(prev => ({ 
        ...prev, 
        selectedSlot: slot,
        confirmation 
      }));
      setCurrentStep(BookingModalState.CONFIRMATION);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to reserve slot:', error);
      // Handle error - could show error message
    } finally {
      setIsLoading(false);
    }
  }, [bookingState.contactInfo, calendarService]);

  // Handle return to chat
  const handleReturnToChat = useCallback(() => {
    if (bookingState.confirmation) {
      onComplete(bookingState.confirmation);
    }
    onClose();
  }, [bookingState.confirmation, onComplete, onClose]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    switch (currentStep) {
      case BookingModalState.CALENDAR_SELECTION:
        setCurrentStep(BookingModalState.CONTACT_COLLECTION);
        break;
      case BookingModalState.CONFIRMATION:
        setCurrentStep(BookingModalState.CALENDAR_SELECTION);
        break;
      default:
        break;
    }
  }, [currentStep]);

  // Handle modal close with confirmation for unsaved changes
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges && currentStep !== BookingModalState.CONFIRMATION) {
      const shouldClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close the booking form?'
      );
      if (!shouldClose) return;
    }
    onClose();
  }, [hasUnsavedChanges, currentStep, onClose]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  }, [handleClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  // Get step title
  const getStepTitle = useCallback(() => {
    switch (currentStep) {
      case BookingModalState.CONTACT_COLLECTION:
        return 'Book an Appointment';
      case BookingModalState.CALENDAR_SELECTION:
        return 'Select Time Slot';
      case BookingModalState.CONFIRMATION:
        return 'Booking Confirmed';
      default:
        return 'Book an Appointment';
    }
  }, [currentStep]);

  // Get step progress
  const getStepProgress = useCallback(() => {
    switch (currentStep) {
      case BookingModalState.CONTACT_COLLECTION:
        return { current: 1, total: 3 };
      case BookingModalState.CALENDAR_SELECTION:
        return { current: 2, total: 3 };
      case BookingModalState.CONFIRMATION:
        return { current: 3, total: 3 };
      default:
        return { current: 1, total: 3 };
    }
  }, [currentStep]);

  if (!isOpen) return null;

  const progress = getStepProgress();

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="
          relative w-full max-w-4xl max-h-[90vh] overflow-hidden
          glass-morphism-strong rounded-2xl
          animate-scale-in
        "
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex-1">
            <h1 
              id="modal-title" 
              className="text-2xl font-bold text-white mb-2"
            >
              {getStepTitle()}
            </h1>
            
            {/* Progress indicator */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {Array.from({ length: progress.total }, (_, i) => (
                  <div
                    key={i}
                    className={`
                      w-2 h-2 rounded-full transition-all duration-300
                      ${i < progress.current 
                        ? 'bg-blue-500' 
                        : 'bg-white/20'
                      }
                    `}
                  />
                ))}
              </div>
              <span className="text-sm text-white/70">
                Step {progress.current} of {progress.total}
              </span>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="
              p-2 rounded-lg
              bg-white/10 hover:bg-white/20
              border border-white/20 hover:border-white/30
              text-white
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-white/50
            "
            aria-label="Close booking modal"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div 
            id="modal-description" 
            className="sr-only"
          >
            {currentStep === BookingModalState.CONTACT_COLLECTION && 
              "Provide your contact information to book an appointment"
            }
            {currentStep === BookingModalState.CALENDAR_SELECTION && 
              "Select an available time slot for your appointment"
            }
            {currentStep === BookingModalState.CONFIRMATION && 
              "Your appointment has been confirmed"
            }
          </div>

          {/* Step Content */}
          {currentStep === BookingModalState.CONTACT_COLLECTION && (
            <ContactForm
              onSubmit={handleContactSubmit}
              onCancel={handleClose}
              initialValues={bookingState.contactInfo || undefined}
              isSubmitting={isLoading}
            />
          )}

          {currentStep === BookingModalState.CALENDAR_SELECTION && (
            <CalendarSelection
              availableSlots={availableSlots}
              onSlotSelect={handleSlotSelect}
              onBack={handleBack}
              isLoading={isLoading}
            />
          )}

          {currentStep === BookingModalState.CONFIRMATION && bookingState.confirmation && (
            <Confirmation
              booking={bookingState.confirmation}
              onReturnToChat={handleReturnToChat}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentBookingModal;