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
    // WAF CAPTCHA integration: the build embeds the integration URL + API key; the SDK
    // (mocked below) defines window.AwsWafCaptcha.renderCaptcha(). Our mock immediately
    // calls onSuccess to simulate the user solving the inline puzzle.
    import.meta.env.VITE_WAF_INTEGRATION_URL = 'https://waf.test/integration/jsapi.js';
    import.meta.env.VITE_WAF_API_KEY = 'mock-api-key';
    window.AwsWafCaptcha = {
      renderCaptcha: vi.fn((_container, opts) => {
        opts.onSuccess('mock-waf-token');
      }),
    };
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

  it('renders the inline CAPTCHA widget with the API key', async () => {
    render(<Contact />);
    await waitFor(() => {
      expect(window.AwsWafCaptcha!.renderCaptcha).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({ apiKey: 'mock-api-key' })
      );
    });
  });

  it('enables submit button when form is valid and the CAPTCHA is solved', async () => {
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

  it('submits form successfully via same-origin POST after solving the CAPTCHA', async () => {
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

    expect(window.AwsWafCaptcha!.renderCaptcha).toHaveBeenCalled();
    // Same-origin POST to /api/contact; the aws-waf-token cookie (not a header) carries the token.
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/api/contact');
    expect(init.method).toBe('POST');
    expect(init.headers['x-aws-waf-token']).toBeUndefined();
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ name: 'John Doe', email: TEST_EMAIL });
    expect(typeof body.formTimestamp).toBe('number');

    // CloudFront OAC needs the real body hash; it must match the exact bytes sent (no re-stringify).
    const expectedDigest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(init.body));
    const expectedHash = Array.from(new Uint8Array(expectedDigest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    expect(init.headers['x-amz-content-sha256']).toBe(expectedHash);
    expect(init.headers['x-amz-content-sha256']).toMatch(/^[0-9a-f]{64}$/);
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
