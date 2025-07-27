'use client';
import React, { useState, useEffect } from 'react';
import CalendarSelection from './CalendarSelection';
import CalendarService from '../src/services/CalendarService';
import { TimeSlot } from '../src/types/appointment';

const CalendarSelectionDemo: React.FC = () => {
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [showCalendar, setShowCalendar] = useState(true);

  const calendarService = CalendarService.getInstance();

  // Load available slots on component mount
  useEffect(() => {
    const loadSlots = () => {
      setIsLoading(true);
      
      // Simulate API call delay
      setTimeout(() => {
        const slots = calendarService.getAvailableSlots(14, '09:00', '17:00', 30);
        setAvailableSlots(slots);
        setIsLoading(false);
      }, 500);
    };

    loadSlots();
  }, [calendarService]);

  const handleSlotSelect = (slot: TimeSlot) => {
    setIsLoading(true);
    
    // Simulate booking process
    setTimeout(() => {
      const success = calendarService.bookSlot(slot.id, 'demo-user');
      
      if (success) {
        setSelectedSlot(slot);
        setShowCalendar(false);
        
        // Update available slots to reflect the booking
        const updatedSlots = calendarService.getAvailableSlots(14, '09:00', '17:00', 30);
        setAvailableSlots(updatedSlots);
      }
      
      setIsLoading(false);
    }, 1000);
  };

  const handleBack = () => {
    setShowCalendar(true);
    setSelectedSlot(null);
  };

  const handleReset = () => {
    // Clear all bookings for demo purposes
    calendarService.clearBookings();
    
    // Reload slots
    const slots = calendarService.getAvailableSlots(14, '09:00', '17:00', 30);
    setAvailableSlots(slots);
    
    setSelectedSlot(null);
    setShowCalendar(true);
  };

  if (!showCalendar && selectedSlot) {
    return (
      <div className="min-h-screen dynamic-background flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          <div className="glass-morphism-strong rounded-xl p-6 text-center">
            <div className="mb-4">
              <svg 
                className="w-16 h-16 mx-auto text-green-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-white mb-2">
              Booking Confirmed!
            </h2>
            
            <p className="text-white/80 text-sm mb-4">
              Your appointment has been successfully booked.
            </p>
            
            <div className="bg-white/10 rounded-lg p-4 mb-6">
              <div className="text-white">
                <div className="font-medium">
                  {new Date(selectedSlot.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                <div className="text-lg font-semibold mt-1">
                  {selectedSlot.startTime} - {selectedSlot.endTime}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="
                  flex-1 px-4 py-3 rounded-lg
                  bg-white/10 hover:bg-white/20
                  border border-white/20 hover:border-white/30
                  text-white font-medium
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-white/50
                "
              >
                Book Another
              </button>
              
              <button
                onClick={handleReset}
                className="
                  flex-1 px-4 py-3 rounded-lg
                  bg-blue-600 hover:bg-blue-700
                  border border-blue-500 hover:border-blue-600
                  text-white font-medium
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50
                "
              >
                Reset Demo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dynamic-background flex items-center justify-center p-4">
      <div className="w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Calendar Selection Demo
          </h1>
          <p className="text-white/80">
            Select an appointment time from the available slots below
          </p>
          
          <div className="mt-4">
            <button
              onClick={handleReset}
              className="
                px-4 py-2 rounded-lg text-sm
                bg-white/10 hover:bg-white/20
                border border-white/20 hover:border-white/30
                text-white font-medium
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-white/50
              "
            >
              Reset All Bookings
            </button>
          </div>
        </div>

        <CalendarSelection
          availableSlots={availableSlots}
          onSlotSelect={handleSlotSelect}
          onBack={handleBack}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default CalendarSelectionDemo;