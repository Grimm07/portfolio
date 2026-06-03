output "pages_url" {
  description = "Cloudflare Pages deployment URL (canonical .pages.dev domain)"
  value       = "https://${cloudflare_pages_project.portfolio.name}.pages.dev"
}

output "custom_domain_url" {
  description = "Custom domain URL for the portfolio (trystan-tbm.dev)"
  value       = "https://${var.domain_name}"
}

output "www_domain_url" {
  description = "WWW subdomain URL (www.trystan-tbm.dev)"
  value       = "https://www.${var.domain_name}"
}

output "worker_url" {
  description = "Cloudflare Worker endpoint URL for testing contact form submissions"
  value       = "https://${var.domain_name}/api/contact"
}

output "turnstile_site_key" {
  description = "Turnstile site key for frontend .env configuration"
  value       = var.turnstile_site_key
  sensitive   = false
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
