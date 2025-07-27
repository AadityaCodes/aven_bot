import { 
  Booking, 
  BookingStatus, 
  ContactInfo, 
  TimeSlot, 
  BookingConfirmation,
  ValidationResult,
  ValidationError,
  ValidationErrorType
} from '../types/appointment';
import { CalendarService } from './CalendarService';

/**
 * Service for managing appointment bookings with persistence and conflict resolution
 */
export class BookingService {
  private static instance: BookingService;
  private calendarService: CalendarService;
  private bookings: Map<string, Booking> = new Map();
  private reservations: Map<string, { userId: string; expiresAt: number }> = new Map();
  private readonly RESERVATION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  private readonly STORAGE_KEY = 'booking_service_data';

  private constructor() {
    this.calendarService = CalendarService.getInstance();
    this.loadFromStorage();
    this.startReservationCleanup();
  }

  public static getInstance(): BookingService {
    if (!BookingService.instance) {
      BookingService.instance = new BookingService();
    }
    return BookingService.instance;
  }

  /**
   * Create a new booking
   * @param contactInfo - Contact information for the booking
   * @param timeSlot - Selected time slot
   * @param userId - User identifier (session ID)
   * @returns Promise resolving to booking confirmation or error
   */
  public async createBooking(
    contactInfo: ContactInfo,
    timeSlot: TimeSlot,
    userId: string
  ): Promise<{ success: boolean; data?: BookingConfirmation; error?: string }> {
    try {
      // Validate contact information
      const validationResult = this.validateContactInfo(contactInfo);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`
        };
      }

      // Check if slot is still available
      if (!this.calendarService.isSlotAvailable(timeSlot.id)) {
        return {
          success: false,
          error: 'Selected time slot is no longer available'
        };
      }

      // Check if user has a reservation for this slot
      const reservation = this.reservations.get(timeSlot.id);
      if (reservation && reservation.userId !== userId) {
        return {
          success: false,
          error: 'Time slot is reserved by another user'
        };
      }

      // Book the slot
      const bookingSuccess = this.calendarService.bookSlot(timeSlot.id, userId);
      if (!bookingSuccess) {
        return {
          success: false,
          error: 'Failed to book time slot - conflict detected'
        };
      }

      // Create booking record
      const booking: Booking = {
        id: this.generateBookingId(),
        contactInfo: this.sanitizeContactInfo(contactInfo),
        timeSlot: { ...timeSlot, isAvailable: false, bookedBy: userId },
        status: BookingStatus.CONFIRMED,
        createdAt: new Date().toISOString(),
        confirmationId: this.generateConfirmationId()
      };

      // Store booking
      this.bookings.set(booking.id, booking);
      
      // Remove reservation if it exists
      this.reservations.delete(timeSlot.id);

      // Save to storage
      this.saveToStorage();

      // Create confirmation
      const confirmation: BookingConfirmation = {
        name: booking.contactInfo.name,
        phone: booking.contactInfo.phone,
        email: booking.contactInfo.email,
        selectedSlot: booking.timeSlot,
        confirmationId: booking.confirmationId
      };

      return {
        success: true,
        data: confirmation
      };

    } catch (error) {
      console.error('Error creating booking:', error);
      return {
        success: false,
        error: 'An unexpected error occurred while creating the booking'
      };
    }
  }

  /**
   * Reserve a time slot temporarily
   * @param slotId - Time slot identifier
   * @param userId - User identifier
   * @returns Success status
   */
  public reserveSlot(slotId: string, userId: string): boolean {
    // Check if slot is available
    if (!this.calendarService.isSlotAvailable(slotId)) {
      return false;
    }

    // Check if already reserved by someone else
    const existingReservation = this.reservations.get(slotId);
    if (existingReservation && existingReservation.userId !== userId) {
      // Check if reservation has expired
      if (Date.now() < existingReservation.expiresAt) {
        return false;
      }
    }

    // Reserve the slot in calendar service
    const calendarReserved = this.calendarService.reserveSlot(slotId, this.RESERVATION_TIMEOUT);
    if (!calendarReserved) {
      return false;
    }

    // Add to our reservations
    this.reservations.set(slotId, {
      userId,
      expiresAt: Date.now() + this.RESERVATION_TIMEOUT
    });

    this.saveToStorage();
    return true;
  }

  /**
   * Release a reserved slot
   * @param slotId - Time slot identifier
   * @param userId - User identifier
   * @returns Success status
   */
  public releaseReservation(slotId: string, userId: string): boolean {
    const reservation = this.reservations.get(slotId);
    if (!reservation || reservation.userId !== userId) {
      return false;
    }

    this.reservations.delete(slotId);
    this.saveToStorage();
    return true;
  }

  /**
   * Cancel a booking
   * @param bookingId - Booking identifier
   * @param userId - User identifier
   * @returns Success status
   */
  public async cancelBooking(bookingId: string, userId: string): Promise<boolean> {
    const booking = this.bookings.get(bookingId);
    if (!booking) {
      return false;
    }

    // Verify user can cancel this booking (basic check)
    if (booking.timeSlot.bookedBy !== userId) {
      return false;
    }

    // Update booking status
    booking.status = BookingStatus.CANCELLED;

    // Release the slot in calendar service
    this.calendarService.cancelBooking(booking.timeSlot.id, userId);

    this.saveToStorage();
    return true;
  }

  /**
   * Get booking by ID
   * @param bookingId - Booking identifier
   * @returns Booking or null if not found
   */
  public getBooking(bookingId: string): Booking | null {
    return this.bookings.get(bookingId) || null;
  }

  /**
   * Get booking by confirmation ID
   * @param confirmationId - Confirmation identifier
   * @returns Booking or null if not found
   */
  public getBookingByConfirmation(confirmationId: string): Booking | null {
    for (const booking of this.bookings.values()) {
      if (booking.confirmationId === confirmationId) {
        return booking;
      }
    }
    return null;
  }

  /**
   * Get all bookings for a user
   * @param userId - User identifier
   * @returns Array of bookings
   */
  public getUserBookings(userId: string): Booking[] {
    return Array.from(this.bookings.values())
      .filter(booking => booking.timeSlot.bookedBy === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get booking statistics
   * @returns Booking statistics object
   */
  public getBookingStats() {
    const bookings = Array.from(this.bookings.values());
    const confirmed = bookings.filter(b => b.status === BookingStatus.CONFIRMED).length;
    const cancelled = bookings.filter(b => b.status === BookingStatus.CANCELLED).length;
    const pending = bookings.filter(b => b.status === BookingStatus.PENDING).length;

    return {
      total: bookings.length,
      confirmed,
      cancelled,
      pending,
      activeReservations: this.reservations.size,
      ...this.calendarService.getBookingStats()
    };
  }

  /**
   * Check for booking conflicts
   * @param timeSlot - Time slot to check
   * @param excludeUserId - User ID to exclude from conflict check
   * @returns Conflict status
   */
  public hasBookingConflict(timeSlot: TimeSlot, excludeUserId?: string): boolean {
    // Check calendar service availability
    if (!this.calendarService.isSlotAvailable(timeSlot.id)) {
      return true;
    }

    // Check reservations
    const reservation = this.reservations.get(timeSlot.id);
    if (reservation && reservation.userId !== excludeUserId) {
      return Date.now() < reservation.expiresAt;
    }

    return false;
  }

  /**
   * Validate contact information
   * @param contactInfo - Contact information to validate
   * @returns Validation result
   */
  public validateContactInfo(contactInfo: ContactInfo): ValidationResult {
    const errors: ValidationError[] = [];

    // Name validation
    const sanitizedName = this.sanitizeString(contactInfo.name);
    if (!sanitizedName || sanitizedName.length < 2) {
      errors.push({
        field: 'name',
        type: ValidationErrorType.REQUIRED_FIELD,
        message: 'Name must be at least 2 characters long'
      });
    }

    // Email validation
    const sanitizedEmail = this.sanitizeString(contactInfo.email);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!sanitizedEmail || !emailRegex.test(sanitizedEmail)) {
      errors.push({
        field: 'email',
        type: ValidationErrorType.INVALID_EMAIL,
        message: 'Please enter a valid email address'
      });
    }

    // Phone validation
    const sanitizedPhone = this.sanitizeString(contactInfo.phone);
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = sanitizedPhone.replace(/[\s\-\(\)]/g, '');
    if (!sanitizedPhone || !phoneRegex.test(cleanPhone)) {
      errors.push({
        field: 'phone',
        type: ValidationErrorType.INVALID_PHONE,
        message: 'Please enter a valid phone number'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize contact information
   * @param contactInfo - Raw contact information
   * @returns Sanitized contact information
   */
  private sanitizeContactInfo(contactInfo: ContactInfo): ContactInfo {
    return {
      name: this.sanitizeString(contactInfo.name),
      email: this.sanitizeString(contactInfo.email).toLowerCase(),
      phone: this.sanitizeString(contactInfo.phone)
    };
  }

  /**
   * Sanitize string input
   * @param input - Raw string input
   * @returns Sanitized string
   */
  private sanitizeString(input: string): string {
    if (!input) return '';
    
    return input
      .trim()
      .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
      .substring(0, 255); // Limit length
  }

  /**
   * Generate unique booking ID
   * @returns Unique booking identifier
   */
  private generateBookingId(): string {
    return `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique confirmation ID
   * @returns Unique confirmation identifier
   */
  private generateConfirmationId(): string {
    return `CONF${Date.now().toString().slice(-6)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }

  /**
   * Start periodic cleanup of expired reservations
   */
  private startReservationCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [slotId, reservation] of this.reservations.entries()) {
        if (now >= reservation.expiresAt) {
          this.reservations.delete(slotId);
        }
      }
      this.saveToStorage();
    }, 60000); // Clean up every minute
  }

  /**
   * Save service data to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = {
        bookings: Array.from(this.bookings.entries()),
        reservations: Array.from(this.reservations.entries()),
        timestamp: Date.now()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save booking service data to storage:', error);
    }
  }

  /**
   * Load service data from localStorage
   */
  private loadFromStorage(): void {
    try {
      const savedData = localStorage.getItem(this.STORAGE_KEY);
      if (savedData) {
        const data = JSON.parse(savedData);
        
        // Load bookings
        if (data.bookings) {
          this.bookings = new Map(data.bookings);
        }

        // Load reservations (only if not expired)
        if (data.reservations) {
          const now = Date.now();
          const validReservations = data.reservations.filter(
            ([, reservation]: [string, any]) => now < reservation.expiresAt
          );
          this.reservations = new Map(validReservations);
        }
      }
    } catch (error) {
      console.error('Failed to load booking service data from storage:', error);
    }
  }

  /**
   * Clear all data (useful for testing)
   */
  public clearAllData(): void {
    this.bookings.clear();
    this.reservations.clear();
    this.calendarService.clearBookings();
    this.calendarService.clearReservations();
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Get all bookings (admin function)
   * @returns Array of all bookings
   */
  public getAllBookings(): Booking[] {
    return Array.from(this.bookings.values());
  }
}

export default BookingService;