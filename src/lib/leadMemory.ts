import { logger } from '@/lib/logger';
/**
 * Lead Memory System
 * 
 * Remembers leads from exit-intent popup and prefills auth forms.
 * Tracks lead-to-signup conversions for analytics.
 */

const LEAD_STORAGE_KEY = 'quantis_lead_email';
const LEAD_NAME_KEY = 'quantis_lead_name';
const LEAD_SOURCE_KEY = 'quantis_lead_source';
const LEAD_TIMESTAMP_KEY = 'quantis_lead_timestamp';
const LEAD_EXPIRY_DAYS = 30; // Remember lead for 30 days

export interface LeadData {
  email: string;
  name: string;
  source: 
    | 'exit_intent_popup' 
    | 'scroll_popup'
    | 'time_delay_popup'
    | 'footer_newsletter'
    | 'resource_download'
    | 'feature_waitlist'
    | 'blog_cta'
    | 'landing_page' 
    | 'other';
  timestamp: string;
}

/**
 * Save lead email to localStorage for prefilling auth forms
 */
export function saveLeadEmail(email: string, source: LeadData['source'] = 'exit_intent_popup'): void {
  try {
    // Extract name from email (capitalize first part)
    const emailName = email.split('@')[0].replace(/[._-]/g, ' ');
    const capitalizedName = emailName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    localStorage.setItem(LEAD_STORAGE_KEY, email.toLowerCase());
    localStorage.setItem(LEAD_NAME_KEY, capitalizedName);
    localStorage.setItem(LEAD_SOURCE_KEY, source);
    localStorage.setItem(LEAD_TIMESTAMP_KEY, new Date().toISOString());
    
    logger.info('[LeadMemory] Lead saved:', { email, name: capitalizedName, source });
  } catch (error) {
    logger.error('[LeadMemory] Failed to save lead:', error);
  }
}

/**
 * Get saved lead data if exists and not expired
 */
export function getSavedLead(): LeadData | null {
  try {
    const email = localStorage.getItem(LEAD_STORAGE_KEY);
    const name = localStorage.getItem(LEAD_NAME_KEY);
    const source = localStorage.getItem(LEAD_SOURCE_KEY) as LeadData['source'];
    const timestamp = localStorage.getItem(LEAD_TIMESTAMP_KEY);

    if (!email || !timestamp) {
      return null;
    }

    // Check if lead data has expired
    const savedDate = new Date(timestamp);
    const daysSinceSaved = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceSaved > LEAD_EXPIRY_DAYS) {
      clearLeadData();
      return null;
    }

    return {
      email,
      name: name || 'Friend',
      source: source || 'other',
      timestamp,
    };
  } catch (error) {
    logger.error('[LeadMemory] Failed to get lead:', error);
    return null;
  }
}

/**
 * Check if we have a saved lead email
 */
export function hasSavedLead(): boolean {
  return getSavedLead() !== null;
}

/**
 * Get just the email if saved
 */
export function getSavedLeadEmail(): string | null {
  const lead = getSavedLead();
  return lead?.email || null;
}

/**
 * Get the saved lead name
 */
export function getSavedLeadName(): string | null {
  const lead = getSavedLead();
  return lead?.name || null;
}

/**
 * Clear lead data after successful signup/login
 */
export function clearLeadData(): void {
  try {
    localStorage.removeItem(LEAD_STORAGE_KEY);
    localStorage.removeItem(LEAD_NAME_KEY);
    localStorage.removeItem(LEAD_SOURCE_KEY);
    localStorage.removeItem(LEAD_TIMESTAMP_KEY);
    logger.info('[LeadMemory] Lead data cleared');
  } catch (error) {
    logger.error('[LeadMemory] Failed to clear lead:', error);
  }
}

/**
 * Check if the current signup is from a lead conversion
 */
export function isLeadConversion(email: string): boolean {
  const savedLead = getSavedLead();
  if (!savedLead) return false;
  return savedLead.email.toLowerCase() === email.toLowerCase();
}

/**
 * Parse email from URL parameters (from email link clicks)
 */
export function getEmailFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    
    if (email) {
      // Decode and validate email
      const decodedEmail = decodeURIComponent(email);
      if (decodedEmail.includes('@')) {
        return decodedEmail.toLowerCase();
      }
    }
    return null;
  } catch (error) {
    logger.error('[LeadMemory] Failed to parse email from URL:', error);
    return null;
  }
}

/**
 * Initialize lead memory from URL parameters
 * Call this on app load to capture leads from email links
 */
export function initLeadFromUrl(): LeadData | null {
  const emailFromUrl = getEmailFromUrl();
  
  if (emailFromUrl) {
    saveLeadEmail(emailFromUrl, 'exit_intent_popup');
    
    // Clean up URL without reload
    const url = new URL(window.location.href);
    url.searchParams.delete('email');
    window.history.replaceState({}, '', url.toString());
    
    return getSavedLead();
  }
  
  return null;
}

/**
 * Generate signup URL with email prefilled
 */
export function generateSignupUrl(email: string): string {
  const baseUrl = 'https://www.aiwmcquantis.com/auth';
  const encodedEmail = encodeURIComponent(email);
  return `${baseUrl}?email=${encodedEmail}&tab=signup`;
}

/**
 * Generate app URL with email for returning leads
 */
export function generateAppUrl(email: string): string {
  const baseUrl = 'https://www.aiwmcquantis.com/app';
  const encodedEmail = encodeURIComponent(email);
  return `${baseUrl}?email=${encodedEmail}`;
}
