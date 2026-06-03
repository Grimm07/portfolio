// backend/src/notifier/digest.ts
import type { StoredMessage } from '../shared/types';

export interface Digest {
  subject: string;
  body: string;
  replyTo: string;
}

export function composeDigest(messages: StoredMessage[]): Digest {
  const n = messages.length;
  const subject = `Portfolio: ${n} new contact submission${n === 1 ? '' : 's'}`;

  const body = messages
    .map(
      (m, i) =>
        `#${i + 1} — ${m.name} <${m.email}> at ${m.createdAt} (ip ${m.ip})\n${m.message}\n`,
    )
    .join('\n----------------------------------------\n');

  return { subject, body, replyTo: messages[0].email };
}
