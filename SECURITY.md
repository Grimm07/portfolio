# Security Policy

This document outlines the security measures implemented in this portfolio website and provides a checklist for secure deployment.

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
- All code is reviewed to ensure no PII leakage

### 2. Contact Form with Multi-Layer Protection

The contact form implements defense-in-depth with multiple security layers:

#### Cloudflare Turnstile (Privacy-Focused CAPTCHA)
- **Status:** Phase 2 implementation
- **Purpose:** Verify human users without invasive tracking
- **Privacy:** Turnstile is privacy-focused and GDPR-compliant (unlike reCAPTCHA)
- **Implementation:** Server-side validation in Cloudflare Worker

#### Rate Limiting
- **Limit:** 3 submissions per hour per IP address
- **Purpose:** Prevent spam and abuse
- **Implementation:** Cloudflare Worker with KV storage for tracking

#### Honeypot Spam Detection
- **Field:** Hidden "website" input field
- **Detection:** Bots typically fill hidden fields; humans do not
- **Action:** Submissions with honeypot filled are silently rejected
- **Implementation:** Frontend (hidden field) + backend validation

#### Time-Based Validation
- **Rule:** Reject submissions completed in less than 3 seconds
- **Purpose:** Detect automated form submissions
- **Implementation:** Server-side timestamp validation

#### Server-Side Email Validation
- **Validation:** Strict regex pattern matching (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
- **Purpose:** Ensure valid email format and prevent injection attacks
- **Implementation:** Cloudflare Worker backend validation

### 3. CORS Restrictions

**Configuration:** Cloudflare Worker enforces strict CORS policies
- Only allows requests from the portfolio domain
- Prevents unauthorized cross-origin requests
- Protects against CSRF attacks

### 4. Environment Variable Management

**Protection:**
- All secrets stored in environment variables
- `.env` files are in `.gitignore` (never committed)
- `.env.example` template provided (without actual values)
- Worker secrets managed via Cloudflare dashboard or Wrangler

**Secrets Include:**
- Cloudflare API tokens
- Turnstile secret keys
- MailChannels API keys (if applicable)

### 5. Secrets via Terraform (Not in Git)

**Infrastructure as Code:**
- Terraform manages Cloudflare resources
- `terraform.tfvars` contains sensitive values and is in `.gitignore`
- `terraform.tfvars.example` provided as template
- Terraform state files (`.tfstate`) are also excluded from git

**Benefits:**
- Secrets never enter version control
- Infrastructure changes are auditable
- Easy to rotate credentials

### 6. HTTPS Enforcement

**Implementation:** Cloudflare proxy automatically enforces HTTPS
- All HTTP traffic redirected to HTTPS
- SSL/TLS certificates managed by Cloudflare
- HSTS headers configured

### 7. Secure Headers (Future Enhancement)

**Planned for Phase 3:**
- Content Security Policy (CSP) headers
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
- [ ] `terraform.tfvars` excluded from git (verify `.gitignore`)

### Infrastructure Security
- [ ] Cloudflare API token has minimal required permissions
- [ ] Turnstile secret key only stored in Worker environment variables
- [ ] Worker secrets configured via Cloudflare dashboard (not in code)
- [ ] HTTPS enforced (Cloudflare proxy enabled)
- [ ] DNS records point to Cloudflare proxy (orange cloud enabled)

### Content Security
- [ ] Resume PDF (if added) is sanitized (no contact information)
- [ ] All external links use `rel="noopener noreferrer"`
- [ ] No inline scripts (except necessary third-party widgets)

### Dependency Management
- [ ] Dependabot enabled for automatic dependency updates
- [ ] Regular security audits (`npm audit`)
- [ ] All dependencies are up-to-date and from trusted sources

### Repository Security
- [ ] GitHub repository has branch protection enabled on `main` branch
- [ ] Required pull request reviews before merging
- [ ] No secrets in git history (use `git-secrets` or similar if needed)

### Monitoring (Phase 3)
- [ ] Error tracking configured (if applicable)
- [ ] Rate limiting logs monitored
- [ ] Failed form submission attempts logged

---

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

### Preferred Method
1. **Use the contact form** on the website (ironic but secure)
   - Include details about the vulnerability
   - Allow time for response before public disclosure

### Alternative Method
2. **LinkedIn Message**
   - Send a direct message via LinkedIn profile
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
- Cloudflare API tokens have minimal required permissions
- Worker secrets are scoped to specific resources
- No unnecessary access granted to any service

### 2. Defense in Depth
- Multiple layers of spam protection (Turnstile, honeypot, rate limiting, time validation)
- Frontend validation + server-side validation
- Network-level protection (Cloudflare) + application-level protection

### 3. Secure by Default
- Dark mode is default (reduces eye strain, but also demonstrates thoughtful defaults)
- No dark patterns or deceptive UI elements
- All security features enabled by default

### 4. Privacy-First Approach
- Cloudflare Turnstile chosen over Google reCAPTCHA (privacy-focused)
- No analytics tracking in MVP (Phase 1)
- Minimal data collection (only form submissions)
- GDPR-compliant practices

### 5. Infrastructure Security
- Infrastructure as Code (Terraform) for auditability
- Secrets management via environment variables
- Version control excludes sensitive files
- Automated deployments reduce human error

### 6. Code Quality
- TypeScript for type safety
- Strict TypeScript configuration
- ESLint for code quality
- Regular dependency updates

---

## Future Security Enhancements (Phase 3)

The following security improvements are planned for future phases:

### Content Security Policy (CSP)
- Implement strict CSP headers
- Restrict inline scripts and styles
- Whitelist trusted domains only

### Enhanced Rate Limiting
- Rate limiting at Cloudflare edge (before Worker execution)
- More granular rate limiting (per endpoint)
- IP reputation checking

### Monitoring and Alerting
- Failed authentication attempts logged
- Unusual traffic patterns detected
- Automated alerts for security events

### Privacy-Focused Analytics (Optional)
- Only if analytics are needed, use privacy-focused solutions
- Self-hosted analytics (Plausible, Umami) or Cloudflare Web Analytics
- No third-party tracking cookies
- GDPR-compliant data handling

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
- **Cloudflare:** DDoS protection, WAF, rate limiting, SSL/TLS
- **Cloudflare Turnstile:** Privacy-focused CAPTCHA
- **Terraform:** Infrastructure as Code
- **GitHub:** Version control with branch protection

### Security Standards
- OWASP Top 10 awareness
- WCAG 2.1 AA accessibility (security-related)
- GDPR compliance considerations

### Documentation
- [Cloudflare Security Best Practices](https://developers.cloudflare.com/fundamentals/get-started/best-practices/)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [Terraform Security Best Practices](https://www.terraform.io/docs/cloud/guides/security.html)

---

## Contact

For security-related inquiries, use the contact form on the website or reach out via LinkedIn.

**Last Updated:** January 2025
