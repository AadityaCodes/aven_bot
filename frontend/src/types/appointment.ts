// Core data models and types for appointment booking feature

/**
 * Represents a time slot for appointment booking
 */
export interface TimeSlot {
  id: string;
  date: string; // YYYY-MM-DD format
  startTime: string; // HH:MM format (24-hour)
  endTime: string; // HH:MM format (24-hour)
  isAvailable: boolean;
  bookedBy?: string; // User identifier if booked
}

/**
 * Contact information for appointment booking
 */
export interface ContactInfo {
  name: string;
  phone: string;
  email: string;
}

/**
 * Booking confirmation details
 */
export interface BookingConfirmation {
  name: string;
  phone: string;
  email: string;
  selectedSlot: TimeSlot;
  confirmationId: string;
}

/**
 * Complete booking record
 */
export interface Booking {
  id: string;
  contactInfo: ContactInfo;
  timeSlot: TimeSlot;
  status: BookingStatus;
  createdAt: string; // ISO 8601 timestamp
  confirmationId: string;
}

/**
 * Booking status enumeration
 */
export enum BookingStatus {
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  PENDING = 'pending'
}

/**
 * Validation error types for form handling
 */
export enum ValidationErrorType {
  REQUIRED_FIELD = 'required_field',
  INVALID_EMAIL = 'invalid_email',
  INVALID_PHONE = 'invalid_phone',
  INVALID_NAME = 'invalid_name',
  SLOT_UNAVAILABLE = 'slot_unavailable',
  BOOKING_CONFLICT = 'booking_conflict'
}

/**
 * Form validation error structure
 */
export interface ValidationError {
  field: string;
  type: ValidationErrorType;
  message: string;
}

/**
 * Form validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * API response wrapper for booking operations
 */
export interface BookingApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Available time slots API response
 */
export interface AvailableSlotsResponse extends BookingApiResponse<TimeSlot[]> {}

/**
 * Booking creation API response
 */
export interface CreateBookingResponse extends BookingApiResponse<BookingConfirmation> {}

/**
 * Booking modal state enumeration
 */
export enum BookingModalState {
  CONTACT_COLLECTION = 'contact_collection',
  CALENDAR_SELECTION = 'calendar_selection',
  CONFIRMATION = 'confirmation',
  CLOSED = 'closed'
}

/**
 * Intent detection confidence levels
 */
export enum IntentConfidence {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

/**
 * Intent detection result
 */
export interface IntentDetectionResult {
  isBookingIntent: boolean;
  confidence: IntentConfidence;
  matchedPhrases: string[];
}