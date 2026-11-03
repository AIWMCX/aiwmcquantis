import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { screen, waitFor } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { SignupForm } from '@/components/auth/SignupForm';

const mockSignUp = vi.fn();

vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
  trackSignup: vi.fn(),
  trackMobileSignupStarted: vi.fn(),
  trackMobileSignupCompleted: vi.fn(),
  trackSimplifiedFormConversion: vi.fn(),
  trackPasswordValidationPassed: vi.fn(),
  recordFunnelEvent: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { signUp: vi.fn(), getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    signUp: (...args: unknown[]) => mockSignUp(...args),
    resendSignupConfirmation: vi.fn(),
  }),
}));

vi.mock('@/lib/leadMemory', () => ({
  getSavedLead: vi.fn().mockReturnValue(null),
  clearLeadData: vi.fn(),
  isLeadConversion: vi.fn().mockReturnValue(false),
  initLeadFromUrl: vi.fn(),
}));

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: vi.fn().mockReturnValue(false) }));

const renderForm = () => render(<BrowserRouter><SignupForm /></BrowserRouter>);

async function fillCredentials(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'founder@example.com');
  await user.type(screen.getByLabelText('Password'), 'a-long-password');
}

describe('SignupForm consent', () => {
  beforeEach(() => {
    mockSignUp.mockReset();
    mockSignUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null });
  });

  it('renders both consent checkboxes unchecked', () => {
    renderForm();
    expect(screen.getByRole('checkbox', { name: /18 or older and agree to the terms of service and privacy policy/i }))
      .toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('checkbox', { name: /product updates/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('blocks account creation until the 18+/Terms box is checked', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillCredentials(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/18 or older/i);
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('records Terms acceptance and no marketing consent when only the required box is checked', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillCredentials(user);
    await user.click(screen.getByRole('checkbox', { name: /18 or older/i }));
    await user.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(mockSignUp).toHaveBeenCalledTimes(1));
    const consent = mockSignUp.mock.calls[0][5];
    expect(consent).toMatchObject({
      age_confirmed: true,
      terms_version: '2026-11-03',
      marketing_opt_in: false,
      marketing_opt_in_at: null,
      consent_source: 'signup_form',
    });
    expect(typeof consent.terms_accepted_at).toBe('string');
  });

  it('records marketing consent only when the optional box is checked', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillCredentials(user);
    await user.click(screen.getByRole('checkbox', { name: /18 or older/i }));
    await user.click(screen.getByRole('checkbox', { name: /product updates/i }));
    await user.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(mockSignUp).toHaveBeenCalledTimes(1));
    const consent = mockSignUp.mock.calls[0][5];
    expect(consent.marketing_opt_in).toBe(true);
    expect(consent.marketing_opt_in_at).toBe(consent.terms_accepted_at);
  });
});
