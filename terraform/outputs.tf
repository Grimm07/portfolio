output "custom_domain_url" {
  description = "Custom domain URL for the portfolio (trystan-tbm.dev)"
  value       = "https://${var.domain_name}"
}

output "www_domain_url" {
  description = "WWW subdomain URL (www.trystan-tbm.dev)"
  value       = "https://www.${var.domain_name}"
}


output "ingest_function_url" {
  description = "Lambda Function URL for the ingest handler (IAM-auth; fronted by CloudFront in Plan 2b)"
  value       = aws_lambda_function_url.ingest.function_url
}

output "ingest_function_name" {
  description = "Ingest Lambda function name (for aws lambda invoke testing)"
  value       = aws_lambda_function.ingest.function_name
}

output "notifications_queue_url" {
  description = "SQS notifications queue URL"
  value       = aws_sqs_queue.notifications.url
}

output "messages_bucket" {
  description = "S3 bucket holding contact message bodies"
  value       = aws_s3_bucket.messages.id
}

output "contacts_table" {
  description = "DynamoDB contacts table name"
  value       = aws_dynamodb_table.contacts.name
}

# --- Plan 2b edge outputs (interface contract; consumed by Plans 2c and 3) ---

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (2c: cache invalidation; 3: RUM linkage)"
  value       = aws_cloudfront_distribution.site.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain (*.cloudfront.net) — 2c retargets DNS to this; verify here pre-cutover"
  value       = aws_cloudfront_distribution.site.domain_name
}

output "cloudfront_arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.site.arn
}

output "site_bucket" {
  description = "Static-site S3 bucket name (2c: aws s3 sync target)"
  value       = aws_s3_bucket.site.id
}

output "acm_certificate_arn" {
  description = "ACM certificate ARN backing the distribution (internal to 2b)"
  value       = aws_acm_certificate_validation.site.certificate_arn
}

output "waf_web_acl_arn" {
  description = "Edge WAF WebACL ARN (3: optional RUM<->WAF link)"
  value       = aws_wafv2_web_acl.edge.arn
}

output "waf_captcha_api_key" {
  description = "WAF CAPTCHA API key for the frontend JS SDK (2c)"
  value       = aws_wafv2_api_key.captcha.api_key
  sensitive   = true
}

output "waf_captcha_integration_url" {
  description = "WAF CAPTCHA JS SDK integration URL for the frontend (2c)"
  value       = "https://${aws_wafv2_web_acl.edge.name}.${aws_wafv2_web_acl.edge.id}.sdk.awswaf.com/${aws_wafv2_web_acl.edge.id}/${aws_wafv2_api_key.captcha.api_key}/jsapi.js"
  # Embeds the CAPTCHA api_key (a sensitive attribute), so the output must be sensitive.
  # 2c reads it via `tofu output -raw waf_captcha_integration_url` for the frontend build.
  sensitive = true
}
