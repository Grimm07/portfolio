# Terraform Deployment Guide

This guide walks you through deploying the portfolio infrastructure to Cloudflare using Terraform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Getting Cloudflare Credentials](#getting-cloudflare-credentials)
3. [Setup Steps](#setup-steps)
4. [Deployment Workflow](#deployment-workflow)
5. [Troubleshooting](#troubleshooting)
6. [Security Notes](#security-notes)

---

## Prerequisites

Before you begin, ensure you have the following:

### Required Software

- **Terraform** (>= 1.0)
  - Download from [terraform.io/downloads](https://www.terraform.io/downloads)
  - Verify installation: `terraform version`

- **Node.js** (18+ or 20+)
  - Required for building the Worker
  - Verify installation: `node --version`

- **npm** (comes with Node.js)
  - Verify installation: `npm --version`

### Required Accounts & Resources

- **Cloudflare Account**
  - Sign up at [cloudflare.com](https://www.cloudflare.com) (free tier works)
  - Domain must be registered and managed in Cloudflare

- **Domain Registered in Cloudflare**
  - Domain: `trystan-tbm.dev` (or your custom domain)
  - DNS must be managed by Cloudflare (nameservers pointing to Cloudflare)

- **GitHub Repository**
  - Repository must exist and be accessible
  - Repository owner and name will be used in Terraform variables

---

## Getting Cloudflare Credentials

### 1. Create Cloudflare API Token

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to **My Profile** → **API Tokens**
3. Click **Create Token**
4. Use **Edit Cloudflare Workers** template, or create custom token with these permissions:
   - **Account** → **Cloudflare Pages** → **Edit**
   - **Account** → **Workers Scripts** → **Edit**
   - **Zone** → **Zone** → **Read**
   - **Zone** → **DNS** → **Edit**
   - **Zone** → **Workers Routes** → **Edit**
5. Set **Account Resources** to your account
6. Set **Zone Resources** to your domain (`trystan-tbm.dev`)
7. Click **Continue to summary** → **Create Token**
8. **Copy the token immediately** (you won't see it again)

### 2. Find Account ID

1. In Cloudflare Dashboard, select your account from the top-right dropdown
2. The Account ID is displayed in the right sidebar
3. Copy the Account ID (format: 32-character hex string)

### 3. Find Zone ID

1. In Cloudflare Dashboard, select your domain (`trystan-tbm.dev`)
2. Scroll down to the **API** section in the right sidebar
3. Copy the **Zone ID** (format: 32-character hex string)

### 4. Create Turnstile Site (Free Tier)

1. In Cloudflare Dashboard, go to **Security** → **Turnstile**
2. Click **Add Site**
3. Configure:
   - **Site name**: `Portfolio Contact Form`
   - **Domain**: `trystan-tbm.dev` (or `*.trystan-tbm.dev` for all subdomains)
   - **Widget mode**: `Managed` (recommended) or `Non-interactive`
4. Click **Create**
5. Copy both:
   - **Site Key** (public, used in frontend)
   - **Secret Key** (private, used in Worker)

---

## Setup Steps

### Step 1: Configure Terraform Variables

1. Copy the example variables file:
   ```bash
   cd terraform
   cp terraform.tfvars.example terraform.tfvars
   ```

2. Edit `terraform.tfvars` with your actual values:
   ```hcl
   # Cloudflare API Configuration
   cloudflare_api_token  = "your-actual-api-token-here"
   cloudflare_account_id = "your-32-char-account-id"
   cloudflare_zone_id    = "your-32-char-zone-id"

   # Turnstile CAPTCHA Configuration
   turnstile_site_key    = "your-turnstile-site-key"
   turnstile_secret_key  = "your-turnstile-secret-key"

   # Contact Form Configuration
   contact_email         = "your-email@example.com"

   # GitHub Repository Configuration
   github_repo_owner = "trystan-tbm"
   github_repo_name  = "portfolio"

   # Domain Configuration (optional, defaults to trystan-tbm.dev)
   # domain_name = "trystan-tbm.dev"
   ```

3. **Important**: Never commit `terraform.tfvars` to version control (it's in `.gitignore`)

### Step 2: Build the Worker

The Worker must be built before Terraform can deploy it:

```bash
# From project root
cd worker
npm install
npm run build
cd ..
```

This creates `worker/dist/index.js` which Terraform will read.

### Step 3: Initialize Terraform

From the `terraform/` directory:

```bash
cd terraform
terraform init
```

This downloads the Cloudflare provider and initializes the backend.

### Step 4: Review Terraform Plan

Preview what Terraform will create:

```bash
terraform plan
```

Review the output carefully. You should see:
- `cloudflare_pages_project.portfolio` (will be created)
- `cloudflare_pages_domain.portfolio` (will be created)
- `cloudflare_record.pages_root` (will be created)
- `cloudflare_record.pages_www` (will be created)
- `cloudflare_worker_script.contact_form` (will be created)
- `cloudflare_worker_route.contact_form` (will be created)

### Step 5: Apply Terraform Configuration

Deploy the infrastructure:

```bash
terraform apply
```

Terraform will prompt you to confirm. Type `yes` to proceed.

**Expected output:**
- Pages project created
- Custom domain attached
- DNS records created
- Worker deployed
- Worker route configured

### Step 6: Verify Deployment

After successful deployment, Terraform will output URLs:

- `pages_url`: Cloudflare Pages canonical URL
- `custom_domain_url`: Your custom domain URL
- `www_domain_url`: WWW subdomain URL
- `worker_url`: Worker endpoint URL
- `turnstile_site_key`: Site key for frontend

Visit your custom domain URL to verify the site is live.

---

## Deployment Workflow

### Frontend Changes (React/TypeScript)

**Automatic deployment via Cloudflare Pages:**

1. Make changes to frontend code
2. Commit and push to `main` branch:
   ```bash
   git add .
   git commit -m "Update portfolio"
   git push origin main
   ```
3. Cloudflare Pages automatically:
   - Detects the push
   - Builds the project (`npm run build`)
   - Deploys to production
4. Monitor deployment in Cloudflare Dashboard → **Pages** → **trystan-portfolio**

**No Terraform changes needed** for frontend-only updates.

### Worker Changes (Contact Form Backend)

**Manual deployment required:**

1. Make changes to `worker/src/index.ts`
2. Build the Worker:
   ```bash
   cd worker
   npm run build
   cd ..
   ```
3. Apply Terraform to deploy updated Worker:
   ```bash
   cd terraform
   terraform apply
   ```
4. Terraform will detect the changed `worker/dist/index.js` and update the Worker

### Infrastructure Changes (Terraform Configuration)

**Update Terraform files and apply:**

1. Edit Terraform files (`main.tf`, `variables.tf`, etc.)
2. Review changes:
   ```bash
   cd terraform
   terraform plan
   ```
3. Apply changes:
   ```bash
   terraform apply
   ```

**Common infrastructure updates:**
- Adding environment variables
- Changing build configuration
- Updating DNS records
- Modifying Worker routes

---

## Troubleshooting

### Common Errors and Solutions

#### Error: "Failed to read file: worker/dist/index.js"

**Problem:** Worker hasn't been built yet.

**Solution:**
```bash
cd worker
npm run build
cd ../terraform
terraform apply
```

#### Error: "Invalid API token"

**Problem:** API token is incorrect or doesn't have required permissions.

**Solution:**
1. Verify token in Cloudflare Dashboard → **My Profile** → **API Tokens**
2. Check token has all required permissions (see [Getting Cloudflare Credentials](#getting-cloudflare-credentials))
3. Regenerate token if needed

#### Error: "Zone not found" or "Invalid zone ID"

**Problem:** Zone ID is incorrect or domain isn't in Cloudflare.

**Solution:**
1. Verify domain is registered in Cloudflare
2. Check Zone ID in Cloudflare Dashboard → Your Domain → **API** section
3. Ensure nameservers point to Cloudflare

#### Error: "Pages project already exists"

**Problem:** Project with same name already exists in Cloudflare.

**Solution:**
1. Either delete existing project in Cloudflare Dashboard
2. Or change project name in `terraform/main.tf`:
   ```hcl
   resource "cloudflare_pages_project" "portfolio" {
     name = "trystan-portfolio-v2"  # Change name
     # ...
   }
   ```

#### Error: "DNS record already exists"

**Problem:** CNAME records for `@` or `www` already exist.

**Solution:**
1. Check existing DNS records in Cloudflare Dashboard
2. Either delete conflicting records manually
3. Or import existing records into Terraform state:
   ```bash
   terraform import cloudflare_record.pages_root <zone_id>/<record_id>
   ```

#### Worker Not Responding

**Problem:** Worker returns errors or doesn't execute.

**Solution:**
1. Check Worker logs in Cloudflare Dashboard → **Workers & Pages** → **portfolio-contact-worker** → **Logs**
2. Verify secret bindings are set correctly:
   ```bash
   terraform show | grep secret_text_binding
   ```
3. Test Worker directly:
   ```bash
   curl https://trystan-tbm.dev/api/contact
   ```

### Destroying Resources

To completely remove all infrastructure:

```bash
cd terraform
terraform destroy
```

**Warning:** This will delete:
- Pages project and deployments
- Custom domain configuration
- DNS records
- Worker script and routes

**Note:** This does NOT delete your domain from Cloudflare, only the resources created by Terraform.

### Checking Deployment Status

#### Pages Deployment Status

1. Cloudflare Dashboard → **Workers & Pages** → **Pages**
2. Select **trystan-portfolio**
3. View deployment history and status

#### Worker Status

1. Cloudflare Dashboard → **Workers & Pages** → **Workers**
2. Select **portfolio-contact-worker**
3. View metrics, logs, and invocations

#### DNS Records

1. Cloudflare Dashboard → Your Domain → **DNS**
2. Verify CNAME records exist:
   - `@` → `trystan-portfolio.pages.dev` (proxied)
   - `www` → `trystan-portfolio.pages.dev` (proxied)

### Viewing Terraform State

List all managed resources:

```bash
cd terraform
terraform state list
```

Show details of a specific resource:

```bash
terraform state show cloudflare_pages_project.portfolio
```

---

## Security Notes

### Never Commit Sensitive Files

**Critical:** The following files contain secrets and are in `.gitignore`:

- `terraform.tfvars` - Contains API tokens, secret keys, email addresses
- `terraform/*.tfstate` - May contain sensitive data
- `terraform/*.tfstate.*` - Backup state files
- `terraform/.terraform/` - Provider cache

**Always verify these are excluded:**
```bash
git status
# terraform.tfvars should NOT appear in untracked files
```

### API Token Security

1. **Rotate tokens periodically** (every 90 days recommended)
2. **Use least-privilege permissions** (only grant what's needed)
3. **Never share tokens** in chat, email, or documentation
4. **Revoke unused tokens** in Cloudflare Dashboard

### Secret Management

- **Turnstile Secret Key**: Only used in Worker (server-side)
- **Contact Email**: Only used in Worker (server-side)
- **API Token**: Only used by Terraform (local machine)

All secrets are stored as `secret_text_binding` in the Worker, which is encrypted by Cloudflare.

### Monitoring

**Regular checks:**

1. **Worker Invocations**
   - Cloudflare Dashboard → **Workers & Pages** → **portfolio-contact-worker** → **Metrics**
   - Monitor for unusual spikes (potential abuse)

2. **API Token Usage**
   - Cloudflare Dashboard → **My Profile** → **API Tokens**
   - Review last used date

3. **DNS Records**
   - Verify CNAME records haven't been modified
   - Check for unauthorized changes

### Best Practices

1. **Use separate API tokens** for different environments (dev/staging/prod)
2. **Review Terraform plan** before every apply
3. **Keep Terraform state** in version control (if using remote backend) or secure location
4. **Document changes** in commit messages
5. **Test Worker locally** before deploying:
   ```bash
   cd worker
   npm run dev
   ```

---

## Additional Resources

- [Terraform Cloudflare Provider Documentation](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare Turnstile Documentation](https://developers.cloudflare.com/turnstile/)

---

## Quick Reference

### Essential Commands

```bash
# Build Worker
cd worker && npm run build && cd ..

# Initialize Terraform
cd terraform && terraform init

# Plan changes
terraform plan

# Apply changes
terraform apply

# Destroy everything
terraform destroy

# View outputs
terraform output
```

### File Structure

```
terraform/
├── main.tf                    # Main infrastructure configuration
├── variables.tf               # Variable definitions
├── outputs.tf                 # Output values
├── terraform.tfvars          # Your actual values (NOT in git)
├── terraform.tfvars.example  # Template file
├── .gitignore                # Excludes sensitive files
└── README.md                 # This file
```

---

**Last Updated:** 2025-01-XX
