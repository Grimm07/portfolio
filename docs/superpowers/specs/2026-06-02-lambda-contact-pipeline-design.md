# Design: Contact backend → AWS Lambda ingestion pipeline

- **Date:** 2026-06-02
- **Status:** Approved design (pre-implementation)
- **Supersedes decision:** "keep the Worker on Cloudflare for now" — the contact backend moves off Cloudflare Workers to AWS.
- **Related:** Cloudflare→hybrid CDN migration (Cloudflare DNS + AWS CloudFront/S3). This backend work shares that migration's CloudFront distribution and AWS/Cloudflare Terraform providers.
- **Deferred:** OpenTelemetry tracing design (rebases onto Lambda; see §8).

## 1. Goal & scope

Replace the Cloudflare Worker contact-form handler (`worker/src/index.ts`) with an AWS serverless **contact-ingestion pipeline** that:

1. Accepts contact submissions behind CloudFront (same-origin `/api/*`), preserving the existing frontend contract.
2. Runs the existing security layers (honeypot, time-trap, Turnstile, email validation, rate limiting) — with rate limiting now *actually* correct.
3. **Persists every submission**: message body in S3, a per-person contact record + S3 pointer in DynamoDB.
4. **Batches bursts** of submissions into a single notification email via SQS + SES (async; never blocks the user response).
5. Manages secrets via **AWS Secrets Manager**.

Out of scope (separate follow-ups): the static-hosting/CDN cutover itself, and the OpenTelemetry tracing rebase.

## 2. Architecture overview

Two decoupled paths. **Ingest** is synchronous (browser-facing, fast, durable). **Notify** is asynchronous (batched email).

```
                       ┌──────── CloudFront (trystan-tbm.dev, ACM) ────────┐
 Browser ─ GET / ─────►│ behavior *      → S3 origin (OAC)  → static SPA     │
 Browser ─ POST /api/*►│ behavior /api/* → Lambda origin (OAC, no cache)    │
                       └───────────────────────┬───────────────────────────┘
                                               ▼
                              ┌─ INGEST Lambda (Node, Function URL/IAM) ─┐
   WAF rate rule on CF ──────►│ honeypot · time-trap · Turnstile · email │
   (coarse per-IP)            │ validate · DynamoDB rate-counter (3/hr)   │
                              │ ① S3 PutObject  body                      │
                              │ ② Dynamo PutItem  record + s3 pointer     │
                              │ ③ SQS SendMessage  {id, email}            │
                              │ ④ 200 → browser                           │
                              └───────────────────────┬──────────────────┘
                                                      ▼
                                  SQS (BatchWindow 300s, BatchSize N) + DLQ
                                                      ▼
                              ┌─ NOTIFIER Lambda (batch handler) ─┐
                              │ load records → compose ONE digest │──► SES ──► your inbox
                              │ ReportBatchItemFailures → DLQ      │
                              └────────────────────────────────────┘

 Secrets Manager: TURNSTILE_SECRET_KEY, CONTACT_EMAIL  (fetched via Secrets Lambda Extension, cached)
 SES auth: via Lambda IAM role (no stored credential)
```

## 3. Decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| API fronting | **CloudFront `/api/*` → Lambda Function URL** (IAM auth + OAC, `AllViewerExceptHostHeader` origin request policy, caching disabled) | Same-origin → no CORS, no frontend change, one domain/cert. Function URL locked so it can't be hit directly bypassing CloudFront/WAF. |
| Email provider | **Amazon SES** | AWS-native, IAM auth (no stored credential), ~free at this volume. Both sender (domain) and recipient (your inbox) are verifiable → stays in **sandbox**, no production-access ticket. |
| Email delivery | **Async via SQS, batched** | Ingest returns 200 immediately; SES hiccups never fail a submission. |
| Batch window | **~300s (5 min) max**, `ReportBatchItemFailures` | Maximize burst collapsing into one email; 5-min notification latency acceptable. |
| Contact data model | **Per-person, with history** (single-table) | Matches "record of everyone who contacted us"; query a person's history or list everyone. |
| Message storage | **Body in S3, pointer in DynamoDB** | Keeps Dynamo items small; bodies can be long. |
| Rate limiting | **WAF rate rule (edge) + DynamoDB precise counter (3/hr/IP)** | Belt-and-suspenders; finally a correct, shared limit (in-memory Map never worked across isolates). |
| Secrets | **AWS Secrets Manager** (+ Secrets Lambda Extension cache) | TURNSTILE_SECRET_KEY + CONTACT_EMAIL kept out of env/git. |
| Client IP | **`X-Forwarded-For` / `CloudFront-Viewer-Address`** | Replaces `CF-Connecting-IP`. |
| IaC | **Terraform** (extends the Cloudflare+AWS config from the CDN migration) | One tool for Cloudflare DNS + AWS resources. |
| Retention | **Keep indefinitely**, encrypted at rest | User wants a durable record; TTL/lifecycle can be added later. |

## 4. Components

| Component | Responsibility | Key IAM (least privilege) |
|---|---|---|
| **Ingest Lambda** (`backend/ingest/`) | Validation (ported from `worker/src/index.ts`), persist S3 + Dynamo, rate-counter, enqueue SQS, return 200. IP from XFF/viewer-address. | `s3:PutObject` (messages/*), `dynamodb:PutItem/UpdateItem` (contacts, rate-limits), `sqs:SendMessage`, `secretsmanager:GetSecretValue` (specific ARNs) |
| **Notifier Lambda** (`backend/notifier/`) | SQS batch consumer; aggregate the window's submissions into one SES digest. Partial-failure aware. | `sqs:ReceiveMessage/DeleteMessage`, `s3:GetObject` (messages/*), `dynamodb:GetItem/Query`, `ses:SendEmail`, `secretsmanager:GetSecretValue` (CONTACT_EMAIL) |
| **S3 bucket** `…-contact-messages` | Private (Block-Public-Access + OAC), SSE-S3. Object per submission. | — |
| **DynamoDB** `contacts` | Per-person contact records + S3 pointers. On-demand, PITR on, SSE on. | — |
| **DynamoDB** `rate-limits` | IP→count, TTL-expiring (1h). Conditional counter. | — |
| **SQS** `contact-notifications` + **DLQ** | Decouple email from ingest; DLQ for poison messages. | — |
| **SES** | Domain identity (DKIM) + verified recipient; sends digest. | — |
| **WAF WebACL** (CloudFront scope) | Rate-based rule for volumetric protection. | — |
| **Secrets Manager** | `TURNSTILE_SECRET_KEY`, `CONTACT_EMAIL`. Values injected out-of-band (not committed). | — |

## 5. Data flow

### Ingest (synchronous, per submission)
1. CloudFront `/api/*` → Ingest Lambda (Function URL).
2. Extract client IP from `X-Forwarded-For` / `CloudFront-Viewer-Address`.
3. Validate: honeypot (`website` empty) → time-trap (≥3s) → Turnstile verify (secret from Secrets Manager, cached) → email format.
4. Rate limit: conditional update on `rate-limits` (`PK=IP#<hash>`, TTL=now+1h); reject if >3 in window.
5. Generate `id` (UUID v4).
6. `PutObject` body → S3 `messages/{yyyy}/{mm}/{id}.json`.
7. `PutItem` → `contacts` (record + `s3Key`).
8. `SendMessage` → SQS `{id, email}`.
9. Return `200 {ok:true}` (or the existing error shapes on failure — **no frontend contract change**).

Persist-before-enqueue: if SQS send fails after S3+Dynamo writes, the record still exists and is reconcilable; email failure never affects the user's 200.

### Notify (asynchronous, per batch)
1. SQS delivers up to `BatchSize` records collected over ≤300s.
2. Notifier loads each `{id,email}` (+ Dynamo/S3 record as needed).
3. Compose **one** digest email ("N new contacts in the last 5 min" + each name / email / message).
4. `ses:SendEmail` with `From: noreply@<site-domain>`, `Reply-To:` the contact's email.
5. Per-item failures → `ReportBatchItemFailures` re-queues only failures; repeated failures → DLQ; CloudWatch alarm on DLQ depth.

## 6. Data model (per-person, with history)

### `contacts` table (single-table)
```
PK  = EMAIL#<lowercased email>
SK  = SUB#<ISO-8601 timestamp>#<id>     ← one item per submission
attrs: name, ipHash, userAgent, createdAt, s3Bucket, s3Key, status
GSI1: GSI1PK = "ALL", GSI1SK = createdAt   ← list everyone / recent contacts
```
- A person's full history: `Query PK = EMAIL#…`.
- All/recent contacts: `Query GSI1 where GSI1PK="ALL"` ordered by `createdAt`.
- Message body is **not** in Dynamo — only the `s3Key` pointer.

### S3 layout
```
messages/{yyyy}/{mm}/{id}.json  =  { name, email, message, createdAt, meta }
```
- SSE-S3, Block-Public-Access. This bucket is **never** served through CloudFront (it holds private submission data); the Notifier reads bodies via the AWS SDK only. (Distinct from the static-site bucket, which uses CloudFront + OAC.)

### `rate-limits` table
```
PK = IP#<hash>
attrs: count, windowStart
TTL = expiresAt (now + 1h)   ← DynamoDB TTL auto-evicts
```

## 7. Security & privacy

- **Edge (WAF):** rate-based rule on the CloudFront WebACL throttles volumetric floods before Lambda.
- **Precise (DynamoDB):** conditional-update counter enforces 3/hour/IP — a correct, shared limit.
- **Function URL lockdown:** `AuthType=AWS_IAM` + CloudFront OAC (SigV4-signed origin requests) so the raw `*.lambda-url…on.aws` host can't be hit directly.
- **PII minimization:** client IP stored **hashed**; S3/Dynamo encrypted at rest (default); Block-Public-Access; least-privilege IAM per Lambda; `CONTACT_EMAIL` in Secrets Manager, not env/git. Honors the project's privacy-first posture (SECURITY.md).
- **Secrets:** `TURNSTILE_SECRET_KEY` + `CONTACT_EMAIL` in Secrets Manager, fetched via the **AWS Parameters and Secrets Lambda Extension** (cached per container) to avoid per-invocation fetch latency/cost. SES uses the Lambda **IAM role**, no stored credential.

## 8. Tracing rebase (deferred)

Backend on Lambda changes OTel from `@microlabs/otel-cf-workers` to the **ADOT Lambda layer** (auto-spans for the handler + AWS SDK calls → S3/Dynamo/SQS/SES appear as child spans), exporting OTLP to Honeycomb. The browser's Worker-OTLP-proxy is replaced by either a tiny **collector behind CloudFront `/api/v1/traces`** or a reconsideration of **AWS-native RUM + X-Ray** (now a natural fit). **Designed separately**; the paused OTel tasks resume after this backend lands.

## 9. IaC & deployment

- **Terraform**, extending the Cloudflare (DNS/DKIM) + AWS (with `us-east-1` alias for the CloudFront ACM cert) providers introduced by the CDN migration. One tool, one `apply`.
- **Build:** Lambdas bundled with esbuild (same toolchain as the Worker) → zip → `aws_lambda_function`.
- **Secrets:** `aws_secretsmanager_secret` + `aws_secretsmanager_secret_version`; values supplied out-of-band (consistent with the existing gitignored-tfvars / env-secret pattern).
- **CI** (`.github/workflows/ci.yml`): add an AWS **OIDC** role (`id-token: write`); deploy = build Lambdas + `terraform apply` + frontend `aws s3 sync` + CloudFront invalidation. `VITE_TURNSTILE_SITE_KEY` still embedded at build time.

## 10. Error handling & resilience

- Ingest persists to S3+Dynamo **before** enqueuing; SQS-send failure leaves a reconcilable record.
- Notifier: `ReportBatchItemFailures` (partial-batch retry) + **DLQ** for poison messages; CloudWatch alarm on DLQ depth.
- SES throttling/bounce: retried via SQS visibility timeout; bounces/complaints optionally routed to an SNS topic (future).

## 11. Testing

- **Unit (vitest):** ported validation logic (reuse existing tests); rate-counter conditional logic (allow/limit/expiry); digest composition (N records → one email); IP extraction from XFF; Secrets Manager fetch+cache wrapper.
- **Integration (local):** LocalStack or AWS SDK mocks for S3/Dynamo/SQS/SES/Secrets Manager; assert ingest writes all three + returns 200; notifier composes one email per batch; partial-failure path re-queues correctly.
- **Contract:** existing `Contact.test.tsx` stays green (frontend unchanged — same `/api/contact`, same response shapes).

## 12. Cutover sequencing (rollback at each step)

1. Stand up S3/Dynamo/SQS/SES/Lambdas/WAF/Secrets in AWS (not wired to DNS). Verify via Function URL / CloudFront test domain. **Rollback:** destroy new resources; nothing user-facing changed.
2. Verify SES DKIM + recipient; send a test digest. **Rollback:** none needed.
3. Add `/api/*` behavior to CloudFront → Lambda. Test `https://<cf-domain>/api/contact` end-to-end (submission lands in S3+Dynamo, digest arrives). **Rollback:** remove the behavior.
4. Cut DNS to CloudFront (CDN migration step). Worker still exists as rollback.
5. Soak; confirm submissions + digests + rate limiting. Then decommission the Worker + MailChannels. **Rollback window closes here.**

## 13. Open items / assumptions

- IaC = Terraform (one tool with DNS/CDN work). *(Confirm; alternative SAM/CDK.)*
- Retention = keep indefinitely, encrypted. *(TTL/lifecycle addable later.)*
- Tracing deferred to its own design.
- SQS `BatchSize` exact value (e.g., 10) tuned during implementation.
