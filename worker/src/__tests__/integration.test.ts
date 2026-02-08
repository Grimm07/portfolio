/**
 * Integration test: simulates the exact payload the Contact component sends
 * and verifies the worker processes it end-to-end, resulting in an email
 * being dispatched via MailChannels with all the submitted information.
 *
 * This is the critical path: someone fills out the form → you get contacted.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import worker from '../index';

const PRODUCTION_ORIGIN = 'https://trystan-tbm.dev';

const mockFetch = vi.fn();

let ipCounter = 0;
function uniqueIP(): string {
  ipCounter++;
  return `200.0.${(ipCounter >> 8) & 255}.${ipCounter & 255}`;
}

function makeEnv() {
  return {
    TURNSTILE_SECRET_KEY: 'test-secret',
    CONTACT_EMAIL: 'trystan@example.com',
  };
}

function makeCtx() {
  return {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
  } as unknown as ExecutionContext;
}

describe('Contact Form → Worker → Email Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);

    mockFetch.mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.includes('turnstile')) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (typeof url === 'string' && url.includes('mailchannels')) {
        return new Response(null, { status: 202 });
      }
      return new Response('Not found', { status: 404 });
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('delivers a contact form submission as an email with all user-provided information', async () => {
    // This payload mirrors exactly what Contact.tsx sends in handleSubmit
    const contactPayload = {
      name: 'Hiring Manager',
      email: 'hr@techcorp.com',
      message: 'We are interested in discussing an ML engineering role with you. Please get in touch at your earliest convenience.',
      turnstileToken: 'cf-turnstile-token-abc123',
      timestamp: Date.now() - 15_000, // Form loaded 15 seconds ago
      // website is undefined (honeypot not filled) — matches the component's `website: formData.website || undefined`
    };

    const request = new Request('https://trystan-tbm.dev/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: PRODUCTION_ORIGIN,
        'CF-Connecting-IP': uniqueIP(),
      },
      body: JSON.stringify(contactPayload),
    });

    const response = await worker.fetch(request, makeEnv(), makeCtx());

    // 1. Worker should return 200 success
    expect(response.status).toBe(200);
    const body = await response.json() as { success: boolean; message: string };
    expect(body.success).toBe(true);

    // 2. Turnstile was verified
    const turnstileCall = mockFetch.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('turnstile'),
    );
    expect(turnstileCall).toBeDefined();
    const turnstilePayload = JSON.parse(turnstileCall![1].body);
    expect(turnstilePayload.response).toBe('cf-turnstile-token-abc123');

    // 3. MailChannels was called — this is the critical assertion:
    //    if this passes, you WILL get the email
    const mailCall = mockFetch.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('mailchannels'),
    );
    expect(mailCall).toBeDefined();

    const mailPayload = JSON.parse(mailCall![1].body);

    // Recipient is your CONTACT_EMAIL
    expect(mailPayload.personalizations[0].to[0].email).toBe('trystan@example.com');

    // From address is the portfolio domain
    expect(mailPayload.from.email).toBe('noreply@trystan-tbm.dev');
    expect(mailPayload.from.name).toBe('Portfolio Contact Form');

    // Subject identifies who contacted you
    expect(mailPayload.subject).toBe('Portfolio Contact: Hiring Manager');

    // Email body contains everything you need to respond
    const emailBody: string = mailPayload.content[0].value;
    expect(emailBody).toContain('Hiring Manager');
    expect(emailBody).toContain('hr@techcorp.com');
    expect(emailBody).toContain('ML engineering role');
    expect(emailBody).toContain('Submitted at:');
  });

  it('blocks a bot that fills the honeypot and never sends an email', async () => {
    const botPayload = {
      name: 'Bot User',
      email: 'bot@spam.net',
      message: 'Buy cheap products at our website now!!!',
      turnstileToken: 'fake-token',
      timestamp: Date.now() - 10_000,
      website: 'http://spam-site.com', // Honeypot filled = bot
    };

    const request = new Request('https://trystan-tbm.dev/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: PRODUCTION_ORIGIN,
        'CF-Connecting-IP': uniqueIP(),
      },
      body: JSON.stringify(botPayload),
    });

    const response = await worker.fetch(request, makeEnv(), makeCtx());

    expect(response.status).toBe(400);

    // No external API calls should have been made
    const mailCall = mockFetch.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('mailchannels'),
    );
    expect(mailCall).toBeUndefined();
  });

  it('blocks a rapid automated submission and never sends an email', async () => {
    const automatedPayload = {
      name: 'Script Kiddie',
      email: 'attacker@evil.com',
      message: 'This was submitted by an automated script instantly.',
      turnstileToken: 'automated-token',
      timestamp: Date.now() - 500, // Only 0.5 seconds ago
    };

    const request = new Request('https://trystan-tbm.dev/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: PRODUCTION_ORIGIN,
        'CF-Connecting-IP': uniqueIP(),
      },
      body: JSON.stringify(automatedPayload),
    });

    const response = await worker.fetch(request, makeEnv(), makeCtx());

    expect(response.status).toBe(400);
    const body = await response.json() as { error: string };
    expect(body.error).toMatch(/too fast/i);

    // No email sent
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('blocks a cross-origin attack and never sends an email', async () => {
    const payload = {
      name: 'CSRF Attacker',
      email: 'attacker@evil.com',
      message: 'Cross-site request forgery attempt.',
      turnstileToken: 'stolen-token',
      timestamp: Date.now() - 10_000,
    };

    const request = new Request('https://trystan-tbm.dev/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil-site.com',
        'CF-Connecting-IP': uniqueIP(),
      },
      body: JSON.stringify(payload),
    });

    const response = await worker.fetch(request, makeEnv(), makeCtx());

    expect(response.status).toBe(403);

    // No email sent
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rate-limits a spammer after 3 submissions', async () => {
    const spammerIP = uniqueIP();
    const env = makeEnv();
    const ctx = makeCtx();

    // First 3 submissions succeed
    for (let i = 0; i < 3; i++) {
      const request = new Request('https://trystan-tbm.dev/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: PRODUCTION_ORIGIN,
          'CF-Connecting-IP': spammerIP,
        },
        body: JSON.stringify({
          name: `Spammer ${i + 1}`,
          email: 'spam@example.com',
          message: 'This is spam message number ' + (i + 1) + ' from a spammer.',
          turnstileToken: 'token-' + i,
          timestamp: Date.now() - 10_000,
        }),
      });
      const response = await worker.fetch(request, env, ctx);
      expect(response.status).toBe(200);
    }

    // Count emails sent so far
    const emailsSent = mockFetch.mock.calls.filter(
      (c) => typeof c[0] === 'string' && c[0].includes('mailchannels'),
    ).length;
    expect(emailsSent).toBe(3);

    // 4th submission is rate-limited — no additional email
    mockFetch.mockClear();
    mockFetch.mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.includes('turnstile')) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (typeof url === 'string' && url.includes('mailchannels')) {
        return new Response(null, { status: 202 });
      }
      return new Response('Not found', { status: 404 });
    });

    const blockedRequest = new Request('https://trystan-tbm.dev/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: PRODUCTION_ORIGIN,
        'CF-Connecting-IP': spammerIP,
      },
      body: JSON.stringify({
        name: 'Spammer 4',
        email: 'spam@example.com',
        message: 'This is spam message number 4 from a spammer.',
        turnstileToken: 'token-4',
        timestamp: Date.now() - 10_000,
      }),
    });
    const blockedResponse = await worker.fetch(blockedRequest, env, ctx);

    expect(blockedResponse.status).toBe(429);
    const blockedBody = await blockedResponse.json() as { error: string; retryAfter: number };
    expect(blockedBody.retryAfter).toBeGreaterThan(0);

    // No MailChannels call for the blocked request
    const extraEmails = mockFetch.mock.calls.filter(
      (c) => typeof c[0] === 'string' && c[0].includes('mailchannels'),
    );
    expect(extraEmails.length).toBe(0);
  });

  it('rejects when Turnstile CAPTCHA fails and never sends an email', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.includes('turnstile')) {
        return new Response(
          JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (typeof url === 'string' && url.includes('mailchannels')) {
        return new Response(null, { status: 202 });
      }
      return new Response('Not found', { status: 404 });
    });

    const request = new Request('https://trystan-tbm.dev/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: PRODUCTION_ORIGIN,
        'CF-Connecting-IP': uniqueIP(),
      },
      body: JSON.stringify({
        name: 'Real Person',
        email: 'real@example.com',
        message: 'This should fail because the CAPTCHA token is invalid.',
        turnstileToken: 'invalid-captcha-token',
        timestamp: Date.now() - 10_000,
      }),
    });

    const response = await worker.fetch(request, makeEnv(), makeCtx());

    expect(response.status).toBe(400);

    // MailChannels should NOT have been called
    const mailCall = mockFetch.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('mailchannels'),
    );
    expect(mailCall).toBeUndefined();
  });
});
