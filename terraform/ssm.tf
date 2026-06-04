# Phase 1 publish: the infra repo reads this to wire CloudFront's /api/* origin to the
# Lambda Function URL. String (not SecureString) — a Function URL is not a secret.
resource "aws_ssm_parameter" "ingest_function_url" {
  name        = "/portfolio/${var.environment}/ingest-function-url"
  type        = "String"
  value       = aws_lambda_function_url.ingest.function_url
  description = "Portfolio contact ingest Lambda Function URL (published for the infra repo)"
}

# The Lambda ARN, for the infra repo to reference the function directly (e.g. CloudFront
# origin / OAC wiring). String (not SecureString) — an ARN is not a secret.
resource "aws_ssm_parameter" "ingest_function_arn" {
  name        = "/portfolio/${var.environment}/ingest-function-arn"
  type        = "String"
  value       = aws_lambda_function.ingest.arn
  description = "Portfolio contact ingest Lambda ARN (published for the infra repo)"
}
