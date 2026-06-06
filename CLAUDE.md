# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Agent behavior — you are a COORDINATOR

For substantive work in a specialized domain, delegate to the appropriate specialist sub-agent
rather than carrying every gotcha in this file. Route by domain:

| Domain | Specialist | Scope |
|---|---|---|
| React components, `App.tsx` composition, Tailwind theme tokens, dark-mode toggle | `frontend-component-expert` (project) | repo-specific |
| Contact form (`Contact.tsx`), WAF CAPTCHA, `POST /api/contact` contract, backend seam | `contact-form-waf-expert` (project) | repo-specific |
| CI/CD: `deploy.yml`/`ci.yml`, OIDC `portfolio-deploy`, SSM build reads, S3 sync + CloudFront invalidation | `deploy-pipeline-expert` (project) | repo-specific |
| Vite build, chunk splitting, bundle budget, Mermaid lazy-load, lockfile gotchas | `build-perf-expert` (project) | repo-specific |
| General React 18 / TypeScript-strict / hooks / a11y / Tailwind craft | `react-frontend-expert` (global) | general |
| General AWS services / IAM / CloudFront / cost / security | `aws-cloud-expert` (global) | general |
| Breaking-change impact on the `/api/contact` request/response shape | `api-contract-validator` (global) | general |

Project-level specialists (`.claude/agents/`) hold **this repo's** gotchas; global specialists
(`~/.claude/agents/`) hold reusable expertise. As coordinator, send domain specifics to the project
agent and general mechanics to the global one. The per-domain operational gotchas that used to live
in this file now live in those specialists.

## Project Overview

Personal portfolio for Trystan Bates-Maricle (AI/ML Engineer). **This repo is the frontend** — a
React 18 + TypeScript + Tailwind static site built with Vite, hosted on S3 and served via CloudFront
(OAC). AWS-only (us-east-1). Live at https://trystan-tbm.dev.

- The **S3 site bucket, CloudFront distribution, ACM cert, and AWS WAF** are owned by the separate
  **infrastructure** repo (the shadowspire landing zone). This repo only syncs the build to that
  bucket and invalidates that distribution — see `deploy-pipeline-expert`.
- The **contact backend** (the `portfolio-contact-ingest` Lambda, its OpenTofu, SES/DKIM, secrets,
  API Gateway) lives in **`../portfolio-backend`** (`github.com/Grimm07/portfolio-backend`). The
  contact form posts same-origin to an infra-owned endpoint that invokes that Lambda; this repo only
  embeds the API path and the WAF integration URL/key at build time — see `contact-form-waf-expert`.

> The Cloudflare→AWS migration is **complete**: backend, infrastructure, and frontend hosting all
> run on the shadowspire AWS landing zone (us-east-1); apex/www/dev serve from CloudFront→S3. The
> Cloudflare zone is retained **only** for DNS and the SES DKIM CNAME records. Historical sequencing:
> `docs/superpowers/plans/2026-06-03-aws-cutover-reconciliation.md`. Backend runbook lives in the
> `portfolio-backend` repo.

## Development Commands

```bash
npm run dev              # Vite dev server (http://localhost:5173)
npm run build            # Production build (tsc -b && vite build)
npm run preview          # Preview the production build locally
npm run lint             # ESLint
npm run test             # Vitest (watch); test:run for one-shot, test:coverage for coverage
npm run analyze          # Bundle analysis build (--mode analyze)
npx tsc --noEmit         # Type check without emitting
```

> The contact **backend + infrastructure** (Lambda, OpenTofu, SES, secrets) live in
> **`../portfolio-backend`** with their own commands, tests, and CI/CD. Nothing here builds or
> deploys the Lambda.

## Cross-cutting facts (all domains — owned by no single specialist)

### Security requirements (CRITICAL — hard project rules)
**NEVER include in code:**
- Email addresses (no `mailto:`, no plaintext) — the lefthook secrets-check regex blocks them.
- Phone numbers (any format).
- API keys or secrets.

**Contact is form-only.** The only allowed direct-contact affordances are the LinkedIn / GitHub /
GitLab profile links (each has its own spam protection). Secrets are never hardcoded: the frontend's
only injected values are the `VITE_WAF_*` build-time vars (embedded statically — see
`contact-form-waf-expert` / `deploy-pipeline-expert`); the recipient address lives in AWS Secrets
Manager, read at runtime by the backend repo.

### Pre-commit hooks (Lefthook) — run automatically on commit
- TypeScript type check (`tsc --noEmit`)
- ESLint on staged `*.{ts,tsx}`
- Secrets detection (blocks AWS/Google/Stripe keys and email addresses)
- Commit message ≥ 10 characters

### Code style
- **Imports:** React → external packages → local components → types.
- **Components:** functional only, named exports, props interface always defined.
- **CSS:** Tailwind utilities only, avoid custom CSS.
- **TypeScript:** strict (`noUnusedLocals`, `noUnusedParameters`).

(Theme tokens, component composition, deploy mechanics, and bundle budget have moved into the
specialists above — ask the relevant agent for the authoritative gotchas.)

## Environment Setup

**Frontend** (`.env`, build-time `VITE_*` vars embedded statically):
```bash
VITE_WAF_INTEGRATION_URL=https://<waf-integration-host>/...
VITE_WAF_API_KEY=<client-side waf api key>
```
In CI these are read from SSM `/portfolio/<env>/waf-{integration-url,api-key}` at build time
(`deploy-pipeline-expert`). Backend/Terraform env setup lives in the `portfolio-backend` repo.

## Key Files

| Path | Purpose | Owning specialist |
|------|---------|-------------------|
| `src/App.tsx` | Main layout, component composition | `frontend-component-expert` |
| `src/components/Contact.tsx` | Contact form + AWS WAF CAPTCHA | `contact-form-waf-expert` |
| `tailwind.config.js` | Theme colors and fonts | `frontend-component-expert` |
| `vite.config.ts` | Build config, chunk splitting, budget | `build-perf-expert` |
| `.github/workflows/deploy.yml` | OIDC deploy → S3 sync + CloudFront invalidation | `deploy-pipeline-expert` |
| `lefthook.yml` | Pre-commit hooks | cross-cutting (this file) |
| `../portfolio-backend/` | Contact Lambda + OpenTofu + runbook (separate repo) | — |
