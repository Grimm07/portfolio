# Security Policy

This document outlines the security measures implemented in this portfolio website and provides a checklist for secure deployment.

The site runs entirely on AWS (region `us-east-1`): a static frontend served from Amazon CloudFront, and a contact backend built from a single AWS Lambda fronted by CloudFront with AWS WAF at the edge.

## Security Features Implemented

### 1. No Personally Identifiable Information (PII) in Source Code or DOM

**Protection:** Email addresses and phone numbers are **never** included in:
- HTML source code
- JavaScript bundles
- React components
- DOM elements (even hidden)
- Comments or documentation

**Rationale:** Prevents automated scraping, reduces attack surface, and protects privacy.

**Implementation:**
- Contact form is the only method for reaching out
- LinkedIn and GitHub profile links are used instead of direct contact information
- The recipient email address lives only in AWS Secrets Manager, never in code or git
- All code is reviewed to ensure no PII leakage

### 2. Contact Form with Multi-Layer Protection

The contact form implements defense-in-depth. Protection is split between the
**edge** (AWS WAF on CloudFront, before the request reaches any application code)
and the **handler** (the `portfolio-contact-ingest` Lambda).

#### AWS WAF CAPTCHA + Rate Limiting (Edge)
- **Where:** AWS WAF web ACL associated with the CloudFront distribution — evaluated *before* the request is forwarded to the Lambda.
- **CAPTCHA:** The contact form integrates the AWS WAF CAPTCHA via the WAF integration script; the edge WAF rule validates the token. Requests without a valid token are challenged or blocked at the edge.
- **Rate limiting:** A WAF rate-based rule throttles abusive clients at the edge. There is no application-layer rate limiter in the handler — rate limiting is an edge responsibility.

#### Honeypot Spam Detection
- **Field:** Hidden `website` input field
- **Detection:** Bots typically fill hidden fields; humans do not
- **Action:** Submissions with the honeypot filled are silently rejected
- **Implementation:** Frontend (hidden field) + Lambda handler check

#### Time-Trap (Time-Based Validation)
- **Rule:** Reject submissions completed implausibly fast (automated submissions)
- **Purpose:** Detect scripted form posts that submit faster than a human could
- **Implementation:** Server-side timestamp validation in the Lambda handler

#### Server-Side Field Validation
- **Validation:** Strict server-side checks — required fields, email format regex, and message length bounds
- **Purpose:** Ensure well-formed input and prevent injection/abuse
- **Implementation:** Shared validation in the Lambda handler (frontend validation is convenience only; the server is authoritative)

#### Email Delivery via Amazon SES
- **Sending:** One Amazon SES email per valid submission, with `Reply-To` set to the submitter
- **Recipient:** Read at runtime from AWS Secrets Manager — never hardcoded, never committed to git

### 3. Function URL Authentication & Origin Access Control

The contact backend is a single AWS Lambda (`portfolio-contact-ingest`) exposed via an
**`AWS_IAM`-authenticated Function URL**, fronted by CloudFront with **Origin Access Control (OAC)**.

- The Function URL requires SigV4 IAM authentication — it is **not** publicly invocable.
- Only OAC-signed requests from the CloudFront distribution can reach the Lambda; direct calls to the Function URL are rejected with **403**.
- This keeps the entire request path behind CloudFront + WAF, so the edge protections above cannot be bypassed.

### 4. Secrets & Environment Variable Management

**Frontend (build-time, client-side values — safe to embed):**
- `VITE_WAF_INTEGRATION_URL` and `VITE_WAF_API_KEY` are client-side values used by the WAF CAPTCHA integration. Vite embeds `VITE_*` vars statically at build time. These are published by the infrastructure repo to **SSM Parameter Store** and consumed at build time.

**Lambda (runtime):**
- The Lambda receives `FROM_EMAIL` and `CONTACT_EMAIL_SECRET_ARN` as environment variables.
- The actual recipient address is stored in **AWS Secrets Manager** and read at runtime via `CONTACT_EMAIL_SECRET_ARN` — it is never an env var value, never in code, never in git.

**Local development:**
- `.env` files are in `.gitignore` (never committed)
- `.env.example` template is provided (without real values)

### 5. Secrets via Infrastructure as Code (Not in Git)

**Infrastructure as Code:** the backend OpenTofu — and the secrets it handles (`terraform.tfvars`,
the contact-email secret in Secrets Manager, the per-env S3 state) — now live in the
**[`portfolio-backend`](https://github.com/Grimm07/portfolio-backend)** repo, which documents its own
secret handling. This repo (the frontend) commits no secrets: only build-time `VITE_*` values via
`.env` (gitignored), which are themselves client-side, non-sensitive values published by the infra
repo to SSM.

**Benefits:**
- Secrets never enter version control
- Infrastructure changes are auditable
- Easy to rotate credentials

### 6. Least-Privilege IAM

The Lambda's execution role grants only what the handler needs:
- `ses:SendEmail`, constrained by a `ses:FromAddress` condition so it can only send as the approved address
- `secretsmanager:GetSecretValue` scoped to the **single** contact-email secret
- Basic Lambda logging (CloudWatch Logs)

No other permissions are granted — no S3, DynamoDB, SQS, or wildcard access.

### 7. HTTPS / TLS Enforcement

**Implementation:** TLS and HTTPS are terminated at **Amazon CloudFront** using an **ACM certificate** (infrastructure-owned).
- All traffic is served over HTTPS
- AWS WAF (web ACL) provides edge protection (CAPTCHA, rate limiting) in front of both the static site and the contact Function URL

### 8. Secure Headers (Future Enhancement)

**Planned:**
- Content Security Policy (CSP) headers (via a CloudFront response-headers policy)
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy

---

## Security Checklist (for Deployment)

Before deploying to production, verify the following:

### Source Code Verification
- [ ] No email addresses in HTML source code
- [ ] No email addresses in JavaScript bundles (check `dist/` after build)
- [ ] No phone numbers in any format (plain text, `tel:`, obfuscated)
- [ ] No hardcoded API keys, tokens, or secrets
- [ ] All `.env` files excluded from git (verify `.gitignore`)
- [ ] Backend IaC/secret checks (`terraform.tfvars`, `.tfstate`) are covered in the
      `portfolio-backend` repo's security policy

### Infrastructure Security
- [ ] Contact Lambda Function URL is `AWS_IAM`-authenticated and **not** publicly invocable (direct calls return 403)
- [ ] CloudFront Origin Access Control (OAC) is the only path that can invoke the Function URL
- [ ] AWS WAF web ACL is associated with the CloudFront distribution (CAPTCHA + rate-based rule active)
- [ ] Lambda IAM role is least-privilege (`ses:SendEmail` with `ses:FromAddress` condition, `secretsmanager:GetSecretValue` on the single secret, logging only)
- [ ] Recipient email exists only in AWS Secrets Manager (not an env var, not in code)
- [ ] HTTPS enforced via CloudFront with a valid ACM certificate
- [ ] SES domain identity verified and DKIM CNAMEs published

### CI/CD Security
- [ ] GitHub Actions assumes the `portfolio-deploy` IAM role via **OIDC** (no long-lived AWS access keys in workflows or secrets)
- [ ] GitHub Environments `dev` and `production` gate deploys; `production` requires reviewers
- [ ] OIDC trust policy is scoped to this repository/environment

### Content Security
- [ ] Resume PDF (if added) is sanitized (no contact information)
- [ ] All external links use `rel="noopener noreferrer"`
- [ ] No inline scripts (except necessary third-party widgets, e.g. the WAF integration script)

### Dependency Management
- [ ] Dependabot enabled for automatic dependency updates
- [ ] Regular security audits (`npm audit`)
- [ ] All dependencies are up-to-date and from trusted sources

### Repository Security
- [ ] GitHub repository has branch protection enabled on `main` branch
- [ ] Required pull request reviews before merging
- [ ] No secrets in git history

### Monitoring
- [ ] Lambda errors and invocations visible in CloudWatch
- [ ] WAF blocked/challenged request metrics monitored
- [ ] Failed form submission attempts logged

---

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

### Preferred Method
1. **Use the contact form** on the website
   - Include details about the vulnerability
   - Allow time for response before public disclosure

### Alternative Method
2. **LinkedIn Message** (linkedin.com/in/trystan-m)
   - Send a direct message via LinkedIn
   - Include "Security Issue" in the subject line

### Response Timeline
- Initial acknowledgment within 48 hours
- Status update within 7 days
- Resolution timeline depends on severity

### Responsible Disclosure
- Please do not publicly disclose vulnerabilities until they are patched
- Allow reasonable time for fixes to be deployed
- Credit will be given (if desired) after resolution

---

## Security Best Practices Followed

### 1. Principle of Least Privilege
- The Lambda IAM role grants only `ses:SendEmail` (scoped by `ses:FromAddress`), `secretsmanager:GetSecretValue` on one secret, and logging
- The CI deploy role is assumed via OIDC and scoped to this repository
- No unnecessary access granted to any service

### 2. Defense in Depth
- Edge protections (AWS WAF CAPTCHA + rate limiting) run before application code
- Layered handler checks: honeypot, time-trap, strict server-side validation
- Function URL is `AWS_IAM`-authenticated and reachable only via CloudFront OAC
- Frontend validation + authoritative server-side validation

### 3. Secure by Default
- Dark mode is the default
- No dark patterns or deceptive UI elements
- The Function URL is private by default; only OAC-signed CloudFront requests reach it

### 4. Privacy-First Approach
- Minimal data collection (only form submissions)
- Recipient address kept out of code and DOM entirely
- GDPR-conscious practices

### 5. Infrastructure Security
- Infrastructure as Code (OpenTofu) for auditability
- Per-env remote state in S3 with DynamoDB locking (never in git)
- Secrets management via AWS Secrets Manager / SSM, not source control
- Automated, OIDC-based deployments reduce human error and remove standing credentials

### 6. Code Quality
- TypeScript for type safety
- Strict TypeScript configuration
- ESLint for code quality
- Regular dependency updates

---

## Future Security Enhancements

The following security improvements are planned:

### Content Security Policy (CSP)
- Implement strict CSP headers via a CloudFront response-headers policy
- Restrict inline scripts and styles
- Allow only trusted domains

### Enhanced Edge Protection
- Tune WAF rules (managed rule groups, IP reputation lists)
- More granular rate-based rules
- Bot Control evaluation

### Monitoring and Alerting
- CloudWatch alarms on Lambda errors and WAF block spikes
- Unusual traffic pattern detection
- Automated alerts for security events

### Security Headers
- Complete set of security headers (CSP, HSTS, X-Frame-Options, etc.)
- Regular security header audits
- A+ rating on securityheaders.com

### Dependency Scanning
- Automated dependency vulnerability scanning
- Integration with GitHub Security Advisories
- Automated pull requests for security patches

---

## Security Resources

### Tools Used
- **Amazon CloudFront:** CDN, TLS termination, OAC to the Lambda Function URL
- **AWS WAF:** Edge CAPTCHA and rate-based rules
- **AWS Lambda:** Contact backend (`portfolio-contact-ingest`)
- **Amazon SES:** Transactional email for contact submissions
- **AWS Secrets Manager:** Runtime storage of the recipient address
- **AWS IAM:** Least-privilege execution and deploy roles
- **AWS ACM:** TLS certificate for CloudFront
- **OpenTofu:** Infrastructure as Code
- **GitHub Actions + OIDC:** Keyless deployments with environment gating

### Security Standards
- OWASP Top 10 awareness
- WCAG 2.1 AA accessibility (security-related)
- GDPR compliance considerations

### Documentation
- [AWS WAF Developer Guide](https://docs.aws.amazon.com/waf/latest/developerguide/waf-chapter.html)
- [Restricting access to a Lambda Function URL with CloudFront OAC](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-origin.html)
- [AWS Lambda Security Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/lambda-security.html)
- [Configuring OpenID Connect in AWS (GitHub Actions OIDC)](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)

---

## Contact

For security-related inquiries, use the contact form on the website or reach out via LinkedIn (linkedin.com/in/trystan-m).

**Last Updated:** June 2026
