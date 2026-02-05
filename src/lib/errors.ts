 /**
  * Centralized Error Handling System
  * Provides standardized error classes for consistent error handling across the app
  */
 
 // Error codes for categorization and i18n
 export const ERROR_CODES = {
   // Network errors
   NETWORK_OFFLINE: 'NETWORK_OFFLINE',
   NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
   NETWORK_UNKNOWN: 'NETWORK_UNKNOWN',
   
   // Validation errors
   VALIDATION_REQUIRED: 'VALIDATION_REQUIRED',
   VALIDATION_FORMAT: 'VALIDATION_FORMAT',
   VALIDATION_RANGE: 'VALIDATION_RANGE',
   
   // Auth errors
   AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
   AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
   AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
   AUTH_RATE_LIMITED: 'AUTH_RATE_LIMITED',
   
   // Payment errors
   PAYMENT_FAILED: 'PAYMENT_FAILED',
   PAYMENT_CANCELED: 'PAYMENT_CANCELED',
   PAYMENT_EXPIRED: 'PAYMENT_EXPIRED',
   
   // Analysis errors
   ANALYSIS_RATE_LIMITED: 'ANALYSIS_RATE_LIMITED',
   ANALYSIS_FAILED: 'ANALYSIS_FAILED',
   ANALYSIS_TIMEOUT: 'ANALYSIS_TIMEOUT',
   
   // General errors
   UNKNOWN: 'UNKNOWN',
 } as const;
 
 export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
 
 /**
  * Base error class for all Quantis errors
  */
 export class QuantisError extends Error {
   public readonly code: ErrorCode;
   public readonly userMessage: string;
   public readonly technical?: string;
   public readonly recoverable: boolean;
   public readonly timestamp: Date;
 
   constructor(
     code: ErrorCode,
     userMessage: string,
     options?: {
       technical?: string;
       recoverable?: boolean;
       cause?: Error;
     }
   ) {
     super(userMessage);
     this.name = 'QuantisError';
     this.code = code;
     this.userMessage = userMessage;
     this.technical = options?.technical;
     this.recoverable = options?.recoverable ?? false;
     this.timestamp = new Date();
     
     // Maintain proper stack trace for where error was thrown
     if (Error.captureStackTrace) {
       Error.captureStackTrace(this, QuantisError);
     }
   }
 
   toJSON() {
     return {
       name: this.name,
       code: this.code,
       userMessage: this.userMessage,
       technical: this.technical,
       recoverable: this.recoverable,
       timestamp: this.timestamp.toISOString(),
     };
   }
 }
 
 /**
  * Network-related errors
  */
 export class NetworkError extends QuantisError {
   constructor(
     userMessage: string,
     options?: {
       code?: ErrorCode;
       technical?: string;
       cause?: Error;
     }
   ) {
     super(
       options?.code ?? ERROR_CODES.NETWORK_UNKNOWN,
       userMessage,
       { recoverable: true, ...options }
     );
     this.name = 'NetworkError';
   }
 
   static offline() {
     return new NetworkError(
       'You appear to be offline. Please check your connection.',
       { code: ERROR_CODES.NETWORK_OFFLINE }
     );
   }
 
   static timeout() {
     return new NetworkError(
       'Request timed out. Please try again.',
       { code: ERROR_CODES.NETWORK_TIMEOUT }
     );
   }
 }
 
 /**
  * Validation errors
  */
 export class ValidationError extends QuantisError {
   public readonly field?: string;
 
   constructor(
     userMessage: string,
     options?: {
       code?: ErrorCode;
       field?: string;
       technical?: string;
     }
   ) {
     super(
       options?.code ?? ERROR_CODES.VALIDATION_FORMAT,
       userMessage,
       { recoverable: true, ...options }
     );
     this.name = 'ValidationError';
     this.field = options?.field;
   }
 
   static required(field: string) {
     return new ValidationError(
       `${field} is required.`,
       { code: ERROR_CODES.VALIDATION_REQUIRED, field }
     );
   }
 
   static format(field: string, expected: string) {
     return new ValidationError(
       `${field} must be ${expected}.`,
       { code: ERROR_CODES.VALIDATION_FORMAT, field }
     );
   }
 }
 
 /**
  * Authentication errors
  */
 export class AuthError extends QuantisError {
   constructor(
     userMessage: string,
     options?: {
       code?: ErrorCode;
       technical?: string;
     }
   ) {
     super(
       options?.code ?? ERROR_CODES.AUTH_UNAUTHORIZED,
       userMessage,
       { recoverable: true, ...options }
     );
     this.name = 'AuthError';
   }
 
   static invalidCredentials() {
     return new AuthError(
       'Invalid email or password.',
       { code: ERROR_CODES.AUTH_INVALID_CREDENTIALS }
     );
   }
 
   static sessionExpired() {
     return new AuthError(
       'Your session has expired. Please sign in again.',
       { code: ERROR_CODES.AUTH_SESSION_EXPIRED }
     );
   }
 
   static rateLimited(retryAfter?: number) {
     const message = retryAfter
       ? `Too many attempts. Please try again in ${retryAfter} seconds.`
       : 'Too many attempts. Please try again later.';
     return new AuthError(message, { code: ERROR_CODES.AUTH_RATE_LIMITED });
   }
 }
 
 /**
  * Payment/subscription errors
  */
 export class PaymentError extends QuantisError {
   constructor(
     userMessage: string,
     options?: {
       code?: ErrorCode;
       technical?: string;
     }
   ) {
     super(
       options?.code ?? ERROR_CODES.PAYMENT_FAILED,
       userMessage,
       { recoverable: true, ...options }
     );
     this.name = 'PaymentError';
   }
 
   static failed(reason?: string) {
     return new PaymentError(
       reason || 'Payment could not be processed. Please try again.',
       { code: ERROR_CODES.PAYMENT_FAILED }
     );
   }
 
   static canceled() {
     return new PaymentError(
       'Payment was canceled.',
       { code: ERROR_CODES.PAYMENT_CANCELED }
     );
   }
 }
 
 /**
  * Analysis-specific errors
  */
 export class AnalysisError extends QuantisError {
   constructor(
     userMessage: string,
     options?: {
       code?: ErrorCode;
       technical?: string;
       recoverable?: boolean;
     }
   ) {
     super(
       options?.code ?? ERROR_CODES.ANALYSIS_FAILED,
       userMessage,
       { recoverable: options?.recoverable ?? true, ...options }
     );
     this.name = 'AnalysisError';
   }
 
   static rateLimited(resetTime?: string) {
     const message = resetTime
      ? `You've reached your analysis limit. Try again after ${resetTime}.`
      : "You've reached your analysis limit. Upgrade to Plus for unlimited analyses.";
     return new AnalysisError(message, { code: ERROR_CODES.ANALYSIS_RATE_LIMITED });
   }
 
   static timeout() {
     return new AnalysisError(
       'Analysis took too long. Please try again.',
       { code: ERROR_CODES.ANALYSIS_TIMEOUT }
     );
   }
 }
 
 /**
  * Utility to parse and categorize unknown errors
  */
 export function parseError(error: unknown): QuantisError {
   // Already a QuantisError
   if (error instanceof QuantisError) {
     return error;
   }
 
   // Network errors
   if (error instanceof TypeError && error.message.includes('fetch')) {
     return NetworkError.offline();
   }
 
   // HTTP response errors
   if (error && typeof error === 'object' && 'status' in error) {
     const status = (error as { status: number }).status;
     if (status === 401) {
       return AuthError.sessionExpired();
     }
     if (status === 429) {
       return AuthError.rateLimited();
     }
   }
 
   // Generic Error
   if (error instanceof Error) {
     return new QuantisError(
       ERROR_CODES.UNKNOWN,
       error.message || 'An unexpected error occurred.',
       { technical: error.stack }
     );
   }
 
   // Unknown type
   return new QuantisError(
     ERROR_CODES.UNKNOWN,
     'An unexpected error occurred.',
     { technical: String(error) }
   );
 }
 
 /**
  * Get user-friendly message for display
  */
 export function getErrorMessage(error: unknown): string {
   const parsed = parseError(error);
   return parsed.userMessage;
 }
 
 /**
  * Check if error is recoverable (user can retry)
  */
 export function isRecoverableError(error: unknown): boolean {
   const parsed = parseError(error);
   return parsed.recoverable;
 }