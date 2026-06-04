# Deployment Checklist

Deployment checklist for the portfolio project on its current **AWS-only** architecture
(region `us-east-1`). The Cloudflare → AWS migration is complete; there is no Worker,
Pages project, Turnstile, MailChannels, or Wrangler. The only remaining Cloudflare
surface is the DNS zone hosting the **SES DKIM CNAME** records.

**Last Updated:** 2026-06

---

## Architecture at a glance

- **Frontend**: React 18 + TypeScript + Tailwind + Vite → static build → S3 site bucket,
  served via CloudFront (OAC). Hosts: prod `trystan-tbm.dev` + `www.trystan-tbm.dev`,
  dev `dev.trystan-tbm.dev`.
- **Contact backend**: single Lambda `portfolio-contact-ingest` behind an `AWS_IAM`
  Function URL fronted by CloudFront (OAC). Handler flow: parse → honeypot (`website`) →
  time-trap → field validation → Amazon SES send (Reply-To = submitter). Recipient address
  comes from AWS Secrets Manager.
- **Infra**: OpenTofu (`tofu`) in `terraform/`, per-env S3 state backend. Manages the
  Lambda, IAM, Function URL, SES identity/DKIM, the contact-email secret, and the SSM
  handshake.
- **Spam protection**: AWS WAF at the edge (CAPTCHA + rate-limiting) before the Lambda,
  plus in-handler honeypot + time-trap + validation. No app-layer rate limiter.
- **Ownership boundary**: the S3 site bucket, CloudFront distribution, ACM cert, and WAF
  are **owned by a separate infra repo** (shadowspire landing zone). This repo only syncs
  the build to the infra-owned bucket and invalidates the infra-owned distribution.

Two environments live in two separate AWS accounts:

| Env  | Account        | Host(s)                                    |
|------|----------------|--------------------------------------------|
| dev  | `176355979099` | `dev.trystan-tbm.dev`                      |
| prod | `681053994223` | `trystan-tbm.dev`, `www.trystan-tbm.dev`   |

---

## 1. Prerequisites (one-time per environment)

### AWS access
- [ ] AWS SSO / IAM access to the dev account (`176355979099`) and prod account (`681053994223`).
- [ ] Region is `us-east-1` for all operations.
- [ ] No long-lived AWS access keys are created or stored anywhere — CI uses GitHub OIDC.

### OpenTofu CLI
- [ ] `tofu` is installed (user-local at `~/.local/bin`). Add it to PATH first:
  ```bash
  export PATH="$HOME/.local/bin:$PATH"
  ```

### GitHub Environments + secrets
- [ ] GitHub Environments `dev` and `production` exist. Names **must** match the OIDC
  subjects in `deploy.yml`.
- [ ] `production` requires reviewers (manual approval gate before prod deploy).
- [ ] OIDC role ARNs are configured for each environment (no static AWS keys).
- [ ] Per-environment GitHub secrets are set:
  - [ ] `CONTACT_EMAIL` — recipient address (stored into Secrets Manager by Terraform; never committed).
  - [ ] `CLOUDFLARE_API_TOKEN` — **only** for managing SES DKIM CNAMEs in the Cloudflare DNS zone.
  - [ ] `CLOUDFLARE_ZONE_ID` — **only** for the SES DKIM CNAMEs.

### SES verification (one-time)
- [ ] SES domain identity verified; DKIM CNAMEs resolve in the Cloudflare DNS zone.
- [ ] The recipient identity is verified in SES.
- [ ] Request SES production access **only if** emailing recipients beyond the verified inbox
  (the sandbox limits sends to verified identities).

### Local Terraform vars (only needed for local apply; gitignored)
- [ ] `terraform/terraform.tfvars` contains:
  - [ ] `environment` (`dev` or `prod`)
  - [ ] `contact_email` (recipient; goes into Secrets Manager)
  - [ ] `cloudflare_api_token` (SES DKIM only)
  - [ ] `cloudflare_zone_id` (SES DKIM only)

---

## 2. Pre-deploy verification

These mirror the lefthook pre-commit hooks and the `ci.yml` jobs. Run locally before pushing.

### Frontend (root)
- [ ] `npx tsc --noEmit` — type check passes.
- [ ] `npm run lint` — ESLint passes.
- [ ] `npm test` (Vitest) — root suite passes.
- [ ] `npm run build` — production build succeeds.
- [ ] `npm audit` — no actionable high/critical vulns.

### Contact backend (`backend/`)
- [ ] `npm run typecheck` — Lambda type check passes.
- [ ] `npm test` — backend Vitest suite passes (handler, email, validation, ip, secrets).
- [ ] `npm audit` — no actionable high/critical vulns.
- [ ] **Build the bundle** (required before any apply):
  ```bash
  cd backend && npm run build      # → backend/dist/ingest/index.mjs
  ```

### Infrastructure (`terraform/`)
- [ ] `export PATH="$HOME/.local/bin:$PATH"` (tofu is user-local).
- [ ] `tofu fmt -check`
- [ ] `tofu init -reconfigure -backend-config=backend-<env>.hcl`
- [ ] `tofu validate`
- [ ] `tflint` passes.

### Secrets scan
- [ ] Lefthook secrets-detection passes (blocks plaintext emails / API keys).
- [ ] No plaintext email addresses or phone numbers anywhere in source — the recipient
  lives in Secrets Manager, not in code.

---

## 3. Deploy

The **normal path is CI via GitHub Actions OIDC** (`.github/workflows/deploy.yml`). The
workflow has a dev job and a prod job; each runs the same sequence in its environment:

1. Build the Lambda bundle (`backend/dist/ingest/index.mjs`).
2. `tofu apply` with per-env backend-config and `-var environment=<env>`.
3. Sync the frontend build to the infra-owned S3 site bucket.
4. Invalidate the infra-owned CloudFront distribution.

**Ordering rule**: `tofu apply` runs **before** the S3 sync + invalidation, and **dev
deploys before prod**.

### Via CI (recommended)
- [ ] Merge to the branch that triggers `deploy.yml`.
- [ ] **dev** job runs and goes green.
- [ ] Run dev acceptance tests (section 5) before promoting.
- [ ] **production** job awaits required reviewer approval.
- [ ] Approve → prod job runs and goes green.

### Manual / break-glass apply (local)
Only if CI is unavailable. The build-before-apply rule still applies.
```bash
export PATH="$HOME/.local/bin:$PATH"

# 1. Build the Lambda bundle FIRST (archive references backend/dist)
cd backend && npm run build

# 2. Apply infra for the target env
cd ../terraform
tofu init -reconfigure -backend-config=backend-<env>.hcl
tofu apply -var environment=<env>

# 3. Build the frontend, then sync to the infra-owned bucket + invalidate
cd ..
npm run build
# aws s3 sync ./dist s3://<infra-owned-site-bucket> --delete
# aws cloudfront create-invalidation --distribution-id <infra-dist-id> --paths "/*"
```
- [ ] Lambda bundle built before apply.
- [ ] `tofu apply` completed for the target env.
- [ ] Frontend synced to the infra-owned bucket and CloudFront invalidated.
- [ ] dev done and verified before prod.

---

## 4. SSM handshake checklist

This repo and the infra repo coordinate via SSM Parameter Store (per env).

**Published by this repo** (after `tofu apply`):
- [ ] `/portfolio/<env>/ingest-function-url`
- [ ] `/portfolio/<env>/ingest-function-arn`

**Read by this repo** (published by the infra repo — must exist before frontend build / OAC grant):
- [ ] `/portfolio/<env>/cloudfront-distribution-arn` (used to grant CloudFront OAC invoke on the Function URL)
- [ ] `/portfolio/<env>/waf-integration-url` → frontend `VITE_WAF_INTEGRATION_URL`
- [ ] `/portfolio/<env>/waf-api-key` → frontend `VITE_WAF_API_KEY`

> `VITE_*` vars are embedded **statically at build time**, so the WAF integration URL and
> API key must be read from SSM and present in the environment *before* `npm run build`.

---

## 5. Post-deploy acceptance tests

Run per host (`dev.trystan-tbm.dev` for dev, `trystan-tbm.dev` + `www.trystan-tbm.dev` for prod).

### Site is served from S3 via CloudFront
- [ ] `curl -sI https://<host>/` returns `200` over HTTPS with CloudFront headers
  (e.g. `x-cache`, `via: ... cloudfront`), serving the React build.

### Contact path is WAF-protected at the edge
- [ ] `POST /api/contact` with **no solved WAF token** is met with a WAF CAPTCHA challenge
  at the edge (i.e. **not** a `200`).
- [ ] A real form submission **with a solved CAPTCHA** results in an email being received.
  *(Solving the CAPTCHA is a human step and cannot be automated.)*

### Lambda is not directly reachable
- [ ] `curl -X POST <function-url>` returns `403` — the `AWS_IAM` Function URL is only
  invocable via CloudFront OAC, never directly.

### Legacy is fully gone
- [ ] No Cloudflare Worker / Pages / Turnstile / MailChannels remain in the project.
- [ ] No long-lived AWS keys exist in any workflow (OIDC only).

---

## 6. Rollback notes

- **Frontend**: re-sync a previous build to the infra-owned S3 bucket and invalidate the
  distribution (revert the commit and let CI redeploy, or re-run the manual sync with the
  prior artifact). CloudFront serves the new objects after invalidation.
- **Backend (Lambda)**: roll back by rebuilding the previous `backend/dist` bundle and
  running `tofu apply` for the env, or revert the offending commit and let CI re-apply.
  The bundle must be built before apply.
- **Infra**: `tofu` state is per-env (`shadowspire-<env>-state-*` bucket +
  `shadowspire-<env>-tf-lock` DynamoDB lock). Re-apply a known-good commit for the
  affected env only; never cross environments/accounts.
- **Promotion safety**: prod changes go through the reviewer-gated `production` GitHub
  Environment. Verify dev acceptance tests before approving prod.
- **Out of scope here**: the S3 site bucket, CloudFront distribution, ACM cert, and WAF
  are owned by the infra repo — structural rollbacks of those live in that repo, not here.

---

## Quick command reference

```bash
# Frontend
npm run dev | npm run build | npm run preview | npm run lint | npm test
npx tsc --noEmit

# Backend (from backend/)
npm test | npm run typecheck | npm run build

# Infra (from terraform/) — tofu is user-local
export PATH="$HOME/.local/bin:$PATH"
tofu init -reconfigure -backend-config=backend-dev.hcl   # or backend-prod.hcl
tofu fmt -check && tofu validate
tofu apply -var environment=dev                          # or prod
```
