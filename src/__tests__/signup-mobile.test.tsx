import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { screen, waitFor } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { SignupForm } from '@/components/auth/SignupForm';
// Create mock for analytics before imports
const mockTrackEvent = vi.fn();
const mockTrackSignup = vi.fn();

vi.mock('@/lib/analytics', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
  trackSignup: (...args: unknown[]) => mockTrackSignup(...args),
  trackMobileSignupStarted: vi.fn(),
  trackMobileSignupCompleted: vi.fn(),
  trackSimplifiedFormConversion: vi.fn(),
  trackPasswordValidationPassed: vi.fn(),
}));

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    signUp: vi.fn().mockResolvedValue({ error: null }),
  }),
}));

vi.mock('@/lib/welcomeEmail', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue({ success: true }),
  markWelcomeEmailSent: vi.fn(),
}));

vi.mock('@/lib/leadMemory', () => ({
  getSavedLead: vi.fn().mockReturnValue(null),
  clearLeadData: vi.fn(),
  isLeadConversion: vi.fn().mockReturnValue(false),
  initLeadFromUrl: vi.fn(),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn().mockReturnValue(true),
}));

// Helper to render with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

// Helper to simulate mobile viewport
const setMobileViewport = () => {
  Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('max-width'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
};

// Helper to simulate desktop viewport
const setDesktopViewport = () => {
  Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
};

describe('Mobile Signup Form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Mobile UI Rendering', () => {
    it('displays mobile progress indicator on small screens', () => {
      setMobileViewport();
      renderWithRouter(<SignupForm />);
      
      expect(screen.getByText(/Step 1 of 1/)).toBeInTheDocument();
    });

    it('hides mobile progress indicator on desktop (via CSS class)', () => {
      setDesktopViewport();
      renderWithRouter(<SignupForm />);
      
      const progressIndicator = screen.getByText(/Step 1 of 1/);
      expect(progressIndicator).toHaveClass('md:hidden');
    });

    it('Google button is not rendered when GOOGLE_OAUTH_ENABLED is false', () => {
      // GoogleLoginButton returns null when GOOGLE_OAUTH_ENABLED = false (configured in the component).
      // Showing a non-functional OAuth button is worse than showing none — it breaks conversion.
      renderWithRouter(<SignupForm />);
      expect(screen.queryByRole('button', { name: /continue with google/i })).not.toBeInTheDocument();
    });

    it('shows trust signals', () => {
      renderWithRouter(<SignupForm />);
      
      expect(screen.getByText(/Secure • Join 1,000\+ companies/)).toBeInTheDocument();
    });
  });

  describe('Simplified Password Validation', () => {
    it('accepts passwords with exactly 8 characters', async () => {
      renderWithRouter(<SignupForm />);
      
      const passwordInput = screen.getByPlaceholderText(/minimum 8 characters/i);
      await userEvent.type(passwordInput, 'abcdefgh');
      
      // Should not show "more characters needed" message
      expect(screen.queryByText(/more character/)).not.toBeInTheDocument();
    });

    it('rejects passwords under 8 characters', async () => {
      renderWithRouter(<SignupForm />);
      
      const passwordInput = screen.getByPlaceholderText(/minimum 8 characters/i);
      await userEvent.type(passwordInput, 'abcdefg');
      
      // Should show characters needed hint
      expect(screen.getByText(/1 more character needed/)).toBeInTheDocument();
    });

    it('shows correct character count for short passwords', async () => {
      renderWithRouter(<SignupForm />);
      
      const passwordInput = screen.getByPlaceholderText(/minimum 8 characters/i);
      await userEvent.type(passwordInput, 'abc');
      
      expect(screen.getByText(/5 more characters needed/)).toBeInTheDocument();
    });

    it('does not require uppercase letters', async () => {
      renderWithRouter(<SignupForm />);
      
      const passwordInput = screen.getByPlaceholderText(/minimum 8 characters/i);
      await userEvent.type(passwordInput, 'alllowercase');
      
      // No error about uppercase
      expect(screen.queryByText(/uppercase/i)).not.toBeInTheDocument();
    });

    it('does not require numbers', async () => {
      renderWithRouter(<SignupForm />);
      
      const passwordInput = screen.getByPlaceholderText(/minimum 8 characters/i);
      await userEvent.type(passwordInput, 'noNumbers');
      
      // No error about numbers
      expect(screen.queryByText(/number/i)).not.toBeInTheDocument();
    });

    it('does not require special characters', async () => {
      renderWithRouter(<SignupForm />);
      
      const passwordInput = screen.getByPlaceholderText(/minimum 8 characters/i);
      await userEvent.type(passwordInput, 'NoSpecialChars');
      
      // No error about special characters
      expect(screen.queryByText(/special/i)).not.toBeInTheDocument();
    });

    it('submit button is always enabled when not loading', () => {
      renderWithRouter(<SignupForm />);
      
      const submitButton = screen.getByRole('button', { name: /create free account/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Touch-Friendly Interactions', () => {
    it('input fields have proper styling for touch', () => {
      renderWithRouter(<SignupForm />);
      
      const nameInput = screen.getByPlaceholderText(/your full name/i);
      const emailInput = screen.getByPlaceholderText(/your@email.com/i);
      const passwordInput = screen.getByPlaceholderText(/minimum 8 characters/i);
      
      // All inputs should be present and accessible
      expect(nameInput).toBeInTheDocument();
      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
    });

    it('password toggle is accessible', async () => {
      renderWithRouter(<SignupForm />);
      
      const toggleButton = screen.getByRole('button', { name: /show password/i });
      expect(toggleButton).toBeInTheDocument();
      
      await userEvent.click(toggleButton);
      
      expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();
    });

    it('submit button has adequate height', () => {
      renderWithRouter(<SignupForm />);
      
      const submitButton = screen.getByRole('button', { name: /create free account/i });
      expect(submitButton).toHaveClass('h-12');
    });
  });

  describe('Form Submission Flow', () => {
    it('displays inline errors for empty required fields on submit', async () => {
      renderWithRouter(<SignupForm />);
      
      const submitButton = screen.getByRole('button', { name: /create free account/i });
      await userEvent.click(submitButton);
      
      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
      });
    });

    it('shows error for invalid email format', async () => {
      renderWithRouter(<SignupForm />);
      
      const emailInput = screen.getByPlaceholderText(/your@email.com/i);
      await userEvent.type(emailInput, 'notanemail');
      
      const submitButton = screen.getByRole('button', { name: /create free account/i });
      await userEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      });
    });
  });

  describe('Conversion Analytics', () => {
    it('tracks signup_started on first field focus', async () => {
      renderWithRouter(<SignupForm />);
      
      const nameInput = screen.getByPlaceholderText(/your full name/i);
      await userEvent.click(nameInput);
      
      expect(mockTrackEvent).toHaveBeenCalledWith('signup_started', expect.objectContaining({ source: 'form' }));
    });

    it('tracks field focus events', async () => {
      renderWithRouter(<SignupForm />);
      
      const nameInput = screen.getByPlaceholderText(/your full name/i);
      await userEvent.click(nameInput);
      
      expect(mockTrackEvent).toHaveBeenCalledWith('signup_field_focus', { field: 'fullName' });
    });

    it('tracks signup_field_focus for email field', async () => {
      renderWithRouter(<SignupForm />);
      
      // First touch a field to mark as touched
      const nameInput = screen.getByPlaceholderText(/your full name/i);
      await userEvent.click(nameInput);
      
      const emailInput = screen.getByPlaceholderText(/your@email.com/i);
      await userEvent.click(emailInput);
      
      expect(mockTrackEvent).toHaveBeenCalledWith('signup_field_focus', { field: 'email' });
    });

    it('tracks signup_field_focus for password field', async () => {
      renderWithRouter(<SignupForm />);
      
      // First touch a field to mark as touched
      const nameInput = screen.getByPlaceholderText(/your full name/i);
      await userEvent.click(nameInput);
      
      const passwordInput = screen.getByPlaceholderText(/minimum 8 characters/i);
      await userEvent.click(passwordInput);
      
      expect(mockTrackEvent).toHaveBeenCalledWith('signup_field_focus', { field: 'password' });
    });
  });

  describe('Implicit Terms Consent', () => {
    it('shows implicit terms text instead of checkbox', () => {
      renderWithRouter(<SignupForm />);
      
      // Should have inline terms text
      expect(screen.getByText(/by signing up, you agree to our/i)).toBeInTheDocument();
      
      // Should NOT have a checkbox
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('terms and privacy links are present', () => {
      renderWithRouter(<SignupForm />);
      
      expect(screen.getByRole('link', { name: /terms/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument();
    });
  });

  describe('Security Elements', () => {
    it('displays encryption badge', () => {
      renderWithRouter(<SignupForm />);
      
      expect(screen.getByText(/256-bit encryption/)).toBeInTheDocument();
    });
  });
});
