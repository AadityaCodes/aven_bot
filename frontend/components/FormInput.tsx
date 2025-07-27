'use client';
import React, { forwardRef } from 'react';
import { ValidationError } from '../src/types/appointment';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: ValidationError | null;
  touched?: boolean;
  required?: boolean;
  helpText?: string;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, touched, required, helpText, className = '', ...props }, ref) => {
    const hasError = touched && error;
    const inputId = props.id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;

    return (
      <div className="w-full">
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-white mb-2"
        >
          {label}
          {required && <span className="text-red-400 ml-1" aria-label="required">*</span>}
        </label>
        
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full px-4 py-3 rounded-lg
              bg-white/10 backdrop-blur-md
              border transition-all duration-300
              text-white placeholder-white/60
              focus:outline-none focus:ring-2 focus:ring-blue-500/50
              disabled:opacity-50 disabled:cursor-not-allowed
              ${hasError 
                ? 'border-red-400 focus:border-red-400 focus:ring-red-500/50' 
                : 'border-white/20 focus:border-blue-400'
              }
              ${className}
            `}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={
              hasError ? `${inputId}-error` : 
              helpText ? `${inputId}-help` : undefined
            }
            {...props}
          />
          
          {hasError && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg 
                className="h-5 w-5 text-red-400" 
                fill="currentColor" 
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path 
                  fillRule="evenodd" 
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
                  clipRule="evenodd" 
                />
              </svg>
            </div>
          )}
        </div>

        {hasError && (
          <p 
            id={`${inputId}-error`}
            className="mt-2 text-sm text-red-400 flex items-center gap-1"
            role="alert"
          >
            <svg 
              className="h-4 w-4 flex-shrink-0" 
              fill="currentColor" 
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path 
                fillRule="evenodd" 
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
                clipRule="evenodd" 
              />
            </svg>
            {error.message}
          </p>
        )}

        {helpText && !hasError && (
          <p 
            id={`${inputId}-help`}
            className="mt-2 text-sm text-white/70"
          >
            {helpText}
          </p>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

export default FormInput;