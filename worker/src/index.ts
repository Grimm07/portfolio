/**
 * Cloudflare Worker for Portfolio Contact Form
 * 
 * This worker handles contact form submissions with multiple security layers:
 * - CORS protection (only allow requests from trystan-tbm.dev)
 * - Rate limiting (3 submissions per IP per hour)
 * - Turnstile CAPTCHA verification
 * - Honeypot field validation
 * - Time-based validation (prevent instant submissions)
 * - Server-side email validation
 * - Email sending via MailChannels API
 */

// Rate limiting: Map<IP, { count: number, resetTime: number }>
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Production allowed origin
const PRODUCTION_ORIGIN = 'https://trystan-tbm.dev';

// Check if origin is allowed (production or localhost for development only)
function isOriginAllowed(origin: string | null, isDevMode: boolean): boolean {
  if (!origin) return false;
  
  // Always allow production origin
  if (origin === PRODUCTION_ORIGIN) {
    return true;
  }
  
  // Only allow localhost in development mode
  // This check will be tree-shaken in production builds when isDevMode is false
  if (isDevMode && origin.startsWith('http://localhost:')) {
    return true;
  }
  
  return false;
}

// Rate limiting constants
const RATE_LIMIT_MAX_REQUESTS = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Time validation: minimum seconds between form load and submit
const MIN_SUBMIT_TIME_SECONDS = 3;

interface Env {
  TURNSTILE_SECRET_KEY: string;
  CONTACT_EMAIL: string;
  // Optional: Set to 'true' or '1' to enable development mode (allows localhost)
  // In production, this should not be set, allowing tree-shaking to remove dev code
  DEV_MODE?: string;
}

interface ContactFormData {
  name: string;
  email: string;
  message: string;
  turnstileToken: string;
  website?: string; // honeypot field
  timestamp?: number; // form load timestamp for time validation
}

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

/** Raw JSON payload from contact form (before validation) */
interface RawContactFormPayload {
  name?: unknown;
  email?: unknown;
  message?: unknown;
  turnstileToken?: unknown;
  website?: unknown;
  timestamp?: unknown;
}

/**
 * Handle CORS preflight requests
 */
function handleCORS(request: Request, isDevMode: boolean): Response | null {
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('Origin');
    
    // Only allow requests from allowed origins
    if (isOriginAllowed(origin, isDevMode)) {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin!,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400', // 24 hours
        },
      });
    }
    
    // Reject unauthorized origins
    return new Response(null, { status: 403 });
  }
  
  return null;
}

/**
 * Add CORS headers to response
 */
function addCORSHeaders(response: Response, origin: string | null, isDevMode: boolean): Response {
  if (isOriginAllowed(origin, isDevMode)) {
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', origin!);
    newHeaders.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    newHeaders.set('Access-Control-Allow-Headers', 'Content-Type');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }
  
  return response;
}

/**
 * Security Layer 1: Rate Limiting
 * Limits requests to 3 per IP per hour
 */
function checkRateLimit(ip: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  // Clean up expired entries periodically (every 100 requests)
  if (rateLimitMap.size > 0 && Math.random() < 0.01) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetTime < now) {
        rateLimitMap.delete(key);
      }
    }
  }
  
  if (!record) {
    // First request from this IP
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true };
  }
  
  // Check if window has expired
  if (record.resetTime < now) {
    // Reset the counter
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true };
  }
  
  // Check if limit exceeded
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, resetTime: record.resetTime };
  }
  
  // Increment counter
  record.count++;
  rateLimitMap.set(ip, record);
  
  return { allowed: true };
}

/**
 * Security Layer 2: Honeypot Check
 * Rejects submissions if the hidden 'website' field is filled (bot detection)
 */
function checkHoneypot(data: ContactFormData): boolean {
  // If website field exists and has any value, it's a bot
  return !data.website || data.website.trim() === '';
}

/**
 * Security Layer 3: Time Validation
 * Rejects submissions that happen too quickly (< 3 seconds)
 * Prevents automated form submissions
 */
function checkTimeValidation(data: ContactFormData): boolean {
  if (!data.timestamp) {
    // No timestamp provided - reject
    return false;
  }
  
  const now = Date.now();
  const elapsedSeconds = (now - data.timestamp) / 1000;
  
  // Must be at least MIN_SUBMIT_TIME_SECONDS seconds
  return elapsedSeconds >= MIN_SUBMIT_TIME_SECONDS;
}

/**
 * Security Layer 4: Email Validation
 * Server-side regex validation for email format
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Security Layer 5: Turnstile Verification
 * Verifies the CAPTCHA token with Cloudflare's API
 */
async function verifyTurnstile(
  token: string,
  ip: string,
  secretKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
        remoteip: ip,
      }),
    });
    
    if (!response.ok) {
      return { success: false, error: 'Turnstile verification failed' };
    }
    
    const result: TurnstileVerifyResponse = await response.json();
    
    if (!result.success) {
      const errorCodes = result['error-codes'] || ['unknown'];
      return { success: false, error: `Turnstile error: ${errorCodes.join(', ')}` };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return { success: false, error: 'Turnstile verification request failed' };
  }
}

/**
 * Parse form data from request
 */
async function parseFormData(request: Request): Promise<ContactFormData | null> {
  try {
    const contentType = request.headers.get('Content-Type') || '';
    
    if (contentType.includes('application/json')) {
      const data = await request.json() as RawContactFormPayload;
      return {
        name: String(data.name || '').trim(),
        email: String(data.email || '').trim(),
        message: String(data.message || '').trim(),
        turnstileToken: String(data.turnstileToken || '').trim(),
        website: data.website ? String(data.website).trim() : undefined,
        timestamp: data.timestamp ? Number(data.timestamp) : undefined,
      };
    }
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      return {
        name: String(formData.get('name') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        message: String(formData.get('message') || '').trim(),
        turnstileToken: String(formData.get('turnstileToken') || '').trim(),
        website: formData.get('website') ? String(formData.get('website')).trim() : undefined,
        timestamp: formData.get('timestamp') ? Number(formData.get('timestamp')) : undefined,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing form data:', error);
    return null;
  }
}

/**
 * Validate form data fields
 */
function validateFormData(data: ContactFormData): { valid: boolean; error?: string } {
  // Name validation
  if (!data.name || data.name.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }
  
  // Email validation
  if (!data.email) {
    return { valid: false, error: 'Email is required' };
  }
  
  if (!validateEmail(data.email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  // Message validation
  if (!data.message || data.message.trim().length < 10) {
    return { valid: false, error: 'Message must be at least 10 characters' };
  }
  
  // Turnstile token validation
  if (!data.turnstileToken) {
    return { valid: false, error: 'CAPTCHA token is required' };
  }
  
  return { valid: true };
}

/**
 * Send email via MailChannels API
 * In development mode, skips actual email sending and logs the submission instead
 */
async function sendEmail(
  formData: ContactFormData,
  contactEmail: string,
  isDevMode: boolean
): Promise<{ success: boolean; error?: string }> {
  const emailBody = `
New Contact Form Submission

Name: ${formData.name}
Email: ${formData.email}
Message:
${formData.message}

---
Submitted at: ${new Date().toISOString()}
  `.trim();

  // In development mode, skip email sending (MailChannels requires DKIM which isn't available locally)
  if (isDevMode) {
    console.log('📧 [DEV MODE] Email would be sent:');
    console.log('To:', contactEmail);
    console.log('From: noreply@trystan-tbm.dev');
    console.log('Subject: Portfolio Contact:', formData.name);
    console.log('Body:', emailBody);
    return { success: true };
  }

  // Production: Send actual email via MailChannels
  try {
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: contactEmail }],
          },
        ],
        from: {
          email: 'noreply@trystan-tbm.dev',
          name: 'Portfolio Contact Form',
        },
        subject: `Portfolio Contact: ${formData.name}`,
        content: [
          {
            type: 'text/plain',
            value: emailBody,
          },
        ],
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('MailChannels API error:', errorText);
      return { success: false, error: 'Failed to send email' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: 'Email service error' };
  }
}

/**
 * Get client IP address from request
 */
function getClientIP(request: Request): string {
  // Check CF-Connecting-IP header (Cloudflare sets this)
  const cfIP = request.headers.get('CF-Connecting-IP');
  if (cfIP) {
    return cfIP;
  }
  
  // Fallback to X-Forwarded-For
  const xForwardedFor = request.headers.get('X-Forwarded-For');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  
  // Last resort: use a default value (shouldn't happen with Cloudflare)
  return 'unknown';
}

/**
 * Main request handler
 */
export default {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get('Origin');
    
    // Determine if we're in development mode
    // In production, DEV_MODE will be undefined, allowing tree-shaking to remove dev code
    const isDevMode = env.DEV_MODE === 'true' || env.DEV_MODE === '1';
    
    // Handle CORS preflight
    const corsResponse = handleCORS(request, isDevMode);
    if (corsResponse) {
      return corsResponse;
    }
    
    // Only allow POST requests
    if (request.method !== 'POST') {
      const response = new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return addCORSHeaders(response, origin, isDevMode);
    }
    
    // Check CORS origin
    if (!isOriginAllowed(origin, isDevMode)) {
      const response = new Response(
        JSON.stringify({ error: 'Origin not allowed' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return addCORSHeaders(response, origin, isDevMode);
    }
    
    // Security Layer 1: Rate Limiting
    const clientIP = getClientIP(request);
    const rateLimitCheck = checkRateLimit(clientIP);
    
    if (!rateLimitCheck.allowed) {
      const resetTime = rateLimitCheck.resetTime || Date.now();
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      
      const response = new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
          },
        }
      );
      return addCORSHeaders(response, origin, isDevMode);
    }
    
    // Parse form data
    const formData = await parseFormData(request);
    
    if (!formData) {
      const response = new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return addCORSHeaders(response, origin, isDevMode);
    }
    
    // Validate form fields
    const validation = validateFormData(formData);
    if (!validation.valid) {
      const response = new Response(
        JSON.stringify({ error: validation.error }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return addCORSHeaders(response, origin, isDevMode);
    }
    
    // Security Layer 2: Honeypot Check
    if (!checkHoneypot(formData)) {
      // Silently reject (don't reveal it's a honeypot)
      const response = new Response(
        JSON.stringify({ error: 'Invalid submission' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return addCORSHeaders(response, origin, isDevMode);
    }
    
    // Security Layer 3: Time Validation
    if (!checkTimeValidation(formData)) {
      const response = new Response(
        JSON.stringify({ error: 'Submission too fast' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return addCORSHeaders(response, origin, isDevMode);
    }
    
    // Security Layer 4: Turnstile Verification
    const turnstileResult = await verifyTurnstile(
      formData.turnstileToken,
      clientIP,
      env.TURNSTILE_SECRET_KEY
    );
    
    if (!turnstileResult.success) {
      const response = new Response(
        JSON.stringify({ error: turnstileResult.error || 'CAPTCHA verification failed' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return addCORSHeaders(response, origin, isDevMode);
    }
    
    // All security checks passed - send email
    const emailResult = await sendEmail(formData, env.CONTACT_EMAIL, isDevMode);
    
    if (!emailResult.success) {
      // Log error but don't expose internal details
      console.error('Email sending failed:', emailResult.error);
      
      const response = new Response(
        JSON.stringify({ error: 'Failed to process submission' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return addCORSHeaders(response, origin, isDevMode);
    }
    
    // Success
    const response = new Response(
      JSON.stringify({ success: true, message: 'Message sent successfully' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return addCORSHeaders(response, origin, isDevMode);
  },
};
