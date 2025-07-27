import { TimeSlot } from '../types/appointment';

/**
 * Service for managing calendar operations and time slot generation
 */
export class CalendarService {
  private static instance: CalendarService;
  private reservedSlots: Set<string> = new Set();
  private bookedSlots: Map<string, string> = new Map(); // slotId -> userId

  private constructor() {}

  public static getInstance(): CalendarService {
    if (!CalendarService.instance) {
      CalendarService.instance = new CalendarService();
    }
    return CalendarService.instance;
  }

  /**
   * Generate time slots for a given date range
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   * @param startTime - Start time in HH:MM format (default: 09:00)
   * @param endTime - End time in HH:MM format (default: 17:00)
   * @param intervalMinutes - Interval between slots in minutes (default: 30)
   * @returns Array of TimeSlot objects
   */
  public generateTimeSlots(
    startDate: string,
    endDate: string,
    startTime: string = '09:00',
    endTime: string = '17:00',
    intervalMinutes: number = 30
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Iterate through each date in the range (inclusive)
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateString = date.toISOString().split('T')[0];
      
      // Skip weekends (optional - can be configured)
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        continue; // Skip Sunday (0) and Saturday (6)
      }

      // Generate slots for this date
      const dailySlots = this.generateDailySlots(dateString, startTime, endTime, intervalMinutes);
      slots.push(...dailySlots);
    }

    return slots;
  }

  /**
   * Generate time slots for a single day
   * @param date - Date in YYYY-MM-DD format
   * @param startTime - Start time in HH:MM format
   * @param endTime - End time in HH:MM format
   * @param intervalMinutes - Interval between slots in minutes
   * @returns Array of TimeSlot objects for the day
   */
  public generateDailySlots(
    date: string,
    startTime: string,
    endTime: string,
    intervalMinutes: number
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    for (let minutes = startMinutes; minutes < endMinutes; minutes += intervalMinutes) {
      const slotStartTime = this.minutesToTimeString(minutes);
      const slotEndTime = this.minutesToTimeString(minutes + intervalMinutes);
      
      const slotId = `${date}_${slotStartTime}`;
      const isAvailable = !this.bookedSlots.has(slotId) && !this.reservedSlots.has(slotId);

      slots.push({
        id: slotId,
        date,
        startTime: slotStartTime,
        endTime: slotEndTime,
        isAvailable,
        bookedBy: this.bookedSlots.get(slotId)
      });
    }

    return slots;
  }

  /**
   * Get available slots for the next N days
   * @param days - Number of days to look ahead (default: 14)
   * @param startTime - Start time in HH:MM format (default: 09:00)
   * @param endTime - End time in HH:MM format (default: 17:00)
   * @param intervalMinutes - Interval between slots in minutes (default: 30)
   * @returns Array of available TimeSlot objects
   */
  public getAvailableSlots(
    days: number = 14,
    startTime: string = '09:00',
    endTime: string = '17:00',
    intervalMinutes: number = 30
  ): TimeSlot[] {
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);
    const endDateString = endDate.toISOString().split('T')[0];

    const allSlots = this.generateTimeSlots(startDate, endDateString, startTime, endTime, intervalMinutes);
    return allSlots.filter(slot => slot.isAvailable);
  }

  /**
   * Reserve a time slot temporarily (e.g., during booking process)
   * @param slotId - Unique identifier for the slot
   * @param reservationTimeoutMs - How long to hold the reservation (default: 5 minutes)
   * @returns True if reservation was successful, false if slot is unavailable
   */
  public reserveSlot(slotId: string, reservationTimeoutMs: number = 5 * 60 * 1000): boolean {
    if (this.bookedSlots.has(slotId) || this.reservedSlots.has(slotId)) {
      return false;
    }

    this.reservedSlots.add(slotId);

    // Auto-release reservation after timeout
    setTimeout(() => {
      this.reservedSlots.delete(slotId);
    }, reservationTimeoutMs);

    return true;
  }

  /**
   * Book a time slot permanently
   * @param slotId - Unique identifier for the slot
   * @param userId - User identifier who is booking the slot
   * @returns True if booking was successful, false if slot is unavailable
   */
  public bookSlot(slotId: string, userId: string): boolean {
    if (this.bookedSlots.has(slotId)) {
      return false;
    }

    // Remove from reserved slots if it was reserved
    this.reservedSlots.delete(slotId);
    
    // Add to booked slots
    this.bookedSlots.set(slotId, userId);

    return true;
  }

  /**
   * Cancel a booking
   * @param slotId - Unique identifier for the slot
   * @param userId - User identifier who booked the slot
   * @returns True if cancellation was successful, false if slot wasn't booked by this user
   */
  public cancelBooking(slotId: string, userId: string): boolean {
    const bookedBy = this.bookedSlots.get(slotId);
    if (bookedBy !== userId) {
      return false;
    }

    this.bookedSlots.delete(slotId);
    return true;
  }

  /**
   * Check if a slot is available
   * @param slotId - Unique identifier for the slot
   * @returns True if slot is available, false otherwise
   */
  public isSlotAvailable(slotId: string): boolean {
    return !this.bookedSlots.has(slotId) && !this.reservedSlots.has(slotId);
  }

  /**
   * Get slot details by ID
   * @param slotId - Unique identifier for the slot
   * @returns TimeSlot object or null if not found
   */
  public getSlotById(slotId: string): TimeSlot | null {
    const [date, startTime] = slotId.split('_');
    if (!date || !startTime) {
      return null;
    }

    // Calculate end time (assuming 30-minute slots)
    const [hours, minutes] = startTime.split(':').map(Number);
    const endMinutes = hours * 60 + minutes + 30;
    const endTime = this.minutesToTimeString(endMinutes);

    return {
      id: slotId,
      date,
      startTime,
      endTime,
      isAvailable: this.isSlotAvailable(slotId),
      bookedBy: this.bookedSlots.get(slotId)
    };
  }

  /**
   * Get all bookings for a specific date
   * @param date - Date in YYYY-MM-DD format
   * @returns Array of booked TimeSlot objects
   */
  public getBookingsForDate(date: string): TimeSlot[] {
    const bookings: TimeSlot[] = [];
    
    for (const [slotId, userId] of this.bookedSlots.entries()) {
      if (slotId.startsWith(date)) {
        const slot = this.getSlotById(slotId);
        if (slot) {
          bookings.push(slot);
        }
      }
    }

    return bookings.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  /**
   * Get booking statistics
   * @returns Object with booking statistics
   */
  public getBookingStats() {
    return {
      totalBooked: this.bookedSlots.size,
      totalReserved: this.reservedSlots.size,
      totalAvailable: this.getAvailableSlots().length
    };
  }

  /**
   * Clear all reservations (useful for testing or maintenance)
   */
  public clearReservations(): void {
    this.reservedSlots.clear();
  }

  /**
   * Clear all bookings (useful for testing or maintenance)
   */
  public clearBookings(): void {
    this.bookedSlots.clear();
  }

  /**
   * Convert minutes since midnight to HH:MM format
   * @param minutes - Minutes since midnight
   * @returns Time string in HH:MM format
   */
  private minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Validate time format (HH:MM)
   * @param time - Time string to validate
   * @returns True if valid, false otherwise
   */
  public static isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Validate date format (YYYY-MM-DD)
   * @param date - Date string to validate
   * @returns True if valid, false otherwise
   */
  public static isValidDateFormat(date: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return false;
    }

    const dateObj = new Date(date + 'T00:00:00.000Z');
    if (isNaN(dateObj.getTime())) {
      return false;
    }
    
    return dateObj.toISOString().split('T')[0] === date;
  }
}

export default CalendarService;