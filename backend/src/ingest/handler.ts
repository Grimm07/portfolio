// backend/src/ingest/handler.ts
import type { S3Client } from '@aws-sdk/client-s3';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { SQSClient } from '@aws-sdk/client-sqs';
import { S3Client as S3 } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient as Doc } from '@aws-sdk/lib-dynamodb';
import { SQSClient as SQS } from '@aws-sdk/client-sqs';

import type { ContactSubmission, StoredMessage, ContactRecord, NotificationMessage } from '../shared/types';
import { isHoneypotTripped, isTooFast, isValidEmail, sanitizeName, MAX_MESSAGE } from '../shared/validation';
import { extractClientIp } from './ip';
import { checkRateLimit } from './rateLimit';
import { putMessageBody, putContactRecord } from './store';
import { enqueueNotification } from './enqueue';

export interface IngestEnv {
  MESSAGES_BUCKET: string;
  CONTACTS_TABLE: string;
  RATE_LIMIT_TABLE: string;
  NOTIFICATION_QUEUE_URL: string;
}

export interface IngestDeps {
  env: IngestEnv;
  clients: { s3: S3Client; doc: DynamoDBDocumentClient; sqs: SQSClient };
  now: () => number;
  uuid: () => string;
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
  const { env, clients, now, uuid } = deps;

  let sub: ContactSubmission;
  try {
    sub = JSON.parse(event.body ?? '') as ContactSubmission;
  } catch {
    return json(400, { error: 'Invalid request' });
  }

  // Layer 2: honeypot — silently accept (200) so bots get no signal, but persist nothing.
  if (isHoneypotTripped(sub)) return json(200, { ok: true });

  // Layer 3: time-trap.
  if (typeof sub.formTimestamp !== 'number' || isTooFast(sub.formTimestamp, now())) {
    return json(400, { error: 'Submission too fast' });
  }

  // Layer 5: email shape (cheap) before the network call.
  if (!isValidEmail(sub.email)) return json(400, { error: 'Invalid email' });
  if (!sub.message || sub.message.length > MAX_MESSAGE) return json(400, { error: 'Invalid message' });

  const ip = extractClientIp(event.headers);

  // NOTE: CAPTCHA (human verification) is enforced by AWS WAF at the edge before the
  // request reaches this Lambda — there is no token check here.

  // Layer 1: rate limit (after cheap checks, before writes).
  const nowSec = Math.floor(now() / 1000);
  if (!(await checkRateLimit(clients.doc, env.RATE_LIMIT_TABLE, ip, nowSec))) {
    return json(429, { error: 'Too many requests' });
  }

  // Persist.
  const id = uuid();
  const createdAt = new Date(now()).toISOString();
  const name = sanitizeName(sub.name);
  const email = sub.email.toLowerCase();

  const message: StoredMessage = { id, name, email, message: sub.message, createdAt, ip, userAgent: event.headers['user-agent'] ?? '' };
  const s3Key = await putMessageBody(clients.s3, env.MESSAGES_BUCKET, message);

  const record: ContactRecord = {
    pk: `EMAIL#${email}`, sk: `SUB#${createdAt}#${id}`, gsi1pk: 'ALL', gsi1sk: createdAt,
    id, name, email, ip, userAgent: message.userAgent, createdAt,
    s3Bucket: env.MESSAGES_BUCKET, s3Key, status: 'new',
  };
  await putContactRecord(clients.doc, env.CONTACTS_TABLE, record);

  const note: NotificationMessage = { id, email, s3Bucket: env.MESSAGES_BUCKET, s3Key };
  await enqueueNotification(clients.sqs, env.NOTIFICATION_QUEUE_URL, note);

  return json(200, { ok: true });
}

// --- Lambda entrypoint (constructs real clients once per container) ---
const env: IngestEnv = {
  MESSAGES_BUCKET: process.env.MESSAGES_BUCKET!,
  CONTACTS_TABLE: process.env.CONTACTS_TABLE!,
  RATE_LIMIT_TABLE: process.env.RATE_LIMIT_TABLE!,
  NOTIFICATION_QUEUE_URL: process.env.NOTIFICATION_QUEUE_URL!,
};
const clients = {
  s3: new S3({}),
  doc: Doc.from(new DynamoDBClient({})),
  sqs: new SQS({}),
};

export const handler = (event: FunctionUrlEvent): Promise<FunctionUrlResult> =>
  handleIngest(event, { env, clients, now: () => Date.now(), uuid: () => crypto.randomUUID() });
