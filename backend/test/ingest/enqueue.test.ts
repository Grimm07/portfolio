import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { enqueueNotification } from '../../src/ingest/enqueue';
import type { NotificationMessage } from '../../src/shared/types';

const sqsMock = mockClient(SQSClient);

describe('enqueueNotification', () => {
  beforeEach(() => sqsMock.reset());
  it('sends the notification message JSON to the queue', async () => {
    sqsMock.on(SendMessageCommand).resolves({ MessageId: 'm1' });
    const sqs = new SQSClient({});
    const note: NotificationMessage = {
      id: 'abc', email: 'a@b.co', s3Bucket: 'bucket', s3Key: 'messages/2026/06/abc.json',
    };
    await enqueueNotification(sqs, 'https://sqs/q', note);
    const call = sqsMock.commandCalls(SendMessageCommand)[0].args[0].input;
    expect(call.QueueUrl).toBe('https://sqs/q');
    expect(JSON.parse(call.MessageBody as string)).toEqual(note);
  });
});
