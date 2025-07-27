'use client';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { TimeSlot } from '../src/types/appointment';

interface CalendarSelectionProps {
  availableSlots: TimeSlot[];
  onSlotSelect: (slot: TimeSlot) => void;
  onBack: () => void;
  isLoading?: boolean;
  selectedDate?: string;
}

interface GroupedSlots {
  [date: string]: TimeSlot[];
}

const CalendarSelection: React.FC<CalendarSelectionProps> = ({
  availableSlots,
  onSlotSelect,
  onBack,
  isLoading = false,
  selectedDate
}) => {
  const [currentDate, setCurrentDate] = useState<string>(
    selectedDate || new Date().toISOString().split('T')[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Group slots by date for better organization
  const groupedSlots = useMemo<GroupedSlots>(() => {
    return availableSlots.reduce((acc, slot) => {
      if (!acc[slot.date]) {
        acc[slot.date] = [];
      }
      acc[slot.date].push(slot);
      return acc;
    }, {} as GroupedSlots);
  }, [availableSlots]);

  // Get available dates (next 14 days with available slots)
  const availableDates = useMemo(() => {
    const dates = Object.keys(groupedSlots).sort();
    return dates.slice(0, 14); // Limit to next 2 weeks
  }, [groupedSlots]);

  // Get slots for current selected date
  const currentDateSlots = useMemo(() => {
    return groupedSlots[currentDate] || [];
  }, [groupedSlots, currentDate]);

  // Format date for display
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dateString === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateString === tomorrow.toISOString().split('T')[0]) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  }, []);

  // Format time for display
  const formatTime = useCallback((timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  }, []);

  // Handle slot selection
  const handleSlotClick = useCallback((slot: TimeSlot) => {
    if (!slot.isAvailable || isLoading) return;
    
    setSelectedSlot(slot);
    // Add a small delay for visual feedback before proceeding
    setTimeout(() => {
      onSlotSelect(slot);
    }, 200);
  }, [onSlotSelect, isLoading]);

  // Handle date navigation
  const handleDateSelect = useCallback((date: string) => {
    setCurrentDate(date);
    setSelectedSlot(null);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onBack();
    }
  }, [onBack]);

  // Auto-select first available date if current date has no slots
  useEffect(() => {
    if (currentDateSlots.length === 0 && availableDates.length > 0) {
      setCurrentDate(availableDates[0]);
    }
  }, [currentDateSlots.length, availableDates]);

  if (availableDates.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="glass-morphism-strong rounded-xl p-6">
          <div className="text-center">
            <div className="mb-4">
              <svg 
                className="w-16 h-16 mx-auto text-white/60" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              No Available Slots
            </h2>
            <p className="text-white/80 text-sm mb-6">
              Unfortunately, there are no available appointment slots at this time. 
              Please try again later or contact us directly.
            </p>
            <button
              onClick={onBack}
              className="
                px-6 py-3 rounded-lg
                bg-blue-600 hover:bg-blue-700
                border border-blue-500 hover:border-blue-600
                text-white font-medium
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500/50
              "
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto" onKeyDown={handleKeyDown}>
      <div className="glass-morphism-strong rounded-xl p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">
            Select an Appointment Time
          </h2>
          <p className="text-white/80 text-sm">
            Choose a date and time that works best for you. All times are 30-minute appointments.
          </p>
        </div>

        {/* Date Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-3">Available Dates</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {availableDates.map((date) => (
              <button
                key={date}
                onClick={() => handleDateSelect(date)}
                disabled={isLoading}
                className={`
                  p-3 rounded-lg text-sm font-medium
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${currentDate === date
                    ? 'bg-blue-600 text-white border border-blue-500'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30'
                  }
                `}
              >
                <div className="text-center">
                  <div className="font-semibold">{formatDate(date)}</div>
                  <div className="text-xs opacity-80 mt-1">
                    {groupedSlots[date]?.length || 0} slots
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Time Slot Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-3">
            Available Times for {formatDate(currentDate)}
          </h3>
          
          {currentDateSlots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/60">No available slots for this date</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {currentDateSlots.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => handleSlotClick(slot)}
                  disabled={!slot.isAvailable || isLoading}
                  className={`
                    p-3 rounded-lg text-sm font-medium
                    transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-blue-500/50
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${selectedSlot?.id === slot.id
                      ? 'bg-green-600 text-white border border-green-500 transform scale-105'
                      : slot.isAvailable
                        ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30 hover:transform hover:scale-105'
                        : 'bg-red-500/20 text-red-300 border border-red-500/30 cursor-not-allowed'
                    }
                  `}
                >
                  <div className="text-center">
                    <div className="font-semibold">
                      {formatTime(slot.startTime)}
                    </div>
                    <div className="text-xs opacity-80 mt-1">
                      {slot.isAvailable ? 'Available' : 'Booked'}
                    </div>
                  </div>
                  
                  {selectedSlot?.id === slot.id && (
                    <div className="absolute inset-0 rounded-lg border-2 border-green-400 animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="
              flex-1 px-4 py-3 rounded-lg
              bg-white/10 hover:bg-white/20
              border border-white/20 hover:border-white/30
              text-white font-medium
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-white/50
            "
          >
            Back
          </button>
          
          {selectedSlot && (
            <div className="flex-1 px-4 py-3 rounded-lg bg-green-600/20 border border-green-500/30 text-green-300 font-medium text-center">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg 
                    className="animate-spin h-4 w-4" 
                    fill="none" 
                    viewBox="0 0 24 24"
                  >
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                    />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Booking...
                </div>
              ) : (
                `Selected: ${formatTime(selectedSlot.startTime)}`
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarSelection;