import { BookingService } from '../BookingService';
import { CalendarService } from '../CalendarService';
import { BookingStatus, ValidationErrorType } from '../../types/appointment';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock CalendarService
jest.mock('../CalendarService', () => ({
  CalendarService: {
    getInstance: jest.fn()
  }
}));

describe('BookingService', () => {
  let bookingService: BookingService;
  let mockCalendarService: jest.Mocked<CalendarService>;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Create mock calendar service instance
    mockCalendarService = {
      isSlotAvailable: jest.fn().mockReturnValue(true),
      bookSlot: jest.fn().mockReturnValue(true),
      reserveSlot: jest.fn().mockReturnValue(true),
      cancelBooking: jest.fn().mockReturnValue(true),
      clearBookings: jest.fn(),
      clearReservations: jest.fn(),
      getBookingStats: jest.fn().mockReturnValue({
        totalBooked: 0,
        totalReserved: 0,
        totalAvailable: 10
      })
    } as any;

    // Mock the getInstance method to return our mock
    (CalendarService.getInstance as jest.Mock).mockReturnValue(mockCalendarService);
    
    // Reset singleton instance
    (BookingService as any).instance = undefined;
    
    // Create fresh instance
    bookingService = BookingService.getInstance();
  });

  afterEach(() => {
    bookingService.clearAllData();
    jest.clearAllTimers();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = BookingService.getInstance();
      const instance2 = BookingService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Booking Creation', () => {
    const validContactInfo = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890'
    };

    const validTimeSlot = {
      id: 'slot-1',
      date: '2024-01-15',
      startTime: '10:00',
      endTime: '10:30',
      isAvailable: true
    };

    it('should create booking successfully', async () => {
      const result = await bookingService.createBooking(validContactInfo, validTimeSlot, 'user-1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe(validContactInfo.name);
      expect(result.data?.email).toBe(validContactInfo.email);
      expect(result.data?.phone).toBe(validContactInfo.phone);
      expect(result.data?.selectedSlot.id).toBe(validTimeSlot.id);
      expect(result.data?.confirmationId).toMatch(/^CONF\d{6}[A-Z0-9]{4}$/);

      expect(mockCalendarService.isSlotAvailable).toHaveBeenCalledWith(validTimeSlot.id);
      expect(mockCalendarService.bookSlot).toHaveBeenCalledWith(validTimeSlot.id, 'user-1');
    });

    it('should fail when contact info is invalid', async () => {
      const invalidContactInfo = {
        name: 'J',
        email: 'invalid-email',
        phone: 'abc'
      };

      const result = await bookingService.createBooking(invalidContactInfo, validTimeSlot, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
      expect(mockCalendarService.bookSlot).not.toHaveBeenCalled();
    });

    it('should fail when slot is not available', async () => {
      mockCalendarService.isSlotAvailable.mockReturnValue(false);

      const result = await bookingService.createBooking(validContactInfo, validTimeSlot, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Selected time slot is no longer available');
      expect(mockCalendarService.bookSlot).not.toHaveBeenCalled();
    });

    it('should fail when slot is reserved by another user', async () => {
      // First reserve the slot for another user
      bookingService.reserveSlot(validTimeSlot.id, 'user-2');

      const result = await bookingService.createBooking(validContactInfo, validTimeSlot, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Time slot is reserved by another user');
    });

    it('should succeed when slot is reserved by the same user', async () => {
      // Reserve the slot for the same user
      bookingService.reserveSlot(validTimeSlot.id, 'user-1');

      const result = await bookingService.createBooking(validContactInfo, validTimeSlot, 'user-1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should fail when calendar booking fails', async () => {
      mockCalendarService.bookSlot.mockReturnValue(false);

      const result = await bookingService.createBooking(validContactInfo, validTimeSlot, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to book time slot - conflict detected');
    });

    it('should handle unexpected errors', async () => {
      mockCalendarService.isSlotAvailable.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await bookingService.createBooking(validContactInfo, validTimeSlot, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred while creating the booking');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Slot Reservation', () => {
    it('should reserve slot successfully', () => {
      const result = bookingService.reserveSlot('slot-1', 'user-1');

      expect(result).toBe(true);
      expect(mockCalendarService.reserveSlot).toHaveBeenCalledWith('slot-1', 5 * 60 * 1000);
    });

    it('should fail to reserve unavailable slot', () => {
      mockCalendarService.isSlotAvailable.mockReturnValue(false);

      const result = bookingService.reserveSlot('slot-1', 'user-1');

      expect(result).toBe(false);
      expect(mockCalendarService.reserveSlot).not.toHaveBeenCalled();
    });

    it('should fail to reserve slot already reserved by another user', () => {
      // First reservation
      bookingService.reserveSlot('slot-1', 'user-1');

      // Second reservation by different user
      const result = bookingService.reserveSlot('slot-1', 'user-2');

      expect(result).toBe(false);
    });

    it('should allow same user to re-reserve slot', () => {
      // First reservation
      bookingService.reserveSlot('slot-1', 'user-1');

      // Second reservation by same user
      const result = bookingService.reserveSlot('slot-1', 'user-1');

      expect(result).toBe(true);
    });

    it('should fail when calendar service reservation fails', () => {
      mockCalendarService.reserveSlot.mockReturnValue(false);

      const result = bookingService.reserveSlot('slot-1', 'user-1');

      expect(result).toBe(false);
    });
  });

  describe('Reservation Release', () => {
    it('should release reservation successfully', () => {
      bookingService.reserveSlot('slot-1', 'user-1');
      const result = bookingService.releaseReservation('slot-1', 'user-1');

      expect(result).toBe(true);
    });

    it('should fail to release non-existent reservation', () => {
      const result = bookingService.releaseReservation('slot-1', 'user-1');

      expect(result).toBe(false);
    });

    it('should fail to release reservation by wrong user', () => {
      bookingService.reserveSlot('slot-1', 'user-1');
      const result = bookingService.releaseReservation('slot-1', 'user-2');

      expect(result).toBe(false);
    });
  });

  describe('Booking Cancellation', () => {
    it('should cancel booking successfully', async () => {
      const contactInfo = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890'
      };

      const timeSlot = {
        id: 'slot-1',
        date: '2024-01-15',
        startTime: '10:00',
        endTime: '10:30',
        isAvailable: true
      };

      // Create booking first
      const createResult = await bookingService.createBooking(contactInfo, timeSlot, 'user-1');
      expect(createResult.success).toBe(true);

      // Get booking ID from the service
      const userBookings = bookingService.getUserBookings('user-1');
      const bookingId = userBookings[0].id;

      // Cancel booking
      const cancelResult = await bookingService.cancelBooking(bookingId, 'user-1');

      expect(cancelResult).toBe(true);
      expect(mockCalendarService.cancelBooking).toHaveBeenCalledWith('slot-1', 'user-1');

      // Verify booking status is updated
      const booking = bookingService.getBooking(bookingId);
      expect(booking?.status).toBe(BookingStatus.CANCELLED);
    });

    it('should fail to cancel non-existent booking', async () => {
      const result = await bookingService.cancelBooking('non-existent', 'user-1');

      expect(result).toBe(false);
    });

    it('should fail to cancel booking by wrong user', async () => {
      const contactInfo = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890'
      };

      const timeSlot = {
        id: 'slot-1',
        date: '2024-01-15',
        startTime: '10:00',
        endTime: '10:30',
        isAvailable: true
      };

      // Create booking
      const createResult = await bookingService.createBooking(contactInfo, timeSlot, 'user-1');
      expect(createResult.success).toBe(true);

      const userBookings = bookingService.getUserBookings('user-1');
      const bookingId = userBookings[0].id;

      // Try to cancel with wrong user
      const cancelResult = await bookingService.cancelBooking(bookingId, 'user-2');

      expect(cancelResult).toBe(false);
    });
  });

  describe('Booking Retrieval', () => {
    it('should get booking by ID', async () => {
      const contactInfo = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890'
      };

      const timeSlot = {
        id: 'slot-1',
        date: '2024-01-15',
        startTime: '10:00',
        endTime: '10:30',
        isAvailable: true
      };

      const createResult = await bookingService.createBooking(contactInfo, timeSlot, 'user-1');
      expect(createResult.success).toBe(true);

      const userBookings = bookingService.getUserBookings('user-1');
      const bookingId = userBookings[0].id;

      const booking = bookingService.getBooking(bookingId);

      expect(booking).toBeDefined();
      expect(booking?.contactInfo.name).toBe(contactInfo.name);
      expect(booking?.timeSlot.id).toBe(timeSlot.id);
    });

    it('should return null for non-existent booking', () => {
      const booking = bookingService.getBooking('non-existent');

      expect(booking).toBeNull();
    });

    it('should get booking by confirmation ID', async () => {
      const contactInfo = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890'
      };

      const timeSlot = {
        id: 'slot-1',
        date: '2024-01-15',
        startTime: '10:00',
        endTime: '10:30',
        isAvailable: true
      };

      const createResult = await bookingService.createBooking(contactInfo, timeSlot, 'user-1');
      expect(createResult.success).toBe(true);

      const confirmationId = createResult.data!.confirmationId;
      const booking = bookingService.getBookingByConfirmation(confirmationId);

      expect(booking).toBeDefined();
      expect(booking?.confirmationId).toBe(confirmationId);
    });

    it('should get user bookings sorted by creation date', async () => {
      const contactInfo = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890'
      };

      // Create multiple bookings
      await bookingService.createBooking(contactInfo, {
        id: 'slot-1',
        date: '2024-01-15',
        startTime: '10:00',
        endTime: '10:30',
        isAvailable: true
      }, 'user-1');

      await bookingService.createBooking(contactInfo, {
        id: 'slot-2',
        date: '2024-01-15',
        startTime: '11:00',
        endTime: '11:30',
        isAvailable: true
      }, 'user-1');

      const userBookings = bookingService.getUserBookings('user-1');

      expect(userBookings).toHaveLength(2);
      // Should be sorted by creation date (newest first)
      expect(new Date(userBookings[0].createdAt).getTime())
        .toBeGreaterThanOrEqual(new Date(userBookings[1].createdAt).getTime());
    });
  });

  describe('Validation', () => {
    it('should validate valid contact info', () => {
      const validContactInfo = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890'
      };

      const result = bookingService.validateContactInfo(validContactInfo);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate invalid contact info', () => {
      const invalidContactInfo = {
        name: 'J',
        email: 'invalid-email',
        phone: 'abc'
      };

      const result = bookingService.validateContactInfo(invalidContactInfo);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors[0].type).toBe(ValidationErrorType.REQUIRED_FIELD);
      expect(result.errors[1].type).toBe(ValidationErrorType.INVALID_EMAIL);
      expect(result.errors[2].type).toBe(ValidationErrorType.INVALID_PHONE);
    });

    it('should sanitize contact info', async () => {
      const contactInfoWithDangerousChars = {
        name: 'John <script>alert("xss")</script> Doe',
        email: 'JOHN@EXAMPLE.COM',
        phone: '(123) 456-7890'
      };

      const timeSlot = {
        id: 'slot-1',
        date: '2024-01-15',
        startTime: '10:00',
        endTime: '10:30',
        isAvailable: true
      };

      const result = await bookingService.createBooking(contactInfoWithDangerousChars, timeSlot, 'user-1');

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('John scriptalert(xss)/script Doe'); // Dangerous chars removed
      expect(result.data?.email).toBe('john@example.com'); // Lowercase
      expect(result.data?.phone).toBe('(123) 456-7890'); // Phone formatting preserved
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect booking conflicts', () => {
      mockCalendarService.isSlotAvailable.mockReturnValue(false);

      const timeSlot = {
        id: 'slot-1',
        date: '2024-01-15',
        startTime: '10:00',
        endTime: '10:30',
        isAvailable: true
      };

      const hasConflict = bookingService.hasBookingConflict(timeSlot);

      expect(hasConflict).toBe(true);
    });

    it('should detect reservation conflicts', () => {
      mockCalendarService.isSlotAvailable.mockReturnValue(true);
      bookingService.reserveSlot('slot-1', 'user-1');

      const timeSlot = {
        id: 'slot-1',
        date: '2024-01-15',
        startTime: '10:00',
        endTime: '10:30',
        isAvailable: true
      };

      const hasConflict = bookingService.hasBookingConflict(timeSlot, 'user-2');

      expect(hasConflict).toBe(true);
    });

    it('should not detect conflict for same user reservation', () => {
      mockCalendarService.isSlotAvailable.mockReturnValue(true);
      bookingService.reserveSlot('slot-1', 'user-1');

      const timeSlot = {
        id: 'slot-1',
        date: '2024-01-15',
        startTime: '10:00',
        endTime: '10:30',
        isAvailable: true
      };

      const hasConflict = bookingService.hasBookingConflict(timeSlot, 'user-1');

      expect(hasConflict).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should return booking statistics', async () => {
      const contactInfo = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890'
      };

      // Create a booking
      await bookingService.createBooking(contactInfo, {
        id: 'slot-1',
        date: '2024-01-15',
        startTime: '10:00',
        endTime: '10:30',
        isAvailable: true
      }, 'user-1');

      // Reserve a slot
      bookingService.reserveSlot('slot-2', 'user-2');

      const stats = bookingService.getBookingStats();

      expect(stats.total).toBe(1);
      expect(stats.confirmed).toBe(1);
      expect(stats.cancelled).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.activeReservations).toBe(1);
    });
  });

  describe('Data Persistence', () => {
    it('should save data to localStorage', async () => {
      const contactInfo = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890'
      };

      const timeSlot = {
        id: 'slot-1',
        date: '2024-01-15',
        startTime: '10:00',
        endTime: '10:30',
        isAvailable: true
      };

      await bookingService.createBooking(contactInfo, timeSlot, 'user-1');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'booking_service_data',
        expect.stringContaining('"bookings"')
      );
    });

    it('should load data from localStorage', () => {
      const savedData = {
        bookings: [
          ['booking-1', {
            id: 'booking-1',
            contactInfo: { name: 'John Doe', email: 'john@example.com', phone: '1234567890' },
            timeSlot: { id: 'slot-1', date: '2024-01-15', startTime: '10:00', endTime: '10:30', isAvailable: false },
            status: BookingStatus.CONFIRMED,
            createdAt: '2024-01-15T10:00:00.000Z',
            confirmationId: 'CONF123456ABCD'
          }]
        ],
        reservations: [],
        timestamp: Date.now()
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedData));

      // Create new instance to trigger loading
      (BookingService as any).instance = undefined;
      const newService = BookingService.getInstance();

      const booking = newService.getBooking('booking-1');
      expect(booking).toBeDefined();
      expect(booking?.contactInfo.name).toBe('John Doe');
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Create new instance to trigger loading
      (BookingService as any).instance = undefined;
      const newService = BookingService.getInstance();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load booking service data from storage:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Reservation Cleanup', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it.skip('should clean up expired reservations', () => {
      // Reserve a slot
      bookingService.reserveSlot('slot-1', 'user-1');
      
      // Verify reservation exists
      let stats = bookingService.getBookingStats();
      expect(stats.activeReservations).toBe(1);

      // Fast-forward time beyond reservation timeout (5 minutes + buffer)
      jest.advanceTimersByTime(6 * 60 * 1000); // 6 minutes

      // Trigger multiple cleanup intervals to ensure cleanup runs
      jest.advanceTimersByTime(60 * 1000); // First cleanup interval
      jest.advanceTimersByTime(60 * 1000); // Second cleanup interval to be sure

      // Check that reservation was cleaned up
      stats = bookingService.getBookingStats();
      expect(stats.activeReservations).toBe(0);
    });
  });

  describe('Data Management', () => {
    it('should clear all data', async () => {
      const contactInfo = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890'
      };

      const timeSlot = {
        id: 'slot-1',
        date: '2024-01-15',
        startTime: '10:00',
        endTime: '10:30',
        isAvailable: true
      };

      await bookingService.createBooking(contactInfo, timeSlot, 'user-1');
      bookingService.reserveSlot('slot-2', 'user-2');

      bookingService.clearAllData();

      expect(bookingService.getAllBookings()).toEqual([]);
      expect(bookingService.getBookingStats().activeReservations).toBe(0);
      expect(mockCalendarService.clearBookings).toHaveBeenCalled();
      expect(mockCalendarService.clearReservations).toHaveBeenCalled();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('booking_service_data');
    });

    it('should get all bookings', async () => {
      const contactInfo = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890'
      };

      await bookingService.createBooking(contactInfo, {
        id: 'slot-1',
        date: '2024-01-15',
        startTime: '10:00',
        endTime: '10:30',
        isAvailable: true
      }, 'user-1');

      await bookingService.createBooking(contactInfo, {
        id: 'slot-2',
        date: '2024-01-15',
        startTime: '11:00',
        endTime: '11:30',
        isAvailable: true
      }, 'user-2');

      const allBookings = bookingService.getAllBookings();

      expect(allBookings).toHaveLength(2);
    });
  });
});