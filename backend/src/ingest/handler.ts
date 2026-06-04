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
