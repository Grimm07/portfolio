#!/usr/bin/env bash
# Upload the built SPA to the static-site S3 bucket and invalidate CloudFront.
# Replaces `wrangler pages deploy` after the Plan 2c cutover. Env-aware: SITE_BUCKET and
# DISTRIBUTION_ID come from `tofu output` (per active workspace) or CI secrets.
set -euo pipefail
: "${SITE_BUCKET:?set SITE_BUCKET (tofu output -raw site_bucket)}"
: "${DISTRIBUTION_ID:?set DISTRIBUTION_ID (tofu output -raw cloudfront_distribution_id)}"

aws s3 sync dist/ "s3://${SITE_BUCKET}" --delete
aws cloudfront create-invalidation --distribution-id "${DISTRIBUTION_ID}" --paths "/*"
