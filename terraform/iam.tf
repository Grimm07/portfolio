data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# --- Ingest Lambda role ---
resource "aws_iam_role" "ingest" {
  name               = "${local.name_prefix}-ingest"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role_policy_attachment" "ingest_logs" {
  role       = aws_iam_role.ingest.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "ingest" {
  statement {
    sid       = "PutMessageBody"
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.messages.arn}/messages/*"]
  }
  statement {
    sid       = "WriteContact"
    actions   = ["dynamodb:PutItem"]
    resources = [aws_dynamodb_table.contacts.arn]
  }
  statement {
    sid       = "RateLimitCounter"
    actions   = ["dynamodb:UpdateItem"]
    resources = [aws_dynamodb_table.rate_limits.arn]
  }
  statement {
    sid       = "EnqueueNotification"
    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.notifications.arn]
  }
}

resource "aws_iam_role_policy" "ingest" {
  name   = "${local.name_prefix}-ingest"
  role   = aws_iam_role.ingest.id
  policy = data.aws_iam_policy_document.ingest.json
}

# --- Notifier Lambda role ---
resource "aws_iam_role" "notifier" {
  name               = "${local.name_prefix}-notifier"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role_policy_attachment" "notifier_logs" {
  role       = aws_iam_role.notifier.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Scoped to exactly what the notifier handler does: drain SQS, read message bodies from
# S3, fetch CONTACT_EMAIL from Secrets Manager, and send via SES. (It does NOT read DynamoDB.)
data "aws_iam_policy_document" "notifier" {
  statement {
    sid       = "ConsumeQueue"
    actions   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
    resources = [aws_sqs_queue.notifications.arn]
  }
  statement {
    sid       = "ReadMessageBodies"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.messages.arn}/messages/*"]
  }
  statement {
    sid       = "ReadContactEmailSecret"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.contact_email.arn]
  }
  statement {
    sid       = "SendEmail"
    actions   = ["ses:SendEmail", "ses:SendRawEmail"]
    resources = ["*"] # SES SendEmail does not support resource-level ARNs for the action itself
    condition {
      test     = "StringEquals"
      variable = "ses:FromAddress"
      values   = [local.from_email]
    }
  }
}

resource "aws_iam_role_policy" "notifier" {
  name   = "${local.name_prefix}-notifier"
  role   = aws_iam_role.notifier.id
  policy = data.aws_iam_policy_document.notifier.json
}
