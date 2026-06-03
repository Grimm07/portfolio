import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { handleNotify } from '../../src/notifier/handler';
import type { StoredMessage } from '../../src/shared/types';

const s3 = mockClient(S3Client);
const ses = mockClient(SESClient);

const ENV = { CONTACT_EMAIL: 'me@example.com', FROM_EMAIL: 'noreply@example.com' };

function record(id: string, key: string) {
  return {
    messageId: id,
    body: JSON.stringify({ id, email: `${id}@x.co`, s3Bucket: 'bucket', s3Key: key }),
  };
}
function stored(id: string): StoredMessage {
  return { id, name: `N-${id}`, email: `${id}@x.co`, message: `msg-${id}`,
    createdAt: '2026-06-02T12:00:00.000Z', ip: '1.2.3.4', userAgent: 'UA' };
}
// aws-sdk-client-mock returns a body with transformToString() for GetObject.
function s3Body(obj: unknown) {
  return { Body: { transformToString: async () => JSON.stringify(obj) } } as never;
}

const deps = () => ({ env: ENV, clients: { s3: new S3Client({}), ses: new SESClient({}) } });

beforeEach(() => {
  s3.reset(); ses.reset();
  ses.on(SendEmailCommand).resolves({ MessageId: 'm1' });
});

describe('handleNotify', () => {
  it('sends ONE digest for a batch and reports no failures', async () => {
    s3.on(GetObjectCommand, { Key: 'k-a' }).resolves(s3Body(stored('a')));
    s3.on(GetObjectCommand, { Key: 'k-b' }).resolves(s3Body(stored('b')));
    const res = await handleNotify({ Records: [record('a', 'k-a'), record('b', 'k-b')] } as never, deps());
    expect(ses.commandCalls(SendEmailCommand)).toHaveLength(1);
    expect(res.batchItemFailures).toEqual([]);
  });

  it('reports a record whose S3 fetch fails, still sends the rest', async () => {
    s3.on(GetObjectCommand, { Key: 'k-a' }).resolves(s3Body(stored('a')));
    s3.on(GetObjectCommand, { Key: 'k-bad' }).rejects(new Error('missing'));
    const res = await handleNotify({ Records: [record('a', 'k-a'), record('bad', 'k-bad')] } as never, deps());
    expect(ses.commandCalls(SendEmailCommand)).toHaveLength(1); // digest of the 1 good record
    expect(res.batchItemFailures).toEqual([{ itemIdentifier: 'bad' }]);
  });

  it('reports ALL records as failures when the SES send throws', async () => {
    s3.on(GetObjectCommand, { Key: 'k-a' }).resolves(s3Body(stored('a')));
    ses.on(SendEmailCommand).rejects(new Error('ses down'));
    const res = await handleNotify({ Records: [record('a', 'k-a')] } as never, deps());
    expect(res.batchItemFailures).toEqual([{ itemIdentifier: 'a' }]);
  });
});
