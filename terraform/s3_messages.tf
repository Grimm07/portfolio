# Private bucket holding raw contact message bodies (messages/{yyyy}/{mm}/{id}.json).
# Never served via CloudFront; read only by the Notifier via the SDK. (The static-site
# bucket is a separate resource in Plan 2b.)
resource "aws_s3_bucket" "messages" {
  bucket = "${local.name_prefix}-messages"
}

resource "aws_s3_bucket_public_access_block" "messages" {
  bucket                  = aws_s3_bucket.messages.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "messages" {
  bucket = aws_s3_bucket.messages.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "messages" {
  bucket = aws_s3_bucket.messages.id
  versioning_configuration {
    status = "Enabled"
  }
}
