// backend/src/ingest/store.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { StoredMessage, ContactRecord } from '../shared/types';

/** messages/{yyyy}/{mm}/{id}.json from the message's createdAt. */
export function messageKey(msg: StoredMessage): string {
  const d = new Date(msg.createdAt);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `messages/${yyyy}/${mm}/${msg.id}.json`;
}

export async function putMessageBody(
  s3: S3Client,
  bucket: string,
  msg: StoredMessage,
): Promise<string> {
  const key = messageKey(msg);
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(msg),
      ContentType: 'application/json',
    }),
  );
  return key;
}

export async function putContactRecord(
  doc: DynamoDBDocumentClient,
  table: string,
  record: ContactRecord,
): Promise<void> {
  await doc.send(new PutCommand({ TableName: table, Item: record }));
}
