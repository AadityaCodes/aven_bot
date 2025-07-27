'use client';
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import VoiceAssistant from './VoiceAssistant';
import AppointmentBookingModal from './AppointmentBookingModal';
import { intentDetectionService } from '../src/services/IntentDetectionService';
import { BookingConfirmation } from '../src/types/appointment';
import { JSX } from 'react/jsx-runtime';

// Function to format message text with markdown-style formatting
const formatMessageText = (text: string) => {
  // Split text into lines for processing
  const lines = text.split('\n');
  const formattedElements: JSX.Element[] = [];
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) {
      formattedElements.push(<br key={`br-${index}`} />);
      return;
    }
    
    // Handle bullet points (*, -, •)
    if (trimmedLine.match(/^[\*\-•]\s+/)) {
      const bulletContent = trimmedLine.replace(/^[\*\-•]\s+/, '');
      formattedElements.push(
        <div key={index} className="flex items-start gap-2 mb-2">
          <span className="text-blue-300 font-bold mt-1">•</span>
          <span dangerouslySetInnerHTML={{ __html: formatInlineText(bulletContent) }} />
        </div>
      );
      return;
    }
    
    // Handle numbered items (1., 2., etc.)
    if (trimmedLine.match(/^\d+\.\s+/)) {
      const numberMatch = trimmedLine.match(/^(\d+)\.\s+(.+)/);
      if (numberMatch) {
        const [, number, content] = numberMatch;
        formattedElements.push(
          <div key={index} className="flex items-start gap-2 mb-2">
            <span className="text-blue-300 font-bold mt-1">{number}.</span>
            <span dangerouslySetInnerHTML={{ __html: formatInlineText(content) }} />
          </div>
        );
        return;
      }
    }
    
    // Handle headers (lines ending with :)
    if (trimmedLine.endsWith(':') && trimmedLine.length > 1) {
      formattedElements.push(
        <div key={index} className="font-bold text-blue-200 mb-2 mt-3">
          {trimmedLine}
        </div>
      );
      return;
    }
    
    // Regular paragraph
    formattedElements.push(
      <div key={index} className="mb-2" dangerouslySetInnerHTML={{ __html: formatInlineText(trimmedLine) }} />
    );
  });
  
  return <div>{formattedElements}</div>;
};

// Function to format inline text (bold, italic, etc.)
const formatInlineText = (text: string) => {
  return text
    // Fix pronunciation errors - replace Avon/Avan with Aven
    .replace(/\bAvon\b/g, 'Aven')
    .replace(/\bAvan\b/g, 'Aven')
    .replace(/\bavon\b/g, 'aven')
    .replace(/\bavan\b/g, 'aven')
    // Bold text (**text** or __text__)
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
    .replace(/__(.*?)__/g, '<strong class="font-bold text-white">$1</strong>')
    // Italic text (*text* or _text_)
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(/_(.*?)_/g, '<em class="italic">$1</em>')
    // Code text (`text`)
    .replace(/`(.*?)`/g, '<code class="bg-black/20 px-1 py-0.5 rounded text-blue-200 font-mono text-sm">$1</code>')
    // Links [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-300 underline hover:text-blue-200" target="_blank" rel="noopener noreferrer">$1</a>');
};

export default function ChatInterface() {
  const [query, setQuery] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([]);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [isBookingMode, setIsBookingMode] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (response) {
      setMessages((prev) => [...prev, { role: 'bot', text: response }]);
      setIsLoading(false);
    }
  }, [response]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async () => {
    if (!query) return;
    
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: 'user', text: query }]);
    
    try {
      // Check for booking intent before processing the message
      const hasBookingIntent = intentDetectionService.detectBookingIntent(query);
      
      // If booking intent is detected, trigger booking modal
      if (hasBookingIntent) {
        setIsBookingMode(true);
        setIsBookingModalOpen(true);
        setIsLoading(false);
        setQuery('');
        return;
      }
    } catch (error) {
      console.error('Intent detection failed:', error);
      // Continue with normal message processing if intent detection fails
    }
    
    try {
      const res = await axios.post(process.env.NEXT_PUBLIC_FLASK_API_URL!, {
        prompt: query,
        user_id: 'user-id', // Replace with actual user ID
      });
      setResponse(res.data.response);
      setFeedback(null);
    } catch (error) {
      setResponse('Error fetching response from the server');
    }
    setQuery('');
  };

  const submitFeedback = async (type: 'positive' | 'negative') => {
    setFeedback(type);
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_FLASK_API_URL}/feedback`, {
        prompt: messages[messages.length - 2]?.text || query,
        response,
        feedback: type,
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  // Handle booking modal close
  const handleBookingModalClose = () => {
    setIsBookingModalOpen(false);
    setIsBookingMode(false);
  };

  // Handle booking completion
  const handleBookingComplete = (booking: BookingConfirmation) => {
    // Add confirmation message to chat
    const confirmationMessage = `Great! Your appointment has been booked for ${booking.selectedSlot.date} at ${booking.selectedSlot.startTime}. Confirmation ID: ${booking.confirmationId}. We look forward to talking with you!`;
    
    setMessages((prev) => [...prev, { role: 'bot', text: confirmationMessage }]);
    
    // Close modal and reset booking mode
    setIsBookingModalOpen(false);
    setIsBookingMode(false);
  };

  return (
    <div className="h-screen dynamic-background flex items-start justify-center pt-2 px-4 md:pt-3 md:px-6 lg:pt-4 lg:px-8">
      {/* Main Chat Container - Properly sized and positioned */}
      <div className="w-full max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl glass-morphism-strong rounded-3xl shadow-2xl flex flex-col @container animate-scale-in" style={{ height: 'calc(100vh - 1rem)' }}>

        {/* Header Section */}
        <div className="flex items-center gap-3 px-4 py-4 md:px-6 md:py-5 lg:px-8 lg:py-6 border-b border-white/20 rounded-t-3xl relative overflow-hidden" style={{ background: '#23272f' }}>
          {/* Header background animation overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 animate-pulse-glow"></div>

          {/* Enhanced Avatar Container with Dynamic State Indicators */}
          <div className="relative z-10 avatar-container">
            <div className={`avatar-wrapper ${isLoading ? 'avatar-thinking' : 'avatar-idle'}`}>
              <img
                src={`/aven-ally-${isLoading ? 'typing' : 'idle'}.gif`}
                alt="Aven Assistant"
                className="avatar-image"
                role="img"
                aria-label={`Aven is currently ${isLoading ? 'thinking and processing your request' : 'ready to help you'}`}
              />
              {/* Dynamic Status Indicator */}
              <div className={`avatar-status-indicator ${isLoading ? 'status-active' : 'status-idle'}`} aria-hidden="true">
                <div className="status-dot"></div>
              </div>
              {/* Animated Ring for Enhanced Visual Appeal */}
              <div className={`avatar-ring ${isLoading ? 'ring-active' : 'ring-idle'}`} aria-hidden="true"></div>
            </div>
          </div>

          {/* Enhanced Typography and Visual Hierarchy */}
          <div className="relative z-10 header-content">
            <h1 className="header-title">
              Aven
              <span className="title-accent" aria-hidden="true"></span>
            </h1>
            <div className="header-subtitle-container">
              <p className={`header-subtitle ${isLoading ? 'subtitle-active' : 'subtitle-idle'}`}>
                <span className="status-icon" aria-hidden="true">
                  {isBookingMode ? '📅' : isLoading ? '🧠' : '💬'}
                </span>
                <span className="status-text">
                  {isBookingMode ? 'Booking Mode Active' : isLoading ? 'Thinking...' : 'Your AI Assistant'}
                </span>
              </p>
              {/* Subtle progress indicator when loading */}
              {isLoading && (
                <div className="thinking-indicator" aria-hidden="true">
                  <div className="thinking-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
              {/* Booking mode indicator */}
              {isBookingMode && (
                <div className="booking-indicator" aria-hidden="true">
                  <div className="text-xs text-blue-200 mt-1 animate-pulse">
                    Complete your booking to continue chatting
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Area - Flexible height with enhanced message display */}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 glass-morphism-subtle chat-area chat-scroll">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full animate-slide-up">
              <div className="text-center text-gray-400 responsive-text-sm">
                <div className="mb-2 text-2xl md:text-3xl lg:text-4xl">💬</div>
                <div>Ask me anything about Aven!</div>
                <div className="text-xs md:text-sm mt-2 opacity-75">Start a conversation to get help with your questions</div>
              </div>
            </div>
          )}
          
          {/* Enhanced Message Display with Glass-morphism and Animations */}
          {messages.map((msg, idx) => {
            const isConsecutive = idx > 0 && messages[idx - 1].role === msg.role;
            const messageDate = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return (
              <div
                key={idx}
                className={`message-container ${msg.role} ${isConsecutive ? 'grouped' : ''} ${
                  msg.role === 'user' ? 'animate-message-user' : 'animate-message-bot'
                }`}
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="message-wrapper">
                  <div
                    className={`rounded-2xl px-4 py-3 md:px-5 md:py-4 lg:px-6 lg:py-5 ${
                      msg.role === 'user'
                        ? 'message-bubble-user rounded-br-none'
                        : 'message-bubble-bot rounded-bl-none'
                    }`}
                  >
                    <div className="message-text">
                      {msg.role === 'bot' ? formatMessageText(msg.text) : msg.text}
                    </div>
                    
                    {/* Message timestamp - appears on hover */}
                    <div className="message-timestamp">
                      {messageDate}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Loading indicator with enhanced animation */}
          {isLoading && (
            <div className="message-container bot animate-message-bot">
              <div className="message-wrapper">
                <div className="message-bubble-bot rounded-2xl px-4 py-3 md:px-5 md:py-4 lg:px-6 lg:py-5 rounded-bl-none">
                  <div className="message-text flex items-center gap-2">
                    <span>Thinking</span>
                    <div className="thinking-dots">
                      <span className="animate-typing"></span>
                      <span className="animate-typing" style={{ animationDelay: '0.2s' }}></span>
                      <span className="animate-typing" style={{ animationDelay: '0.4s' }}></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Input Section */}
        <div className="px-4 py-4 md:px-6 md:py-5 lg:px-8 lg:py-6 border-t border-white/20 glass-morphism-subtle rounded-b-3xl flex flex-col gap-3">
          {/* Input Controls */}
          <div className="flex gap-2 md:gap-3 items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 p-3 md:p-4 rounded-2xl input-enhanced shadow-sm text-sm md:text-base placeholder:text-gray-400"
              placeholder="Type your message..."
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              disabled={isLoading}
            />
            <div className="flex-shrink-0">
              <VoiceAssistant
                setResponse={setResponse}
                setMessages={setMessages}
                setIsLoading={setIsLoading}
                userId="user-id"
                small
              />
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Booking Modal */}
      <AppointmentBookingModal
        isOpen={isBookingModalOpen}
        onClose={handleBookingModalClose}
        onComplete={handleBookingComplete}
      />
    </div>
  );
}