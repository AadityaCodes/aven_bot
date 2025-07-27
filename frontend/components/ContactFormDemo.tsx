'use client';
import React, { useState } from 'react';
import ContactForm from './ContactForm';
import { ContactInfo } from '../src/types/appointment';

const ContactFormDemo: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [submittedData, setSubmittedData] = useState<ContactInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (contactInfo: ContactInfo) => {
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setSubmittedData(contactInfo);
    setIsSubmitting(false);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const handleReset = () => {
    setSubmittedData(null);
    setIsOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          Contact Form Demo
        </h1>
        
        {!isOpen && !submittedData && (
          <div className="text-center">
            <button
              onClick={() => setIsOpen(true)}
              className="
                px-6 py-3 rounded-lg
                bg-blue-600 hover:bg-blue-700
                text-white font-medium
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500/50
              "
            >
              Open Contact Form
            </button>
          </div>
        )}

        {isOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-md">
              <ContactForm
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>
        )}

        {submittedData && (
          <div className="max-w-md mx-auto">
            <div className="glass-morphism-strong rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Form Submitted Successfully!
              </h2>
              
              <div className="space-y-3 mb-6">
                <div>
                  <span className="text-white/70 text-sm">Name:</span>
                  <p className="text-white font-medium">{submittedData.name}</p>
                </div>
                
                <div>
                  <span className="text-white/70 text-sm">Email:</span>
                  <p className="text-white font-medium">{submittedData.email}</p>
                </div>
                
                <div>
                  <span className="text-white/70 text-sm">Phone:</span>
                  <p className="text-white font-medium">{submittedData.phone}</p>
                </div>
              </div>

              <button
                onClick={handleReset}
                className="
                  w-full px-4 py-3 rounded-lg
                  bg-green-600 hover:bg-green-700
                  text-white font-medium
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-green-500/50
                "
              >
                Test Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactFormDemo;