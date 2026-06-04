# Zip the ingest bundle. The bundle file is index.mjs at the zip root; ESM handler = "index.handler".
data "archive_file" "ingest" {
  type        = "zip"
  source_file = "${path.module}/../backend/dist/ingest/index.mjs"
  output_path = "${path.module}/.build/ingest.zip"
}

resource "aws_lambda_function" "ingest" {
  function_name    = "${local.name_prefix}-ingest"
  role             = aws_iam_role.ingest.arn
  runtime          = "nodejs20.x"
  handler          = "index.handler"
  filename         = data.archive_file.ingest.output_path
  source_code_hash = data.archive_file.ingest.output_base64sha256
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      FROM_EMAIL               = local.from_email
      CONTACT_EMAIL_SECRET_ARN = aws_secretsmanager_secret.contact_email.arn
    }
  }
}

# Function URL, IAM-locked. CloudFront OAC (owned by the infra repo) signs requests to it;
# direct public calls stay blocked. The cloudfront.amazonaws.com invoke grant is added in
# permissions.tf (Phase F) once /portfolio/<env>/cloudfront-distribution-arn exists in SSM.
resource "aws_lambda_function_url" "ingest" {
  function_name      = aws_lambda_function.ingest.function_name
  authorization_type = "AWS_IAM"
}
