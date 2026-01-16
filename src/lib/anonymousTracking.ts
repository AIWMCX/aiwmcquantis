/**
 * Anonymous User Tracking for Abuse Prevention
 * 
 * Generates and persists a unique device ID for anonymous users
 * to enable per-device rate limiting instead of global limits.
 */

const DEVICE_ID_KEY = 'quantis_device_id';
const DEVICE_ID_CREATED_KEY = 'quantis_device_id_created';

/**
 * Generates a browser fingerprint hash for additional tracking
 * This helps identify users even if they clear localStorage
 */
function generateBrowserFingerprint(): string {
  const components = [
    navigator.language,
    navigator.platform,
    screen.width.toString(),
    screen.height.toString(),
    screen.colorDepth.toString(),
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() || 'unknown',
    // Add canvas fingerprint hint (simplified)
    navigator.maxTouchPoints?.toString() || '0',
  ];
  
  return components.join('|');
}

/**
 * Creates a simple hash from a string
 */
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Gets or creates a persistent anonymous device ID
 * This ID is unique per browser and persists across sessions
 */
export function getAnonymousDeviceId(): string {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    
    if (!deviceId) {
      // Generate new device ID
      deviceId = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
      localStorage.setItem(DEVICE_ID_CREATED_KEY, new Date().toISOString());
    }
    
    return deviceId;
  } catch {
    // If localStorage fails, generate a session-only ID
    return crypto.randomUUID();
  }
}

/**
 * Gets the browser fingerprint hash for additional verification
 */
export async function getBrowserFingerprint(): Promise<string> {
  const fingerprint = generateBrowserFingerprint();
  return hashString(fingerprint);
}

/**
 * Gets both device ID and fingerprint for comprehensive tracking
 */
export async function getAnonymousIdentifiers(): Promise<{
  deviceId: string;
  fingerprint: string;
}> {
  const deviceId = getAnonymousDeviceId();
  const fingerprint = await getBrowserFingerprint();
  
  return { deviceId, fingerprint };
}

/**
 * Checks if this is a returning anonymous user
 */
export function isReturningAnonymousUser(): boolean {
  try {
    const created = localStorage.getItem(DEVICE_ID_CREATED_KEY);
    if (!created) return false;
    
    const createdDate = new Date(created);
    const now = new Date();
    const hoursSinceCreation = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    
    // Consider "returning" if device ID was created more than 1 hour ago
    return hoursSinceCreation > 1;
  } catch {
    return false;
  }
}

/**
 * Clears anonymous tracking data (for testing or privacy)
 */
export function clearAnonymousTracking(): void {
  try {
    localStorage.removeItem(DEVICE_ID_KEY);
    localStorage.removeItem(DEVICE_ID_CREATED_KEY);
  } catch {
    // Ignore errors
  }
}
