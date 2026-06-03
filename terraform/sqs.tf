# Dead-letter queue for notification messages that repeatedly fail processing.
resource "aws_sqs_queue" "notifications_dlq" {
  name                      = "${local.name_prefix}-notifications-dlq"
  message_retention_seconds = 1209600 # 14 days
}

# Main notification queue. Notifier Lambda drains it in batches (window set on the
# event-source mapping in lambda.tf). visibility_timeout must exceed the Lambda timeout.
resource "aws_sqs_queue" "notifications" {
  name                       = "${local.name_prefix}-notifications"
  visibility_timeout_seconds = 180    # >= notifier Lambda timeout (60s) with headroom
  message_retention_seconds  = 345600 # 4 days

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.notifications_dlq.arn
    maxReceiveCount     = 5
  })
}
