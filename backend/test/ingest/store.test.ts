import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { putMessageBody, putContactRecord, messageKey } from '../../src/ingest/store';
import type { StoredMessage, ContactRecord } from '../../src/shared/types';

const s3Mock = mockClient(S3Client);
const ddbMock = mockClient(DynamoDBDocumentClient);

const msg: StoredMessage = {
  id: 'abc', name: 'Alice', email: 'a@b.co', message: 'hi',
  createdAt: '2026-06-02T12:00:00.000Z', ip: '1.2.3.4', userAgent: 'UA',
};

describe('messageKey', () => {
  it('partitions by year/month from createdAt', () => {
    expect(messageKey(msg)).toBe('messages/2026/06/abc.json');
  });
});

describe('putMessageBody', () => {
  beforeEach(() => s3Mock.reset());
  it('writes the JSON body to the computed key', async () => {
    s3Mock.on(PutObjectCommand).resolves({});
    const s3 = new S3Client({});
    const key = await putMessageBody(s3, 'bucket', msg);
    expect(key).toBe('messages/2026/06/abc.json');
    const call = s3Mock.commandCalls(PutObjectCommand)[0].args[0].input;
    expect(call.Bucket).toBe('bucket');
    expect(call.Key).toBe('messages/2026/06/abc.json');
    expect(JSON.parse(call.Body as string)).toMatchObject({ id: 'abc', email: 'a@b.co' });
  });
});

describe('putContactRecord', () => {
  beforeEach(() => ddbMock.reset());
  it('writes the per-person record', async () => {
    ddbMock.on(PutCommand).resolves({});
    const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));
    const rec: ContactRecord = {
      pk: 'EMAIL#a@b.co', sk: 'SUB#2026-06-02T12:00:00.000Z#abc',
      gsi1pk: 'ALL', gsi1sk: '2026-06-02T12:00:00.000Z',
      id: 'abc', name: 'Alice', email: 'a@b.co', ip: '1.2.3.4', userAgent: 'UA',
      createdAt: '2026-06-02T12:00:00.000Z', s3Bucket: 'bucket',
      s3Key: 'messages/2026/06/abc.json', status: 'new',
    };
    await putContactRecord(doc, 'contacts', rec);
    const call = ddbMock.commandCalls(PutCommand)[0].args[0].input;
    expect(call.TableName).toBe('contacts');
    expect((call.Item as ContactRecord).pk).toBe('EMAIL#a@b.co');
  });
});
