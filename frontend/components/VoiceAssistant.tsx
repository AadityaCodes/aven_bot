'use client';
import { useState, useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import AudioVisualization from './AudioVisualization';

interface VoiceAssistantProps {
  setResponse: (response: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<{ role: 'user' | 'bot'; text: string }[]>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  userId: string;
  small?: boolean;
}

// VAPI Widget Configuration - Using the provided widget settings
const VAPI_WIDGET_CONFIG = {
  publicKey: "6cc6066b-fec9-49ea-8dfa-50228c845d8d",
  assistantId: "e52f5a63-330d-4afa-971d-41c8c2c423a3",
  mode: "voice",
  theme: "dark",
  baseBgColor: "#000000",
  accentColor: "#14B8A6",
  ctaButtonColor: "#000000",
  ctaButtonTextColor: "#ffffff",
  borderRadius: "large",
  size: "full",
  position: "bottom-right",
  title: "TALK WITH AI",
  startButtonText: "Start",
  endButtonText: "End Call",
  chatFirstMessage: "Hey, How can I help you today?",
  chatPlaceholder: "Type your message...",
  voiceShowTranscript: "false",
  consentRequired: "false",
  consentTitle: "Terms and conditions",
  consentContent: "By clicking \"Agree,\" and each time I interact with this AI agent, I consent to the recording, storage, and sharing of my communications with third-party service providers, and as otherwise described in our Terms of Service.",
  consentStorageKey: "vapi_widget_consent"
};



// Interface for transcript entries
interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

export default function VoiceAssistant({ setResponse, setMessages, setIsLoading, userId, small }: VoiceAssistantProps) {
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [vapiWidget, setVapiWidget] = useState<any>(null);
  const [voiceActivityLevel, setVoiceActivityLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [audioStream, setAudioStream] = useState<MediaStream | undefined>(undefined);
  const [hasError, setHasError] = useState(false);
  const audioStreamRef = useRef<MediaStream | undefined>(undefined);
  
  // Transcript storage for voice conversations
  const [voiceTranscript, setVoiceTranscript] = useState<TranscriptEntry[]>([]);
  const transcriptBufferRef = useRef<Map<string, TranscriptEntry>>(new Map());

  // Check for existing consent on component mount
  useEffect(() => {
    const existingConsent = localStorage.getItem(VAPI_WIDGET_CONFIG.consentStorageKey);
    if (existingConsent === 'true') {
      setHasConsent(true);
    }
  }, []);

  // Capture user's microphone stream for audio visualization
  const captureAudioStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });
      setAudioStream(stream);
      audioStreamRef.current = stream;
      console.log('Audio stream captured for visualization');
    } catch (error) {
      console.error('Error capturing audio stream:', error);
    }
  };

  // Stop audio stream
  const stopAudioStream = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = undefined;
      setAudioStream(undefined);
      console.log('Audio stream stopped');
    }
  };

  // Function to add transcript entry to buffer
  const addTranscriptEntry = (role: 'user' | 'assistant', text: string, isFinal: boolean = false) => {
    const id = `${role}-${Date.now()}-${Math.random()}`;
    const entry: TranscriptEntry = {
      id,
      role,
      text: text.trim(),
      timestamp: new Date(),
      isFinal
    };

    // Update the buffer
    transcriptBufferRef.current.set(id, entry);

    // If it's a final transcript, consolidate and clean up
    if (isFinal) {
      consolidateTranscripts(role);
    }
  };

  // Function to consolidate fragmented transcripts into complete sentences
  const consolidateTranscripts = (role: 'user' | 'assistant') => {
    const buffer = transcriptBufferRef.current;
    const entries = Array.from(buffer.values())
      .filter(entry => entry.role === role)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (entries.length === 0) return;

    // Combine all text fragments for this role
    const combinedText = entries
      .map(entry => entry.text)
      .join(' ')
      .replace(/\s+/g, ' ') // Remove extra spaces
      .trim();

    // Fix pronunciation errors
    const correctedText = combinedText
      .replace(/\bAvon\b/g, 'Aven')
      .replace(/\bAvan\b/g, 'Aven')
      .replace(/\bavon\b/g, 'aven')
      .replace(/\bavan\b/g, 'aven');

    if (correctedText) {
      // Create final consolidated entry
      const finalEntry: TranscriptEntry = {
        id: `final-${role}-${Date.now()}`,
        role,
        text: correctedText,
        timestamp: entries[0].timestamp, // Use timestamp of first fragment
        isFinal: true
      };

      // Add to transcript and clean up buffer
      setVoiceTranscript(prev => {
        const filtered = prev.filter(entry => entry.role !== role || entry.isFinal);
        return [...filtered, finalEntry].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      });

      // Clear buffer entries for this role
      entries.forEach(entry => buffer.delete(entry.id));
    }
  };

  // Function to display final transcript summary
  const displayTranscriptSummary = () => {
    if (voiceTranscript.length === 0) return;

    // Create a formatted conversation summary
    const conversationSummary = voiceTranscript
      .filter(entry => entry.isFinal && entry.text.length > 0)
      .map(entry => {
        const time = entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const speaker = entry.role === 'user' ? 'You' : 'Aven Assistant';
        return `**${speaker}** (${time}): ${entry.text}`;
      })
      .join('\n\n');

    if (conversationSummary) {
      const summaryMessage = `## Voice Conversation Summary\n\n${conversationSummary}`;
      setMessages((prev) => [...prev, { role: 'bot', text: summaryMessage }]);
    }

    // Clear transcript after displaying
    setVoiceTranscript([]);
    transcriptBufferRef.current.clear();
  };

  // Initialize VAPI client with widget configuration
  useEffect(() => {
    const vapi = new Vapi(VAPI_WIDGET_CONFIG.publicKey);

    vapi.on('call-start', () => {
      console.log('Voice call started');
      setIsActive(true);
      setIsConnecting(false);
      // Capture audio stream when call starts
      captureAudioStream();
    });

    vapi.on('call-end', () => {
      console.log('Voice call ended');
      setIsActive(false);
      setIsSpeaking(false);
      setIsLoading(false);
      setIsConnecting(false);
      // Stop audio stream when call ends
      stopAudioStream();
      // Display transcript summary after call ends
      displayTranscriptSummary();
    });

    vapi.on('speech-start', () => {
      console.log('Assistant started speaking');
      setIsSpeaking(true);
    });

    vapi.on('speech-end', () => {
      console.log('Assistant stopped speaking');
      setIsSpeaking(false);
      setIsLoading(false);
    });

    vapi.on('message', (message) => {
      console.log('VAPI message received:', message);

      // Collect transcripts for conversation summary
      if (message.type === 'transcript') {
        const isFinal = message.transcriptType === 'final' || message.isFinal || false;
        
        if (message.role === 'user') {
          // Collect user transcripts
          addTranscriptEntry('user', message.transcript, isFinal);
          
          // Detect voice activity levels for particle responsiveness
          const transcriptLength = message.transcript?.length || 0;
          if (transcriptLength > 50) {
            setVoiceActivityLevel('high');
          } else if (transcriptLength > 20) {
            setVoiceActivityLevel('medium');
          } else {
            setVoiceActivityLevel('low');
          }
          
          // Reset to medium after a delay
          setTimeout(() => {
            setVoiceActivityLevel('medium');
          }, 2000);
        } else if (message.role === 'assistant') {
          // Collect assistant transcripts
          addTranscriptEntry('assistant', message.transcript, isFinal);
          setIsLoading(false);
        }
      }

      // Handle function calls or other message types
      if (message.type === 'function-call' || message.type === 'assistant-message') {
        console.log('Assistant message received:', message);
      }
    });

    vapi.on('error', (error) => {
      console.error('Vapi error details:', {
        error,
        message: error?.message,
        status: error?.status,
        statusText: error?.statusText,
        response: error?.response
      });

      // Set error state for visual feedback
      setHasError(true);
      
      // Clear error state after recovery period
      setTimeout(() => {
        setHasError(false);
      }, 3000);

      let errorMessage = 'Error in voice processing';

      // Extract detailed error message from VAPI response
      if (error?.error?.error?.message && Array.isArray(error.error.error.message)) {
        errorMessage = `Voice error: ${error.error.error.message.join(', ')}`;
      } else if (error?.error?.error?.message) {
        errorMessage = `Voice error: ${error.error.error.message}`;
      } else if (error?.error?.error === 'Bad Request') {
        errorMessage = 'Voice error: Invalid assistant configuration or request format';
      } else if (error?.message) {
        errorMessage = `Voice error: ${error.message}`;
      } else if (error?.status) {
        errorMessage = `Voice error: ${error.status} - ${error.statusText || 'Unknown error'}`;
      }

      setResponse(errorMessage);
      setMessages((prev) => [...prev, { role: 'bot', text: errorMessage }]);
      setIsLoading(false);
      setIsConnecting(false);
    });

    setVapiWidget(vapi);

    return () => {
      vapi.stop();
    };
  }, [setResponse, setMessages, setIsLoading, userId]);

  const handleConsentAgree = () => {
    localStorage.setItem(VAPI_WIDGET_CONFIG.consentStorageKey, 'true');
    setHasConsent(true);
    setShowConsent(false);
    // Start voice after consent
    startVoiceWithConsent();
  };

  const handleConsentDecline = () => {
    setShowConsent(false);
    setIsConnecting(false);
  };

  const startVoice = async () => {
    // Check if consent is required and not yet given
    if (VAPI_WIDGET_CONFIG.consentRequired && !hasConsent) {
      setShowConsent(true);
      return;
    }

    startVoiceWithConsent();
  };

  const startVoiceWithConsent = async () => {
    try {
      if (!vapiWidget) {
        console.error('VAPI client not initialized');
        setResponse('Voice assistant not ready');
        setMessages((prev) => [...prev, { role: 'bot', text: 'Voice assistant not ready' }]);
        setIsConnecting(false);
        return;
      }

      setIsConnecting(true);
      console.log('Starting Vapi with widget config:', {
        assistantId: VAPI_WIDGET_CONFIG.assistantId,
        title: VAPI_WIDGET_CONFIG.title,
        firstMessage: VAPI_WIDGET_CONFIG.chatFirstMessage,
      });

      // Use the assistant ID from the widget configuration
      await vapiWidget.start(VAPI_WIDGET_CONFIG.assistantId);
    } catch (error) {
      console.error('Error starting Vapi:', error);

      let errorMessage = 'Error starting voice chat';
      if (error instanceof Error) {
        errorMessage = `Voice error: ${error.message}`;
      } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as any;
        if (errorObj.status === 400) {
          errorMessage = 'Invalid assistant configuration. Please check your assistant ID.';
        } else if (errorObj.message) {
          errorMessage = `Voice error: ${errorObj.message}`;
        }
      }

      setResponse(errorMessage);
      setMessages((prev) => [...prev, { role: 'bot', text: errorMessage }]);
      setIsConnecting(false);
    }
  };

  const stopVoice = async () => {
    try {
      if (vapiWidget) {
        await vapiWidget.stop();
      }
    } catch (error) {
      console.error('Error stopping Vapi:', error);
    }
  };

  // Create enhanced ripple effect for orb button
  const createOrbRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    const ripple = document.createElement('span');
    ripple.className = 'orb-ripple-effect';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    button.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 800);
  };

  // Create geometric imploding ripple effect for stop button
  const createGeometricImplodeRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const ripple = document.createElement('span');
    ripple.className = 'geometric-implode-ripple';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    button.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  };

  // Create standard ripple effect for other buttons
  const createRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    button.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  };

  const handleStartVoice = (event: React.MouseEvent<HTMLButtonElement>) => {
    createOrbRipple(event);
    startVoice();
  };

  const handleStopVoice = (event: React.MouseEvent<HTMLButtonElement>) => {
    createGeometricImplodeRipple(event);
    stopVoice();
  };

  return (
    <div className="voice-assistant-container">
      {/* Revolutionary Voice Controls with Advanced 3D Design */}
      <div className="flex gap-4 md:gap-6 items-center justify-center">
        {/* Enhanced Start Voice Button - Floating Orb Design */}
        {!(isActive || isConnecting) && (
          <button
            onClick={handleStartVoice}
            disabled={isActive || isConnecting}
            className={`voice-button-start-orb ${
              small ? 'voice-button-small' : ''
            } ${
              isActive ? `waveform-active voice-activity-${voiceActivityLevel}` : ''
            } ${
              isConnecting ? 'connecting' : ''
            } ${
              isSpeaking ? 'speaking' : ''
            } ${
              hasError ? 'error' : ''
            }`}
            aria-label={isActive ? 'Voice chat is active' : isConnecting ? 'Connecting to voice chat' : 'Start voice chat'}
            style={small ? { width: '2.5rem', height: '2.5rem', minWidth: '2.5rem', minHeight: '2.5rem' } : {}}
          >
            {/* Floating Orb Container */}
            <div className="floating-orb-container" style={small ? { width: '2.5rem', height: '2.5rem' } : {}}>
              {/* Orb Background with Breathing Animation */}
              <div className="orb-background"></div>
              
              {/* Orb Glow Ring */}
              <div className="orb-glow-ring"></div>
              
              {/* Orb Icon Layer */}
              <div className="orb-icon-layer">
                <div className="icon-morphing">
                  {isConnecting ? (
                    <div className="connecting-spinner" style={{ 
                      width: '1.25rem', 
                      height: '1.25rem',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'connecting-spin 1s linear infinite'
                    }}></div>
                  ) : isActive ? (
                    <span>🎵</span>
                  ) : (
                    <span>
                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="10" width="2" height="6" rx="1" fill="#fff"/>
                        <rect x="6" y="6" width="2" height="10" rx="1" fill="#fff"/>
                        <rect x="10" y="2" width="2" height="18" rx="1" fill="#fff"/>
                        <rect x="14" y="6" width="2" height="10" rx="1" fill="#fff"/>
                        <rect x="18" y="10" width="2" height="6" rx="1" fill="#fff"/>
                      </svg>
                    </span>
                  )}
                </div>
              </div>
              
              {/* Real-time Audio Visualization */}
              <AudioVisualization
                isActive={isActive}
                audioStream={audioStream}
                voiceActivityLevel={voiceActivityLevel}
                className="orb-audio-visualization"
              />
              
              {/* Fallback Waveform Visualization for Active State */}
              <div className="orb-waveform-viz">
                <div className="orb-waveform-bar"></div>
                <div className="orb-waveform-bar"></div>
                <div className="orb-waveform-bar"></div>
                <div className="orb-waveform-bar"></div>
                <div className="orb-waveform-bar"></div>
              </div>
            </div>
            
            {/* Micro-particles System */}
            <div className="orb-particles">
              <div className="orb-particle"></div>
              <div className="orb-particle"></div>
              <div className="orb-particle"></div>
              <div className="orb-particle"></div>
              <div className="orb-particle"></div>
              <div className="orb-particle"></div>
              <div className="orb-particle"></div>
              <div className="orb-particle"></div>
            </div>
          </button>
        )}
        {/* Enhanced Stop Voice Button with Geometric Morphing Design */}
        {(isActive || isConnecting) && (
          <button
            onClick={handleStopVoice}
            disabled={!isActive && !isConnecting}
            className={`voice-button-stop-geometric ${
              small ? 'voice-button-small' : ''
            } ${
              isActive || isConnecting ? 'active morphing-to-square' : 'geometric-idle-rotation'
            } ${
              isConnecting ? 'connecting' : ''
            } ${
              isSpeaking ? 'speaking' : ''
            } ${
              hasError ? 'error' : ''
            }`}
            aria-label="Stop voice chat"
            style={small ? { width: '2.5rem', height: '2.5rem', minWidth: '2.5rem', minHeight: '2.5rem' } : {}}
          >
            {/* Geometric Container with Morphing Capabilities */}
            <div className="geometric-container" style={small ? { width: '2.5rem', height: '2.5rem' } : {}}>
              {/* Geometric Background with Edge Lighting */}
              <div className="geometric-background"></div>
              
              {/* Geometric Status Ring */}
              <div className="geometric-status-ring"></div>
              
              {/* Real-time Audio Visualization for Stop Button */}
              <AudioVisualization
                isActive={isActive}
                audioStream={audioStream}
                voiceActivityLevel={voiceActivityLevel}
                className="geometric-audio-visualization"
              />
              
              {/* Geometric Icon Layer */}
              <div className="geometric-icon-layer">
                <div className="geometric-icon-morphing">
                  {isConnecting ? (
                    <div className="connecting-spinner" style={{ 
                      width: '1.25rem', 
                      height: '1.25rem',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'connecting-spin 1s linear infinite'
                    }}></div>
                  ) : (
                    <span>⏹️</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Geometric Particle Dispersion System */}
            <div className="geometric-particles">
              <div className="geometric-particle"></div>
              <div className="geometric-particle"></div>
              <div className="geometric-particle"></div>
              <div className="geometric-particle"></div>
              <div className="geometric-particle"></div>
              <div className="geometric-particle"></div>
              <div className="geometric-particle"></div>
              <div className="geometric-particle"></div>
            </div>
          </button>
        )}
      </div>

      {/* Enhanced Status Indicator */}
      {(isActive || isSpeaking || isConnecting) && (
        <div className="voice-status-container">
          <div className="voice-status-indicator">
            {isConnecting && (
              <div className="status-item status-connecting">
                <div className="status-icon">
                  <div className="connecting-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
                <span className="status-text">Connecting to voice...</span>
              </div>
            )}

            {isActive && !isSpeaking && !isConnecting && (
              <div className="status-item status-listening">
                <div className="status-icon">
                  <div className="listening-indicator">
                    <div className="sound-wave">
                      <span></span>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
                <span className="status-text">Listening for your voice...</span>
              </div>
            )}

            {isSpeaking && (
              <div className="status-item status-speaking">
                <div className="status-icon">
                  <div className="speaking-indicator">
                    <div className="speaking-pulse"></div>
                    🔊
                  </div>
                </div>
                <span className="status-text">Assistant is speaking...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Consent Modal */}
      {showConsent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {VAPI_WIDGET_CONFIG.consentTitle}
              </h3>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl">🎤</span>
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-6 leading-relaxed">
              {VAPI_WIDGET_CONFIG.consentContent}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleConsentDecline}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Decline
              </button>
              <button
                onClick={handleConsentAgree}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-colors"
              >
                Agree
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}