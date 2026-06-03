// backend/src/ingest/enqueue.ts
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import type { NotificationMessage } from '../shared/types';

export async function enqueueNotification(
  sqs: SQSClient,
  queueUrl: string,
  note: NotificationMessage,
): Promise<void> {
  await sqs.send(new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: JSON.stringify(note) }));
}
