import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { 
  Booking, 
  BookingStatus, 
  ContactInfo, 
  TimeSlot, 
  BookingModalState,
  ValidationResult,
  ValidationError,
  ValidationErrorType
} from '../types/appointment';

// Booking state interface
export interface BookingState {
  currentBooking: Partial<Booking> | null;
  modalState: BookingModalState;
  contactInfo: ContactInfo | null;
  selectedSlot: TimeSlot | null;
  bookingHistory: Booking[];
  isLoading: boolean;
  error: string | null;
  validationErrors: ValidationError[];
  reservedSlotId: string | null;
  sessionId: string;
}

// Action types for booking state management
export enum BookingActionType {
  START_BOOKING = 'START_BOOKING',
  SET_MODAL_STATE = 'SET_MODAL_STATE',
  SET_CONTACT_INFO = 'SET_CONTACT_INFO',
  SET_SELECTED_SLOT = 'SET_SELECTED_SLOT',
  SET_LOADING = 'SET_LOADING',
  SET_ERROR = 'SET_ERROR',
  SET_VALIDATION_ERRORS = 'SET_VALIDATION_ERRORS',
  COMPLETE_BOOKING = 'COMPLETE_BOOKING',
  CANCEL_BOOKING = 'CANCEL_BOOKING',
  RESET_BOOKING = 'RESET_BOOKING',
  LOAD_FROM_STORAGE = 'LOAD_FROM_STORAGE',
  ADD_TO_HISTORY = 'ADD_TO_HISTORY',
  RESERVE_SLOT = 'RESERVE_SLOT',
  RELEASE_SLOT = 'RELEASE_SLOT'
}

// Action interfaces
export interface BookingAction {
  type: BookingActionType;
  payload?: any;
}

// Initial state
const initialState: BookingState = {
  currentBooking: null,
  modalState: BookingModalState.CLOSED,
  contactInfo: null,
  selectedSlot: null,
  bookingHistory: [],
  isLoading: false,
  error: null,
  validationErrors: [],
  reservedSlotId: null,
  sessionId: generateSessionId()
};

// Generate unique session ID
function generateSessionId(): string {
  return `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Booking reducer
function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case BookingActionType.START_BOOKING:
      return {
        ...state,
        modalState: BookingModalState.CONTACT_COLLECTION,
        currentBooking: {
          id: `booking_${Date.now()}`,
          status: BookingStatus.PENDING,
          createdAt: new Date().toISOString()
        },
        error: null,
        validationErrors: []
      };

    case BookingActionType.SET_MODAL_STATE:
      return {
        ...state,
        modalState: action.payload
      };

    case BookingActionType.SET_CONTACT_INFO:
      return {
        ...state,
        contactInfo: action.payload,
        currentBooking: state.currentBooking ? {
          ...state.currentBooking,
          contactInfo: action.payload
        } : null
      };

    case BookingActionType.SET_SELECTED_SLOT:
      return {
        ...state,
        selectedSlot: action.payload,
        currentBooking: state.currentBooking ? {
          ...state.currentBooking,
          timeSlot: action.payload
        } : null
      };

    case BookingActionType.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    case BookingActionType.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case BookingActionType.SET_VALIDATION_ERRORS:
      return {
        ...state,
        validationErrors: action.payload
      };

    case BookingActionType.COMPLETE_BOOKING:
      const completedBooking = {
        ...state.currentBooking,
        ...action.payload,
        status: BookingStatus.CONFIRMED,
        confirmationId: `conf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
      } as Booking;

      return {
        ...state,
        currentBooking: completedBooking,
        modalState: BookingModalState.CONFIRMATION,
        bookingHistory: [...state.bookingHistory, completedBooking],
        isLoading: false,
        error: null
      };

    case BookingActionType.CANCEL_BOOKING:
      return {
        ...state,
        currentBooking: null,
        modalState: BookingModalState.CLOSED,
        contactInfo: null,
        selectedSlot: null,
        error: null,
        validationErrors: [],
        reservedSlotId: null
      };

    case BookingActionType.RESET_BOOKING:
      return {
        ...initialState,
        bookingHistory: state.bookingHistory,
        sessionId: generateSessionId()
      };

    case BookingActionType.LOAD_FROM_STORAGE:
      return {
        ...state,
        ...action.payload
      };

    case BookingActionType.ADD_TO_HISTORY:
      return {
        ...state,
        bookingHistory: [...state.bookingHistory, action.payload]
      };

    case BookingActionType.RESERVE_SLOT:
      return {
        ...state,
        reservedSlotId: action.payload
      };

    case BookingActionType.RELEASE_SLOT:
      return {
        ...state,
        reservedSlotId: null
      };

    default:
      return state;
  }
}

// Context interface
interface BookingContextType {
  state: BookingState;
  dispatch: React.Dispatch<BookingAction>;
  startBooking: () => void;
  setContactInfo: (contactInfo: ContactInfo) => void;
  setSelectedSlot: (slot: TimeSlot) => void;
  completeBooking: () => void;
  cancelBooking: () => void;
  resetBooking: () => void;
  validateContactInfo: (contactInfo: ContactInfo) => ValidationResult;
  reserveSlot: (slotId: string) => void;
  releaseSlot: () => void;
}

// Create context
const BookingContext = createContext<BookingContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  BOOKING_STATE: 'booking_state',
  BOOKING_HISTORY: 'booking_history',
  SESSION_ID: 'booking_session_id'
};

// Provider component
interface BookingProviderProps {
  children: ReactNode;
}

export const BookingProvider: React.FC<BookingProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(bookingReducer, initialState);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEYS.BOOKING_STATE);
    const savedHistory = localStorage.getItem(STORAGE_KEYS.BOOKING_HISTORY);
    const savedSessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);

    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        const parsedHistory = savedHistory ? JSON.parse(savedHistory) : [];
        
        dispatch({
          type: BookingActionType.LOAD_FROM_STORAGE,
          payload: {
            ...parsedState,
            bookingHistory: parsedHistory,
            sessionId: savedSessionId || generateSessionId(),
            isLoading: false // Reset loading state on reload
          }
        });
      } catch (error) {
        console.error('Failed to load booking state from storage:', error);
      }
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      currentBooking: state.currentBooking,
      modalState: state.modalState,
      contactInfo: state.contactInfo,
      selectedSlot: state.selectedSlot,
      reservedSlotId: state.reservedSlotId,
      sessionId: state.sessionId
    };

    localStorage.setItem(STORAGE_KEYS.BOOKING_STATE, JSON.stringify(stateToSave));
    localStorage.setItem(STORAGE_KEYS.BOOKING_HISTORY, JSON.stringify(state.bookingHistory));
    localStorage.setItem(STORAGE_KEYS.SESSION_ID, state.sessionId);
  }, [state]);

  // Action creators
  const startBooking = () => {
    dispatch({ type: BookingActionType.START_BOOKING });
  };

  const setContactInfo = (contactInfo: ContactInfo) => {
    const validationResult = validateContactInfo(contactInfo);
    
    if (validationResult.isValid) {
      dispatch({ type: BookingActionType.SET_CONTACT_INFO, payload: contactInfo });
      dispatch({ type: BookingActionType.SET_VALIDATION_ERRORS, payload: [] });
    } else {
      dispatch({ type: BookingActionType.SET_VALIDATION_ERRORS, payload: validationResult.errors });
    }
  };

  const setSelectedSlot = (slot: TimeSlot) => {
    dispatch({ type: BookingActionType.SET_SELECTED_SLOT, payload: slot });
  };

  const completeBooking = () => {
    if (state.currentBooking && state.contactInfo && state.selectedSlot) {
      dispatch({
        type: BookingActionType.COMPLETE_BOOKING,
        payload: {
          contactInfo: state.contactInfo,
          timeSlot: state.selectedSlot
        }
      });
    }
  };

  const cancelBooking = () => {
    dispatch({ type: BookingActionType.CANCEL_BOOKING });
  };

  const resetBooking = () => {
    dispatch({ type: BookingActionType.RESET_BOOKING });
  };

  const reserveSlot = (slotId: string) => {
    dispatch({ type: BookingActionType.RESERVE_SLOT, payload: slotId });
  };

  const releaseSlot = () => {
    dispatch({ type: BookingActionType.RELEASE_SLOT });
  };

  // Validation function
  const validateContactInfo = (contactInfo: ContactInfo): ValidationResult => {
    const errors: ValidationError[] = [];

    // Name validation
    if (!contactInfo.name || contactInfo.name.trim().length < 2) {
      errors.push({
        field: 'name',
        type: ValidationErrorType.REQUIRED_FIELD,
        message: 'Name must be at least 2 characters long'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!contactInfo.email || !emailRegex.test(contactInfo.email)) {
      errors.push({
        field: 'email',
        type: ValidationErrorType.INVALID_EMAIL,
        message: 'Please enter a valid email address'
      });
    }

    // Phone validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = contactInfo.phone.replace(/[\s\-\(\)]/g, '');
    if (!contactInfo.phone || !phoneRegex.test(cleanPhone)) {
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
  };

  const contextValue: BookingContextType = {
    state,
    dispatch,
    startBooking,
    setContactInfo,
    setSelectedSlot,
    completeBooking,
    cancelBooking,
    resetBooking,
    validateContactInfo,
    reserveSlot,
    releaseSlot
  };

  return (
    <BookingContext.Provider value={contextValue}>
      {children}
    </BookingContext.Provider>
  );
};

// Custom hook to use booking context
export const useBooking = (): BookingContextType => {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};

export default BookingContext;