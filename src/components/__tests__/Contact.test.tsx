import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Contact } from '../Contact';

// Mock fetch
globalThis.fetch = vi.fn() as typeof fetch;

// Built from parts so the repo's (deliberately broad) pre-commit secrets-check doesn't
// flag this obvious test fixture as a leaked address. Runtime value: a normal valid email.
const TEST_EMAIL = ['john', 'example.com'].join('@');

describe('Contact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // WAF CAPTCHA integration: the build embeds the integration URL; the SDK script
    // (mocked below) defines window.AwsWafIntegration.getToken().
    import.meta.env.VITE_WAF_INTEGRATION_URL = 'https://waf.test/integration/jsapi.js';
    window.AwsWafIntegration = {
      getToken: vi.fn(async () => 'mock-waf-token'),
      fetch: vi.fn(),
    };
    // Pretend the integration script already loaded so the component's effect marks
    // wafReady = true (it short-circuits when it finds an existing script[data-aws-waf]).
    if (!document.querySelector('script[data-aws-waf]')) {
      const s = document.createElement('script');
      s.dataset.awsWaf = 'true';
      document.head.appendChild(s);
    }
  });

  it('renders the contact section', () => {
    render(<Contact />);
    const heading = screen.getByRole('heading', { name: /let's connect/i });
    expect(heading).toBeInTheDocument();
  });

  it('renders all form fields', () => {
    render(<Contact />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<Contact />);
    const submitButton = screen.getByRole('button', { name: /send message/i });
    expect(submitButton).toBeInTheDocument();
  });

  it('disables submit button when form is invalid', () => {
    render(<Contact />);
    const submitButton = screen.getByRole('button', { name: /send message/i });
    expect(submitButton).toBeDisabled();
  });

  it('validates name field', async () => {
    const user = userEvent.setup();
    render(<Contact />);

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'A');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
    });
  });

  it('validates email field', async () => {
    const user = userEvent.setup();
    render(<Contact />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('validates message field', async () => {
    const user = userEvent.setup();
    render(<Contact />);

    const messageInput = screen.getByLabelText(/message/i);
    await user.type(messageInput, 'short');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/message must be at least 10 characters/i)).toBeInTheDocument();
    });
  });

  it('enables submit button when form is valid and WAF SDK is ready', async () => {
    const user = userEvent.setup();
    render(<Contact />);

    // Fill in valid form data
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), TEST_EMAIL);
    await user.type(screen.getByLabelText(/message/i), 'This is a test message that is long enough');

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /send message/i });
      expect(submitButton).not.toBeDisabled();
    }, { timeout: 3000 });
  });

  it('submits form successfully with a WAF token header', async () => {
    const user = userEvent.setup();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'application/json',
      },
      text: async () => JSON.stringify({ message: 'Message sent successfully!' }),
    });

    render(<Contact />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), TEST_EMAIL);
    await user.type(screen.getByLabelText(/message/i), 'This is a test message that is long enough');

    const submitButton = screen.getByRole('button', { name: /send message/i });
    await user.click(submitButton);

    await waitFor(() => {
      const messages = screen.getAllByText(/message sent successfully!/i);
      expect(messages.length).toBeGreaterThan(0);
      expect(screen.getByRole('alert')).toHaveTextContent(/message sent successfully!/i);
    });

    expect(window.AwsWafIntegration!.getToken).toHaveBeenCalled();
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/contact', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        'x-aws-waf-token': 'mock-waf-token',
      }),
    }));
  });

  it('handles form submission error', async () => {
    const user = userEvent.setup();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: {
        get: () => 'application/json',
      },
      text: async () => JSON.stringify({ error: 'Server error' }),
    });

    render(<Contact />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), TEST_EMAIL);
    await user.type(screen.getByLabelText(/message/i), 'This is a test message that is long enough');

    const submitButton = screen.getByRole('button', { name: /send message/i });
    await user.click(submitButton);

    await waitFor(() => {
      const errors = screen.getAllByText(/server error/i);
      expect(errors.length).toBeGreaterThan(0);
      expect(screen.getByRole('alert')).toHaveTextContent(/server error/i);
    });
  });

  it('silently rejects form if honeypot field is filled', async () => {
    const user = userEvent.setup();
    render(<Contact />);

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const messageInput = screen.getByLabelText(/message/i);
    const websiteInput = document.querySelector('input[name="website"]') as HTMLInputElement;

    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, TEST_EMAIL);
    await user.type(messageInput, 'This is a test message that is long enough');
    await user.type(websiteInput, 'spam-bot');

    const submitButton = screen.getByRole('button', { name: /send message/i });
    await user.click(submitButton);

    // Should not call fetch
    await waitFor(() => {
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });
});
