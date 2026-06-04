# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Trystan Bates-Maricle (AI/ML Engineer). **This repo is the
frontend** (React + Vite static site). The contact backend and its infrastructure live in a
separate repo. AWS-only (us-east-1):
- **Frontend** (this repo): React 18 + TypeScript + Tailwind CSS, built with Vite; static build hosted on S3 and served via CloudFront (OAC). The S3 site bucket, CloudFront distribution, ACM cert, and AWS WAF are owned by a separate infra repo (the shadowspire landing zone) — this repo syncs the build to that bucket and invalidates that distribution.
- **Backend + Infrastructure** (separate repo): the `portfolio-contact-ingest` Lambda and its
  OpenTofu live in **`../portfolio-backend`** (`github.com/Grimm07/portfolio-backend`). The contact
  form posts to an infra-owned API Gateway that invokes that Lambda; this repo only embeds the API
  path and the WAF integration URL at build time.

Live at: https://trystan-tbm.dev

> The Cloudflare→AWS migration is **complete**: the contact backend, infrastructure, and frontend
> hosting all run on the shadowspire AWS landing zone (us-east-1); apex/www/dev all serve from
> CloudFront→S3. The Cloudflare zone is retained **only** to host DNS and the SES DKIM CNAME records.
> Historical sequencing lives in `docs/superpowers/plans/2026-06-03-aws-cutover-reconciliation.md`;
> backend operations/runbook now live in the `portfolio-backend` repo.

## Development Commands

```bash
# Frontend development
npm run dev              # Start Vite dev server (http://localhost:5173)
npm run build            # Build for production (tsc + vite build)
npm run preview          # Preview production build locally
npm run lint             # ESLint check

# Type checking
npx tsc --noEmit         # Type check without emitting files
```

> **Contact backend + infrastructure** (the Lambda, OpenTofu, SES, secrets) now live in the
> **`../portfolio-backend`** repo with their own commands, tests, and CI/CD. Nothing in this repo
> builds or deploys the Lambda anymore.

## Architecture

### Frontend (`src/`)
- **App.tsx**: Main layout and component composition
- **Components**: Functional components with named exports, props interfaces required
- **Styling**: Tailwind-first with custom theme colors in `tailwind.config.js`
- **Theme**: Dark mode default, class-based toggle (`darkMode: 'class'`)
- **Contact form** (`components/Contact.tsx`): same-origin `POST /api/contact`, with AWS WAF CAPTCHA
  via the WAF integration script (`VITE_WAF_INTEGRATION_URL`). The edge WAF rule validates the token.

### Contact backend + Infrastructure (separate repo)
The `portfolio-contact-ingest` Lambda, its OpenTofu (IAM, SES/DKIM, contact-email secret, the SSM
handshake, API Gateway invoke grant), and the backend runbook/specs now live in
**`../portfolio-backend`** (`github.com/Grimm07/portfolio-backend`). The contact form here posts
same-origin to an infra-owned **API Gateway** that invokes that Lambda; CAPTCHA + rate-limiting are
enforced by **AWS WAF at the edge** before the request ever reaches the Lambda. To work on the
handler, validation, SES email, or the Terraform, switch to that repo.

### Deployment
GitHub Actions with OIDC (no long-lived AWS keys). `deploy.yml` in **this** repo only builds the
static site and syncs it to S3 + invalidates CloudFront (dev on PRs, prod on push to `main`). It
reads the WAF integration URL/key from SSM at build time. The Lambda + Terraform deploy is owned by
the `portfolio-backend` repo's own `deploy.yml`.

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
- Frontend (this repo): `VITE_WAF_INTEGRATION_URL` (via `.env` at build time; `VITE_*` vars are embedded statically)
- Lambda secret handling lives in the `portfolio-backend` repo (recipient address in **AWS Secrets
  Manager**, read at runtime).

### Pre-commit Hooks (Lefthook)
Runs automatically on commit:
- TypeScript type checking
- ESLint on staged files
- Secrets detection (blocks commits with API keys, emails)
- Commit message minimum 10 characters

### Operational gotchas
- **Merging to `main` deploys the prod site** (S3 sync + CloudFront invalidation). The frontend
  deploy needs the `production` GitHub environment + the `portfolio-deploy` OIDC role; it reads the
  WAF integration URL/key from `/portfolio/prod/*` SSM (published by the infra repo).
- **Backend gotchas moved**: SES sandbox verification, the CodeQL `js/clear-text-logging` rule, and
  the Lambda/Terraform prod-deploy fail-loud behavior are now documented in the `portfolio-backend`
  repo (`docs/runbooks/aws-contact-backend.md`).

## Environment Setup

**Frontend** (`.env`):
```bash
VITE_WAF_INTEGRATION_URL=https://<waf-integration-host>/...
```

> Terraform/backend environment setup (`terraform.tfvars`, etc.) now lives in the
> `portfolio-backend` repo.

## Key Files

| Path | Purpose |
|------|---------|
| `src/App.tsx` | Main layout, component composition |
| `src/components/Contact.tsx` | Contact form with AWS WAF CAPTCHA integration |
| `tailwind.config.js` | Theme colors and fonts |
| `vite.config.ts` | Build configuration with chunk splitting |
| `lefthook.yml` | Pre-commit hooks configuration |
| `../portfolio-backend/` | Contact Lambda + OpenTofu + backend runbook (separate repo) |

## Performance Budget

- Max bundle size: 500KB
- Max chunk size: 200KB
- Mermaid.js lazy-loaded to reduce initial bundle
- React vendor chunk split for caching
