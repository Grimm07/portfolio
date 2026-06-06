---
name: pr-check
description: Run the full local pre-PR / pre-merge verification gate for this portfolio (type check, lint, full test suite, production build + bundle-budget check, secrets/email scan) before opening or merging a PR. Use when the user runs /pr-check or asks to verify the branch is ready for a PR to main. CRITICAL because merging to main triggers a PRODUCTION deploy.
disable-model-invocation: true
---

# pr-check

Run the complete local pre-PR gate so failures are caught here instead of after a CI round-trip.
Invoked as `/pr-check`. Run every step in order, capture each result, and print a single PASS/FAIL
summary at the end. If anything fails, STOP and report — do NOT claim the branch is ready.

## Why this matters (operational warning)

**Merging to `main` triggers a PRODUCTION deploy** — `deploy.yml` runs an S3 sync + CloudFront
invalidation against the live site at https://trystan-tbm.dev (per `deploy-pipeline-expert`). A
green local gate is the cheapest place to catch a regression. Every check below must be ✅ before you
open or merge a PR to `main`.

## Relationship to existing hooks (don't duplicate — extend)

Lefthook already runs on every commit (`lefthook.yml`): `tsc --noEmit`, ESLint on *staged* files, a
secrets/email regex on the *staged diff*, and a commit-message length check. This skill is the
*broader* pre-PR suite those hooks deliberately skip: the **full** test run and a **production build
+ bundle-budget** check, plus a belt-and-suspenders secrets scan over the *whole branch diff* (not
just staged files). It complements the hooks; it does not replace them.

## Coordinator note

This repo follows a COORDINATOR + specialist model (see `CLAUDE.md`). Defer bundle-budget specifics
(chunk-splitting strategy, the expected Mermaid lazy-load split, `chunkSizeWarningLimit` tuning) to
the `build-perf-expert` project agent, and deploy mechanics to `deploy-pipeline-expert`. This skill
only enforces the numeric budget; it does not decide how to fix an over-budget chunk.

## Steps

Run from the repo root (`/home/grimm/code/portfolio`). Report the result of each step before moving
on.

1. **Type check** — strict TS (`noUnusedLocals` / `noUnusedParameters`):
   ```bash
   npx tsc --noEmit
   ```

2. **Lint**:
   ```bash
   npm run lint
   ```

3. **Tests** — full Vitest one-shot (not watch):
   ```bash
   npm run test:run
   ```

4. **Build + bundle budget** — produce the real production bundle, then enforce the budget from
   `package.json` (`"performance": { "maxBundleSize": "500kb", "maxChunkSize": "200kb" }`):
   ```bash
   npm run build
   find dist/assets -name '*.js' -printf '%s %p\n' | sort -rn
   ```
   - `npm run build` is `tsc -b && vite build`; Vite prints per-chunk sizes and emits a warning when a
     chunk exceeds its `chunkSizeWarningLimit`. Treat that warning as a signal, not the gate.
   - Enforce the budget explicitly from the `find` output (sizes are in bytes; 200kb = 204800 B,
     500kb = 512000 B):
     - **Largest single chunk must be ≤ 200kb.** FLAG any individual `dist/assets/*.js` over 204800 B.
     - **Total JS must be ≤ 500kb.** Sum the byte column; FLAG if the total exceeds 512000 B.
   - The **Mermaid lazy-load split** (a separate async chunk) is expected and fine — don't flag it for
     existing. If a budget number is actually breached, that's a FAIL; defer the *how-to-fix* to
     `build-perf-expert`.

5. **Secrets / email scan** — belt-and-suspenders over the whole branch diff vs `main` (the lefthook
   hook only sees staged files; this catches anything across the branch). Scope to source files, not
   docs:
   ```bash
   git diff main...HEAD -- 'src/**' '*.ts' '*.tsx' '*.json' '*.html' \
     | grep -nE '(AKIA|AIza[0-9A-Za-z_-]{35}|sk_live_[0-9a-zA-Z]{24}|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'
   ```
   - The regex mirrors `lefthook.yml`'s `secrets-check` (AWS `AKIA`, Google `AIza…`, Stripe
     `sk_live_…`, and any email address). A non-empty match is a **FAIL** — per `CLAUDE.md`, no emails,
     phone numbers, API keys, or secrets are allowed in code. (`grep` exits non-zero when there are no
     matches, which is the success case here.)

6. **Summary** — print a per-step checklist and an overall verdict:
   ```
   pr-check results
     1. Type check (tsc --noEmit) ......... ✅ / ❌
     2. Lint (npm run lint) ............... ✅ / ❌
     3. Tests (npm run test:run) .......... ✅ / ❌
     4. Build + bundle budget ............. ✅ / ❌   (largest chunk … / total …)
     5. Secrets / email scan .............. ✅ / ❌
   ```
   - If **all** steps pass: report the branch is clear for a PR to `main` (and remind that merging
     deploys to production).
   - If **anything** fails: STOP, report which step failed with its output, and do **not** claim the
     branch is ready. Fix and re-run `/pr-check`.
