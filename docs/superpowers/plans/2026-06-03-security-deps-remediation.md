# Plan S — Dependency Remediation + CI Security Hardening

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clear every *actionable* dependency vulnerability across the three npm workspaces (`/`, `worker/`, `backend/`) and stop regressions by adding a CI `npm audit` gate and a CodeQL workflow. Prefer **non-breaking** fixes (`npm audit fix` without `--force`, plus targeted minor/patch top-level bumps). After any manifest change, **regenerate the lockfile with `npm install`** (per project memory: `npm ci` will fail against a stale lock).

**Scope boundary:** This plan is **independent of the AWS migration** (Plans 2a/2b/2c/3) — it touches **no** `terraform/`, AWS, or `main.tf` code. It is safe to execute first, anytime, in parallel with the migration. Per the meta-plan execution graph, Plan S "depends on nothing, blocks nothing."

**Ground-truth audit (captured 2026-06-03, `npm audit`):**
- **`backend/`**: **0 vulnerabilities** (clean — confirm only).
- **`worker/`**: **4**, *all dev-only* — high: `undici`, `miniflare`, `wrangler`; moderate: `ws`. (`undici`/`ws` are transitive under `miniflare`/`wrangler`; the actionable top-level bump is `wrangler`, range `4.36.0 - 4.74.0`.)
- **root (`/`, frontend)**: **19** (1 critical, 7 high, 11 moderate). **Only ONE ships to users:** `dompurify <=3.3.3` (moderate XSS). Everything else is dev/build/test tooling — the "critical" is `vitest <4.1.0` (UI-server RCE, test-only); the highs are `vite`, `rollup`, `undici`, `lodash-es`, `minimatch`, `picomatch`, `flatted`; moderates are `postcss`, `mermaid` (+`chevrotain`/`langium`/`@mermaid-js/parser` chain), `ajv`, `brace-expansion`, `uuid`.

> **GitHub's "30 alerts (1 critical / 9 high)" maps almost entirely to dev-tooling.** The numbers differ from local `npm audit` because GitHub also surfaces alerts against the committed lockfiles in `worker/` and historical states, and counts each advisory separately. The single fix that reaches a user's browser is **`dompurify`**; the rest harden the build/test/CI toolchain only.

**Every fix in scope is non-major.** `npm audit` reports `fixAvailable: true` (a non-`--force` fix exists) for all 19 root + 4 worker advisories; none is flagged `isSemVerMajor`. The only *major* upgrades available (`vite@8`, ESLint `10`) are **deliberately NOT taken** here (see Task 1 / Self-Review).

**ESLint constraint (do NOT violate):** ESLint stays on **9.x**. ESLint 10 is blocked because `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh` do not yet support it (per CLAUDE.md / project memory, as of Feb 2026). No task in this plan bumps `eslint`, `typescript-eslint`, or the two react plugins to a major.

---

## Version targets (resolved 2026-06-03 against the npm registry)

| Package | Workspace | Current (manifest) | Vulnerable range | Target | Major? |
|---|---|---|---|---|---|
| `dompurify` | root | `^3.3.1` | `<=3.3.3` | `^3.4.8` | no (minor) |
| `vitest` | root | `^4.0.18` | `<4.1.0` | `^4.1.8` | no (minor) |
| `vite` | root | `^7.3.1` | `7.0.0 - 7.3.1` | `^7.3.5` | no (patch; **stay on 7.x**, not 8) |
| `postcss` | root | `^8.4.49` | `<8.5.10` | `^8.5.15` | no (minor) |
| `mermaid` | root | `^11.12.2` | `11.0.0-alpha.1 - 11.14.0` | `^11.15.0` | no (minor) |
| `wrangler` | worker | `^4.61.1` | `4.36.0 - 4.74.0` | `^4.97.0` | no (minor) |

Transitive-only advisories (`rollup`, `undici`, `lodash-es`, `minimatch`, `picomatch`, `flatted`, `ajv`, `brace-expansion`, `uuid`, `chevrotain`, `langium`, `@mermaid-js/parser`, `@chevrotain/*` in root; `undici`, `ws`, `miniflare` in worker) are resolved by `npm audit fix` + the top-level bumps that pull fixed sub-deps — **no direct manifest entry needed**.

---

## Task 1: Root frontend remediation (`/`)

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json` (regenerated, do not hand-edit)

- [ ] **Step 1: Baseline the audit**

```bash
cd /home/grimm/code/portfolio
npm audit --audit-level=low | tail -5   # expect: 19 vulnerabilities (11 moderate, 7 high, 1 critical)
```

- [ ] **Step 2: Auto-fix transitives (non-breaking)**

```bash
cd /home/grimm/code/portfolio
npm audit fix          # NOTE: no --force. Resolves rollup, undici, lodash-es, minimatch,
                       # picomatch, flatted, ajv, brace-expansion, uuid, chevrotain/langium/
                       # @mermaid-js/parser sub-deps that have a compatible fixed version.
```

- [ ] **Step 3: Targeted top-level bumps (the advisories `audit fix` can't reach via transitives)**

```bash
cd /home/grimm/code/portfolio
npm install \
  dompurify@^3.4.8 \
  vitest@^4.1.8 \
  vite@^7.3.5 \
  postcss@^8.5.15 \
  mermaid@^11.15.0
```

> `dompurify` is the **only user-facing** fix (moderate XSS that ships in the bundle). `vitest`/`vite`/`postcss`/`mermaid` are build/test-time. `vite` is pinned to the latest **7.x** (`^7.3.5`) — **do NOT** take `vite@8` (major; out of scope, needs a separate build/test pass). **Do NOT** touch `eslint`/`typescript-eslint`/`eslint-plugin-react-*` (ESLint-10 constraint).

- [ ] **Step 4: Regenerate the lockfile (memory: required before `npm ci`)**

```bash
cd /home/grimm/code/portfolio
rm -rf node_modules package-lock.json
npm install            # regenerates package-lock.json cleanly from the updated manifest
```

> Per project memory, after changing deps the lockfile MUST be regenerated so the CI `npm ci` step (and `actions/setup-node` cache) stays consistent. A clean reinstall avoids partial-tree drift from the two `npm install` calls above.

- [ ] **Step 5: Verify (all four must be green)**

```bash
cd /home/grimm/code/portfolio
npm run build          # tsc -b && vite build — confirms vite/postcss/mermaid bumps build
npx tsc --noEmit       # type check
npm run lint           # ESLint 9.x — confirms no plugin breakage
npm run test:run       # vitest run — confirms vitest 4.1.x bump
```
Expected: build succeeds within the 500KB/200KB budget; `tsc` clean; ESLint clean; all tests pass.

- [ ] **Step 6: Re-audit (prod scope should be clean)**

```bash
cd /home/grimm/code/portfolio
npm audit --audit-level=high          # expect: 0 high/critical
npm audit --omit=dev --audit-level=low # expect: 0 (dompurify was the only prod dep flagged)
```
> If a residual **moderate** dev-only advisory remains (e.g. a transitive with no non-major fix yet), record it in the Self-Review and leave it for a Dependabot follow-up — do **not** run `npm audit fix --force`.

- [ ] **Step 7: Commit**

```bash
cd /home/grimm/code/portfolio
git add package.json package-lock.json
git commit -m "chore(deps): remediate frontend vulns — dompurify (prod XSS), vitest/vite/postcss/mermaid + transitives"
```

---

## Task 2: Worker remediation (`worker/`)

**Files:**
- Modify: `worker/package.json`
- Modify: `worker/package-lock.json` (regenerated)

> Note: `worker/` is slated for retirement in Plan 2c (AWS WAF/CloudFront cutover). Fix it anyway — it remains the **live backend for the interim release** until that cutover lands.

- [ ] **Step 1: Baseline the audit**

```bash
cd /home/grimm/code/portfolio/worker
npm audit | tail -5    # expect: 4 vulnerabilities (1 moderate, 3 high) — undici, ws, miniflare, wrangler
```

- [ ] **Step 2: Bump the actionable top-level dev dep + auto-fix transitives**

```bash
cd /home/grimm/code/portfolio/worker
npm install wrangler@^4.97.0   # >4.74.0 clears the wrangler advisory and pulls fixed miniflare
npm audit fix                  # no --force; clears residual undici/ws/miniflare transitives
```
> `undici`, `ws`, and `miniflare` are transitive under `wrangler`; bumping `wrangler` (current `^4.61.1`, vulnerable `4.36.0 - 4.74.0`) to `^4.97.0` is the single direct change. `miniflare` is not a direct dependency, so no separate manifest entry is required — verify it resolved via the re-audit in Step 5.

- [ ] **Step 3: Regenerate the lockfile**

```bash
cd /home/grimm/code/portfolio/worker
rm -rf node_modules package-lock.json
npm install
```

- [ ] **Step 4: Verify**

```bash
cd /home/grimm/code/portfolio/worker
npm run typecheck      # tsc --noEmit
npm run build          # esbuild bundle -> dist/index.js
```
Expected: type check clean; `dist/index.js` produced (terraform validate in CI depends on this artifact).

- [ ] **Step 5: Re-audit**

```bash
cd /home/grimm/code/portfolio/worker
npm audit --audit-level=high   # expect: 0 high/critical
```

- [ ] **Step 6: Commit**

```bash
cd /home/grimm/code/portfolio
git add worker/package.json worker/package-lock.json
git commit -m "chore(deps): bump worker wrangler >4.74 + audit-fix transitives (undici/ws/miniflare, all dev-only)"
```

---

## Task 3: Backend confirmation (`backend/`)

**Files:** none expected (confirm-only; commit only if `audit fix` touches the lockfile).

- [ ] **Step 1: Confirm zero vulnerabilities**

```bash
cd /home/grimm/code/portfolio/backend
npm audit              # expect: "found 0 vulnerabilities"
```

- [ ] **Step 2: Regression guard — run the backend test suite**

```bash
cd /home/grimm/code/portfolio/backend
npm install            # ensure node_modules present
npm run typecheck      # tsc --noEmit
npm test               # vitest run — expect the 45 backend tests green (per meta-plan)
```
Expected: 0 vulns, type check clean, all tests pass. **No manifest change expected.**

- [ ] **Step 3: Commit (only if anything changed)**

```bash
cd /home/grimm/code/portfolio
# Only if `npm install`/audit touched backend/package-lock.json:
git add backend/package-lock.json
git commit -m "chore(deps): confirm backend audit clean (0 vulns) + tests green as regression guard"
```
> If `git status` shows no change under `backend/`, **skip the commit** — Task 3 is a confirmation gate, not a change.

---

## Task 4: Re-audit all three workspaces + record residuals

**Files:** none (verification gate; produces the residual list cited in Self-Review).

- [ ] **Step 1: Run the gate command in each workspace**

```bash
cd /home/grimm/code/portfolio        && npm audit --audit-level=high; echo "root rc=$?"
cd /home/grimm/code/portfolio/worker && npm audit --audit-level=high; echo "worker rc=$?"
cd /home/grimm/code/portfolio/backend && npm audit --audit-level=high; echo "backend rc=$?"
```
Expected: **0 high/critical** in all three (`rc=0` each). `npm audit --audit-level=high` exits non-zero only when a high/critical remains, which is exactly the gate CI will use in Task 5.

- [ ] **Step 2: Capture any residual moderates (dev-only, no non-major fix)**

```bash
cd /home/grimm/code/portfolio && npm audit --audit-level=moderate | tail -3
```
> Record any leftover **moderate** advisory (and which package/range) in the Self-Review "Deferred" list and rely on the existing weekly **Dependabot** (`.github/dependabot.yml`, npm root+worker) to land the eventual non-breaking fix. Do **not** force-upgrade past a major to clear a moderate dev-only finding.

- [ ] **Step 3: No commit** (verification only).

---

## Task 5: CI hardening — `npm audit` gate + CodeQL

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `.github/workflows/codeql.yml`

- [ ] **Step 1: Add a `security-audit` job to `ci.yml`**

Add this job alongside the existing `validate` / `build` / `terraform` / `deploy` jobs (it has no `needs`, so it runs in parallel with `validate`):

```yaml
  # =============================================================================
  # SECURITY AUDIT JOB - npm audit across all three workspaces
  # Starts NON-BLOCKING (|| true) to avoid breaking CI on pre-existing dev-tool
  # noise. TODO: remove the "|| true" and tighten to a hard gate once all three
  # workspaces are confirmed clean (Tasks 1-4) and stay green for one cycle.
  # =============================================================================
  security-audit:
    name: Security Audit
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v6

      - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: '20'
          cache: 'npm'

      - name: Audit root (frontend)
        run: npm audit --audit-level=high || true

      - name: Audit worker
        working-directory: worker
        run: npm audit --audit-level=high || true

      - name: Audit backend
        working-directory: backend
        run: npm audit --audit-level=high || true
```

> `npm audit` does not need `npm ci` first — it reads the committed lockfile directly, so no install step is required. Start non-blocking (`|| true`) per the meta-plan ("start non-blocking if too noisy, then tighten"); the inline TODO makes the follow-up explicit.

- [ ] **Step 2: Create `.github/workflows/codeql.yml`**

```yaml
name: CodeQL

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    # Weekly, Monday 06:00 UTC — aligns with the Dependabot weekly cadence.
    - cron: '0 6 * * 1'

permissions:
  contents: read
  security-events: write    # required for CodeQL to upload findings
  actions: read

jobs:
  analyze:
    name: Analyze (javascript-typescript)
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v6

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
          # 'javascript-typescript' covers root frontend, worker/, and backend/
          # in one pass — all TS/JS, no compiled-language build needed.
          queries: security-and-quality

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: "/language:javascript-typescript"
```

> No `autobuild` step is needed: `javascript-typescript` is an interpreted language pack and CodeQL scans the source directly. The weekly `schedule` catches newly-published advisories against unchanged code, complementing Dependabot's weekly dep PRs.

- [ ] **Step 3: Validate workflow syntax**

```bash
cd /home/grimm/code/portfolio
# Quick YAML sanity check (no act/runner needed):
python3 -c "import yaml,sys; [yaml.safe_load(open(f)) for f in ['.github/workflows/ci.yml','.github/workflows/codeql.yml']]; print('YAML OK')"
```
Expected: `YAML OK`. (Full validation happens when the workflows run on the PR.)

- [ ] **Step 4: Commit**

```bash
cd /home/grimm/code/portfolio
git add .github/workflows/ci.yml .github/workflows/codeql.yml
git commit -m "ci(security): add non-blocking npm audit gate (3 workspaces) + CodeQL JS/TS workflow"
```

---

## Self-Review

**Fixed (this plan):**
- **root** — `dompurify` `<=3.3.3` → `^3.4.8` (**the only user-facing / prod-bundle fix**, moderate XSS); dev/build/test bumps `vitest`→`^4.1.8` (critical UI-server RCE), `vite`→`^7.3.5` (high path-traversal/file-read), `postcss`→`^8.5.15`, `mermaid`→`^11.15.0`; transitives via `npm audit fix` (`rollup`, `undici`, `lodash-es`, `minimatch`, `picomatch`, `flatted`, `ajv`, `brace-expansion`, `uuid`, `chevrotain`/`langium`/`@mermaid-js/parser` chain).
- **worker** — `wrangler` `4.36.0-4.74.0` → `^4.97.0`, clearing transitive `undici`/`ws`/`miniflare` (all dev-only).
- **backend** — already 0; confirmed + tests run as a regression guard.
- **CI** — new `security-audit` job (`npm audit --audit-level=high` × 3 workspaces) + new `.github/workflows/codeql.yml` (javascript-typescript, push/PR to main + weekly schedule).

**No major bumps taken.** Every advisory had a non-major fix (`npm audit fix` without `--force`). `vite` deliberately held at **7.x** (latest 7.3.5), not the available `vite@8` — taking 8.x is a separate change requiring its own build/test pass and is out of scope.

**ESLint-10 constraint honored:** `eslint` stays **9.x**; `eslint-plugin-react-hooks` / `eslint-plugin-react-refresh` / `typescript-eslint` untouched at their majors (react plugins don't support ESLint 10 yet, per CLAUDE.md/memory). No advisory in any workspace required an ESLint bump.

**Deferred / residual:**
- Any **moderate, dev-only** advisory with no non-major fix at execution time (capture exact package + range in Task 4 Step 2) — left to the existing **weekly Dependabot** (npm root + worker already configured in `.github/dependabot.yml`). Recommend a follow-up only if it persists past the next Dependabot cycle.
- The `security-audit` CI job ships **non-blocking** (`|| true`) with a TODO to harden to a blocking gate once all three workspaces are confirmed clean and stay green for one cycle.
- `worker/` is fixed for the interim release but is retired entirely in Plan 2c; its Dependabot entry should be removed when `worker/` leaves the repo.

**Independence:** No `terraform/`, AWS, or `main.tf` changes — fully decoupled from Plans 2a/2b/2c/3, executable first/anytime per the meta-plan graph.

**Placeholder scan:** none — every task has concrete commands, resolved version targets (table above, registry-checked 2026-06-03), and explicit expected outcomes.

---

## Verification (whole plan)

```bash
# 1. All three workspaces clean at high/critical:
cd /home/grimm/code/portfolio        && npm audit --audit-level=high   # 0
cd /home/grimm/code/portfolio/worker && npm audit --audit-level=high   # 0
cd /home/grimm/code/portfolio/backend && npm audit --audit-level=high  # 0

# 2. Root prod scope specifically clean (dompurify fixed):
cd /home/grimm/code/portfolio && npm audit --omit=dev --audit-level=low # 0

# 3. Build/typecheck/tests green ×3:
cd /home/grimm/code/portfolio        && npm run build && npx tsc --noEmit && npm run lint && npm run test:run
cd /home/grimm/code/portfolio/worker && npm run typecheck && npm run build
cd /home/grimm/code/portfolio/backend && npm run typecheck && npm test

# 4. Lockfiles consistent (memory: npm ci must pass against regenerated lock):
cd /home/grimm/code/portfolio        && npm ci
cd /home/grimm/code/portfolio/worker && npm ci
cd /home/grimm/code/portfolio/backend && npm ci

# 5. CI workflows parse + run: security-audit job (non-blocking) and CodeQL both
#    appear green on the PR; CodeQL "Analyze (javascript-typescript)" completes.
```
Expected end state: 0 high/critical across all three workspaces; root prod scope 0; build/typecheck/lint/tests green ×3; `npm ci` succeeds against each regenerated lockfile; CI shows the new `security-audit` job and CodeQL run.
