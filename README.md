# Portfolio Website

[![CI](https://github.com/trystan-tbm/portfolio/workflows/CI/badge.svg)](https://github.com/trystan-tbm/portfolio/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://react.dev/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages%20%2B%20Workers-orange.svg)](https://www.cloudflare.com/)

> **Live Demo:** [trystan-tbm.dev](https://trystan-tbm.dev)

Personal portfolio website for **Trystan Bates-Maricle** - AI/ML Engineer | Full-Stack Developer | Cloud Infrastructure.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Architecture](#architecture)
- [Local Development](#local-development)
- [Worker Development](#worker-development)
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

This is a modern, production-ready portfolio website showcasing AI/ML engineering expertise, built with a focus on security, performance, and maintainability.

### Tech Stack Summary

**Frontend:**
- **Vite 6.x** - Next-generation frontend tooling
- **React 18.3+** - UI library
- **TypeScript 5.6+** - Type-safe JavaScript
- **Tailwind CSS 3.4+** - Utility-first CSS framework

**Backend:**
- **Cloudflare Workers** - Serverless edge computing
- **Cloudflare Turnstile** - Privacy-first CAPTCHA
- **MailChannels** - Email delivery (free for Workers)

**Infrastructure:**
- **Cloudflare Pages** - Static site hosting
- **Terraform** - Infrastructure as Code
- **GitHub Actions** - CI/CD automation

---

## Features

### 🎨 Modern UI/UX
- **Dark/Light Mode Toggle** - Persistent theme preference with smooth transitions
- **Fully Responsive** - Mobile-first design (375px → 1440px+)
- **Accessibility Compliant** - WCAG 2.1 AA standards (keyboard navigation, focus states, semantic HTML)
- **Gradient Design** - Blue (#3b82f6) + Purple (#8b5cf6) color scheme

### 🔒 Security-First
- **No Contact Info in Code** - Email/phone never exposed (contact form only)
- **Multi-Layer Spam Protection:**
  - Cloudflare Turnstile CAPTCHA
  - Honeypot field (hidden input trap)
  - Rate limiting (3 submissions/hour per IP)
  - Time validation (reject submissions < 3 seconds)
  - Server-side email format validation
- **Secrets Management** - All sensitive data via environment variables and Terraform

### ⚡ Performance
- **Serverless Architecture** - Edge computing with Cloudflare Workers
- **Static Site Generation** - Fast page loads with Vite
- **Optimized Builds** - Tree-shaking, code splitting, minification
- **Lazy Loading** - Mermaid.js diagrams loaded on-demand
- **Font Optimization** - Preconnect + font-display: swap for faster font loading
- **Code Splitting** - Automatic chunk splitting for optimal caching
- **Performance Budget** - Max bundle size: 500KB, max chunk: 200KB

### 🛠️ Developer Experience
- **TypeScript Strict Mode** - Type safety throughout
- **Infrastructure as Code** - Terraform for reproducible deployments
- **Automated CI/CD** - GitHub Actions for linting, type-checking, and deployment
- **Hot Module Replacement** - Instant feedback during development

---

## Architecture

The portfolio consists of three main components:

### 1. Frontend (React + Vite)
- Static site built with React and TypeScript
- Styled with Tailwind CSS
- Deployed to Cloudflare Pages
- Automatic deployments on push to `main` branch

### 2. Backend (Cloudflare Workers)
- Serverless contact form handler
- Validates Turnstile CAPTCHA tokens
- Implements rate limiting and spam protection
- Sends emails via MailChannels API

### 3. Infrastructure (Terraform)
- Manages Cloudflare Pages project
- Configures DNS records (root + www)
- Deploys Worker with secret bindings
- Sets up custom domain routing

**Architecture Diagrams:** View detailed architecture diagrams on the [live site](https://trystan-tbm.dev) (Phase 2 feature).

---

## Local Development

### Prerequisites

- **Node.js** 18+ or 20+ ([download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** (for cloning the repository)

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
   # Edit .env with your local configuration (if needed)
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
npm run dev:all      # Start both Vite and Worker dev servers in parallel
npm run build        # Build for production (outputs to dist/)
npm run preview      # Preview production build locally

# Code Quality
npm run lint         # Run ESLint
npx tsc --noEmit     # Type check without emitting files

# Worker (see Worker Development section)
npm run worker:dev      # Start Worker dev server
npm run worker:deploy   # Deploy Worker to Cloudflare
```

### Development Tips

- **Hot Module Replacement (HMR)** - Changes reflect instantly in browser
- **TypeScript Errors** - Check terminal for type errors during development
- **Tailwind Classes** - Use Tailwind utility classes (avoid custom CSS)
- **Component Structure** - One component per file, named exports preferred

---

## Worker Development

The contact form backend runs on Cloudflare Workers. Here's how to develop and test it locally:

### Setup

1. **Navigate to worker directory:**
   ```bash
   cd worker
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure local environment:**
   ```bash
   # Copy example file
   cp .dev.vars.example .dev.vars
   
   # Edit .dev.vars with your Turnstile secret key
   # Get key from: https://dash.cloudflare.com/?to=/:account/turnstile
   ```

4. **Start local Worker:**
   ```bash
   npm run dev
   # Or from project root:
   npm run worker:dev
   ```

   Worker will be available at `http://localhost:8787`

### Testing the Worker

```bash
# Test contact form endpoint
curl -X POST http://localhost:8787/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "message": "This is a test message",
    "turnstileToken": "test-token"
  }'
```

### Worker Scripts

```bash
# From worker/ directory
npm run dev        # Start local dev server
npm run deploy     # Deploy to Cloudflare
npm run typecheck  # Type check Worker code
```

### Production Secrets

For production, set secrets via Wrangler CLI:

```bash
cd worker
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put CONTACT_EMAIL
```

Or use Terraform (recommended) - see [Deployment](#deployment) section.

---

## Deployment

### Frontend Deployment (Cloudflare Pages)

**Automatic Deployment:**
- Push to `main` branch triggers automatic build and deployment
- Cloudflare Pages detects the push
- Runs `npm run build`
- Deploys to production
- Custom domain (`trystan-tbm.dev`) automatically configured

**Manual Deployment:**
```bash
# Build locally
npm run build

# Deploy via Wrangler (if configured)
wrangler pages deploy dist
```

### Worker Deployment

**Option 1: Via Terraform (Recommended)**
```bash
# Build Worker first
cd worker
npm run build
cd ..

# Deploy via Terraform
cd terraform
terraform apply
```

**Option 2: Via Wrangler CLI**
```bash
cd worker
npm run deploy
```

### Infrastructure Deployment

See detailed instructions in [`terraform/README.md`](./terraform/README.md).

**Quick Start:**
```bash
# 1. Configure Terraform variables
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your credentials

# 2. Build Worker
cd ../worker
npm install
npm run build
cd ../terraform

# 3. Initialize and apply
terraform init
terraform plan  # Review changes
terraform apply  # Deploy infrastructure
```

**What Terraform Creates:**
- Cloudflare Pages project
- Custom domain configuration
- DNS records (root + www)
- Worker script and route
- Secret bindings for Worker

---

## Environment Variables

### Frontend Environment Variables

Create `.env` in project root (optional for local development):

```bash
# Example .env (if needed)
VITE_TURNSTILE_SITE_KEY=your-site-key-here
```

**Note:** Turnstile site key can also be hardcoded in frontend (it's public).

### Worker Environment Variables

**Local Development** (`.dev.vars`):
```bash
TURNSTILE_SECRET_KEY=your-secret-key-here
CONTACT_EMAIL=your-email@example.com  # Optional for local dev
```

**Production** (set via Terraform or Wrangler):
- `TURNSTILE_SECRET_KEY` - Cloudflare Turnstile secret key
- `CONTACT_EMAIL` - Email to receive contact form submissions

### Terraform Variables

See [`terraform/variables.tf`](./terraform/variables.tf) for all variables.

**Required Variables** (in `terraform/terraform.tfvars`):
```hcl
cloudflare_api_token  = "your-api-token"
cloudflare_account_id = "your-account-id"
cloudflare_zone_id    = "your-zone-id"
turnstile_site_key    = "your-site-key"
turnstile_secret_key  = "your-secret-key"
contact_email         = "your-email@example.com"
github_repo_owner     = "trystan-tbm"
github_repo_name      = "portfolio"
```

### Where to Get Values

| Variable | Source |
|----------|--------|
| `cloudflare_api_token` | [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) → Create Token |
| `cloudflare_account_id` | Cloudflare Dashboard → Account dropdown → Right sidebar |
| `cloudflare_zone_id` | Cloudflare Dashboard → Your Domain → API section |
| `turnstile_site_key` | [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) → Add Site |
| `turnstile_secret_key` | Same as above (shown after creating site) |
| `contact_email` | Your email address (for receiving form submissions) |

**Security Note:** Never commit `.env`, `.dev.vars`, or `terraform.tfvars` to version control.

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
│   │   ├── Projects.tsx     # Project portfolio
│   │   ├── Contact.tsx      # Contact form
│   │   ├── Footer.tsx       # Site footer
│   │   └── ThemeToggle.tsx  # Dark/light mode
│   ├── App.tsx              # Main layout
│   ├── main.tsx             # React entry point
│   └── index.css            # Tailwind directives
│
├── worker/                  # Cloudflare Worker backend
│   ├── src/
│   │   └── index.ts         # Contact form handler
│   ├── package.json
│   ├── wrangler.toml        # Worker configuration
│   └── .dev.vars.example    # Local env template
│
├── terraform/               # Infrastructure as Code
│   ├── main.tf              # Main infrastructure
│   ├── variables.tf         # Variable definitions
│   ├── outputs.tf           # Deployment outputs
│   ├── terraform.tfvars.example  # Variables template
│   └── README.md            # Deployment guide
│
├── public/                  # Static assets
│   └── vite.svg             # Favicon placeholder
│
├── dist/                    # Production build output (gitignored)
├── node_modules/            # Dependencies (gitignored)
│
├── .claude/                 # Claude Code context
│   └── context.md           # Project documentation
│
├── package.json             # Frontend dependencies
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind configuration
├── tsconfig.json            # TypeScript configuration
├── postcss.config.js        # PostCSS configuration
├── eslint.config.js         # ESLint configuration
└── README.md                # This file
```

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

- **Mermaid.js Lazy Loading:** The `ArchitectureShowcase` component (which uses Mermaid.js) is lazy-loaded to reduce initial bundle size
- **React.lazy():** Architecture diagrams only load when the section is viewed
- **Manual Chunk Splitting:** Vite configured to split vendor chunks (React, Mermaid) for better caching

```tsx
// ArchitectureShowcase is lazy-loaded
const ArchitectureShowcase = lazy(() => 
  import('./components/ArchitectureShowcase').then(module => ({ 
    default: module.ArchitectureShowcase 
  }))
);
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

2. **Multi-Layer Spam Protection**
   - **Cloudflare Turnstile** - Privacy-first CAPTCHA (no tracking cookies)
   - **Honeypot Field** - Hidden input that bots fill (silent rejection)
   - **Rate Limiting** - 3 submissions per hour per IP address
   - **Time Validation** - Reject submissions completed in < 3 seconds
   - **Server-Side Validation** - Email format, message length, required fields

3. **Secrets Management**
   - All secrets stored as environment variables
   - Terraform manages Worker secrets via `secret_text_binding`
   - `.env`, `.dev.vars`, and `terraform.tfvars` are gitignored
   - API tokens use least-privilege permissions

4. **Dependency Security**
   - Dependabot configured for automatic dependency updates
   - Regular security audits via `npm audit`
   - Pinned dependency versions in `package-lock.json`

### Security Checklist

- ✅ No email/phone in codebase
- ✅ All secrets in environment variables
- ✅ `.gitignore` excludes sensitive files
- ✅ API tokens with minimal required permissions
- ✅ Worker secrets encrypted by Cloudflare
- ✅ Rate limiting prevents abuse
- ✅ Input validation on both client and server

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

**Built with ❤️ using Vite, React, TypeScript, Tailwind CSS, and Cloudflare Workers.**
