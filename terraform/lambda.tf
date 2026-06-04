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

resource "aws_lambda_function" "notifier" {
  function_name    = "${local.name_prefix}-notifier"
  role             = aws_iam_role.notifier.arn
  runtime          = "nodejs20.x"
  handler          = "index.handler"
  filename         = data.archive_file.notifier.output_path
  source_code_hash = data.archive_file.notifier.output_base64sha256
  timeout          = 60
  memory_size      = 256

  environment {
    variables = {
      FROM_EMAIL               = local.from_email
      CONTACT_EMAIL_SECRET_ARN = aws_secretsmanager_secret.contact_email.arn
    }
  }
}

# Batch bursts into one digest: collect up to 10 messages or 300s, whichever first.
# ReportBatchItemFailures lets the handler re-queue only failed records.
resource "aws_lambda_event_source_mapping" "notifier" {
  event_source_arn                   = aws_sqs_queue.notifications.arn
  function_name                      = aws_lambda_function.notifier.arn
  batch_size                         = 10
  maximum_batching_window_in_seconds = 300
  function_response_types            = ["ReportBatchItemFailures"]
}

# Let CloudFront (this distribution only) invoke the IAM-locked ingest Function URL via OAC.
# Without this, the OAC-signed origin requests from cloudfront.tf would be denied (403).
# action is the Function-URL-specific InvokeFunctionUrl; source_arn scopes it to our distribution.
resource "aws_lambda_permission" "cloudfront_invoke_ingest" {
  statement_id           = "AllowCloudFrontInvoke"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.ingest.function_name
  principal              = "cloudfront.amazonaws.com"
  source_arn             = aws_cloudfront_distribution.site.arn
  function_url_auth_type = "AWS_IAM"
}
