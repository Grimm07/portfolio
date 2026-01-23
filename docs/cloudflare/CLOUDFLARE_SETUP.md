# Cloudflare Setup Guide

This guide walks through setting up Cloudflare services for hosting a portfolio site with a contact form backend. It assumes you have already purchased a domain from a registrar.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Add Domain to Cloudflare](#add-domain-to-cloudflare)
3. [Create API Token](#create-api-token)
4. [Set Up Cloudflare Pages](#set-up-cloudflare-pages)
5. [Set Up Cloudflare Workers](#set-up-cloudflare-workers)
6. [Configure Turnstile (CAPTCHA)](#configure-turnstile-captcha)
7. [Configure DNS Records](#configure-dns-records)
8. [Set Up MailChannels (Email Sending)](#set-up-mailchannels-email-sending)
9. [Environment Variables Summary](#environment-variables-summary)
10. [Terraform Integration](#terraform-integration)
11. [Verification Checklist](#verification-checklist)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- [ ] A registered domain name
- [ ] Access to your domain registrar's DNS settings
- [ ] A Cloudflare account (free tier is sufficient)
- [ ] Git repository with your portfolio code
- [ ] Node.js and npm installed locally

---

## Add Domain to Cloudflare

### Step 1: Create Cloudflare Account

1. Go to [cloudflare.com](https://cloudflare.com)
2. Click **Sign Up** and create an account
3. Verify your email address

### Step 2: Add Your Domain

1. Log in to the Cloudflare dashboard
2. Click **Add a Site** (or **Add site** button)
3. Enter your domain name (e.g., `example.com`)
4. Select the **Free** plan (sufficient for portfolio sites)
5. Click **Continue**

### Step 3: Review DNS Records

Cloudflare will scan your existing DNS records:

1. Review the imported records
2. Remove any records you don't need
3. Click **Continue**

### Step 4: Update Nameservers

Cloudflare will provide two nameservers (e.g., `ada.ns.cloudflare.com`):

1. Log in to your domain registrar (GoDaddy, Namecheap, Google Domains, etc.)
2. Find the **Nameservers** or **DNS** settings
3. Change nameservers from your registrar's defaults to Cloudflare's nameservers
4. Save the changes

**Note:** Nameserver propagation can take up to 24-48 hours, but usually completes within a few hours.

### Step 5: Verify Domain is Active

1. Return to Cloudflare dashboard
2. Click **Check nameservers** or wait for automatic verification
3. Status will change from "Pending" to "Active"

### Step 6: Note Your Account and Zone IDs

1. Go to your domain's **Overview** page in Cloudflare
2. Scroll down to the right sidebar
3. Copy and save:
   - **Account ID** (used for API calls and Terraform)
   - **Zone ID** (used for DNS management)

---

## Create API Token

API tokens allow programmatic access to Cloudflare for deployments and Terraform.

### Step 1: Navigate to API Tokens

1. Click your profile icon (top right)
2. Select **My Profile**
3. Click **API Tokens** tab
4. Click **Create Token**

### Step 2: Create Custom Token

Click **Create Custom Token** (not a template) for fine-grained permissions:

**Token Name:** `Portfolio Deployment Token`

**Permissions:**

| Resource | Permission |
|----------|------------|
| Account > Cloudflare Pages | Edit |
| Account > Workers Scripts | Edit |
| Zone > DNS | Edit |
| Zone > Zone Settings | Read |

**Zone Resources:**
- Include > Specific zone > Select your domain

**Account Resources:**
- Include > Your account

**Client IP Address Filtering:** (Optional)
- Add your IP for extra security

**TTL:** (Optional)
- Set expiration date (recommended: 90 days, then rotate)

### Step 3: Create and Save Token

1. Click **Continue to summary**
2. Review permissions
3. Click **Create Token**
4. **IMPORTANT:** Copy the token immediately - it won't be shown again
5. Store it securely (password manager, encrypted file)

### Step 4: Verify Token

```bash
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

Expected response:
```json
{
  "result": { "status": "active" },
  "success": true
}
```

---

## Set Up Cloudflare Pages

Cloudflare Pages hosts the static frontend.

### Option A: Connect via Git (Recommended)

1. Go to **Workers & Pages** in the sidebar
2. Click **Create application**
3. Select **Pages** tab
4. Click **Connect to Git**
5. Authorize Cloudflare to access your GitHub/GitLab account
6. Select your repository
7. Configure build settings:

| Setting | Value |
|---------|-------|
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` (or leave empty) |

8. Add environment variables (if needed):
   - `VITE_TURNSTILE_SITE_KEY` = your Turnstile site key

9. Click **Save and Deploy**

### Option B: Direct Upload (Manual)

1. Build locally: `npm run build`
2. Go to **Workers & Pages** > **Create application** > **Pages**
3. Select **Upload assets**
4. Drag and drop the `dist/` folder
5. Click **Deploy**

### Configure Custom Domain

1. Go to your Pages project
2. Click **Custom domains** tab
3. Click **Set up a custom domain**
4. Enter your domain (e.g., `example.com`)
5. Click **Continue**
6. Cloudflare will automatically create DNS records
7. Wait for SSL certificate provisioning (usually < 5 minutes)

**Add www subdomain:**
1. Repeat for `www.example.com`
2. Or set up a redirect rule (see DNS section)

---

## Set Up Cloudflare Workers

Workers handle the contact form backend API.

### Step 1: Create Worker (via Dashboard)

1. Go to **Workers & Pages** in sidebar
2. Click **Create application**
3. Select **Workers** tab
4. Click **Create Worker**
5. Name it (e.g., `portfolio-contact-worker`)
6. Click **Deploy** (deploys hello world template)

### Step 2: Configure Worker Settings

1. Go to your Worker's **Settings** tab
2. Click **Variables**

**Add Environment Variables:**

| Variable Name | Type | Value |
|---------------|------|-------|
| `TURNSTILE_SECRET_KEY` | Secret | Your Turnstile secret key |
| `CONTACT_EMAIL` | Secret | Email to receive contact form submissions |
| `ALLOWED_ORIGIN` | Text | `https://example.com` |

Click **Encrypt** for sensitive values.

### Step 3: Deploy Worker Code

**Option A: Via Wrangler CLI (Recommended)**

```bash
cd worker
npm install
npx wrangler login
npx wrangler deploy
```

**Option B: Via Dashboard**

1. Go to Worker > **Quick edit**
2. Paste your worker code
3. Click **Save and deploy**

### Step 4: Configure Worker Route (Custom Domain)

To serve the Worker at `/api/*` on your domain:

1. Go to your Worker
2. Click **Triggers** tab
3. Under **Routes**, click **Add route**
4. Enter: `example.com/api/*`
5. Select your zone
6. Click **Add route**

---

## Configure Turnstile (CAPTCHA)

Turnstile provides bot protection without CAPTCHAs.

### Step 1: Create Turnstile Widget

1. Go to **Turnstile** in the Cloudflare sidebar
2. Click **Add site**
3. Configure:

| Setting | Value |
|---------|-------|
| Site name | Your project name |
| Domain | `example.com` (and `localhost` for development) |
| Widget Mode | **Managed** (recommended) |
| Pre-clearance | Off |

4. Click **Create**

### Step 2: Copy Keys

After creation, you'll see:

- **Site Key** (public) - Used in frontend code
- **Secret Key** (private) - Used in Worker for verification

**Save both keys securely.**

### Step 3: Add Development Domain

For local testing:

1. Edit your Turnstile widget
2. Add `localhost` to the domains list
3. Save changes

---

## Configure DNS Records

### Required Records

After setting up Pages with a custom domain, verify these records exist:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `@` | `your-project.pages.dev` | Proxied |
| CNAME | `www` | `example.com` | Proxied |

### Optional: www Redirect

To redirect `www.example.com` to `example.com`:

1. Go to **Rules** > **Redirect Rules**
2. Click **Create rule**
3. Configure:
   - Rule name: `www to apex redirect`
   - When: `Hostname equals www.example.com`
   - Then: `Dynamic redirect`
   - Expression: `concat("https://example.com", http.request.uri.path)`
   - Status code: `301`
4. Click **Deploy**

### Optional: Email Records (if using custom email)

| Type | Name | Content | Priority |
|------|------|---------|----------|
| MX | `@` | Your mail server | 10 |
| TXT | `@` | SPF record | - |
| TXT | `_dmarc` | DMARC record | - |

---

## Set Up MailChannels (Email Sending)

MailChannels allows Workers to send emails without additional SMTP configuration.

### Step 1: Add DNS Records for MailChannels

Add these TXT records to authorize MailChannels:

| Type | Name | Content |
|------|------|---------|
| TXT | `_mailchannels` | `v=mc1 cfid=your-account.workers.dev` |
| TXT | `@` | `v=spf1 include:relay.mailchannels.net -all` |

**Note:** Replace `your-account` with your Cloudflare account subdomain.

### Step 2: Configure DKIM (Recommended)

1. Generate DKIM keys:
```bash
openssl genrsa -out dkim_private.pem 2048
openssl rsa -in dkim_private.pem -pubout -out dkim_public.pem
```

2. Add DNS record:
   - Type: TXT
   - Name: `mailchannels._domainkey`
   - Content: `v=DKIM1; k=rsa; p=YOUR_PUBLIC_KEY` (without headers/newlines)

3. Add private key to Worker secrets:
```bash
npx wrangler secret put DKIM_PRIVATE_KEY
# Paste the private key content
```

### Step 3: Test Email Sending

Deploy your worker and test the contact form. Check:
- Email arrives in inbox (not spam)
- Sender shows your domain
- DKIM signature passes (check email headers)

---

## Environment Variables Summary

### Frontend (.env)

```bash
# Turnstile site key (public)
VITE_TURNSTILE_SITE_KEY=0x4AAAA...

# For deployment scripts (optional)
CLOUDFLARE_API_TOKEN=your-api-token
CLOUDFLARE_ACCOUNT_ID=your-account-id
```

### Worker (wrangler.toml or dashboard)

```toml
[vars]
ALLOWED_ORIGIN = "https://example.com"

# Secrets (set via wrangler secret put or dashboard)
# TURNSTILE_SECRET_KEY
# CONTACT_EMAIL
# DKIM_PRIVATE_KEY (optional)
```

### Terraform (terraform.tfvars)

```hcl
cloudflare_api_token  = "your-api-token"
cloudflare_account_id = "your-account-id"
cloudflare_zone_id    = "your-zone-id"
turnstile_site_key    = "0x4AAAA..."
turnstile_secret_key  = "0x4AAAA..."
contact_email         = "you@example.com"
domain_name           = "example.com"
```

---

## Terraform Integration

If using Terraform to manage infrastructure:

### Initialize Terraform

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
terraform init
```

### Plan and Apply

```bash
terraform plan
# Review changes
terraform apply
# Type 'yes' to confirm
```

### Managed Resources

Terraform will create/manage:
- Cloudflare Pages project
- Cloudflare Worker script
- Worker routes
- DNS records
- Secret bindings

---

## Verification Checklist

After setup, verify everything works:

### Domain & DNS
- [ ] Domain shows "Active" in Cloudflare dashboard
- [ ] SSL certificate provisioned (check padlock in browser)
- [ ] `https://example.com` loads your site
- [ ] `https://www.example.com` redirects to apex (if configured)

### Cloudflare Pages
- [ ] Pages project shows "Success" deployment
- [ ] Custom domain connected
- [ ] Site loads correctly
- [ ] Assets (CSS, JS, images) load

### Cloudflare Workers
- [ ] Worker deployed successfully
- [ ] Environment variables configured
- [ ] Route configured (e.g., `example.com/api/*`)
- [ ] Test endpoint responds:
  ```bash
  curl https://example.com/api/contact -X OPTIONS
  ```

### Turnstile
- [ ] Widget renders on contact form
- [ ] Challenge completes successfully
- [ ] Token validates on server (check Worker logs)

### Email
- [ ] Contact form submission sends email
- [ ] Email arrives in inbox (check spam)
- [ ] Sender domain correct
- [ ] SPF/DKIM pass (check email headers)

---

## Troubleshooting

### Domain Not Active

**Symptoms:** Status shows "Pending Nameserver Update"

**Solutions:**
1. Verify nameservers at registrar match Cloudflare's
2. Wait up to 48 hours for propagation
3. Use `dig NS example.com` to check current nameservers
4. Contact registrar if nameservers won't update

### SSL Certificate Errors

**Symptoms:** Browser shows certificate warning

**Solutions:**
1. Wait 15 minutes for certificate provisioning
2. Check SSL/TLS mode is "Full (strict)" in Cloudflare
3. Purge cache: **Caching** > **Configuration** > **Purge Everything**

### Worker Not Responding

**Symptoms:** 404 or 522 errors at `/api/*`

**Solutions:**
1. Verify Worker is deployed (check dashboard)
2. Check route configuration matches URL pattern
3. Check Worker logs for errors
4. Verify environment variables are set

### Turnstile Not Loading

**Symptoms:** Widget doesn't appear or shows error

**Solutions:**
1. Verify site key is correct in frontend code
2. Check domain is listed in Turnstile settings
3. Add `localhost` for local development
4. Check browser console for errors

### Emails Going to Spam

**Symptoms:** Contact form emails in spam folder

**Solutions:**
1. Add SPF record: `v=spf1 include:relay.mailchannels.net -all`
2. Configure DKIM signing
3. Add DMARC record: `v=DMARC1; p=none; rua=mailto:dmarc@example.com`
4. Ensure "From" address uses your domain

### CORS Errors

**Symptoms:** Browser blocks requests to Worker

**Solutions:**
1. Verify `ALLOWED_ORIGIN` matches your domain exactly
2. Include protocol: `https://example.com` not just `example.com`
3. Check Worker returns correct CORS headers
4. For development, temporarily add `http://localhost:5173`

### Rate Limiting Issues

**Symptoms:** Legitimate users getting blocked

**Solutions:**
1. Check rate limit configuration in Worker
2. Consider using Cloudflare's built-in rate limiting
3. Adjust limits based on expected traffic
4. Add IP allowlist for testing

---

## Security Best Practices

1. **Rotate API tokens** every 90 days
2. **Use secrets** for sensitive values (not plain text variables)
3. **Restrict token permissions** to minimum required
4. **Enable 2FA** on your Cloudflare account
5. **Monitor** Worker analytics for unusual patterns
6. **Review** Access Logs periodically
7. **Keep** Turnstile secret key confidential
8. **Never** commit secrets to git

---

## Useful Commands

```bash
# Check nameservers
dig NS example.com

# Test SSL certificate
curl -vI https://example.com 2>&1 | grep -A5 "Server certificate"

# Test Worker endpoint
curl -X POST https://example.com/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","message":"Hello"}'

# Deploy Worker
cd worker && npx wrangler deploy

# View Worker logs
npx wrangler tail

# List Workers
npx wrangler list
```

---

## Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Turnstile Documentation](https://developers.cloudflare.com/turnstile/)
- [MailChannels + Workers Guide](https://developers.cloudflare.com/workers/tutorials/send-emails-with-mailchannels/)
- [Terraform Cloudflare Provider](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
