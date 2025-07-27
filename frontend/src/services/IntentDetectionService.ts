import { IntentDetectionResult, IntentConfidence } from '../types/appointment';

/**
 * Service for detecting appointment booking intent in user messages
 * Implements pattern matching logic with confidence scoring
 */
export class IntentDetectionService {
  /**
   * Array of booking intent keywords and phrases for pattern matching
   * Organized by confidence level for accurate intent detection
   */
  private static readonly BOOKING_INTENT_PHRASES = {
    high: [
      'book an appointment',
      'schedule an appointment',
      'book a call',
      'schedule a call',
      'make an appointment',
      'set up an appointment',
      'arrange an appointment',
      'reserve an appointment'
    ],
    medium: [
      'talk to an agent',
      'speak to an agent',
      'speak with an agent',
      'talk with an agent',
      'contact an agent',
      'reach an agent',
      'get in touch with an agent',
      'connect me to an agent',
      'transfer me to an agent',
      'human agent',
      'live agent',
      'real person',
      'human support',
      'live support'
    ],
    low: [
      'appointment',
      'booking',
      'schedule',
      'call',
      'agent',
      'support',
      'help',
      'assistance',
      'talk',
      'speak',
      'contact',
      'human'
    ]
  };

  /**
   * Detects booking intent in a user message with case-insensitive matching
   * @param message - The user message to analyze
   * @returns boolean indicating if booking intent was detected
   */
  public detectBookingIntent(message: string): boolean {
    const result = this.analyzeIntent(message);
    return result.isBookingIntent;
  }

  /**
   * Gets confidence score for intent detection accuracy
   * @param message - The user message to analyze
   * @returns number between 0 and 1 representing confidence level
   */
  public getConfidenceScore(message: string): number {
    const result = this.analyzeIntent(message);
    
    if (!result.isBookingIntent) {
      return 0.0;
    }
    
    switch (result.confidence) {
      case IntentConfidence.HIGH:
        return 0.9;
      case IntentConfidence.MEDIUM:
        return 0.7;
      case IntentConfidence.LOW:
        return 0.4;
      default:
        return 0.0;
    }
  }

  /**
   * Analyzes message for booking intent with detailed results
   * @param message - The user message to analyze
   * @returns IntentDetectionResult with confidence and matched phrases
   */
  public analyzeIntent(message: string): IntentDetectionResult {
    if (!message || typeof message !== 'string' || !message.trim()) {
      return {
        isBookingIntent: false,
        confidence: IntentConfidence.LOW,
        matchedPhrases: []
      };
    }

    const normalizedMessage = message.toLowerCase().trim();
    const matchedPhrases: string[] = [];
    let highestConfidence = IntentConfidence.LOW;
    let hasMatch = false;

    // Check high confidence phrases first
    for (const phrase of IntentDetectionService.BOOKING_INTENT_PHRASES.high) {
      if (normalizedMessage.includes(phrase.toLowerCase())) {
        matchedPhrases.push(phrase);
        highestConfidence = IntentConfidence.HIGH;
        hasMatch = true;
        break; // Stop at first high confidence match
      }
    }

    // If no high confidence match, check medium confidence phrases
    if (!hasMatch) {
      for (const phrase of IntentDetectionService.BOOKING_INTENT_PHRASES.medium) {
        if (normalizedMessage.includes(phrase.toLowerCase())) {
          matchedPhrases.push(phrase);
          highestConfidence = IntentConfidence.MEDIUM;
          hasMatch = true;
          break; // Stop at first medium confidence match
        }
      }
    }

    // If no medium confidence match, check low confidence phrases
    if (!hasMatch) {
      for (const phrase of IntentDetectionService.BOOKING_INTENT_PHRASES.low) {
        if (normalizedMessage.includes(phrase.toLowerCase())) {
          matchedPhrases.push(phrase);
          highestConfidence = IntentConfidence.LOW;
          hasMatch = true;
          break; // Stop at first low confidence match
        }
      }
    }

    // Additional context-based scoring only for existing matches
    if (hasMatch && highestConfidence !== IntentConfidence.HIGH) {
      // Check for question patterns that indicate booking intent
      if (this.hasBookingQuestionPattern(normalizedMessage)) {
        if (highestConfidence === IntentConfidence.LOW) {
          highestConfidence = IntentConfidence.MEDIUM;
        }
      }

      // Boost confidence if multiple relevant terms are present (but not too aggressively)
      const relevantTermCount = this.countRelevantTerms(normalizedMessage);
      if (relevantTermCount >= 3 && highestConfidence === IntentConfidence.LOW) {
        highestConfidence = IntentConfidence.MEDIUM;
      }
    }

    return {
      isBookingIntent: hasMatch,
      confidence: highestConfidence,
      matchedPhrases
    };
  }

  /**
   * Counts relevant booking-related terms in the message
   * @param normalizedMessage - Lowercase, trimmed message
   * @returns number of relevant terms found
   */
  private countRelevantTerms(normalizedMessage: string): number {
    const allPhrases = [
      ...IntentDetectionService.BOOKING_INTENT_PHRASES.high,
      ...IntentDetectionService.BOOKING_INTENT_PHRASES.medium,
      ...IntentDetectionService.BOOKING_INTENT_PHRASES.low
    ];

    return allPhrases.filter(phrase => 
      normalizedMessage.includes(phrase.toLowerCase())
    ).length;
  }

  /**
   * Checks for question patterns that suggest booking intent
   * @param normalizedMessage - Lowercase, trimmed message
   * @returns boolean indicating if booking question pattern is found
   */
  private hasBookingQuestionPattern(normalizedMessage: string): boolean {
    const questionPatterns = [
      'can i book',
      'how do i book',
      'how to book',
      'when can i',
      'is it possible to',
      'could i schedule',
      'can i schedule',
      'how do i schedule',
      'when is available',
      'what times are',
      'do you have availability'
    ];

    return questionPatterns.some(pattern => 
      normalizedMessage.includes(pattern)
    );
  }

  /**
   * Static factory method to create a new instance
   * @returns new IntentDetectionService instance
   */
  public static create(): IntentDetectionService {
    return new IntentDetectionService();
  }
}

// Export singleton instance for convenience
export const intentDetectionService = IntentDetectionService.create();