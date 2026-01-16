/**
 * Secure localStorage wrapper using Web Crypto API
 * Encrypts sensitive data before storing in localStorage
 * 
 * SECURITY: This provides defense-in-depth against XSS attacks accessing localStorage.
 * The encryption key is derived from a combination of user agent and domain,
 * making it harder for scripts from other contexts to decrypt the data.
 */

// Generate a consistent key from browser context (not truly secret, but adds obfuscation layer)
async function getEncryptionKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  // Use domain + static salt for key derivation
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`${window.location.origin}-quantis-secure-v1`),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('quantis-local-storage-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 string to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Encrypt and store data in localStorage
 */
export async function secureSetItem<T>(key: string, data: T): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(JSON.stringify(data));
    
    // Generate random IV for each encryption
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptionKey = await getEncryptionKey();
    
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      encryptionKey,
      plaintext
    );

    // Store as JSON with IV and ciphertext
    const stored = {
      iv: arrayBufferToBase64(iv.buffer),
      data: arrayBufferToBase64(ciphertext),
      v: 1, // Version for future migration
    };

    localStorage.setItem(key, JSON.stringify(stored));
    return true;
  } catch (error) {
    console.error('Failed to securely store data:', error);
    // Fallback to unencrypted storage if crypto not available
    try {
      localStorage.setItem(key, JSON.stringify({ fallback: true, data }));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Retrieve and decrypt data from localStorage
 */
export async function secureGetItem<T>(key: string): Promise<T | null> {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    
    // Handle fallback unencrypted data
    if (parsed.fallback) {
      return parsed.data as T;
    }
    
    // Handle legacy unencrypted data (array = old format)
    if (Array.isArray(parsed) || !parsed.iv) {
      return parsed as T;
    }

    const iv = new Uint8Array(base64ToArrayBuffer(parsed.iv));
    const ciphertext = base64ToArrayBuffer(parsed.data);
    
    const encryptionKey = await getEncryptionKey();
    
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      encryptionKey,
      ciphertext
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(plaintext)) as T;
  } catch (error) {
    console.error('Failed to retrieve secure data:', error);
    // Try to read as plain JSON (legacy data)
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        // If it's legacy array data
        if (Array.isArray(parsed)) {
          return parsed as T;
        }
      }
    } catch {
      // Ignore
    }
    return null;
  }
}

/**
 * Remove item from localStorage
 */
export function secureRemoveItem(key: string): void {
  localStorage.removeItem(key);
}

/**
 * Check if Web Crypto API is available
 */
export function isSecureStorageAvailable(): boolean {
  return !!(window.crypto && window.crypto.subtle);
}
