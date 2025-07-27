// Utility types for form validation and API responses

import { ValidationError } from './appointment';

/**
 * Generic form field configuration
 */
export interface FormField<T = string> {
  name: string;
  value: T;
  required: boolean;
  validator?: (value: T) => ValidationError | null;
}

/**
 * Form state management utility type
 */
export interface FormState<T extends Record<string, any>> {
  values: T;
  errors: Record<keyof T, ValidationError | null>;
  touched: Record<keyof T, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
}

/**
 * Form field validation function type
 */
export type FieldValidator<T = string> = (value: T) => ValidationError | null;

/**
 * Contact form specific field validators
 */
export interface ContactFormValidators {
  name: FieldValidator<string>;
  email: FieldValidator<string>;
  phone: FieldValidator<string>;
}

/**
 * Generic API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

/**
 * API request status enumeration
 */
export enum ApiRequestStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error'
}

/**
 * Generic API request state
 */
export interface ApiRequestState<T = any> {
  status: ApiRequestStatus;
  data: T | null;
  error: ApiError | null;
}

/**
 * Async operation result utility type
 */
export type AsyncResult<T, E = ApiError> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};

/**
 * Time slot filtering options
 */
export interface SlotFilterOptions {
  date?: string; // YYYY-MM-DD format
  startTime?: string; // HH:MM format
  endTime?: string; // HH:MM format
  availableOnly?: boolean;
}

/**
 * Booking search criteria
 */
export interface BookingSearchCriteria {
  email?: string;
  phone?: string;
  dateRange?: {
    start: string; // YYYY-MM-DD
    end: string; // YYYY-MM-DD
  };
  status?: string[];
}

/**
 * Pagination utility type
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}