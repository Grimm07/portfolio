import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { checkRateLimit, RATE_LIMIT_MAX } from '../../src/ingest/rateLimit';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('checkRateLimit', () => {
  beforeEach(() => ddbMock.reset());

  it('allows when the conditional update succeeds', async () => {
    ddbMock.on(UpdateCommand).resolves({});
    const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));
    expect(await checkRateLimit(doc, 'rate-limits', '1.2.3.4', 1000)).toBe(true);
  });

  it('denies when the condition fails (limit reached)', async () => {
    const err = new Error('limit');
    err.name = 'ConditionalCheckFailedException';
    ddbMock.on(UpdateCommand).rejects(err);
    const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));
    expect(await checkRateLimit(doc, 'rate-limits', '1.2.3.4', 1000)).toBe(false);
  });

  it('re-throws unexpected errors', async () => {
    ddbMock.on(UpdateCommand).rejects(new Error('boom'));
    const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}));
    await expect(checkRateLimit(doc, 'rate-limits', '1.2.3.4', 1000)).rejects.toThrow('boom');
  });

  it('exposes the limit as 3', () => {
    expect(RATE_LIMIT_MAX).toBe(3);
  });
});
