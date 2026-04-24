/**
 * Welcome Email Service
 * Centralized function to send welcome emails after signup
 * Used by both email signup and OAuth flows
 */

import { supabase } from '@/integrations/supabase/client';

import { logger } from '@/lib/logger';
interface SendWelcomeEmailParams {
  email: string;
  name: string;
}

interface SendWelcomeEmailResult {
  success: boolean;
  error?: string;
}

/**
 * Sends a welcome email to a newly registered user
 * This should be called after successful signup (both email and OAuth)
 */
export async function sendWelcomeEmail({ email, name }: SendWelcomeEmailParams): Promise<SendWelcomeEmailResult> {
  if (!email || !name) {
    logger.error('[WelcomeEmail] Missing required params:', { email: !!email, name: !!name });
    return { success: false, error: 'Email and name are required' };
  }

  try {
    logger.info('[WelcomeEmail] Sending welcome email to:', email);
    
    const response = await supabase.functions.invoke('send-welcome-email', {
      body: { email, name }
    });

    if (response.error) {
      logger.error('[WelcomeEmail] Edge function error:', response.error);
      return { success: false, error: response.error.message };
    }

    if (response.data?.success) {
      logger.info('[WelcomeEmail] Email sent successfully:', response.data);
      return { success: true };
    }

    logger.error('[WelcomeEmail] Unexpected response:', response.data);
    return { success: false, error: 'Unexpected response from email service' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[WelcomeEmail] Failed to send:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Check if a user was just created (within the last 60 seconds)
 * Used to determine if we should send a welcome email for OAuth users
 */
export function isNewUser(createdAt: string | undefined): boolean {
  if (!createdAt) return false;
  
  const createdTime = new Date(createdAt).getTime();
  const now = Date.now();
  const sixtySecondsAgo = now - 60000; // 60 seconds
  
  return createdTime > sixtySecondsAgo;
}

/**
 * Storage key for tracking if welcome email was sent
 */
const WELCOME_EMAIL_SENT_KEY = 'welcome_email_sent';

/**
 * Mark that welcome email was sent for a user
 */
export function markWelcomeEmailSent(userId: string): void {
  try {
    const sentList = JSON.parse(localStorage.getItem(WELCOME_EMAIL_SENT_KEY) || '[]');
    if (!sentList.includes(userId)) {
      sentList.push(userId);
      // Keep only the last 100 entries to prevent localStorage bloat
      if (sentList.length > 100) {
        sentList.shift();
      }
      localStorage.setItem(WELCOME_EMAIL_SENT_KEY, JSON.stringify(sentList));
    }
  } catch (e) {
    logger.warn('[WelcomeEmail] Failed to mark as sent:', e);
  }
}

/**
 * Check if welcome email was already sent for a user
 */
export function wasWelcomeEmailSent(userId: string): boolean {
  try {
    const sentList = JSON.parse(localStorage.getItem(WELCOME_EMAIL_SENT_KEY) || '[]');
    return sentList.includes(userId);
  } catch (e) {
    return false;
  }
}
