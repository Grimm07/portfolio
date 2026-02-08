import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// The worker exports a default object with a fetch method.
// We import it and call fetch() directly with mock Request/Response/Env.
import worker from '../index';

// --- Helpers ---

const PRODUCTION_ORIGIN = 'https://trystan-tbm.dev';

/**
 * Auto-incrementing IP counter to give each test a unique IP address.
 * The worker's rateLimitMap is module-level state that persists across tests,
 * so reusing IPs causes later tests to hit the rate limit.
 */
let ipCounter = 0;
function uniqueIP(): string {
  ipCounter++;
  const a = (ipCounter >> 16) & 255;
  const b = (ipCounter >> 8) & 255;
  const c = ipCounter & 255;
  return `100.${a}.${b}.${c}`;
}

interface MockEnv {
  TURNSTILE_SECRET_KEY: string;
  CONTACT_EMAIL: string;
  DEV_MODE?: string;
}

function makeEnv(overrides: Partial<MockEnv> = {}): MockEnv {
  return {
    TURNSTILE_SECRET_KEY: 'test-secret-key',
    CONTACT_EMAIL: 'owner@example.com',
    ...overrides,
  };
}

function makeCtx(): ExecutionContext {
  return {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
  } as unknown as ExecutionContext;
}

/** Build a valid form payload. Override individual fields as needed. */
function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Jane Doe',
    email: 'jane@example.com',
    message: 'Hello, this is a valid test message!',
    turnstileToken: 'valid-token',
    timestamp: Date.now() - 10_000, // 10 seconds ago
    ...overrides,
  };
}

/** Create a POST request to the worker with JSON body. Each call gets a unique IP by default. */
function postRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
) {
  const ip = headers['CF-Connecting-IP'] || uniqueIP();
  return new Request('https://trystan-tbm.dev/api/contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: PRODUCTION_ORIGIN,
      'CF-Connecting-IP': ip,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

/** Create a form-urlencoded POST request. Each call gets a unique IP by default. */
function formEncodedRequest(
  data: Record<string, string>,
  headers: Record<string, string> = {},
) {
  const ip = headers['CF-Connecting-IP'] || uniqueIP();
  const params = new URLSearchParams(data);
  return new Request('https://trystan-tbm.dev/api/contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: PRODUCTION_ORIGIN,
      'CF-Connecting-IP': ip,
      ...headers,
    },
    body: params.toString(),
  });
}

// Mock global fetch for Turnstile + MailChannels calls
const mockFetch = vi.fn();

// --- Test Suite ---

describe('Worker Contact Form Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);

    // Default: Turnstile succeeds, MailChannels succeeds
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

  // ============================================================
  // CORS
  // ============================================================
  describe('CORS', () => {
    it('handles OPTIONS preflight from production origin', async () => {
      const req = new Request('https://trystan-tbm.dev/api/contact', {
        method: 'OPTIONS',
        headers: { Origin: PRODUCTION_ORIGIN },
      });
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(PRODUCTION_ORIGIN);
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('rejects OPTIONS preflight from unauthorized origin', async () => {
      const req = new Request('https://trystan-tbm.dev/api/contact', {
        method: 'OPTIONS',
        headers: { Origin: 'https://evil.com' },
      });
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(403);
    });

    it('allows localhost origin in dev mode', async () => {
      const req = new Request('http://localhost:5173/api/contact', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:5173' },
      });
      const res = await worker.fetch(req, makeEnv({ DEV_MODE: 'true' }), makeCtx());

      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    });

    it('blocks localhost origin when NOT in dev mode', async () => {
      const req = new Request('http://localhost:5173/api/contact', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:5173' },
      });
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(403);
    });

    it('adds CORS headers to successful POST responses', async () => {
      const req = postRequest(validPayload());
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(PRODUCTION_ORIGIN);
    });

    it('rejects POST from unauthorized origin with 403', async () => {
      const req = postRequest(validPayload(), { Origin: 'https://evil.com' });
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(403);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/origin not allowed/i);
    });
  });

  // ============================================================
  // HTTP Method
  // ============================================================
  describe('HTTP method validation', () => {
    it('rejects GET requests with 405', async () => {
      const req = new Request('https://trystan-tbm.dev/api/contact', {
        method: 'GET',
        headers: { Origin: PRODUCTION_ORIGIN },
      });
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(405);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/method not allowed/i);
    });

    it('rejects PUT requests with 405', async () => {
      const req = new Request('https://trystan-tbm.dev/api/contact', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Origin: PRODUCTION_ORIGIN,
        },
        body: JSON.stringify(validPayload()),
      });
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(405);
    });
  });

  // ============================================================
  // Form parsing
  // ============================================================
  describe('form parsing', () => {
    it('parses JSON content type', async () => {
      const req = postRequest(validPayload());
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(200);
    });

    it('parses form-urlencoded content type', async () => {
      const payload = validPayload();
      const req = formEncodedRequest({
        name: String(payload.name),
        email: String(payload.email),
        message: String(payload.message),
        turnstileToken: String(payload.turnstileToken),
        timestamp: String(payload.timestamp),
      });
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(200);
    });

    it('rejects unsupported content type with 400', async () => {
      const req = new Request('https://trystan-tbm.dev/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          Origin: PRODUCTION_ORIGIN,
          'CF-Connecting-IP': uniqueIP(),
        },
        body: 'hello',
      });
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/invalid request format/i);
    });
  });

  // ============================================================
  // Field validation
  // ============================================================
  describe('field validation', () => {
    it('rejects missing name', async () => {
      const req = postRequest(validPayload({ name: '' }));
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/name/i);
    });

    it('rejects name shorter than 2 characters', async () => {
      const req = postRequest(validPayload({ name: 'A' }));
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/name must be at least 2 characters/i);
    });

    it('rejects missing email', async () => {
      const req = postRequest(validPayload({ email: '' }));
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/email/i);
    });

    it('rejects invalid email format', async () => {
      const req = postRequest(validPayload({ email: 'not-an-email' }));
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/invalid email/i);
    });

    it('rejects email without domain dot', async () => {
      const req = postRequest(validPayload({ email: 'user@localhost' }));
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(400);
    });

    it('accepts valid email with subdomains', async () => {
      const req = postRequest(validPayload({ email: 'user@mail.example.co.uk' }));
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(200);
    });

    it('rejects message shorter than 10 characters', async () => {
      const req = postRequest(validPayload({ message: 'short' }));
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/message must be at least 10 characters/i);
    });

    it('rejects missing turnstile token', async () => {
      const req = postRequest(validPayload({ turnstileToken: '' }));
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/captcha token/i);
    });
  });

  // ============================================================
  // Security Layer: Honeypot
  // ============================================================
  describe('honeypot detection', () => {
    it('rejects submission when honeypot website field is filled', async () => {
      const req = postRequest(validPayload({ website: 'http://spam.com' }));
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/invalid submission/i);
    });

    it('accepts submission when honeypot field is empty', async () => {
      const req = postRequest(validPayload({ website: '' }));
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(200);
    });

    it('accepts submission when honeypot field is missing', async () => {
      const payload = validPayload();
      delete (payload as Record<string, unknown>).website;
      const req = postRequest(payload);
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(200);
    });
  });

  // ============================================================
  // Security Layer: Time validation
  // ============================================================
  describe('time validation', () => {
    it('rejects submission with no timestamp', async () => {
      const payload = validPayload();
      delete (payload as Record<string, unknown>).timestamp;
      const req = postRequest(payload);
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/submission too fast/i);
    });

    it('rejects submission made in under 3 seconds', async () => {
      const req = postRequest(validPayload({ timestamp: Date.now() - 1000 })); // 1 second ago
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/submission too fast/i);
    });

    it('accepts submission made after 3 seconds', async () => {
      const req = postRequest(validPayload({ timestamp: Date.now() - 5000 })); // 5 seconds ago
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(200);
    });
  });

  // ============================================================
  // Security Layer: Rate limiting
  // ============================================================
  describe('rate limiting', () => {
    it('allows first 3 requests from the same IP', async () => {
      const env = makeEnv();
      const ctx = makeCtx();

      for (let i = 0; i < 3; i++) {
        const req = postRequest(validPayload(), { 'CF-Connecting-IP': '10.0.0.1' });
        const res = await worker.fetch(req, env, ctx);
        expect(res.status).toBe(200);
      }
    });

    it('blocks the 4th request from the same IP with 429', async () => {
      const env = makeEnv();
      const ctx = makeCtx();

      // Exhaust the limit
      for (let i = 0; i < 3; i++) {
        const req = postRequest(validPayload(), { 'CF-Connecting-IP': '10.0.0.2' });
        await worker.fetch(req, env, ctx);
      }

      // 4th request should be rate-limited
      const req = postRequest(validPayload(), { 'CF-Connecting-IP': '10.0.0.2' });
      const res = await worker.fetch(req, env, ctx);

      expect(res.status).toBe(429);
      const body = await res.json() as { error: string; retryAfter: number };
      expect(body.error).toMatch(/rate limit/i);
      expect(body.retryAfter).toBeGreaterThan(0);
      expect(res.headers.get('Retry-After')).toBeTruthy();
    });

    it('allows requests from different IPs independently', async () => {
      const env = makeEnv();
      const ctx = makeCtx();

      // 3 requests from IP A
      for (let i = 0; i < 3; i++) {
        const req = postRequest(validPayload(), { 'CF-Connecting-IP': '10.0.0.3' });
        await worker.fetch(req, env, ctx);
      }

      // IP B should still work
      const req = postRequest(validPayload(), { 'CF-Connecting-IP': '10.0.0.4' });
      const res = await worker.fetch(req, env, ctx);
      expect(res.status).toBe(200);
    });

    it('extracts IP from X-Forwarded-For when CF-Connecting-IP is absent', async () => {
      const env = makeEnv();
      const ctx = makeCtx();

      // Send 4 requests via X-Forwarded-For
      for (let i = 0; i < 3; i++) {
        const req = new Request('https://trystan-tbm.dev/api/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: PRODUCTION_ORIGIN,
            'X-Forwarded-For': '192.168.1.1, 10.0.0.1',
          },
          body: JSON.stringify(validPayload()),
        });
        await worker.fetch(req, env, ctx);
      }

      // 4th should be rate limited for the same forwarded IP
      const req = new Request('https://trystan-tbm.dev/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: PRODUCTION_ORIGIN,
          'X-Forwarded-For': '192.168.1.1, 10.0.0.1',
        },
        body: JSON.stringify(validPayload()),
      });
      const res = await worker.fetch(req, env, ctx);
      expect(res.status).toBe(429);
    });
  });

  // ============================================================
  // Security Layer: Turnstile CAPTCHA verification
  // ============================================================
  describe('Turnstile verification', () => {
    it('calls Turnstile API with correct parameters', async () => {
      const testIP = uniqueIP();
      const req = postRequest(validPayload(), { 'CF-Connecting-IP': testIP });
      await worker.fetch(req, makeEnv(), makeCtx());

      const turnstileCall = mockFetch.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('turnstile'),
      );
      expect(turnstileCall).toBeDefined();

      const turnstileBody = JSON.parse(turnstileCall![1].body);
      expect(turnstileBody.secret).toBe('test-secret-key');
      expect(turnstileBody.response).toBe('valid-token');
      expect(turnstileBody.remoteip).toBe(testIP);
    });

    it('rejects submission when Turnstile verification fails', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.includes('turnstile')) {
          return new Response(
            JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response(null, { status: 404 });
      });

      const req = postRequest(validPayload());
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/turnstile/i);
    });

    it('rejects submission when Turnstile API returns non-200', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.includes('turnstile')) {
          return new Response('Internal Server Error', { status: 500 });
        }
        return new Response(null, { status: 404 });
      });

      const req = postRequest(validPayload());
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/verification failed/i);
    });

    it('rejects submission when Turnstile API throws a network error', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.includes('turnstile')) {
          throw new Error('Network error');
        }
        return new Response(null, { status: 404 });
      });

      const req = postRequest(validPayload());
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/failed/i);
    });
  });

  // ============================================================
  // Email sending via MailChannels
  // ============================================================
  describe('email sending', () => {
    it('calls MailChannels API with correct email payload', async () => {
      const req = postRequest(validPayload({ name: 'Alice Smith', email: 'alice@test.com' }));
      await worker.fetch(req, makeEnv({ CONTACT_EMAIL: 'owner@example.com' }), makeCtx());

      const mailCall = mockFetch.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('mailchannels'),
      );
      expect(mailCall).toBeDefined();

      const mailBody = JSON.parse(mailCall![1].body);
      // Verify recipient is the CONTACT_EMAIL env var
      expect(mailBody.personalizations[0].to[0].email).toBe('owner@example.com');
      // Verify from address
      expect(mailBody.from.email).toBe('noreply@trystan-tbm.dev');
      expect(mailBody.from.name).toBe('Portfolio Contact Form');
      // Verify subject includes sender name
      expect(mailBody.subject).toContain('Alice Smith');
      // Verify body includes the message and sender info
      expect(mailBody.content[0].value).toContain('Alice Smith');
      expect(mailBody.content[0].value).toContain('alice@test.com');
    });

    it('returns 500 when MailChannels API fails', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.includes('turnstile')) {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (typeof url === 'string' && url.includes('mailchannels')) {
          return new Response('Service Unavailable', { status: 503 });
        }
        return new Response('Not found', { status: 404 });
      });

      const req = postRequest(validPayload());
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(500);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/failed to process/i);
    });

    it('returns 500 when MailChannels API throws network error', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.includes('turnstile')) {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (typeof url === 'string' && url.includes('mailchannels')) {
          throw new Error('Connection refused');
        }
        return new Response('Not found', { status: 404 });
      });

      const req = postRequest(validPayload());
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(500);
    });

    it('skips MailChannels in dev mode and returns success', async () => {
      const req = new Request('https://trystan-tbm.dev/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: PRODUCTION_ORIGIN,
          'CF-Connecting-IP': '10.0.0.99',
        },
        body: JSON.stringify(validPayload()),
      });
      const res = await worker.fetch(req, makeEnv({ DEV_MODE: 'true' }), makeCtx());

      expect(res.status).toBe(200);

      // MailChannels should NOT have been called
      const mailCall = mockFetch.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('mailchannels'),
      );
      expect(mailCall).toBeUndefined();
    });
  });

  // ============================================================
  // Happy path: full end-to-end submission
  // ============================================================
  describe('happy path', () => {
    it('processes a valid submission and returns success', async () => {
      const payload = validPayload({
        name: 'Trystan Test',
        email: 'trystan@example.com',
        message: 'I would like to discuss an AI/ML project opportunity.',
      });
      const req = postRequest(payload);
      const res = await worker.fetch(req, makeEnv(), makeCtx());

      expect(res.status).toBe(200);
      const body = await res.json() as { success: boolean; message: string };
      expect(body.success).toBe(true);
      expect(body.message).toMatch(/sent successfully/i);

      // Verify both external APIs were called
      const turnstileCall = mockFetch.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('turnstile'),
      );
      const mailCall = mockFetch.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('mailchannels'),
      );
      expect(turnstileCall).toBeDefined();
      expect(mailCall).toBeDefined();
    });

    it('sends email body with all submitted information', async () => {
      const payload = validPayload({
        name: 'Contact Person',
        email: 'contact@company.org',
        message: 'Detailed message about collaboration.',
      });
      const req = postRequest(payload);
      await worker.fetch(req, makeEnv({ CONTACT_EMAIL: 'me@trystan-tbm.dev' }), makeCtx());

      const mailCall = mockFetch.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('mailchannels'),
      );
      const mailBody = JSON.parse(mailCall![1].body);
      const emailContent = mailBody.content[0].value;

      // The email you receive should contain all the info needed to respond
      expect(emailContent).toContain('Contact Person');
      expect(emailContent).toContain('contact@company.org');
      expect(emailContent).toContain('Detailed message about collaboration.');
      expect(emailContent).toContain('Submitted at:');
    });
  });

  // ============================================================
  // Security: ordering of checks
  // ============================================================
  describe('security check ordering', () => {
    it('rate limit is checked before form parsing (no body needed)', async () => {
      const env = makeEnv();
      const ctx = makeCtx();

      // Exhaust rate limit for this IP
      for (let i = 0; i < 3; i++) {
        const req = postRequest(validPayload(), { 'CF-Connecting-IP': '10.0.0.50' });
        await worker.fetch(req, env, ctx);
      }

      // Even with invalid body, should get 429 not 400
      const req = new Request('https://trystan-tbm.dev/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: PRODUCTION_ORIGIN,
          'CF-Connecting-IP': '10.0.0.50',
        },
        body: 'not json',
      });
      const res = await worker.fetch(req, env, ctx);
      expect(res.status).toBe(429);
    });

    it('honeypot check prevents Turnstile/email calls', async () => {
      mockFetch.mockClear();

      const req = postRequest(
        validPayload({ website: 'http://bot.spam' }),
        { 'CF-Connecting-IP': '10.0.0.60' },
      );
      await worker.fetch(req, makeEnv(), makeCtx());

      // Neither Turnstile nor MailChannels should be called
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('time validation prevents Turnstile/email calls', async () => {
      mockFetch.mockClear();

      const req = postRequest(
        validPayload({ timestamp: Date.now() }), // 0 seconds ago
        { 'CF-Connecting-IP': '10.0.0.70' },
      );
      await worker.fetch(req, makeEnv(), makeCtx());

      // Neither Turnstile nor MailChannels should be called
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
