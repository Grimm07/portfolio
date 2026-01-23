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
});
