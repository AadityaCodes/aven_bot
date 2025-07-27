import React from 'react';
import { render, renderHook, act } from '@testing-library/react';
import { BookingProvider, useBooking, BookingActionType } from '../BookingContext';
import { BookingModalState, BookingStatus, ValidationErrorType } from '../../types/appointment';

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

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BookingProvider>{children}</BookingProvider>
);

describe('BookingContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useBooking(), { wrapper: TestWrapper });

      expect(result.current.state.currentBooking).toBeNull();
      expect(result.current.state.modalState).toBe(BookingModalState.CLOSED);
      expect(result.current.state.contactInfo).toBeNull();
      expect(result.current.state.selectedSlot).toBeNull();
      expect(result.current.state.bookingHistory).toEqual([]);
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toBeNull();
      expect(result.current.state.validationErrors).toEqual([]);
      expect(result.current.state.reservedSlotId).toBeNull();
      expect(result.current.state.sessionId).toMatch(/^booking_\d+_[a-z0-9]+$/);
    });

    it('should generate unique session IDs', () => {
      // Since we're using a singleton context, we need to test differently
      const { result } = renderHook(() => useBooking(), { wrapper: TestWrapper });
      const sessionId1 = result.current.state.sessionId;
      
      // Reset and create new session
      act(() => {
        result.current.resetBooking();
      });
      
      const sessionId2 = result.current.state.sessionId;
      expect(sessionId1).not.toBe(sessionId2);
    });
  });

  describe('State Persistence', () => {
    it('should load state from localStorage on initialization', () => {
      const savedState = {
        currentBooking: { id: 'test-booking' },
        modalState: BookingModalState.CONTACT_COLLECTION,
        contactInfo: { name: 'John Doe', email: 'john@example.com', phone: '1234567890' },
        selectedSlot: { id: 'slot-1', date: '2024-01-15', startTime: '10:00', endTime: '10:30', isAvailable: true },
        reservedSlotId: 'slot-1',
        sessionId: 'test-session'
      };

      const savedHistory = [
        { id: 'booking-1', status: BookingStatus.CONFIRMED }
      ];

      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(savedState))
        .mockReturnValueOnce(JSON.stringify(savedHistory))
        .mockReturnValueOnce('test-session');

      const { result } = renderHook(() => useBooking(), { wrapper: TestWrapper });

      expect(result.current.state.currentBooking).toEqual(savedState.currentBooking);
      expect(result.current.state.modalState).toBe(BookingModalState.CONTACT_COLLECTION);
      expect(result.current.state.contactInfo).toEqual(savedState.contactInfo);
      expect(result.current.state.selectedSlot).toEqual(savedState.selectedSlot);
      expect(result.current.state.bookingHistory).toEqual(savedHistory);
      expect(result.current.state.sessionId).toBe('test-session');
    });

    it('should save state to localStorage when state changes', () => {
      const { result } = renderHook(() => useBooking(), { wrapper: TestWrapper });

      act(() => {
        result.current.startBooking();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'booking_state',
        expect.stringContaining('"modalState":"contact_collection"')
      );
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock localStorage to throw error before rendering
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const { result } = renderHook(() => useBooking(), { wrapper: TestWrapper });

      expect(result.current.state.modalState).toBe(BookingModalState.CLOSED);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load booking state from storage:',
        expect.any(Error)
      );

      // Restore mocks
      localStorageMock.getItem.mockImplementation(originalGetItem);
      consoleSpy.mockRestore();
    });
  });

  describe('Booking Actions', () => {
    it('should start booking correctly', () => {
      const { result } = renderHook(() => useBooking(), { wrapper: TestWrapper });

      act(() => {
        result.current.startBooking();
      });

      expect(result.current.state.modalState).toBe(BookingModalState.CONTACT_COLLECTION);
      expect(result.current.state.currentBooking).toMatchObject({
        id: expect.stringMatching(/^booking_\d+$/),
        status: BookingStatus.PENDING,
        createdAt: expect.any(String)
      });
      expect(result.current.state.error).toBeNull();
      expect(result.current.state.validationErrors).toEqual([]);
    });

    it('should set contact info with validation', () => {
      const { result } = renderHook(() => useBooking(), { wrapper: TestWrapper });

      const validContactInfo = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890'
      };

      act(() => {
        result.current.startBooking();
        result.current.setContactInfo(validContactInfo);
      });

      expect(result.current.state.contactInfo).toEqual(validContactInfo);
      expect(result.current.state.currentBooking?.contactInfo).toEqual(validContactInfo);
      expect(result.current.state.validationErrors).toEqual([]);
    });

    it('should handle invalid contact info', () => {
      const { result } = renderHook(() => useBooking(), { wrapper: TestWrapper });

      const invalidContactInfo = {
        name: 'J',
        email: 'invalid-email',
        phone: 'invalid-phone'
      };

      act(() => {
        result.current.startBooking();
        result.current.setContactInfo(invalidContactInfo);
      });

      expect(result.current.state.contactInfo).toBeNull();
      expect(result.current.state.validationErrors).toHaveLength(3);
      expect(result.current.state.validationErrors[0].type).toBe(ValidationErrorType.REQUIRED_FIELD);
      expect(result.current.state.validationErrors[1].type).toBe(ValidationErrorType.INVALID_EMAIL);
      expect(result.current.state.validationErrors[2].type).toBe(ValidationErrorType.INVALID_PHONE);
    });

    it('should set selected slot', () => {
      const { result } = renderHook(() => useBooking(), { wrapper: TestWrapper });

      const timeSlot = {
        id: 'slot-1',
        date: '2024-01-15',
        startTime: '10:00',
        endTime: '10:30',
        isAvailable: true
      };

      act(() => {
        result.current.startBooking();
        result.current.setSelectedSlot(timeSlot);
      });

      expect(result.current.state.selectedSlot).toEqual(timeSlot);
      expect(result.current.state.currentBooking?.timeSlot).toEqual(timeSlot);
    });

    it('should complete booking successfully', () => {
      const { result } = renderHook(() => useBooking(), { wrapper: TestWrapper });

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

      act(() => {
        result.current.startBooking();
      });

      act(() => {
        result.current.setContactInfo(contactInfo);
      });

      act(() => {
        result.current.setSelectedSlot(timeSlot);
      });

      act(() => {
        result.current.completeBooking();
      });

      expect(result.current.state.modalState).toBe(BookingModalState.CONFIRMATION);
      expect(result.current.state.currentBooking?.status).toBe(BookingStatus.CONFIRMED);
      expect(result.current.state.currentBooking?.confirmationId).toMatch(/^conf_\d+_[a-z0-9]+$/i);
      expect(result.current.state.bookingHistory).toHaveLength(1);
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toBeNull();
    });

    it('should cancel booking', () => {
      const { result } = renderHook(() => useBooking(), { wrapper: TestWrapper });

      act(() => {
        result.current.startBooking();
        result.current.cancelBooking();
      });

      expect(result.current.state.currentBooking).toBeNull();
      expect(result.current.state.modalState).toBe(BookingModalState.CLOSED);
      expect(result.current.state.contactInfo).toBeNull();
      expect(result.current.state.selectedSlot).toBeNull();
      expect(result.current.state.error).toBeNull();
      expect(result.current.state.validationErrors).toEqual([]);
      expect(result.current.state.reservedSlotId).toBeNull();
    });

    it('should reset booking', () => {
      const { result } = renderHook(() => useBooking(), { wrapper: TestWrapper });

      // Set up some state
      act(() => {
        result.current.startBooking();
        result.current.setContactInfo({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '1234567890'
        });
      });

      const originalHistory = result.current.state.bookingHistory;

      act(() => {
        result.current.resetBooking();
      });

      expect(result.current.state.currentBooking).toBeNull();
      expect(result.current.state.modalState).toBe(BookingModalState.CLOSED);
      expect(result.current.state.contactInfo).toBeNull();
      expect(result.current.state.selectedSlot).toBeNull();
      expect(result.current.state.bookingHistory).toBe(originalHistory); // History should be preserved
      expect(result.current.state.sessionId).toMatch(/^booking_\d+_[a-z0-9]+$/);
    });

    it('should reserve and release slots', () => {
      const { result } = renderHook(() => useBooking(), { wrapper: TestWrapper });

      act(() => {
        result.current.reserveSlot('slot-1');
      });

      expect(result.current.state.reservedSlotId).toBe('slot-1');

      act(() => {
        result.current.releaseSlot();
      });

      expect(result.current.state.reservedSlotId).toBeNull();
    });
  });

  describe('Validation', () => {
    it('should validate contact info correctly', () => {
      const { result } = renderHook(() => useBooking(), { wrapper: TestWrapper });

      const validContactInfo = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890'
      };

      const validationResult = result.current.validateContactInfo(validContactInfo);

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toEqual([]);
    });

    it('should return validation errors for invalid contact info', () => {
      const { result } = renderHook(() => useBooking(), { wrapper: TestWrapper });

      const invalidContactInfo = {
        name: '',
        email: 'invalid',
        phone: 'abc'
      };

      const validationResult = result.current.validateContactInfo(invalidContactInfo);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when useBooking is used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useBooking());
      }).toThrow('useBooking must be used within a BookingProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('State Transitions', () => {
    it('should handle modal state transitions correctly', () => {
      const { result } = renderHook(() => useBooking(), { wrapper: TestWrapper });

      act(() => {
        result.current.dispatch({
          type: BookingActionType.SET_MODAL_STATE,
          payload: BookingModalState.CALENDAR_SELECTION
        });
      });

      expect(result.current.state.modalState).toBe(BookingModalState.CALENDAR_SELECTION);
    });

    it('should handle loading states', () => {
      const { result } = renderHook(() => useBooking(), { wrapper: TestWrapper });

      act(() => {
        result.current.dispatch({
          type: BookingActionType.SET_LOADING,
          payload: true
        });
      });

      expect(result.current.state.isLoading).toBe(true);

      act(() => {
        result.current.dispatch({
          type: BookingActionType.SET_ERROR,
          payload: 'Test error'
        });
      });

      expect(result.current.state.error).toBe('Test error');
      expect(result.current.state.isLoading).toBe(false);
    });
  });
});