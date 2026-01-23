# Portfolio Contact Form Worker

Cloudflare Worker for handling contact form submissions with multiple security layers including Turnstile CAPTCHA verification, rate limiting, and email sending via MailChannels.

## Prerequisites

- Node.js 18+ or 20+
- npm or yarn
- Cloudflare account
- Wrangler CLI (installed via npm)

## Local Development Setup

### 1. Install Dependencies

```bash
cd worker
npm install
```

### 2. Configure Environment Variables

#### For Local Development

Create a `.dev.vars` file in the `worker/` directory:

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and add your Turnstile secret key and development settings:

```
TURNSTILE_SECRET_KEY=your_actual_secret_key_here
DEV_MODE=true
CONTACT_EMAIL=test@example.com
```

**Important:**
- `DEV_MODE=true` enables localhost CORS for local development (required for testing)
- `DEV_MODE` should **NEVER** be set in production - it will be tree-shaken out
- The `.dev.vars` file is gitignored and should never be committed

#### For Production

Secrets are set via Wrangler CLI:

```bash
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put CONTACT_EMAIL
```

### 3. Get Turnstile Keys

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Turnstile** section
3. Create a new site or select an existing one
4. Copy the **Site Key** (for frontend: `VITE_TURNSTILE_SITE_KEY`)
5. Copy the **Secret Key** (for backend: `TURNSTILE_SECRET_KEY`)

**Important:**
- Site Key is public and safe to include in frontend code
- Secret Key must be kept private and only used server-side

### 4. Run Local Development Server

From the project root:

```bash
npm run worker:dev
```

Or from the worker directory:

```bash
cd worker
npm run dev
```

The worker will start on `http://localhost:8787` by default.

### 5. Test the Worker

You can test the worker using curl or your frontend:

```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -H "Origin: https://trystan-tbm.dev" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "message": "This is a test message",
    "turnstileToken": "test_token",
    "timestamp": 1234567890
  }'
```

## Deployment

### Deploy to Cloudflare Workers

From the project root:

```bash
npm run worker:deploy
```

Or from the worker directory:

```bash
cd worker
npm run deploy
```

### Set Production Secrets

Before deploying, ensure production secrets are set:

```bash
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put CONTACT_EMAIL
```

## Environment Variables

### Local Development (`.dev.vars`)

- `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile secret key for local testing

### Production (via `wrangler secret put`)

- `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile secret key
- `CONTACT_EMAIL`: Email address to receive contact form submissions

### Configuration (`wrangler.toml`)

- `CONTACT_EMAIL`: Default email for local testing (can be overridden by secret)

## Security Features

1. **CORS Protection**: Only allows requests from `https://trystan-tbm.dev`
2. **Rate Limiting**: 3 submissions per IP per hour
3. **Turnstile CAPTCHA**: Server-side verification
4. **Honeypot Field**: Detects bot submissions
5. **Time Validation**: Prevents instant submissions (< 3 seconds)
6. **Email Validation**: Server-side regex validation

## API Endpoint

The worker expects POST requests to `/api/contact` with the following JSON body:

```json
{
  "name": "string (min 2 chars)",
  "email": "string (valid email)",
  "message": "string (min 10 chars)",
  "turnstileToken": "string (from Turnstile widget)",
  "timestamp": "number (form load timestamp)",
  "website": "string (honeypot - should be empty)"
}
```

### Response Codes

- `200`: Success - message sent
- `400`: Bad request - validation failed, CAPTCHA failed, or honeypot triggered
- `429`: Rate limit exceeded
- `405`: Method not allowed (only POST accepted)
- `500`: Internal server error

## Troubleshooting

### Worker won't start

- Ensure Wrangler is installed: `npm install -g wrangler` or use local version
- Check that `.dev.vars` exists and contains `TURNSTILE_SECRET_KEY`
- Verify Node.js version is 18+ or 20+

### Turnstile verification fails

- Verify `TURNSTILE_SECRET_KEY` matches the site key used in frontend
- Check that the token is being sent correctly from the frontend
- Ensure the site key and secret key are from the same Turnstile site

### Email not sending

- Verify `CONTACT_EMAIL` is set correctly
- Check MailChannels API is accessible (should work automatically on Cloudflare Workers)
- Review worker logs for error messages

## Project Structure

```
worker/
├── src/
│   └── index.ts          # Main Worker code
├── .dev.vars.example     # Template for local secrets
├── .gitignore            # Git ignore rules
├── package.json          # Worker dependencies
├── tsconfig.json         # TypeScript configuration
├── wrangler.toml         # Wrangler configuration
└── README.md             # This file
```

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare Turnstile Documentation](https://developers.cloudflare.com/turnstile/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [MailChannels API Documentation](https://developers.cloudflare.com/workers/examples/send-email-with-mailchannels/)
