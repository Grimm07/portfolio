# Portfolio Website - Complete Project Instructions

**Project:** Professional Portfolio for Trystan Bates-Maricle  
**Domain:** trystan-tbm.dev  
**Tech Stack:** Vite + React + TypeScript + Tailwind + Cloudflare Pages/Workers + Terraform  
**Security Model:** Zero PII exposure, contact form only, multi-layer spam protection

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Design Principles](#architecture--design-principles)
3. [Tech Stack Rationale](#tech-stack-rationale)
4. [Project Structure](#project-structure)
5. [Phase 1: MVP Frontend](#phase-1-mvp-frontend)
6. [Phase 2: Backend & Infrastructure](#phase-2-backend--infrastructure)
7. [Development Workflow](#development-workflow)
8. [Security Requirements](#security-requirements)
9. [Content Specifications](#content-specifications)
10. [Deployment Guide](#deployment-guide)
11. [Maintenance & Operations](#maintenance--operations)

---

## Project Overview

### Purpose
Build a production-ready portfolio website that showcases AI/ML engineering expertise while demonstrating modern full-stack development skills and security-conscious architecture.

### Target Audience
- Senior Software Engineer roles
- ML Engineer / AI Engineer positions
- Technical leadership opportunities

### Differentiation
- **Enterprise-scale AI implementation** (not toy projects)
- **3 patents** in AI/ML domain (innovation proof)
- **Full-stack + Infrastructure breadth** (rare combination)
- **Production security practices** (infrastructure as code, zero PII exposure)

### Success Metrics
- Lighthouse score: 90+ (all categories)
- Load time: < 2s on 4G
- Zero security vulnerabilities
- Fully responsive (mobile-first)
- WCAG AA accessibility compliance
- Contact form 99%+ spam-free

---

## Architecture & Design Principles

### 1. Security-First Design

**Critical Rules (Non-Negotiable):**
- ❌ NO email addresses anywhere (source code, HTML, images, PDFs)
- ❌ NO phone numbers anywhere (any format)
- ❌ NO API keys or secrets in code
- ✅ Contact form ONLY (with multi-layer spam protection)
- ✅ All secrets via environment variables/Terraform
- ✅ Resume PDF sanitized before upload

**Spam Protection Layers:**
1. Cloudflare Turnstile (privacy-focused CAPTCHA)
2. Honeypot field (hidden input bots fill)
3. Rate limiting (3 submissions/hour per IP)
4. Time validation (reject < 3 seconds)
5. Server-side email validation
6. CORS restrictions (domain whitelist)

### 2. Cost Optimization

**Total Monthly Cost: $0**

| Service | Cost | Limits |
|---------|------|--------|
| Cloudflare Pages | $0 | Unlimited bandwidth, unlimited requests |
| Cloudflare Workers | $0 | 100k requests/day |
| Cloudflare Turnstile | $0 | Unlimited verifications |
| Domain (trystan-tbm.dev) | ~$10/year | One-time annual |
| Terraform | $0 | Open source |
| GitHub | $0 | Public repos |

**Why Cloudflare over Vercel/Netlify:**
- Unlimited bandwidth (vs 100GB/month)
- Free Turnstile (vs paid hCaptcha)
- Better free tier for Workers
- Leverages existing technical expertise

### 3. Code Quality Standards

**TypeScript Strict Mode:**
- No `any` types without justification
- Explicit return types on functions
- Proper interface definitions for all props

**Component Architecture:**
- Functional components only
- Named exports (not default)
- Props interfaces always defined
- Co-locate component-specific logic

**Styling:**
- Tailwind-first (avoid custom CSS)
- Mobile-first responsive design
- Dark mode default, light mode toggle
- Consistent spacing/typography system

### 4. Accessibility (WCAG 2.1 AA)

**Requirements:**
- Semantic HTML (`<section>`, `<nav>`, `<main>`)
- Keyboard navigation (Tab, Enter, Escape)
- Focus indicators visible (not `outline: none` without replacement)
- Color contrast: 4.5:1 text, 3:1 large text
- ARIA labels on icon-only buttons
- Screen reader compatible
- Form labels properly associated

---

## Tech Stack Rationale

### Frontend

**Vite 6.x** (not Next.js/Webpack)
- ✅ You already know it well
- ✅ Fastest dev server (HMR ~50ms)
- ✅ Smaller bundles than webpack
- ✅ Zero config for TS/React
- ❌ No built-in SSR (but don't need it)

**React 18+ with TypeScript 5+**
- ✅ Industry standard
- ✅ Strong ecosystem
- ✅ Your existing expertise
- ✅ Type safety prevents bugs

**Tailwind CSS 3.4+** (not custom CSS)
- ✅ Rapid development
- ✅ Consistent design system
- ✅ Automatic purging (small bundle)
- ✅ Dark mode built-in

**TanStack Query** (optional for Phase 3)
- ✅ Your existing expertise
- Only needed if adding dynamic data fetching

### Backend

**Cloudflare Workers** (not Vercel Functions/Netlify Functions)
- ✅ 100k requests/day free (vs 125k Vercel)
- ✅ TypeScript-first
- ✅ Global edge network
- ✅ Integrated with Pages

**Cloudflare Turnstile** (not reCAPTCHA/hCaptcha)
- ✅ Free unlimited verifications
- ✅ Privacy-focused (no Google tracking)
- ✅ Better UX (invisible mode available)
- ✅ Native Cloudflare integration

### Infrastructure

**Terraform** (not manual configuration)
- ✅ Infrastructure as code
- ✅ Version controlled
- ✅ Repeatable deployments
- ✅ Demonstrates DevOps skills

**Cloudflare Pages** (not Vercel/Netlify)
- ✅ Unlimited bandwidth
- ✅ Auto-deploy from GitHub
- ✅ Free custom domain + SSL
- ✅ Fast global CDN

### Diagrams

**Mermaid.js** (not Excalidraw/Figma/D3)
- ✅ Text-based (version controlled)
- ✅ Renders in browser (no images)
- ✅ Works in GitHub README
- ✅ Auto-matches site theme
- ✅ Low maintenance

---

## Project Structure

```
portfolio/
├── src/                          # Frontend React app
│   ├── components/               # React components
│   │   ├── Hero.tsx              # Landing section
│   │   ├── About.tsx             # Professional background
│   │   ├── Experience.tsx        # Work highlights with metrics
│   │   ├── Patents.tsx           # Innovation showcase
│   │   ├── Skills.tsx            # Visual skill matrix
│   │   ├── Projects.tsx          # Project showcase ("Coming Soon" initially)
│   │   ├── Contact.tsx           # Secure contact form
│   │   ├── Footer.tsx            # Copyright, links
│   │   ├── ThemeToggle.tsx       # Dark/light mode
│   │   └── ArchitectureDiagram.tsx  # Mermaid.js wrapper
│   ├── App.tsx                   # Main layout
│   ├── main.tsx                  # React entry point
│   └── index.css                 # Tailwind + custom vars
│
├── worker/                       # Cloudflare Worker (contact form backend)
│   ├── src/
│   │   └── index.ts              # Worker logic
│   ├── package.json
│   ├── tsconfig.json
│   ├── wrangler.toml             # Worker config
│   └── README.md
│
├── terraform/                    # Infrastructure as Code
│   ├── main.tf                   # Cloudflare resources
│   ├── variables.tf              # Variable definitions
│   ├── outputs.tf                # Deployment outputs
│   ├── terraform.tfvars.example  # Template (actual tfvars gitignored)
│   └── README.md
│
├── .claude/                      # AI assistant context
│   └── context.md                # Full project specifications
│
├── .github/                      # CI/CD
│   ├── workflows/
│   │   └── ci.yml                # Type-check, lint, build
│   └── dependabot.yml            # Auto dependency updates
│
├── public/                       # Static assets
│   └── resume-public.pdf         # Sanitized resume (Phase 2)
│
├── .cursorrules                  # Cursor IDE context (condensed)
├── lefthook.yml                  # Git hooks (pre-commit validation)
├── .env.example                  # Environment variable template
├── .gitignore                    # Git exclusions
├── .claudeignore                 # Claude Code exclusions
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── postcss.config.js
├── README.md
├── SECURITY.md
├── ACCESSIBILITY.md
└── DEPLOYMENT_CHECKLIST.md
```

---

## Phase 1: MVP Frontend

### Objective
Build a fully functional, responsive, accessible portfolio UI with dark/light mode and all content sections. No backend yet—contact form is UI-only.

### Setup

**1. Initialize Vite Project**
```bash
npm create vite@latest portfolio -- --template react-ts
cd portfolio
npm install
```

**2. Install Dependencies**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**3. Configure Tailwind**

`tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3b82f6',
          dark: '#2563eb',
          light: '#60a5fa',
        },
        secondary: {
          DEFAULT: '#8b5cf6',
          dark: '#7c3aed',
          light: '#a78bfa',
        },
        success: {
          DEFAULT: '#10b981',
          dark: '#059669',
          light: '#34d399',
        },
        bg: {
          primary: '#0a0a0a',
          secondary: '#141414',
          tertiary: '#1f1f1f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
```

**4. Update index.css**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-bg-primary text-gray-100 font-sans antialiased;
  }
  
  html.dark {
    color-scheme: dark;
  }
}

@layer components {
  .btn-primary {
    @apply px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-all duration-300;
  }
  
  .btn-secondary {
    @apply px-6 py-3 border-2 border-primary text-primary rounded-lg font-semibold hover:bg-primary hover:text-white transition-all duration-300;
  }
}
```

**5. Create Context Files**

`.env.example`:
```bash
# Frontend (Vite)
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA

# Deployment (not used in frontend)
CLOUDFLARE_API_TOKEN=your-api-token
CLOUDFLARE_ACCOUNT_ID=your-account-id
```

`.gitignore` additions:
```
# Environment
.env
.env.*
!.env.example

# Terraform
terraform/.terraform/
terraform/*.tfstate
terraform/*.tfstate.*
terraform/*.tfvars
terraform/.terraform.lock.hcl

# Worker
worker/.dev.vars
worker/.wrangler/
worker/dist/

# Lefthook
.lefthook/
.lefthook-local.yml
```

`.claudeignore`:
```
node_modules/
.pnpm-store/
dist/
build/
.vite/
*.tsbuildinfo
.env
.env.*
!.env.example
terraform.tfvars
*.tfvars
!variables.tf
.terraform/
*.tfstate
*.tfstate.*
.terraform.lock.hcl
*.log
npm-debug.log*
logs/
.DS_Store
Thumbs.db
.vscode/
.idea/
*.swp
*.swo
coverage/
.nyc_output/
*.pdf
*.zip
*.tar.gz
```

### Components to Build

**Build Order (use Claude Code CLI):**

1. **Hero** - Name with gradient, title, tagline, CTAs
2. **About** - Background, education, focus areas
3. **Experience** - 5 work highlights with impact metrics
4. **Skills** - Visual matrix grouped by category
5. **Patents** - 3 patent cards (placeholders for USPTO links)
6. **Projects** - "Coming Soon" placeholders
7. **Contact** - Form UI with validation (no backend yet)
8. **Footer** - Copyright, tech stack, links
9. **ThemeToggle** - Dark/light mode switcher

**Content Specifications:**

See [Content Specifications](#content-specifications) section below for exact text.

### Validation Checklist

- [ ] `npm run dev` starts without errors
- [ ] All 9 components render correctly
- [ ] Dark mode is default
- [ ] Light mode toggle works
- [ ] Theme persists after reload (localStorage)
- [ ] Smooth scrolling between sections
- [ ] Contact form validation works (frontend only)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No console errors
- [ ] Responsive: 375px, 768px, 1024px
- [ ] Keyboard navigation works
- [ ] No email/phone anywhere in code

---

## Phase 2: Backend & Infrastructure

### Objective
Add production backend with Cloudflare Worker, Turnstile CAPTCHA, Terraform infrastructure, and Mermaid.js diagrams.

### 2A: Cloudflare Worker

**1. Setup Worker Project**
```bash
mkdir worker
cd worker
npm init -y
npm install -D @cloudflare/workers-types typescript wrangler
```

**2. Worker Configuration**

`worker/wrangler.toml`:
```toml
name = "portfolio-contact-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"
node_compat = true

[vars]
# Non-sensitive vars (for local dev)
CONTACT_EMAIL = "test@example.com"
```

`worker/tsconfig.json`:
```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "types": ["@cloudflare/workers-types"],
    "lib": ["ES2021"],
    "module": "ES2022",
    "target": "ES2021"
  },
  "include": ["src"]
}
```

**3. Worker Implementation**

`worker/src/index.ts`:
```typescript
interface Env {
  TURNSTILE_SECRET_KEY: string;
  CONTACT_EMAIL: string;
}

interface ContactFormData {
  name: string;
  email: string;
  message: string;
  turnstileToken: string;
  website?: string; // honeypot
  timestamp?: number;
}

// Rate limiting (in-memory Map)
const RATE_LIMIT = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 3;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': 'https://trystan-tbm.dev',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    
    // Rate limiting
    const now = Date.now();
    const requests = RATE_LIMIT.get(ip) || 0;
    const firstRequest = requests === 0 ? now : requests;
    
    if (now - firstRequest < RATE_LIMIT_WINDOW && requests >= MAX_REQUESTS) {
      return new Response('Rate limited', { status: 429 });
    }
    
    RATE_LIMIT.set(ip, requests + 1);

    try {
      const data: ContactFormData = await request.json();

      // Honeypot check
      if (data.website) {
        return new Response('Success', { status: 200 }); // Fake success
      }

      // Time validation
      if (data.timestamp && (now - data.timestamp) < 3000) {
        return new Response('Invalid request', { status: 400 });
      }

      // Verify Turnstile
      const turnstileValid = await verifyTurnstile(
        data.turnstileToken,
        env.TURNSTILE_SECRET_KEY,
        ip
      );

      if (!turnstileValid) {
        return new Response('Invalid CAPTCHA', { status: 400 });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        return new Response('Invalid email', { status: 400 });
      }

      // Send email via MailChannels
      await sendEmail(data, env.CONTACT_EMAIL);

      return new Response('Sent', { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': 'https://trystan-tbm.dev',
        },
      });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal error', { status: 500 });
    }
  },
};

async function verifyTurnstile(
  token: string,
  secret: string,
  ip: string
): Promise<boolean> {
  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        secret, 
        response: token, 
        remoteip: ip 
      }),
    }
  );
  
  const data: any = await response.json();
  return data.success === true;
}

async function sendEmail(data: ContactFormData, to: string): Promise<void> {
  await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: to }],
        },
      ],
      from: {
        email: 'noreply@trystan-tbm.dev',
        name: 'Portfolio Contact Form',
      },
      subject: `Contact Form: ${data.name}`,
      content: [
        {
          type: 'text/plain',
          value: `
Name: ${data.name}
Email: ${data.email}

Message:
${data.message}
          `.trim(),
        },
      ],
    }),
  });
}
```

**4. Add Turnstile to Frontend**

```bash
npm install @marsidev/react-turnstile
```

Update `Contact.tsx` to include Turnstile widget and submit to Worker.

### 2B: Terraform Infrastructure

**1. Setup Terraform**

```bash
mkdir terraform
cd terraform
```

**2. Terraform Files**

`terraform/main.tf`:
```hcl
terraform {
  required_version = ">= 1.0"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Cloudflare Pages Project
resource "cloudflare_pages_project" "portfolio" {
  account_id        = var.cloudflare_account_id
  name              = "trystan-portfolio"
  production_branch = "main"

  build_config {
    build_command   = "npm run build"
    destination_dir = "dist"
    root_dir        = "/"
  }

  deployment_configs {
    production {
      environment_variables = {
        VITE_TURNSTILE_SITE_KEY = var.turnstile_site_key
      }
    }
  }
}

# Cloudflare Worker
resource "cloudflare_worker_script" "contact_form" {
  account_id = var.cloudflare_account_id
  name       = "portfolio-contact-worker"
  content    = file("${path.module}/../worker/dist/index.js")

  secret_text_binding {
    name = "TURNSTILE_SECRET_KEY"
    text = var.turnstile_secret_key
  }

  secret_text_binding {
    name = "CONTACT_EMAIL"
    text = var.contact_email
  }
}

# Worker Route (connects Worker to domain)
resource "cloudflare_worker_route" "contact_api" {
  zone_id     = var.cloudflare_zone_id
  pattern     = "${var.domain_name}/api/*"
  script_name = cloudflare_worker_script.contact_form.name
}

# DNS Record (CNAME to Pages)
resource "cloudflare_record" "portfolio" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  type    = "CNAME"
  value   = cloudflare_pages_project.portfolio.subdomain
  proxied = true
  ttl     = 1
}
```

`terraform/variables.tf`:
```hcl
variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for trystan-tbm.dev"
  type        = string
}

variable "turnstile_site_key" {
  description = "Turnstile site key (public)"
  type        = string
}

variable "turnstile_secret_key" {
  description = "Turnstile secret key"
  type        = string
  sensitive   = true
}

variable "contact_email" {
  description = "Email address to forward contact form to"
  type        = string
  sensitive   = true
}

variable "domain_name" {
  description = "Custom domain"
  type        = string
  default     = "trystan-tbm.dev"
}
```

`terraform/outputs.tf`:
```hcl
output "pages_url" {
  description = "Cloudflare Pages URL"
  value       = "https://${cloudflare_pages_project.portfolio.subdomain}"
}

output "custom_domain_url" {
  description = "Custom domain URL"
  value       = "https://${var.domain_name}"
}

output "worker_route" {
  description = "Worker API route"
  value       = "${var.domain_name}/api/*"
}
```

`terraform/terraform.tfvars.example`:
```hcl
cloudflare_api_token  = "your-api-token-here"
cloudflare_account_id = "your-account-id-here"
cloudflare_zone_id    = "your-zone-id-here"
turnstile_site_key    = "1x00000000000000000000AA"
turnstile_secret_key  = "1x0000000000000000000000000000000AA"
contact_email         = "your-email@example.com"
domain_name           = "trystan-tbm.dev"
```

### 2C: Mermaid.js Diagrams

**1. Install Mermaid**
```bash
npm install mermaid
```

**2. Create Component**

`src/components/ArchitectureDiagram.tsx`:
```typescript
import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface ArchitectureDiagramProps {
  chart: string;
  title?: string;
  className?: string;
}

export function ArchitectureDiagram({ 
  chart, 
  title, 
  className = '' 
}: ArchitectureDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    
    mermaid.initialize({ 
      theme: isDark ? 'dark' : 'base',
      startOnLoad: true,
    });

    if (ref.current) {
      ref.current.innerHTML = chart;
      mermaid.contentLoaded();
    }
  }, [chart]);

  return (
    <div className={`bg-bg-tertiary rounded-xl p-6 ${className}`}>
      {title && (
        <h3 className="text-xl font-semibold mb-4 text-primary">{title}</h3>
      )}
      <div ref={ref} className="mermaid flex justify-center" />
    </div>
  );
}
```

**3. Add Diagrams to Experience**

Example in `Experience.tsx`:
```typescript
const nlpDiagram = `
graph LR
    A[User Call] --> B[IVR System]
    B --> C[Microsoft LUIS]
    C --> D{Intent Classification}
    D -->|Book| E[Reservation API]
    D -->|Modify| F[Update API]
    E --> G[Confirmation]
    F --> G
`;

// In component JSX:
<ArchitectureDiagram 
  chart={nlpDiagram} 
  title="NLP Voice Bot Architecture" 
/>
```

### 2D: CI/CD & Automation

**1. GitHub Actions**

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx tsc --noEmit
      
  build-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: ls -la dist/
      
  build-worker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: cd worker && npm ci
      - run: cd worker && npm run build
      - run: ls -la worker/dist/
```

**2. Dependabot**

`.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 10
    
  - package-ecosystem: "npm"
    directory: "/worker"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 5
    
  - package-ecosystem: "terraform"
    directory: "/terraform"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 3
    
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
```

**3. Lefthook**

```bash
npm install -D lefthook
```

`lefthook.yml`:
```yaml
pre-commit:
  parallel: true
  commands:
    typecheck:
      run: npx tsc --noEmit
      skip:
        - merge
        - rebase
      
    secrets-check:
      run: |
        if git diff --cached --name-only | xargs grep -nHE '(AKIA|AIza[0-9A-Za-z-_]{35}|sk_live_[0-9a-zA-Z]{24}|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})' 2>/dev/null; then
          echo "❌ Potential secrets or email addresses detected!"
          exit 1
        fi
      skip:
        - merge
        - rebase

commit-msg:
  commands:
    minimum-length:
      run: |
        message=$(cat {1})
        if [ ${#message} -lt 10 ]; then
          echo "❌ Commit message too short (min 10 chars)"
          exit 1
        fi
```

Initialize:
```bash
npx lefthook install
```

---

## Development Workflow

### Daily Development

```bash
# Start frontend dev server
npm run dev

# Start Worker dev server (separate terminal)
cd worker && wrangler dev

# Type check
npx tsc --noEmit

# Build for production
npm run build

# Preview production build
npm run preview
```

### Making Changes

**Frontend Changes:**
1. Make changes in `src/`
2. Test locally with `npm run dev`
3. Run type check: `npx tsc --noEmit`
4. Commit (Lefthook runs pre-commit checks)
5. Push to main → Cloudflare Pages auto-deploys

**Worker Changes:**
1. Make changes in `worker/src/index.ts`
2. Test locally: `cd worker && wrangler dev`
3. Build: `npm run build`
4. Deploy via Terraform: `cd terraform && terraform apply`

**Infrastructure Changes:**
1. Update `.tf` files
2. Run: `terraform plan` (review changes)
3. Apply: `terraform apply`

### Testing Checklist

Before every commit:
- [ ] `npm run dev` works
- [ ] `npx tsc --noEmit` passes
- [ ] No console errors
- [ ] Responsive at 375px, 768px, 1024px
- [ ] Dark/light mode both work
- [ ] Lefthook pre-commit passes

---

## Security Requirements

### Absolute Rules (Never Violate)

**Frontend:**
- ❌ NO email addresses (not even obfuscated)
- ❌ NO phone numbers (any format)
- ❌ NO `mailto:` or `tel:` links
- ❌ NO API keys or tokens in code
- ✅ Contact form only
- ✅ LinkedIn link only (has spam protection)

**Backend:**
- ❌ NO secrets in code
- ❌ NO secrets in git history
- ✅ All secrets via Terraform variables
- ✅ Environment variables only
- ✅ Rate limiting enforced
- ✅ CORS restricted to domain

**Infrastructure:**
- ❌ NO `terraform.tfvars` in git
- ❌ NO `.env` files in git
- ✅ `.example` files only
- ✅ Secrets in Terraform/Worker env vars

### Security Validation Commands

```bash
# Check for email addresses
grep -r --exclude-dir=node_modules '@' src/ | grep -v 'import\|export'

# Check for phone numbers
grep -r --exclude-dir=node_modules '+1-\|([0-9]\{3\})' src/

# Check for API keys
grep -r --exclude-dir=node_modules 'AKIA\|AIza\|sk_' src/

# All should return nothing (or only false positives)
```

### Spam Protection Validation

Test contact form:
1. Submit valid form → Should succeed
2. Fill honeypot field → Should fake succeed (200 but no email)
3. Submit < 3 seconds → Should fail (400)
4. Submit 4 times in 1 hour → 4th should fail (429)
5. Invalid Turnstile → Should fail (400)

---

## Content Specifications

### Hero Section

```
Name: Trystan Bates-Maricle
Title: AI/ML Engineer | Full-Stack Developer | Cloud Infrastructure
Tagline: Building intelligent systems that scale

CTAs:
- Primary: "View Experience" (scrolls to #experience)
- Secondary: "Let's Connect" (scrolls to #contact)
```

### About Section

```
Software Engineer at State Farm with 4+ years of experience architecting 
AI/ML systems for production environments. Specialized in NLP, Computer Vision, 
and LLM integration, with expertise spanning the full stack from model training 
to cloud deployment and infrastructure automation.

Currently focused on: Enterprise LLM applications, scalable cloud architecture, 
and bringing AI research into production systems.

Education: B.S. Computer Science, Illinois State University (May 2023)
```

### Experience Highlights (5 Cards)

**1. NLP Voice Bot Enhancement**
```
Description: Architected autonomous rental reservation system using Microsoft LUIS, 
enabling multi-turn dialog flows and complex intent handling

Impact: 25% call center load reduction

Tech Stack: Microsoft LUIS, NLP, Azure, API Integration
```

**2. Codebase Modernization**
```
Description: Led large-scale JavaScript to Kotlin migration, redesigning core UI 
architecture for improved maintainability and developer experience

Impact: 40% LOC reduction

Tech Stack: Kotlin, JavaScript, Architectural Design, Refactoring
```

**3. OCR Document Processing Evaluation**
```
Description: Conducted comprehensive evaluation of OCR services (AWS Textract, 
Azure Vision, Lazarus AI) for production deployment, comparing accuracy, cost, 
and latency

Impact: Multi-vendor cost/accuracy analysis enabling informed vendor selection

Tech Stack: AWS Textract, Azure Vision API, Python, Document Understanding
```

**4. Enterprise LLM Research**
```
Description: Led evaluation and selection of LLM tools for enterprise use cases, 
assessing GPT-3.5, GPT-4, and domain-specific models for production AI systems

Impact: Strategic tool selection for production AI implementation

Tech Stack: OpenAI GPT, LLMs, Prompt Engineering, AI Research
```

**5. Computer Vision Community Leadership**
```
Description: Organized and facilitated technical workshops on embeddings, 
transformers, CNNs, RNNs, and vector databases for 50+ engineers, fostering 
knowledge sharing across teams

Impact: Knowledge sharing & technical mentorship

Tech Stack: PyTorch, TensorFlow, Computer Vision, Teaching
```

### Patents Section

```
Heading: Patents & Innovation
Subheading: 3 patent applications filed in AI-centric customer support automation

Patent Cards (placeholders - update with USPTO links when available):
1. AI-Centric Customer Support Tool
   Status: Publication Pending
   Description: Intelligent support automation system leveraging NLP and ML

2. Automated Error Identification System
   Status: Publication Pending
   Description: ML-based error detection and classification framework

3. Intelligent Outcome Handling Method
   Status: Publication Pending
   Description: Adaptive outcome management using predictive modeling
```

### Skills Matrix (4 Categories)

**AI/ML:**
- PyTorch
- TensorFlow
- scikit-learn
- XGBoost
- spaCy
- NLTK
- Microsoft LUIS
- OpenCV (Computer Vision)
- OpenAI (GPT-3, GPT-4, DALL-E, Codex)

**Cloud & Infrastructure:**
- AWS: Lambda, EC2, S3, DynamoDB, ECS, Fargate, SQS, SNS, Textract, SageMaker
- Azure: EntraID, Cognitive Services, Vision API
- Terraform
- Docker
- GitLab CI/CD

**Languages:**
- Python (Primary)
- Kotlin (Primary)
- TypeScript / JavaScript (Primary)
- Go
- Java
- C++

**Tools & Frameworks:**
- React
- Vite
- Tailwind CSS
- Git
- Gradle
- Poetry
- Lazarus Rikai2
- IBM Mainframe

### Projects Section (Initial State)

```
Heading: Projects

Content:
Currently building new projects to showcase here. Check back soon!

In the meantime, view the source code for this portfolio on GitHub 
to see modern React, TypeScript, and Cloudflare Workers in action.

Placeholder Cards: 4 cards with "Coming Soon" label and reduced opacity

GitHub Link: https://github.com/[username]/portfolio (update when public)
```

### Contact Section

```
Heading: Let's Connect

Form Fields:
- Name (required, min 2 chars)
- Email (required, valid format)
- Message (required, min 10 chars)
- Website (honeypot, hidden)

Contact Links:
- LinkedIn: https://www.linkedin.com/in/trystan-m/
- GitHub: https://github.com/[username] (optional)

Note (Phase 1): "Contact form backend coming in Phase 2. For now, connect via LinkedIn."
```

### Footer

```
Copyright: © 2025 Trystan Bates-Maricle

Tech Stack: Built with Vite, React, TypeScript, and Cloudflare Workers

Links:
- GitHub Repository: https://github.com/[username]/portfolio
```

---

## Deployment Guide

### Prerequisites

1. **Cloudflare Account** (free tier)
   - Sign up: https://dash.cloudflare.com/sign-up

2. **Domain Registration**
   - Register `trystan-tbm.dev` via Cloudflare Registrar (~$10/year)
   - Alternative: Use `*.pages.dev` subdomain (free)

3. **Cloudflare Turnstile Setup**
   - Dashboard → Turnstile → Add Site
   - Domain: `trystan-tbm.dev`
   - Widget Mode: Managed (Visible)
   - Copy Site Key (public) and Secret Key (private)

4. **Cloudflare API Token**
   - Dashboard → My Profile → API Tokens → Create Token
   - Permissions:
      - Account: Cloudflare Pages (Edit)
      - Account: Workers Scripts (Edit)
      - Zone: DNS (Edit)
   - Copy token (shown once)

5. **Get Account & Zone IDs**
   - Account ID: Dashboard → Workers & Pages → right sidebar
   - Zone ID: Dashboard → [your domain] → right sidebar

6. **Tools Installed**
   - Node.js 18+ or 20+
   - Terraform 1.0+
   - Wrangler CLI: `npm install -g wrangler`

### Deployment Steps

**1. Setup Environment Variables**

Create `.env`:
```bash
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA  # Your actual site key
CLOUDFLARE_API_TOKEN=your-api-token
CLOUDFLARE_ACCOUNT_ID=your-account-id
```

Create `worker/.dev.vars`:
```bash
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA  # Your actual secret
```

Create `terraform/terraform.tfvars`:
```hcl
cloudflare_api_token  = "your-api-token"
cloudflare_account_id = "your-account-id"
cloudflare_zone_id    = "your-zone-id"
turnstile_site_key    = "1x00000000000000000000AA"
turnstile_secret_key  = "1x0000000000000000000000000000000AA"
contact_email         = "your-email@example.com"
domain_name           = "trystan-tbm.dev"
```

**2. Build Worker**
```bash
cd worker
npm install
npm run build
cd ..
```

Verify `worker/dist/index.js` exists.

**3. Deploy Infrastructure**
```bash
cd terraform
terraform init
terraform plan  # Review carefully
terraform apply # Type 'yes' to confirm
```

**4. Deploy Frontend**

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "feat: initial portfolio deployment"

# Create GitHub repo and push
git remote add origin https://github.com/[username]/portfolio.git
git branch -M main
git push -u origin main
```

Cloudflare Pages auto-deploys from `main` branch.

**5. Verify Deployment**

- Visit: https://trystan-tbm.dev
- Check all sections render
- Test contact form end-to-end:
   - Fill form
   - Complete Turnstile
   - Submit
   - Check email received
- Test rate limiting (4 submissions → 4th fails)
- Test on mobile device

### Rollback Procedures

**Frontend (revert bad deploy):**
```bash
git revert HEAD
git push origin main
# Cloudflare Pages auto-redeploys
```

**Worker (revert to previous version):**
```bash
cd terraform
terraform destroy -target=cloudflare_worker_script.contact_form
# Fix issue, rebuild
cd ../worker && npm run build
cd ../terraform && terraform apply
```

**Complete teardown:**
```bash
cd terraform
terraform destroy  # Type 'yes' to confirm
```

---

## Maintenance & Operations

### Weekly Tasks

**Monday: Review Dependabot PRs**
1. Check GitHub → Pull Requests
2. Review dependency updates
3. Merge if tests pass
4. Monitor deployment

**As Needed: Security Updates**
- Dependabot security alerts → merge immediately
- Test thoroughly after security updates

### Monthly Tasks

**First Monday:**
- Review Cloudflare Analytics
- Check Worker invocations (should be low unless traffic spike)
- Verify contact form still working (test submission)
- Check for broken links
- Review Lighthouse scores (should stay 90+)

### Quarterly Tasks

**Every 90 Days:**
- Rotate Cloudflare API token
- Update `terraform.tfvars` with new token
- Run `terraform apply`
- Review and update dependencies manually
- Security audit (run grep commands)

### Monitoring

**Cloudflare Dashboard:**
- Pages deployments: https://dash.cloudflare.com/[account]/pages
- Worker analytics: https://dash.cloudflare.com/[account]/workers
- Turnstile: https://dash.cloudflare.com/[account]/turnstile

**GitHub:**
- Actions: Monitor CI/CD workflows
- Dependabot: Weekly security/dependency PRs
- Issues: Track bugs or enhancements

### Backup Strategy

**What to backup:**
- Source code (GitHub - already backed up)
- `.env` file (store securely, not in git)
- `terraform.tfvars` (store securely, not in git)
- Resume PDF (local backup)

**NOT needed:**
- Cloudflare automatically backs up Workers/Pages
- Terraform state is managed by Cloudflare
- No database (stateless application)

### Cost Monitoring

**Expected: $0/month**

Check monthly:
- Cloudflare dashboard → Billing
- Worker invocations (should be < 100k/day)
- Pages builds (should be < 500/month)

If costs appear:
- Worker over 100k requests/day → contact form spam (rate limit issue)
- Pages over 500 builds → too many git pushes (use PRs)

---

## Future Enhancements (Phase 3+)

### When You Have Projects to Show

**Update Projects Component:**
1. Replace "Coming Soon" placeholders
2. Add project cards with:
   - Screenshot/demo
   - Description
   - Tech stack
   - GitHub link
   - Live demo link
   - Architecture diagram (Mermaid)
3. Create project detail pages (optional)

### Optional Additions

**Blog (if desired):**
- Option A: Astro (static site generator, excellent DX)
- Option B: Next.js (already React, but heavier)
- Option C: External (Medium, Dev.to, Hashnode)

**Analytics:**
- Cloudflare Web Analytics (free, privacy-focused)
- No Google Analytics (privacy concerns)

**Advanced Animations:**
- Framer Motion (smooth, performant)
- Scroll-triggered animations (intersection observer)
- Parallax effects (subtle only)

**Resume Builder:**
- Generate PDF from React components
- Always keep sanitized version public
- Full version for direct applications only

**A/B Testing:**
- Test different CTAs
- Test hero messaging
- Optimize for conversions (contact form submissions)

---

## Troubleshooting

### Common Issues

**Issue: `npm run dev` fails**
```bash
# Solution: Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Issue: TypeScript errors after update**
```bash
# Solution: Regenerate types
npx tsc --noEmit
# Fix errors one by one
```

**Issue: Tailwind classes not working**
```bash
# Solution: Check tailwind.config.js content paths
# Ensure: content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}']
```

**Issue: Worker deploy fails**
```bash
# Solution: Check Worker build
cd worker
npm run build
ls -la dist/  # Verify index.js exists

# Check wrangler.toml syntax
wrangler validate
```

**Issue: Terraform apply fails**
```bash
# Solution: Check variables
cd terraform
terraform validate
terraform plan  # Review error messages

# Common: Missing terraform.tfvars
cp terraform.tfvars.example terraform.tfvars
# Fill in actual values
```

**Issue: Contact form not working**
- Check Turnstile keys (site key vs secret key)
- Verify Worker route in Cloudflare dashboard
- Test Worker endpoint directly: `curl https://trystan-tbm.dev/api/contact`
- Check Worker logs in Cloudflare dashboard
- Verify MailChannels integration (check Worker console)

**Issue: Dark mode not persisting**
- Check localStorage in browser DevTools
- Verify ThemeToggle component saves to localStorage
- Clear browser cache and test again

**Issue: Rate limiting not working**
- Check Worker logs
- Verify IP detection: `request.headers.get('CF-Connecting-IP')`
- Test with different IPs (VPN or mobile)

---

## Support & Resources

### Documentation
- **Vite:** https://vitejs.dev
- **React:** https://react.dev
- **Tailwind CSS:** https://tailwindcss.com
- **Cloudflare Workers:** https://developers.cloudflare.com/workers
- **Cloudflare Pages:** https://developers.cloudflare.com/pages
- **Terraform Cloudflare:** https://registry.terraform.io/providers/cloudflare/cloudflare
- **Mermaid.js:** https://mermaid.js.org

### Getting Help
- **Cloudflare Community:** https://community.cloudflare.com
- **Stack Overflow:** Tag with `cloudflare-workers`, `vite`, `react`
- **GitHub Issues:** Create issue in your repo for tracking

### Feedback & Iteration
- Use contact form on live site
- LinkedIn: https://www.linkedin.com/in/trystan-m/
- GitHub: Create issues for bugs/enhancements

---

## License

Choose one:

**Option A: MIT License** (open source, allows others to use)
```
MIT License - See LICENSE file
```

Add `LICENSE` file to project root with chosen license.

---

## Changelog

**v1.0.0 - Phase 1 (MVP)**
- Initial portfolio UI
- 9 components (Hero through Footer)
- Dark/light mode toggle
- Responsive design
- Contact form UI (no backend)

**v2.0.0 - Phase 2 (Production)**
- Cloudflare Worker backend
- Turnstile CAPTCHA integration
- Terraform infrastructure
- Mermaid.js diagrams
- CI/CD with GitHub Actions
- Lefthook pre-commit hooks

**Future: v3.0.0 - Phase 3**
- Actual project showcases
- Blog integration (optional)
- Advanced animations
- Analytics integration

---

**End of Project Instructions**

This document should be the single source of truth for the portfolio project. Update it as the project evolves.