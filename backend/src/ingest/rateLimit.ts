// backend/src/ingest/rateLimit.ts
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

export const RATE_LIMIT_MAX = 3;
export const RATE_LIMIT_WINDOW_S = 3600;

/**
 * Returns true if the request is allowed. Atomically increments a per-IP counter
 * with a condition that blocks the (MAX+1)th request inside the window. The item
 * carries a TTL so DynamoDB evicts it after the window, resetting the counter.
 */
export async function checkRateLimit(
  doc: DynamoDBDocumentClient,
  table: string,
  ip: string,
  nowSec: number,
): Promise<boolean> {
  try {
    await doc.send(
      new UpdateCommand({
        TableName: table,
        Key: { pk: `IP#${ip}` },
        UpdateExpression:
          'SET #c = if_not_exists(#c, :zero) + :one, expiresAt = if_not_exists(expiresAt, :exp)',
        ConditionExpression: 'attribute_not_exists(#c) OR #c < :max',
        ExpressionAttributeNames: { '#c': 'count' },
        ExpressionAttributeValues: {
          ':zero': 0,
          ':one': 1,
          ':max': RATE_LIMIT_MAX,
          ':exp': nowSec + RATE_LIMIT_WINDOW_S,
        },
      }),
    );
    return true;
  } catch (e) {
    if (e instanceof Error && e.name === 'ConditionalCheckFailedException') return false;
    throw e;
  }
}
