import { ValidationError, ValidationErrorType } from '../types/appointment';

/**
 * Email validation regex pattern
 * Validates standard email format with proper domain structure
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Phone number validation regex pattern
 * Supports various formats: (123) 456-7890, 123-456-7890, 123.456.7890, 1234567890
 */
const PHONE_REGEX = /^[\+]?[1-9]?[\-\.\s]?\(?[0-9]{3}\)?[\-\.\s]?[0-9]{3}[\-\.\s]?[0-9]{4}$/;

/**
 * Name validation regex pattern
 * Allows letters, spaces, hyphens, and apostrophes
 */
const NAME_REGEX = /^[a-zA-Z\s\-']{2,50}$/;

/**
 * Validates a name field
 */
export const validateName = (name: string): ValidationError | null => {
  const trimmedName = name.trim();
  
  if (!trimmedName) {
    return {
      field: 'name',
      type: ValidationErrorType.REQUIRED_FIELD,
      message: 'Name is required'
    };
  }
  
  if (trimmedName.length < 2) {
    return {
      field: 'name',
      type: ValidationErrorType.INVALID_NAME,
      message: 'Name must be at least 2 characters long'
    };
  }
  
  if (trimmedName.length > 50) {
    return {
      field: 'name',
      type: ValidationErrorType.INVALID_NAME,
      message: 'Name must be less than 50 characters'
    };
  }
  
  if (!NAME_REGEX.test(trimmedName)) {
    return {
      field: 'name',
      type: ValidationErrorType.INVALID_NAME,
      message: 'Name can only contain letters, spaces, hyphens, and apostrophes'
    };
  }
  
  return null;
};

/**
 * Validates an email field
 */
export const validateEmail = (email: string): ValidationError | null => {
  const trimmedEmail = email.trim();
  
  if (!trimmedEmail) {
    return {
      field: 'email',
      type: ValidationErrorType.REQUIRED_FIELD,
      message: 'Email is required'
    };
  }
  
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return {
      field: 'email',
      type: ValidationErrorType.INVALID_EMAIL,
      message: 'Please enter a valid email address'
    };
  }
  
  return null;
};

/**
 * Validates a phone number field
 */
export const validatePhone = (phone: string): ValidationError | null => {
  const trimmedPhone = phone.trim();
  
  if (!trimmedPhone) {
    return {
      field: 'phone',
      type: ValidationErrorType.REQUIRED_FIELD,
      message: 'Phone number is required'
    };
  }
  
  // First check if it matches the expected format pattern
  if (!PHONE_REGEX.test(trimmedPhone)) {
    return {
      field: 'phone',
      type: ValidationErrorType.INVALID_PHONE,
      message: 'Please enter a valid phone number (e.g., (123) 456-7890)'
    };
  }
  
  // Remove all non-digit characters for length check
  const digitsOnly = trimmedPhone.replace(/\D/g, '');
  
  if (digitsOnly.length < 10) {
    return {
      field: 'phone',
      type: ValidationErrorType.INVALID_PHONE,
      message: 'Phone number must be at least 10 digits'
    };
  }
  
  if (digitsOnly.length > 15) {
    return {
      field: 'phone',
      type: ValidationErrorType.INVALID_PHONE,
      message: 'Phone number must be less than 15 digits'
    };
  }
  
  return null;
};

/**
 * Formats a phone number for display
 */
export const formatPhoneNumber = (phone: string): string => {
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length === 10) {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  }
  
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+1 (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
  }
  
  return phone;
};

/**
 * Validates all contact form fields
 */
export const validateContactForm = (name: string, email: string, phone: string) => {
  const errors = {
    name: validateName(name),
    email: validateEmail(email),
    phone: validatePhone(phone)
  };
  
  const isValid = !errors.name && !errors.email && !errors.phone;
  
  return {
    isValid,
    errors
  };
};