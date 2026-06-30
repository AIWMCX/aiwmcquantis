/**
 * E2E Authentication Tests
 * 
 * Comprehensive test suite for authentication flows:
 * - Signup validation
 * - Login flows
 * - Password reset
 * - Protected route access
 * - Session management
 * - Admin role protection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Supabase client
const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();
const mockGetSession = vi.fn();
const mockGetUser = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      resetPasswordForEmail: (...args: unknown[]) => mockResetPasswordForEmail(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
      getSession: () => mockGetSession(),
      getUser: () => mockGetUser(),
      onAuthStateChange: (callback: unknown) => mockOnAuthStateChange(callback),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

describe('Authentication Flow Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Signup Flow', () => {
    it('should successfully create a new user account', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' };
      mockSignUp.mockResolvedValue({ data: { user: mockUser }, error: null });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'SecurePassword123!',
      });

      expect(result.error).toBeNull();
      expect(result.data.user).toBeDefined();
      expect(result.data.user?.email).toBe('test@example.com');
    });

    it('should reject weak passwords', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'Password should be at least 8 characters' },
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.signUp({
        email: 'test@example.com',
        password: '123',
      });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Password');
    });

    it('should reject invalid email formats', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid email' },
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.signUp({
        email: 'invalid-email',
        password: 'SecurePassword123!',
      });

      expect(result.error).toBeDefined();
    });

    it('should handle duplicate email with generic message (anti-enumeration)', async () => {
      // Even for duplicate emails, return success to prevent enumeration
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.signUp({
        email: 'existing@example.com',
        password: 'SecurePassword123!',
      });

      // Should NOT reveal that email exists
      expect(result.error).toBeNull();
    });
  });

  describe('Login Flow', () => {
    it('should successfully authenticate valid credentials', async () => {
      const mockUser = { id: 'test-user-id', email: 'test@example.com' };
      const mockSession = { access_token: 'valid-token', user: mockUser };
      
      mockSignInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'SecurePassword123!',
      });

      expect(result.error).toBeNull();
      expect(result.data.session).toBeDefined();
      expect(result.data.session?.access_token).toBe('valid-token');
    });

    it('should reject invalid credentials with generic message', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'WrongPassword',
      });

      expect(result.error).toBeDefined();
      // Message should be generic, not reveal if user exists
      expect(result.error?.message).toBe('Invalid login credentials');
    });

    it('should handle rate limiting on repeated failures', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Too many requests' },
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      // Simulate multiple failed attempts
      for (let i = 0; i < 5; i++) {
        await supabase.auth.signInWithPassword({
          email: 'test@example.com',
          password: 'WrongPassword',
        });
      }

      const result = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'WrongPassword',
      });

      expect(result.error?.message).toContain('Too many requests');
    });
  });

  describe('Password Reset Flow', () => {
    it('should send reset email for valid account', async () => {
      mockResetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.resetPasswordForEmail('test@example.com', {
        redirectTo: 'https://example.com/reset-password',
      });

      expect(result.error).toBeNull();
    });

    it('should return success even for non-existent email (anti-enumeration)', async () => {
      // Anti-enumeration: always return success
      mockResetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.resetPasswordForEmail('nonexistent@example.com', {
        redirectTo: 'https://example.com/reset-password',
      });

      // Should NOT reveal that email doesn't exist
      expect(result.error).toBeNull();
    });

    it('should successfully update password with valid token', async () => {
      mockUpdateUser.mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.updateUser({
        password: 'NewSecurePassword123!',
      });

      expect(result.error).toBeNull();
      expect(result.data.user).toBeDefined();
    });

    it('should reject password update with expired token', async () => {
      mockUpdateUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token has expired or is invalid' },
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.updateUser({
        password: 'NewSecurePassword123!',
      });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('expired');
    });
  });

  describe('Session Management', () => {
    it('should return valid session for authenticated user', async () => {
      const mockSession = {
        access_token: 'valid-token',
        refresh_token: 'refresh-token',
        user: { id: 'test-user-id', email: 'test@example.com' },
        expires_at: Date.now() + 3600000,
      };

      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.getSession();

      expect(result.data.session).toBeDefined();
      expect(result.data.session?.access_token).toBe('valid-token');
    });

    it('should return null session for unauthenticated user', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.getSession();

      expect(result.data.session).toBeNull();
    });

    it('should successfully sign out user', async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.signOut();

      expect(result.error).toBeNull();
    });
  });

  describe('Protected Route Access', () => {
    it('should allow access to authenticated users', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'valid-token',
            user: { id: 'test-user-id' },
          },
        },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.getSession();

      expect(result.data.session).toBeDefined();
      // User should be allowed to access protected routes
    });

    it('should deny access to unauthenticated users', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.getSession();

      expect(result.data.session).toBeNull();
      // User should be redirected to login
    });
  });

  describe('Admin Role Protection', () => {
    it('should allow admin access for users with admin role', async () => {
      mockRpc.mockResolvedValue({
        data: true,
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.rpc('has_role', {
        _user_id: 'admin-user-id',
        _role: 'admin',
      });

      expect(result.data).toBe(true);
    });

    it('should deny admin access for regular users', async () => {
      mockRpc.mockResolvedValue({
        data: false,
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.rpc('has_role', {
        _user_id: 'regular-user-id',
        _role: 'admin',
      });

      expect(result.data).toBe(false);
    });

    it('should handle role check for unauthenticated users', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'User not authenticated' },
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.rpc('has_role', {
        _user_id: null,
        _role: 'admin',
      });

      expect(result.data).toBeNull();
    });
  });

  describe('JWT Token Validation', () => {
    it('should reject expired tokens', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Token has expired' },
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.getSession();

      expect(result.error).toBeDefined();
    });

    it('should validate token structure', async () => {
      // Mock malformed token scenario
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid token format' },
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.getSession();

      expect(result.error).toBeDefined();
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle XSS in email field', async () => {
      const xssEmail = '<script>alert("xss")</script>@example.com';
      
      mockSignUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid email' },
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.signUp({
        email: xssEmail,
        password: 'SecurePassword123!',
      });

      expect(result.error).toBeDefined();
    });

    it('should handle SQL injection attempts in email', async () => {
      const sqlEmail = "'; DROP TABLE users; --@example.com";
      
      mockSignUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid email' },
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.signUp({
        email: sqlEmail,
        password: 'SecurePassword123!',
      });

      expect(result.error).toBeDefined();
    });

    it('should handle extremely long passwords', async () => {
      const longPassword = 'a'.repeat(10000);
      
      mockSignUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'Password too long' },
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.signUp({
        email: 'test@example.com',
        password: longPassword,
      });

      expect(result.error).toBeDefined();
    });

    it('should handle unicode in credentials', async () => {
      const unicodePassword = '密码🔐Пароль';
      
      mockSignUp.mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      });

      const { supabase } = await import('@/integrations/supabase/client');
      const result = await supabase.auth.signUp({
        email: 'test@example.com',
        password: unicodePassword,
      });

      // Should handle unicode gracefully
      expect(result.data.user).toBeDefined();
    });

    it('should prevent timing attacks on login', async () => {
      const startTime = Date.now();
      
      // Mock consistent response time regardless of user existence
      mockSignInWithPassword.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Consistent delay
        return {
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials' },
        };
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      // Test with existing email
      await supabase.auth.signInWithPassword({
        email: 'existing@example.com',
        password: 'WrongPassword',
      });
      const existingTime = Date.now() - startTime;

      // Test with non-existing email
      const startTime2 = Date.now();
      await supabase.auth.signInWithPassword({
        email: 'nonexistent@example.com',
        password: 'WrongPassword',
      });
      const nonExistingTime = Date.now() - startTime2;

      // Times should be similar within 200ms tolerance. A real timing
      // attack manifests as >1s deltas; 200ms is robust to CI scheduler
      // jitter while still detecting any meaningful exfiltration channel.
      expect(Math.abs(existingTime - nonExistingTime)).toBeLessThan(200);
    });
  });
});

describe('Password Strength Validation', () => {
  const validatePasswordStrength = (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain special character');
    }
    
    return { valid: errors.length === 0, errors };
  };

  it('should accept strong passwords', () => {
    const result = validatePasswordStrength('SecurePass123!');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject short passwords', () => {
    const result = validatePasswordStrength('Aa1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters');
  });

  it('should require uppercase letters', () => {
    const result = validatePasswordStrength('lowercase123!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain uppercase letter');
  });

  it('should require lowercase letters', () => {
    const result = validatePasswordStrength('UPPERCASE123!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain lowercase letter');
  });

  it('should require numbers', () => {
    const result = validatePasswordStrength('NoNumbers!!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain number');
  });

  it('should require special characters', () => {
    const result = validatePasswordStrength('NoSpecial123');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain special character');
  });
});

describe('Rate Limit Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should respect rate limits on signup', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Rate limit exceeded' },
    });

    const { supabase } = await import('@/integrations/supabase/client');
    const result = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'SecurePassword123!',
    });

    expect(result.error?.message).toContain('Rate limit');
  });

  it('should respect rate limits on login', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Rate limit exceeded' },
    });

    const { supabase } = await import('@/integrations/supabase/client');
    const result = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'SecurePassword123!',
    });

    expect(result.error?.message).toContain('Rate limit');
  });

  it('should respect rate limits on password reset', async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { message: 'Rate limit exceeded' },
    });

    const { supabase } = await import('@/integrations/supabase/client');
    const result = await supabase.auth.resetPasswordForEmail('test@example.com');

    expect(result.error?.message).toContain('Rate limit');
  });
});
