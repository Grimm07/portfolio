import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Contact } from '../Contact';

// Mock Turnstile component
const mockReset = vi.fn();

vi.mock('@marsidev/react-turnstile', () => {
  return {
    Turnstile: React.forwardRef<{ reset: () => void }, { 
      onSuccess: (token: string) => void; 
      onError: () => void;
    }>(({ onSuccess, onError }, ref) => {
      React.useImperativeHandle(ref, () => ({
        reset: mockReset,
      }));
      
      return (
        <div data-testid="turnstile">
          <button
            onClick={() => onSuccess('mock-token-123')}
            data-testid="turnstile-success"
          >
            Verify
          </button>
          <button onClick={onError} data-testid="turnstile-error">
            Error
          </button>
        </div>
      );
    }),
  };
});

// Mock fetch
globalThis.fetch = vi.fn() as typeof fetch;

describe('Contact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset.mockClear();
    // Set up environment variable
    import.meta.env.VITE_TURNSTILE_SITE_KEY = 'test-site-key';
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

  it('enables submit button when form is valid and turnstile is verified', async () => {
    const user = userEvent.setup();
    render(<Contact />);
    
    // Fill in valid form data
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/message/i), 'This is a test message that is long enough');
    
    // Verify Turnstile
    const verifyButton = screen.getByTestId('turnstile-success');
    await user.click(verifyButton);
    
    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /send message/i });
      expect(submitButton).not.toBeDisabled();
    }, { timeout: 3000 });
  });

  it('submits form successfully', async () => {
    const user = userEvent.setup();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'application/json',
      },
      text: async () => JSON.stringify({ message: 'Message sent successfully!' }),
    });

    render(<Contact />);
    
    // Fill in form
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/message/i), 'This is a test message that is long enough');
    
    // Verify Turnstile
    const verifyButton = screen.getByTestId('turnstile-success');
    await user.click(verifyButton);
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /send message/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      // Use getAllByText since there are two elements (sr-only and visible)
      const messages = screen.getAllByText(/message sent successfully!/i);
      expect(messages.length).toBeGreaterThan(0);
      // Check that the visible alert is present
      expect(screen.getByRole('alert')).toHaveTextContent(/message sent successfully!/i);
    });
    
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/contact', expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    
    // Fill in form
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/message/i), 'This is a test message that is long enough');
    
    // Verify Turnstile
    const verifyButton = screen.getByTestId('turnstile-success');
    await user.click(verifyButton);
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /send message/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      // Use getAllByText since there are two elements (sr-only and visible)
      const errors = screen.getAllByText(/server error/i);
      expect(errors.length).toBeGreaterThan(0);
      // Check that the visible alert is present
      expect(screen.getByRole('alert')).toHaveTextContent(/server error/i);
    });
  });

  it('silently rejects form if honeypot field is filled', async () => {
    const user = userEvent.setup();
    render(<Contact />);

    // Fill in form including honeypot
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const messageInput = screen.getByLabelText(/message/i);
    const websiteInput = document.querySelector('input[name="website"]') as HTMLInputElement;

    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, 'john@example.com');
    await user.type(messageInput, 'This is a test message that is long enough');
    await user.type(websiteInput, 'spam-bot');

    // Verify Turnstile
    const verifyButton = screen.getByTestId('turnstile-success');
    await user.click(verifyButton);

    // Submit form
    const submitButton = screen.getByRole('button', { name: /send message/i });
    await user.click(submitButton);

    // Should not call fetch
    await waitFor(() => {
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  it('displays rate limit error with retry time', async () => {
    const user = userEvent.setup();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: {
        get: () => 'application/json',
      },
      text: async () => JSON.stringify({ error: 'Rate limit exceeded', retryAfter: 1800 }),
    });

    render(<Contact />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/message/i), 'This is a test message that is long enough');
    await user.click(screen.getByTestId('turnstile-success'));
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/too many requests/i);
      expect(alert).toHaveTextContent(/30 minute/i);
    });
  });

  it('displays server-provided error message for 400 responses', async () => {
    const user = userEvent.setup();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: {
        get: () => 'application/json',
      },
      text: async () => JSON.stringify({ error: 'Submission too fast' }),
    });

    render(<Contact />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/message/i), 'This is a test message that is long enough');
    await user.click(screen.getByTestId('turnstile-success'));
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/submission too fast/i);
    });
  });

  it('displays appropriate message for 404 responses', async () => {
    const user = userEvent.setup();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: {
        get: () => 'application/json',
      },
      text: async () => JSON.stringify({}),
    });

    render(<Contact />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/message/i), 'This is a test message that is long enough');
    await user.click(screen.getByTestId('turnstile-success'));
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/endpoint not found/i);
    });
  });

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new TypeError('Failed to fetch'),
    );

    render(<Contact />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/message/i), 'This is a test message that is long enough');
    await user.click(screen.getByTestId('turnstile-success'));
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/network error/i);
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    // Use a promise we control to keep the fetch pending
    let resolveFetch!: (value: unknown) => void;
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Promise((resolve) => { resolveFetch = resolve; }),
    );

    render(<Contact />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/message/i), 'This is a test message that is long enough');
    await user.click(screen.getByTestId('turnstile-success'));
    await user.click(screen.getByRole('button', { name: /send message/i }));

    // While loading: button shows "Sending..." and inputs are disabled
    await waitFor(() => {
      expect(screen.getByText(/sending\.\.\./i)).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toBeDisabled();
      expect(screen.getByLabelText(/email/i)).toBeDisabled();
      expect(screen.getByLabelText(/message/i)).toBeDisabled();
    });

    // Resolve the fetch to clean up
    resolveFetch({
      ok: true,
      headers: { get: () => 'application/json' },
      text: async () => JSON.stringify({ message: 'Sent!' }),
    });
  });

  it('handles Turnstile error callback', async () => {
    const user = userEvent.setup();
    render(<Contact />);

    // Trigger Turnstile error
    await user.click(screen.getByTestId('turnstile-error'));

    await waitFor(() => {
      const alerts = screen.getAllByText(/captcha verification failed/i);
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  it('handles malformed JSON response gracefully', async () => {
    const user = userEvent.setup();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      headers: {
        get: () => 'application/json',
      },
      text: async () => 'not valid json{{{',
    });

    render(<Contact />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/message/i), 'This is a test message that is long enough');
    await user.click(screen.getByTestId('turnstile-success'));
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid response/i);
    });
  });

  it('sends correct payload structure including timestamp', async () => {
    const user = userEvent.setup();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      text: async () => JSON.stringify({ message: 'Sent!' }),
    });

    render(<Contact />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/message/i), 'This is a test message that is long enough');
    await user.click(screen.getByTestId('turnstile-success'));
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    const [url, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/api/contact');

    const body = JSON.parse(options.body);
    expect(body.name).toBe('John Doe');
    expect(body.email).toBe('john@example.com');
    expect(body.message).toBe('This is a test message that is long enough');
    expect(body.turnstileToken).toBe('mock-token-123');
    expect(typeof body.timestamp).toBe('number');
    // Timestamp should be recent (within last 30 seconds)
    expect(Date.now() - body.timestamp).toBeLessThan(30000);
    // website (honeypot) should be undefined when empty
    expect(body.website).toBeUndefined();
  });

  it('resets Turnstile and token on submission error', async () => {
    const user = userEvent.setup();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: { get: () => 'application/json' },
      text: async () => JSON.stringify({ error: 'Server error' }),
    });

    render(<Contact />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/message/i), 'This is a test message that is long enough');
    await user.click(screen.getByTestId('turnstile-success'));
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Turnstile reset should have been called
    expect(mockReset).toHaveBeenCalled();

    // Submit button should be disabled again (token was cleared)
    const submitButton = screen.getByRole('button', { name: /send message/i });
    expect(submitButton).toBeDisabled();
  });

  it('renders LinkedIn and GitHub links', () => {
    render(<Contact />);

    const linkedinLink = screen.getByRole('link', { name: /linkedin/i });
    expect(linkedinLink).toHaveAttribute('href', 'https://www.linkedin.com/in/trystan-m/');
    expect(linkedinLink).toHaveAttribute('target', '_blank');
    expect(linkedinLink).toHaveAttribute('rel', expect.stringContaining('noopener'));

    const githubLink = screen.getByRole('link', { name: /github/i });
    expect(githubLink).toHaveAttribute('href', 'https://github.com/Grimm07');
    expect(githubLink).toHaveAttribute('target', '_blank');
  });

  it('clears previous error state when user resumes typing', async () => {
    const user = userEvent.setup();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: { get: () => 'application/json' },
      text: async () => JSON.stringify({ error: 'Server error' }),
    });

    render(<Contact />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/message/i), 'This is a test message that is long enough');
    await user.click(screen.getByTestId('turnstile-success'));
    await user.click(screen.getByRole('button', { name: /send message/i }));

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Start typing again — error should clear
    await user.type(screen.getByLabelText(/name/i), ' updated');

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
