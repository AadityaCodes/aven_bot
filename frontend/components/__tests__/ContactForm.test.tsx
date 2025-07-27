import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactForm from '../ContactForm';
import { ContactInfo } from '../../src/types/appointment';

// Mock the validation utilities
jest.mock('../../src/utils/validation', () => ({
  validateName: jest.fn(),
  validateEmail: jest.fn(),
  validatePhone: jest.fn(),
  formatPhoneNumber: jest.fn((phone) => phone),
}));

const mockValidation = require('../../src/utils/validation');

describe('ContactForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default mock returns for valid inputs
    mockValidation.validateName.mockReturnValue(null);
    mockValidation.validateEmail.mockReturnValue(null);
    mockValidation.validatePhone.mockReturnValue(null);
  });

  const renderContactForm = (props = {}) => {
    return render(
      <ContactForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        {...props}
      />
    );
  };

  describe('Rendering', () => {
    it('should render all form fields', () => {
      renderContactForm();

      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    });

    it('should render form title and description', () => {
      renderContactForm();

      expect(screen.getByText('Contact Information')).toBeInTheDocument();
      expect(screen.getByText(/please provide your contact details/i)).toBeInTheDocument();
    });

    it('should render submit and cancel buttons', () => {
      renderContactForm();

      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should focus on name input when mounted', () => {
      renderContactForm();

      expect(screen.getByLabelText(/full name/i)).toHaveFocus();
    });
  });

  describe('Initial Values', () => {
    it('should populate fields with initial values', () => {
      const initialValues = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890'
      };

      renderContactForm({ initialValues });

      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1234567890')).toBeInTheDocument();
    });
  });

  describe('Form Input Handling', () => {
    it('should update input values when typing', async () => {
      const user = userEvent.setup();
      renderContactForm();

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const phoneInput = screen.getByLabelText(/phone number/i);

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(phoneInput, '1234567890');

      expect(nameInput).toHaveValue('John Doe');
      expect(emailInput).toHaveValue('john@example.com');
      expect(phoneInput).toHaveValue('1234567890');
    });

    it('should validate fields on blur', async () => {
      const user = userEvent.setup();
      renderContactForm();

      const nameInput = screen.getByLabelText(/full name/i);
      
      await user.type(nameInput, 'John');
      await user.tab(); // Trigger blur

      expect(mockValidation.validateName).toHaveBeenCalledWith('John');
    });

    it('should format phone number on blur', async () => {
      const user = userEvent.setup();
      mockValidation.formatPhoneNumber.mockReturnValue('(123) 456-7890');
      
      renderContactForm();

      const phoneInput = screen.getByLabelText(/phone number/i);
      
      await user.type(phoneInput, '1234567890');
      await user.tab(); // Trigger blur

      expect(mockValidation.formatPhoneNumber).toHaveBeenCalledWith('1234567890');
    });
  });

  describe('Validation and Error Display', () => {
    it('should display validation errors', async () => {
      const user = userEvent.setup();
      mockValidation.validateName.mockReturnValue({
        field: 'name',
        type: 'required_field',
        message: 'Name is required'
      });

      renderContactForm();

      const nameInput = screen.getByLabelText(/full name/i);
      await user.click(nameInput);
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });
    });

    it('should show error icon when field has error', async () => {
      const user = userEvent.setup();
      mockValidation.validateEmail.mockReturnValue({
        field: 'email',
        type: 'invalid_email',
        message: 'Please enter a valid email address'
      });

      renderContactForm();

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'invalid-email');
      await user.tab();

      await waitFor(() => {
        const errorIcon = screen.getByRole('img', { hidden: true });
        expect(errorIcon).toBeInTheDocument();
      });
    });

    it('should validate in real-time after field is touched', async () => {
      const user = userEvent.setup();
      renderContactForm();

      const nameInput = screen.getByLabelText(/full name/i);
      
      // First blur to mark as touched
      await user.click(nameInput);
      await user.tab();

      // Clear previous calls
      mockValidation.validateName.mockClear();

      // Type again - should validate in real-time now
      await user.type(nameInput, 'J');

      expect(mockValidation.validateName).toHaveBeenCalledWith('J');
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      const user = userEvent.setup();
      renderContactForm();

      // Fill out form
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/phone number/i), '1234567890');

      // Submit form
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '1234567890'
        });
      });
    });

    it('should not submit form with validation errors', async () => {
      const user = userEvent.setup();
      mockValidation.validateName.mockReturnValue({
        field: 'name',
        type: 'required_field',
        message: 'Name is required'
      });

      renderContactForm();

      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled();
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });
    });

    it('should focus on first field with error on submission', async () => {
      const user = userEvent.setup();
      mockValidation.validateEmail.mockReturnValue({
        field: 'email',
        type: 'invalid_email',
        message: 'Invalid email'
      });

      renderContactForm();

      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toHaveFocus();
      });
    });

    it('should trim and lowercase email on submission', async () => {
      const user = userEvent.setup();
      renderContactForm();

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), '  JOHN@EXAMPLE.COM  ');
      await user.type(screen.getByLabelText(/phone number/i), '1234567890');

      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '1234567890'
        });
      });
    });
  });

  describe('Form Actions', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderContactForm();

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should call onCancel when Escape key is pressed', async () => {
      const user = userEvent.setup();
      renderContactForm();

      await user.keyboard('{Escape}');

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should disable form when submitting', () => {
      renderContactForm({ isSubmitting: true });

      expect(screen.getByLabelText(/full name/i)).toBeDisabled();
      expect(screen.getByLabelText(/email address/i)).toBeDisabled();
      expect(screen.getByLabelText(/phone number/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('should show loading text when submitting', () => {
      renderContactForm({ isSubmitting: true });

      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.queryByText('Continue')).not.toBeInTheDocument();
    });

    it('should show loading spinner when submitting', () => {
      renderContactForm({ isSubmitting: true });

      const spinner = screen.getByRole('button', { name: /processing/i }).querySelector('svg');
      expect(spinner).toHaveClass('animate-spin');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderContactForm();

      expect(screen.getByLabelText(/full name/i)).toHaveAttribute('aria-invalid', 'false');
      expect(screen.getByLabelText(/email address/i)).toHaveAttribute('aria-invalid', 'false');
      expect(screen.getByLabelText(/phone number/i)).toHaveAttribute('aria-invalid', 'false');
    });

    it('should mark invalid fields with aria-invalid', async () => {
      const user = userEvent.setup();
      mockValidation.validateName.mockReturnValue({
        field: 'name',
        type: 'required_field',
        message: 'Name is required'
      });

      renderContactForm();

      const nameInput = screen.getByLabelText(/full name/i);
      await user.click(nameInput);
      await user.tab();

      await waitFor(() => {
        expect(nameInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should associate error messages with inputs', async () => {
      const user = userEvent.setup();
      mockValidation.validateName.mockReturnValue({
        field: 'name',
        type: 'required_field',
        message: 'Name is required'
      });

      renderContactForm();

      const nameInput = screen.getByLabelText(/full name/i);
      await user.click(nameInput);
      await user.tab();

      await waitFor(() => {
        const errorId = nameInput.getAttribute('aria-describedby');
        expect(errorId).toBeTruthy();
        expect(screen.getByText('Name is required')).toHaveAttribute('id', errorId);
      });
    });

    it('should have proper form validation attributes', () => {
      renderContactForm();

      const form = screen.getByRole('form');
      expect(form).toHaveAttribute('novalidate');
    });
  });
});