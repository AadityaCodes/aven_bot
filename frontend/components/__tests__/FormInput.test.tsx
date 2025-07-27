import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormInput from '../FormInput';
import { ValidationErrorType } from '../../src/types/appointment';

describe('FormInput', () => {
  const defaultProps = {
    label: 'Test Label',
    value: '',
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render label and input', () => {
      render(<FormInput {...defaultProps} />);

      expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render required indicator when required', () => {
      render(<FormInput {...defaultProps} required />);

      expect(screen.getByText('*')).toBeInTheDocument();
      expect(screen.getByText('*')).toHaveAttribute('aria-label', 'required');
    });

    it('should render help text when provided', () => {
      render(<FormInput {...defaultProps} helpText="This is help text" />);

      expect(screen.getByText('This is help text')).toBeInTheDocument();
    });

    it('should generate proper input ID from label', () => {
      render(<FormInput {...defaultProps} label="Full Name" />);

      const input = screen.getByLabelText('Full Name');
      expect(input).toHaveAttribute('id', 'input-full-name');
    });

    it('should use provided ID when given', () => {
      render(<FormInput {...defaultProps} id="custom-id" />);

      const input = screen.getByLabelText('Test Label');
      expect(input).toHaveAttribute('id', 'custom-id');
    });
  });

  describe('Error States', () => {
    const mockError = {
      field: 'test',
      type: ValidationErrorType.REQUIRED_FIELD,
      message: 'This field is required'
    };

    it('should not show error when not touched', () => {
      render(
        <FormInput 
          {...defaultProps} 
          error={mockError}
          touched={false}
        />
      );

      expect(screen.queryByText('This field is required')).not.toBeInTheDocument();
      expect(screen.getByRole('textbox')).not.toHaveClass('border-red-400');
    });

    it('should show error when touched and has error', () => {
      render(
        <FormInput 
          {...defaultProps} 
          error={mockError}
          touched={true}
        />
      );

      expect(screen.getByText('This field is required')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveClass('border-red-400');
    });

    it('should show error icon when has error', () => {
      render(
        <FormInput 
          {...defaultProps} 
          error={mockError}
          touched={true}
        />
      );

      const errorIcon = screen.getByRole('textbox').parentElement?.querySelector('svg');
      expect(errorIcon).toBeInTheDocument();
      expect(errorIcon).toHaveClass('text-red-400');
    });

    it('should hide help text when showing error', () => {
      render(
        <FormInput 
          {...defaultProps} 
          error={mockError}
          touched={true}
          helpText="This is help text"
        />
      );

      expect(screen.getByText('This field is required')).toBeInTheDocument();
      expect(screen.queryByText('This is help text')).not.toBeInTheDocument();
    });

    it('should show help text when no error', () => {
      render(
        <FormInput 
          {...defaultProps} 
          error={null}
          touched={true}
          helpText="This is help text"
        />
      );

      expect(screen.getByText('This is help text')).toBeInTheDocument();
      expect(screen.queryByText('This field is required')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    const mockError = {
      field: 'test',
      type: ValidationErrorType.REQUIRED_FIELD,
      message: 'This field is required'
    };

    it('should have proper aria-invalid attribute', () => {
      const { rerender } = render(
        <FormInput 
          {...defaultProps} 
          error={null}
          touched={false}
        />
      );

      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'false');

      rerender(
        <FormInput 
          {...defaultProps} 
          error={mockError}
          touched={true}
        />
      );

      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('should associate error message with input via aria-describedby', () => {
      render(
        <FormInput 
          {...defaultProps} 
          error={mockError}
          touched={true}
        />
      );

      const input = screen.getByRole('textbox');
      const errorMessage = screen.getByText('This field is required');
      
      expect(input).toHaveAttribute('aria-describedby', 'input-test-label-error');
      expect(errorMessage).toHaveAttribute('id', 'input-test-label-error');
    });

    it('should associate help text with input via aria-describedby', () => {
      render(
        <FormInput 
          {...defaultProps} 
          helpText="This is help text"
        />
      );

      const input = screen.getByRole('textbox');
      const helpText = screen.getByText('This is help text');
      
      expect(input).toHaveAttribute('aria-describedby', 'input-test-label-help');
      expect(helpText).toHaveAttribute('id', 'input-test-label-help');
    });

    it('should have error message with role="alert"', () => {
      render(
        <FormInput 
          {...defaultProps} 
          error={mockError}
          touched={true}
        />
      );

      const errorMessage = screen.getByText('This field is required');
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });

    it('should properly associate label with input', () => {
      render(<FormInput {...defaultProps} />);

      const label = screen.getByText('Test Label');
      const input = screen.getByRole('textbox');
      
      expect(label).toHaveAttribute('for', input.getAttribute('id'));
    });
  });

  describe('Input Behavior', () => {
    it('should call onChange when input value changes', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();
      
      render(<FormInput {...defaultProps} onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'test');

      expect(mockOnChange).toHaveBeenCalledTimes(4); // Once for each character
    });

    it('should forward all input props', () => {
      render(
        <FormInput 
          {...defaultProps} 
          placeholder="Enter text"
          disabled={true}
          maxLength={10}
          type="email"
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('placeholder', 'Enter text');
      expect(input).toBeDisabled();
      expect(input).toHaveAttribute('maxlength', '10');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('should apply custom className', () => {
      render(<FormInput {...defaultProps} className="custom-class" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class');
    });

    it('should be disabled when disabled prop is true', () => {
      render(<FormInput {...defaultProps} disabled />);

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });
  });

  describe('Focus Management', () => {
    it('should forward ref to input element', () => {
      const ref = React.createRef<HTMLInputElement>();
      
      render(<FormInput {...defaultProps} ref={ref} />);

      expect(ref.current).toBe(screen.getByRole('textbox'));
    });

    it('should have proper focus styles', () => {
      render(<FormInput {...defaultProps} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500/50');
    });

    it('should have error focus styles when has error', () => {
      const mockError = {
        field: 'test',
        type: ValidationErrorType.REQUIRED_FIELD,
        message: 'This field is required'
      };

      render(
        <FormInput 
          {...defaultProps} 
          error={mockError}
          touched={true}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('focus:border-red-400', 'focus:ring-red-500/50');
    });
  });

  describe('Visual Styling', () => {
    it('should have proper base styling classes', () => {
      render(<FormInput {...defaultProps} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass(
        'w-full',
        'px-4',
        'py-3',
        'rounded-lg',
        'bg-white/10',
        'backdrop-blur-md',
        'border',
        'transition-all',
        'duration-300',
        'text-white',
        'placeholder-white/60'
      );
    });

    it('should have error styling when has error', () => {
      const mockError = {
        field: 'test',
        type: ValidationErrorType.REQUIRED_FIELD,
        message: 'This field is required'
      };

      render(
        <FormInput 
          {...defaultProps} 
          error={mockError}
          touched={true}
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-red-400');
    });

    it('should have normal border when no error', () => {
      render(<FormInput {...defaultProps} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-white/20');
    });
  });
});