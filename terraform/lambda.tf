# Zip each bundle. The bundle file is index.mjs at the zip root; ESM handler = "index.handler".
data "archive_file" "ingest" {
  type        = "zip"
  source_file = "${path.module}/../backend/dist/ingest/index.mjs"
  output_path = "${path.module}/.build/ingest.zip"
}

data "archive_file" "notifier" {
  type        = "zip"
  source_file = "${path.module}/../backend/dist/notifier/index.mjs"
  output_path = "${path.module}/.build/notifier.zip"
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
      MESSAGES_BUCKET        = aws_s3_bucket.messages.id
      CONTACTS_TABLE         = aws_dynamodb_table.contacts.name
      RATE_LIMIT_TABLE       = aws_dynamodb_table.rate_limits.name
      NOTIFICATION_QUEUE_URL = aws_sqs_queue.notifications.url
    }
  }
}

# Function URL, IAM-locked. In Plan 2b a CloudFront Origin Access Control will sign
# requests to it; until then the pipeline is exercised via `aws lambda invoke` (Task 10).
resource "aws_lambda_function_url" "ingest" {
  function_name      = aws_lambda_function.ingest.function_name
  authorization_type = "AWS_IAM"
}
