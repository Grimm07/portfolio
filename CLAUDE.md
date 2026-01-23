# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Trystan Bates-Maricle (AI/ML Engineer). Three-tier architecture:
- **Frontend**: React 18 + TypeScript + Tailwind CSS, built with Vite, deployed to Cloudflare Pages
- **Backend**: Cloudflare Worker handling contact form with multi-layer spam protection
- **Infrastructure**: Terraform managing Cloudflare resources (Pages, Workers, DNS, secrets)

Live at: https://trystan-tbm.dev

## Development Commands

```bash
# Frontend development
npm run dev              # Start Vite dev server (http://localhost:5173)
npm run dev:all          # Start both Vite and Worker dev servers in parallel
npm run build            # Build for production (tsc + vite build)
npm run preview          # Preview production build locally
npm run lint             # ESLint check

# Type checking
npx tsc --noEmit         # Type check without emitting files

# Worker development (from project root)
npm run worker:dev       # Start Worker dev server at localhost:8787
npm run worker:deploy    # Deploy Worker to Cloudflare

# Worker development (from worker/ directory)
cd worker
npm run dev              # Start local Worker dev server
npm run deploy           # Deploy to Cloudflare
npm run typecheck        # Type check Worker code

# Infrastructure (from terraform/ directory)
cd terraform
terraform init           # Initialize Terraform
terraform plan           # Preview infrastructure changes
terraform apply          # Apply infrastructure changes
```

## Architecture

### Frontend (`src/`)
- **App.tsx**: Main layout, lazy-loads ArchitectureShowcase (Mermaid.js is large)
- **Components**: Functional components with named exports, props interfaces required
- **Styling**: Tailwind-first with custom theme colors in `tailwind.config.js`
- **Theme**: Dark mode default, class-based toggle (`darkMode: 'class'`)

### Worker (`worker/src/index.ts`)
Contact form handler with 5 security layers:
1. Rate limiting (3 submissions/hour per IP, in-memory Map)
2. Honeypot field (hidden `website` input)
3. Time validation (reject submissions < 3 seconds)
4. Turnstile CAPTCHA verification
5. Server-side email validation

Sends emails via MailChannels API. CORS restricted to `trystan-tbm.dev`.

### Infrastructure (`terraform/`)
Manages: Pages project, Worker script, Worker routes (`/api/*`), DNS records, secret bindings.

**IMPORTANT**: Build Worker before applying Terraform:
```bash
cd worker && npm run build  # Creates worker/dist/index.js
cd ../terraform && terraform apply
```

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

All secrets must be environment variables:
- Frontend: `VITE_TURNSTILE_SITE_KEY` (via `.env` or Terraform)
- Worker: `TURNSTILE_SECRET_KEY`, `CONTACT_EMAIL` (via `.dev.vars` locally, Terraform for production)

### Pre-commit Hooks (Lefthook)
Runs automatically on commit:
- TypeScript type checking
- ESLint on staged files
- Secrets detection (blocks commits with API keys, emails)
- Commit message minimum 10 characters

## Environment Setup

**Frontend** (`.env`):
```bash
VITE_TURNSTILE_SITE_KEY=your-site-key
```

**Worker** (`worker/.dev.vars`):
```bash
TURNSTILE_SECRET_KEY=your-secret-key
CONTACT_EMAIL=test@example.com
```

**Terraform** (`terraform/terraform.tfvars`):
```hcl
cloudflare_api_token  = "..."
cloudflare_account_id = "..."
cloudflare_zone_id    = "..."
turnstile_site_key    = "..."
turnstile_secret_key  = "..."
contact_email         = "..."
```

## Key Files

| Path | Purpose |
|------|---------|
| `src/App.tsx` | Main layout, component composition |
| `src/components/Contact.tsx` | Contact form with Turnstile integration |
| `worker/src/index.ts` | Worker handler with all security layers |
| `worker/wrangler.toml` | Worker configuration |
| `terraform/main.tf` | All Cloudflare infrastructure |
| `tailwind.config.js` | Theme colors and fonts |
| `vite.config.ts` | Build configuration with chunk splitting |
| `lefthook.yml` | Pre-commit hooks configuration |

## Performance Budget

- Max bundle size: 500KB
- Max chunk size: 200KB
- Mermaid.js lazy-loaded to reduce initial bundle
- React vendor chunk split for caching
