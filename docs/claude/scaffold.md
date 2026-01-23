<handoff_instructions>
Project Overview
You are helping build a professional portfolio website for Trystan Bates-Maricle, an AI/ML Engineer. This is a greenfield project starting from scratch.
Tech Stack (Already Decided)

Frontend: Vite + React 18+ + TypeScript + Tailwind CSS
Deployment: Cloudflare Pages (with auto-deploy from GitHub)
Backend: Cloudflare Workers (for contact form)
Infrastructure: Terraform (to manage Cloudflare resources)
Diagrams: Mermaid.js (embedded in React components)
Domain: trystan-tbm.dev

Design Aesthetic

Style: Modern/bold, dark mode default with light mode toggle
Colors: Dark backgrounds (#0a0a0a, #141414), blue/purple gradient accents (#3b82f6, #8b5cf6)
Typography: Inter (sans-serif), JetBrains Mono (monospace for code)
Vibe: Vercel.com meets Linear.app (professional but bold)

Security Requirements (CRITICAL)

NO contact information in plain text (no email, no phone anywhere on site)
Contact form only with Cloudflare Turnstile CAPTCHA
Multi-layer spam protection: Turnstile + honeypot + rate limiting + time validation
Resume PDF: Downloadable but sanitized (no contact info in PDF either)
All secrets in environment variables, never committed to repo

Content Strategy

Professional Profile: Mid-level Software Engineer at State Farm (2020-Present), B.S. CS from Illinois State (2023)
Focus Areas: AI/ML (NLP, Computer Vision, LLMs), Cloud Infrastructure (AWS, Azure), Full-stack development
Key Achievements: 3 patents filed, 25% call center load reduction (NLP voice bot), 40% LOC reduction (codebase modernization)
Current State: NO projects to showcase yet (proprietary work), portfolio will have "Coming Soon" placeholders
Goal: Build the infrastructure now, add actual projects later

Page Structure (SPA - Single Page Application)
/ (Single page with smooth scrolling sections)
├── Hero
│   ├── Name: "Trystan Bates-Maricle"
│   ├── Title: "AI/ML Engineer | Full-Stack Developer | Cloud Infrastructure"
│   ├── Tagline: "Building intelligent systems that scale"
│   └── CTA: "View Experience" + "Let's Connect"
│
├── About
│   ├── Current role at State Farm
│   ├── Focus areas (NLP, CV, LLMs, Cloud)
│   ├── Value proposition
│   └── Education
│
├── Experience Highlights
│   ├── NLP Voice Bot (25% call center reduction)
│   ├── Codebase Modernization (40% LOC reduction)
│   ├── OCR/Document Understanding evaluation
│   ├── LLM Research & enterprise tool selection
│   └── Computer Vision community leadership
│
├── Patents
│   ├── "3 patents filed in AI-centric customer support"
│   ├── USPTO publication numbers (will be provided)
│   └── Brief descriptions
│
├── Skills Matrix
│   ├── AI/ML: PyTorch, TensorFlow, NLP, CV, LLMs
│   ├── Cloud: AWS (Lambda, S3, SageMaker, Textract), Azure, Terraform
│   ├── Languages: Python, Kotlin, TypeScript, Go
│   └── Visual grouping (NOT a boring list)
│
├── Projects (Future - Placeholder for now)
│   ├── "Currently building new projects to showcase"
│   ├── 3-4 placeholder cards with "Coming Soon"
│   └── Link to GitHub repo of THIS portfolio site
│
├── Contact
│   ├── Secure form (Turnstile + Worker backend)
│   ├── LinkedIn: https://www.linkedin.com/in/trystan-m/
│   └── NO email/phone anywhere
│
└── Footer
├── "Built with Vite + React + TypeScript + Cloudflare Workers"
├── GitHub repo link (will be public)
└── © 2025 Trystan Bates-Maricle
File Structure to Create
portfolio/
├── src/
│   ├── components/
│   │   ├── Hero.tsx
│   │   ├── About.tsx
│   │   ├── Experience.tsx
│   │   ├── Patents.tsx
│   │   ├── Skills.tsx
│   │   ├── Projects.tsx          # "Coming Soon" placeholders
│   │   ├── Contact.tsx
│   │   ├── Footer.tsx
│   │   ├── ThemeToggle.tsx       # Dark/light mode switch
│   │   └── ArchitectureDiagram.tsx  # Mermaid.js wrapper
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css                 # Tailwind + custom CSS variables
│
├── worker/
│   ├── src/
│   │   └── index.ts              # Contact form handler with Turnstile verification
│   └── wrangler.toml             # Worker configuration
│
├── terraform/
│   ├── main.tf                   # Cloudflare Pages + Workers + DNS
│   ├── variables.tf              # Variable definitions (NO secrets)
│   ├── outputs.tf                # Output URLs after deploy
│   └── README.md                 # Deployment instructions
│
├── .github/
│   ├── dependabot.yml            # Auto-update dependencies
│   └── workflows/
│       └── ci.yml                # Type-check, lint on PRs
│
├── public/
│   └── resume-public.pdf         # Sanitized resume (will be provided later)
│
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── postcss.config.js
├── .env.example                  # Template for environment variables
├── .gitignore
└── README.md                     # Setup + deployment instructions
MVP Scope (Phase 1 - Build This First)
Essential Components:

✅ Project scaffold (Vite + React + TS + Tailwind)
✅ Hero section with gradient, dark mode default
✅ About section
✅ Experience highlights (brief descriptions, no deep-dive)
✅ Skills matrix (visual grouping, not list)
✅ Patents section (placeholder for USPTO links)
✅ Projects section ("Coming Soon" placeholders)
✅ Contact form (frontend only for now - Worker in Phase 2)
✅ Footer
✅ Light/dark mode toggle
✅ Mobile responsive (Tailwind breakpoints)
✅ Smooth scrolling between sections

NOT in MVP:

❌ Animations (Phase 2)
❌ Cloudflare Worker backend (Phase 2)
❌ Terraform infrastructure (Phase 2)
❌ Mermaid.js diagrams (Phase 2 - placeholders OK)
❌ GitHub Actions CI/CD (Phase 2)
❌ Actual project content (will be added later)

Key Implementation Details
1. Dark/Light Mode
   tsx// Use context + localStorage
   // Default: dark mode
   // Toggle in nav/header
   // Tailwind: use `dark:` prefix for light mode overrides
2. Color Palette (Tailwind Config)
   jscolors: {
   primary: {
   DEFAULT: '#3b82f6',  // Blue
   dark: '#2563eb',
   },
   secondary: {
   DEFAULT: '#8b5cf6',  // Purple
   },
   success: '#10b981',    // Green for metrics
   bg: {
   primary: '#0a0a0a',
   secondary: '#141414',
   tertiary: '#1f1f1f',
   },
   }
3. Contact Form (Frontend MVP)
   tsx// For now: Just form UI with validation
   // Fields: name, email, message
   // Add hidden honeypot field: <input name="website" style="display:none" />
   // Disable submit button until form valid
   // Show "Coming Soon - Contact form will be live shortly" message
   // Phase 2: Connect to Cloudflare Worker
4. Skills Matrix - NOT a List
   tsx// Group skills by category with visual cards:
   // - AI/ML box (PyTorch, TensorFlow, NLP, CV, LLMs)
   // - Cloud box (AWS services, Azure, Terraform)
   // - Languages box (Python, Kotlin, TS, Go)
   // - Tools box (Docker, GitLab, Gradle)
   // Use grid layout, hover effects, icons if available
5. Patents Section
   tsx// Placeholder structure for now (USPTO links will be added later):
<div className="patents-grid">
  <PatentCard 
    title="AI-Centric Customer Support Tool"
    number="US-2024-XXXXXX-A1 (Pending)"
    description="Intelligent support automation system"
    usptoUrl="#" // Will be provided
  />
  // Repeat for 3 patents
</div>
6. Smooth Scrolling
tsx// Navigation links with smooth scroll:
<a href="#about" onClick={(e) => {
  e.preventDefault();
  document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
}}>
  About
</a>
Dependencies to Install
json{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.2",
    "vite": "^6.0.5"
  }
}
Environment Variables (.env.example)
bash# Cloudflare (for future Worker deployment)
VITE_TURNSTILE_SITE_KEY=your-site-key-here
CLOUDFLARE_API_TOKEN=your-api-token-here  # NOT in repo, local only
CLOUDFLARE_ACCOUNT_ID=your-account-id

# Contact form (Worker environment variables, not frontend)
TURNSTILE_SECRET_KEY=secret-key-here      # Worker only
CONTACT_EMAIL=your-email@gmail.com         # Worker only
```

### Specific Tasks for Claude Code

**Start Here:**
1. Initialize Vite + React + TypeScript project
2. Install and configure Tailwind CSS
3. Set up basic file structure (components folder, App.tsx, etc.)
4. Create dark/light mode context with localStorage persistence
5. Build Hero component with gradient text and CTAs
6. Build remaining sections (About, Experience, Patents, Skills, Projects placeholders, Contact form UI, Footer)
7. Add smooth scrolling navigation
8. Make fully responsive (mobile-first Tailwind breakpoints)
9. Create README with setup instructions

**Code Style:**
- Functional components with TypeScript
- Use `const` for components
- Props interfaces for all components
- Tailwind classes (no custom CSS unless necessary)
- Comments for complex logic
- Semantic HTML (section, article, nav, etc.)

**Accessibility:**
- ARIA labels where needed
- Keyboard navigation support
- Focus states on interactive elements
- Alt text on images (if any)
- Color contrast WCAG AA minimum

### Content Placeholders (Use These Exact Strings)

**Hero:**
- Name: "Trystan Bates-Maricle"
- Title: "AI/ML Engineer | Full-Stack Developer | Cloud Infrastructure"
- Tagline: "Building intelligent systems that scale"

**About:**
```
Software Engineer at State Farm with 4+ years of experience architecting
AI/ML systems for production environments. Specialized in NLP, Computer Vision,
and LLM integration, with expertise spanning the full stack from model training
to cloud deployment and infrastructure automation.

Currently focused on: Enterprise LLM applications, scalable cloud architecture,
and bringing AI research into production systems.

Education: B.S. Computer Science, Illinois State University (2023)
```

**Experience Highlights:**
1. "NLP Voice Bot Enhancement - Reduced call center load by 25% through Microsoft LUIS integration"
2. "Codebase Modernization - Improved maintainability with 40% LOC reduction via architectural redesign"
3. "OCR Document Processing - Evaluated AWS Textract, Azure Vision, and Lazarus AI for production deployment"
4. "Enterprise LLM Research - Led evaluation and selection of LLM tools for enterprise use cases"
5. "Computer Vision Leadership - Conducted workshops on embeddings, transformers, CNNs, and vector databases"

**Patents:**
- "3 patent applications filed in AI-centric customer support automation and intelligent error handling"
- (USPTO links will be provided later)

**Projects Section:**
```
Currently building new projects to showcase here. Check back soon!

In the meantime, view the source code for this portfolio on GitHub
to see modern React, TypeScript, and Cloudflare Workers in action.
```

### What NOT to Do
- ❌ Don't add animations yet (Phase 2)
- ❌ Don't implement Worker backend yet (Phase 2)
- ❌ Don't add Terraform yet (Phase 2)
- ❌ Don't hardcode any contact information (email/phone)
- ❌ Don't use any external UI libraries (just Tailwind)
- ❌ Don't add analytics or tracking
- ❌ Don't create multiple pages (SPA only)

### Success Criteria
- ✅ `npm run dev` starts dev server
- ✅ All sections render correctly
- ✅ Dark mode default, light mode toggle works
- ✅ Mobile responsive (test at 375px, 768px, 1024px)
- ✅ No TypeScript errors
- ✅ No console errors
- ✅ Smooth scrolling works
- ✅ Contact form has validation (frontend only)
- ✅ Professional appearance matching modern/bold aesthetic
- ✅ All placeholder content in place

</handoff_instructions>

---

## How to Use This with Claude Code

1. **Open your IDE** (VS Code, Cursor, etc.)
2. **Create a new empty folder** for the project
3. **Start Claude Code session** in that folder
4. **Paste the entire `<handoff_instructions>` block** above
5. **Add this prompt:**
```
Please build the MVP portfolio website according to these specifications.
Start by scaffolding the Vite + React + TypeScript project with Tailwind,
then build the components one by one. Let me know when each major section
is complete so I can review.

Claude Code will:

Initialize the project
Set up Tailwind configuration
Build all components
Create responsive layouts
Implement dark/light mode
Add smooth scrolling