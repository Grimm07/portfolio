/** Raw JSON body posted by the contact form. */
export interface ContactSubmission {
  name: string;
  email: string;
  message: string;
  website: string;        // honeypot — must be empty
  turnstileToken: string;
  formTimestamp: number;  // ms epoch when the form was rendered
}

/** Message persisted to S3 (the full body). */
export interface StoredMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;      // ISO-8601
  ip: string;             // raw client IP
  userAgent: string;
}

/** Pointer + metadata persisted to DynamoDB (no message body). */
export interface ContactRecord {
  pk: string;             // EMAIL#<lowercased email>
  sk: string;             // SUB#<ISO timestamp>#<id>
  gsi1pk: string;         // "ALL"
  gsi1sk: string;         // createdAt
  id: string;
  name: string;
  email: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  s3Bucket: string;
  s3Key: string;
  status: 'new';
}

/** Minimal message placed on SQS for the notifier. */
export interface NotificationMessage {
  id: string;
  email: string;
  s3Bucket: string;
  s3Key: string;
}
