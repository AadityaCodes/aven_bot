'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ContactInfo, ValidationError } from '../src/types/appointment';
import { validateName, validateEmail, validatePhone, formatPhoneNumber } from '../src/utils/validation';
import FormInput from './FormInput';

interface ContactFormProps {
  onSubmit: (contactInfo: ContactInfo) => void;
  onCancel: () => void;
  initialValues?: Partial<ContactInfo>;
  isSubmitting?: boolean;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
}

interface FormErrors {
  name: ValidationError | null;
  email: ValidationError | null;
  phone: ValidationError | null;
}

interface FormTouched {
  name: boolean;
  email: boolean;
  phone: boolean;
}

const ContactForm: React.FC<ContactFormProps> = ({
  onSubmit,
  onCancel,
  initialValues = {},
  isSubmitting = false
}) => {
  const [formState, setFormState] = useState<FormState>({
    name: initialValues.name || '',
    email: initialValues.email || '',
    phone: initialValues.phone || ''
  });

  const [errors, setErrors] = useState<FormErrors>({
    name: null,
    email: null,
    phone: null
  });

  const [touched, setTouched] = useState<FormTouched>({
    name: false,
    email: false,
    phone: false
  });

  // Refs for form inputs to manage focus
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Focus on first input when component mounts
  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, []);

  // Real-time validation function
  const validateField = useCallback((field: keyof FormState, value: string): ValidationError | null => {
    switch (field) {
      case 'name':
        return validateName(value);
      case 'email':
        return validateEmail(value);
      case 'phone':
        return validatePhone(value);
      default:
        return null;
    }
  }, []);

  // Handle input changes with real-time validation
  const handleInputChange = useCallback((field: keyof FormState) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      
      // Update form state
      setFormState(prev => ({
        ...prev,
        [field]: value
      }));

      // Validate field if it has been touched
      if (touched[field]) {
        const fieldError = validateField(field, value);
        setErrors(prev => ({
          ...prev,
          [field]: fieldError
        }));
      }
    };
  }, [touched, validateField]);

  // Handle input blur (mark field as touched and validate)
  const handleInputBlur = useCallback((field: keyof FormState) => {
    return () => {
      setTouched(prev => ({
        ...prev,
        [field]: true
      }));

      const fieldError = validateField(field, formState[field]);
      setErrors(prev => ({
        ...prev,
        [field]: fieldError
      }));
    };
  }, [formState, validateField]);

  // Handle phone number formatting on blur
  const handlePhoneBlur = useCallback(() => {
    handleInputBlur('phone')();
    
    // Format phone number for better UX
    if (formState.phone && !errors.phone) {
      const formatted = formatPhoneNumber(formState.phone);
      setFormState(prev => ({
        ...prev,
        phone: formatted
      }));
    }
  }, [formState.phone, errors.phone, handleInputBlur]);

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      name: true,
      email: true,
      phone: true
    });

    // Validate all fields
    const nameError = validateField('name', formState.name);
    const emailError = validateField('email', formState.email);
    const phoneError = validateField('phone', formState.phone);

    const newErrors = {
      name: nameError,
      email: emailError,
      phone: phoneError
    };

    setErrors(newErrors);

    // Check if form is valid
    const isValid = !nameError && !emailError && !phoneError;

    if (isValid) {
      const contactInfo: ContactInfo = {
        name: formState.name.trim(),
        email: formState.email.trim().toLowerCase(),
        phone: formState.phone.trim()
      };
      
      onSubmit(contactInfo);
    } else {
      // Focus on first field with error
      if (nameError && nameInputRef.current) {
        nameInputRef.current.focus();
      } else if (emailError && emailInputRef.current) {
        emailInputRef.current.focus();
      } else if (phoneError && phoneInputRef.current) {
        phoneInputRef.current.focus();
      }
    }
  }, [formState, validateField, onSubmit]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  }, [onCancel]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="glass-morphism-strong rounded-xl p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">
            Contact Information
          </h2>
          <p className="text-white/80 text-sm">
            Please provide your contact details so we can reach you for your appointment.
          </p>
        </div>

        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate>
          <div className="space-y-4">
            <FormInput
              ref={nameInputRef}
              label="Full Name"
              type="text"
              value={formState.name}
              onChange={handleInputChange('name')}
              onBlur={handleInputBlur('name')}
              error={errors.name}
              touched={touched.name}
              required
              disabled={isSubmitting}
              placeholder="Enter your full name"
              autoComplete="name"
              maxLength={50}
            />

            <FormInput
              ref={emailInputRef}
              label="Email Address"
              type="email"
              value={formState.email}
              onChange={handleInputChange('email')}
              onBlur={handleInputBlur('email')}
              error={errors.email}
              touched={touched.email}
              required
              disabled={isSubmitting}
              placeholder="Enter your email address"
              autoComplete="email"
              helpText="We'll use this to send you appointment confirmations"
            />

            <FormInput
              ref={phoneInputRef}
              label="Phone Number"
              type="tel"
              value={formState.phone}
              onChange={handleInputChange('phone')}
              onBlur={handlePhoneBlur}
              error={errors.phone}
              touched={touched.phone}
              required
              disabled={isSubmitting}
              placeholder="(123) 456-7890"
              autoComplete="tel"
              helpText="We'll call you at this number for your appointment"
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="
                flex-1 px-4 py-3 rounded-lg
                bg-white/10 hover:bg-white/20
                border border-white/20 hover:border-white/30
                text-white font-medium
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-white/50
              "
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="
                flex-1 px-4 py-3 rounded-lg
                bg-blue-600 hover:bg-blue-700
                border border-blue-500 hover:border-blue-600
                text-white font-medium
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-blue-500/50
                flex items-center justify-center gap-2
              "
            >
              {isSubmitting ? (
                <>
                  <svg 
                    className="animate-spin h-4 w-4" 
                    fill="none" 
                    viewBox="0 0 24 24"
                  >
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                    />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing...
                </>
              ) : (
                'Continue'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactForm;