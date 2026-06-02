// backend/src/notifier/handler.ts
import type { S3Client } from '@aws-sdk/client-s3';
import type { SESClient } from '@aws-sdk/client-ses';
import { S3Client as S3, GetObjectCommand } from '@aws-sdk/client-s3';
import { SESClient as SES } from '@aws-sdk/client-ses';
import type { StoredMessage, NotificationMessage } from '../shared/types';
import { composeDigest } from './digest';
import { sendDigestEmail } from './email';

export interface NotifyEnv { CONTACT_EMAIL: string; FROM_EMAIL: string; }
export interface NotifyDeps { env: NotifyEnv; clients: { s3: S3Client; ses: SESClient }; }

interface SQSRecord { messageId: string; body: string; }
interface SQSEvent { Records: SQSRecord[]; }
interface BatchResponse { batchItemFailures: { itemIdentifier: string }[]; }

async function loadMessage(s3: S3Client, note: NotificationMessage): Promise<StoredMessage> {
  const res = await s3.send(new GetObjectCommand({ Bucket: note.s3Bucket, Key: note.s3Key }));
  const text = await (res.Body as { transformToString: () => Promise<string> }).transformToString();
  return JSON.parse(text) as StoredMessage;
}

export async function handleNotify(event: SQSEvent, deps: NotifyDeps): Promise<BatchResponse> {
  const { clients, env } = deps;
  const failures: { itemIdentifier: string }[] = [];
  const loaded: { messageId: string; msg: StoredMessage }[] = [];

  // Load each record's body; a record that fails to load is an individual failure.
  for (const r of event.Records) {
    try {
      const note = JSON.parse(r.body) as NotificationMessage;
      loaded.push({ messageId: r.messageId, msg: await loadMessage(clients.s3, note) });
    } catch {
      failures.push({ itemIdentifier: r.messageId });
    }
  }

  if (loaded.length === 0) return { batchItemFailures: failures };

  // One digest for the whole batch. If the send fails, every loaded record must retry.
  try {
    const digest = composeDigest(loaded.map((l) => l.msg));
    await sendDigestEmail(clients.ses, { from: env.FROM_EMAIL, to: env.CONTACT_EMAIL, digest });
  } catch {
    for (const l of loaded) failures.push({ itemIdentifier: l.messageId });
  }

  return { batchItemFailures: failures };
}

// --- Lambda entrypoint ---
// CONTACT_EMAIL is resolved from Secrets Manager (cached per container by getSecret);
// FROM_EMAIL (noreply@<domain>) is non-sensitive and stays an env var.
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { getSecret } from '../shared/secrets';

const FROM_EMAIL = process.env.FROM_EMAIL!;
const CONTACT_EMAIL_SECRET_ARN = process.env.CONTACT_EMAIL_SECRET_ARN!;
const clients = { s3: new S3({}), ses: new SES({}) };
const secrets = new SecretsManagerClient({});

export const handler = async (event: SQSEvent): Promise<BatchResponse> => {
  const contactEmail = await getSecret(secrets, CONTACT_EMAIL_SECRET_ARN);
  return handleNotify(event, { env: { CONTACT_EMAIL: contactEmail, FROM_EMAIL }, clients });
};
