# Deployment Checklist & Project Validation

This checklist validates the portfolio project matches the specifications from all development phases and is production-ready.

---

## Phase 1 Validation (MVP - Frontend)

### Project Structure
- [ ] Directory structure matches specification:
  - [ ] src/components/ exists with 9 components
  - [ ] src/App.tsx is main layout file
  - [ ] src/main.tsx is React entry point
  - [ ] src/index.css has Tailwind directives + custom styles
  - [ ] public/ directory exists
  - [ ] worker/ directory exists
  - [ ] terraform/ directory exists
  - [ ] .claude/ directory with context.md exists
  - [ ] .github/workflows/ exists with ci.yml
  - [ ] .github/dependabot.yml exists

### Dependencies & Configuration
- [ ] package.json includes:
  - [ ] react ^18.3.1
  - [ ] react-dom ^18.3.1
  - [ ] typescript ^5.7.2
  - [ ] vite ^6.0.5
  - [ ] tailwindcss ^3.4.17
  - [ ] @marsidev/react-turnstile (Phase 2)
  - [ ] mermaid (Phase 2)
  - [ ] lefthook (devDependency)
- [ ] tailwind.config.js has custom color palette:
  - [ ] primary (#3b82f6), secondary (#8b5cf6), success (#10b981)
  - [ ] bg.primary (#0a0a0a), bg.secondary (#141414), bg.tertiary (#1f1f1f)
  - [ ] darkMode: 'class' configured
- [ ] tsconfig.json has strict: true
- [ ] vite.config.ts exists and configures React plugin
- [ ] postcss.config.js exists with tailwindcss and autoprefixer

### Components Validation
Run these checks on each component:

**Hero Component (src/components/Hero.tsx):**
- [ ] Exports named function: export function Hero()
- [ ] Section has id="hero"
- [ ] Full viewport height: min-h-screen
- [ ] Name: "Trystan Bates-Maricle" with gradient (from-primary to-secondary)
- [ ] Title: "AI/ML Engineer | Full-Stack Developer | Cloud Infrastructure"
- [ ] Tagline: "Building intelligent systems that scale"
- [ ] Two CTA buttons: "View Experience" and "Let's Connect"
- [ ] Smooth scroll implementation: scrollToSection function
- [ ] Responsive typography: text-5xl md:text-6xl lg:text-7xl

**About Component (src/components/About.tsx):**
- [ ] Section has id="about"
- [ ] Background: bg-bg-secondary (alternates from Hero)
- [ ] Contains exact content from .claude/context.md:
  - [ ] "Software Engineer at State Farm with 4+ years..."
  - [ ] Current focus areas mentioned
  - [ ] Education: B.S. Computer Science, Illinois State University (May 2023)
- [ ] Two-column layout on lg: breakpoint
- [ ] Single column on mobile

**Experience Component (src/components/Experience.tsx):**
- [ ] Section has id="experience"
- [ ] Grid layout: grid-cols-1 md:grid-cols-2
- [ ] Contains exactly 5 highlight cards:
  - [ ] NLP Voice Bot (25% reduction metric)
  - [ ] Codebase Modernization (40% LOC reduction)
  - [ ] OCR Document Processing
  - [ ] Enterprise LLM Research
  - [ ] Computer Vision Leadership
- [ ] Each card has:
  - [ ] Title, description, impact metric (green/success color)
  - [ ] Tech stack badges at bottom
  - [ ] Hover effects: scale-105 and shadow-xl
  - [ ] Background: bg-bg-tertiary with border
- [ ] Optional: Architecture diagrams with Mermaid (Phase 2)

**Patents Component (src/components/Patents.tsx):**
- [ ] Section has id="patents"
- [ ] Heading: "Patents & Innovation"
- [ ] Subheading: "3 patent applications filed in AI-centric customer support automation"
- [ ] Grid layout: grid-cols-1 md:grid-cols-3
- [ ] 3 patent cards with placeholders or actual USPTO links
- [ ] Each card has: title, status, description, link

**Skills Component (src/components/Skills.tsx):**
- [ ] Section has id="skills"
- [ ] Grid layout: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
- [ ] 4 category cards: AI/ML, Cloud & Infrastructure, Languages, Tools
- [ ] NOT a flat list - visual matrix with cards
- [ ] Each category has title and skill items
- [ ] Hover effects on cards
- [ ] Contains skills from .claude/context.md:
  - [ ] AI/ML: PyTorch, TensorFlow, spaCy, OpenCV, etc.
  - [ ] Cloud: AWS (Lambda, S3, etc.), Azure, Terraform
  - [ ] Languages: Python, Kotlin, TypeScript, Go, Java, C++
  - [ ] Tools: Docker, GitLab, React, Vite

**Projects Component (src/components/Projects.tsx):**
- [ ] Section has id="projects"
- [ ] Contains "Coming Soon" messaging
- [ ] 3-4 placeholder cards with reduced opacity
- [ ] Message: "Currently building new projects to showcase here. Check back soon!"
- [ ] Link to GitHub repo (placeholder or actual)
- [ ] Grid layout: grid-cols-1 md:grid-cols-2 lg:grid-cols-3

**Contact Component (src/components/Contact.tsx):**
- [ ] Section has id="contact"
- [ ] Two-column layout: form left, contact info right
- [ ] Form fields: name, email, message (all required)
- [ ] Hidden honeypot field: name="website" with display:none
- [ ] Email validation regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
- [ ] Submit button disabled until form valid
- [ ] Phase 2: Turnstile widget integrated (@marsidev/react-turnstile)
- [ ] Phase 2: Submits to /api/contact endpoint
- [ ] Contact info section includes:
  - [ ] LinkedIn link: https://www.linkedin.com/in/trystan-m/
  - [ ] GitHub link (optional)
  - [ ] NO email address anywhere
  - [ ] NO phone number anywhere

**Footer Component (src/components/Footer.tsx):**
- [ ] Copyright: "© 2025 Trystan Bates-Maricle"
- [ ] Tech stack: "Built with Vite, React, TypeScript, and Cloudflare Workers"
- [ ] GitHub link (placeholder or actual)
- [ ] Background: bg-bg-tertiary
- [ ] Border-top: border-gray-800
- [ ] Text size: text-sm

**ThemeToggle Component (src/components/ThemeToggle.tsx):**
- [ ] Fixed position top-right
- [ ] Reads theme from localStorage
- [ ] Default: dark mode
- [ ] Toggles 'dark' class on <html> element
- [ ] Saves preference to localStorage
- [ ] Icon changes: sun (light mode) / moon (dark mode)
- [ ] Accessible: aria-label, keyboard support

**ArchitectureDiagram Component (src/components/ArchitectureDiagram.tsx - Phase 2):**
- [ ] Accepts props: { chart: string, title?: string }
- [ ] Initializes Mermaid with theme based on dark/light mode
- [ ] Renders diagram in <div className="mermaid">
- [ ] Error handling for invalid Mermaid syntax
- [ ] Responsive styling

### App.tsx Validation
- [ ] Imports all 8 main components (Hero through Footer)
- [ ] Renders components in correct order:
  1. Hero
  2. About
  3. Experience
  4. Patents (or ArchitectureShowcase if Phase 2)
  5. Skills
  6. Projects
  7. Contact
  8. Footer
- [ ] ThemeToggle component rendered (fixed position)
- [ ] No default Vite boilerplate code
- [ ] Smooth scrolling implemented

### Styling & Design
- [ ] Dark mode is default on first load
- [ ] Light mode toggle works correctly
- [ ] Theme preference persists after page reload
- [ ] Both themes look professional:
  - [ ] Dark mode: proper contrast, readable text
  - [ ] Light mode: proper contrast, readable text
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Gradient text renders correctly on name (Hero)
- [ ] Google Fonts loaded: Inter and JetBrains Mono
- [ ] All interactive elements have hover states
- [ ] Focus states visible on all focusable elements

### Responsive Design
Test at these breakpoints:
- [ ] 375px (mobile - iPhone SE):
  - [ ] All content readable
  - [ ] No horizontal scroll
  - [ ] Buttons large enough to tap
  - [ ] Forms usable
- [ ] 768px (tablet - iPad):
  - [ ] Grid layouts adapt (2-column where specified)
  - [ ] Typography scales appropriately
- [ ] 1024px (laptop):
  - [ ] Full desktop layout
  - [ ] Proper spacing and whitespace
- [ ] 1440px+ (desktop):
  - [ ] Content centered (max-w-7xl)
  - [ ] No excessive whitespace

### Functionality
- [ ] npm run dev starts without errors
- [ ] npm run build completes successfully
- [ ] npx tsc --noEmit passes (no TypeScript errors)
- [ ] No console errors in browser
- [ ] Smooth scrolling works (Hero CTAs navigate to sections)
- [ ] Contact form validation works:
  - [ ] Empty fields show error states
  - [ ] Invalid email shows error
  - [ ] Submit disabled until form valid
- [ ] Theme toggle switches immediately
- [ ] All section IDs match navigation anchors

### Security - Frontend
- [ ] grep -r '@gmail.com' src/ returns nothing
- [ ] grep -r '@' src/ returns only imports and decorators (no email)
- [ ] grep -r 'mailto:' src/ returns nothing
- [ ] grep -r 'tel:' src/ returns nothing
- [ ] grep -r '+1-' src/ returns nothing (phone patterns)
- [ ] grep -r '309' src/ returns nothing (area code)
- [ ] No API keys or secrets in source code
- [ ] Honeypot field properly hidden (display: none)

---

## Phase 2 Validation (Backend & Infrastructure)

### Worker Setup
- [ ] worker/ directory exists at project root
- [ ] worker/package.json includes:
  - [ ] @cloudflare/workers-types
  - [ ] typescript
  - [ ] wrangler (devDependency)
- [ ] worker/tsconfig.json extends base and includes Workers types
- [ ] worker/wrangler.toml configured:
  - [ ] name: 'portfolio-contact-worker'
  - [ ] main: 'src/index.ts'
  - [ ] compatibility_date: '2024-01-01' or later
  - [ ] Environment bindings: TURNSTILE_SECRET_KEY, CONTACT_EMAIL
- [ ] worker/src/index.ts implements:
  - [ ] CORS headers (restricted to trystan-tbm.dev)
  - [ ] Rate limiting (Map-based, 3 per hour per IP)
  - [ ] Turnstile verification (calls Cloudflare API)
  - [ ] Honeypot check (rejects if 'website' field filled)
  - [ ] Time validation (rejects if < 3 seconds)
  - [ ] Email format validation (server-side)
  - [ ] MailChannels integration for sending email
  - [ ] Proper error handling (200, 400, 429, 500 codes)
  - [ ] TypeScript Env interface defined
- [ ] worker/.dev.vars.example exists (gitignored actual .dev.vars)
- [ ] worker/README.md has local dev + deployment instructions

### Worker Testing
- [ ] cd worker && npm run build succeeds
- [ ] worker/dist/index.js exists after build
- [ ] wrangler dev runs locally (test endpoint)
- [ ] Can submit test form locally and verify:
  - [ ] Valid submission returns 200
  - [ ] Invalid CAPTCHA returns 400
  - [ ] Honeypot filled returns 200 (fake success)
  - [ ] 4th submission within hour returns 429
  - [ ] Email received (if MailChannels configured)

### Terraform Setup
- [ ] terraform/ directory exists at project root
- [ ] terraform/main.tf includes:
  - [ ] Terraform version constraint (>= 1.0)
  - [ ] Cloudflare provider (~> 4.0)
  - [ ] cloudflare_pages_project resource
  - [ ] cloudflare_worker_script resource with secret bindings
  - [ ] cloudflare_worker_route resource (if custom domain)
  - [ ] cloudflare_record resource for DNS (if custom domain)
- [ ] terraform/variables.tf defines all variables:
  - [ ] cloudflare_api_token (sensitive, no default)
  - [ ] cloudflare_account_id
  - [ ] cloudflare_zone_id (if custom domain)
  - [ ] turnstile_site_key
  - [ ] turnstile_secret_key (sensitive, no default)
  - [ ] contact_email (sensitive, no default)
  - [ ] domain_name (default: 'trystan-tbm.dev')
- [ ] terraform/outputs.tf defines outputs:
  - [ ] pages_url
  - [ ] worker_url
  - [ ] turnstile_site_key (for reference)
- [ ] terraform/.gitignore excludes:
  - [ ] .terraform/
  - [ ] *.tfstate
  - [ ] *.tfstate.*
  - [ ] *.tfvars
  - [ ] .terraform.lock.hcl
- [ ] terraform/terraform.tfvars.example exists (template)
- [ ] terraform/README.md has deployment guide

### Terraform Validation
- [ ] cd terraform && terraform init succeeds
- [ ] terraform validate passes
- [ ] terraform plan runs without errors (after filling terraform.tfvars)
- [ ] Plan shows expected resources:
  - [ ] cloudflare_pages_project
  - [ ] cloudflare_worker_script
  - [ ] cloudflare_worker_route (if custom domain)
  - [ ] cloudflare_record (if custom domain)

### Mermaid.js Integration
- [ ] mermaid installed in package.json
- [ ] ArchitectureDiagram component created
- [ ] Component initializes Mermaid with correct theme (dark/light)
- [ ] At least one diagram added to Experience or separate section
- [ ] Diagrams render correctly in both themes
- [ ] Diagrams are responsive (max-width, center-aligned)

### CI/CD
- [ ] .github/workflows/ci.yml exists with jobs:
  - [ ] lint-and-typecheck (TypeScript validation)
  - [ ] build-test (npm run build)
  - [ ] build-worker (worker build)
- [ ] .github/dependabot.yml exists with ecosystems:
  - [ ] npm (root)
  - [ ] npm (worker)
  - [ ] terraform
  - [ ] github-actions
- [ ] GitHub Actions workflows pass on push/PR

### Lefthook
- [ ] lefthook installed (package.json devDependency)
- [ ] lefthook.yml configured in project root
- [ ] Pre-commit hooks include:
  - [ ] TypeScript type check
  - [ ] Lint (if ESLint configured)
  - [ ] Secrets detection (API keys, emails)
- [ ] Commit-msg hook validates message length
- [ ] .lefthook/ in .gitignore
- [ ] .lefthook-local.yml.example exists
- [ ] npx lefthook install completes successfully
- [ ] Test: Staging file with 'test@example.com' blocks commit

---

## Environment Variables & Secrets

### Root .env (Frontend - gitignored)
- [ ] .env.example exists with:
  - [ ] VITE_TURNSTILE_SITE_KEY
  - [ ] CLOUDFLARE_API_TOKEN (for deployment)
  - [ ] CLOUDFLARE_ACCOUNT_ID
- [ ] Actual .env in .gitignore
- [ ] No secrets committed to git

### Worker .dev.vars (gitignored)
- [ ] worker/.dev.vars.example exists
- [ ] Contains placeholders for:
  - [ ] TURNSTILE_SECRET_KEY
- [ ] Actual .dev.vars in .gitignore

### Terraform terraform.tfvars (gitignored)
- [ ] terraform/terraform.tfvars.example exists
- [ ] Contains all required variables
- [ ] Actual terraform.tfvars in .gitignore
- [ ] No secrets in .tf files (only variable references)

---

## Documentation Validation

### README.md (root)
- [ ] Exists and is comprehensive
- [ ] Sections include:
  - [ ] Project overview
  - [ ] Features
  - [ ] Tech stack
  - [ ] Architecture
  - [ ] Local development
  - [ ] Worker development
  - [ ] Deployment
  - [ ] Environment variables
  - [ ] Project structure
  - [ ] Security
  - [ ] Contact
- [ ] Clear, professional formatting
- [ ] Code blocks for commands
- [ ] Links to live site (when deployed)

### SECURITY.md
- [ ] Exists and documents security measures
- [ ] Lists all security features:
  - [ ] No PII in code
  - [ ] Multi-layer spam protection
  - [ ] Turnstile CAPTCHA
  - [ ] Rate limiting
  - [ ] Honeypot
  - [ ] Time validation
  - [ ] Secrets management
- [ ] Security checklist for deployment
- [ ] Reporting security issues instructions

### ACCESSIBILITY.md (if created in Phase 2)
- [ ] Documents WCAG compliance
- [ ] Testing procedures
- [ ] Keyboard navigation notes
- [ ] Screen reader compatibility

### Component Documentation (.claude/context.md)
- [ ] Exists in .claude/ directory
- [ ] Contains full project specifications
- [ ] Up to date with Phase 1 and Phase 2 changes
- [ ] Referenced by .cursorrules (if using Cursor)

---

## Security Audit

### Source Code Security
Run these commands to verify no secrets leaked:
```bash
# No email addresses in source
grep -r --exclude-dir=node_modules --exclude-dir=.git '@' . | grep -v 'import\|export\|@param\|@returns\|@type'
# Should return nothing or only legitimate @ usage

# No phone numbers
grep -r --exclude-dir=node_modules --exclude-dir=.git '\+1-\|([0-9]\{3\})\|309-350' .
# Should return nothing

# No API keys (common patterns)
grep -r --exclude-dir=node_modules --exclude-dir=.git 'AKIA\|AIza\|sk_live_\|sk_test_' .
# Should return nothing

# No hardcoded secrets
grep -r --exclude-dir=node_modules --exclude-dir=.git 'api_key\|apiKey\|secret_key\|secretKey' src/
# Should only return type definitions, not actual values
```

- [ ] All grep commands above return no security violations
- [ ] .gitignore properly excludes:
  - [ ] .env (root)
  - [ ] worker/.dev.vars
  - [ ] terraform/*.tfvars
  - [ ] node_modules/
  - [ ] dist/
  - [ ] .terraform/

### Git History Security
- [ ] No commits with secrets (check git log for .env, terraform.tfvars)
- [ ] If secrets found in history, repository must be nuked and recreated
- [ ] Consider using git-secrets or similar tool

---

## Performance & Quality

### Bundle Analysis
```bash
npm run build
ls -lh dist/
```
- [ ] Total dist/ size < 500KB
- [ ] Largest chunk < 200KB
- [ ] CSS properly tree-shaken (Tailwind purge working)

### Lighthouse Audit (run in Incognito)
- [ ] Performance: 90+ score
- [ ] Accessibility: 95+ score
- [ ] Best Practices: 95+ score
- [ ] SEO: 90+ score

### Accessibility Testing
- [ ] Tab through entire page (keyboard navigation)
- [ ] Focus indicators visible on all interactive elements
- [ ] Screen reader test (NVDA, JAWS, or VoiceOver)
- [ ] Color contrast check (Chrome DevTools)
- [ ] All images have alt text (if any added)
- [ ] Form labels properly associated
- [ ] ARIA labels on icon-only buttons

### Cross-Browser Testing
- [ ] Chrome (desktop): All features work
- [ ] Firefox (desktop): All features work
- [ ] Safari (desktop): All features work
- [ ] Edge (desktop): All features work
- [ ] Chrome (Android mobile): Responsive, touch-friendly
- [ ] Safari (iOS mobile): Responsive, touch-friendly

### Load Time Testing
- [ ] Fast 3G (DevTools throttling): < 3 seconds
- [ ] Regular 4G: < 2 seconds
- [ ] Desktop: < 1 second
- [ ] No layout shift (CLS score < 0.1)
- [ ] Fonts load properly (FOUT/FOIT handled)

---

## Pre-Deployment Final Checks

### Content Review
- [ ] All placeholder content reviewed
- [ ] Typos fixed
- [ ] USPTO patent links added (if available)
- [ ] Resume PDF sanitized and uploaded (if ready)
- [ ] GitHub repo links updated (if made public)
- [ ] LinkedIn link verified: https://www.linkedin.com/in/trystan-m/

### Frontend Final Checks
- [ ] npm install completes without errors
- [ ] npm run dev starts successfully
- [ ] npm run build completes successfully
- [ ] npm run preview shows production build correctly
- [ ] npx tsc --noEmit passes (zero TypeScript errors)
- [ ] No console warnings or errors in browser
- [ ] No React errors or warnings

### Worker Final Checks
- [ ] cd worker && npm install completes
- [ ] cd worker && npm run build succeeds
- [ ] worker/dist/index.js exists and is valid
- [ ] wrangler dev runs locally
- [ ] Test contact form submission locally

### Terraform Final Checks
- [ ] terraform.tfvars created with real values (gitignored)
- [ ] cd terraform && terraform init succeeds
- [ ] terraform validate passes
- [ ] terraform plan shows expected resources (review carefully)
- [ ] Ready to run: terraform apply

---

## Deployment Execution

### 1. Deploy Infrastructure (Terraform)
```bash
cd terraform
terraform apply
# Review plan carefully
# Type 'yes' to confirm
```
- [ ] Terraform apply completes successfully
- [ ] Outputs show correct URLs
- [ ] Cloudflare dashboard shows:
  - [ ] Pages project created
  - [ ] Worker deployed
  - [ ] DNS records configured (if custom domain)

### 2. Deploy Frontend (Git Push)
```bash
git add .
git commit -m "feat: initial portfolio deployment"
git push origin main
```
- [ ] Push succeeds
- [ ] Cloudflare Pages auto-deploys
- [ ] Deployment succeeds (check Cloudflare dashboard)
- [ ] Build logs show no errors

### 3. Verify Live Deployment
- [ ] Visit: https://trystan-tbm.dev (or *.pages.dev subdomain)
- [ ] Homepage loads correctly
- [ ] All sections render
- [ ] Smooth scrolling works
- [ ] Theme toggle works
- [ ] Contact form submission works end-to-end:
  - [ ] Fill out form
  - [ ] Complete Turnstile CAPTCHA
  - [ ] Submit successfully
  - [ ] Receive email confirmation
- [ ] Test rate limiting (submit 4 times rapidly):
  - [ ] 4th submission returns 429 error
- [ ] Mobile responsive (test on actual device)
- [ ] Fast load time (< 2 seconds)

---

## Post-Deployment

### Monitoring Setup
- [ ] Check Cloudflare Analytics (free tier)
- [ ] Monitor Worker invocations
- [ ] Set up alerts for:
  - [ ] High Worker error rate
  - [ ] Unusual traffic spikes
  - [ ] Failed deployments

### Sharing & Promotion
- [ ] Add live site to resume
- [ ] Update LinkedIn profile (add website link)
- [ ] Share on LinkedIn (optional)
- [ ] Add to GitHub profile README
- [ ] Update job application materials

### Ongoing Maintenance
- [ ] Monitor Dependabot PRs weekly
- [ ] Review and merge security updates promptly
- [ ] Test site after dependency updates
- [ ] Rotate Cloudflare API token periodically (every 90 days)

---

## Rollback Plan (If Issues Arise)

### Frontend Issues
```bash
# Revert last commit
git revert HEAD
git push origin main
# Cloudflare Pages auto-redeploys previous version
```

### Worker Issues
```bash
# Destroy and recreate Worker
cd terraform
terraform destroy -target=cloudflare_worker_script.contact_form
# Fix issue, rebuild worker
cd ../worker && npm run build
cd ../terraform
terraform apply
```

### Complete Rollback
```bash
cd terraform
terraform destroy
# Confirm with 'yes'
```

---

## Success Criteria Summary

The deployment is successful when ALL of these are true:

- [ ] Site loads in < 2 seconds on 4G
- [ ] All sections render correctly
- [ ] Dark/light mode both work perfectly
- [ ] Contact form works end-to-end (receive email)
- [ ] Rate limiting blocks after 3 submissions
- [ ] Turnstile CAPTCHA prevents bot submissions
- [ ] Mobile fully responsive (tested on device)
- [ ] Lighthouse score: 90+ on all metrics
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Keyboard navigation works
- [ ] WCAG AA accessibility compliance
- [ ] No secrets in git repository
- [ ] All documentation complete and accurate

---

## Phase 3 Planning (Optional Future Work)

Items to consider after successful Phase 2 deployment:

- [ ] Add actual project pages (as projects are built)
- [ ] Blog integration (Astro, Next.js, or MDX)
- [ ] Advanced animations (Framer Motion, scroll-triggered)
- [ ] Analytics (Cloudflare Web Analytics - privacy-focused)
- [ ] A/B testing for conversion optimization
- [ ] Email newsletter (Buttondown, ConvertKit)
- [ ] SEO optimization (structured data, meta tags)
- [ ] Social media preview cards (Open Graph tags)
- [ ] Performance monitoring (Sentry, LogRocket)
- [ ] Uptime monitoring (UptimeRobot, Better Uptime)

---

**Validation Complete:** If all checkboxes above are checked, the project is production-ready and matches all Phase 1 and Phase 2 specifications.
