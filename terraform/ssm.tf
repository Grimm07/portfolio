# Phase 1 publish: the infra repo reads this to wire CloudFront's /api/* origin to the
# Lambda Function URL. String (not SecureString) — a Function URL is not a secret.
resource "aws_ssm_parameter" "ingest_function_url" {
  name        = "/portfolio/${var.environment}/ingest-function-url"
  type        = "String"
  value       = aws_lambda_function_url.ingest.function_url
  description = "Portfolio contact ingest Lambda Function URL (published for the infra repo)"
}
