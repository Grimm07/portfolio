# AWS Cutover Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile the already-partly-migrated portfolio repo with the AWS landing-zone brief: collapse the contact backend to a single SES-sending Lambda, switch Terraform state to a per-env (per-account) S3 backend, complete the Phase-1 SSM handshake, wire CloudFront-invoke in Phase 3, and retire Cloudflare — without ever breaking the live contact form.

**Architecture:** One `portfolio-contact-ingest` Lambda behind an `AWS_IAM` Function URL fronted by CloudFront OAC; it runs honeypot + time-trap + field validation, then sends one email per submission via Amazon SES (recipient from Secrets Manager). AWS WAF performs CAPTCHA + rate-limiting at the edge, so DynamoDB/SQS/S3 persistence and app-layer throttling are removed. Terraform stays in the single `terraform/` dir (no separate `aws/` root) and is stripped of Cloudflare during the retire phase. State moves to per-env partial `-backend-config` pointing at each account's `shadowspire-<env>-state-*` bucket + `shadowspire-<env>-tf-lock` DynamoDB lock.

**Tech Stack:** TypeScript (Lambda, esbuild→ESM), Vitest + `aws-sdk-client-mock`, AWS SDK v3 (SES, Secrets Manager), OpenTofu (`tofu` ≥ 1.10), AWS (Lambda Function URL, SES, SSM, IAM), GitHub Actions OIDC, React 18 + Vite frontend.

**Decisions locked in (from the user, 2026-06-03):**
1. Keep evolving `terraform/` (single dir); strip Cloudflare during retire — do NOT create a separate `aws/` root.
2. Per-env state backend (brief model): per-env `-backend-config` → each account's own `shadowspire-<env>-state-*` bucket + `shadowspire-<env>-tf-lock` DynamoDB lock. Drop OpenTofu workspaces + `use_lockfile`.
3. Simplify to a single `portfolio-contact-ingest` Lambda that calls SES directly. Remove the notifier/SQS/DynamoDB/S3-body pipeline and the DynamoDB rate-limiter.
4. (This document.)

**Region for ALL AWS work:** us-east-1.

**Environment / account facts (do not re-derive):**

| env | account | deploy role | site bucket | CF dist id | CF dist arn | host(s) | state bucket | lock table |
|-----|---------|-------------|-------------|-----------|-------------|---------|--------------|-----------|
| dev | 176355979099 | `arn:aws:iam::176355979099:role/portfolio-deploy` | `shadowspire-dev-site-176355979099` | `EGFCTGJJEER89` | `arn:aws:cloudfront::176355979099:distribution/EGFCTGJJEER89` | dev.trystan-tbm.dev | `shadowspire-dev-state-176355979099` | `shadowspire-dev-tf-lock` |
| prod | 681053994223 | `arn:aws:iam::681053994223:role/portfolio-deploy` | `shadowspire-prod-site-681053994223` | `E229NB0LSTX2V8` | `arn:aws:cloudfront::681053994223:distribution/E229NB0LSTX2V8` | trystan-tbm.dev, www.trystan-tbm.dev | `shadowspire-prod-state-681053994223` | `shadowspire-prod-tf-lock` |

**SSM handshake (per env):**
- YOU PUBLISH: `/portfolio/<env>/ingest-function-url` (String)
- YOU READ: `/portfolio/<env>/cloudfront-distribution-arn` (String), `/portfolio/<env>/waf-integration-url` (String), `/portfolio/<env>/waf-api-key` (SecureString)

**Dependency order (gates between phases):**
`Phase A–E (you: simplified Lambda + per-env backend + publish ingest-function-url)` → **merge to a branch, apply to DEV** → `Phase 2 (infra owner: enable_contact_api=true, apply, publish cf-arn + waf params)` → `Phase F (you: aws_lambda_permission from cf-arn + verify)` → `Phase G retire Cloudflare` → `Phase H acceptance`.

---

## File Structure

**Backend (`backend/`) — after simplification:**
- `src/ingest/handler.ts` — MODIFY: parse → honeypot → time-trap → validate → SES send. No S3/DDB/SQS.
- `src/ingest/email.ts` — CREATE: `sendContactEmail()` (single submission, not digest).
- `src/ingest/ip.ts` — KEEP: client IP for the email body.
- `src/shared/validation.ts` — KEEP unchanged.
- `src/shared/secrets.ts` — KEEP unchanged (recipient from Secrets Manager).
- `src/shared/types.ts` — MODIFY: keep `ContactSubmission`; drop `StoredMessage`/`ContactRecord`/`NotificationMessage`.
- DELETE: `src/ingest/store.ts`, `src/ingest/enqueue.ts`, `src/ingest/rateLimit.ts`, `src/notifier/` (all).
- Tests — REWRITE `test/ingest/handler.test.ts`; CREATE `test/ingest/email.test.ts`; KEEP `test/shared/validation.test.ts`, `test/ingest/ip.test.ts`, `test/shared/secrets.test.ts`; DELETE `test/ingest/store.test.ts`, `test/ingest/enqueue.test.ts`, `test/ingest/rateLimit.test.ts`, `test/notifier/` (all).
- `package.json` — MODIFY: drop `build:notifier`; drop unused `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `@aws-sdk/client-s3`, `@aws-sdk/client-sqs`.

**Terraform (`terraform/`):**
- `lambda.tf` — MODIFY: single `ingest` Lambda; env `FROM_EMAIL` + `CONTACT_EMAIL_SECRET_ARN`; `AWS_IAM` Function URL. Remove notifier + event-source mapping + notifier archive.
- `iam.tf` — MODIFY: ingest role = logs + `ses:SendEmail` (FromAddress condition) + `secretsmanager:GetSecretValue`. Remove notifier role + ingest's S3/DDB/SQS statements.
- `ses.tf` — KEEP.
- `secrets.tf` — KEEP (now read by ingest).
- `dynamodb.tf`, `sqs.tf`, `s3_messages.tf` — DELETE.
- `variables.tf` — MODIFY: add `environment` (validated dev|prod).
- `ssm.tf` — CREATE: publish `/portfolio/${var.environment}/ingest-function-url`.
- `permissions.tf` — CREATE in Phase F only: `data.aws_ssm_parameter.cf_arn` + `aws_lambda_permission.cf_invoke_url`.
- `backend.tf` — MODIFY: partial S3 backend (bucket + dynamodb_table injected per-env).
- `backend-dev.hcl`, `backend-prod.hcl` — CREATE: per-env backend config.
- `outputs.tf` — MODIFY: drop Cloudflare/Turnstile/notifier outputs; keep ingest URL/name + add ssm param name.
- `main.tf` — MODIFY in Phase G: strip Cloudflare Pages/Worker/DNS resources; keep `required_providers` + `cloudflare` provider (for SES DKIM).
- `terraform.tfvars.example` — MODIFY in Phase G.

**CI (`.github/workflows/`):**
- `deploy.yml` — MODIFY: add backend build + `tofu apply` (per-env backend-config, `-var environment`) before the S3 sync, in both jobs.
- `ci.yml` — MODIFY in Phase G: drop worker build/test/audit + worker artifact download in the terraform job.

**Frontend (`src/`):** No code change required — `Contact.tsx` already uses the AWS WAF SDK + same-origin POST. Phase F only verifies it.

**Cloudflare retire (Phase G):** delete `worker/`, strip CF from `terraform/`, remove CF/Turnstile/MailChannels secrets, update `CLAUDE.md` + `.env.example`.

---

## Phase A — Simplify the backend to a single SES Lambda (TDD)

### Task A1: Trim shared types to the submission shape

**Files:**
- Modify: `backend/src/shared/types.ts`

- [ ] **Step 1: Replace the file with just the submission type**

```typescript
/** Raw JSON body posted by the contact form. */
export interface ContactSubmission {
  name: string;
  email: string;
  message: string;
  website: string;        // honeypot — must be empty
  formTimestamp: number;  // ms epoch when the form was rendered
  // (no turnstileToken — AWS WAF CAPTCHA validates aws-waf-token at the edge, not in this body)
}
```

- [ ] **Step 2: Verify nothing else imports the removed types yet (will fail until A2/A3)**

Run: `cd backend && grep -rn "StoredMessage\|ContactRecord\|NotificationMessage" src/`
Expected: matches only in files being deleted in A4 (`store.ts`, `enqueue.ts`, `notifier/*`). Note them; they are removed in A4.

- [ ] **Step 3: Commit**

```bash
git add backend/src/shared/types.ts
git commit -m "refactor(backend): reduce contact types to submission-only for single-Lambda SES path"
```

### Task A2: Create the single-submission SES email module (TDD)

**Files:**
- Create: `backend/src/ingest/email.ts`
- Test: `backend/test/ingest/email.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { sendContactEmail } from '../../src/ingest/email';

const ses = mockClient(SESClient);

beforeEach(() => {
  ses.reset();
  ses.on(SendEmailCommand).resolves({ MessageId: 'm1' });
});

describe('sendContactEmail', () => {
  it('sends one SES email with From, single To, and submitter Reply-To', async () => {
    await sendContactEmail(new SESClient({}), {
      from: 'noreply@trystan-tbm.dev',
      to: 'owner@example.com',
      replyTo: 'alice@b.co',
      name: 'Alice',
      email: 'alice@b.co',
      message: 'hello there',
      ip: '1.2.3.4',
      createdAt: '2026-06-03T00:00:00.000Z',
    });

    const calls = ses.commandCalls(SendEmailCommand);
    expect(calls).toHaveLength(1);
    const input = calls[0].args[0].input;
    expect(input.Source).toBe('noreply@trystan-tbm.dev');
    expect(input.Destination?.ToAddresses).toEqual(['owner@example.com']);
    expect(input.ReplyToAddresses).toEqual(['alice@b.co']);
    expect(input.Message?.Subject?.Data).toContain('Alice');
    expect(input.Message?.Body?.Text?.Data).toContain('hello there');
    expect(input.Message?.Body?.Text?.Data).toContain('1.2.3.4');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run test/ingest/email.test.ts`
Expected: FAIL — cannot find module `../../src/ingest/email`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// backend/src/ingest/email.ts
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export interface ContactEmailArgs {
  from: string;       // verified SES identity, e.g. noreply@trystan-tbm.dev
  to: string;         // recipient (from Secrets Manager)
  replyTo: string;    // submitter's email, so a reply goes straight to them
  name: string;
  email: string;
  message: string;
  ip: string;
  createdAt: string;  // ISO-8601
}

export async function sendContactEmail(ses: SESClient, a: ContactEmailArgs): Promise<void> {
  const subject = `Portfolio: new contact from ${a.name}`;
  const body =
    `From: ${a.name} <${a.email}>\n` +
    `When: ${a.createdAt}\n` +
    `IP:   ${a.ip}\n` +
    `\n${a.message}\n`;

  await ses.send(
    new SendEmailCommand({
      Source: a.from,
      Destination: { ToAddresses: [a.to] },
      ReplyToAddresses: [a.replyTo],
      Message: {
        Subject: { Data: subject },
        Body: { Text: { Data: body } },
      },
    }),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx vitest run test/ingest/email.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add backend/src/ingest/email.ts backend/test/ingest/email.test.ts
git commit -m "feat(backend): add single-submission SES email sender"
```

### Task A3: Rewrite the ingest handler to validate + send via SES (TDD)

**Files:**
- Modify: `backend/src/ingest/handler.ts`
- Test (rewrite): `backend/test/ingest/handler.test.ts`

- [ ] **Step 1: Replace the handler test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { handleIngest } from '../../src/ingest/handler';
import { __clearSecretCache } from '../../src/shared/secrets';

const ses = mockClient(SESClient);
const sm = mockClient(SecretsManagerClient);

const ENV = {
  FROM_EMAIL: 'noreply@trystan-tbm.dev',
  CONTACT_EMAIL_SECRET_ARN: 'arn:aws:secretsmanager:us-east-1:111:secret:contact-email',
};

// A valid submission: honeypot empty, old-enough timestamp. No turnstileToken (WAF handles CAPTCHA).
function event(overrides: Record<string, unknown> = {}) {
  const body = JSON.stringify({
    name: 'Alice', email: 'a@b.co', message: 'hello there',
    website: '', formTimestamp: 0, ...overrides,
  });
  return { headers: { 'x-forwarded-for': '1.2.3.4', 'user-agent': 'UA' }, body } as never;
}

const deps = () => ({
  env: ENV,
  clients: { ses: new SESClient({}), secrets: new SecretsManagerClient({}) },
  now: () => 10_000, // 10s > MIN_FORM_TIME_MS past formTimestamp=0
});

beforeEach(() => {
  ses.reset();
  sm.reset();
  __clearSecretCache();
  sm.on(GetSecretValueCommand).resolves({ SecretString: 'owner@example.com' });
  ses.on(SendEmailCommand).resolves({ MessageId: 'm1' });
});

describe('handleIngest', () => {
  it('sends one email and returns 200 for a valid submission', async () => {
    const res = await handleIngest(event(), deps());
    expect(res.statusCode).toBe(200);
    expect(ses.commandCalls(SendEmailCommand)).toHaveLength(1);
    const input = ses.commandCalls(SendEmailCommand)[0].args[0].input;
    expect(input.Destination?.ToAddresses).toEqual(['owner@example.com']);
    expect(input.ReplyToAddresses).toEqual(['a@b.co']);
  });

  it('rejects a tripped honeypot with 200 but sends nothing (silent)', async () => {
    const res = await handleIngest(event({ website: 'spam' }), deps());
    expect(res.statusCode).toBe(200);
    expect(ses.commandCalls(SendEmailCommand)).toHaveLength(0);
  });

  it('rejects too-fast submissions with 400 and sends nothing', async () => {
    const d = deps(); d.now = () => 1000; // 1s after formTimestamp=0
    const res = await handleIngest(event(), d);
    expect(res.statusCode).toBe(400);
    expect(ses.commandCalls(SendEmailCommand)).toHaveLength(0);
  });

  it('rejects invalid email with 400', async () => {
    const res = await handleIngest(event({ email: 'nope' }), deps());
    expect(res.statusCode).toBe(400);
    expect(ses.commandCalls(SendEmailCommand)).toHaveLength(0);
  });

  it('returns 400 on malformed JSON', async () => {
    const bad = { headers: {}, body: '{not json' } as never;
    const res = await handleIngest(bad, deps());
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when body is JSON null (non-object body)', async () => {
    const bad = { headers: { 'x-forwarded-for': '1.2.3.4' }, body: 'null' } as never;
    const res = await handleIngest(bad, deps());
    expect(res.statusCode).toBe(400);
    expect(ses.commandCalls(SendEmailCommand)).toHaveLength(0);
  });

  it('returns 400 when message is a number (non-string field)', async () => {
    const res = await handleIngest(event({ message: 123 }), deps());
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when name is a number (non-string name)', async () => {
    const res = await handleIngest(event({ name: 123 }), deps());
    expect(res.statusCode).toBe(400);
  });

  it('returns 500 when SES send fails', async () => {
    ses.on(SendEmailCommand).rejects(new Error('SES down'));
    const res = await handleIngest(event(), deps());
    expect(res.statusCode).toBe(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run test/ingest/handler.test.ts`
Expected: FAIL — current `handleIngest` signature expects `{ s3, doc, sqs }` clients; SES/secrets deps don't match.

- [ ] **Step 3: Rewrite the handler**

```typescript
// backend/src/ingest/handler.ts
import type { SESClient } from '@aws-sdk/client-ses';
import type { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { SESClient as SES } from '@aws-sdk/client-ses';
import { SecretsManagerClient as SM } from '@aws-sdk/client-secrets-manager';

import type { ContactSubmission } from '../shared/types';
import { isHoneypotTripped, isTooFast, isValidEmail, isValidMessage, sanitizeName } from '../shared/validation';
import { extractClientIp } from './ip';
import { getSecret } from '../shared/secrets';
import { sendContactEmail } from './email';

export interface IngestEnv {
  FROM_EMAIL: string;                 // verified SES identity (noreply@<domain>)
  CONTACT_EMAIL_SECRET_ARN: string;   // Secrets Manager ARN holding the recipient address
}

export interface IngestDeps {
  env: IngestEnv;
  clients: { ses: SESClient; secrets: SecretsManagerClient };
  now: () => number;
}

interface FunctionUrlEvent {
  headers: Record<string, string | undefined>;
  body?: string;
}
interface FunctionUrlResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

function json(statusCode: number, payload: unknown): FunctionUrlResult {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
}

export async function handleIngest(event: FunctionUrlEvent, deps: IngestDeps): Promise<FunctionUrlResult> {
  const { env, clients, now } = deps;

  // Snapshot now() once — reused for time-trap and createdAt.
  const ts = now();

  let parsed: unknown;
  try {
    parsed = JSON.parse(event.body ?? '');
  } catch {
    return json(400, { error: 'Invalid request' });
  }
  if (typeof parsed !== 'object' || parsed === null) return json(400, { error: 'Invalid request' });
  const sub = parsed as Partial<ContactSubmission>;

  // Layer 2: honeypot — silently accept (200) so bots get no signal, but send nothing.
  if (isHoneypotTripped(sub)) return json(200, { ok: true });

  // Layer 3: time-trap.
  if (typeof sub.formTimestamp !== 'number' || isTooFast(sub.formTimestamp, ts)) {
    return json(400, { error: 'Submission too fast' });
  }

  // Layer 5: field validation.
  if (typeof sub.email !== 'string' || !isValidEmail(sub.email)) return json(400, { error: 'Invalid email' });
  if (typeof sub.name !== 'string' || sub.name.trim().length === 0) return json(400, { error: 'Invalid name' });
  if (!isValidMessage(sub.message)) return json(400, { error: 'Invalid message' });

  // NOTE: CAPTCHA + rate-limiting are enforced by AWS WAF at the edge before the request
  // reaches this Lambda. There is no token check and no per-IP counter here.

  const name = sanitizeName(sub.name);
  const email = sub.email.toLowerCase();
  const message: string = sub.message as string;
  const ip = extractClientIp(event.headers);
  const createdAt = new Date(ts).toISOString();

  const to = await getSecret(clients.secrets, env.CONTACT_EMAIL_SECRET_ARN);

  try {
    await sendContactEmail(clients.ses, { from: env.FROM_EMAIL, to, replyTo: email, name, email, message, ip, createdAt });
  } catch {
    return json(500, { error: 'Failed to send message' });
  }

  return json(200, { ok: true });
}

// --- Lambda entrypoint (constructs real clients once per container) ---
const env: IngestEnv = {
  FROM_EMAIL: process.env.FROM_EMAIL!,
  CONTACT_EMAIL_SECRET_ARN: process.env.CONTACT_EMAIL_SECRET_ARN!,
};
const clients = { ses: new SES({}), secrets: new SM({}) };

export const handler = (event: FunctionUrlEvent): Promise<FunctionUrlResult> =>
  handleIngest(event, { env, clients, now: () => Date.now() });
```

- [ ] **Step 4: Run the handler test to verify it passes**

Run: `cd backend && npx vitest run test/ingest/handler.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/ingest/handler.ts backend/test/ingest/handler.test.ts
git commit -m "refactor(backend): ingest Lambda sends one email via SES; WAF owns CAPTCHA + rate limit"
```

### Task A4: Delete the persistence/queue/notifier modules and their tests

**Files:**
- Delete: `backend/src/ingest/store.ts`, `backend/src/ingest/enqueue.ts`, `backend/src/ingest/rateLimit.ts`
- Delete: `backend/src/notifier/handler.ts`, `backend/src/notifier/digest.ts`, `backend/src/notifier/email.ts`
- Delete: `backend/test/ingest/store.test.ts`, `backend/test/ingest/enqueue.test.ts`, `backend/test/ingest/rateLimit.test.ts`
- Delete: `backend/test/notifier/handler.test.ts`, `backend/test/notifier/digest.test.ts`, `backend/test/notifier/email.test.ts`

- [ ] **Step 1: Remove the files**

```bash
cd backend
git rm src/ingest/store.ts src/ingest/enqueue.ts src/ingest/rateLimit.ts
git rm -r src/notifier
git rm test/ingest/store.test.ts test/ingest/enqueue.test.ts test/ingest/rateLimit.test.ts
git rm -r test/notifier
```

- [ ] **Step 2: Confirm no dangling imports remain**

Run: `cd backend && grep -rn "store\|enqueue\|rateLimit\|notifier\|StoredMessage\|ContactRecord\|NotificationMessage" src/ test/`
Expected: no matches (empty output).

- [ ] **Step 3: Commit**

```bash
git commit -m "chore(backend): drop S3/DynamoDB/SQS/notifier modules now that SES send is inline"
```

### Task A5: Prune backend dependencies + build script

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Remove the notifier build script and unused AWS SDK deps**

Replace the `scripts` and `dependencies` blocks with:

```json
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "build:ingest": "esbuild src/ingest/handler.ts --bundle --platform=node --target=node20 --format=esm --outfile=dist/ingest/index.mjs --banner:js=\"import{createRequire}from'module';const require=createRequire(import.meta.url);\"",
    "build": "npm run build:ingest"
  },
  "dependencies": {
    "@aws-sdk/client-ses": "^3.700.0",
    "@aws-sdk/client-secrets-manager": "^3.700.0"
  },
```

(Leave `devDependencies` unchanged.)

- [ ] **Step 2: Regenerate the lockfile**

Run: `cd backend && npm install`
Expected: `package-lock.json` updates; no errors.

- [ ] **Step 3: Type-check, build, and run the full backend suite**

Run: `cd backend && npm run typecheck && npm run build && npm test`
Expected: typecheck clean; `dist/ingest/index.mjs` produced; all tests PASS (handler, email, validation, ip, secrets). No `dist/notifier`.

- [ ] **Step 4: Commit**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "chore(backend): drop dynamodb/s3/sqs SDKs and notifier build target"
```

---

## Phase B — Simplify the backend Terraform

### Task B1: Delete the DynamoDB / SQS / S3-messages resources

**Files:**
- Delete: `terraform/dynamodb.tf`, `terraform/sqs.tf`, `terraform/s3_messages.tf`

- [ ] **Step 1: Remove the files**

```bash
cd terraform
git rm dynamodb.tf sqs.tf s3_messages.tf
```

- [ ] **Step 2: Commit** (validation happens after B2/B3 wire the references out)

```bash
git commit -m "chore(tf): remove contacts/rate-limit tables, SQS, and message bucket"
```

### Task B2: Reduce `lambda.tf` to the single ingest Lambda

**Files:**
- Modify: `terraform/lambda.tf`

- [ ] **Step 1: Replace the file contents**

```hcl
# Zip the ingest bundle. The bundle file is index.mjs at the zip root; ESM handler = "index.handler".
data "archive_file" "ingest" {
  type        = "zip"
  source_file = "${path.module}/../backend/dist/ingest/index.mjs"
  output_path = "${path.module}/.build/ingest.zip"
}

resource "aws_lambda_function" "ingest" {
  function_name    = "${local.name_prefix}-ingest"
  role             = aws_iam_role.ingest.arn
  runtime          = "nodejs20.x"
  handler          = "index.handler"
  filename         = data.archive_file.ingest.output_path
  source_code_hash = data.archive_file.ingest.output_base64sha256
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      FROM_EMAIL               = local.from_email
      CONTACT_EMAIL_SECRET_ARN = aws_secretsmanager_secret.contact_email.arn
    }
  }
}

# Function URL, IAM-locked. CloudFront OAC (owned by the infra repo) signs requests to it;
# direct public calls stay blocked. The cloudfront.amazonaws.com invoke grant is added in
# permissions.tf (Phase F) once /portfolio/<env>/cloudfront-distribution-arn exists in SSM.
resource "aws_lambda_function_url" "ingest" {
  function_name      = aws_lambda_function.ingest.function_name
  authorization_type = "AWS_IAM"
}
```

- [ ] **Step 2: Commit**

```bash
git add terraform/lambda.tf
git commit -m "refactor(tf): single ingest Lambda emailing via SES; drop notifier + event-source mapping"
```

### Task B3: Reduce `iam.tf` to the ingest role (SES + Secrets)

**Files:**
- Modify: `terraform/iam.tf`

- [ ] **Step 1: Replace the file contents**

```hcl
data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# --- Ingest Lambda role ---
resource "aws_iam_role" "ingest" {
  name               = "${local.name_prefix}-ingest"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role_policy_attachment" "ingest_logs" {
  role       = aws_iam_role.ingest.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Exactly what the handler does: send one SES email from the verified identity, and read the
# recipient address from Secrets Manager. No S3/DynamoDB/SQS.
data "aws_iam_policy_document" "ingest" {
  statement {
    sid       = "SendEmail"
    actions   = ["ses:SendEmail", "ses:SendRawEmail"]
    resources = ["*"] # SES SendEmail does not support resource-level ARNs for the action itself
    condition {
      test     = "StringEquals"
      variable = "ses:FromAddress"
      values   = [local.from_email]
    }
  }
  statement {
    sid       = "ReadContactEmailSecret"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.contact_email.arn]
  }
}

resource "aws_iam_role_policy" "ingest" {
  name   = "${local.name_prefix}-ingest"
  role   = aws_iam_role.ingest.id
  policy = data.aws_iam_policy_document.ingest.json
}
```

- [ ] **Step 2: Commit**

```bash
git add terraform/iam.tf
git commit -m "refactor(tf): ingest role grants SES send + secret read only; remove notifier role"
```

### Task B4: Prune `outputs.tf` to the surviving resources

**Files:**
- Modify: `terraform/outputs.tf`

- [ ] **Step 1: Replace the file contents** (Cloudflare/Turnstile/notifier outputs are removed; the `pages_url`/`worker_url` outputs stay until Phase G when their resources are deleted, but the simplified backend no longer has notifier/queue/table outputs)

```hcl
# Cloudflare outputs remain until Phase G (retire) removes their resources.
output "pages_url" {
  description = "Cloudflare Pages deployment URL (canonical .pages.dev domain)"
  value       = "https://${cloudflare_pages_project.portfolio.name}.pages.dev"
}

output "custom_domain_url" {
  description = "Custom domain URL for the portfolio (trystan-tbm.dev)"
  value       = "https://${var.domain_name}"
}

# --- AWS contact backend ---
output "ingest_function_url" {
  description = "Lambda Function URL for the ingest handler (IAM-auth; fronted by CloudFront OAC)"
  value       = aws_lambda_function_url.ingest.function_url
}

output "ingest_function_name" {
  description = "Ingest Lambda function name (for `aws lambda invoke` testing)"
  value       = aws_lambda_function.ingest.function_name
}

output "ingest_function_url_ssm_param" {
  description = "SSM parameter name where the ingest Function URL is published for the infra repo"
  value       = aws_ssm_parameter.ingest_function_url.name
}
```

- [ ] **Step 2: Commit**

```bash
git add terraform/outputs.tf
git commit -m "chore(tf): prune outputs to surviving backend resources"
```

---

## Phase C — Per-env state backend (per-account bucket + DynamoDB lock)

### Task C1: Rewrite `backend.tf` as a partial S3 backend

**Files:**
- Modify: `terraform/backend.tf`

- [ ] **Step 1: Replace the file contents**

```hcl
# Remote backend — AWS S3, one state object per environment in that env's OWN account.
#
# dev  -> bucket shadowspire-dev-state-176355979099  (account 176355979099)
# prod -> bucket shadowspire-prod-state-681053994223 (account 681053994223)
#
# Because dev and prod are separate AWS accounts, each env's portfolio-deploy role can only
# reach its own state bucket. So `bucket` and `dynamodb_table` are NOT hardcoded here — they
# are supplied per-env at init via partial backend config:
#
#   tofu init -backend-config=backend-dev.hcl     # or backend-prod.hcl
#
# State locking uses the env's shadowspire-<env>-tf-lock DynamoDB table.
terraform {
  backend "s3" {
    key     = "portfolio/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
    # bucket         = (per-env, via -backend-config)
    # dynamodb_table = (per-env, via -backend-config)
  }
}
```

- [ ] **Step 2: Create `terraform/backend-dev.hcl`**

```hcl
bucket         = "shadowspire-dev-state-176355979099"
dynamodb_table = "shadowspire-dev-tf-lock"
key            = "portfolio/terraform.tfstate"
region         = "us-east-1"
encrypt        = true
```

- [ ] **Step 3: Create `terraform/backend-prod.hcl`**

```hcl
bucket         = "shadowspire-prod-state-681053994223"
dynamodb_table = "shadowspire-prod-tf-lock"
key            = "portfolio/terraform.tfstate"
region         = "us-east-1"
encrypt        = true
```

- [ ] **Step 4: Verify config parses without a backend (no creds needed)**

Run: `cd terraform && tofu fmt -recursive && tofu init -backend=false && tofu validate`
Expected: format clean, init OK, `Success! The configuration is valid.` (validate does not need the Lambda zip).

- [ ] **Step 5: Commit**

```bash
git add terraform/backend.tf terraform/backend-dev.hcl terraform/backend-prod.hcl
git commit -m "feat(tf): per-env S3 backend with DynamoDB lock (drop workspaces + use_lockfile)"
```

> **State migration note (manual, dev first):** The previous backend used `use_lockfile` + workspaces under a `TF_STATE_BUCKET`. Since Phase B tears down most resources anyway, treat DEV as a fresh init: `cd terraform && tofu init -reconfigure -backend-config=backend-dev.hcl`. If the old DEV state holds resources you want to keep, instead run a one-time `tofu init -migrate-state -backend-config=backend-dev.hcl` and review the diff before the first apply. Do PROD only after DEV is verified end-to-end.

---

## Phase D — Phase-1 handshake: `environment` var + publish ingest Function URL

### Task D1: Add the `environment` variable

**Files:**
- Modify: `terraform/variables.tf`

- [ ] **Step 1: Append the variable**

```hcl
variable "environment" {
  description = "Deployment environment; drives SSM parameter paths (/portfolio/<env>/*)"
  type        = string

  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment must be \"dev\" or \"prod\"."
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add terraform/variables.tf
git commit -m "feat(tf): add validated environment variable for SSM path scoping"
```

### Task D2: Publish `/portfolio/<env>/ingest-function-url` to SSM

**Files:**
- Create: `terraform/ssm.tf`

- [ ] **Step 1: Create the file**

```hcl
# Phase 1 publish: the infra repo reads this to wire CloudFront's /api/* origin to the
# Lambda Function URL. String (not SecureString) — a Function URL is not a secret.
resource "aws_ssm_parameter" "ingest_function_url" {
  name        = "/portfolio/${var.environment}/ingest-function-url"
  type        = "String"
  value       = aws_lambda_function_url.ingest.function_url
  description = "Portfolio contact ingest Lambda Function URL (published for the infra repo)"
}
```

- [ ] **Step 2: Validate**

Run: `cd terraform && tofu fmt && tofu init -backend=false && tofu validate`
Expected: valid.

- [ ] **Step 3: Commit**

```bash
git add terraform/ssm.tf
git commit -m "feat(tf): publish ingest Function URL to /portfolio/<env>/ingest-function-url (Phase 1 handshake)"
```

### Task D3: Update `terraform.tfvars.example` for the new inputs

**Files:**
- Modify: `terraform/terraform.tfvars.example`

- [ ] **Step 1: Set the example to the minimal inputs the simplified config needs**

```hcl
# Copy to terraform.tfvars (gitignored) and fill in. Region is fixed to us-east-1 in code.

# Selects which env's SSM paths/resources this apply targets. Must be "dev" or "prod".
environment = "dev"

# Recipient address for contact emails (stored in Secrets Manager, never in plaintext code).
contact_email = "trystan.tbm@gmail.com"

# Cloudflare — required ONLY for the SES DKIM CNAMEs (DNS still lives in the Cloudflare zone).
cloudflare_api_token = "..."
cloudflare_zone_id   = "..."

# domain_name defaults to trystan-tbm.dev; override only if needed.
# domain_name = "trystan-tbm.dev"
```

> **Note for retire phase:** `cloudflare_account_id`, `turnstile_site_key`, and `turnstile_secret_key` are removed from `variables.tf` in Phase G; keep them in your real `terraform.tfvars` only until then.

- [ ] **Step 2: Commit**

```bash
git add terraform/terraform.tfvars.example
git commit -m "docs(tf): update tfvars example to simplified backend inputs"
```

---

## Phase E — CI: build + apply the backend, then deploy the site

### Task E1: Add backend build + `tofu apply` to `deploy.yml`

**Files:**
- Modify: `.github/workflows/deploy.yml`

- [ ] **Step 1: In the `deploy-dev` job, insert backend build + apply steps between "Configure AWS credentials" and "Read WAF CAPTCHA integration URL"**

Add these steps (use `backend-dev.hcl` and `-var environment=dev`):

```yaml
      - name: Build contact Lambda bundle
        working-directory: backend
        run: |
          npm ci
          npm run build

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: "1.12.1"

      - name: Apply backend Terraform (dev)
        working-directory: terraform
        run: |
          tofu init -reconfigure -backend-config=backend-dev.hcl
          tofu apply -auto-approve -var "environment=dev" -var "contact_email=${{ secrets.CONTACT_EMAIL }}" -var "cloudflare_api_token=${{ secrets.CLOUDFLARE_API_TOKEN }}" -var "cloudflare_zone_id=${{ secrets.CLOUDFLARE_ZONE_ID }}"
```

- [ ] **Step 2: Mirror the same two steps into the `deploy-prod` job**, using `backend-prod.hcl` and `-var "environment=prod"`.

- [ ] **Step 3: Validate the workflow YAML locally**

Run: `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/deploy.yml')); print('ok')"`
Expected: `ok`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci(deploy): build + tofu apply contact Lambda before syncing the site (per-env backend)"
```

> **Required GitHub secrets** (per environment `dev`/`production`): `CONTACT_EMAIL`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`. The deploy role + OIDC already authenticate AWS. Leave a note for the user in Phase H.

### Task E2: Smoke-test the simplified backend in DEV (manual gate)

**Files:** none (operational verification)

- [ ] **Step 1: Open a PR to `main`** so the `deploy-dev` job runs (OIDC sub `repo:Grimm07/portfolio:environment:dev`).

- [ ] **Step 2: Confirm the apply published the SSM param**

Run (locally, dev profile): `aws ssm get-parameter --profile shadowspire-dev --region us-east-1 --name /portfolio/dev/ingest-function-url --query Parameter.Value --output text`
Expected: a `https://<id>.lambda-url.us-east-1.on.aws/` URL.

- [ ] **Step 3: Confirm the Function URL is NOT publicly invocable**

Run: `curl -s -o /dev/null -w "%{http_code}\n" -X POST "<that URL>" -H 'content-type: application/json' -d '{}'`
Expected: `403` (AWS_IAM auth — no SigV4 signature).

- [ ] **Step 4: Direct-invoke the Lambda to confirm SES send path** (dev profile, bypasses the URL auth)

Run:
```bash
aws lambda invoke --profile shadowspire-dev --region us-east-1 \
  --function-name portfolio-contact-ingest \
  --cli-binary-format raw-in-base64-out \
  --payload '{"headers":{"x-forwarded-for":"1.2.3.4"},"body":"{\"name\":\"Smoke Test\",\"email\":\"trystan.tbm@gmail.com\",\"message\":\"backend smoke test message\",\"website\":\"\",\"formTimestamp\":0}"}' \
  /tmp/out.json && cat /tmp/out.json
```
Expected: `{"statusCode":200,...}` and an email arrives at trystan.tbm@gmail.com. (If SES sandbox blocks it, verify `trystan.tbm@gmail.com` first — see Phase H manual steps.)

- [ ] **Step 5: STOP — hand off to the infra owner.** Tell them `/portfolio/dev/ingest-function-url` exists; they run Phase 2 (`enable_contact_api=true`, apply, publish `cloudfront-distribution-arn` + `waf-integration-url` + `waf-api-key`). Do not start Phase F until those three params exist.

---

## Phase F — (After infra Phase 2) authorize CloudFront + verify frontend

### Task F1: Grant CloudFront OAC permission to invoke the Function URL

**Files:**
- Create: `terraform/permissions.tf`

- [ ] **Step 1: Confirm the infra params exist first**

Run: `aws ssm get-parameter --profile shadowspire-dev --region us-east-1 --name /portfolio/dev/cloudfront-distribution-arn --query Parameter.Value --output text`
Expected: `arn:aws:cloudfront::176355979099:distribution/EGFCTGJJEER89`. (If `ParameterNotFound`, Phase 2 is not done — STOP.)

- [ ] **Step 2: Create the file**

```hcl
# Phase 3 wiring: allow CloudFront (OAC, SigV4) to invoke the IAM-auth Function URL, scoped to
# THIS env's distribution. Without this, OAC-signed requests get 403. The dist ARN is read from
# SSM (published by the infra repo in Phase 2) with no default, so a missing param fails loudly.
data "aws_ssm_parameter" "cf_arn" {
  name = "/portfolio/${var.environment}/cloudfront-distribution-arn"
}

resource "aws_lambda_permission" "cf_invoke_url" {
  statement_id           = "AllowCloudFrontOACInvokeUrl"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.ingest.function_name
  principal              = "cloudfront.amazonaws.com"
  source_arn             = data.aws_ssm_parameter.cf_arn.value
  function_url_auth_type = "AWS_IAM"
}
```

- [ ] **Step 3: Validate**

Run: `cd terraform && tofu fmt && tofu init -backend=false && tofu validate`
Expected: valid.

- [ ] **Step 4: Commit**

```bash
git add terraform/permissions.tf
git commit -m "feat(tf): allow CloudFront OAC to invoke the ingest Function URL (Phase 3)"
```

### Task F2: Apply to DEV and verify the end-to-end edge path

**Files:** none (operational)

- [ ] **Step 1: Apply** (via a PR running `deploy-dev`, or locally with the dev backend)

Run (local path): `cd terraform && tofu init -reconfigure -backend-config=backend-dev.hcl && tofu apply -var environment=dev`
Expected: creates `aws_lambda_permission.cf_invoke_url`.

- [ ] **Step 2: Verify CAPTCHA challenge with no token**

Run: `curl -s -i -X POST https://dev.trystan-tbm.dev/api/contact -H 'content-type: application/json' -d '{"name":"x","email":"x@y.co","message":"edge test message","website":"","formTimestamp":0}' | head -20`
Expected: a WAF CAPTCHA challenge response (HTTP 405/202 with `x-amzn-waf-action: captcha` or a challenge body), NOT a 200 — confirming WAF intercepts before the Lambda.

- [ ] **Step 3: Verify the real form** — open https://dev.trystan-tbm.dev, submit the contact form, solve the CAPTCHA if shown, confirm an email arrives at trystan.tbm@gmail.com.

### Task F3: Verify the frontend WAF token mode against the infra rule

**Files:** `src/components/Contact.tsx` (read-only verification; edit only if mismatch)

- [ ] **Step 1: Confirm the WAF rule's token source.** `Contact.tsx` sends the token as the `x-aws-waf-token` header (and the SDK also sets the `aws-waf-token` cookie). Confirm with the infra owner that the WAF web ACL association inspects the header/cookie the SDK provides on same-origin POSTs.
- [ ] **Step 2:** If the infra rule requires cookie-only, drop the explicit header in `Contact.tsx` (the SDK cookie suffices). Otherwise no change. Re-run the form test from F2 Step 3.

---

## Phase G — Retire Cloudflare (only after AWS verified in DEV + PROD)

### Task G1: Remove the Cloudflare Worker project

**Files:**
- Delete: `worker/` (entire directory)

- [ ] **Step 1: Remove it**

```bash
git rm -r worker
```

- [ ] **Step 2: Commit**

```bash
git commit -m "chore: remove Cloudflare Worker (contact handled by AWS Lambda)"
```

### Task G2: Strip Cloudflare Pages/Worker/DNS from `terraform/main.tf`

**Files:**
- Modify: `terraform/main.tf`

- [ ] **Step 1: Replace the file with providers-only** (keep `cloudflare` provider + `required_providers` for the SES DKIM CNAMEs in `ses.tf`; remove Pages project, Pages domain, the `@`/`www` DNS records, and all Worker resources)

```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.16"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.6"
    }
  }
}

# Cloudflare is retained ONLY to manage the SES DKIM CNAME records in the zone (see ses.tf).
# The apex/www/dev hostnames now point at CloudFront and are managed by the infra repo.
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
```

- [ ] **Step 2: Remove the now-orphaned Cloudflare outputs** in `terraform/outputs.tf` (delete the `pages_url` and `custom_domain_url` blocks added in B4; keep the three AWS outputs).

- [ ] **Step 3: Remove unused Cloudflare/Turnstile variables** in `terraform/variables.tf` (delete `cloudflare_account_id`, `turnstile_site_key`, `turnstile_secret_key`; KEEP `cloudflare_api_token`, `cloudflare_zone_id`, `contact_email`, `domain_name`, `aws_region`, `environment`).

- [ ] **Step 4: Validate**

Run: `cd terraform && tofu fmt -recursive && tofu init -backend=false && tofu validate`
Expected: valid. (`tflint` should also pass: `tflint --init && tflint --format compact`.)

- [ ] **Step 5: Apply to DEV then PROD to destroy the Pages project, custom domain, and the `@`/`www` `.pages.dev` CNAMEs**

Run (dev): `tofu init -reconfigure -backend-config=backend-dev.hcl && tofu apply -var environment=dev`
Run (prod): `tofu init -reconfigure -backend-config=backend-prod.hcl && tofu apply -var environment=prod`
Expected plan: destroys `cloudflare_pages_project`, `cloudflare_pages_domain`, `cloudflare_dns_record.pages_root`, `cloudflare_dns_record.pages_www`, and all `cloudflare_worker*` resources; SES DKIM records remain.

> **Manual gate:** the apex domain must be detached from the Cloudflare Pages project in the dashboard (the user) and infra must already point apex/www/dev at CloudFront, or the site goes down. Do PROD apply only after confirming infra's CloudFront DNS is live.

- [ ] **Step 6: Commit**

```bash
git add terraform/main.tf terraform/outputs.tf terraform/variables.tf
git commit -m "chore(tf): retire Cloudflare Pages/Worker/DNS; keep provider only for SES DKIM"
```

### Task G3: Drop the worker jobs from `ci.yml`

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Remove the worker steps** — in the `build` job delete "Install worker dependencies", "Worker type check", "Build worker", and the "Upload worker build" artifact step. In `security-audit` delete the "Audit worker" step. In the `terraform` job delete the "Download worker build" step (the Lambda bundle is not needed for `tofu validate`).

- [ ] **Step 2: Validate the YAML**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('ok')"`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: drop Cloudflare Worker build/test/audit steps"
```

### Task G4: Update docs + delete leftover Cloudflare/Turnstile references

**Files:**
- Modify: `CLAUDE.md`, `.env.example`, `DEPLOYMENT_CHECKLIST.md`

- [ ] **Step 1: Rewrite the `CLAUDE.md` "Project Overview" + "Architecture" + "Security/Env" sections** to describe the AWS topology: React+Vite → S3 + CloudFront (infra-owned, OAC), contact via `portfolio-contact-ingest` Lambda behind an `AWS_IAM` Function URL fronted by CloudFront with WAF CAPTCHA, SES email, Terraform in `terraform/` with per-env `-backend-config`. Remove the Cloudflare Pages/Worker/Turnstile/MailChannels guidance and the "Build Worker before applying Terraform" note.

- [ ] **Step 2: Edit `.env.example`** — keep `VITE_WAF_INTEGRATION_URL`; remove `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` (no longer used by the frontend) and any Turnstile/Worker references.

- [ ] **Step 3: Update `DEPLOYMENT_CHECKLIST.md`** to the AWS flow (OIDC, GitHub Environments, per-env `tofu apply`, S3 sync + CloudFront invalidate).

- [ ] **Step 4: Grep for stragglers**

Run: `grep -rniE "turnstile|mailchannels|wrangler|pages\.dev|cloudflare_pages|cloudflare_worker" src/ terraform/ .github/ *.md`
Expected: only intentional mentions (e.g. SES DKIM/`cloudflare_dns_record` in `ses.tf`, historical plan docs). No live Turnstile/MailChannels/Worker references.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md .env.example DEPLOYMENT_CHECKLIST.md
git commit -m "docs: describe AWS contact architecture; remove Cloudflare/Turnstile/MailChannels"
```

### Task G5: Delete Cloudflare/Turnstile/MailChannels secrets (manual, user)

**Files:** none (GitHub + Cloudflare console)

- [ ] **Step 1:** In GitHub repo settings, delete `CF_API_TOKEN`/`CLOUDFLARE_API_TOKEN` (if only used by removed Pages deploy), Turnstile, and MailChannels secrets that are no longer referenced. **Keep** `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ZONE_ID` if `deploy.yml`'s `tofu apply` still manages SES DKIM (it does, per E1).
- [ ] **Step 2:** Revoke the old Turnstile keys in the Cloudflare dashboard.

---

## Phase H — Acceptance verification + runbook

### Task H1: Run the acceptance checklist (DEV and PROD)

**Files:** none

- [ ] For each host (`dev.trystan-tbm.dev`, `trystan-tbm.dev`):
  - [ ] `curl -sI https://<host>/` serves the React build from S3 via CloudFront over HTTPS (200, `x-cache`/CloudFront headers).
  - [ ] `POST /api/contact` with **no** `aws-waf-token` → WAF CAPTCHA challenge at the edge (not 200).
  - [ ] Real form submit with a solved token → email arrives at trystan.tbm@gmail.com.
  - [ ] The Lambda Function URL is **not** directly invocable (`curl -X POST <function-url>` → 403).
  - [ ] No Cloudflare Worker/Pages/Turnstile/MailChannels remain; no long-lived AWS keys in any workflow (`grep -rn "aws_access_key_id\|AWS_SECRET_ACCESS_KEY" .github/` → empty).

### Task H2: Write the runbook + leave manual steps for the user

**Files:**
- Create: `docs/runbooks/aws-contact-backend.md`

- [ ] **Step 1: Document** the per-env `tofu init -backend-config=backend-<env>.hcl` + `apply -var environment=<env>` flow, the SSM handshake (publish `ingest-function-url`; read `cloudfront-distribution-arn`/`waf-integration-url`/`waf-api-key`), the SES sandbox note (request production access only if emailing non-verified recipients), and rollback (re-point DNS, re-enable old path) — and the open manual items:
  - **SES verification:** confirm `trystan.tbm@gmail.com` recipient identity (one-time click) and that the domain DKIM CNAMEs resolved; request SES production access only if recipients beyond the verified inbox are ever needed.
  - **GitHub Environments:** create `dev` and `production` (production: required reviewers + restrict to `main`) — names MUST match the OIDC subjects.
  - **Apex Pages detach:** detach the apex from the Cloudflare Pages project (dashboard) once infra points apex/www/dev at CloudFront.
  - **GitHub secrets:** add `CONTACT_EMAIL`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID` to both Environments.

- [ ] **Step 2: Commit**

```bash
git add docs/runbooks/aws-contact-backend.md
git commit -m "docs: AWS contact backend runbook + outstanding manual steps"
```

---

## Self-Review (against the brief)

**Spec coverage:**
- Phase 1 (Lambda + Function URL + SES + publish) → Phases A, B, D, E. ✔
- Keep Worker security layers minus Turnstile/throttle → A3 (honeypot, time-trap, validation; WAF owns CAPTCHA + rate limit). ✔
- SES domain + DKIM + recipient verify → existing `ses.tf` kept; manual verify in H2. ✔
- Function URL `AWS_IAM` → B2. ✔
- Publish `ingest-function-url` String → D2. ✔
- Phase 3 `aws_lambda_permission` from `cf-arn` (no default, fail loud) → F1. ✔
- Frontend WAF SDK + same-origin POST + remove Turnstile → already done; verified in F3; Turnstile env removed in G4. ✔
- Frontend deploy Pages→S3+CloudFront via OIDC, dev/prod environments → existing `deploy.yml` + backend apply added in E1. ✔
- New AWS Terraform with S3 backend per env + DynamoDB lock, us-east-1, IAM `portfolio-contact-` prefix → C1 + existing `local.name_prefix`. ✔ (kept in `terraform/`, not a new `aws/` root, per decision 1).
- Retire Cloudflare (Worker/Pages/Turnstile/MailChannels/CF terraform), keep DNS zone → Phase G. ✔
- Constraints (no S3 website hosting, don't touch dist/WAF/site bucket, 403/404→error.html unchanged, IAM-only URL, us-east-1) → not violated; no resource here creates the distribution/bucket/WAF. ✔
- Report layout + SSM params + manual steps → H2 runbook. ✔

**Placeholder scan:** No TBD/"handle errors"/"similar to" — every code/edit step carries full content or an exact command + expected output.

**Type consistency:** `handleIngest(event, { env:{FROM_EMAIL,CONTACT_EMAIL_SECRET_ARN}, clients:{ses,secrets}, now })` is used identically in A3 handler + test; `sendContactEmail(ses, ContactEmailArgs)` matches A2 impl + test; `getSecret(secrets, arn)` and `__clearSecretCache()` match the kept `secrets.ts`; `aws_secretsmanager_secret.contact_email.arn`, `aws_lambda_function.ingest`, `local.from_email`, `local.name_prefix`, `var.environment` are consistent across `lambda.tf`/`iam.tf`/`ssm.tf`/`permissions.tf`.

**Known caveat surfaced (not a gap):** State migration from the old `use_lockfile`/workspace backend is a manual, dev-first operation (note under C1) — intentionally not automated to avoid clobbering existing state.
