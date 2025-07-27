import { 
  validateName, 
  validateEmail, 
  validatePhone, 
  formatPhoneNumber, 
  validateContactForm 
} from '../validation';
import { ValidationErrorType } from '../../types/appointment';

describe('validateName', () => {
  it('should return null for valid names', () => {
    expect(validateName('John Doe')).toBeNull();
    expect(validateName('Mary-Jane Smith')).toBeNull();
    expect(validateName("O'Connor")).toBeNull();
    expect(validateName('Jean-Luc')).toBeNull();
    expect(validateName('A B')).toBeNull(); // Minimum 2 characters
  });

  it('should return error for empty name', () => {
    const result = validateName('');
    expect(result).toEqual({
      field: 'name',
      type: ValidationErrorType.REQUIRED_FIELD,
      message: 'Name is required'
    });
  });

  it('should return error for whitespace-only name', () => {
    const result = validateName('   ');
    expect(result).toEqual({
      field: 'name',
      type: ValidationErrorType.REQUIRED_FIELD,
      message: 'Name is required'
    });
  });

  it('should return error for name too short', () => {
    const result = validateName('A');
    expect(result).toEqual({
      field: 'name',
      type: ValidationErrorType.INVALID_NAME,
      message: 'Name must be at least 2 characters long'
    });
  });

  it('should return error for name too long', () => {
    const longName = 'A'.repeat(51);
    const result = validateName(longName);
    expect(result).toEqual({
      field: 'name',
      type: ValidationErrorType.INVALID_NAME,
      message: 'Name must be less than 50 characters'
    });
  });

  it('should return error for invalid characters', () => {
    expect(validateName('John123')).toEqual({
      field: 'name',
      type: ValidationErrorType.INVALID_NAME,
      message: 'Name can only contain letters, spaces, hyphens, and apostrophes'
    });

    expect(validateName('John@Doe')).toEqual({
      field: 'name',
      type: ValidationErrorType.INVALID_NAME,
      message: 'Name can only contain letters, spaces, hyphens, and apostrophes'
    });
  });

  it('should trim whitespace before validation', () => {
    expect(validateName('  John Doe  ')).toBeNull();
  });
});

describe('validateEmail', () => {
  it('should return null for valid emails', () => {
    expect(validateEmail('test@example.com')).toBeNull();
    expect(validateEmail('user.name@domain.co.uk')).toBeNull();
    expect(validateEmail('user+tag@example.org')).toBeNull();
    expect(validateEmail('user_name@example-domain.com')).toBeNull();
  });

  it('should return error for empty email', () => {
    const result = validateEmail('');
    expect(result).toEqual({
      field: 'email',
      type: ValidationErrorType.REQUIRED_FIELD,
      message: 'Email is required'
    });
  });

  it('should return error for whitespace-only email', () => {
    const result = validateEmail('   ');
    expect(result).toEqual({
      field: 'email',
      type: ValidationErrorType.REQUIRED_FIELD,
      message: 'Email is required'
    });
  });

  it('should return error for invalid email formats', () => {
    const invalidEmails = [
      'invalid-email',
      '@example.com',
      'user@',
      'user@domain',
      'user.domain.com',
      'user@domain.',
      'user@.com',
      'user name@example.com',
      'user@exam ple.com'
    ];

    invalidEmails.forEach(email => {
      expect(validateEmail(email)).toEqual({
        field: 'email',
        type: ValidationErrorType.INVALID_EMAIL,
        message: 'Please enter a valid email address'
      });
    });
  });

  it('should trim whitespace before validation', () => {
    expect(validateEmail('  test@example.com  ')).toBeNull();
  });
});

describe('validatePhone', () => {
  it('should return null for valid phone numbers', () => {
    expect(validatePhone('1234567890')).toBeNull();
    expect(validatePhone('(123) 456-7890')).toBeNull();
    expect(validatePhone('123-456-7890')).toBeNull();
    expect(validatePhone('123.456.7890')).toBeNull();
    expect(validatePhone('+1 123 456 7890')).toBeNull();
    expect(validatePhone('123 456 7890')).toBeNull();
  });

  it('should return error for empty phone', () => {
    const result = validatePhone('');
    expect(result).toEqual({
      field: 'phone',
      type: ValidationErrorType.REQUIRED_FIELD,
      message: 'Phone number is required'
    });
  });

  it('should return error for whitespace-only phone', () => {
    const result = validatePhone('   ');
    expect(result).toEqual({
      field: 'phone',
      type: ValidationErrorType.REQUIRED_FIELD,
      message: 'Phone number is required'
    });
  });

  it('should return error for phone too short', () => {
    const result = validatePhone('123456789'); // 9 digits
    expect(result).toEqual({
      field: 'phone',
      type: ValidationErrorType.INVALID_PHONE,
      message: 'Please enter a valid phone number (e.g., (123) 456-7890)'
    });
  });

  it('should return error for phone too long', () => {
    const result = validatePhone('1234567890123456'); // 16 digits
    expect(result).toEqual({
      field: 'phone',
      type: ValidationErrorType.INVALID_PHONE,
      message: 'Please enter a valid phone number (e.g., (123) 456-7890)'
    });
  });

  it('should return error for invalid phone formats', () => {
    const invalidPhones = [
      'abc-def-ghij',
      '123-456-abcd',
      '(123) 456-abcd'
    ];

    invalidPhones.forEach(phone => {
      const result = validatePhone(phone);
      expect(result).not.toBeNull();
      expect(result?.field).toBe('phone');
      expect(result?.type).toBe(ValidationErrorType.INVALID_PHONE);
    });

    // Test specific cases that should fail format validation
    expect(validatePhone('abc-def-ghij')).toEqual({
      field: 'phone',
      type: ValidationErrorType.INVALID_PHONE,
      message: 'Please enter a valid phone number (e.g., (123) 456-7890)'
    });
  });

  it('should trim whitespace before validation', () => {
    expect(validatePhone('  1234567890  ')).toBeNull();
  });
});

describe('formatPhoneNumber', () => {
  it('should format 10-digit numbers correctly', () => {
    expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
    expect(formatPhoneNumber('123-456-7890')).toBe('(123) 456-7890');
    expect(formatPhoneNumber('(123) 456-7890')).toBe('(123) 456-7890');
  });

  it('should format 11-digit numbers starting with 1', () => {
    expect(formatPhoneNumber('11234567890')).toBe('+1 (123) 456-7890');
    expect(formatPhoneNumber('1-123-456-7890')).toBe('+1 (123) 456-7890');
  });

  it('should return original for other formats', () => {
    expect(formatPhoneNumber('123456789')).toBe('123456789'); // Too short
    expect(formatPhoneNumber('123456789012')).toBe('123456789012'); // Too long
    expect(formatPhoneNumber('21234567890')).toBe('21234567890'); // Doesn't start with 1
  });

  it('should handle numbers with various separators', () => {
    expect(formatPhoneNumber('123.456.7890')).toBe('(123) 456-7890');
    expect(formatPhoneNumber('123 456 7890')).toBe('(123) 456-7890');
  });
});

describe('validateContactForm', () => {
  it('should return valid for all valid inputs', () => {
    const result = validateContactForm('John Doe', 'john@example.com', '1234567890');
    expect(result.isValid).toBe(true);
    expect(result.errors.name).toBeNull();
    expect(result.errors.email).toBeNull();
    expect(result.errors.phone).toBeNull();
  });

  it('should return invalid with errors for invalid inputs', () => {
    const result = validateContactForm('', 'invalid-email', '123');
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toEqual({
      field: 'name',
      type: ValidationErrorType.REQUIRED_FIELD,
      message: 'Name is required'
    });
    expect(result.errors.email).toEqual({
      field: 'email',
      type: ValidationErrorType.INVALID_EMAIL,
      message: 'Please enter a valid email address'
    });
    expect(result.errors.phone).toEqual({
      field: 'phone',
      type: ValidationErrorType.INVALID_PHONE,
      message: 'Please enter a valid phone number (e.g., (123) 456-7890)'
    });
  });

  it('should return mixed results for partially valid inputs', () => {
    const result = validateContactForm('John Doe', 'invalid-email', '1234567890');
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeNull();
    expect(result.errors.email).toEqual({
      field: 'email',
      type: ValidationErrorType.INVALID_EMAIL,
      message: 'Please enter a valid email address'
    });
    expect(result.errors.phone).toBeNull();
  });
});