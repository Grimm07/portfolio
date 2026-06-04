# Portfolio Website

[![CI](https://github.com/trystan-tbm/portfolio/workflows/CI/badge.svg)](https://github.com/trystan-tbm/portfolio/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://react.dev/)
[![AWS](https://img.shields.io/badge/AWS-Lambda%20%2B%20S3%20%2B%20CloudFront-orange.svg)](https://aws.amazon.com/)

> **Live Demo:** [trystan-tbm.dev](https://trystan-tbm.dev)

Personal portfolio website for **Trystan Bates-Maricle** - AI/ML Engineer | Full-Stack Developer | Cloud Infrastructure.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Architecture](#architecture)
- [Local Development](#local-development)
- [Contact Backend (separate repo)](#contact-backend-separate-repo)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Performance](#performance)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## Project Overview

This is a modern, production-ready portfolio website showcasing AI/ML engineering expertise, built with a focus on security, performance, and maintainability. It runs entirely on AWS (region `us-east-1`).

### Tech Stack Summary

**Frontend:**
- **Vite 6.x** - Next-generation frontend tooling
- **React 18.3+** - UI library
- **TypeScript 5.6+** - Type-safe JavaScript
- **Tailwind CSS 3.4+** - Utility-first CSS framework
- **Amazon S3 + CloudFront** - Static hosting and CDN (Origin Access Control)

**Backend:**
- **AWS Lambda** (`portfolio-contact-ingest`) - Serverless contact form handler (TypeScript, ESM)
- **Lambda Function URL** (`AWS_IAM` auth, fronted by CloudFront OAC)
- **Amazon SES** - Transactional email delivery
- **AWS Secrets Manager** - Stores the contact recipient address (read at runtime)
- **AWS WAF** - CAPTCHA + rate limiting at the CloudFront edge

**Infrastructure:**
- **OpenTofu** (`tofu` CLI) - Infrastructure as Code, AWS-only, per-env S3 state
- **GitHub Actions** (OIDC) - CI/CD automation, no long-lived AWS keys

> The S3 bucket, CloudFront distribution, and AWS WAF that serve the site are **owned by a separate
> infrastructure repository** (the "shadowspire" AWS landing zone). This repository does not create
> them; it syncs the build to the infra-owned bucket and invalidates the infra-owned distribution.

---

## Features

### 🎨 Modern UI/UX
- **Dark/Light Mode Toggle** - Persistent theme preference with smooth transitions
- **Fully Responsive** - Mobile-first design (375px → 1440px+)
- **Accessibility Compliant** - WCAG 2.1 AA standards (keyboard navigation, focus states, semantic HTML)
- **Gradient Design** - Blue (#3b82f6) + Purple (#8b5cf6) color scheme

### 🔒 Security-First
- **No Contact Info in Code** - Email/phone never exposed (contact form only)
- **Multi-Layer Spam Protection (defense in depth):**
  - AWS WAF CAPTCHA + rate limiting at the CloudFront edge (before requests reach the Lambda)
  - Honeypot field (hidden `website` input trap)
  - Time-trap (reject submissions faster than a minimum form-fill time)
  - Server-side field validation (email, name, message)
- **Secrets Management** - Recipient address lives in AWS Secrets Manager; all config via env vars and OpenTofu

### ⚡ Performance
- **Serverless Architecture** - On-demand Lambda for the contact backend
- **Static Site Generation** - Fast page loads with Vite, served from CloudFront
- **Optimized Builds** - Tree-shaking, code splitting, minification
- **Lazy Loading** - Mermaid.js diagrams loaded on-demand
- **Font Optimization** - Preconnect + font-display: swap for faster font loading
- **Code Splitting** - Automatic chunk splitting for optimal caching
- **Performance Budget** - Max bundle size: 500KB, max chunk: 200KB

### 🛠️ Developer Experience
- **TypeScript Strict Mode** - Type safety throughout
- **Infrastructure as Code** - OpenTofu for reproducible deployments
- **Automated CI/CD** - GitHub Actions for linting, type-checking, and deployment
- **Hot Module Replacement** - Instant feedback during development

---

## Architecture

The portfolio is a three-tier, AWS-only application:

### 1. Frontend (React + Vite → S3 + CloudFront)
- Static site built with React and TypeScript, styled with Tailwind CSS
- Built to static assets and synced to an S3 bucket
- Served via Amazon CloudFront using Origin Access Control (OAC)
- The S3 bucket, CloudFront distribution, and AWS WAF are owned by the separate infrastructure
  repository; this repo only uploads the build and invalidates the distribution
- Hosts: prod `trystan-tbm.dev` + `www.trystan-tbm.dev`, dev `dev.trystan-tbm.dev`

### 2. Contact Backend + Infrastructure (separate repo)
- The `portfolio-contact-ingest` Lambda and its OpenTofu live in
  **[`portfolio-backend`](https://github.com/Grimm07/portfolio-backend)** (`../portfolio-backend`),
  not this repo
- The contact form posts same-origin to an infra-owned API Gateway that invokes that Lambda; the
  handler validates (honeypot → time-trap → fields) and sends one Amazon SES email
- The recipient address is read at runtime from AWS Secrets Manager and is never hardcoded
- The `portfolio-backend` repo owns the SES domain/DKIM, the contact-email secret, the SSM
  handshake, the API Gateway invoke grant, and the per-env OpenTofu state

**Architecture Diagrams:** View detailed architecture diagrams on the [live site](https://trystan-tbm.dev).

---

## Local Development

### Prerequisites

- **Node.js** 18+ or 20+ ([download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** (for cloning the repository)
- **OpenTofu** (`tofu`) - only needed for infrastructure work

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/trystan-tbm/portfolio.git
   cd portfolio
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment setup:**
   ```bash
   # Copy example environment file (if .env.example exists)
   cp .env.example .env
   # Edit .env with your local configuration (see Environment Variables)
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

   The site will be available at `http://localhost:5173` (or the port shown in terminal).

### Available Scripts

```bash
# Development
npm run dev          # Start Vite dev server with HMR
npm run build        # Build for production (tsc + vite build, outputs to dist/)
npm run preview      # Preview production build locally

# Code Quality
npm run lint         # Run ESLint
npx tsc --noEmit     # Type check without emitting files
```

### Development Tips

- **Hot Module Replacement (HMR)** - Changes reflect instantly in browser
- **TypeScript Errors** - Check terminal for type errors during development
- **Tailwind Classes** - Use Tailwind utility classes (avoid custom CSS)
- **Component Structure** - One component per file, named exports preferred

---

## Contact Backend (separate repo)

The contact form is handled by the `portfolio-contact-ingest` Lambda, which — along with its
OpenTofu infrastructure (IAM, SES/DKIM, the contact-email secret, the SSM handshake, and the API
Gateway invoke grant) — now lives in its own repo: **[`portfolio-backend`](https://github.com/Grimm07/portfolio-backend)**
(`../portfolio-backend` locally).

This repo (the frontend) only knows the API path it posts to and the WAF integration URL it embeds
at build time. To work on the handler, validation, SES email, or the Terraform, switch to the
`portfolio-backend` repo — it has its own commands, tests, runbook, and CI/CD.

> CAPTCHA and rate limiting are enforced by AWS WAF at the CloudFront edge, before any request
> reaches the Lambda.

---

## Deployment

Deployment runs through **GitHub Actions with OIDC** — there are no long-lived AWS keys.
`.github/workflows/deploy.yml` defines a **dev** job and a **prod** job; the GitHub Environments
`dev` and `production` gate the OIDC subjects.

Each job (frontend only — the Lambda + Terraform deploy is owned by the `portfolio-backend` repo):

1. Reads the WAF integration URL/key from SSM (`/portfolio/<env>/waf-*`)
2. Builds the frontend (`npm run build`)
3. Syncs the static assets to the infra-owned S3 bucket
4. Invalidates the infra-owned CloudFront distribution

---

## Environment Variables

### Frontend (`.env`, build-time)

Vite embeds `VITE_*` variables statically at build time. Both values below are client-side and are
published by the infrastructure repo to SSM (`/portfolio/<env>/waf-integration-url` and
`/portfolio/<env>/waf-api-key`):

```bash
VITE_WAF_INTEGRATION_URL=https://<waf-integration-host>/...
VITE_WAF_API_KEY=<waf-api-key>
```

### Backend (Lambda + OpenTofu)

The Lambda env vars (`FROM_EMAIL`, `CONTACT_EMAIL_SECRET_ARN`) and the Terraform variables
(`terraform.tfvars`) are documented in the **[`portfolio-backend`](https://github.com/Grimm07/portfolio-backend)**
repo. The recipient address lives only in AWS Secrets Manager and is read at runtime.

**Security Note:** Never commit `.env` to version control.

---

## Project Structure

```
portfolio/
├── src/
│   ├── components/          # React components
│   │   ├── Hero.tsx         # Landing section
│   │   ├── About.tsx        # Professional background
│   │   ├── Experience.tsx   # Work highlights
│   │   ├── Patents.tsx      # Innovation showcase
│   │   ├── Skills.tsx       # Technical skills matrix
│   │   ├── Projects.tsx     # Project portfolio (renders inline ArchitectureDiagram)
│   │   ├── Contact.tsx      # Contact form (inline AWS WAF CAPTCHA widget)
│   │   ├── Footer.tsx       # Site footer
│   │   └── ThemeToggle.tsx  # Dark/light mode
│   ├── App.tsx              # Main layout
│   ├── main.tsx             # React entry point
│   └── index.css            # Tailwind directives
│
├── public/                  # Static assets
│
├── dist/                    # Production build output (gitignored)
├── node_modules/            # Dependencies (gitignored)
│
├── package.json             # Frontend dependencies
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind configuration
├── tsconfig.json            # TypeScript configuration
├── postcss.config.js        # PostCSS configuration
├── eslint.config.js         # ESLint configuration
├── lefthook.yml             # Pre-commit hooks
└── README.md                # This file
```

> The contact Lambda (`backend/`) and infrastructure (`terraform/`) used to live here; they now
> live in the sibling **[`portfolio-backend`](https://github.com/Grimm07/portfolio-backend)** repo.

---

## Performance

This portfolio is optimized for fast loading, excellent Lighthouse scores, and optimal user experience.

### Performance Budget

The project maintains strict performance budgets defined in `package.json`:

```json
{
  "performance": {
    "maxBundleSize": "500kb",
    "maxChunkSize": "200kb"
  }
}
```

### Bundle Size Analysis

After building (`npm run build`), check the `dist/` folder:

```bash
npm run build
# Check dist/ folder size
du -sh dist/
```

**Target:** Total bundle size should be < 500KB (gzipped typically < 150KB).

### Lighthouse Audit Targets

Run Lighthouse audits (Chrome DevTools → Lighthouse) with these targets:

- **Performance:** 90+ (target: 95+)
- **Accessibility:** 95+ (target: 100)
- **Best Practices:** 95+ (target: 100)
- **SEO:** 90+ (target: 95+)

### Optimizations Implemented

#### 1. Code Splitting & Lazy Loading

- **Mermaid.js Lazy Loading:** Architecture diagrams use Mermaid.js, which is lazy-loaded so it
  is only pulled in when a diagram is actually rendered, keeping the initial bundle small
- **React.lazy():** Heavy, view-specific components load on demand
- **Manual Chunk Splitting:** Vite is configured to split vendor chunks (React, Mermaid) for better caching

```tsx
// Mermaid is dynamically imported only when a diagram renders
const mermaid = (await import('mermaid')).default;
```

#### 2. Font Optimization

- **Preconnect:** Google Fonts preconnected in `<head>` for faster DNS resolution
- **font-display: swap:** Fonts use `display=swap` to prevent invisible text during font load
- **Font Subset:** Only required font weights loaded (400, 500, 600, 700)

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
```

#### 3. Vite Build Optimizations

**Configured in `vite.config.ts`:**

- **Minification:** ESBuild minification enabled (default, verified)
- **Tree-shaking:** Automatic for ESM modules
- **CSS Code Splitting:** Enabled for optimal CSS loading
- **Chunk Strategy:** Manual chunks for React vendor and Mermaid
- **Modern Targets:** `esnext` target for smaller bundle size
- **Source Maps:** Disabled in production for smaller builds

```typescript
build: {
  minify: 'esbuild',
  sourcemap: false,
  chunkSizeWarningLimit: 500,
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom'],
        'mermaid': ['mermaid'],
      },
    },
  },
  target: 'esnext',
  cssCodeSplit: true,
}
```

#### 4. SEO & Meta Tags

- **Complete Meta Tags:** Title, description, keywords, author
- **Open Graph Tags:** For rich link previews on social media
- **Twitter Cards:** Optimized Twitter sharing
- **Theme Color:** Dark/light theme color for browser UI
- **Semantic HTML:** Proper use of `<section>`, `<article>`, `<nav>`, `<main>`

#### 5. CSS Optimization

- **Tailwind Purge:** Configured to remove unused CSS in production
- **CSS Code Splitting:** Separate CSS chunks for optimal loading
- **Minimal Custom CSS:** Tailwind-first approach reduces CSS bundle size

#### 6. Image Optimization (Future)

When images are added:
- Use WebP format with fallbacks
- Implement lazy loading with `loading="lazy"`
- Use responsive images with `srcset`
- Optimize with tools like `sharp` or `imagemin`

### Performance Monitoring

#### Build Analysis

```bash
# Build and analyze bundle
npm run build

# Check individual file sizes
ls -lh dist/assets/
```

#### Lighthouse CI (Recommended)

Add to CI/CD pipeline:

```yaml
# .github/workflows/lighthouse.yml
- name: Run Lighthouse CI
  run: |
    npm install -g @lhci/cli
    lhci autorun
```

#### Bundle Analyzer (Optional)

For detailed bundle analysis:

```bash
npm install --save-dev rollup-plugin-visualizer
```

Then add to `vite.config.ts`:

```typescript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: true, filename: 'dist/stats.html' })
  ],
});
```

### Performance Best Practices

1. **Keep Dependencies Minimal:** Only include what's needed
2. **Monitor Bundle Size:** Check after adding new dependencies
3. **Use Lazy Loading:** For heavy components (Mermaid, charts, etc.)
4. **Optimize Fonts:** Preconnect, subset, use font-display: swap
5. **Minimize CSS:** Tailwind purge removes unused styles
6. **Code Splitting:** Split vendor code for better caching
7. **Modern Targets:** Target modern browsers for smaller bundles

### Performance Checklist

Before deploying, verify:

- ✅ Bundle size < 500KB total
- ✅ Largest chunk < 200KB
- ✅ Lighthouse Performance score 90+
- ✅ Lighthouse Accessibility score 95+
- ✅ Lighthouse Best Practices score 95+
- ✅ Lighthouse SEO score 90+
- ✅ No unused dependencies
- ✅ Fonts preconnected
- ✅ Heavy components lazy-loaded
- ✅ CSS purged (Tailwind)
- ✅ Source maps disabled in production

---

## Security

### Security Principles

1. **No Contact Info in Code**
   - Email addresses and phone numbers are never included in the codebase
   - Contact form is the only way to reach out
   - LinkedIn/GitHub links are safe (they have their own spam protection)

2. **Multi-Layer Spam Protection (defense in depth)**
   - **AWS WAF (edge)** - CAPTCHA + rate limiting at the CloudFront edge, before requests reach
     the Lambda. The frontend renders an inline AWS WAF CAPTCHA widget via the WAF integration script.
   - **Honeypot Field** - Hidden `website` input that bots fill (silent rejection)
   - **Time-Trap** - Reject submissions completed faster than the minimum form-fill time
   - **Server-Side Validation** - Email format, message length, required fields
   - **Amazon SES** - Outbound email delivery with `Reply-To` set to the submitter

3. **Secrets Management**
   - The contact recipient address lives in **AWS Secrets Manager**, read at runtime by the Lambda
   - Frontend config (`VITE_*`) is build-time only; the Lambda uses `FROM_EMAIL` +
     `CONTACT_EMAIL_SECRET_ARN`
   - `.env` and `terraform.tfvars` are gitignored
   - IAM roles use least-privilege permissions (the ingest role can only send via SES and read its secret)

4. **Dependency Security**
   - Dependabot configured for automatic dependency updates
   - Regular security audits via `npm audit`
   - Pinned dependency versions in `package-lock.json`

### Security Checklist

- ✅ No email/phone in codebase
- ✅ Recipient address in AWS Secrets Manager
- ✅ `.gitignore` excludes sensitive files
- ✅ IAM roles with minimal required permissions
- ✅ AWS WAF CAPTCHA + rate limiting at the edge
- ✅ Input validation on both client and server
- ✅ No long-lived AWS keys (GitHub Actions OIDC)

---

## Contributing

This is a **personal portfolio website**. Contributions are not expected, but you're welcome to:

- **Use as a template** - Feel free to fork and adapt for your own portfolio
- **Report issues** - If you find bugs or have suggestions, open an issue
- **Reference the code** - Use the codebase as a reference for your own projects

### If You Want to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Ensure TypeScript compiles (`npx tsc --noEmit`)
5. Run linter (`npm run lint`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

**Note:** This is primarily a showcase project, so PRs may not be actively merged unless they align with the project's goals.

---

## License

© 2025 Trystan Bates-Maricle. All Rights Reserved.

This project is proprietary. You may use it as a reference or template for your own portfolio, but please:

- Do not copy the content (text, descriptions, etc.)
- Do not use the exact design without modification
- Do not claim this work as your own

If you use this as a template, please:
- Modify the design and content significantly
- Give credit if you directly reference specific implementations
- Respect the original work

---

## Contact

**Want to connect?**

- **Portfolio Website:** [trystan-tbm.dev](https://trystan-tbm.dev)
- **Contact Form:** [trystan-tbm.dev/#contact](https://trystan-tbm.dev/#contact)
- **LinkedIn:** [linkedin.com/in/trystan-m](https://www.linkedin.com/in/trystan-m)
- **GitHub:** [github.com/Grimm07](https://github.com/Grimm07)

**Note:** For security reasons, email addresses are not displayed publicly. Please use the contact form on the website or connect via LinkedIn.

---

**Built with ❤️ using Vite, React, TypeScript, Tailwind CSS, and AWS (Lambda, S3, CloudFront, SES).**
