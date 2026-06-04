# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Trystan Bates-Maricle (AI/ML Engineer). Three-tier architecture:
- **Frontend**: React 18 + TypeScript + Tailwind CSS, built with Vite
- **Backend**: AWS Lambda (`portfolio-contact-ingest`) handling the contact form, emailing via Amazon SES
- **Infrastructure**: OpenTofu (`terraform/`) managing AWS resources (Lambda, IAM, SES, Secrets Manager, SSM)

Live at: https://trystan-tbm.dev

> **Migration status (in progress — branch `aws-deploy`).** The contact backend and infrastructure
> have moved from Cloudflare to the **shadowspire AWS landing zone** (us-east-1). The **frontend
> hosting cutover is still underway**: the site is currently served by Cloudflare Pages, with
> S3 + CloudFront (infra-owned, OAC) as the target. The legacy `worker/` directory and the
> `worker:*` / `dev:all` npm scripts are vestigial and slated for deletion in the retire phase.
> Full sequencing, pending external gates, and the end-state architecture live in
> `docs/superpowers/plans/2026-06-03-aws-cutover-reconciliation.md`. Prefer that plan as the
> source of truth when it disagrees with anything below.

## Development Commands

```bash
# Frontend development
npm run dev              # Start Vite dev server (http://localhost:5173)
npm run build            # Build for production (tsc + vite build)
npm run preview          # Preview production build locally
npm run lint             # ESLint check

# Type checking
npx tsc --noEmit         # Type check without emitting files

# Contact backend Lambda (from backend/ directory)
cd backend
npm test                 # Run the Vitest suite (handler, email, validation, ip, secrets)
npm run typecheck        # Type check Lambda code (tsc --noEmit)
npm run build            # Bundle the ingest handler via esbuild -> dist/ingest/index.mjs

# Infrastructure (from terraform/ directory) — OpenTofu, AWS-only, per-env state
cd terraform
tofu init -reconfigure -backend-config=backend-dev.hcl   # dev (or backend-prod.hcl)
tofu validate
tofu apply -var environment=dev                          # apply to the selected env
```

> **OpenTofu binary**: `tofu` is a user-local install (`~/.local/bin`), not on the system PATH.
> Run `export PATH="$HOME/.local/bin:$PATH"` first.

## Architecture

### Frontend (`src/`)
- **App.tsx**: Main layout and component composition
- **Components**: Functional components with named exports, props interfaces required
- **Styling**: Tailwind-first with custom theme colors in `tailwind.config.js`
- **Theme**: Dark mode default, class-based toggle (`darkMode: 'class'`)
- **Contact form** (`components/Contact.tsx`): same-origin `POST /api/contact`, with AWS WAF CAPTCHA
  via the WAF integration script (`VITE_WAF_INTEGRATION_URL`). The edge WAF rule validates the token.

### Contact backend (`backend/src/`)
A single `portfolio-contact-ingest` Lambda behind an `AWS_IAM` Function URL fronted by CloudFront (OAC).
- `ingest/handler.ts`: parse → honeypot (`website`) → time-trap (reject too-fast) → field validation → SES send.
- `ingest/email.ts`: sends one Amazon SES email per submission (`Reply-To` = submitter).
- `ingest/ip.ts`: extracts client IP for the email body.
- `shared/secrets.ts`: reads the recipient address from Secrets Manager (never hardcoded).
- `shared/validation.ts`, `shared/types.ts`: shared validation + the `ContactSubmission` shape.

**CAPTCHA + rate-limiting are enforced by AWS WAF at the edge**, before the request reaches the
Lambda — there is no token check or per-IP counter in the handler.

### Infrastructure (`terraform/`)
OpenTofu, AWS-only. Manages: the ingest Lambda + IAM role (SES send + secret read), the `AWS_IAM`
Function URL, SES domain/DKIM, the contact-email secret, and the SSM handshake. State is a **per-env
S3 backend** (each env's own account-scoped `shadowspire-<env>-state-*` bucket + `shadowspire-<env>-tf-lock`
DynamoDB lock) selected via partial `-backend-config=backend-<env>.hcl`.

- Publishes `/portfolio/<env>/ingest-function-url` to SSM for the infra repo.
- `permissions.tf` grants CloudFront OAC permission to invoke the Function URL (reads the dist ARN from SSM).
- The `cloudflare` provider is retained **only** for the SES DKIM CNAME records in `ses.tf`.

**IMPORTANT**: Build the Lambda bundle before applying Terraform (the archive references `backend/dist`):
```bash
cd backend && npm run build      # Creates backend/dist/ingest/index.mjs
cd ../terraform && tofu apply -var environment=dev
```

### Deployment
GitHub Actions with OIDC (no long-lived AWS keys). `deploy.yml` builds the Lambda bundle and runs
`tofu apply` (per-env backend-config) **before** syncing the site, in both the dev and prod jobs.

## Code Style

- **Imports**: React → external packages → local components → types
- **Components**: Functional only, named exports, props interfaces always defined
- **CSS**: Tailwind utilities only, avoid custom CSS
- **TypeScript**: Strict mode enabled (`noUnusedLocals`, `noUnusedParameters`)

### Custom Tailwind Colors
```
primary: #3b82f6 (blue), secondary: #8b5cf6 (purple)
bg-primary: #0a0a0a, bg-secondary: #141414, bg-tertiary: #1f1f1f
```

## Security Requirements (Critical)

**NEVER include in code:**
- Email addresses (no `mailto:`, no plaintext)
- Phone numbers (any format)
- API keys or secrets

**Contact is form-only** - LinkedIn link is safe (has its own spam protection).

Secrets are never hardcoded:
- Frontend: `VITE_WAF_INTEGRATION_URL` (via `.env` at build time; `VITE_*` vars are embedded statically)
- Lambda: `FROM_EMAIL` + `CONTACT_EMAIL_SECRET_ARN` env vars; the recipient address lives in
  **AWS Secrets Manager**, read at runtime.

### Pre-commit Hooks (Lefthook)
Runs automatically on commit:
- TypeScript type checking
- ESLint on staged files
- Secrets detection (blocks commits with API keys, emails)
- Commit message minimum 10 characters

## Environment Setup

**Frontend** (`.env`):
```bash
VITE_WAF_INTEGRATION_URL=https://<waf-integration-host>/...
```

**Terraform** (`terraform/terraform.tfvars`, gitignored):
```hcl
environment          = "dev"          # "dev" or "prod" — drives SSM paths + per-env resources
contact_email        = "..."          # recipient, stored in Secrets Manager
cloudflare_api_token = "..."          # ONLY for the SES DKIM CNAMEs (DNS stays in the CF zone)
cloudflare_zone_id   = "..."
# domain_name defaults to trystan-tbm.dev
```

## Key Files

| Path | Purpose |
|------|---------|
| `src/App.tsx` | Main layout, component composition |
| `src/components/Contact.tsx` | Contact form with AWS WAF CAPTCHA integration |
| `backend/src/ingest/handler.ts` | Ingest Lambda: honeypot, time-trap, validation, SES send |
| `backend/src/ingest/email.ts` | Single-submission SES email sender |
| `terraform/lambda.tf` | Ingest Lambda + `AWS_IAM` Function URL |
| `terraform/iam.tf` | Ingest role (SES send + secret read) |
| `terraform/ses.tf` | SES domain identity + DKIM (Cloudflare-managed CNAMEs) |
| `terraform/ssm.tf` / `permissions.tf` | SSM handshake + CloudFront OAC invoke grant |
| `terraform/backend-{dev,prod}.hcl` | Per-env S3 state backend config |
| `tailwind.config.js` | Theme colors and fonts |
| `vite.config.ts` | Build configuration with chunk splitting |
| `lefthook.yml` | Pre-commit hooks configuration |

## Performance Budget

- Max bundle size: 500KB
- Max chunk size: 200KB
- Mermaid.js lazy-loaded to reduce initial bundle
- React vendor chunk split for caching
