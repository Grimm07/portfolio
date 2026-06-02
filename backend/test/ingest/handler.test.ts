import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { handleIngest } from '../../src/ingest/handler';

const s3 = mockClient(S3Client);
const ddb = mockClient(DynamoDBDocumentClient);
const sqs = mockClient(SQSClient);

// CAPTCHA is enforced by AWS WAF at the edge — the Lambda does NOT verify a token,
// so there is no Secrets Manager client and no fetch stub here.
const ENV = {
  MESSAGES_BUCKET: 'bucket', CONTACTS_TABLE: 'contacts', RATE_LIMIT_TABLE: 'rate-limits',
  NOTIFICATION_QUEUE_URL: 'https://sqs/q',
};

// A valid submission: honeypot empty, old enough timestamp. No turnstileToken (WAF handles CAPTCHA).
function event(overrides: Record<string, unknown> = {}) {
  const body = JSON.stringify({
    name: 'Alice', email: 'a@b.co', message: 'hello there',
    website: '', formTimestamp: 0, ...overrides,
  });
  return {
    headers: { 'x-forwarded-for': '1.2.3.4', 'user-agent': 'UA' },
    body,
  } as never;
}

const deps = () => ({
  env: ENV,
  clients: {
    s3: new S3Client({}), doc: DynamoDBDocumentClient.from(new DynamoDBClient({})), sqs: new SQSClient({}),
  },
  now: () => 10_000, // 10s > MIN_FORM_TIME_MS past formTimestamp=0
  uuid: () => 'fixed-id',
});

beforeEach(() => {
  s3.reset(); ddb.reset(); sqs.reset();
  ddb.on(UpdateCommand).resolves({});
  ddb.on(PutCommand).resolves({});
  s3.on(PutObjectCommand).resolves({});
  sqs.on(SendMessageCommand).resolves({ MessageId: 'm1' });
});

describe('handleIngest', () => {
  it('persists, enqueues, and returns 200 for a valid submission', async () => {
    const res = await handleIngest(event(), deps());
    expect(res.statusCode).toBe(200);
    expect(s3.commandCalls(PutObjectCommand)).toHaveLength(1);
    expect(ddb.commandCalls(PutCommand)).toHaveLength(1);     // contact record
    expect(sqs.commandCalls(SendMessageCommand)).toHaveLength(1);
  });

  it('rejects a tripped honeypot with 200 but no persistence (silent)', async () => {
    const res = await handleIngest(event({ website: 'spam' }), deps());
    expect(res.statusCode).toBe(200);
    expect(s3.commandCalls(PutObjectCommand)).toHaveLength(0);
    expect(sqs.commandCalls(SendMessageCommand)).toHaveLength(0);
  });

  it('rejects too-fast submissions with 400', async () => {
    const d = deps(); d.now = () => 1000; // 1s after formTimestamp=0
    const res = await handleIngest(event(), d);
    expect(res.statusCode).toBe(400);
    expect(s3.commandCalls(PutObjectCommand)).toHaveLength(0);
  });

  it('rejects invalid email with 400', async () => {
    const res = await handleIngest(event({ email: 'nope' }), deps());
    expect(res.statusCode).toBe(400);
  });

  it('returns 429 when rate limited', async () => {
    const err = new Error('limit'); err.name = 'ConditionalCheckFailedException';
    ddb.on(UpdateCommand).rejects(err);
    const res = await handleIngest(event(), deps());
    expect(res.statusCode).toBe(429);
    expect(s3.commandCalls(PutObjectCommand)).toHaveLength(0);
  });

  it('returns 400 on malformed JSON', async () => {
    const bad = { headers: {}, body: '{not json' } as never;
    const res = await handleIngest(bad, deps());
    expect(res.statusCode).toBe(400);
  });
});
