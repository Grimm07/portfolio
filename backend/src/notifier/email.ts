// backend/src/notifier/email.ts
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import type { Digest } from './digest';

export interface SendArgs {
  from: string;
  to: string;
  digest: Digest;
}

export async function sendDigestEmail(ses: SESClient, args: SendArgs): Promise<void> {
  await ses.send(
    new SendEmailCommand({
      Source: args.from,
      Destination: { ToAddresses: [args.to] },
      ReplyToAddresses: [args.digest.replyTo],
      Message: {
        Subject: { Data: args.digest.subject },
        Body: { Text: { Data: args.digest.body } },
      },
    }),
  );
}
