// backend/src/ingest/ip.ts
type Headers = Record<string, string | undefined>;

/** CloudFront-Viewer-Address is "<ip>:<port>"; the port is after the LAST colon. */
function stripPort(value: string): string {
  const i = value.lastIndexOf(':');
  return i === -1 ? value : value.slice(0, i);
}

export function extractClientIp(headers: Headers): string {
  const viewer = headers['cloudfront-viewer-address'];
  if (viewer) return stripPort(viewer.trim());

  const xff = headers['x-forwarded-for'];
  if (xff) return xff.split(',')[0].trim();

  return 'unknown';
}
