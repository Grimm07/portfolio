import { useState, useEffect, useRef } from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

interface FormData {
  name: string;
  email: string;
  message: string;
  website: string;
}

interface FormErrors {
  name: string;
  email: string;
  message: string;
}

interface SubmissionState {
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
}

interface ApiResponse {
  error?: string;
  retryAfter?: number;
  message?: string;
  success?: boolean;
}

function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Get current theme from document class
 */
function getCurrentTheme(): 'light' | 'dark' {
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  }
  return 'dark'; // Default to dark
}

export function Contact() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    message: '',
    website: '',
  });

  const [errors, setErrors] = useState<FormErrors>({
    name: '',
    email: '',
    message: '',
  });

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    message: false,
  });

  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [formTimestamp, setFormTimestamp] = useState<number>(Date.now);
  const [submissionState, setSubmissionState] = useState<SubmissionState>({
    status: 'idle',
    message: '',
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(getCurrentTheme());
  const turnstileRef = useRef<TurnstileInstance>(null);

  // Watch for theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(getCurrentTheme());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Reset form after successful submission
  useEffect(() => {
    if (submissionState.status === 'success') {
      // Reset form after 3 seconds
      const timer = setTimeout(() => {
        setFormData({
          name: '',
          email: '',
          message: '',
          website: '',
        });
        setTouched({
          name: false,
          email: false,
          message: false,
        });
        setTurnstileToken('');
        setFormTimestamp(Date.now());
        setSubmissionState({ status: 'idle', message: '' });
        if (turnstileRef.current) {
          turnstileRef.current.reset();
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [submissionState.status]);

  const validateField = (name: keyof FormData, value: string): string => {
    switch (name) {
      case 'name':
        if (value.trim().length < 2) {
          return 'Name must be at least 2 characters';
        }
        return '';
      case 'email':
        if (!validateEmail(value)) {
          return 'Please enter a valid email address';
        }
        return '';
      case 'message':
        if (value.trim().length < 10) {
          return 'Message must be at least 10 characters';
        }
        return '';
      default:
        return '';
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (touched[name as keyof typeof touched]) {
      setErrors((prev) => ({
        ...prev,
        [name]: validateField(name as keyof FormData, value),
      }));
    }

    // Clear submission state when user starts typing
    if (submissionState.status !== 'idle') {
      setSubmissionState({ status: 'idle', message: '' });
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name as keyof FormData, value),
    }));
  };

  const isFormValid =
    formData.name.trim().length >= 2 &&
    validateEmail(formData.email) &&
    formData.message.trim().length >= 10;

  const canSubmit = isFormValid && turnstileToken && submissionState.status !== 'loading';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot check - if website field is filled, silently reject
    if (formData.website) {
      return;
    }

    if (!isFormValid || !turnstileToken) {
      return;
    }

    setSubmissionState({ status: 'loading', message: '' });

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          message: formData.message,
          turnstileToken,
          timestamp: formTimestamp,
          website: formData.website || undefined,
        }),
      });

      // Check if response has content before parsing JSON
      const contentType = response.headers.get('Content-Type');
      const hasJsonContent = contentType?.includes('application/json');
      
      let data: ApiResponse = {};
      
      if (hasJsonContent) {
        const text = await response.text();
        if (text.trim()) {
          try {
            data = JSON.parse(text);
          } catch (parseError) {
            console.error('Failed to parse JSON response:', parseError);
            setSubmissionState({
              status: 'error',
              message: 'Invalid response from server. Please try again.',
            });
            turnstileRef.current?.reset();
            setTurnstileToken('');
            return;
          }
        }
      }

      if (!response.ok) {
        // Handle different error status codes
        let errorMessage = 'Failed to send message. Please try again.';

        if (response.status === 400) {
          errorMessage = data.error || 'Invalid submission. Please check your input.';
        } else if (response.status === 429) {
          const retryAfter = data.retryAfter || 3600;
          const minutes = Math.ceil(retryAfter / 60);
          errorMessage = `Too many requests. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`;
        } else if (response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (response.status === 404) {
          errorMessage = 'Contact endpoint not found. Please ensure the worker is running.';
        }

        setSubmissionState({
          status: 'error',
          message: errorMessage,
        });

        // Reset Turnstile on error
        if (turnstileRef.current) {
          turnstileRef.current.reset();
        }
        setTurnstileToken('');

        return;
      }

      // Success
      setSubmissionState({
        status: 'success',
        message: data.message || 'Message sent successfully!',
      });
    } catch (error) {
      // Network error or other exception
      console.error('Form submission error:', error);
      setSubmissionState({
        status: 'error',
        message: 'Network error. Please check your connection and try again.',
      });

      // Reset Turnstile on error
      turnstileRef.current?.reset();
      setTurnstileToken('');
    }
  };

  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  return (
    <section id="contact" className="py-20 lg:py-32 bg-bg-secondary relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-32 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <h2 className="text-4xl font-bold mb-12">Let's Connect</h2>
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Form */}
          <form onSubmit={handleSubmit} className="glass-card-sm p-6 space-y-6" noValidate>
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Name <span className="text-red-500" aria-label="required">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                aria-required="true"
                aria-invalid={touched.name && errors.name ? 'true' : 'false'}
                aria-describedby={touched.name && errors.name ? 'name-error' : undefined}
                disabled={submissionState.status === 'loading'}
                className={`w-full px-4 py-3 bg-bg-tertiary border rounded-lg focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary ${
                  touched.name && errors.name
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : 'border-gray-300 dark:border-gray-800 focus-visible:border-primary'
                }`}
              />
              {touched.name && errors.name && (
                <p id="name-error" className="mt-1 text-sm text-red-500" role="alert">
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email <span className="text-red-500" aria-label="required">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                aria-required="true"
                aria-invalid={touched.email && errors.email ? 'true' : 'false'}
                aria-describedby={touched.email && errors.email ? 'email-error' : undefined}
                disabled={submissionState.status === 'loading'}
                className={`w-full px-4 py-3 bg-bg-tertiary border rounded-lg focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary ${
                  touched.email && errors.email
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : 'border-gray-300 dark:border-gray-800 focus-visible:border-primary'
                }`}
              />
              {touched.email && errors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-500" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium mb-2"
              >
                Message <span className="text-red-500" aria-label="required">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                value={formData.message}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                aria-required="true"
                aria-invalid={touched.message && errors.message ? 'true' : 'false'}
                aria-describedby={touched.message && errors.message ? 'message-error' : undefined}
                disabled={submissionState.status === 'loading'}
                className={`w-full px-4 py-3 bg-bg-tertiary border rounded-lg focus:outline-none transition-colors resize-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary ${
                  touched.message && errors.message
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : 'border-gray-300 dark:border-gray-800 focus-visible:border-primary'
                }`}
              />
              {touched.message && errors.message && (
                <p id="message-error" className="mt-1 text-sm text-red-500" role="alert">
                  {errors.message}
                </p>
              )}
            </div>

            {/* Honeypot field */}
            <input
              type="text"
              name="website"
              value={formData.website}
              onChange={handleChange}
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
            />

            {/* Turnstile CAPTCHA */}
            {turnstileSiteKey && (
              <div className="flex justify-center">
                <Turnstile
                  siteKey={turnstileSiteKey}
                  onSuccess={(token) => setTurnstileToken(token)}
                  onError={() => {
                    setTurnstileToken('');
                    setSubmissionState({
                      status: 'error',
                      message: 'CAPTCHA verification failed. Please try again.',
                    });
                  }}
                  onExpire={() => {
                    setTurnstileToken('');
                  }}
                  options={{
                    theme: theme,
                    size: 'normal',
                  }}
                  ref={turnstileRef}
                />
              </div>
            )}

            {/* Success/Error Messages */}
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="sr-only"
            >
              {submissionState.status === 'success' && submissionState.message}
              {submissionState.status === 'error' && submissionState.message}
              {submissionState.status === 'loading' && 'Submitting form...'}
            </div>

            {submissionState.status === 'success' && (
              <div
                className="p-4 bg-green-500/10 border border-green-500/50 rounded-lg"
                role="alert"
                aria-live="polite"
              >
                <p className="text-sm text-green-500">{submissionState.message}</p>
              </div>
            )}

            {submissionState.status === 'error' && (
              <div
                className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg"
                role="alert"
                aria-live="assertive"
              >
                <p className="text-sm text-red-500">{submissionState.message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              aria-busy={submissionState.status === 'loading'}
              aria-disabled={!canSubmit}
              className="w-full px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
            >
              {submissionState.status === 'loading' ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Sending...
                </>
              ) : (
                'Send Message'
              )}
            </button>
          </form>

          {/* Contact Info */}
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4">Other Ways to Connect</h3>
              <div className="space-y-4">
                <a
                  href="https://www.linkedin.com/in/trystan-m/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-primary hover:text-primary-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary rounded"
                  aria-label="Visit Trystan's LinkedIn profile (opens in new tab)"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  LinkedIn
                </a>
                <a
                  href="https://github.com/Grimm07"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-primary hover:text-primary-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary rounded"
                  aria-label="Visit Trystan's GitHub profile (opens in new tab)"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  GitHub
                </a>
              </div>
            </div>

            <div className="glass-card-sm p-6">
              <h3 className="text-lg font-semibold mb-3">Response Time</h3>
              <p className="text-text-primary">
                I typically respond within 24-48 hours. For urgent inquiries,
                LinkedIn messages tend to get faster responses.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
