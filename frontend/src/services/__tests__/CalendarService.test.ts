import CalendarService from '../CalendarService';
import { TimeSlot } from '../../types/appointment';

describe('CalendarService', () => {
  let calendarService: CalendarService;

  beforeEach(() => {
    // Get a fresh instance for each test
    calendarService = CalendarService.getInstance();
    // Clear any existing bookings and reservations
    calendarService.clearBookings();
    calendarService.clearReservations();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance when called multiple times', () => {
      const instance1 = CalendarService.getInstance();
      const instance2 = CalendarService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Time Slot Generation', () => {
    describe('generateDailySlots', () => {
      it('generates correct time slots for a single day', () => {
        const slots = calendarService.generateDailySlots('2024-01-15', '09:00', '11:00', 30);
        
        expect(slots).toHaveLength(4); // 09:00, 09:30, 10:00, 10:30
        expect(slots[0]).toEqual({
          id: '2024-01-15_09:00',
          date: '2024-01-15',
          startTime: '09:00',
          endTime: '09:30',
          isAvailable: true,
          bookedBy: undefined
        });
        expect(slots[3]).toEqual({
          id: '2024-01-15_10:30',
          date: '2024-01-15',
          startTime: '10:30',
          endTime: '11:00',
          isAvailable: true,
          bookedBy: undefined
        });
      });

      it('generates slots with custom intervals', () => {
        const slots = calendarService.generateDailySlots('2024-01-15', '09:00', '11:00', 60);
        
        expect(slots).toHaveLength(2); // 09:00, 10:00
        expect(slots[0].endTime).toBe('10:00');
        expect(slots[1].endTime).toBe('11:00');
      });

      it('handles edge case with no slots when start equals end time', () => {
        const slots = calendarService.generateDailySlots('2024-01-15', '09:00', '09:00', 30);
        
        expect(slots).toHaveLength(0);
      });

      it('generates slots across different hours correctly', () => {
        const slots = calendarService.generateDailySlots('2024-01-15', '08:30', '10:30', 30);
        
        expect(slots).toHaveLength(4);
        expect(slots[0].startTime).toBe('08:30');
        expect(slots[0].endTime).toBe('09:00');
        expect(slots[3].startTime).toBe('10:00');
        expect(slots[3].endTime).toBe('10:30');
      });
    });

    describe('generateTimeSlots', () => {
      it('generates slots for multiple days', () => {
        // Use Monday to Wednesday (2024-01-16 to 2024-01-18)
        const slots = calendarService.generateTimeSlots('2024-01-16', '2024-01-18', '09:00', '10:00', 30);
        
        // Should skip weekends, so only weekdays
        const uniqueDates = [...new Set(slots.map(slot => slot.date))];
        expect(uniqueDates.length).toBeGreaterThan(0);
        
        // Each day should have 2 slots (09:00 and 09:30)
        const slotsPerDay = slots.filter(slot => slot.date === '2024-01-16'); // Monday
        expect(slotsPerDay).toHaveLength(2);
      });

      it('skips weekends correctly', () => {
        // Generate slots for a range that includes a weekend
        // 2024-01-13 is Friday, 2024-01-14 is Saturday, 2024-01-15 is Sunday, 2024-01-16 is Monday
        const slots = calendarService.generateTimeSlots('2024-01-13', '2024-01-16', '09:00', '10:00', 30);
        
        const dates = slots.map(slot => slot.date);
        // Should include Friday and Monday
        expect(dates).toContain('2024-01-13'); // Friday
        expect(dates).toContain('2024-01-16'); // Monday
        // Should not include Saturday or Sunday
        expect(dates).not.toContain('2024-01-14'); // Saturday
        expect(dates).not.toContain('2024-01-15'); // Sunday
      });
    });

    describe('getAvailableSlots', () => {
      it('returns available slots for the next N days', () => {
        const slots = calendarService.getAvailableSlots(7, '09:00', '10:00', 30);
        
        expect(slots.length).toBeGreaterThan(0);
        slots.forEach(slot => {
          expect(slot.isAvailable).toBe(true);
        });
      });

      it('excludes booked slots from available slots', () => {
        // Book a slot first
        calendarService.bookSlot('2024-01-15_09:00', 'user123');
        
        const slots = calendarService.getAvailableSlots(7, '09:00', '10:00', 30);
        
        // The booked slot should not be in available slots
        const bookedSlot = slots.find(slot => slot.id === '2024-01-15_09:00');
        expect(bookedSlot).toBeUndefined();
      });
    });
  });

  describe('Slot Reservation', () => {
    it('reserves a slot successfully', () => {
      const result = calendarService.reserveSlot('2024-01-15_09:00');
      
      expect(result).toBe(true);
      expect(calendarService.isSlotAvailable('2024-01-15_09:00')).toBe(false);
    });

    it('fails to reserve an already booked slot', () => {
      calendarService.bookSlot('2024-01-15_09:00', 'user123');
      
      const result = calendarService.reserveSlot('2024-01-15_09:00');
      
      expect(result).toBe(false);
    });

    it('fails to reserve an already reserved slot', () => {
      calendarService.reserveSlot('2024-01-15_09:00');
      
      const result = calendarService.reserveSlot('2024-01-15_09:00');
      
      expect(result).toBe(false);
    });

    it('auto-releases reservation after timeout', (done) => {
      calendarService.reserveSlot('2024-01-15_09:00', 100); // 100ms timeout
      
      expect(calendarService.isSlotAvailable('2024-01-15_09:00')).toBe(false);
      
      setTimeout(() => {
        expect(calendarService.isSlotAvailable('2024-01-15_09:00')).toBe(true);
        done();
      }, 150);
    });
  });

  describe('Slot Booking', () => {
    it('books a slot successfully', () => {
      const result = calendarService.bookSlot('2024-01-15_09:00', 'user123');
      
      expect(result).toBe(true);
      expect(calendarService.isSlotAvailable('2024-01-15_09:00')).toBe(false);
    });

    it('fails to book an already booked slot', () => {
      calendarService.bookSlot('2024-01-15_09:00', 'user123');
      
      const result = calendarService.bookSlot('2024-01-15_09:00', 'user456');
      
      expect(result).toBe(false);
    });

    it('books a previously reserved slot', () => {
      calendarService.reserveSlot('2024-01-15_09:00');
      
      const result = calendarService.bookSlot('2024-01-15_09:00', 'user123');
      
      expect(result).toBe(true);
      expect(calendarService.isSlotAvailable('2024-01-15_09:00')).toBe(false);
    });

    it('removes reservation when booking', () => {
      calendarService.reserveSlot('2024-01-15_09:00');
      calendarService.bookSlot('2024-01-15_09:00', 'user123');
      
      // Slot should still be unavailable (booked, not reserved)
      expect(calendarService.isSlotAvailable('2024-01-15_09:00')).toBe(false);
    });
  });

  describe('Booking Cancellation', () => {
    it('cancels a booking successfully', () => {
      calendarService.bookSlot('2024-01-15_09:00', 'user123');
      
      const result = calendarService.cancelBooking('2024-01-15_09:00', 'user123');
      
      expect(result).toBe(true);
      expect(calendarService.isSlotAvailable('2024-01-15_09:00')).toBe(true);
    });

    it('fails to cancel booking with wrong user', () => {
      calendarService.bookSlot('2024-01-15_09:00', 'user123');
      
      const result = calendarService.cancelBooking('2024-01-15_09:00', 'user456');
      
      expect(result).toBe(false);
      expect(calendarService.isSlotAvailable('2024-01-15_09:00')).toBe(false);
    });

    it('fails to cancel non-existent booking', () => {
      const result = calendarService.cancelBooking('2024-01-15_09:00', 'user123');
      
      expect(result).toBe(false);
    });
  });

  describe('Slot Information', () => {
    it('gets slot by ID correctly', () => {
      const slot = calendarService.getSlotById('2024-01-15_09:00');
      
      expect(slot).toEqual({
        id: '2024-01-15_09:00',
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '09:30',
        isAvailable: true,
        bookedBy: undefined
      });
    });

    it('returns null for invalid slot ID', () => {
      const slot = calendarService.getSlotById('invalid-id');
      
      expect(slot).toBeNull();
    });

    it('gets bookings for a specific date', () => {
      calendarService.bookSlot('2024-01-15_09:00', 'user123');
      calendarService.bookSlot('2024-01-15_10:00', 'user456');
      calendarService.bookSlot('2024-01-16_09:00', 'user789');
      
      const bookings = calendarService.getBookingsForDate('2024-01-15');
      
      expect(bookings).toHaveLength(2);
      expect(bookings[0].id).toBe('2024-01-15_09:00');
      expect(bookings[1].id).toBe('2024-01-15_10:00');
    });

    it('returns booking statistics', () => {
      calendarService.bookSlot('2024-01-15_09:00', 'user123');
      calendarService.reserveSlot('2024-01-15_10:00');
      
      const stats = calendarService.getBookingStats();
      
      expect(stats.totalBooked).toBe(1);
      expect(stats.totalReserved).toBe(1);
      expect(stats.totalAvailable).toBeGreaterThan(0);
    });
  });

  describe('Utility Methods', () => {
    it('checks slot availability correctly', () => {
      expect(calendarService.isSlotAvailable('2024-01-15_09:00')).toBe(true);
      
      calendarService.bookSlot('2024-01-15_09:00', 'user123');
      expect(calendarService.isSlotAvailable('2024-01-15_09:00')).toBe(false);
    });

    it('clears reservations', () => {
      calendarService.reserveSlot('2024-01-15_09:00');
      calendarService.reserveSlot('2024-01-15_10:00');
      
      calendarService.clearReservations();
      
      expect(calendarService.isSlotAvailable('2024-01-15_09:00')).toBe(true);
      expect(calendarService.isSlotAvailable('2024-01-15_10:00')).toBe(true);
    });

    it('clears bookings', () => {
      calendarService.bookSlot('2024-01-15_09:00', 'user123');
      calendarService.bookSlot('2024-01-15_10:00', 'user456');
      
      calendarService.clearBookings();
      
      expect(calendarService.isSlotAvailable('2024-01-15_09:00')).toBe(true);
      expect(calendarService.isSlotAvailable('2024-01-15_10:00')).toBe(true);
    });
  });

  describe('Validation Methods', () => {
    describe('isValidTimeFormat', () => {
      it('validates correct time formats', () => {
        expect(CalendarService.isValidTimeFormat('09:00')).toBe(true);
        expect(CalendarService.isValidTimeFormat('23:59')).toBe(true);
        expect(CalendarService.isValidTimeFormat('00:00')).toBe(true);
        expect(CalendarService.isValidTimeFormat('12:30')).toBe(true);
      });

      it('rejects invalid time formats', () => {
        expect(CalendarService.isValidTimeFormat('24:00')).toBe(false);
        expect(CalendarService.isValidTimeFormat('12:60')).toBe(false);
        expect(CalendarService.isValidTimeFormat('9:00')).toBe(true); // Single digit hour is allowed
        expect(CalendarService.isValidTimeFormat('09:0')).toBe(false); // Missing trailing zero
        expect(CalendarService.isValidTimeFormat('invalid')).toBe(false);
        expect(CalendarService.isValidTimeFormat('')).toBe(false);
      });
    });

    describe('isValidDateFormat', () => {
      it('validates correct date formats', () => {
        expect(CalendarService.isValidDateFormat('2024-01-15')).toBe(true);
        expect(CalendarService.isValidDateFormat('2024-12-31')).toBe(true);
        expect(CalendarService.isValidDateFormat('2000-02-29')).toBe(true); // Leap year
      });

      it('rejects invalid date formats', () => {
        expect(CalendarService.isValidDateFormat('2024-13-01')).toBe(false); // Invalid month
        expect(CalendarService.isValidDateFormat('2024-01-32')).toBe(false); // Invalid day
        expect(CalendarService.isValidDateFormat('2023-02-29')).toBe(false); // Not a leap year
        expect(CalendarService.isValidDateFormat('24-01-15')).toBe(false); // Wrong year format
        expect(CalendarService.isValidDateFormat('2024/01/15')).toBe(false); // Wrong separator
        expect(CalendarService.isValidDateFormat('invalid')).toBe(false);
        expect(CalendarService.isValidDateFormat('')).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles midnight time correctly', () => {
      const slots = calendarService.generateDailySlots('2024-01-15', '00:00', '01:00', 30);
      
      expect(slots).toHaveLength(2);
      expect(slots[0].startTime).toBe('00:00');
      expect(slots[0].endTime).toBe('00:30');
    });

    it('handles late evening time correctly', () => {
      const slots = calendarService.generateDailySlots('2024-01-15', '23:00', '24:00', 30);
      
      expect(slots).toHaveLength(2);
      expect(slots[0].startTime).toBe('23:00');
      expect(slots[0].endTime).toBe('23:30');
      expect(slots[1].startTime).toBe('23:30');
      expect(slots[1].endTime).toBe('24:00');
    });

    it('handles 15-minute intervals', () => {
      const slots = calendarService.generateDailySlots('2024-01-15', '09:00', '10:00', 15);
      
      expect(slots).toHaveLength(4);
      expect(slots[0].endTime).toBe('09:15');
      expect(slots[1].endTime).toBe('09:30');
      expect(slots[2].endTime).toBe('09:45');
      expect(slots[3].endTime).toBe('10:00');
    });

    it('handles single date range', () => {
      // Use a weekday (2024-01-16 is Tuesday)
      const slots = calendarService.generateTimeSlots('2024-01-16', '2024-01-16', '09:00', '10:00', 30);
      
      expect(slots.length).toBeGreaterThan(0);
      slots.forEach(slot => {
        expect(slot.date).toBe('2024-01-16');
      });
    });
  });
});