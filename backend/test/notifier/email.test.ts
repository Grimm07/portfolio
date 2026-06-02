import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { sendDigestEmail } from '../../src/notifier/email';

const sesMock = mockClient(SESClient);

describe('sendDigestEmail', () => {
  beforeEach(() => sesMock.reset());
  it('sends with From, To, Reply-To, subject and body', async () => {
    sesMock.on(SendEmailCommand).resolves({ MessageId: 'm1' });
    const ses = new SESClient({});
    await sendDigestEmail(ses, {
      from: 'noreply@example.com', to: 'me@example.com',
      digest: { subject: 'Subj', body: 'Body', replyTo: 'sender@x.co' },
    });
    const input = sesMock.commandCalls(SendEmailCommand)[0].args[0].input;
    expect(input.Source).toBe('noreply@example.com');
    expect(input.Destination?.ToAddresses).toEqual(['me@example.com']);
    expect(input.ReplyToAddresses).toEqual(['sender@x.co']);
    expect(input.Message?.Subject?.Data).toBe('Subj');
    expect(input.Message?.Body?.Text?.Data).toBe('Body');
  });
});
