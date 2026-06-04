# --- AWS contact backend ---
output "ingest_function_url" {
  description = "Lambda Function URL for the ingest handler (IAM-auth; fronted by CloudFront OAC)"
  value       = aws_lambda_function_url.ingest.function_url
}

output "ingest_function_name" {
  description = "Ingest Lambda function name (for `aws lambda invoke` testing)"
  value       = aws_lambda_function.ingest.function_name
}

output "ingest_function_url_ssm_param" {
  description = "SSM parameter name where the ingest Function URL is published for the infra repo"
  value       = aws_ssm_parameter.ingest_function_url.name
}
